"""
QA seed data — deterministic test dataset for functional validation (issue #16).

Loads a known dataset so every screen can be exercised in populated, empty,
and edge-case states — reproducibly, without depending on live market data.

Usage (inside Docker):
    docker compose exec core-engine python -m app.scripts.seed_test_data
    docker compose exec core-engine python -m app.scripts.seed_test_data --dry-run
or via the Makefile:
    make seed

Idempotent: every row is either keyed by a deterministic uuid5 or tagged
"[qa-seed]" in notes; the previous seed copy is deleted before re-inserting.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import bindparam, delete, text

from app.config import get_settings
from app.models.database import AsyncSessionLocal, Base, engine
from app.models.signal import ProtocolType, Signal, SignalStatus
from app.models.portfolio import Portfolio
from app.models.watchlist_item import WatchlistItem
from app.models.alert import AlertDelivery
from app.models.market_snapshot import FearGreedSnapshot, MarketSentimentSnapshot

settings = get_settings()

# Deterministic ID namespace — re-running the seed replaces the same rows.
SEED_NS = uuid.UUID("7a1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b")
def qid(name: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NS, name)

NOW = datetime.now(timezone.utc).replace(microsecond=0)
USER = getattr(settings, "single_user_name", "owner") or "owner"
TAG = "[qa-seed]"

SEED_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMD", "JPM", "XOM", "PLTR", "GME", "EDGE"]
LAYER_NAMES = [
    "trend_structure", "momentum_convergence", "multi_timeframe",
    "institutional_flow", "sentiment_alignment", "intermarket_filter",
]


def _layers(t, m, mtf, i, s, x):
    return {
        "trend_structure": t, "momentum_convergence": m, "multi_timeframe": mtf,
        "institutional_flow": i, "sentiment_alignment": s, "intermarket_filter": x,
    }


def _projections(entry: float | None, protocol: ProtocolType, created: datetime):
    """10-day p10/p50/p90 fan drifting toward the trade direction."""
    if entry is None:
        return [], [], [], []
    long_side = protocol in (ProtocolType.LONG_BUY, ProtocolType.SHORT_BUY)
    drift = 0.006 if long_side else -0.006   # ~6% over the window
    dates, p10, p50, p90 = [], [], [], []
    for i in range(1, 11):
        d = created + timedelta(days=i)
        mid = entry * (1 + drift * i)
        spread = entry * 0.004 * i
        dates.append(d.date().isoformat())
        p50.append(round(mid, 2))
        p10.append(round(mid - spread, 2))
        p90.append(round(mid + spread, 2))
    return dates, p10, p50, p90


def _sig(name, symbol, protocol, conf, entry, stop, target, status,
         age_days, ttl_days, timeframe, regime, atr, rr, eta, layer_scores):
    created = NOW - timedelta(days=age_days)
    dates, p10, p50, p90 = _projections(entry, protocol, created)
    return Signal(
        id=qid(f"signal-{name}"),
        symbol=symbol,
        protocol_type=protocol,
        status=status,
        timeframe=timeframe,
        entry_price=entry,
        stop_loss=stop,
        take_profit=target,
        confidence_score=conf,
        layer_scores=layer_scores,
        signal_metadata={
            "regime": regime, "atr": atr, "risk_reward": rr, "eta_hours": eta,
            "momentum_delta": 1.8, "volume_surge": 1.35, "seed": "qa",
        },
        projection_dates=dates, projection_p10=p10, projection_p50=p50, projection_p90=p90,
        created_at=created,
        expires_at=created + timedelta(days=ttl_days),
    )


def build_signals() -> list[Signal]:
    """Full protocol matrix x confidence spread x ACTIVE/EXPIRED, plus a null-field
    edge case for `--`/`--` formatting QA."""
    return [
        _sig("aapl-active", "AAPL", ProtocolType.LONG_BUY, 92, 232.50, 225.00, 245.00,
             SignalStatus.ACTIVE, 2, 9, "swing", "TRENDING_BULLISH", 4.21, 1.67, 72,
             _layers(88, 84, 90, 76, 71, 82)),
        _sig("nvda-active", "NVDA", ProtocolType.LONG_BUY, 88, 178.20, 169.00, 196.00,
             SignalStatus.ACTIVE, 3, 7, "swing", "TRENDING_BULLISH", 6.85, 1.93, 96,
             _layers(85, 79, 88, 82, 68, 74)),
        _sig("msft-active", "MSFT", ProtocolType.LONG_BUY, 76, 505.00, 492.00, 525.00,
             SignalStatus.ACTIVE, 1, 6, "swing", "RANGE_BOUND", 7.10, 1.54, 120,
             _layers(72, 66, 78, 70, 74, 69)),
        _sig("tsla-short", "TSLA", ProtocolType.SHORT_SELL, 81, 248.00, 262.00, 220.00,
             SignalStatus.ACTIVE, 4, 8, "swing", "TRENDING_BEARISH", 9.30, 2.00, 72,
             _layers(80, 77, 84, 65, 58, 71)),
        _sig("amd-cover", "AMD", ProtocolType.SHORT_BUY, 74, 118.50, 112.00, 131.00,
             SignalStatus.ACTIVE, 5, 6, "swing", "TRENDING_BULLISH", 3.90, 1.92, 48,
             _layers(70, 73, 68, 61, 66, 72)),
        _sig("jpm-exit", "JPM", ProtocolType.LONG_SELL, 68, 244.00, 232.00, 235.00,
             SignalStatus.ACTIVE, 6, 5, "position", "RANGE_BOUND", 3.40, 1.25, 168,
             _layers(62, 58, 66, 71, 69, 64)),
        _sig("xom-exit", "XOM", ProtocolType.SHORT_BUY, 71, 109.50, 116.00, 104.00,
             SignalStatus.ACTIVE, 2, 4, "position", "TRENDING_BULLISH", 2.10, 1.38, 144,
             _layers(66, 70, 72, 59, 63, 67)),
        _sig("pltr-lowconf", "PLTR", ProtocolType.LONG_BUY, 47, 31.20, 28.90, 36.00,
             SignalStatus.ACTIVE, 1, 5, "swing", "VOLATILE", 1.45, 2.09, 96,
             _layers(48, 52, 45, 40, 55, 49)),
        _sig("gme-lowconf", "GME", ProtocolType.LONG_BUY, 55, 22.80, 20.10, 27.50,
             SignalStatus.ACTIVE, 3, 6, "day_trade", "VOLATILE", 1.60, 1.74, 24,
             _layers(55, 61, 50, 44, 62, 52)),
        _sig("nvda-aged", "NVDA", ProtocolType.LONG_BUY, 85, 165.00, 158.00, 182.00,
             SignalStatus.ACTIVE, 8, 12, "swing", "TRENDING_BULLISH", 5.95, 2.43, 96,
             _layers(82, 78, 86, 74, 70, 76)),
        _sig("aapl-expired", "AAPL", ProtocolType.LONG_BUY, 83, 218.00, 210.00, 234.00,
             SignalStatus.EXPIRED, 20, 7, "swing", "TRENDING_BULLISH", 3.80, 2.00, 96,
             _layers(80, 76, 84, 72, 68, 78)),
        _sig("tsla-expired", "TSLA", ProtocolType.SHORT_SELL, 79, 265.00, 278.00, 238.00,
             SignalStatus.EXPIRED, 35, 7, "swing", "TRENDING_BEARISH", 8.90, 2.08, 120,
             _layers(76, 72, 80, 62, 55, 68)),
        _sig("msft-expired", "MSFT", ProtocolType.LONG_BUY, 90, 470.00, 458.00, 495.00,
             SignalStatus.EXPIRED, 45, 10, "position", "TRENDING_BULLISH", 6.20, 2.08, 240,
             _layers(86, 82, 89, 79, 75, 83)),
        # Edge case: null prices / empty layers -> every "--" fallback must render.
        _sig("edge-nulls", "EDGE", ProtocolType.LONG_BUY, 15, None, None, None,
             SignalStatus.ACTIVE, 1, 3, "swing", "UNKNOWN", None, None, None, {}),
    ]


def build_portfolios() -> list[Portfolio]:
    holdings = [
        {"symbol": "AAPL", "qty": 50,  "avg_cost": 210.00, "strategy": "core",        "entry_date": (NOW - timedelta(days=90)).date().isoformat()},
        {"symbol": "MSFT", "qty": 20,  "avg_cost": 480.00, "strategy": "core",        "entry_date": (NOW - timedelta(days=75)).date().isoformat()},
        {"symbol": "NVDA", "qty": 30,  "avg_cost": 150.00, "strategy": "swing",       "entry_date": (NOW - timedelta(days=40)).date().isoformat()},
        {"symbol": "JPM",  "qty": 25,  "avg_cost": 235.00, "strategy": "swing",       "entry_date": (NOW - timedelta(days=25)).date().isoformat()},
        {"symbol": "XOM",  "qty": 40,  "avg_cost": 112.00, "strategy": "speculative", "entry_date": (NOW - timedelta(days=15)).date().isoformat()},
    ]
    return [
        Portfolio(
            id=qid("portfolio-core"), user_id=USER,
            name="QA Core Portfolio", description="Seeded multi-sector swing portfolio",
            format_version="2.0", holdings=holdings,
            watchlist=[{"symbol": "TSLA"}, {"symbol": "AMD"}],
            settings={"base_currency": "USD"},
            last_uploaded=NOW - timedelta(days=2), monitoring_active=True,
        ),
        Portfolio(
            id=qid("portfolio-empty"), user_id=USER,
            name="QA Empty Portfolio", description="Seeded empty portfolio for empty-state QA",
            format_version="2.0", holdings=[], watchlist=[], settings={},
            last_uploaded=NOW - timedelta(days=1), monitoring_active=True,
        ),
    ]


def build_watchlist() -> list[WatchlistItem]:
    rows = [
        ("AAPL", "swing",     60, True),
        ("TSLA", "day_trade", 70, True),
        ("NVDA", "swing",     50, True),
        ("AMD",  "position",  65, False),   # disabled — QA of the enable toggle
        ("XOM",  "swing",     55, True),
    ]
    return [
        WatchlistItem(
            id=qid(f"watch-{sym}"), user_id=USER, symbol=sym, timeframe=tf,
            min_confidence=mc, enabled=enabled,
            created_at=NOW - timedelta(days=10), updated_at=NOW - timedelta(days=1),
        )
        for sym, tf, mc, enabled in rows
    ]


def build_alerts() -> list[AlertDelivery]:
    return [
        AlertDelivery(id=qid("alert-1"), symbol="AAPL", signal_id=qid("signal-aapl-active"),
                      alert_type="SIGNAL_GENERATED", priority="urgent",
                      title="New LONG_BUY signal: AAPL @ 92% confidence",
                      message="Entry $232.50 · stop $225.00 · target $245.00",
                      ntfy_topic="systemone-qa", ntfy_tags=["chart_with_upwards_trend"],
                      delivered=True, created_at=NOW - timedelta(days=2)),
        AlertDelivery(id=qid("alert-2"), symbol="NVDA", signal_id=qid("signal-nvda-active"),
                      alert_type="SIGNAL_GENERATED", priority="default",
                      title="New LONG_BUY signal: NVDA @ 88% confidence",
                      message="Entry $178.20 · stop $169.00 · target $196.00",
                      ntfy_topic="systemone-qa", ntfy_tags=["chart_with_upwards_trend"],
                      delivered=True, created_at=NOW - timedelta(days=3)),
        AlertDelivery(id=qid("alert-3"), symbol="TSLA", signal_id=None,
                      alert_type="PRICE_TARGET", priority="default",
                      title="TSLA approaching target zone",
                      message="TSLA within 5% of seeded short target $220.00",
                      ntfy_topic="systemone-qa", ntfy_tags=["dart"],
                      delivered=True, created_at=NOW - timedelta(days=1)),
        AlertDelivery(id=qid("alert-4"), symbol="GME", signal_id=None,
                      alert_type="VOLUME_SURGE", priority="low",
                      title="Unusual volume: GME",
                      message="Volume 3.1x 20-day average in seeded session",
                      ntfy_topic="systemone-qa", ntfy_tags=["fire"],
                      delivered=True, created_at=NOW - timedelta(hours=6)),
        AlertDelivery(id=qid("alert-5"), symbol="PLTR", signal_id=None,
                      alert_type="STOP_LOSS", priority="urgent",
                      title="Stop triggered: PLTR",
                      message="Seeded stop-loss event for triggered-state QA",
                      ntfy_topic="systemone-qa", ntfy_tags=["warning"],
                      delivered=True, created_at=NOW - timedelta(hours=2)),
        AlertDelivery(id=qid("alert-6"), symbol="MSFT", signal_id=None,
                      alert_type="EARNINGS", priority="default",
                      title="Upcoming earnings: MSFT",
                      message="Seeded pending alert (delivered=false) for state QA",
                      ntfy_topic="systemone-qa", ntfy_tags=["calendar"],
                      delivered=False, delivery_error="pending delivery",
                      created_at=NOW - timedelta(minutes=30)),
    ]


# ── Dashboard snapshot history (45 days, deterministic walk) ────────────────
def build_snapshots() -> tuple[list[FearGreedSnapshot], list[MarketSentimentSnapshot]]:
    rng = random.Random(42)
    fg, sent = [], []
    fg_val, sent_val = 52.0, 48.0
    spy = 590.0
    for i in range(45, 0, -1):
        day = NOW - timedelta(days=i)
        fg_val = min(95, max(5, fg_val + rng.uniform(-6, 6)))
        sent_val = min(95, max(5, sent_val + rng.uniform(-5, 5)))
        spy *= 1 + rng.uniform(-0.012, 0.012)
        fg.append(FearGreedSnapshot(
            date=day, value=int(round(fg_val)),
            label=("Greed" if fg_val >= 55 else "Fear" if fg_val <= 45 else "Neutral"),
            vix=round(rng.uniform(13, 28), 2),
            spy_close=round(spy, 2), qqq_close=round(spy * 0.86, 2), spy_ma20=round(spy * 0.99, 2),
            momentum_score=round(min(100, max(0, fg_val + rng.uniform(-8, 8))), 2),
            breadth_score=round(min(100, max(0, fg_val + rng.uniform(-10, 10))), 2),
            vol_score=round(rng.uniform(20, 80), 2),
        ))
        sent.append(MarketSentimentSnapshot(
            date=day, value=int(round(sent_val)),
            label=("Bullish" if sent_val >= 55 else "Bearish" if sent_val <= 45 else "Neutral"),
            trend_score=int(round(min(100, max(0, sent_val + rng.uniform(-6, 6))))),
            momentum_score=int(round(min(100, max(0, sent_val + rng.uniform(-6, 6))))),
            breadth_score=int(round(min(100, max(0, sent_val + rng.uniform(-8, 8))))),
            volatility_score=int(round(rng.uniform(20, 80))),
            spy_close=round(spy, 2), spy_ma20=round(spy * 0.99, 2), spy_ma50=round(spy * 0.97, 2),
            advancers=rng.randint(180, 420), decliners=rng.randint(120, 380), unchanged=rng.randint(5, 40),
        ))
    return fg, sent


# ── 90 days of synthetic OHLCV per seed symbol (Timescale market_data) ──────
def build_ohlcv() -> list[dict]:
    rng = random.Random(7)
    base = {"AAPL": 225, "MSFT": 500, "NVDA": 170, "TSLA": 250, "AMD": 115,
            "JPM": 240, "XOM": 110, "PLTR": 30, "GME": 22, "EDGE": 5}
    rows = []
    for sym, start in base.items():
        price = start
        for i in range(90, 0, -1):
            day = (NOW - timedelta(days=i)).replace(hour=0, minute=0, second=0)
            if day.weekday() >= 5:      # skip weekends
                continue
            o = price
            c = price * (1 + rng.uniform(-0.025, 0.028))
            h = max(o, c) * (1 + rng.uniform(0, 0.012))
            l = min(o, c) * (1 - rng.uniform(0, 0.012))
            v = rng.randint(8_000_000, 90_000_000)
            rows.append({"t": day, "s": sym, "o": round(o, 2), "h": round(h, 2),
                         "l": round(l, 2), "c": round(c, 2), "v": v})
            price = c
    return rows


def build_layer_cache() -> list[dict]:
    rng = random.Random(11)
    rows = []
    for sym in ("AAPL", "NVDA", "TSLA"):
        for layer in LAYER_NAMES:
            rows.append({
                "id": qid(f"layer-{sym}-{layer}"),
                "symbol": sym, "layer_name": layer,
                "analysis_data": {
                    "score": rng.randint(40, 92),
                    "summary": f"Seeded {layer} analysis for {sym}",
                    "components": [{"name": "seed_component", "value": round(rng.uniform(0, 1), 3)}],
                },
                "correlation_matrix": None,
                "calculated_at": NOW - timedelta(hours=2),
                "valid_until": NOW + timedelta(hours=22),
            })
    return rows


# ── Positions + outcomes (performance_tracker / historical_lens tables) ──────
POSITIONS_OPEN = [
    # symbol, direction, qty, entry, strategy, age_days, signal link name (or None)
    ("AAPL", "LONG",  50, 210.50, "swing", 20, "aapl-active"),
    ("NVDA", "LONG",  30, 148.20, "swing", 15, "nvda-active"),
    ("TSLA", "SHORT", 20, 255.00, "swing", 9,  "tsla-short"),
    ("MSFT", "LONG",  20, 505.00, "core",  6,  None),
    ("XOM",  "LONG",  40, 110.00, "speculative", 4, None),
]
POSITIONS_CLOSED = [
    # symbol, direction, qty, entry, exit, age_days, held_days
    ("AMD",  "LONG", 100,  95.00, 112.50, 60, 21),
    ("JPM",  "LONG",  25, 220.00, 242.00, 50, 18),
    ("PLTR", "LONG",  40,  28.50,  24.00, 45, 12),   # loser
    ("NVDA", "LONG",  15, 132.00, 168.00, 38, 25),
    ("GME",  "LONG",  50,  24.00,  19.50, 30, 9),    # loser
]

SIGNAL_OUTCOMES = [
    # setup_type, direction, entry, exit, pnl_pct, outcome, age_days
    ("PULLBACK_CONTINUATION", "LONG", 210.00, 228.00,  8.57, "win",  40),
    ("PULLBACK_CONTINUATION", "LONG", 150.00, 165.00, 10.00, "win",  33),
    ("BREAKOUT",              "LONG",  95.00, 112.50, 18.42, "win",  28),
    ("BREAKOUT",              "LONG",  28.50,  24.00, -15.79, "loss", 24),
    ("MEAN_REVERSION",        "SHORT", 265.00, 248.00,  6.42, "win",  19),
    ("MEAN_REVERSION",        "SHORT", 118.00, 124.00, -5.08, "loss", 15),
    ("MOMENTUM_SURGE",        "LONG", 132.00, 168.00, 27.27, "win",  12),
    ("MOMENTUM_SURGE",        "LONG",  24.00,  19.50, -18.75, "loss", 8),
    ("BREAKOUT",              "LONG", 470.00, 495.00,  5.32, "win",  5),
]


# ── Schema guards: ORM-only columns/tables drifted from 001_initial_schema.sql ──
SCHEMA_GUARDS = [
    "ALTER TABLE signals ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20) DEFAULT 'swing'",
    "ALTER TABLE signals ADD COLUMN IF NOT EXISTS projection_dates JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE signals ADD COLUMN IF NOT EXISTS projection_p10 JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE signals ADD COLUMN IF NOT EXISTS projection_p50 JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE signals ADD COLUMN IF NOT EXISTS projection_p90 JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS name VARCHAR(200) DEFAULT ''",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS description VARCHAR(500) DEFAULT ''",
    """CREATE TABLE IF NOT EXISTS signal_outcomes (
         id SERIAL PRIMARY KEY,
         signal_id UUID, setup_type VARCHAR(100) NOT NULL, direction VARCHAR(10) NOT NULL,
         entry_price DECIMAL(12,4) NOT NULL, exit_price DECIMAL(12,4),
         pnl_pct DECIMAL(10,4), outcome VARCHAR(20),
         closed_at TIMESTAMPTZ, notes TEXT DEFAULT '',
         recorded_at TIMESTAMPTZ DEFAULT NOW()
       )""",
]


def build_dataset() -> dict:
    fg, sent = build_snapshots()
    return {
        "signals": build_signals(),
        "portfolios": build_portfolios(),
        "watchlist": build_watchlist(),
        "alerts": build_alerts(),
        "fear_greed_snapshots": fg,
        "market_sentiment_snapshots": sent,
        "market_data_rows": build_ohlcv(),
        "layer_cache_rows": build_layer_cache(),
        "positions_open": POSITIONS_OPEN,
        "positions_closed": POSITIONS_CLOSED,
        "signal_outcomes": SIGNAL_OUTCOMES,
    }


def print_summary(data: dict, header: str) -> None:
    print(header)
    print(f"  user scope              : {USER}")
    print(f"  signals                 : {len(data['signals'])}  (ACTIVE {sum(1 for s in data['signals'] if s.status == SignalStatus.ACTIVE)}, "
          f"EXPIRED {sum(1 for s in data['signals'] if s.status == SignalStatus.EXPIRED)}, incl. 1 null-field edge case)")
    print(f"  portfolios              : {len(data['portfolios'])}  ({len(data['portfolios'][0].holdings)} holdings + 1 empty)")
    print(f"  watchlist items         : {len(data['watchlist'])}  (1 disabled)")
    print(f"  alert deliveries        : {len(data['alerts'])}  (5 delivered, 1 pending)")
    print(f"  fear/greed snapshots    : {len(data['fear_greed_snapshots'])}")
    print(f"  sentiment snapshots     : {len(data['market_sentiment_snapshots'])}")
    print(f"  market_data OHLCV rows  : {len(data['market_data_rows'])}")
    print(f"  layer cache rows        : {len(data['layer_cache_rows'])}")
    print(f"  positions               : {len(data['positions_open'])} open / {len(data['positions_closed'])} closed")
    print(f"  signal outcomes         : {len(data['signal_outcomes'])}  (across {len({o[0] for o in data['signal_outcomes']})} setup types)")


async def seed_async(data: dict) -> None:
    # Create ORM-only tables (watchlist_items, alert_deliveries) if missing,
    # then apply column-level guards for drift vs 001_initial_schema.sql.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in SCHEMA_GUARDS:
            await conn.execute(text(stmt))

    async with AsyncSessionLocal() as session:
        # Delete previous seed copy (deterministic ids / known keys).
        signal_ids = [s.id for s in data["signals"]]
        await session.execute(delete(Signal).where(Signal.id.in_(signal_ids)))
        await session.execute(delete(Portfolio).where(Portfolio.id.in_([p.id for p in data["portfolios"]])))
        await session.execute(delete(WatchlistItem).where(WatchlistItem.id.in_([w.id for w in data["watchlist"]])))
        await session.execute(delete(AlertDelivery).where(AlertDelivery.id.in_([a.id for a in data["alerts"]])))
        await session.execute(delete(FearGreedSnapshot).where(
            FearGreedSnapshot.date.in_([s.date for s in data["fear_greed_snapshots"]])))
        await session.execute(delete(MarketSentimentSnapshot).where(
            MarketSentimentSnapshot.date.in_([s.date for s in data["market_sentiment_snapshots"]])))
        await session.execute(
            text("DELETE FROM market_data WHERE symbol IN :syms AND time >= :start")
            .bindparams(bindparam("syms", expanding=True)),
            {"syms": SEED_SYMBOLS, "start": NOW - timedelta(days=95)})
        await session.execute(
            text("DELETE FROM layer_analysis_cache WHERE symbol IN :syms AND layer_name IN :layers")
            .bindparams(bindparam("syms", expanding=True), bindparam("layers", expanding=True)),
            {"syms": SEED_SYMBOLS, "layers": LAYER_NAMES})
        await session.execute(
            text("DELETE FROM signal_outcomes WHERE notes LIKE :tag"), {"tag": f"%{TAG}%"})

        # Insert fresh copy.
        session.add_all(data["signals"])
        session.add_all(data["portfolios"])
        session.add_all(data["watchlist"])
        session.add_all(data["alerts"])
        session.add_all(data["fear_greed_snapshots"])
        session.add_all(data["market_sentiment_snapshots"])
        for r in data["market_data_rows"]:
            await session.execute(
                text("INSERT INTO market_data (time, symbol, open, high, low, close, volume) "
                     "VALUES (:t, :s, :o, :h, :l, :c, :v) ON CONFLICT DO NOTHING"), r)
        for r in data["layer_cache_rows"]:
            await session.execute(
                text("INSERT INTO layer_analysis_cache "
                     "(id, symbol, layer_name, analysis_data, correlation_matrix, calculated_at, valid_until) "
                     "VALUES (:id, :symbol, :layer_name, :analysis_data, :correlation_matrix, :calculated_at, :valid_until)"),
                {**r, "analysis_data": json.dumps(r["analysis_data"]),
                      "correlation_matrix": None})
        for setup, direction, entry, exit_, pnl, outcome, age in data["signal_outcomes"]:
            await session.execute(
                text("INSERT INTO signal_outcomes "
                     "(signal_id, setup_type, direction, entry_price, exit_price, pnl_pct, outcome, closed_at, notes) "
                     "VALUES (:sid, :setup, :dir, :entry, :exit, :pnl, :outcome, :closed, :notes)"),
                {"sid": qid(f"outcome-{setup}-{age}"), "setup": setup, "dir": direction,
                 "entry": entry, "exit": exit_, "pnl": pnl, "outcome": outcome,
                 "closed": NOW - timedelta(days=age), "notes": f"{TAG} seeded outcome"})

        await session.commit()
    print("core tables seeded")


def seed_positions(data: dict) -> None:
    """positions / position_pnl live outside SQLAlchemy (performance_tracker uses psycopg2)."""
    import os
    import psycopg2
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"), port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "systemone"),
        user=os.getenv("DB_USER", "sysops"), password=os.getenv("DB_PASSWORD", "sysone123"))
    cur = conn.cursor()
    cur.execute("DELETE FROM position_pnl WHERE position_id IN (SELECT id FROM positions WHERE notes LIKE %s)", (f"%{TAG}%",))
    cur.execute("DELETE FROM positions WHERE notes LIKE %s", (f"%{TAG}%",))
    for sym, direction, qty, entry, strategy, age, sig in data["positions_open"]:
        cur.execute(
            "INSERT INTO positions (signal_id, symbol, direction, status, qty, entry_price, avg_cost, strategy, entry_date, notes) "
            "VALUES (%s, %s, %s, 'OPEN', %s, %s, %s, %s, %s, %s)",
            (str(qid(f"signal-{sig}")) if sig else None, sym, direction, qty, entry, entry,
             strategy, NOW - timedelta(days=age), f"{TAG} open position"))
    for sym, direction, qty, entry, exit_, age, held in data["positions_closed"]:
        pnl = (exit_ - entry) * qty if direction == "LONG" else (entry - exit_) * qty
        pnl_pct = round((exit_ - entry) / entry * 100 * (1 if direction == "LONG" else -1), 4)
        outcome = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BREAKEVEN"
        cur.execute(
            "INSERT INTO positions (symbol, direction, status, qty, entry_price, exit_price, avg_cost, strategy, entry_date, closed_at, notes) "
            "VALUES (%s, %s, 'CLOSED', %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (sym, direction, qty, entry, exit_, entry, "swing",
             NOW - timedelta(days=age), NOW - timedelta(days=age - held), f"{TAG} closed position"))
        pos_id = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO position_pnl (position_id, pnl_realized, pnl_pct, outcome, closed_at) VALUES (%s, %s, %s, %s, %s)",
            (pos_id, round(pnl, 2), pnl_pct, outcome, NOW - timedelta(days=age - held)))
    conn.commit()
    cur.close()
    conn.close()
    print("positions seeded")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed deterministic QA test data (issue #16)")
    parser.add_argument("--dry-run", action="store_true", help="print the dataset summary without writing")
    args = parser.parse_args()

    data = build_dataset()
    if args.dry_run:
        print_summary(data, "QA seed dataset (dry run — nothing written)")
        return
    asyncio.run(seed_async(data))
    seed_positions(data)
    print_summary(data, "QA seed dataset written")
    print("\nDone. Re-run any time — the seed is idempotent.")


if __name__ == "__main__":
    main()
