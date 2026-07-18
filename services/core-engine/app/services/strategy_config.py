"""Hot-reloadable strategy configuration loader with YAML persistence."""
from __future__ import annotations
import os, yaml, threading
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field, asdict
from threading import Lock

CONFIG_PATH = Path("/home/sysops/sysone/SystemOne/config/strategy.yaml")
_loader_lock = Lock()

# ─── Dataclasses ─────────────────────────────────────────────────────────────

@dataclass
class LensWeights:
    technical: float = 0.30
    regime: float = 0.25
    historical: float = 0.20
    event: float = 0.25

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "LensWeights":
        return cls(**{k: v for k, v in d.items() if k in cls.__annotations__})


@dataclass
class HorizonCaps:
    immediate: int = 60
    near_term: int = 80
    far_term: int = 70

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "HorizonCaps":
        return cls(**{k: v for k, v in d.items() if k in cls.__annotations__})


@dataclass
class RiskLimits:
    max_position_pct: float = 5.0
    kelly_fraction: float = 0.25
    max_portfolio_leverage: float = 1.0
    max_sector_concentration_pct: float = 30.0

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "RiskLimits":
        return cls(**{k: v for k, v in d.items() if k in cls.__annotations__})


@dataclass
class ConflictPenalty:
    threshold_dispersion: int = 40
    penalty_multiplier: float = 0.85

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "ConflictPenalty":
        return cls(**{k: v for k, v in d.items() if k in cls.__annotations__})


@dataclass
class StrategyConfig:
    version: str = "1.0.0"
    weights: LensWeights = field(default_factory=LensWeights)
    horizon_caps: HorizonCaps = field(default_factory=HorizonCaps)
    risk_limits: RiskLimits = field(default_factory=RiskLimits)
    conflict_penalty: ConflictPenalty = field(default_factory=ConflictPenalty)
    enabled_lenses: list = field(default_factory=lambda: ["technical", "regime", "historical", "event"])

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "weights": self.weights.to_dict(),
            "horizon_caps": self.horizon_caps.to_dict(),
            "risk_limits": self.risk_limits.to_dict(),
            "conflict_penalty": self.conflict_penalty.to_dict(),
            "enabled_lenses": self.enabled_lenses,
        }

    def to_yaml(self) -> str:
        return yaml.dump(self.to_dict(), default_flow_style=False, sort_keys=False)

    @classmethod
    def from_dict(cls, d: Optional[dict]) -> "StrategyConfig":
        if not d:
            return cls()
        return cls(
            version=str(d.get("version", "1.0.0")),
            weights=LensWeights.from_dict(d.get("weights", {})),
            horizon_caps=HorizonCaps.from_dict(d.get("horizon_caps", {})),
            risk_limits=RiskLimits.from_dict(d.get("risk_limits", {})),
            conflict_penalty=ConflictPenalty.from_dict(d.get("conflict_penalty", {})),
            enabled_lenses=d.get("enabled_lenses", ["technical", "regime", "historical", "event"]),
        )


# ─── Module-level cache ───────────────────────────────────────────────────────

_config_cache: Optional[StrategyConfig] = None
_config_mtime: float = 0.0


def _load_config() -> StrategyConfig:
    global _config_cache, _config_mtime
    if not CONFIG_PATH.exists():
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        default = StrategyConfig()
        CONFIG_PATH.write_text(default.to_yaml())
        return default
    current_mtime = CONFIG_PATH.stat().st_mtime
    if current_mtime != _config_mtime:
        with _loader_lock:
            if current_mtime == _config_mtime:
                return _config_cache
            data = yaml.safe_load(CONFIG_PATH.read_text())
            _config_cache = StrategyConfig.from_dict(data or {})
            _config_mtime = current_mtime
    return _config_cache


def get_strategy_config() -> StrategyConfig:
    return _load_config()


def update_strategy_config(config: StrategyConfig) -> StrategyConfig:
    global _config_cache, _config_mtime
    with _loader_lock:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(config.to_yaml())
        _config_cache = config
        _config_mtime = CONFIG_PATH.stat().st_mtime
    return config
