"""StrategyEngine API routes — position sizing, Kelly criterion, conflict resolution."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.services.strategy_engine import size_positions
from app.api.auth import get_current_user

router = APIRouter(prefix="/strategy", tags=["Strategy"])


class SignalInput(BaseModel):
    symbol: str
    direction: str
    entry: float
    stop: float
    target: float
    confidence: float
    horizon: str = "immediate"


class ExistingPosition(BaseModel):
    symbol: str
    qty: float
    avg_cost: float
    direction: str


class SizeRequest(BaseModel):
    signals: list[SignalInput]
    portfolio_value: float
    existing_positions: Optional[list[ExistingPosition]] = None


class SizedPositionOut(BaseModel):
    symbol: str
    direction: str
    entry: float
    stop: float
    target: float
    confidence: float
    horizon: str
    risk_amount: float
    position_size_dollars: float
    position_size_shares: float
    kelly_fraction_used: float
    win_rate_estimate: float
    expectancy: float
    risk_reward_achieved: float
    confidence_adjustment: float
    sizing_note: str


class ConflictReportOut(BaseModel):
    has_conflict: bool
    conflicting_symbols: list[str]
    conflict_type: str
    resolution_applied: str
    adjustment_pct: float


class SizeResponse(BaseModel):
    positions: list[SizedPositionOut]
    conflicts: list[ConflictReportOut]
    total_portfolio_risk: float
    portfolio_direction: str
    rejection_notes: list[str]


@router.post("/size", response_model=SizeResponse)
def size_portfolio(request: SizeRequest, current_user: dict = Depends(get_current_user)):
    """
    Run the StrategyEngine on a set of signals to compute position sizes.

    Uses Kelly criterion with confidence-weighted sizing, sector concentration
    limits, and conflict detection.
    """
    signals_dict = [s.model_dump() for s in request.signals]
    existing = [p.model_dump() for p in (request.existing_positions or [])]

    result = size_positions(
        signals=signals_dict,
        portfolio_value=request.portfolio_value,
        existing_positions=existing,
    )

    return SizeResponse(
        positions=[SizedPositionOut(**{**p.__dict__}) for p in result.positions],
        conflicts=[ConflictReportOut(**{**c.__dict__}) for c in result.conflicts],
        total_portfolio_risk=result.total_portfolio_risk,
        portfolio_direction=result.portfolio_direction,
        rejection_notes=result.rejection_notes,
    )
