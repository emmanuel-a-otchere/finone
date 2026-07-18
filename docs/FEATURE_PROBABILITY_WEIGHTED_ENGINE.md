# Feature: Probability-Weighted Trading Engine
**Status:** P0+P1+P2+P3 complete
**Feature branch:** `feature/probability-weighted-engine`
**Created:** 2026-05-10

---

## Overview

A parallel analysis layer alongside existing SystemOne signals. Provides a
richer `SignalAnalysis` object that wraps existing layer scores with:
- Configurable lens weights (Technical / Regime / Historical / Event)
- Certainty Dial: weighted composite with signal-conflict penalty
- Horizon certainty caps (immediate ≤ 60%, near-term ≤ 80%, far-term ≤ 70%)
- Monte Carlo confidence intervals on price projections
- Suggested entry/exit zones derived from ATR-based levels

Does NOT replace existing signal generation. Traders use both: signals for
quick scanning, probability analysis for deep-dive on high-conviction setups.

---

## Architecture

```
SignalAnalysis (new)
├── certainty_dial: CertaintyDial
│   ├── raw_score: float
│   ├── adjusted_score: float  (raw_score with conflict penalty, capped at horizon max)
│   ├── dispersion: float     (max - min lens score)
│   ├── bottleneck: str       (weakest lens name)
│   └── confidence_interval: Tuple[float, float]  (p10, p90)
│
├── lens_scores: Dict[str, LensScore]
│   ├── technical: LensScore  (weight: 30%) — ADX, EMA alignment, RSI, MACD, volume
│   ├── historical: LensScore (weight: 20%) — setup win rate by type (future)
│   ├── regime: LensScore     (weight: 25%) — ADX regime, volatility, trend strength
│   └── event: LensScore      (weight: 25%) — earnings/FOMC/geo risk (future)
│
├── horizons: Dict[str, HorizonForecast]
│   ├── immediate: HorizonForecast  (max_certainty: 60%)
│   ├── near_term: HorizonForecast (max_certainty: 80%)
│   └── far_term: HorizonForecast  (max_certainty: 70%)
│
└── suggested_plan: SuggestedPlan
    ├── direction: str
    ├── entry_zones: List[PriceZone]
    ├── stop_loss: PriceLevel
    ├── targets: List[PriceLevel]
    ├── position_size_pct: float
    └── invalidation: str
```

---

## P0: Certainty Dial + Config (Current Phase)

### What to Build

1. **CertaintyDial class** — `app/services/certainty_dial.py`
   - Accepts existing 6 layer scores (trend, momentum, mtf, institutional, sentiment, intermarket)
   - Maps to 4 lens categories (technical, regime, historical=0, event=0 for now)
   - Configurable weights via YAML
   - Conflict penalty: if dispersion > 40 → raw_score × 0.85
   - Horizon certainty caps applied post-weighting

2. **SignalAnalysis model** — new Pydantic model in `app/services/signal_analysis.py`
   - Wraps existing signal data + certainty_dial + horizon forecasts + suggested_plan
   - Returns enriched object via new `/analyze/{signal_id}` endpoint

3. **Strategy Config YAML** — `config/strategy_config.yaml`
   ```yaml
   weights:
     technical: 0.30
     regime: 0.25
     historical: 0.20
     event: 0.25

   horizon_caps:
     immediate: 60
     near_term: 80
     far_term: 70

   risk_limits:
     max_position_pct: 5.0
     kelly_fraction: 0.25

   conflict_penalty:
     threshold_dispersion: 40
     penalty_multiplier: 0.85
   ```

4. **Config loader** — hot-reloadable via `config/loader.py`
   - Uses PyYAML
   - Exposes `get_strategy_config()` singleton
   - `reload_on_change()` watcher for dev mode

5. **API endpoint** — `GET /api/analysis/{signal_id}`
   - Returns full `SignalAnalysis` object
   - Uses existing signal as base; computes certainty_dial from its layer_scores
   - Computes horizon forecasts using existing Monte Carlo projection

6. **Frontend panel** — new `AnalysisPanel.tsx` component
   - Opens alongside existing signal card modal
   - Shows certainty dial (gauge/arc), lens breakdown bars, horizon cards
   - "Run Analysis" button on each signal card

### Lens Score Mapping (P0)

| SystemOne Layer | Lens Category | P0 Weight |
|---|---|---|
| trend_structure | technical | combined |
| momentum_convergence | technical | combined |
| institutional_flow | regime | combined |
| sentiment_alignment | regime | combined |
| multi_timeframe | regime | combined |
| intermarket_filter | regime | combined |

For P0: `historical=50` (neutral), `event=50` (no data yet).

---

## P1: Strategy Config + Historical Lens (Future)

- Hot-reloadable YAML with live weight experimentation
- Setup classification: breakout / pullback / mean-reversion tagging
- `HistoricalLens` — queries DB for win rate by setup type

## P2: Event Lens + Recalibrator (Complete)

**Implemented components:**
- `EventLens` — earnings risk (yfinance), FOMC risk (hardcoded 2026 calendar), macro risk (sector sensitivity)
- `Recalibrator` — adjusts active signals within 7 days of earnings or 5 days of FOMC; recommends HOLD/REDUCE_SIZE/CLOSE_POSITION
- CertaintyDial accepts optional `event_risk_score` parameter (0-100)
- SignalAnalysis accepts `include_events=True` to embed full EventRiskScore
- New endpoints: `GET /api/analysis/events/{symbol}` and `POST /api/analysis/recalibrate`
- FOMC calendar: 8 meetings per year (Jan/Mar/May/Jun/Jul/Sep/Nov/Dec 2026)

**Risk scoring formula:**
- earnings_risk: 100 on day 0, 95 on day -1, 80 on days -2 to -3, 60 on days -4 to -7, 40 on days -8 to -14, 20 beyond
- fomc_risk: 90 on day 0, 85 on day -1, 70 on days -2 to -3, 50 on days -4 to -7, 30 on days -8 to -14, 15 beyond
- combined = earnings×0.50 + fomc×0.35 + macro×0.15
- event lens score = 100 - combined_risk (high risk → low score)

- Earnings calendar via yfinance or free calendar API
- FOMC date feed (public calendar)
- Geo risk: news sentiment scoring (free tier)
- `RecalibrationEngine` — adjusts active plans on events

## P3: XGBoost Multi-Horizon (Future)

- Separate models per horizon
- Certainty caps enforced at model output layer

- Separate models per horizon
- Certainty caps enforced at model output layer

---

## Database Changes

None required for P0. Historical and event lenses will add new tables in later phases.

---

## API Changes

### New Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/analysis/{signal_id}` | Full SignalAnalysis with certainty dial + horizons |
| GET | `/api/config/strategy` | Current strategy config |
| PUT | `/api/config/strategy` | Update strategy config (hot-reload) |

### No Breaking Changes

Existing `/api/signals` and signal generation remain unchanged.
