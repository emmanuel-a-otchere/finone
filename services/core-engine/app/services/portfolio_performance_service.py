"""
Portfolio performance service.
Computes P&L, sector allocation, and per-holding metrics using live prices
from the symbol_cache (or live Yahoo Finance if not cached).
"""
import psycopg2
import yfinance as yf
from datetime import datetime, timezone
from typing import Optional

TTL_DYNAMIC = 900  # 15 minutes — price TTL


def get_live_price(symbol: str) -> Optional[float]:
    """Get current price from symbol_cache if fresh, else Yahoo Finance directly."""
    conn = psycopg2.connect(host="localhost", database="systemone", user="sysops", password="sysone123")
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
        if age <= TTL_DYNAMIC and data.get("current_price"):
            return float(data["current_price"])

    # Fallback: live fetch from Yahoo Finance
    try:
        ticker = yf.Ticker(symbol.upper())
        price = ticker.info.get("currentPrice") or ticker.info.get("regularMarketPrice")
        if price:
            return float(price)
    except Exception:
        pass
    return None


def compute_performance(holdings: list) -> dict:
    """
    holdings: list of dicts with keys: symbol, qty, avg_cost, strategy, entry_date
    Returns performance dict with per-holding metrics and portfolio totals.
    """
    results = []
    total_cost = 0.0
    total_value = 0.0
    sector_map = {}  # symbol -> sector (for allocation)

    # Pre-fetch sectors from cache for allocation
    conn = psycopg2.connect(host="localhost", database="systemone", user="sysops", password="sysone123")
    cur = conn.cursor()

    for h in holdings:
        symbol = h.get("symbol", "").upper()
        qty = float(h.get("qty", 0))
        avg_cost = float(h.get("avg_cost", 0))
        cost = qty * avg_cost

        current_price = get_live_price(symbol)
        current_value = qty * current_price if current_price else None

        pnl = (current_value - cost) if current_value is not None else None
        pnl_pct = (pnl / cost * 100) if pnl is not None and cost > 0 else None

        # Get sector for allocation
        cur.execute("SELECT data FROM symbol_cache WHERE symbol = %s", (symbol,))
        row = cur.fetchone()
        sector = None
        if row:
            sector = row[0].get("sector") if isinstance(row[0], dict) else None

        results.append({
            "symbol": symbol,
            "qty": qty,
            "avg_cost": avg_cost,
            "current_price": current_price,
            "current_value": round(current_value, 2) if current_value is not None else None,
            "cost": round(cost, 2),
            "pnl": round(pnl, 2) if pnl is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
            "strategy": h.get("strategy"),
            "entry_date": h.get("entry_date"),
            "sector": sector,
            "is_stale": current_price is None,  # flagged if no live price available
        })

        if current_value is not None:
            total_value += current_value
        total_cost += cost

        if sector:
            sector_map[symbol] = sector

    conn.close()

    total_pnl = total_value - total_cost if total_value > 0 else None
    total_pnl_pct = (total_pnl / total_cost * 100) if total_pnl is not None and total_cost > 0 else None

    # Sector allocation
    sector_values: dict[str, float] = {}
    for r in results:
        if r["sector"] and r["current_value"]:
            sector_values[r["sector"]] = sector_values.get(r["sector"], 0) + r["current_value"]

    sector_allocation = []
    for sec, val in sorted(sector_values.items(), key=lambda x: -x[1]):
        pct = (val / total_value * 100) if total_value > 0 else 0
        sector_allocation.append({"sector": sec, "value": round(val, 2), "pct": round(pct, 1)})

    # Top winners / losers (by P&L %)
    with_pnl = [r for r in results if r["pnl_pct"] is not None]
    sorted_by_pnl = sorted(with_pnl, key=lambda x: x["pnl_pct"], reverse=True)
    top_winners = sorted_by_pnl[:3]
    top_losers = sorted_by_pnl[-3:] if len(sorted_by_pnl) > 3 else sorted_by_pnl

    return {
        "holdings": results,
        "summary": {
            "total_cost": round(total_cost, 2),
            "total_value": round(total_value, 2),
            "total_pnl": round(total_pnl, 2) if total_pnl is not None else None,
            "total_pnl_pct": round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
            "holding_count": len(holdings),
        },
        "sector_allocation": sector_allocation,
        "top_winners": [{"symbol": r["symbol"], "pnl_pct": r["pnl_pct"], "pnl": r["pnl"]} for r in top_winners],
        "top_losers": [{"symbol": r["symbol"], "pnl_pct": r["pnl_pct"], "pnl": r["pnl"]} for r in top_losers],
        "as_of": datetime.now(timezone.utc).isoformat(),
    }