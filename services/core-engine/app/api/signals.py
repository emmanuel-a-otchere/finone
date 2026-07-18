from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.models.signal import SignalStatus
from app.services.signals import SignalService
from app.api.deps import get_current_user

router = APIRouter(prefix="/signals", tags=["Signals"])


class GenerateSignalsRequest(BaseModel):
    symbols: list[str]
    protocols: list[str] | None = None
    portfolio_context: str | None = None
    min_confidence: int = 0


class SignalResponse(BaseModel):
    id: str
    version: str
    protocol_type: str
    symbol: str
    confidence_score: int | None
    entry_price: float | None
    stop_loss: float | None
    take_profit: float | None
    status: str
    created_at: str | None
    expires_at: str | None
    layer_scores: dict
    timeframe: str | None
    # Enriched trading metadata
    atr: float | None = None
    risk_reward: float | None = None
    eta_hours: int | None = None
    regime: str | None = None
    momentum_delta: int | None = None
    volume_surge: int | None = None
    projection_dates: list[str] = []
    projection_p10: list[float] = []
    projection_p50: list[float] = []
    projection_p90: list[float] = []


@router.post("/generate", response_model=list[SignalResponse])
async def generate_signals(
    request: GenerateSignalsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    service = SignalService(db)
    signals = await service.generate_signals(
        symbols=request.symbols,
        protocols=request.protocols,
        min_confidence=request.min_confidence,
    )
    return [SignalResponse(**(s.to_dict() if hasattr(s, "to_dict") else s)) for s in signals]


@router.get("", response_model=list[SignalResponse])
async def list_signals(
    status: str | None = None,
    symbol: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    service = SignalService(db)
    signal_status = SignalStatus(status) if status else None
    signals = await service.get_signals(
        status=signal_status,
        symbol=symbol,
        limit=limit,
    )
    return [SignalResponse(**(s.to_dict() if hasattr(s, "to_dict") else s)) for s in signals]


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    service = SignalService(db)
    signal = await service.get_signal_by_id(signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return SignalResponse(**signal.to_dict())
