"""
PerformanceTracker — internal position tracking for SystemOne-managed trades.
Tracks open positions, computes realized + unrealized P&L, and performance metrics.
"""
from __future__ import annotations
import os, math
import psycopg2
import yfinance as yf
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass


DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "systemone")
DB_USER     = os.getenv("DB_USER", "sysops")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sysone123")

LIVE_PRICE_TTL_SECONDS = 300  # 5-minute cache before Yahoo refresh


def _conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user=DB_USER, password=DB_PASSWORD,
    )


def _ensure_table():
    """Create positions table if it doesn't exist."""
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            id              SERIAL PRIMARY KEY,
            signal_id       UUID,
            symbol          VARCHAR(10) NOT NULL,
            direction       VARCHAR(10) NOT NULL,   -- LONG / SHORT
            status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN / CLOSED
            qty             DECIMAL(12, 4) NOT NULL,
            entry_price     DECIMAL(12, 4) NOT NULL,
            exit_price      DECIMAL(12, 4),
            avg_cost        DECIMAL(12, 4),        -- same as entry_price for now
            strategy        VARCHAR(50),
            entry_date      TIMESTAMPTZ DEFAULT NOW(),
            closed_at       TIMESTAMPTZ,
            notes           TEXT,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    # Track realized P&L per position
    cur.execute("""
        CREATE TABLE IF NOT EXISTS position_pnl (
            id              SERIAL PRIMARY KEY,
            position_id     INTEGER REFERENCES positions(id),
            pnl_realized    DECIMAL(12, 4),
            pnl_pct         DECIMAL(8, 4),
            outcome         VARCHAR(20),   -- WIN / LOSS / BREAKEVEN
            closed_at       TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


# ─── Pydantic-free dataclasses ────────────────────────────────────────────

@dataclass
class Position:
    id: int
    signal_id: Optional[str]
    symbol: str
    direction: str
    status: str
    qty: float
    entry_price: float
    exit_price: Optional[float]
    avg_cost: float
    strategy: Optional[str]
    entry_date: str
    closed_at: Optional[str]
    current_price: Optional[float] = None
    pnl_unrealized: Optional[float] = None
    pnl_unrealized_pct: Optional[float] = None
    pnl_realized: Optional[float] = None
    pnl_realized_pct: Optional[float] = None
    is_stale: bool = False


@dataclass
class PortfolioSummary:
    total_value: float
    total_cost: float
    total_pnl: float
    total_pnl_pct: float
    open_count: int
    closed_count: int
    win_count: int
    loss_count: int
    breakeven_count: int
    win_rate: float
    avg_win_pct: float
    avg_loss_pct: float
    expectancy: float
    largest_win: float
    largest_loss: float
    open_positions: list
    closed_positions: list


# ─── price helpers ─────────────────────────────────────────────────────────

def _live_price(symbol: str) -> tuple[Optional[float], bool]:
    """
    Returns (price, was_fresh). If stale, price is still returned as fallback.
    """
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT data, fetched_at FROM symbol_cache WHERE symbol = %s",
        (symbol.upper(),)
    )
    row = cur.fetchone()
    conn.close()

    if row:
        data, fetched_at = row
        age = (datetime.now(timezone.utc) - fetched_at).total_seconds()
        if age <= LIVE_PRICE_TTL_SECONDS:
            price = data.get("currentPrice") or data.get("regularMarketPrice")
            if price:
                return float(price), True

    # Fallback: direct Yahoo Finance
    try:
        ticker = yf.Ticker(symbol.upper())
        price = ticker.info.get("currentPrice") or ticker.info.get("regularMarketPrice")
        if price:
            return float(price), False
    except Exception:
        pass
    return None, False


# ─── core CRUD ─────────────────────────────────────────────────────────────

def open_position(
    signal_id: str,
    symbol: str,
    direction: str,
    qty: float,
    entry_price: float,
    strategy: str = "signal",
    notes: str = "",
) -> int:
    """Open a new position. Returns the position ID."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO positions
          (signal_id, symbol, direction, status, qty, entry_price, avg_cost, strategy, notes)
        VALUES (%s, %s, %s, 'OPEN', %s, %s, %s, %s, %s)
        RETURNING id
    """, (signal_id, symbol.upper(), direction.upper(), qty, entry_price, entry_price, strategy, notes))
    pos_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return pos_id


def close_position(
    position_id: int,
    exit_price: float,
    notes: str = "",
) -> Optional[dict]:
    """Close a position at exit_price. Computes and records realized P&L."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT symbol, direction, qty, entry_price, avg_cost FROM positions WHERE id = %s AND status = 'OPEN'",
        (position_id,)
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return None

    symbol, direction, qty, entry_price, avg_cost = row
    qty = float(qty); entry_price = float(entry_price); exit_price = float(exit_price)

    if direction == "LONG":
        pnl_realized = (exit_price - entry_price) * qty
    else:
        pnl_realized = (entry_price - exit_price) * qty

    pnl_pct = (exit_price - entry_price) / entry_price * 100 if direction == "LONG" \
              else (entry_price - exit_price) / entry_price * 100
    if direction == "SHORT":
        pnl_pct = -pnl_pct

    if pnl_realized > 0.1:
        outcome = "WIN"
    elif pnl_realized < -0.1:
        outcome = "LOSS"
    else:
        outcome = "BREAKEVEN"

    cur.execute("""
        UPDATE positions
        SET status='CLOSED', exit_price=%s, closed_at=NOW(), notes=CONCAT(notes, %s), updated_at=NOW()
        WHERE id = %s
    """, (exit_price, f" | closed: {notes}", position_id))

    cur.execute("""
        INSERT INTO position_pnl (position_id, pnl_realized, pnl_pct, outcome)
        VALUES (%s, %s, %s, %s)
    """, (position_id, pnl_realized, pnl_pct, outcome))

    conn.commit()
    cur.close()
    conn.close()
    return {"position_id": position_id, "pnl_realized": round(pnl_realized, 2),
            "pnl_pct": round(pnl_pct, 2), "outcome": outcome}


def get_position(position_id: int) -> Optional[Position]:
    """Get a single position with current P&L."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM positions WHERE id = %s", (position_id,))
    row = cur.fetchone()
    cols = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    if not row:
        return None
    return _row_to_position(dict(zip(cols, row)))


def get_open_positions() -> list[Position]:
    """Get all open positions with live P&L."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM positions WHERE status = 'OPEN' ORDER BY entry_date DESC")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    return [_row_to_position(dict(zip(cols, r))) for r in rows]


def get_closed_positions(limit: int = 50) -> list[Position]:
    """Get closed positions for performance history."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM positions WHERE status = 'CLOSED' ORDER BY closed_at DESC LIMIT %s",
        (limit,)
    )
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    return [_row_to_position(dict(zip(cols, r))) for r in rows]


def _row_to_position(row: dict) -> Position:
    """Convert a DB row dict to a Position dataclass with live P&L computed."""
    symbol = str(row.get("symbol", ""))
    qty    = float(row.get("qty", 0) or 0)
    entry  = float(row.get("entry_price", 0) or 0)
    exit_p = float(row["exit_price"]) if row.get("exit_price") else None
    direction = str(row.get("direction", "LONG"))
    status = str(row.get("status", "OPEN"))

    current_price, is_fresh = _live_price(symbol) if status == "OPEN" else (exit_p, True)
    is_stale = not is_fresh if status == "OPEN" else False

    pnl_unrealized = None
    pnl_unrealized_pct = None
    if status == "OPEN" and current_price and entry > 0:
        if direction == "LONG":
            pnl_unrealized = (current_price - entry) * qty
        else:
            pnl_unrealized = (entry - current_price) * qty
        pnl_unrealized_pct = (current_price - entry) / entry * 100 if direction == "LONG" \
                            else (entry - current_price) / entry * 100
        if direction == "SHORT":
            pnl_unrealized_pct = -pnl_unrealized_pct

    pnl_realized = None
    pnl_realized_pct = None
    if status == "CLOSED" and exit_p and entry > 0:
        if direction == "LONG":
            pnl_realized = (exit_p - entry) * qty
        else:
            pnl_realized = (entry - exit_p) * qty
        pnl_realized_pct = (exit_p - entry) / entry * 100 if direction == "LONG" \
                          else (entry - exit_p) / entry * 100
        if direction == "SHORT":
            pnl_realized_pct = -pnl_realized_pct

    def fmt(val):
        if val is None: return None
        return round(float(val), 2)

    return Position(
        id=int(row["id"]),
        signal_id=str(row["signal_id"]) if row.get("signal_id") else None,
        symbol=symbol,
        direction=direction,
        status=status,
        qty=qty,
        entry_price=fmt(entry),
        exit_price=fmt(exit_p),
        avg_cost=fmt(float(row.get("avg_cost", entry) or entry)),
        strategy=str(row.get("strategy") or ""),
        entry_date=str(row.get("entry_date") or ""),
        closed_at=str(row.get("closed_at")) if row.get("closed_at") else None,
        current_price=fmt(current_price),
        pnl_unrealized=fmt(pnl_unrealized),
        pnl_unrealized_pct=fmt(pnl_unrealized_pct),
        pnl_realized=fmt(pnl_realized),
        pnl_realized_pct=fmt(pnl_realized_pct),
        is_stale=is_stale,
    )


# ─── portfolio summary ─────────────────────────────────────────────────────

def get_portfolio_summary() -> PortfolioSummary:
    """Full portfolio performance summary."""
    open_positions   = get_open_positions()
    closed_positions  = get_closed_positions(limit=200)

    open_value   = sum(p.current_price * p.qty for p in open_positions if p.current_price)
    open_cost    = sum(p.entry_price  * p.qty for p in open_positions)
    unrealized   = sum(p.pnl_unrealized for p in open_positions if p.pnl_unrealized is not None)

    realized     = sum(p.pnl_realized for p in closed_positions if p.pnl_realized is not None)

    wins   = [p for p in closed_positions if p.pnl_realized and p.pnl_realized > 0]
    losses = [p for p in closed_positions if p.pnl_realized and p.pnl_realized < 0]
    bes    = [p for p in closed_positions if p.pnl_realized is not None
              and abs(p.pnl_realized) <= 0.10]

    total_trades = len(closed_positions)
    win_rate = len(wins) / total_trades * 100 if total_trades > 0 else 0
    avg_win  = sum(p.pnl_realized_pct for p in wins) / len(wins) if wins else 0
    avg_loss = sum(p.pnl_realized_pct for p in losses) / len(losses) if losses else 0
    expectancy = win_rate / 100 * avg_win - (1 - win_rate / 100) * abs(avg_loss) if total_trades > 0 else 0

    largest_win  = max((p.pnl_realized for p in wins), default=0)
    largest_loss = min((p.pnl_realized for p in losses), default=0)

    return PortfolioSummary(
        total_value=round(open_value, 2),
        total_cost=round(open_cost, 2),
        total_pnl=round(unrealized + realized, 2),
        total_pnl_pct=round((unrealized + realized) / open_cost * 100, 2) if open_cost > 0 else 0,
        open_count=len(open_positions),
        closed_count=len(closed_positions),
        win_count=len(wins),
        loss_count=len(losses),
        breakeven_count=len(bes),
        win_rate=round(win_rate, 1),
        avg_win_pct=round(avg_win, 2),
        avg_loss_pct=round(avg_loss, 2),
        expectancy=round(expectancy, 4),
        largest_win=round(largest_win, 2),
        largest_loss=round(largest_loss, 2),
        open_positions=open_positions,
        closed_positions=closed_positions,
    )


def get_position_by_signal(signal_id: str) -> Optional[Position]:
    """Find an open position by its originating signal_id."""
    _ensure_table()
    conn = _conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM positions WHERE signal_id = %s AND status = 'OPEN' LIMIT 1",
        (signal_id,)
    )
    row = cur.fetchone()
    cols = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    if not row:
        return None
    return _row_to_position(dict(zip(cols, row)))
