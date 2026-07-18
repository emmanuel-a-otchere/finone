"""Market snapshot service — computes and stores daily Fear & Greed and
Market Sentiment readings.  Designed to be called from a cron job or
startup hook once per trading day.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import yfinance as yf
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FearGreedSnapshot, MarketSentimentSnapshot


# ── Fear & Greed computation ─────────────────────────────────────────

def _compute_fear_greed_live() -> dict:
    """Compute today's Fear & Greed score from live market data.
    Returns a dict with all component values for storage.
    """
    try:
        vix = yf.Ticker("^VIX").history(period="5d", auto_adjust=True)
        spy = yf.Ticker("SPY").history(period="30d", auto_adjust=True)
        qqq = yf.Ticker("QQQ").history(period="30d", auto_adjust=True)

        if vix.empty or spy.empty or qqq.empty:
            return _default_fear_greed()

        vix_current = float(vix["Close"].iloc[-1])
        vix_norm = min(100, max(0, 100 - (vix_current / 40) * 100))

        spy_ma20 = float(spy["Close"].tail(20).mean())
        spy_current = float(spy["Close"].iloc[-1])
        spy_momentum = (spy_current / spy_ma20 - 1) * 100
        momentum_score = min(100, max(0, 50 + spy_momentum * 5))

        qqq_current = float(qqq["Close"].iloc[-1])
        qqq_ma20 = float(qqq["Close"].tail(20).mean())
        breadth = (qqq_current / qqq_ma20) / (spy_current / spy_ma20) - 1
        breadth_score = min(100, max(0, 50 + breadth * 200))

        spy_returns = spy["Close"].pct_change().dropna()
        volatility = float(spy_returns.tail(20).std() * (252 ** 0.5) * 100) if len(spy_returns) >= 20 else 15
        vol_score = min(100, max(0, 100 - (volatility / 30) * 100))

        score = int(vix_norm * 0.30 + momentum_score * 0.30 + breadth_score * 0.20 + vol_score * 0.20)
        score = min(100, max(0, score))

        label = (
            "Extreme Fear" if score < 25 else
            "Fear" if score < 45 else
            "Neutral" if score < 55 else
            "Greed" if score < 75 else
            "Extreme Greed"
        )

        return {
            "value": score,
            "label": label,
            "vix": round(vix_current, 2),
            "spy_close": round(spy_current, 4),
            "qqq_close": round(qqq_current, 4),
            "spy_ma20": round(spy_ma20, 4),
            "momentum_score": round(momentum_score, 2),
            "breadth_score": round(breadth_score, 2),
            "vol_score": round(vol_score, 2),
        }
    except Exception as e:
        print(f"[FearGreed] Computation failed: {e}")
        return _default_fear_greed()


def _default_fear_greed() -> dict:
    return {
        "value": 50,
        "label": "Neutral",
        "vix": None,
        "spy_close": None,
        "qqq_close": None,
        "spy_ma20": None,
        "momentum_score": None,
        "breadth_score": None,
        "vol_score": None,
    }


# ── Market Sentiment computation ────────────────────────────────────

def _compute_market_sentiment_live() -> dict:
    """Compute today's Market Sentiment from live data.
    Returns component scores for storage.
    """
    try:
        spy = yf.Ticker("SPY").history(period="60d", auto_adjust=True)
        if spy.empty or len(spy) < 50:
            return _default_sentiment()

        spy_current = float(spy["Close"].iloc[-1])
        spy_ma20 = float(spy["Close"].tail(20).mean())
        spy_ma50 = float(spy["Close"].tail(50).mean())

        # Trend: price vs MA20/MA50
        trend = 50
        if spy_current > spy_ma20 > spy_ma50:
            trend = 80
        elif spy_current > spy_ma20:
            trend = 65
        elif spy_current < spy_ma20 < spy_ma50:
            trend = 20
        elif spy_current < spy_ma20:
            trend = 35

        # Momentum: 20-day return normalized
        spy_20d = float(spy["Close"].iloc[-20])
        momentum = min(100, max(0, 50 + ((spy_current / spy_20d - 1) * 100) * 3))

        # Breadth: advancers/decliners (simulated via SPY vs equal-weight)
        breadth = 50  # Placeholder — would need NYSE advance/decline data

        # Volatility: inverse of realized vol
        spy_returns = spy["Close"].pct_change().dropna()
        vol = float(spy_returns.tail(20).std() * (252 ** 0.5) * 100) if len(spy_returns) >= 20 else 15
        vol_score = min(100, max(0, 100 - (vol / 30) * 100))

        # Composite
        value = int(trend * 0.30 + momentum * 0.30 + breadth * 0.20 + vol_score * 0.20)
        value = min(100, max(0, value))

        label = (
            "Very Bullish" if value > 70 else
            "Bullish" if value > 55 else
            "Neutral" if value > 45 else
            "Bearish" if value > 30 else
            "Very Bearish"
        )

        return {
            "value": value,
            "label": label,
            "trend_score": int(trend),
            "momentum_score": int(momentum),
            "breadth_score": int(breadth),
            "volatility_score": int(vol_score),
            "spy_close": round(spy_current, 4),
            "spy_ma20": round(spy_ma20, 4),
            "spy_ma50": round(spy_ma50, 4),
            "advancers": None,
            "decliners": None,
            "unchanged": None,
        }
    except Exception as e:
        print(f"[Sentiment] Computation failed: {e}")
        return _default_sentiment()


def _default_sentiment() -> dict:
    return {
        "value": 50,
        "label": "Neutral",
        "trend_score": None,
        "momentum_score": None,
        "breadth_score": None,
        "volatility_score": None,
        "spy_close": None,
        "spy_ma20": None,
        "spy_ma50": None,
        "advancers": None,
        "decliners": None,
        "unchanged": None,
    }


# ── Database operations ─────────────────────────────────────────────

async def store_daily_snapshot(db: AsyncSession) -> dict:
    """Compute and store today's Fear & Greed and Market Sentiment.
    Returns a summary dict.  Idempotent — skips if already stored.
    """
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if already stored
    result = await db.execute(select(FearGreedSnapshot).where(FearGreedSnapshot.date == today))
    if result.scalar_one_or_none():
        return {"status": "skipped", "reason": "already_stored", "date": today.isoformat()}

    # Compute and store Fear & Greed
    fg = _compute_fear_greed_live()
    fg_snap = FearGreedSnapshot(date=today, **fg)
    db.add(fg_snap)

    # Compute and store Market Sentiment
    ms = _compute_market_sentiment_live()
    ms_snap = MarketSentimentSnapshot(date=today, **ms)
    db.add(ms_snap)

    await db.commit()
    return {
        "status": "stored",
        "date": today.isoformat(),
        "fear_greed": fg["value"],
        "sentiment": ms["value"],
    }


async def get_fear_greed_history(db: AsyncSession, days: int = 365) -> list[dict]:
    """Retrieve historical Fear & Greed snapshots for the UI period tabs."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(FearGreedSnapshot)
        .where(FearGreedSnapshot.date >= cutoff)
        .order_by(desc(FearGreedSnapshot.date))
    )
    rows = result.scalars().all()
    return [r.to_dict() for r in rows]


async def get_sentiment_history(db: AsyncSession, days: int = 365) -> list[dict]:
    """Retrieve historical Market Sentiment snapshots."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(MarketSentimentSnapshot)
        .where(MarketSentimentSnapshot.date >= cutoff)
        .order_by(desc(MarketSentimentSnapshot.date))
    )
    rows = result.scalars().all()
    return [r.to_dict() for r in rows]


async def get_fear_greed_for_period(db: AsyncSession, period_label: str) -> Optional[dict]:
    """Get the Fear & Greed snapshot for a specific historical period.
    Maps period labels to actual dates:
      1D  → today
      1W  → 7 days ago
      1M  → 30 days ago
      3M  → 90 days ago
      1Y  → 365 days ago
      ALL → earliest available
    """
    period_days = {"1D": 0, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 365 * 5}
    days_back = period_days.get(period_label, 0)
    target = datetime.now(timezone.utc) - timedelta(days=days_back)
    target = target.replace(hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(FearGreedSnapshot)
        .where(FearGreedSnapshot.date <= target)
        .order_by(desc(FearGreedSnapshot.date))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row.to_dict() if row else None


async def get_sentiment_for_period(db: AsyncSession, period_label: str) -> Optional[dict]:
    """Get Market Sentiment snapshot for a specific historical period."""
    period_days = {"1D": 0, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "ALL": 365 * 5}
    days_back = period_days.get(period_label, 0)
    target = datetime.now(timezone.utc) - timedelta(days=days_back)
    target = target.replace(hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(MarketSentimentSnapshot)
        .where(MarketSentimentSnapshot.date <= target)
        .order_by(desc(MarketSentimentSnapshot.date))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row.to_dict() if row else None
