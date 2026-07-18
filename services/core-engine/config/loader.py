from dataclasses import dataclass
from pathlib import Path
from typing import Any
import yaml
import os


@dataclass
class Weights:
    technical: float
    regime: float
    historical: float
    event: float


@dataclass
class HorizonCaps:
    immediate: int
    near_term: int
    far_term: int


@dataclass
class RiskLimits:
    max_position_pct: float
    kelly_fraction: float


@dataclass
class ConflictPenalty:
    threshold_dispersion: float
    penalty_multiplier: float


@dataclass
class StrategyConfig:
    weights: Weights
    horizon_caps: HorizonCaps
    risk_limits: RiskLimits
    conflict_penalty: ConflictPenalty

    def reload(self) -> "StrategyConfig":
        """Re-read the YAML config file and return a new StrategyConfig."""
        data = _load_yaml_config()
        return StrategyConfig(
            weights=Weights(
                technical=data["weights"]["technical"],
                regime=data["weights"]["regime"],
                historical=data["weights"]["historical"],
                event=data["weights"]["event"],
            ),
            horizon_caps=HorizonCaps(
                immediate=data["horizon_caps"]["immediate"],
                near_term=data["horizon_caps"]["near_term"],
                far_term=data["horizon_caps"]["far_term"],
            ),
            risk_limits=RiskLimits(
                max_position_pct=data["risk_limits"]["max_position_pct"],
                kelly_fraction=data["risk_limits"]["kelly_fraction"],
            ),
            conflict_penalty=ConflictPenalty(
                threshold_dispersion=data["conflict_penalty"]["threshold_dispersion"],
                penalty_multiplier=data["conflict_penalty"]["penalty_multiplier"],
            ),
        )


_config_cache: StrategyConfig | None = None
_config_mtime: float | None = None


def _load_yaml_config() -> dict[str, Any]:
    config_dir = Path(__file__).parent
    config_path = config_dir / "strategy_config.yaml"
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def _get_config_mtime() -> float:
    config_dir = Path(__file__).parent
    config_path = config_dir / "strategy_config.yaml"
    return os.path.getmtime(config_path)


def get_strategy_config(force_reload: bool = False) -> StrategyConfig:
    """
    Returns the cached StrategyConfig, re-reading from YAML if:
    - force_reload=True, or
    - the file's mtime is newer than when we last cached it
    """
    global _config_cache, _config_mtime

    current_mtime = _get_config_mtime()

    if _config_cache is None or force_reload or _config_mtime is None or current_mtime > _config_mtime:
        data = _load_yaml_config()
        _config_cache = StrategyConfig(
            weights=Weights(
                technical=data["weights"]["technical"],
                regime=data["weights"]["regime"],
                historical=data["weights"]["historical"],
                event=data["weights"]["event"],
            ),
            horizon_caps=HorizonCaps(
                immediate=data["horizon_caps"]["immediate"],
                near_term=data["horizon_caps"]["near_term"],
                far_term=data["horizon_caps"]["far_term"],
            ),
            risk_limits=RiskLimits(
                max_position_pct=data["risk_limits"]["max_position_pct"],
                kelly_fraction=data["risk_limits"]["kelly_fraction"],
            ),
            conflict_penalty=ConflictPenalty(
                threshold_dispersion=data["conflict_penalty"]["threshold_dispersion"],
                penalty_multiplier=data["conflict_penalty"]["penalty_multiplier"],
            ),
        )
        _config_mtime = current_mtime

    return _config_cache


def reload() -> StrategyConfig:
    """
    Force a reload of the strategy config from disk.
    Returns the new StrategyConfig.
    """
    global _config_cache, _config_mtime
    current_mtime = _get_config_mtime()
    data = _load_yaml_config()
    _config_cache = StrategyConfig(
        weights=Weights(
            technical=data["weights"]["technical"],
            regime=data["weights"]["regime"],
            historical=data["weights"]["historical"],
            event=data["weights"]["event"],
        ),
        horizon_caps=HorizonCaps(
            immediate=data["horizon_caps"]["immediate"],
            near_term=data["horizon_caps"]["near_term"],
            far_term=data["horizon_caps"]["far_term"],
        ),
        risk_limits=RiskLimits(
            max_position_pct=data["risk_limits"]["max_position_pct"],
            kelly_fraction=data["risk_limits"]["kelly_fraction"],
        ),
        conflict_penalty=ConflictPenalty(
            threshold_dispersion=data["conflict_penalty"]["threshold_dispersion"],
            penalty_multiplier=data["conflict_penalty"]["penalty_multiplier"],
        ),
    )
    _config_mtime = current_mtime
    return _config_cache
