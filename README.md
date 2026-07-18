# FinOne — AI-Powered Stock Market Intelligence Platform

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)
![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20FastAPI%20%7C%20PostgreSQL-blue)

**FinOne** is a full-stack quantitative trading intelligence platform. It generates
AI-weighted trading signals, manages portfolios, provides XGBoost-powered price
forecasting across three time horizons, and delivers real-time market intelligence
through a spec-compliant React dashboard.

Live market data from Yahoo Finance — **no API keys required**.

---

## Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development](#development)
- [API Reference](#api-reference)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Architecture

```
Browser
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  WebUI (React 19 + Vite + TypeScript + TailwindCSS)        │
│  Port 5173 (dev)  ·  Vite proxy → /api/core, /api/intel    │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP JSON
                             ▼
┌────────────────────────────┐   ┌─────────────────────────────┐
│  Core Engine  (FastAPI)     │   │  Intelligence API  (FastAPI) │
│  Port 8001                  │   │  Port 8002                   │
│  Signals · Auth · Portfolio │   │  XGBoost · LSTM · Sentiment  │
│  Market data · Screener     │   │  Portfolio optimization       │
└────────────┬───────────────┘   └──────────────┬──────────────┘
             │                                  │
     ┌───────┴───────────────────────────────┐  │
     ▼                                       ▼  │
┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│ PostgreSQL  │  │    Redis    │  │   Celery Workers     │  │
│ +TimescaleDB│  │   Broker /  │  │  Periodic / Async    │  │
│  Port 5432  │  │   Cache     │  └─────────────────────┘  │
└─────────────┘  │  Port 6379  │
                 └─────────────┘
```

### Services

| Service | Port | Role |
|---|---|---|
| `webui` | 5173 | React dashboard — all user-facing UI |
| `core-engine` | 8001 | Signals, auth, portfolios, market data, screener |
| `intelligence` | 8002 | XGBoost forecasting, sentiment analysis, optimization |

---

## Key Features

### Trading Signals
- **6-Layer Ensemble Analysis** — Trend, Momentum, MTF, Institutional, Sentiment, Intermarket
- **Probability-Weighted Engine** — certainty dial with conflict-penalty scoring across three horizons
  - Immediate (≤ 60% certainty cap)
  - Near-term (≤ 80% certainty cap)
  - Far-term (≤ 70% certainty cap)
- **EventLens** — adjusts probability around earnings, FOMC meetings, geopolitical risk
- **HistoricalLens** — setup-type win rates drawn from recorded outcomes
- **Signal expiry worker** — auto-expires stale signals; one active signal per symbol

### Market Intelligence
- **Live data** — Yahoo Finance, FRED, SEC EDGAR, Reddit (no API keys)
- **Fear & Greed Composite** — VIX / SPY / QQQ blended sentiment score
- **Stock Screener** — filter by symbol, signal direction, strength, horizon
- **43-symbol watchlist** — AAPL, MSFT, NVDA, GOOGL, JPM, NFLX, and 38 more

### Portfolio Management
- CSV / JSON upload, transaction history, P&L tracking, risk analytics
- **Portfolio Drift gauge** — overweight / underweight breakdown vs. strategy targets
- **ATR-based trade levels** — entry zones, stop loss, price targets per signal

### Forecasting (Intelligence API)
- **XGBoost multi-horizon models** — immediate / near-term / far-term price paths
- **LSTM price forecasting** — PyTorch-based deep sequence model
- **Monte Carlo confidence cones** — p10 / p50 / p90 projection fans on signal cards
- **Mean-variance portfolio optimization** — Black-Litterman Bliever-Nealey inputs

### Dashboard (WebUI)
- **11 dashboard cards** — FearGreedDial, MarketSentiment, AdvancingDeclining,
  QuickActions, MarketTrend, HotSymbols, SectorPerformance, NewsFeed,
  MarketHeatmap, PortfolioDonut, PortfolioDrift
- **Design Spec v2.0.0 compliant** — full design token system, WCAG AA contrast,
  dark/light theme, responsive grid, mobile BottomNav
- **GlobalCommandBar** — Cmd+K fuzzy search across all pages and actions
- **Auth gate** — JWT sessions, login/logout, user dropdown
- **Stale-while-revalidate caching** — 5-min TTL localStorage cache on all API calls

---

## Project Structure

```
finone/
├── webui/                      # React 19 + Vite frontend
│   └── src/
│       ├── components/         # 22 UI components (Dashboard cards, Nav, Layout)
│       ├── pages/               # 13 pages (Dashboard, Signals, Portfolio, etc.)
│       ├── hooks/               # useCachedApi, useTheme, useAuth, useWindowSize
│       ├── lib/api.ts           # API client + cache layer
│       ├── types/index.ts       # Shared TypeScript types
│       ├── index.css            # Design token system + component CSS
│       ├── tailwind.config.js   # Tailwind + custom component plugin
│       └── vite.config.ts       # Vite config + proxy rules
│
├── services/
│   ├── core-engine/             # FastAPI — signals, auth, portfolio, market
│   │   └── app/
│   │       ├── api/             # Route modules (signals, portfolio, market…)
│   │       ├── models/          # SQLAlchemy models
│   │       └── services/        # certainty_dial, event_lens, historical_lens…
│   │
│   └── intelligence/           # FastAPI — ML forecasting, NLP, optimization
│       └── app/
│           ├── api/             # Route modules (forecast, sentiment, optimize)
│           ├── ml/              # XGBoost + LSTM model wrappers
│           ├── nlp/             # Sentiment analysis
│           └── tasks/           # Celery periodic tasks
│
├── models/                      # Trained XGBoost horizon models (43 symbols)
│   ├── AAPL_immediate.pkl       # immediate-term (< 2 weeks)
│   ├── AAPL_near_term.pkl      # near-term (2–8 weeks)
│   └── AAPL_far_term.pkl       # far-term (2–6 months)
│
├── config/                      # Strategy + strategy_config YAML
├── init-scripts/                # Database schema (TimescaleDB hypertables)
├── docs/                        # Full documentation
│   ├── SystemOne_Design_Spec_v2.0.0.md   # Design system reference
│   ├── FEATURE_PROBABILITY_WEIGHTED_ENGINE.md
│   ├── SYSTEMONE_ARCHITECTURE.md
│   └── API_FIELD_REFERENCE.md
│
├── docker-compose.yml           # Full stack (postgres, redis, core, intel, webui)
├── Makefile                     # build, up, down, add-user, logs, logs-follow
├── .env.example                 # Environment variable template
├── core-engine.env              # Core Engine env vars
└── SKILLs.md                   # OpenClaw integration notes
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (for webui)
- **Python** 3.11+ (for core-engine and intelligence)
- **Docker & Docker Compose** (for full stack)
- **PostgreSQL 15 + TimescaleDB** (or use the Docker setup)
- **Redis** (or use the Docker setup)

### 1 — Clone & configure

```bash
git clone https://github.com/emmanuel-a-otchere/finone.git
cd finone

cp .env.example .env
# Edit .env with your database, Redis, and JWT secret values
```

### 2 — Start the full stack

```bash
# Start all services (postgres, redis, core-engine, intelligence, webui)
make build
make up

# Create an admin user
make add-user
```

### 3 — Open the dashboard

```
http://localhost:5173
```

### Using Docker Compose directly

```bash
docker compose up -d

docker compose exec core-engine python -c "
from app.api.admin import create_user
import asyncio; asyncio.run(create_user('admin', 'password'))
"
```

---

## Development

### Running services individually

**WebUI (hot-reload dev server):**
```bash
cd webui && npm install
npm run dev          # → http://localhost:5173
```

**Core Engine:**
```bash
cd services/core-engine
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Intelligence API:**
```bash
cd services/intelligence
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

**Vite proxy** automatically forwards `/api/core/*` → `localhost:8001`
and `/api/intel/*` → `localhost:8002` in development.

### Running tests

```bash
# WebUI
cd webui && npm test

# Core Engine
cd services/core-engine && pytest

# Intelligence
cd services/intelligence && pytest
```

### Database migrations

```bash
# Run schema init scripts
psql -U postgres -d systemone -f init-scripts/001_initial_schema.sql
```

---

## API Reference

### Core Engine — Port 8001

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate, return JWT |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Current user info |
| `POST` | `/signals/generate` | Generate signals for symbols |
| `GET` | `/signals` | List signals (filter: symbol, direction, status) |
| `GET` | `/signals/{id}` | Signal detail + probability analysis |
| `POST` | `/portfolio/upload` | Upload portfolio (CSV/JSON) |
| `GET` | `/portfolio/{id}` | Portfolio detail + recommendations |
| `GET` | `/layers` | All 6 analysis layers |
| `GET` | `/layers/{name}/drilldown` | Layer detail per symbol |
| `GET` | `/market/fear-greed` | VIX/SPY/QQQ composite score |
| `GET` | `/market/hot` | Hot symbols from Yahoo Finance |
| `GET` | `/screener` | Stock screener with filters |
| `GET` | `/health` | Service health check |

### Intelligence API — Port 8002

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/forecast/{symbol}` | XGBoost + LSTM price forecast |
| `POST` | `/sentiment` | Batch sentiment analysis |
| `GET` | `/sentiment/{symbol}` | Per-symbol sentiment (news, Reddit) |
| `POST` | `/optimize` | Mean-variance portfolio optimization |
| `GET` | `/optimize/params` | Optimization parameter metadata |
| `GET` | `/health` | Service health + scheduler status |

See [docs/API_FIELD_REFERENCE.md](docs/API_FIELD_REFERENCE.md) for full field definitions.

---

## Documentation

| Document | What it covers |
|----------|---------------|
| [SystemOne_Design_Spec_v2.0.0.md](docs/SystemOne_Design_Spec_v2.0.0.md) | Full design system — tokens, layout, components, states |
| [FEATURE_PROBABILITY_WEIGHTED_ENGINE.md](docs/FEATURE_PROBABILITY_WEIGHTED_ENGINE.md) | PWE architecture, certainty dial, lens system |
| [SYSTEMONE_ARCHITECTURE.md](docs/SYSTEMONE_ARCHITECTURE.md) | Component diagram, service responsibilities, data flow |
| [API_FIELD_REFERENCE.md](docs/API_FIELD_REFERENCE.md) | All REST fields, types, and enums |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Ubuntu, Docker, OpenClaw deployment |
| [SPEC_RECONCILIATION.md](docs/SPEC_RECONCILIATION.md) | Design spec audit results |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 5, TypeScript, TailwindCSS |
| Backend | FastAPI (Python 3.11), Uvicorn |
| Database | PostgreSQL 15 + TimescaleDB |
| Cache | Redis |
| Task Queue | Celery |
| ML — Forecasting | XGBoost, PyTorch LSTM |
| ML — Sentiment | FinBERT NLP |
| Auth | JWT (HS256), HTPASSWD |
| Container | Docker Compose |

---

## License

[AGPL-3.0](LICENSE) — see [LICENSE](LICENSE) for full terms.
