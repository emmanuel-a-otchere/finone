"""Screener API — cached stock/ETF discovery with real Yahoo Finance data."""

import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

import yfinance as yf
import numpy as np

router = APIRouter(prefix="/screener", tags=["screener"])

# ── Universe ─────────────────────────────────────────────────────────────────
DEFAULT_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "NFLX",
    "AMD", "INTC", "AVGO", "QCOM", "MU", "ARM",
    "JPM", "BAC", "GS", "MS", "WFC", "C",
    "JNJ", "PFE", "UNH", "ABBV", "LLY", "MRK",
    "XOM", "CVX", "COP", "OXY", "SLB",
    "WMT", "COST", "HD", "NKE", "MCD", "SBUX",
    "BA", "GE", "CAT", "UPS", "HON",
    "SPY", "QQQ", "IWM", "VIXY", "XLF", "XLK", "XLE", "XLV",
    "GME", "AMC", "PLTR", "COIN", "RIVN", "SOFI", "SMCI", "HOOD",
]

_executor = ThreadPoolExecutor(max_workers=8)

# ── Cache ────────────────────────────────────────────────────────────────────
_screener_cache: dict = {}
_cache_timestamp: Optional[datetime] = None
_CACHE_TTL = 300  # 5 minutes


# ── Models ───────────────────────────────────────────────────────────────────
class ScreenerResult(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float
    volume: int
    avg_volume: int
    vol_ratio: float
    market_cap: Optional[float]
    market_cap_fmt: str
    pe_ratio: Optional[float]
    sector: str
    industry: str
    fifty_two_week_high: float
    fifty_two_week_low: float
    range_pct: float
    beta: Optional[float]
    dividend_yield: Optional[float]
    recommendation: str
    rsi_14: Optional[float]
    ema_20: Optional[float]
    ema_50: Optional[float]
    trend: str
    hotness: float


class ScreenerResponse(BaseModel):
    results: list[ScreenerResult]
    count: int
    scanned_at: str
    filters_applied: dict
    cached: bool


# ── Helpers ──────────────────────────────────────────────────────────────────
def _fmt_cap(val: Optional[float]) -> str:
    if not val:
        return "—"
    if val >= 1e12:
        return f"${val/1e12:.2f}T"
    if val >= 1e9:
        return f"${val/1e9:.1f}B"
    if val >= 1e6:
        return f"${val/1e6:.1f}M"
    return f"${val:,.0f}"


def _compute_rsi(closes: np.ndarray, period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _compute_ema(closes: np.ndarray, period: int) -> Optional[float]:
    if len(closes) < period:
        return None
    weights = np.exp(np.linspace(-1., 0., period))
    weights /= weights.sum()
    return np.convolve(closes, weights, mode='valid')[-1]


def _fetch_one(symbol: str) -> Optional[dict]:
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period="3mo", interval="1d", auto_adjust=True)
        if hist.empty or len(hist) < 20:
            return None

        info = t.info
        price = float(info.get("currentPrice") or info.get("regularMarketPrice") or hist["Close"].iloc[-1])
        prev_close = float(info.get("previousClose") or hist["Close"].iloc[-2])
        change_pct = round((price - prev_close) / prev_close * 100, 2) if prev_close else 0.0

        vol = int(hist["Volume"].iloc[-1])
        avol = float(hist["Volume"].tail(20).mean())
        vol_ratio = round(vol / avol, 2) if avol else 0.0

        cap = info.get("marketCap")
        pe = info.get("trailingPE") or info.get("forwardPE")
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")
        w52h = float(info.get("fiftyTwoWeekHigh") or price)
        w52l = float(info.get("fiftyTwoWeekLow") or price)
        range_pct = round((price - w52l) / (w52h - w52l) * 100, 1) if w52h > w52l else 0.0
        beta = info.get("beta")
        div_yield = info.get("dividendYield")
        if div_yield and div_yield > 1:
            div_yield = div_yield / 100

        rec = info.get("recommendationKey", "none")
        rec_map = {
            "strong_buy": "Strong Buy", "buy": "Buy", "hold": "Hold",
            "sell": "Sell", "strong_sell": "Strong Sell", "none": "—",
        }
        recommendation = rec_map.get(rec, rec.replace("_", " ").title())

        closes = hist["Close"].values
        rsi = _compute_rsi(closes)
        ema20 = _compute_ema(closes, 20)
        ema50 = _compute_ema(closes, 50)

        if ema20 and ema50:
            if price > ema20 and price > ema50:
                trend = "ABOVE_BOTH"
            elif price > ema20:
                trend = "ABOVE_EMA20"
            elif price > ema50:
                trend = "ABOVE_EMA50"
            else:
                trend = "BELOW_BOTH"
        elif ema20 and price > ema20:
            trend = "ABOVE_EMA20"
        else:
            trend = "UNKNOWN"

        hotness = 0.0
        if vol_ratio > 1:
            hotness += min(vol_ratio * 10, 30)
        hotness += abs(change_pct) * 2
        if range_pct > 50:
            hotness += 10
        if rsi and (rsi > 70 or rsi < 30):
            hotness += 10
        hotness = min(hotness, 100)

        return {
            "symbol": symbol,
            "name": info.get("longName", info.get("shortName", symbol)),
            "price": round(price, 2),
            "change_pct": change_pct,
            "volume": vol,
            "avg_volume": int(avol),
            "vol_ratio": vol_ratio,
            "market_cap": cap,
            "market_cap_fmt": _fmt_cap(cap),
            "pe_ratio": round(pe, 2) if pe else None,
            "sector": sector,
            "industry": industry,
            "fifty_two_week_high": round(w52h, 2),
            "fifty_two_week_low": round(w52l, 2),
            "range_pct": range_pct,
            "beta": round(beta, 2) if beta else None,
            "dividend_yield": round(div_yield * 100, 2) if div_yield else None,
            "recommendation": recommendation,
            "rsi_14": round(rsi, 1) if rsi else None,
            "ema_20": round(ema20, 2) if ema20 else None,
            "ema_50": round(ema50, 2) if ema50 else None,
            "trend": trend,
            "hotness": round(hotness, 1),
        }
    except Exception:
        return None


def _refresh_cache():
    """Background refresh of screener cache."""
    global _screener_cache, _cache_timestamp
    futs = {_executor.submit(_fetch_one, s): s for s in DEFAULT_UNIVERSE}
    rows = []
    for f in as_completed(futs, timeout=60):
        try:
            r = f.result()
            if r is not None:
                rows.append(r)
        except Exception:
            pass
    _screener_cache = {r["symbol"]: r for r in rows}
    _cache_timestamp = datetime.utcnow()
    print(f"[screener] Cache refreshed: {len(rows)} symbols")


# ── Endpoint ─────────────────────────────────────────────────────────────────
@router.get("/stocks", response_model=ScreenerResponse)
async def screener_stocks(
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_change_pct: Optional[float] = Query(None),
    max_change_pct: Optional[float] = Query(None),
    min_volume: Optional[int] = Query(None, ge=0),
    min_vol_ratio: Optional[float] = Query(None, ge=0),
    sector: Optional[str] = Query(None),
    min_market_cap: Optional[float] = Query(None, ge=0),
    max_pe: Optional[float] = Query(None, ge=0),
    min_rsi: Optional[float] = Query(None, ge=0, le=100),
    max_rsi: Optional[float] = Query(None, ge=0, le=100),
    trend: Optional[str] = Query(None),
    min_hotness: Optional[float] = Query(None, ge=0, le=100),
    recommendation: Optional[str] = Query(None),
    sort_by: str = Query("hotness"),
    sort_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
):
    """Filterable stock screener with cached Yahoo Finance data."""
    global _screener_cache, _cache_timestamp

    # Refresh cache if stale or empty
    if not _screener_cache or not _cache_timestamp or (datetime.utcnow() - _cache_timestamp).total_seconds() > _CACHE_TTL:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(_executor, _refresh_cache)

    rows = list(_screener_cache.values())
    cached = True

    # Apply filters
    filtered = rows
    if min_price is not None:
        filtered = [r for r in filtered if r["price"] >= min_price]
    if max_price is not None:
        filtered = [r for r in filtered if r["price"] <= max_price]
    if min_change_pct is not None:
        filtered = [r for r in filtered if r["change_pct"] >= min_change_pct]
    if max_change_pct is not None:
        filtered = [r for r in filtered if r["change_pct"] <= max_change_pct]
    if min_volume is not None:
        filtered = [r for r in filtered if r["volume"] >= min_volume]
    if min_vol_ratio is not None:
        filtered = [r for r in filtered if r["vol_ratio"] >= min_vol_ratio]
    if sector is not None:
        filtered = [r for r in filtered if r["sector"].lower() == sector.lower()]
    if min_market_cap is not None:
        filtered = [r for r in filtered if (r["market_cap"] or 0) >= min_market_cap]
    if max_pe is not None:
        filtered = [r for r in filtered if r["pe_ratio"] is not None and r["pe_ratio"] <= max_pe]
    if min_rsi is not None:
        filtered = [r for r in filtered if r["rsi_14"] is not None and r["rsi_14"] >= min_rsi]
    if max_rsi is not None:
        filtered = [r for r in filtered if r["rsi_14"] is not None and r["rsi_14"] <= max_rsi]
    if trend is not None:
        filtered = [r for r in filtered if r["trend"] == trend]
    if min_hotness is not None:
        filtered = [r for r in filtered if r["hotness"] >= min_hotness]
    if recommendation is not None:
        filtered = [r for r in filtered if recommendation.lower() in r["recommendation"].lower()]

    # Sort
    reverse = sort_dir == "desc"
    if sort_by == "hotness":
        filtered.sort(key=lambda x: x["hotness"], reverse=reverse)
    elif sort_by == "change_pct":
        filtered.sort(key=lambda x: x["change_pct"], reverse=reverse)
    elif sort_by == "volume":
        filtered.sort(key=lambda x: x["volume"], reverse=reverse)
    elif sort_by == "vol_ratio":
        filtered.sort(key=lambda x: x["vol_ratio"], reverse=reverse)
    elif sort_by == "pe_ratio":
        filtered.sort(key=lambda x: (x["pe_ratio"] or 9999), reverse=reverse)
    elif sort_by == "rsi_14":
        filtered.sort(key=lambda x: (x["rsi_14"] or 50), reverse=reverse)
    elif sort_by == "market_cap":
        filtered.sort(key=lambda x: (x["market_cap"] or 0), reverse=reverse)
    elif sort_by == "beta":
        filtered.sort(key=lambda x: (x["beta"] or 0), reverse=reverse)

    results = filtered[:limit]

    return ScreenerResponse(
        results=results,
        count=len(results),
        scanned_at=_cache_timestamp.isoformat() if _cache_timestamp else datetime.utcnow().isoformat(),
        filters_applied={
            k: v for k, v in {
                "min_price": min_price, "max_price": max_price,
                "min_change_pct": min_change_pct, "max_change_pct": max_change_pct,
                "min_volume": min_volume, "min_vol_ratio": min_vol_ratio,
                "sector": sector, "min_market_cap": min_market_cap,
                "max_pe": max_pe, "min_rsi": min_rsi, "max_rsi": max_rsi,
                "trend": trend, "min_hotness": min_hotness,
                "recommendation": recommendation,
                "sort_by": sort_by, "sort_dir": sort_dir, "limit": limit,
            }.items() if v is not None
        },
        cached=cached,
    )
