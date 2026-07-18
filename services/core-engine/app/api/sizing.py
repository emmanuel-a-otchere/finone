"""Add GET /strategy/sizing/{signal_id} — StrategyEngine sizing for a live signal."""
from fastapi import APIRouter, HTTPException, Request, Depends
from uuid import UUID
import httpx

from app.services.strategy_engine import size_positions
from app.services.strategy_config import get_strategy_config
from app.api.auth import get_current_user

router = APIRouter(prefix="/strategy", tags=["Strategy"])


async def _fetch_signal_via_http(request: Request, signal_id: str, token: str) -> dict:
    """Internal HTTP call to the signals endpoint (avoids circular imports)."""
    # Call the signals router directly via httpx (same process)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://127.0.0.1:8001/signals/{signal_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Signal not found")
        resp.raise_for_status()
        return resp.json()


@router.get("/sizing/{signal_id}")
async def size_signal(
    request: Request,
    signal_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch a live signal by ID and run it through the StrategyEngine
    to get Kelly-based position sizing with full conflict analysis.
    """
    from starlette.datastructures import URL

    # Get the auth token from the current request to forward to internal call
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")

    signal = await _fetch_signal_via_http(request, str(signal_id), token)

    cfg = get_strategy_config()
    protocol = signal.get("protocol_type", "LONG_BUY") or "LONG_BUY"
    direction = "LONG" if "BUY" in protocol else "SHORT"

    signal_dict = {
        "symbol": signal["symbol"],
        "direction": direction,
        "entry": float(signal["entry_price"]),
        "stop": float(signal["stop_loss"]),
        "target": float(signal["take_profit"]),
        "confidence": float(signal["confidence_score"]),
        "horizon": "near_term",
    }

    result = size_positions(
        signals=[signal_dict],
        portfolio_value=100_000.0,
        existing_positions=[],
    )

    if not result.positions:
        raise HTTPException(status_code=422, detail="Signal could not be sized")

    p = result.positions[0]
    return {
        "signal_id": str(signal_id),
        "symbol": signal["symbol"],
        "direction": direction,
        "signal_confidence": signal["confidence_score"],
        "horizon_caps": cfg.horizon_caps.to_dict(),
        "risk_limits": cfg.risk_limits.to_dict(),
        "sizing": {
            "position_size_dollars": p.position_size_dollars,
            "position_size_shares": round(p.position_size_shares, 2),
            "risk_amount": p.risk_amount,
            "kelly_fraction_used": p.kelly_fraction_used,
            "win_rate_estimate": p.win_rate_estimate,
            "expectancy": p.expectancy,
            "risk_reward_achieved": p.risk_reward_achieved,
            "confidence_adjustment": p.confidence_adjustment,
            "sizing_note": p.sizing_note,
        },
        "conflicts": [{**c.__dict__} for c in result.conflicts],
        "rejection_notes": result.rejection_notes,
        "portfolio_direction": result.portfolio_direction,
    }
