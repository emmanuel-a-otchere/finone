"""Signal history, outcomes, and audit trail API."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.models.database import get_db
from app.models import Signal, ModelOutcome

router = APIRouter()


class SignalHistoryItem(BaseModel):
    id: str
    symbol: str
    protocol_type: str
    entry_price: float
    stop_loss: float
    take_profit: float
    confidence_score: float
    layer_scores: dict
    status: str
    created_at: str
    expires_at: Optional[str]
    timeframe: str

    class Config:
        from_attributes = True


class SignalHistoryResponse(BaseModel):
    signals: list
    total: int
    limit: int
    offset: int


class ModelOutcomeResponse(BaseModel):
    id: int
    signal_id: Optional[str]
    model_version: Optional[str]
    actual_outcome: Optional[str]
    profit_loss_pct: Optional[float]
    market_regime: Optional[str]
    recorded_at: str

    class Config:
        from_attributes = True


class OutcomesResponse(BaseModel):
    outcomes: list
    total: int


class RecordOutcomeRequest(BaseModel):
    signal_id: str
    model_version: str
    actual_outcome: str
    profit_loss_pct: float
    market_regime: str


class AuditEvent(BaseModel):
    timestamp: str
    event_type: str
    description: str


class AuditTrailResponse(BaseModel):
    signal: dict
    outcomes: list
    events: list


def _signal_to_dict(s: Signal) -> dict:
    return {
        "id": str(s.id),
        "symbol": s.symbol,
        "protocol_type": s.protocol_type.value if hasattr(s.protocol_type, "value") else str(s.protocol_type),
        "entry_price": float(s.entry_price) if s.entry_price else None,
        "stop_loss": float(s.stop_loss) if s.stop_loss else None,
        "take_profit": float(s.take_profit) if s.take_profit else None,
        "confidence_score": s.confidence_score,
        "layer_scores": s.layer_scores or {},
        "status": s.status.value if hasattr(s.status, "value") else str(s.status),
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        "timeframe": s.timeframe,
    }


@router.get("/signals", response_model=SignalHistoryResponse)
async def list_signal_history(
    symbol: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from_date"),
    to_date: Optional[str] = Query(None, alias="to_date"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    conditions = []
    if symbol:
        conditions.append(Signal.symbol.ilike(f"%{symbol}%"))
    if status:
        conditions.append(Signal.status == status)
    if from_date:
        conditions.append(Signal.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        conditions.append(Signal.created_at <= datetime.fromisoformat(to_date))

    count_q = select(func.count(Signal.id))
    if conditions:
        count_q = count_q.where(*conditions)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    q = select(Signal).order_by(desc(Signal.created_at)).limit(limit).offset(offset)
    if conditions:
        q = q.where(*conditions)
    result = await db.execute(q)
    signals = result.scalars().all()

    return SignalHistoryResponse(
        signals=[_signal_to_dict(s) for s in signals],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/signals/{signal_id}", response_model=dict)
async def get_signal_history(signal_id: UUID, db: AsyncSession = Depends(get_db), _user: str = Depends(get_current_user)):
    result = await db.execute(select(Signal).where(Signal.id == signal_id))
    signal = result.scalar_one_or_none()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    outcome_result = await db.execute(
        select(ModelOutcome).where(ModelOutcome.signal_id == signal_id).order_by(desc(ModelOutcome.recorded_at))
    )
    outcomes = outcome_result.scalars().all()

    signal_dict = _signal_to_dict(signal)
    signal_dict["outcome"] = {
        "id": o.id,
        "model_version": o.model_version,
        "actual_outcome": o.actual_outcome,
        "profit_loss_pct": float(o.profit_loss_pct) if o.profit_loss_pct else None,
        "market_regime": o.market_regime,
        "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
    } if outcomes else None

    return signal_dict


@router.get("/outcomes", response_model=OutcomesResponse)
async def list_outcomes(
    symbol: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from_date"),
    to_date: Optional[str] = Query(None, alias="to_date"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    conditions = []
    if symbol:
        conditions.append(
            ModelOutcome.signal_id.in_(
                select(Signal.id).where(Signal.symbol.ilike(f"%{symbol}%"))
            )
        )
    if from_date:
        conditions.append(ModelOutcome.recorded_at >= datetime.fromisoformat(from_date))
    if to_date:
        conditions.append(ModelOutcome.recorded_at <= datetime.fromisoformat(to_date))

    count_q = select(func.count(ModelOutcome.id))
    if conditions:
        count_q = count_q.where(*conditions)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    q = select(ModelOutcome).order_by(desc(ModelOutcome.recorded_at)).limit(limit).offset(offset)
    if conditions:
        q = q.where(*conditions)
    result = await db.execute(q)
    outcomes = result.scalars().all()

    return OutcomesResponse(
        outcomes=[
            {
                "id": o.id,
                "signal_id": str(o.signal_id) if o.signal_id else None,
                "model_version": o.model_version,
                "actual_outcome": o.actual_outcome,
                "profit_loss_pct": float(o.profit_loss_pct) if o.profit_loss_pct else None,
                "market_regime": o.market_regime,
                "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
            }
            for o in outcomes
        ],
        total=total,
    )


@router.post("/outcomes", response_model=dict)
async def record_outcome(req: RecordOutcomeRequest, db: AsyncSession = Depends(get_db), _user: str = Depends(get_current_user)):
    outcome = ModelOutcome(
        signal_id=UUID(req.signal_id),
        model_version=req.model_version,
        actual_outcome=req.actual_outcome,
        profit_loss_pct=req.profit_loss_pct,
        market_regime=req.market_regime,
    )
    db.add(outcome)
    await db.commit()
    await db.refresh(outcome)
    return {
        "id": str(outcome.id),
        "signal_id": str(outcome.signal_id),
        "model_version": outcome.model_version,
        "actual_outcome": outcome.actual_outcome,
        "profit_loss_pct": float(outcome.profit_loss_pct) if outcome.profit_loss_pct else None,
        "market_regime": outcome.market_regime,
        "recorded_at": outcome.recorded_at.isoformat() if outcome.recorded_at else None,
    }


@router.get("/audit/{signal_id}", response_model=AuditTrailResponse)
async def get_audit_trail(signal_id: UUID, db: AsyncSession = Depends(get_db), _user: str = Depends(get_current_user)):
    result = await db.execute(select(Signal).where(Signal.id == signal_id))
    signal = result.scalar_one_or_none()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    outcome_result = await db.execute(
        select(ModelOutcome).where(ModelOutcome.signal_id == signal_id).order_by(ModelOutcome.recorded_at)
    )
    outcomes = outcome_result.scalars().all()

    events = []
    events.append(
        AuditEvent(
            timestamp=signal.created_at.isoformat() if signal.created_at else "",
            event_type="CREATED",
            description=f"Signal created for {signal.symbol}",
        )
    )
    current_status = signal.status.value if hasattr(signal.status, "value") else signal.status
    if current_status != "PENDING":
        events.append(
            AuditEvent(
                timestamp=signal.created_at.isoformat() if signal.created_at else "",
                event_type="STATUS_CHANGED",
                description=f"Status changed to {current_status}",
            )
        )
    for o in outcomes:
        events.append(
            AuditEvent(
                timestamp=o.recorded_at.isoformat() if o.recorded_at else "",
                event_type="OUTCOME_RECORDED",
                description=f"Outcome recorded: {o.actual_outcome} ({float(o.profit_loss_pct):+.2f}%)",
            )
        )

    return AuditTrailResponse(
        signal=_signal_to_dict(signal),
        outcomes=[
            {
                "id": o.id,
                "signal_id": str(o.signal_id),
                "model_version": o.model_version,
                "actual_outcome": o.actual_outcome,
                "profit_loss_pct": float(o.profit_loss_pct) if o.profit_loss_pct else None,
                "market_regime": o.market_regime,
                "recorded_at": o.recorded_at.isoformat() if o.recorded_at else None,
            }
            for o in outcomes
        ],
        events=[e.model_dump() for e in events],
    )
