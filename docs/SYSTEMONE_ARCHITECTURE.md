# SystemOne Trading Intelligence Platform — Architecture

**Version:** 1.1.0
**Last Updated:** 2026-05-08

---

## System Overview

SystemOne is a full-stack quantitative trading intelligence platform built with a microservices architecture. It generates trading signals, manages portfolios, provides ML-powered price forecasting, and performs NLP sentiment analysis on financial news and social media.

---

## High-Level Architecture

```
Browser Client
    |
    v
WebUI (Vite + React 19)  :5173  ------>  Core Engine (FastAPI)  :8001
                                        |
                                        v
                                  Intelligence API (FastAPI)  :8002
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
               PostgreSQL            Redis             Celery Workers
               (TimescaleDB)         (Broker/           (Periodic Tasks)
               :5432                 Result/Cache)
                                     :6379
```

---

## Component Details

### WebUI — Frontend
- **Stack:** Vite 5 + React 19, TypeScript, TailwindCSS
- **Port:** 5173 (dev server)
- **Auth:** JWT Bearer Token (stored in memory/localStorage)
- **Proxy Routes (Vite dev server):**
  - `/api/core` -> `localhost:8001` (Core Engine)
  - `/api/intel` -> `localhost:8002` (Intelligence API)
- **Pages:** Dashboard, Signals, Layers, Portfolio, Settings, Login

### Core Engine — Backend API (Port 8001)
- **Stack:** FastAPI + Uvicorn, Python 3.11, SQLAlchemy (async)
- **Database:** PostgreSQL + TimescaleDB extension (asyncpg driver)
- **Auth:** HTPASSWD file + JWT (HS256), expires in configurable hours
- **Routes:**
  - `POST /auth/login` — authenticate, return JWT
  - `POST /auth/logout` — invalidate session
  - `GET /auth/me` — current user info
  - `POST /signals/generate` — generate trading signals for symbols
  - `GET /signals` — list signals with filtering
  - `GET /signals/{signal_id}` — single signal detail
  - `POST /portfolio/upload` — upload portfolio (CSV/JSON)
  - `GET /portfolio/{portfolio_id}` — portfolio detail
  - `GET /portfolio/{portfolio_id}/recommendations` — AI recommendations
  - `GET /layers` — all analysis layers
  - `GET /layers/{layer_name}/drilldown?symbol=X` — layer detail per symbol
  - `GET /layers/correlation-matrix` — cross-symbol correlation matrix
  - `GET /health` — service health
  - `GET /health/db` — database connectivity check
- **Models:** Signal, Portfolio, MarketData
- **Services:** AuthService, SignalsService, LayersService

### Intelligence API — ML/NLP Layer (Port 8002)
- **Stack:** FastAPI + Uvicorn, Python 3.11, SQLAlchemy (async)
- **Database:** PostgreSQL (shared with Core Engine via asyncpg)
- **Routes:**
  - `GET /forecast/{symbol}?days=N` — LSTM price forecasting
  - `POST /sentiment` — batch sentiment analysis
  - `GET /sentiment/{symbol}` — sentiment for symbol (news, Reddit, Twitter)
  - `POST /optimize` — mean-variance portfolio optimization
  - `GET /optimize/params` — optimization parameters
  - `GET /health` — service health
  - `GET /health/scheduler` — Celery scheduler status
- **ML Models:**
  - LSTM Forecaster (PyTorch) — time-series price prediction
  - FinBERT Sentiment Analyzer (Transformers) — NLP sentiment from financial text
  - Mean-Variance Optimizer (scikit-learn) — portfolio optimization
- **Task Queue:** Celery + Redis
  - `fetch_market_data` — pull market data from YFinance
  - `calculate_signals` — recalculate trading signals
  - `retrain_lstm` — periodic LSTM model retraining
  - `sentiment_scan` — scan news/social media for sentiment
  - `portfolio_monitor` — monitor positions, send alerts
  - `cleanup_old_data` — archive old records

### PostgreSQL — Primary Data Store
- **Port:** 5432
- **Extension:** TimescaleDB (for time-series optimization)
- **Schema Tables:**
  - `signals` — trading signals (symbol, protocol, confidence, prices, status)
  - `portfolios` — user portfolios (watchlist, settings, last_uploaded)
  - `market_data` — OHLCV time-series per symbol
- **Indexes:** symbol, user_id, created_at, status

### Redis — Cache + Message Broker
- **Port:** 6379
- **Role:** Celery broker + result backend + LRU cache
- **Persistence:** AOF enabled, maxmemory 512MB, allkeys-lru eviction

---

## Data Flow

1. **Market Data Ingestion:** Celery beat triggers `fetch_market_data` task -> YFinance API -> PostgreSQL
2. **Signal Generation:** User requests `/signals/generate` -> Core Engine -> reads market_data -> returns signals
3. **ML Forecasting:** User requests `/forecast/AAPL` -> Intelligence API -> LSTM model -> predictions
4. **Sentiment Analysis:** User requests `/sentiment/AAPL` -> Intelligence API -> FinBERT -> aggregated scores
5. **Portfolio Optimization:** User requests `/optimize` -> Intelligence API -> Mean-Variance optimizer -> weights

---

## Security

- **Auth:** JWT Bearer tokens, HS256 signing, configurable expiry
- **Passwords:** bcrypt hashed, stored in HTPASSWD file
- **CORS:** All origins allowed in dev (configured per environment)
- **DB:** Role-based access, non-root user

---

## Deployment

- **Containerized:** Docker + Docker Compose (docker-compose.yml)
- **Services:** Core Engine, Intelligence API, WebUI, Celery (worker + beat)
- **Networks:** Internal bridge network, ports exposed as environment variables
- **Volumes:** PostgreSQL data, Redis data, model weights, logs

---

## Test Credentials

| Username | Password |
|----------|----------|
| `admin` | `admin123` |
| `testuser` | `testpass123` |

---

## Architecture Diagram

![SystemOne Architecture](systemone-architecture.excalidraw)

Open the `.excalidraw` file in [excalidraw.com](https://excalidraw.com) to view the interactive diagram.

