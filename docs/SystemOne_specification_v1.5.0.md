# SystemOne Trading Intelligence — Specification
**Version 1.5.0** — May 2026

---

## What's New in v1.5.0

- **StrategyConfig**: Hot-reloadable YAML-based strategy parameters — lens weights, horizon caps, risk limits, conflict penalties. Edit without restarting the engine.
- **StrategyEngine**: Kelly criterion position sizing with confidence weighting, sector concentration limits, and conflict detection/resolution.
- **PerformanceTracker**: Live P&L tracking for managed positions — open/close records, unrealized + realized P&L, win/loss statistics, expectancy, and largest win/loss metrics.
- **Positions API**: `GET/POST /api/positions/`, `GET /api/positions/summary`, `POST /api/positions/{id}/close`
- **Strategy Sizing API**: `GET /api/strategy/sizing/{signal_id}` — full Kelly-based sizing for any live signal.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SystemOne Platform                             │
├────────────────────┬──────────────────────┬──────────────────────────┤
│  WebUI (React)    │  Core Engine (FastAPI)│  Data Services          │
│  :5173            │  :8001               │  :8002                  │
│                    │                      │                         │
│  Signals page     │  /signals/generate   │  ForecastService        │
│  Dashboard        │  /signals            │  (yfinance OHLCV +     │
│  Layers           │  /analysis/          │   ATR/EMA/RSI/MACD/BB)  │
│  Portfolio        │  /strategy/          │                         │
│  Settings         │  /positions/         │  CertaintyDial (P0)     │
│                    │                      │  HistoricalLens (P1)     │
│                    │                      │  EventLens + Recalibrator (P2) │
│                    │                      │  XGBoost HorizonModel (P3) │
└────────────────────┴──────────────────────┴──────────────────────────┘
```

---

## WIRES Framework

| Wire | Component | Status |
|------|-----------|--------|
| WIRE1 | Forecast Service — real OHLCV via yfinance, ATR-based entry/stop/target | ✅ |
| WIRE2 | Mini Projection Chart — 14-day Monte Carlo cone | ✅ |
| WIRE3 | Signal Card Wiremesh — layered micro-metrics card | ✅ |
| WIRE4 | Enrichment API — ATR, risk/reward, regime, momentum delta | ✅ |

---

## P0–P3 Engine

| Phase | Component | Description |
|-------|-----------|-------------|
| **P0** | CertaintyDial | `event_risk_score` param adjusts confidence near events |
| **P1** | HistoricalLens | Sharpe, Sortino, win rate, avg win/loss, max drawdown |
| **P2** | EventLens + Recalibrator | Earnings/FOMC/macro risk scoring, signal recalibration near events |
| **P3** | XGBoost HorizonModel | 3 GradientBoostingClassifiers (immediate/near_term/far_term) with XGBoost optimizations: L1+L2 regularization, column/row subsampling, histogram split finding |

---

## Database Schema

### `watchlists` table
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
symbol          VARCHAR(10) NOT NULL
timeframe       VARCHAR(20) DEFAULT 'swing'
min_confidence  INTEGER DEFAULT 0
enabled         BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### `signals` table
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
version             INTEGER DEFAULT 1
symbol              VARCHAR(10) NOT NULL
protocol_type       protocoltype NOT NULL   -- LONG_BUY, LONG_SELL, SHORT_BUY, SHORT_SELL
confidence_score    DECIMAL(5,2) NOT NULL
entry_price         DECIMAL(12,4) NOT NULL
stop_loss           DECIMAL(12,4) NOT NULL
take_profit         DECIMAL(12,4) NOT NULL
status              signalstatus NOT NULL DEFAULT 'PENDING'  -- PENDING, ACTIVE, EXPIRED, CANCELLED
created_at          TIMESTAMPTZ DEFAULT NOW()
expires_at          TIMESTAMPTZ
atr                 DECIMAL(8,4)
signal_metadata     JSONB
```

**Enums:**
```sql
CREATE TYPE protocoltype AS ENUM ('LONG_BUY', 'LONG_SELL', 'SHORT_BUY', 'SHORT_SELL');
CREATE TYPE signalstatus AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
```

### `positions` table (PerformanceTracker)
```sql
id              SERIAL PRIMARY KEY
signal_id       UUID
symbol          VARCHAR(10) NOT NULL
direction       VARCHAR(10) NOT NULL   -- LONG / SHORT
status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'  -- OPEN / CLOSED
qty             DECIMAL(12,4) NOT NULL
entry_price     DECIMAL(12,4) NOT NULL
exit_price      DECIMAL(12,4)
avg_cost        DECIMAL(12,4)
strategy        VARCHAR(50)
entry_date      TIMESTAMPTZ DEFAULT NOW()
closed_at       TIMESTAMPTZ
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### `position_pnl` table
```sql
id              SERIAL PRIMARY KEY
position_id     INTEGER REFERENCES positions(id)
pnl_realized    DECIMAL(12,4)
pnl_pct         DECIMAL(8,4)
outcome         VARCHAR(20)   -- WIN / LOSS / BREAKEVEN
closed_at       TIMESTAMPTZ DEFAULT NOW()
```

---

## API Reference

### Strategy Config
```
GET  /api/strategy/config     → StrategyConfig
PUT  /api/strategy/config      ← Partial<StrategyConfig>
```

### Strategy Engine
```
POST /api/strategy/size       ← { signals, portfolio_value, existing_positions }
                               → { positions[], conflicts[], total_portfolio_risk }

GET  /api/strategy/sizing/{signal_id}
                               → { signal_id, sizing, conflicts[], horizon_caps, risk_limits }
```

### Positions
```
GET  /api/positions/           → Position[] or { open: Position[], closed: Position[] }
GET  /api/positions/?status=OPEN
GET  /api/positions/summary    → PortfolioSummary (open_count, win_rate, expectancy, etc.)
POST /api/positions/           ← { signal_id?, symbol, direction, qty, entry_price }
POST /api/positions/{id}/close ← { exit_price }
```

### Signal Enrichment Fields
```typescript
interface Signal {
  atr: number;              // 14-day ATR
  risk_reward: number;      // reward / risk ratio
  eta_hours: number;       // estimated time at target
  regime: string;           // TRENDING_BULLISH / BEARISH / RANGE_BOUND / VOLATILE
  momentum_delta: number;   // RSI MACD stochastic change
  volume_surge: number;     // volume vs 20d average (%)
  projection_dates: string[];  // next 14 dates
  projection_p10: number[];    // 10th percentile prices
  projection_p50: number[];    // median prices
  projection_p90: number[];    // 90th percentile prices
}
```

### XGBoost Forecast (SignalAnalysis.xgboost_forecast)
```typescript
interface XGBoostForecast {
  immediate: { direction: "LONG" | "SHORT"; confidence: number; probability: number };
  near_term:  { direction: "LONG" | "SHORT"; confidence: number; probability: number };
  far_term:   { direction: "LONG" | "SHORT"; confidence: number; probability: number };
  feature_importances: { [feature: string]: number };
  model: "XGBoost";
  trained_at: string;
}
```

---

## StrategyConfig YAML Schema

`/home/sysops/sysone/SystemOne/config/strategy.yaml`

```yaml
version: "1.0.0"
weights:
  technical: 0.30      # technical analysis lens weight
  regime: 0.25          # market regime lens weight
  historical: 0.20      # historical performance lens weight
  event: 0.25           # event risk lens weight
horizon_caps:
  immediate: 60         # max confidence % for 1-5 day horizon
  near_term: 80        # max confidence % for 5-20 day horizon
  far_term: 70         # max confidence % for 20-60 day horizon
risk_limits:
  max_position_pct: 5.0         # max % of portfolio per position
  kelly_fraction: 0.25          # Kelly fraction (25% = half-Kelly)
  max_portfolio_leverage: 1.0   # no leverage by default
  max_sector_concentration_pct: 30.0  # max % in any single sector
conflict_penalty:
  threshold_dispersion: 40       # lens score gap triggering penalty
  penalty_multiplier: 0.85      # score multiplier when penalized
enabled_lenses:
  - technical
  - regime
  - historical
  - event
```

---

## StrategyEngine: Position Sizing Algorithm

```
Kelly% = (win_rate × avg_win - avg_loss) / avg_win
Position $ = portfolio × max_position_pct × Kelly_fraction
Shares = Position $ / entry_price
```

**Conflict Detection:**
- Same-direction signals in same sector: reduce by `sector_pct`
- Opposing-direction signals for same symbol: reject with conflict note
- Confidence > horizon cap: apply `confidence_adjustment`

---

## PerformanceTracker: Metrics

| Metric | Description |
|--------|-------------|
| Win Rate | `wins / total_trades × 100` |
| Avg Win % | mean `pnl_pct` of winning trades |
| Avg Loss % | mean `pnl_pct` of losing trades |
| Expectancy | `win_rate × avg_win - loss_rate × avg_loss` |
| Largest Win | max single-trade `pnl` |
| Largest Loss | min single-trade `pnl` |
| Unrealized P&L | `(current_price - entry_price) × qty` (LONG) |
| Realized P&L | `(exit_price - entry_price) × qty` (LONG) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | May 2026 | Initial spec |
| 1.1.0 | May 2026 | ForecastService + Signal Card Wiremesh |
| 1.2.0 | May 2026 | Signal enrichment API, MiniProjectionChart |
| 1.3.0 | May 2026 | EventLens, Recalibrator, CertaintyDial (P2) |
| 1.4.0 | May 2026 | XGBoost HorizonModel (P3) |
| 1.5.0 | May 2026 | StrategyConfig, StrategyEngine, PerformanceTracker, Positions API |
