from typing import Dict, Optional, List
from dataclasses import dataclass
from decimal import Decimal
import os

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "systemone")
DB_USER = os.getenv("DB_USER", "sysops")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sysone123")


@dataclass
class HistoricalStats:
    setup_type: str
    win_rate: float          # 0-100
    avg_return_pct: float    # average return when winning
    avg_loss_pct: float      # average loss when losing (positive number)
    max_drawdown_pct: float
    expectancy: float        # (win_rate * avg_win) - (loss_rate * avg_loss)
    sample_size: int
    last_updated: str        # ISO timestamp


def _sync_get_pool():
    """Synchronous wrapper for use in sync functions."""
    import psycopg2
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASSWORD
    )


def _to_float(val) -> float:
    """Convert Decimal to float safely."""
    if isinstance(val, Decimal):
        return float(val)
    return val or 0.0


def get_historical_stats(setup_type: str) -> HistoricalStats:
    """Synchronous version using psycopg2."""
    conn = _sync_get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                COUNT(*) as n,
                COALESCE(AVG(CASE WHEN outcome = 'win' THEN 1.0 END) * 100, 50.0) as win_rate,
                COALESCE(AVG(CASE WHEN outcome = 'win' THEN pnl_pct END), 0) as avg_return,
                COALESCE(AVG(CASE WHEN outcome = 'loss' THEN ABS(pnl_pct) END), 0) as avg_loss,
                COALESCE(MIN(pnl_pct), 0) as max_drawdown
            FROM signal_outcomes
            WHERE setup_type = %s AND outcome IN ('win', 'loss')
            """,
            (setup_type,)
        )
        row = cur.fetchone()
        n = row[0] or 0
        win_rate = _to_float(row[1])
        avg_return = _to_float(row[2])
        avg_loss = _to_float(row[3])
        expectancy = (win_rate / 100 * avg_return) - ((100 - win_rate) / 100 * avg_loss)

        cur.execute(
            "SELECT MAX(recorded_at) FROM signal_outcomes WHERE setup_type = %s",
            (setup_type,)
        )
        last_updated_row = cur.fetchone()
        last_updated = str(last_updated_row[0]) if last_updated_row and last_updated_row[0] else None

        return HistoricalStats(
            setup_type=setup_type,
            win_rate=round(win_rate, 1),
            avg_return_pct=round(avg_return, 4),
            avg_loss_pct=round(avg_loss, 4),
            max_drawdown_pct=round(abs(_to_float(row[4])), 4),
            expectancy=round(expectancy, 4),
            sample_size=n,
            last_updated=last_updated,
        )
    finally:
        conn.close()


def record_outcome(signal_id: str, setup_type: str, direction: str,
                   entry_price: float, exit_price=None, pnl_pct=None,
                   outcome=None, notes: str = "") -> int:
    """Synchronous record insert."""
    conn = _sync_get_pool()
    try:
        cur = conn.cursor()
        if pnl_pct is not None:
            if outcome is None:
                if pnl_pct > 0.1:
                    outcome = 'win'
                elif pnl_pct < -0.1:
                    outcome = 'loss'
                else:
                    outcome = 'breakeven'

        closed_at_expr = "NOW()" if exit_price is not None else "NULL"

        cur.execute(
            f"""
            INSERT INTO signal_outcomes
              (signal_id, setup_type, direction, entry_price, exit_price, pnl_pct, outcome, closed_at, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, {closed_at_expr}, %s)
            RETURNING id
            """,
            (signal_id, setup_type, direction, entry_price, exit_price, pnl_pct, outcome, notes)
        )
        conn.commit()
        return cur.fetchone()[0]
    finally:
        conn.close()


def get_all_setup_types() -> List[str]:
    conn = _sync_get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT setup_type FROM signal_outcomes ORDER BY setup_type")
        return [r[0] for r in cur.fetchall()]
    finally:
        conn.close()


def compute_setup_win_rate(setup_type: str) -> float:
    stats = get_historical_stats(setup_type)
    return stats.win_rate


def classify_setup_type(layer_scores: Dict[str, float], direction: str) -> str:
    """
    Classify a signal's setup type based on its layer scores.

    Breakout: high trend + high momentum + volume surge
    Pullback: high sentiment + moderate trend (mean-reversion entry)
    Mean-Reversion: high sentiment alignment + range-bound regime
    MomentumContinuation: high momentum + high institutional + same-dir trend
    RangeBreakout: high intermarket + moderate trend (breakout from range)
    """
    trend = layer_scores.get('trend_structure', 50)
    momentum = layer_scores.get('momentum_convergence', 50)
    sentiment = layer_scores.get('sentiment_alignment', 50)
    institutional = layer_scores.get('institutional_flow', 50)
    intermarket = layer_scores.get('intermarket_filter', 50)

    if trend > 65 and momentum > 65 and intermarket > 55:
        return 'breakout'
    elif sentiment > 70 and trend > 40 and trend < 65:
        return 'pullback'
    elif sentiment > 65 and intermarket < 45:
        return 'mean_reversion'
    elif momentum > 60 and institutional > 55:
        return 'momentumContinuation'
    elif intermarket > 60 and trend > 50:
        return 'rangeBreakout'
    else:
        return 'momentumContinuation'  # default
