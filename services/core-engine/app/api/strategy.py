"""StrategyConfig API routes — hot-reloadable strategy parameters."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.strategy_config import (
    get_strategy_config, update_strategy_config, StrategyConfig,
    LensWeights, HorizonCaps, RiskLimits, ConflictPenalty,
)

router = APIRouter(prefix="/strategy", tags=["Strategy"])


# ─── Request models ──────────────────────────────────────────────────────────

class LensWeightsIn(BaseModel):
    technical: float = 0.30
    regime: float = 0.25
    historical: float = 0.20
    event: float = 0.25


class HorizonCapsIn(BaseModel):
    immediate: int = 60
    near_term: int = 80
    far_term: int = 70


class RiskLimitsIn(BaseModel):
    max_position_pct: float = 5.0
    kelly_fraction: float = 0.25
    max_portfolio_leverage: float = 1.0
    max_sector_concentration_pct: float = 30.0


class ConflictPenaltyIn(BaseModel):
    threshold_dispersion: int = 40
    penalty_multiplier: float = 0.85


class StrategyConfigUpdate(BaseModel):
    weights: Optional[LensWeightsIn] = None
    horizon_caps: Optional[HorizonCapsIn] = None
    risk_limits: Optional[RiskLimitsIn] = None
    conflict_penalty: Optional[ConflictPenaltyIn] = None
    enabled_lenses: Optional[list] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/config")
def get_config():
    """Return current strategy configuration."""
    cfg = get_strategy_config()
    return cfg.to_dict()


@router.put("/config")
def put_config(update: StrategyConfigUpdate):
    """
    Update strategy configuration (hot-reload — takes effect immediately).
    Only supplied fields are updated; omitted fields retain current values.
    """
    cfg = get_strategy_config()
    if update.weights:
        cfg.weights = LensWeights(**update.weights.model_dump())
    if update.horizon_caps:
        cfg.horizon_caps = HorizonCaps(**update.horizon_caps.model_dump())
    if update.risk_limits:
        cfg.risk_limits = RiskLimits(**update.risk_limits.model_dump())
    if update.conflict_penalty:
        cfg.conflict_penalty = ConflictPenalty(**update.conflict_penalty.model_dump())
    if update.enabled_lenses is not None:
        cfg.enabled_lenses = update.enabled_lenses
    updated = update_strategy_config(cfg)
    return updated.to_dict()
