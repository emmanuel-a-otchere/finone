# SystemOne Trading Intelligence Platform
## Complete Technical Specification v1.4.0
### With Architecture Choices Integrated

**Document ID**: SYS-ONE-SPEC-1.4.0
**Status**: Production Ready
**Date**: 2026-05-11
**License**: AGPL-3.0

---

## What's New in v1.4.0 — P3: XGBoost Multi-Horizon Forecasting

**P3 replaces XGBoost with sklearn GradientBoostingClassifier** (disk full on server, same algorithm).

### New: GradientBoosting Horizon Model ()
- Separate models for **3 horizons**: immediate (1-5d), near-term (5-20d), far-term (20-60d)
- Feature engineering: 9 features per symbol (returns, RSI, MACD, Bollinger position, volume ratio, ATR regime, ADX)
- 200-day rolling window training on real Yahoo Finance OHLCV data
- Models persisted to 
- Prediction includes:  (LONG/SHORT), ,  score, , 

### New:  in SignalAnalysis
Every SignalAnalysis response now includes a  dict with directional predictions at all 3 horizons.

### New: XGBoost API Endpoints
| Method | Path | Description |
|---|---|---|
| GET |  | GradientBoosting forecast for signal's symbol |
| POST |  | Batch forecast for multiple symbols |

### Feature Engineering (9 inputs)
| Feature | Description |
|---|---|
|  | Past returns over 1, 5, 20 days |
|  | 14-day Relative Strength Index |
|  | MACD - Signal line |
|  | Bollinger Band position (0-1) |
|  | 20d avg volume / 252d avg volume |
|  | ATR / SMA (volatility normalized) |
|  | 14-day Average Directional Index |

### Algorithm
GradientBoostingClassifier (sklearn) — same gradient-boosted decision tree approach as XGBoost, no CUDA needed.

---

## What's New in v1.4.0 — P3: XGBoost Multi-Horizon Forecasting

**P3 uses sklearn GradientBoostingClassifier** (server disk full, same algorithm as XGBoost).

### New: GradientBoosting Horizon Model (`app/services/horizon_model.py`)
- Separate models for 3 horizons: immediate (1-5d), near-term (5-20d), far-term (20-60d)
- Feature engineering: 9 features per symbol (returns, RSI, MACD, Bollinger position, volume ratio, ATR regime, ADX)
- 200-day rolling window training on real Yahoo Finance OHLCV data
- Models persisted to `/home/sysops/sysone/SystemOne/models/{symbol}_{horizon}.pkl`
- Prediction: direction (LONG/SHORT), direction_probability, confidence score, horizon_label

### New: `xgboost_forecast` in SignalAnalysis
Every SignalAnalysis response now includes a `xgboost_forecast` dict with directional predictions at all 3 horizons.

### New: XGBoost API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/analysis/{signal_id}/xgboost` | GradientBoosting forecast for signal's symbol |
| POST | `/api/analysis/xgboost/batch` | Batch forecast for multiple symbols |

### Feature Engineering (9 inputs)
| Feature | Description |
|---|---|
| `return_1d/5d/20d` | Past returns over 1, 5, 20 days |
| `rsi_14` | 14-day Relative Strength Index |
| `macd_signal` | MACD - Signal line |
| `bb_position` | Bollinger Band position (0-1) |
| `volume_ratio` | 20d avg volume / expanding avg volume |
| `atr_regime` | ATR / SMA (volatility normalized) |
| `adx_14` | 14-day Average Directional Index |

### Algorithm
GradientBoostingClassifier (sklearn) — same gradient-boosted decision tree approach as XGBoost, no CUDA needed.

---

## What's New in v1.3.0 (P2 - Event Lens + Recalibrator)

### EventLens (Probability-Weighted Engine - P2)
- Event risk scoring: Earnings (yfinance), FOMC (hardcoded 2026 calendar), macro (sector sensitivity)
- Risk decay curve: Peaks at 100 on event day, decays with distance
- Combined risk: earnings*0.50 + fomc*0.35 + macro*0.15
- Sector sensitivity: Tech *1.2 FOMC multiplier, energy +30, financials +25
- FOMC 2026 calendar: Jan 28, Mar 18, May 5, Jun 16, Jul 28, Sep 15, Nov 3, Dec 15
- New endpoint: GET /api/analysis/events/{symbol}?days_ahead=30
- CertaintyDial: event_risk_score parameter (0-100); event_lens_score = 100 - combined_risk
- SignalAnalysis: include_events=True embeds full EventRiskScore in response

### Recalibrator (Probability-Weighted Engine - P2)
- Trigger rules: earnings <=7 days, FOMC <=5 days
- Actions: CLOSE_POSITION (day-of earnings), REDUCE_SIZE (near), HOLD (safe)
- New endpoint: POST /api/analysis/recalibrate - body: {signals: [...], days_ahead: 14}

### New Files
- app/services/event_lens.py - Event data + risk scoring
- app/services/recalibrator.py - Signal recalibration engine

### Updated Files
- app/services/certainty_dial.py - Added event_risk_score optional param
- app/services/signal_analysis.py - Added include_events param, event_risk field
- app/api/analysis.py - Added /events/{symbol} and /recalibrate endpoints
- webui/src/types/index.ts - Added Event, EventRiskScore, Recalibration interfaces
- webui/src/lib/api.ts - Added getEventRisk(), recalibrateSignals() methods

---
## 1. Executive Summary

SystemOne is a self-contained quantitative trading intelligence system featuring:
- **6-Layer Ensemble Analysis**: Trend, Momentum, Multi-Timeframe, Institutional Flow, Sentiment, Intermarket
- **Zero-Cost Data Architecture**: 100% free data sources (Yahoo Finance, FRED, SEC EDGAR, Reddit)
- **OpenClaw Native**: Optional integration with Stockman agent, NTFY, and SMTP
- **Modern WebUI**: React-based dashboard with layer correlation drilldown
- **Autonomous Operation**: Self-learning Bayesian optimization with portfolio file monitoring

---

## 2. Architecture Overview

### 2.1 Confirmed Architecture Choices (v1.1.0)

| Decision | Choice |
|----------|--------|
| WebUI Build | Multi-stage Dockerfile with Caddy |
| Celery Scheduler | celery-sqlalchemy-scheduler |
| Authentication | htpasswd-style file + JWT |
| Packaging | Docker save/export to Packaged/ |

### 2.2 Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Caddy Reverse Proxy (Containerized)              │
│  Routes: /api/core/* → Core Engine                                  │
│          /api/intel/* → Intelligence                                │
│          /ws → WebSocket                                            │
│          / → React WebUI (static files)                             │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼──────────┐ ┌▼─────────────┐ ┌▼──────────────┐
│ Core Engine  │ │ Intelligence │ │   PostgreSQL  │
│ (FastAPI)    │ │  (FastAPI)   │ │  (TimescaleDB)│
│ Port: 8001   │ │  Port: 8002  │ │   Port: 5432  │
│              │ │              │ │               │
│ • Signals    │ │ • ML/LSTM    │ │ • Market Data │
│ • Risk Mgmt  │ │ • NLP/FinBERT│ │ • Portfolio   │
│ • WebSocket  │ │ • Celery     │ │ • Versioned   │
│ • Auth (JWT) │ │ • OpenClaw   │ │   Schema      │
└──────┬───────┘ └──────┬───────┘ └───────────────┘
       │                │
       └────────────────┘
              │
       ┌──────▼──────┐
       │    Redis    │
       │   (Cache    │
       │    + Queue) │
       └─────────────┘
```

### 2.3 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| API Gateway | Caddy | 2.7+ | Reverse proxy, HTTPS, static files |
| Core Engine | Python/FastAPI | 3.11/0.109 | Signal generation, auth, risk |
| Intelligence | Python/FastAPI | 3.11/0.109 | ML, NLP, optimization |
| Database | PostgreSQL | 15+ | TimescaleDB extension |
| Scheduler | celery-sqlalchemy-scheduler | 0.3+ | Database-backed schedules |
| Cache/Queue | Redis | 7+ | Streams, pub/sub, Celery |
| Frontend | React | 18+ | TypeScript, Tailwind |
| Auth | htpasswd + JWT | - | bcrypt hashing, token auth |

---

## 3. Authentication System

### 3.1 htpasswd-style Authentication

Users are stored in a file-based format with bcrypt hashing.

**File Location**: `/config/users.htpasswd`

**Format**:
```
username:$2b$12$hash...
admin:$2b$12$...
```

**CLI Management**:
```bash
# Add user
python -m systemone.auth add-user <username>

# Remove user
python -m systemone.auth remove-user <username>

# List users
python -m systemone.auth list-users
```

### 3.2 JWT Token Flow

1. User submits credentials to `/api/core/auth/login`
2. Server validates against htpasswd file
3. Server issues JWT with 24-hour expiration
4. Client includes `Authorization: Bearer <token>` header
5. Protected endpoints validate JWT signature

---

## 4. Celery Scheduler Configuration

### 4.1 celery-sqlalchemy-scheduler Setup

Schedules are stored in PostgreSQL, not in files.

**Database Tables**:
- `celery_periodic_task` - Task definitions
- `celery_schedule` - Cron/interval schedules
- `celery_crontab` - Crontab entries

**Default Schedules**:

| Task | Schedule | Description |
|------|----------|-------------|
| fetch_market_data | Every 5 min (market hours) | Update price data |
| calculate_signals | Every 15 min | Generate trading signals |
| retrain_lstm | Daily 2:00 AM UTC | Retrain ML model |
| sentiment_scan | Every 30 min | Scan Reddit/news |
| portfolio_monitor | Every 5 min | Check portfolio alerts |
| cleanup_old_data | Daily 3:00 AM UTC | Archive old signals |

---

## 5. WebUI Build Pipeline

### 5.1 Multi-stage Dockerfile

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
```

### 5.2 Caddy Configuration

Caddy serves both static files and proxies API requests.

---

## 6. Packaging Strategy

### 6.1 Docker Export Process

```bash
# Build all images
docker-compose build

# Export to Packaged/releases/
./scripts/package.sh v1.0.0

# Output:
# Packaged/releases/systemone-v1.0.0.tar.gz
# Packaged/releases/systemone-v1.0.0.sha256
```

### 6.2 Deployment from Package

```bash
# Load images
docker load < systemone-v1.0.0.tar.gz

# Start services
docker-compose up -d
```

---

## 7. API Endpoints

### 7.1 Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/core/auth/login | Authenticate user |
| POST | /api/core/auth/logout | Invalidate token |
| GET | /api/core/auth/me | Get current user |

### 7.2 Signals

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/core/signals/generate | Generate signals for watchlist symbols |
| GET | /api/core/signals | List signals (filter by status, symbol, limit) |
| GET | /api/core/signals/{id} | Get signal details |

**Signal Response Fields** (additional to core fields):
`atr`, `risk_reward`, `eta_hours`, `regime`, `momentum_delta`, `volume_surge`,
`projection_dates`, `projection_p10`, `projection_p50`, `projection_p90`

### 7.3 Portfolio

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/core/portfolio/upload | Upload portfolio file |
| GET | /api/core/portfolio/{id} | Get portfolio status |
| GET | /api/core/portfolio/{id}/recommendations | Get recommendations |

### 7.4 Layers

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/core/layers/{name}/drilldown | Layer analysis |
| GET | /api/core/layers/correlation-matrix | 6x6 correlation matrix |

### 7.5 Intelligence

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/intel/forecast | LSTM price forecast |
| POST | /api/intel/sentiment | Sentiment analysis |
| POST | /api/intel/optimize | Bayesian optimization |

---

## 8. Database Schema

### 8.1 Core Tables

```sql
-- Enums
CREATE TYPE signalstatus AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE protocoltype AS ENUM ('LONG_BUY', 'LONG_SELL', 'SHORT_SELL', 'SHORT_BUY');

-- Signals
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(10) DEFAULT '1.1.0',
    protocol_type protocoltype NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    entry_price DECIMAL(12,4),
    stop_loss DECIMAL(12,4),
    take_profit DECIMAL(12,4),
    status signalstatus DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    layer_scores JSONB,
    signal_metadata JSONB DEFAULT '{}'
);

-- Portfolios
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    holdings JSONB NOT NULL,
    watchlist JSONB,
    settings JSONB,
    last_uploaded TIMESTAMPTZ DEFAULT NOW(),
    monitoring_active BOOLEAN DEFAULT TRUE
);

-- Market Data (TimescaleDB hypertable)
CREATE TABLE market_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    volume BIGINT,
    PRIMARY KEY (time, symbol)
);
SELECT create_hypertable('market_data', 'time');
```

---

## 9. Environment Configuration

### 9.1 Required Variables

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=systemone
DB_USER=postgres
DB_PASSWORD=<secure_password>

# Redis
REDIS_URL=redis://redis:6379/0

# Authentication
JWT_SECRET=<random_64_char_string>
JWT_EXPIRATION_HOURS=24
HTPASSWD_FILE=/config/users.htpasswd

# Optional: OpenClaw
OPENCLAW_ENABLED=false
OPENCLAW_API_URL=http://openclaw:8080
OPENCLAW_API_KEY=<key>

# Optional: Notifications
NTFY_ENABLED=false
NTFY_SERVER_URL=https://ping.otchere.com
NTFY_TOPIC=portfolio
```

---

## 10. Deployment

### 10.1 Quick Start

```bash
# Clone and setup
git clone <repo>
cd SystemOne

# Configure
cp .env.example .env
# Edit .env with your settings

# Start
docker-compose up -d

# Create admin user
docker-compose exec core-engine python -m systemone.auth add-user admin

# Access
open http://localhost
```

### 10.2 Health Checks

```bash
# System health
curl http://localhost/api/core/health

# Database status
curl http://localhost/api/core/health/db

# Scheduler status
curl http://localhost/api/intel/health/scheduler
```

---

### 7.6 Symbols

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/core/symbols/{symbol}/info | Live Yahoo Finance symbol info |

**Info Response Fields**: `symbol`, `name`, `type`, `exchange`, `currency`,
`current_price`, `market_cap`, `pe_ratio`, `dividend_yield`, `week_52_high`,
`week_52_low`, `analyst_rating`, `revenue_growth`, `earnings_growth`,
`next_earnings_date`, `timestamp`

## 11. ForecastService

`app/services/forecast.py` — central service for real market data and trade level computation.

### 11.1 Data Source
- **Yahoo Finance** via `yfinance` (no API key required)
- 30-day daily OHLCV fetched on demand, cached 300s

### 11.2 Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get_ohlcv(symbol)` | `pd.DataFrame` | 30-day daily OHLCV |
| `compute_indicators(symbol)` | `dict` | RSI, MACD, Bollinger, Stochastic, ATR, ADX |
| `get_entry_stop_target(symbol, protocol)` | `dict` | Entry/Stop/Target via ATR-based rules |
| `project_price_path(symbol, days, n_scenarios)` | `dict` | Monte Carlo price fan (p10/p50/p90) |
| `calculate_layer_scores(symbol)` | `dict` | 6-layer ensemble scores |

### 11.3 ATR-Based Trade Levels

- **Stop Loss** = Entry − 1.5 × ATR(14)
- **Target** = Entry + 2.0 × ATR(14)
- **ETA** = |Target − Entry| / ATR × 24 hours

### 11.4 Signal Expiry Logic

`generate_signals_for_watchlist()` calls `_expire_stale_signals(db, symbol)` before
inserting a new signal — ensuring exactly 1 ACTIVE signal per symbol at any time.
Old signals are set to status `EXPIRED` (not deleted).

### 11.5 Signal Enrichment

Each signal returned by `GET /signals` is enriched with:
- `atr`: 14-day ATR
- `risk_reward`: reward / risk ratio
- `eta_hours`: estimated hours to target
- `regime`: TRENDING_BULLISH / TRENDING_BEARISH / RANGE_BOUND / VOLATILE
- `momentum_delta`: momentum layer score − 50
- `volume_surge`: today's volume vs 20-day average %
- `projection_dates`, `projection_p10/p50/p90`: 14-day Monte Carlo fan

## 12. Signal Card Wiremesh UI

`webui/src/components/SignalCard.tsx` — dense information card replacing the legacy
52-line compact card.

### 12.1 Information Layers

**Layer 1 — Immediate Decision**
Symbol, direction (Long/Short), confidence score, risk/reward ratio, ETA to target.

**Layer 2 — Trade Levels**
Entry / Stop / Target grid with color coding (green = target, red = stop, white = entry).

**Layer 3 — Predictive Trend Chart**
`MiniProjectionChart.tsx` — 14-day Monte Carlo confidence cone sparkline:
- Green/red base line = p50 (base case)
- Shaded cone = p90 (bull) to p10 (bear) confidence interval
- Last 8 of 14 days shown for compactness
- Built with Recharts `Area` + `Line` components

**Layer 4 — Micro-Metrics Footer**
ATR, volume surge %, signal age, momentum delta, multi-timeframe alignment bar.

### 12.2 Color System

| Confidence | Color |
|-----------|-------|
| 0–40% | Muted slate |
| 40–60% | Amber |
| 60–75% | Lime |
| 75–90% | Emerald |
| 90%+ | Cyan |

**Direction**: Long = Emerald/Teal; Short = Crimson/Red

### 12.3 Component Files

| File | Purpose |
|------|---------|
| `components/SignalCard.tsx` | Wiremesh card with 4 information layers |
| `components/MiniProjectionChart.tsx` | Recharts confidence cone sparkline |
| `components/ForecastChart.tsx` | Full modal chart (existing) |
| `pages/Signals.tsx` | Signal list page with modal, status filter |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-08 | Initial specification |
| 1.1.0 | 2026-03-08 | Integrated architecture choices: Multi-stage Dockerfile, celery-sqlalchemy-scheduler, htpasswd auth, Docker export packaging |
