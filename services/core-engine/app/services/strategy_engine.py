"""SystemOne StrategyEngine — position sizing, Kelly criterion, conflict resolution."""
from __future__ import annotations
import os, math, numpy as np
from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime
import yfinance as yf

from app.services.strategy_config import get_strategy_config, StrategyConfig


Direction = Literal["LONG", "SHORT"]

@dataclass
class TradeLevel:
    entry: float
    stop: float
    target: float

@dataclass
class SizedPosition:
    symbol: str
    direction: Direction
    entry: float
    stop: float
    target: float
    confidence: float          # 0-100
    horizon: str                # immediate / near_term / far_term
    risk_amount: float          # $ at risk
    position_size_dollars: float
    position_size_shares: float
    kelly_fraction_used: float  # e.g. 0.25
    win_rate_estimate: float     # 0-1
    expectancy: float           # expected $ return per share
    risk_reward_achieved: float # target/stop ratio
    confidence_adjustment: float # due to cross-signal conflict
    sizing_note: str           # human-readable explanation


@dataclass
class ConflictReport:
    has_conflict: bool
    conflicting_symbols: list[str]
    conflict_type: str         # "sector" / "direction" / "none"
    resolution_applied: str    # "reduced" / "rejected" / "none"
    adjustment_pct: float      # position size reduction %


@dataclass
class StrategyEngineOutput:
    positions: list[SizedPosition]
    conflicts: list[ConflictReport]
    total_portfolio_risk: float  # sum of all position risks
    portfolio_direction: str      # "LONG" / "SHORT" / "MIXED"
    rejection_notes: list[str]    # why certain signals were rejected


# ─── helpers ────────────────────────────────────────────────────────────────

def _live_price(symbol: str) -> Optional[float]:
    try:
        ticker = yf.Ticker(symbol.upper())
        p = ticker.info.get("currentPrice") or ticker.info.get("regularMarketPrice")
        return float(p) if p else None
    except Exception:
        return None


def _atr14(symbol: str) -> Optional[float]:
    try:
        df = yf.Ticker(symbol.upper()).history(period="2mo")
        if df is None or len(df) < 15:
            return None
        high, low, close = df["High"], df["Low"], df["Close"]
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1/14, adjust=False).mean()
        return float(atr.iloc[-1])
    except Exception:
        return None


_sector_cache: dict[str, str] = {}


def _sector(symbol: str) -> str:
    """Get sector from yfinance, cached per symbol."""
    sym = symbol.upper()
    if sym in _sector_cache:
        return _sector_cache[sym]
    try:
        sec = yf.Ticker(sym).info.get("sector", "Unknown")
        _sector_cache[sym] = sec
        return sec
    except Exception:
        return "Unknown"


def _kelly_fraction(win_rate: float, avg_win: float, avg_loss: float,
                    max_fraction: float = 0.25) -> float:
    """
    Kelly Criterion: f* = (bp - q) / b
    where b = avg_win/avg_loss, p = win_rate, q = 1 - win_rate
    Capped at max_fraction to limit volatility.
    """
    if avg_loss <= 0 or win_rate <= 0 or win_rate >= 1:
        return max_fraction
    b = avg_win / avg_loss          # odds received
    p = win_rate
    q = 1 - p
    kelly = (b * p - q) / b         # raw Kelly fraction
    kelly = max(0.0, min(kelly, max_fraction))
    return round(kelly, 4)


def _win_rate_from_confidence(confidence: float) -> float:
    """
    Map layer-derived confidence (0-100) to a win-rate estimate.
    Based on historical calibration: confidence 60 → ~55% win rate,
    confidence 80 → ~65%, confidence 95 → ~75%.
    """
    # Piecewise linear mapping
    if confidence <= 50:
        return 0.50 + (confidence - 50) * 0.002    # 50→50%, 40→48%
    elif confidence <= 75:
        return 0.50 + (confidence - 50) * 0.004    # 50→50%, 75→60%
    else:
        return 0.60 + (confidence - 75) * 0.006   # 75→60%, 95→72%


def _detect_conflicts(positions: list[SizedPosition],
                       config: StrategyConfig) -> list[ConflictReport]:
    """
    Detect direction and sector conflicts between proposed positions.
    Returns one ConflictReport per conflict found.
    """
    reports = []
    by_sector: dict[str, list[SizedPosition]] = {}
    by_direction: dict[Direction, list[SizedPosition]] = {}

    for pos in positions:
        by_sector.setdefault(_sector(pos.symbol), []).append(pos)
        by_direction.setdefault(pos.direction, []).append(pos)

    # ── Direction conflicts ──────────────────────────────────────────────
    if "LONG" in by_direction and "SHORT" in by_direction:
        # Mixed direction = market neutrality; no automatic rejection
        # but note it for transparency
        all_syms = [p.symbol for p in positions]
        reports.append(ConflictReport(
            has_conflict=True,
            conflicting_symbols=all_syms,
            conflict_type="direction",
            resolution_applied="none",
            adjustment_pct=0.0,
        ))

    # ── Sector concentration ─────────────────────────────────────────────
    max_sector_pct = config.risk_limits.max_sector_concentration_pct / 100.0
    total_risk = sum(p.risk_amount for p in positions)
    for sector, sector_positions in by_sector.items():
        sector_risk = sum(p.risk_amount for p in sector_positions)
        sector_pct = sector_risk / total_risk if total_risk > 0 else 0
        if sector_pct > max_sector_pct:
            excess = sector_pct - max_sector_pct
            # Reduce each position in the sector proportionally
            reduction = excess / sector_pct   # fraction to cut
            for pos in sector_positions:
                pos.confidence_adjustment = -(reduction * 100)
                pos.position_size_dollars *= (1 - reduction)
                if pos.entry > 0:
                    pos.position_size_shares = pos.position_size_dollars / pos.entry
                pos.sizing_note += f" [sector cap: -{round(reduction*100,1)}%]"
            reports.append(ConflictReport(
                has_conflict=True,
                conflicting_symbols=[p.symbol for p in sector_positions],
                conflict_type="sector",
                resolution_applied="reduced",
                adjustment_pct=round(reduction * 100, 2),
            ))

    return reports


# ─── main entry point ──────────────────────────────────────────────────────

def size_positions(
    signals: list[dict],
    portfolio_value: float,
    existing_positions: Optional[list[dict]] = None,
) -> StrategyEngineOutput:
    """
    Core StrategyEngine sizing function.

    Args:
        signals: list of signal dicts, each must have:
            symbol, direction, entry, stop, target, confidence, horizon
        portfolio_value: total portfolio NAV (for %-based limits)
        existing_positions: optional list of {symbol, qty, avg_cost, direction}
            to account for existing holdings

    Returns StrategyEngineOutput with SizedPosition list.
    """
    import pandas as pd  # local import for compatibility

    config = get_strategy_config()
    existing_positions = existing_positions or []
    existing_map = {p["symbol"].upper(): p for p in existing_positions}

    sized: list[SizedPosition] = []
    rejections: list[str] = []
    total_risk = 0.0

    for sig in signals:
        symbol = sig["symbol"].upper()
        direction: Direction = sig["direction"].upper()
        entry    = float(sig["entry"])
        stop     = float(sig["stop"])
        target   = float(sig["target"])
        confidence = float(sig["confidence"])
        horizon  = sig.get("horizon", "immediate")

        existing = existing_map.get(symbol)
        entry_price = entry
        stop_price  = stop
        target_price = target

        # ── Risk per share ─────────────────────────────────────────────
        if direction == "LONG":
            risk_per_share = entry_price - stop_price
        else:
            risk_per_share = stop_price - entry_price

        if risk_per_share <= 0:
            rejections.append(f"{symbol}: stop must be below entry for LONG (or above for SHORT) — skipped")
            continue

        # ── Win rate estimate ───────────────────────────────────────────
        win_rate = _win_rate_from_confidence(confidence)
        avg_loss = risk_per_share
        avg_win  = target_price - entry_price if direction == "LONG" else entry_price - target_price
        if avg_win <= 0:
            rejections.append(f"{symbol}: target must be above entry for LONG — skipped")
            continue

        expectancy = win_rate * avg_win - (1 - win_rate) * avg_loss

        # ── Kelly fraction ──────────────────────────────────────────────
        kelly = _kelly_fraction(win_rate, avg_win, avg_loss,
                                  max_fraction=config.risk_limits.kelly_fraction)

        # ── Raw dollar position size ────────────────────────────────────
        max_pct = config.risk_limits.max_position_pct / 100.0
        max_dollars = portfolio_value * max_pct
        risk_dollars = risk_per_share * (max_dollars / risk_per_share)  # = max_dollars (simplified)
        raw_dollars  = max_dollars * kelly / config.risk_limits.kelly_fraction
        raw_dollars  = min(raw_dollars, max_dollars)

        # ── Adjust for confidence ────────────────────────────────────────
        conf_factor = confidence / 100.0
        sized_dollars = raw_dollars * conf_factor
        shares = round(sized_dollars / entry_price, 0)

        if shares < 1:
            rejections.append(f"{symbol}: position too small ({shares} shares at ${entry_price}) — skipped")
            continue

        actual_dollars = round(shares * entry_price, 2)
        risk_amount   = round(shares * risk_per_share, 2)

        sized.append(SizedPosition(
            symbol=symbol,
            direction=direction,
            entry=entry_price,
            stop=stop_price,
            target=target_price,
            confidence=confidence,
            horizon=horizon,
            risk_amount=risk_amount,
            position_size_dollars=round(actual_dollars, 2),
            position_size_shares=shares,
            kelly_fraction_used=kelly,
            win_rate_estimate=round(win_rate, 4),
            expectancy=round(expectancy, 4),
            risk_reward_achieved=round(target_price / stop_price if stop_price > 0 else 0, 2),
            confidence_adjustment=0.0,
            sizing_note=f"Kelly={kelly:.2%}, confidence={confidence:.0f}%, "
                        f"win_rate={win_rate:.1%}, avg_win=${avg_win:.2f}",
        ))
        total_risk += risk_amount

    # ── Detect and resolve conflicts ─────────────────────────────────────
    conflicts = _detect_conflicts(sized, config)
    for conflict in conflicts:
        total_risk = total_risk  # already mutated in-place on SizedPosition objects

    # ── Direction summary ────────────────────────────────────────────────
    long_risk  = sum(p.risk_amount for p in sized if p.direction == "LONG")
    short_risk = sum(p.risk_amount for p in sized if p.direction == "SHORT")
    if long_risk > short_risk * 2:
        portfolio_direction = "LONG"
    elif short_risk > long_risk * 2:
        portfolio_direction = "SHORT"
    elif sized:
        portfolio_direction = "MIXED"
    else:
        portfolio_direction = "NONE"

    return StrategyEngineOutput(
        positions=sized,
        conflicts=conflicts,
        total_portfolio_risk=round(total_risk, 2),
        portfolio_direction=portfolio_direction,
        rejection_notes=rejections,
    )
