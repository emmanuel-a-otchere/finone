"""PerformanceTracker API routes — open/close positions, live P&L, portfolio summary."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from app.services.performance_tracker import (
    open_position, close_position, get_position,
    get_open_positions, get_closed_positions, get_portfolio_summary,
    get_position_by_signal,
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/positions", tags=["Positions"])


# ─── Request models ──────────────────────────────────────────────────────────

class OpenPositionRequest(BaseModel):
    signal_id: Optional[str] = None
    symbol: str
    direction: str
    qty: float
    entry_price: float
    strategy: str = "signal"
    notes: str = ""


class ClosePositionRequest(BaseModel):
    exit_price: float
    notes: str = ""


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/")
def create_position(req: OpenPositionRequest, current_user: dict = Depends(get_current_user)):
    """Open a new tracked position."""
    pos_id = open_position(
        signal_id=req.signal_id,
        symbol=req.symbol,
        direction=req.direction,
        qty=req.qty,
        entry_price=req.entry_price,
        strategy=req.strategy,
        notes=req.notes,
    )
    return {"position_id": pos_id, "status": "OPEN"}


@router.get("/")
def list_positions(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    List positions. Filter by ?status=OPEN or ?status=CLOSED.
    Returns live P&L for open positions.
    """
    if status and status.upper() == "OPEN":
        return get_open_positions()
    elif status and status.upper() == "CLOSED":
        return get_closed_positions()
    else:
        open_pos = get_open_positions()
        closed_pos = get_closed_positions(limit=50)
        return {"open": open_pos, "closed": closed_pos}


@router.get("/summary")
def portfolio_summary(current_user: dict = Depends(get_current_user)):
    """Full portfolio performance summary."""
    return get_portfolio_summary()


@router.get("/{position_id}")
def get_single_position(position_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific position with live P&L."""
    pos = get_position(position_id)
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    return pos


@router.get("/signal/{signal_id}")
def get_position_for_signal(signal_id: UUID, current_user: dict = Depends(get_current_user)):
    """Find the open position corresponding to a signal."""
    pos = get_position_by_signal(str(signal_id))
    if not pos:
        raise HTTPException(status_code=404, detail="No open position for this signal")
    return pos


@router.post("/{position_id}/close")
def close_pos(position_id: int, req: ClosePositionRequest,
              current_user: dict = Depends(get_current_user)):
    """Close a position at the given exit price."""
    result = close_position(position_id, req.exit_price, req.notes)
    if not result:
        raise HTTPException(status_code=404, detail="Open position not found")
    return result
