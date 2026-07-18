from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.models.database import get_db
from app.models.watchlist_item import WatchlistItem
from app.api.auth import get_current_user
from app.services.signals import SignalService, TIMEFRAME_TTL

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---- Watchlist models ----
class WatchlistItemCreate(BaseModel):
    symbol: str
    timeframe: str = "swing"
    min_confidence: int = 0
    enabled: bool = True


class WatchlistItemResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    timeframe: str
    min_confidence: int
    enabled: bool
    last_generated: Optional[str]
    created_at: str


class WatchlistGenerateResponse(BaseModel):
    generated: int
    symbols: list[str]
    errors: list[str]


@router.get("/watchlist", response_model=list[WatchlistItemResponse])
async def list_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.user_id == current_user).order_by(WatchlistItem.created_at.desc())
    )
    items = result.scalars().all()
    return [_watchlist_item_to_dict(i) for i in items]


@router.post("/watchlist", response_model=WatchlistItemResponse)
async def add_watchlist_item(
    item: WatchlistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    existing = await db.execute(
        select(WatchlistItem).where(
            and_(WatchlistItem.user_id == current_user, WatchlistItem.symbol == item.symbol.upper())
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Symbol {item.symbol.upper()} already in watchlist")

    timeframe = item.timeframe if item.timeframe in TIMEFRAME_TTL else "swing"
    watchlist_item = WatchlistItem(
        user_id=current_user,
        symbol=item.symbol.upper(),
        timeframe=timeframe,
        min_confidence=item.min_confidence,
        enabled=item.enabled,
    )
    db.add(watchlist_item)
    await db.commit()
    await db.refresh(watchlist_item)
    return _watchlist_item_to_dict(watchlist_item)


@router.patch("/watchlist/{item_id}", response_model=WatchlistItemResponse)
async def update_watchlist_item(
    item_id: UUID,
    updates: WatchlistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(
            and_(WatchlistItem.id == item_id, WatchlistItem.user_id == current_user)
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    item.symbol = updates.symbol.upper()
    item.timeframe = updates.timeframe if updates.timeframe in TIMEFRAME_TTL else "swing"
    item.min_confidence = updates.min_confidence
    item.enabled = updates.enabled
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return _watchlist_item_to_dict(item)


@router.delete("/watchlist/{item_id}")
async def remove_watchlist_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(
            and_(WatchlistItem.id == item_id, WatchlistItem.user_id == current_user)
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    await db.delete(item)
    await db.commit()
    return {"ok": True}


@router.post("/watchlist/generate", response_model=WatchlistGenerateResponse)
async def generate_watchlist_signals(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(
            and_(WatchlistItem.user_id == current_user, WatchlistItem.enabled == True)
        )
    )
    items = list(result.scalars().all())
    if not items:
        return WatchlistGenerateResponse(generated=0, symbols=[], errors=["No enabled watchlist items"])

    generated_count = 0
    symbols_processed = []
    errors = []

    for item in items:
        try:
            svc = SignalService(db)
            # Use item's timeframe for TTL, min_confidence for filtering
            signals = await svc.generate_signals(
                symbols=[item.symbol],
                min_confidence=item.min_confidence,
                timeframe=item.timeframe,
            )
            if signals:
                item.last_generated = datetime.now(timezone.utc)
                await db.commit()
                generated_count += 1
                symbols_processed.append(item.symbol)
            else:
                errors.append(f"{item.symbol}: no signal (confidence below {item.min_confidence}%)")
        except Exception as e:
            errors.append(f"{item.symbol}: {str(e)}")

    return WatchlistGenerateResponse(
        generated=generated_count,
        symbols=symbols_processed,
        errors=errors,
    )


@router.get("/signals/pending")
async def list_pending_signals(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """List all signals pending expiry or review."""
    from app.models.signal import Signal, SignalStatus
    result = await db.execute(
        select(Signal).where(Signal.status == SignalStatus.ACTIVE).order_by(Signal.expires_at.asc())
    )
    signals = result.scalars().all()
    return [_signal_to_dict(s) for s in signals]


@router.post("/signals/expire")
async def expire_signals_now(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Manually trigger expiry of all past-due signals."""
    from app.models.signal import Signal, SignalStatus
    result = await db.execute(
        select(Signal).where(
            and_(
                Signal.status == SignalStatus.ACTIVE,
                Signal.expires_at < datetime.now(timezone.utc),
            )
        )
    )
    signals = list(result.scalars().all())
    for s in signals:
        s.status = SignalStatus.EXPIRED
    await db.commit()
    return {"expired": len(signals), "symbols": [s.symbol for s in signals]}


def _watchlist_item_to_dict(i) -> WatchlistItemResponse:
    return WatchlistItemResponse(
        id=str(i.id),
        user_id=i.user_id,
        symbol=i.symbol,
        timeframe=i.timeframe,
        min_confidence=i.min_confidence,
        enabled=i.enabled,
        last_generated=i.last_generated.isoformat() if i.last_generated else None,
        created_at=i.created_at.isoformat() if i.created_at else None,
    )


def _signal_to_dict(s):
    return {
        "id": str(s.id),
        "symbol": s.symbol,
        "protocol_type": s.protocol_type.value,
        "confidence_score": s.confidence_score,
        "entry_price": float(s.entry_price) if s.entry_price else None,
        "stop_loss": float(s.stop_loss) if s.stop_loss else None,
        "take_profit": float(s.take_profit) if s.take_profit else None,
        "status": s.status.value,
        "timeframe": s.timeframe,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
    }
