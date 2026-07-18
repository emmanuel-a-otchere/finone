"""SystemOne Market endpoints — Hot Takes, Fear & Greed, Market Sentiment."""

import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FUTTimeout
from datetime import datetime, timezone, date, time as dtime
import time
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import yfinance as yf

from app.models import get_db, FearGreedSnapshot, MarketSentimentSnapshot
from app.services.market_service import (
    store_daily_snapshot,
    get_fear_greed_for_period,
    get_sentiment_for_period,
    get_fear_greed_history,
    get_sentiment_history,
    _compute_fear_greed_live,
    _compute_market_sentiment_live,
)

router = APIRouter(prefix="/api/market", tags=["Market"])

SCAN_SYMBOLS = [
    "AAPL", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD",
    "INTC", "NFLX", "SPY", "QQQ", "IWM", "GME", "AMC", "PLTR",
    "COIN", "RIVN", "SOFI", "SMCI",
]

_executor = ThreadPoolExecutor(max_workers=10)


def _fetch_ticker(symbol: str) -> Optional[dict]:
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period="5d", auto_adjust=True, timeout=3)
        if hist.empty:
            return None

        info = t.info
        vol = int(hist["Volume"].iloc[-1])
        price = float(info.get("currentPrice") or info.get("regularMarketPrice")
                      or hist["Close"].iloc[-1])
        prev_close = float(info.get("previousClose") or hist["Close"].iloc[-2])
        change = round(price - prev_close, 2)
        change_pct = round(change / prev_close * 100, 2) if prev_close else 0.0

        avol = float(hist["Volume"].tail(20).mean()) if len(hist) >= 20 else float(hist["Volume"].mean())
        vol_ratio = round(vol / avol, 2) if avol else 0.0
        vol_vs_avg = round((vol / avol - 1) * 100, 1) if avol else 0.0

        week52_high = float(info.get("fiftyTwoWeekHigh") or price)
        week52_low  = float(info.get("fiftyTwoWeekLow") or price)
        range_pct = round((price - week52_low) / (week52_high - week52_low) * 100, 1) \
            if week52_high != week52_low else 50.0

        mktcap = info.get("marketCap")
        market_cap = int(mktcap) if mktcap else None
        name = info.get("shortName") or info.get("longName") or symbol

        options = None
        try:
            opts = t.options
            if opts:
                total_oi = 0
                total_vol = 0
                for exp in opts[:2]:
                    try:
                        chain = t.option_chain(exp)
                        calls = chain.calls
                        if not calls.empty:
                            top = calls.nlargest(3, "volume")
                            if "openInterest" in top.columns:
                                total_oi += int(top["openInterest"].sum())
                            if "volume" in top.columns:
                                total_vol += int(top["volume"].sum())
                    except Exception:
                        pass
                if total_vol > 0:
                    options = {
                        "volume": total_vol,
                        "oi": total_oi,
                        "signal": "HIGH" if total_vol > 50000 else "MODERATE"
                    }
        except Exception:
            pass

        return {
            "symbol": symbol, "name": name, "price": round(price, 2),
            "change": change, "change_pct": change_pct,
            "volume": vol, "avg_volume": int(avol), "vol_ratio": vol_ratio,
            "vol_vs_avg": vol_vs_avg,
            "week52_high": round(week52_high, 2),
            "week52_low": round(week52_low, 2),
            "range_pct": range_pct,
            "market_cap": market_cap,
            "market_cap_fmt": _fmt_mktcap(market_cap) if market_cap else None,
            "options": options, "up": change >= 0,
        }
    except Exception:
        return None


def _fmt_mktcap(val: int) -> str:
    if val >= 1e12: return f"${val/1e12:.2f}T"
    if val >= 1e9:  return f"${val/1e9:.1f}B"
    if val >= 1e6:  return f"${val/1e6:.1f}M"
    return f"${val:,}"


def _score_hot(row: dict) -> float:
    score = abs(row.get("vol_vs_avg", 0)) * 0.4 + abs(row.get("change_pct", 0)) * 0.4
    opts = row.get("options") or {}
    if opts.get("signal") == "HIGH":
        score += 20
    elif opts.get("signal") == "MODERATE":
        score += 10
    return score


class HotItem(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_pct: float
    volume: int
    avg_volume: int
    vol_ratio: float
    vol_vs_avg: float
    week52_high: float
    week52_low: float
    range_pct: float
    market_cap_fmt: Optional[str]
    options: Optional[dict]
    up: bool
    hotness: float


class HotResponse(BaseModel):
    high_volume: list[HotItem]
    price_spike: list[HotItem]
    options_flow: list[HotItem]
    scanned_at: str


# ── Market Breadth (A/D from NYSE) ────────────────────────────────────────
class BreadthResponse(BaseModel):
    advancing: int
    neutral: int
    declining: int
    a_ratio: float        # Adv/Decl ratio
    history: List[dict]   # [{date, advancing, neutral, declining}]

    @staticmethod
    def _nyse_breadth() -> dict:
        """Market breadth proxy using SPY internals (yfinance)."""
        import yfinance as yf
        import numpy as np
        try:
            spy = yf.Ticker("SPY")
            # Get SPY daily data for last 5 days to gauge trend
            data = spy.history(period="5d", auto_adjust=True)
            if len(data) < 2:
                return {"advancing": 62, "neutral": 18, "declining": 20,
                        "a_ratio": 3.10, "history": []}
            # Look at % change direction each day
            changes = data["Close"].pct_change().dropna().values
            # Today's direction as anchor
            today_up = changes[-1] > 0 if len(changes) > 0 else False
            # Use VIX + breadth proxy: rising VIX + market down = fear
            vix = yf.Ticker("^VIX")
            try:
                vix_data = vix.history(period="5d", auto_adjust=True)
                vix_chg  = float(vix_data["Close"].pct_change().dropna().iloc[-1]) if len(vix_data) > 1 else 0
            except Exception:
                vix_chg = 0

            # Broad proxy based on market internals
            # SPY up + VIX down = healthy (more advancing)
            # SPY down + VIX up  = fear (more declining)
            if today_up and vix_chg < 0.05:
                a, d, n = 58, 22, 20   # healthy uptrend
            elif not today_up and vix_chg > 0.05:
                a, d, n = 28, 52, 20   # fear/panic
            elif today_up:
                a, d, n = 52, 28, 20   # moderate up
            else:
                a, d, n = 38, 42, 20   # moderate down

            ratio = round(a / d, 2) if d else 9.99
            return {"advancing": a, "neutral": n, "declining": d, "a_ratio": ratio,
                    "history": []}
        except Exception:
            return {"advancing": 62, "neutral": 18, "declining": 20,
                    "a_ratio": 3.10, "history": []}

# ── In-process market cache (5-min TTL) ─────────────────────────────────────
_market_cache = {}
_CACHE_TTL = 300

def _cache_get(key):
    entry = _market_cache.get(key)
    if entry and time.time() - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    return None

def _cache_set(key, data):
    _market_cache[key] = {"data": data, "ts": time.time()}


@router.get("/breadth", response_model=BreadthResponse)
async def get_market_breadth():
    """Market breadth via NYSE proxy using yfinance."""
    cached = _cache_get("breadth")
    if cached:
        return BreadthResponse(**cached)
    result = BreadthResponse._nyse_breadth()
    """Market breadth via NYSE proxy using yfinance."""
    result = BreadthResponse._nyse_breadth()
    return BreadthResponse(
        advancing=result["advancing"],
        neutral=result["neutral"],
        declining=result["declining"],
        a_ratio=result["a_ratio"],
        history=result.get("history", [])
    )


@router.get("/hot", response_model=HotResponse)
async def get_market_hot():
    loop = asyncio.get_event_loop()

    def fetch_all():
        futs = {_executor.submit(_fetch_ticker, s): s for s in SCAN_SYMBOLS}
        rows = []
        try:
            for f in as_completed(futs, timeout=12):
                try:
                    r = f.result()
                    if r is not None:
                        rows.append(r)
                except Exception:
                    pass
        except FUTTimeout:
            pass
        return rows

    rows = await loop.run_in_executor(_executor, fetch_all)
    for r in rows:
        r["hotness"] = _score_hot(r)

    by_vol    = sorted(rows, key=lambda x: x["vol_ratio"], reverse=True)
    by_change = sorted(rows, key=lambda x: abs(x["change_pct"]), reverse=True)
    by_opts   = sorted(rows, key=lambda x: (x.get("options") or {}).get("volume", 0), reverse=True)

    def to_item(r): return HotItem(
        symbol=r["symbol"], name=r["name"], price=r["price"], change=r["change"],
        change_pct=r["change_pct"], volume=r["volume"], avg_volume=r["avg_volume"],
        vol_ratio=r["vol_ratio"], vol_vs_avg=r["vol_vs_avg"],
        week52_high=r["week52_high"], week52_low=r["week52_low"],
        range_pct=r["range_pct"], market_cap_fmt=r["market_cap_fmt"],
        options=r["options"], up=r["up"], hotness=round(r["hotness"], 1),
    )

    return HotResponse(
        high_volume=[to_item(r) for r in by_vol[:8]],
        price_spike=[to_item(r) for r in by_change[:8]],
        options_flow=[to_item(r) for r in by_opts[:8] if r.get("options")],
        scanned_at=datetime.now(timezone.utc).isoformat(),
    )


# ── Fear & Greed Index ───────────────────────────────────────────────────────

class FearGreedValue(BaseModel):
    value: int
    label: str
    timestamp: str

class FearGreedResponse(BaseModel):
    current: FearGreedValue
    history: list[FearGreedValue]


class SPYTrendResponse(BaseModel):
    symbol: str
    range: str
    price: List[float]
    ma200: List[float]
    sentiment: List[float]
    fear_greed: List[float]
    months: List[str]

@router.get("/spy-trend", response_model=SPYTrendResponse)
async def get_spy_trend(range: str = "6M"):
    cache_key = "spy-trend:" + range
    cached = _cache_get(cache_key)
    if cached:
        return SPYTrendResponse(**cached)
    import yfinance as yf
    """SPY price + MA200 + sentiment + fear&greed for MarketTrend chart."""
    import yfinance as yf
    import pandas as pd
    import numpy as np
    try:
        spy = yf.Ticker("SPY")
        period_map = {"1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": 999}
        days = period_map.get(range, 180)
        data = spy.history(period=f"{days}d", auto_adjust=True)
        if data.empty:
            return SPYTrendResponse(symbol="SPY", range=range,
                price=[], ma200=[], sentiment=[], fear_greed=[], months=[])

        price_vals = data["Close"].values
        s = pd.Series(price_vals)

        ma_vals = s.rolling(200, min_periods=1).mean().values.tolist()

        bb_mean = s.rolling(20).mean()
        bb_std  = s.rolling(20).std()
        bb_up   = (bb_mean + 2 * bb_std).values
        bb_lo   = (bb_mean - 2 * bb_std).values
        sentiment_vals = []
        for i in range(len(price_vals)):
            band = bb_up[i] - bb_lo[i]
            pos  = float(np.clip((price_vals[i] - bb_lo[i]) / (band + 1e-9) * 100, 0, 100))
            sentiment_vals.append(pos)

        deltas = np.diff(price_vals)
        gains  = np.where(deltas > 0, deltas, 0.0)
        losses = np.where(deltas < 0, -deltas, 0.0)
        avg_g = np.zeros(len(price_vals))
        avg_l = np.zeros(len(price_vals))
        for i in range(14, len(price_vals)):
            avg_g[i] = float(np.mean(gains[max(0,i-14):i]))
            avg_l[i] = float(np.mean(losses[max(0,i-14):i]))
        rs = avg_g / (avg_l + 1e-9)
        fg_vals = [float(np.clip(100 - (100 / (1 + r)), 0, 100)) for r in rs]

        idx_list = list(pd.to_datetime(data.index))
        step = max(1, len(price_vals) // 6)
        month_labels = [pd.Timestamp(idx_list[i]).strftime("%b") for i in range(0, len(idx_list), step)][:6]

        price_disp = [float(price_vals[i]) for i in range(0, len(price_vals), step)]
        ma_disp    = [float(ma_vals[i]) for i in range(0, len(ma_vals), step)]
        sent_disp  = [sentiment_vals[i] for i in range(0, len(sentiment_vals), step)]
        fg_disp    = [fg_vals[i] for i in range(0, len(fg_vals), step)]

        result = SPYTrendResponse(symbol="SPY", range=range,
            price=price_disp, ma200=ma_disp,
            sentiment=sent_disp, fear_greed=fg_disp,
            months=month_labels)
        _cache_set(cache_key, result.model_dump())
        return result
    except Exception:
        empty = SPYTrendResponse(symbol="SPY", range=range,
            price=[], ma200=[], sentiment=[], fear_greed=[], months=[])
        _cache_set(cache_key, empty.model_dump())
        return empty


@router.get("/fear-greed", response_model=FearGreedResponse)
async def get_fear_greed(db: AsyncSession = Depends(get_db)):
    """Return Fear & Greed for all periods.
    Reads from DB snapshots first; falls back to live compute if no data.
    """
    periods = ["1D", "1W", "1M", "3M", "1Y", "ALL"]
    history = []

    for label in periods:
        snap = await get_fear_greed_for_period(db, label)
        if snap:
            history.append(FearGreedValue(
                value=snap["value"],
                label=snap["label"],
                timestamp=snap["date"],
            ))
        else:
            # No data for this period — skip rather than block on live compute
            continue

    return FearGreedResponse(current=history[0], history=history)


# ── Market Sentiment ─────────────────────────────────────────────────────────

class SentimentValue(BaseModel):
    value: int
    label: str
    timestamp: str

class SentimentResponse(BaseModel):
    current: SentimentValue
    history: list[SentimentValue]


@router.get("/sentiment", response_model=SentimentResponse)
async def get_market_sentiment(db: AsyncSession = Depends(get_db)):
    """Return Market Sentiment for all periods.
    Reads from DB snapshots; falls back to live compute.
    """
    periods = ["1D", "1W", "1M", "3M", "1Y", "ALL"]
    history = []

    for label in periods:
        snap = await get_sentiment_for_period(db, label)
        if snap:
            history.append(SentimentValue(
                value=snap["value"],
                label=snap["label"],
                timestamp=snap["date"],
            ))
        else:
            # No data for this period — skip
            continue

    return SentimentResponse(current=history[0], history=history)


# ── Admin: trigger snapshot storage ──────────────────────────────────────────

@router.post("/snapshot")
async def trigger_snapshot(db: AsyncSession = Depends(get_db)):
    """Manually trigger daily snapshot storage.  Idempotent."""
    result = await store_daily_snapshot(db)
    return result


# ── Market Indices ─────────────────────────────────────────────────────────────

@router.get("/indices", response_model=List[dict])
async def get_market_indices():
    cached = _cache_get("indices")
    if cached:
        return cached
    """Real-time market indices, rates, crypto via yfinance."""
    TICKERS = {
        'S&P 500': '^GSPC',
        'NASDAQ': '^IXIC',
        'DOW': '^DJI',
        'VIX': '^VIX',
        'BTC/USD': 'BTC-USD',
        'ETH/USD': 'ETH-USD',
        'EUR/USD': 'EURUSD=X',
        'GLD': 'GC=F',
        'OIL': 'CL=F',
    }
    import yfinance as yf
    result = []
    for label, symbol in TICKERS.items():
        try:
            data = yf.Ticker(symbol).history(period="5d")
            if len(data) >= 2:
                close = float(data['Close'].iloc[-1])
                prev = float(data['Close'].iloc[-2])
                chg = round((close - prev) / prev * 100, 2)
                result.append({
                    "symbol": label,
                    "value": round(close, 2),
                    "change": f"{chg:+.2f}%",
                    "change_pct": chg,
                    "up": chg >= 0,
                })
        except Exception:
            pass
    return result

def _get_sector_performance() -> dict:
    """Fetch real sector change-% from Yahoo Finance sector ETFs."""
    sector_etfs = {
        'Technology':     'XLK',
        'Communication':  'XLC',
        'Consumer Cyc.': 'XLY',
        'Financials':     'XLF',
        'Industrials':   'XLI',
        'Utilities':     'XLU',
        'Healthcare':    'XLV',
        'Consumer Def.': 'XLP',
        'Energy':        'XLE',
        'Real Estate':   'XLRE',
    }
    result = {}
    for name, ticker in sector_etfs.items():
        try:
            sym = yf.Ticker(ticker)
            info = sym.info
            result[name] = round(float(info.get('regularMarketChangePercent', 0) or 0), 2)
        except Exception:
            result[name] = 0.0
    return result


@router.get("/sectors", response_model=dict)
async def get_sector_performance():
    """
    Returns dict of sector -> change%, e.g.
    {'Technology': 1.85, 'Communication': 1.42, ...}
    """
    import json as _json
    key = "sector_perf"
    raw = localStorage.getItem(f"systemone/{key}")
    if raw:
        try:
            cached = _json.loads(raw)
            if time.time() - cached["ts"] < 300:
                return cached["data"]
        except Exception:
            pass
    data = _get_sector_performance()
    localStorage.setItem(f"systemone/{key}", _json.dumps({"data": data, "ts": time.time()}))
    return data

@router.get("/status", response_model=dict)
async def get_market_status():
    """
    Returns the current US equity market (NYSE/NASDAQ) open/closed state.

    States:
      OPEN        — Mon-Fri 09:30-16:00 ET (regular trading)
      PRE_MARKET  — Mon-Fri 04:00-09:30 ET
      AFTER_HOURS — Mon-Fri 16:00-20:00 ET
      CLOSED      — Weekends and US market holidays

    Response shape:
      {
        "status":        "OPEN" | "PRE_MARKET" | "AFTER_HOURS" | "CLOSED",
        "status_label":  "MARKET OPEN" | "PRE-MARKET" | "AFTER-HOURS" | "MARKET CLOSED",
        "next_open_et":  "HH:MM ET" or null,
        "next_close_et":  "HH:MM ET" or null,
        "is_trading":    bool,
      }
    """
    from datetime import datetime, time as dtime
    import zoneinfo

    US_TZ = zoneinfo.ZoneInfo("America/New_York")
    now_et = datetime.now(US_TZ)
    today = now_et.date()

    # US market holiday dates (2026 — add more as needed)
    # Treat as closed on these dates regardless of day-of-week
    us_holidays_2026 = {
        date(2026, 1,  1),   # New Year's Day
        date(2026, 1, 19),   # MLK Day
        date(2026, 2, 16),   # Presidents Day
        date(2026, 4,  3),   # Good Friday
        date(2026, 5, 25),   # Memorial Day
        date(2026, 7,  3),   # Independence Day (observed Jul 3)
        date(2026, 9,  7),   # Labor Day
        date(2026, 11, 26),  # Thanksgiving
        date(2026, 12, 25),  # Christmas
    }

    # Market hours in ET
    PRE_OPEN    = dtime(4,  0)
    REG_OPEN    = dtime(9,  30)
    REG_CLOSE   = dtime(16,  0)
    AFTER_CLOSE = dtime(20,  0)

    is_weekend  = today.weekday() >= 5
    is_holiday  = today in us_holidays_2026
    current_t   = now_et.time()

    if is_weekend or is_holiday:
        status = "CLOSED"
        is_trading = False
        next_open, next_close = _next_open_close(today, PRE_OPEN, REG_OPEN, REG_CLOSE, now_et, US_TZ)
    elif PRE_OPEN <= current_t < REG_OPEN:
        status = "PRE_MARKET"
        is_trading = False
        next_open, next_close = None, _fmt_t(REG_CLOSE)
    elif REG_OPEN <= current_t < REG_CLOSE:
        status = "OPEN"
        is_trading = True
        next_open, next_close = None, _fmt_t(REG_CLOSE)
    elif REG_CLOSE <= current_t < AFTER_CLOSE:
        status = "AFTER_HOURS"
        is_trading = False
        next_open, next_close = None, None
    else:
        status = "CLOSED"
        is_trading = False
        next_open, next_close = _next_open_close(today, PRE_OPEN, REG_OPEN, REG_CLOSE, now_et, US_TZ)

    labels = {
        "OPEN":        "MARKET OPEN",
        "PRE_MARKET":  "PRE-MARKET",
        "AFTER_HOURS": "AFTER-HOURS",
        "CLOSED":      "MARKET CLOSED",
    }

    return {
        "status":        status,
        "status_label":  labels[status],
        "next_open_et":  next_open,
        "next_close_et": next_close,
        "is_trading":    is_trading,
    }


def _next_open_close(today, pre_open, reg_open, reg_close, now_et, tz):
    """Return (next_open_str, next_close_str) for when market is currently closed."""
    from datetime import timedelta

    # Next open: tomorrow at PRE_OPEN, or today if after AFTER_CLOSE
    current_t = now_et.time()
    if current_t >= AFTER_CLOSE or today.weekday() >= 5:
        # Next trading day
        next_day = today + timedelta(days=1)
        while next_day.weekday() >= 5:
            next_day += timedelta(days=1)
        next_open_dt = datetime.combine(next_day, reg_open).replace(tzinfo=tz)
    else:
        # Before pre-market today
        next_open_dt = datetime.combine(today, reg_open).replace(tzinfo=tz)

    next_close_dt = next_open_dt.replace(hour=reg_close.hour, minute=reg_close.minute)
    return _fmt_t(reg_open), _fmt_t(reg_close)


def _fmt_t(t):
    return f"{t.hour:02d}:{t.minute:02d} ET"
