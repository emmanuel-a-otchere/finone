/*
  # SystemOne Initial Schema v1.1.0

  1. Extensions
    - Enable TimescaleDB for time-series data
    - Enable UUID generation

  2. New Tables
    - `signals` - Trading signal records with layer scores
    - `portfolios` - User portfolio definitions
    - `market_data` - OHLCV price data (TimescaleDB hypertable)
    - `model_outcomes` - ML model performance tracking
    - `layer_analysis_cache` - Cached layer drilldown data

  3. Security
    - Tables are internal, accessed via API only
    - No RLS needed (single-tenant, API-gated)

  4. Indexes
    - Symbol and timestamp indexes for fast queries
*/

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TYPE protocoltype AS ENUM ('LONG_BUY', 'LONG_SELL', 'SHORT_SELL', 'SHORT_BUY');

CREATE TYPE signalstatus AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(10) DEFAULT '1.1.0',
    protocol_type protocoltype NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    entry_price DECIMAL(12,4),
    stop_loss DECIMAL(12,4),
    take_profit DECIMAL(12,4),
    position_size_pct DECIMAL(5,2),
    status signalstatus DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    layer_scores JSONB DEFAULT '{}',
    signal_metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);

CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    format_version VARCHAR(10) DEFAULT '2.0',
    holdings JSONB NOT NULL,
    watchlist JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    last_uploaded TIMESTAMPTZ DEFAULT NOW(),
    monitoring_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

CREATE TABLE IF NOT EXISTS market_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    volume BIGINT,
    PRIMARY KEY (time, symbol)
);

SELECT create_hypertable('market_data', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol, time DESC);

CREATE TABLE IF NOT EXISTS model_outcomes (
    id BIGSERIAL,
    signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
    model_version VARCHAR(20),
    actual_outcome VARCHAR(20) CHECK (actual_outcome IN ('TRUE_POSITIVE', 'TRUE_NEGATIVE', 'FALSE_POSITIVE', 'FALSE_NEGATIVE')),
    profit_loss_pct DECIMAL(8,4),
    market_regime VARCHAR(20),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('model_outcomes', 'recorded_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS layer_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    layer_name VARCHAR(50) NOT NULL,
    analysis_data JSONB NOT NULL,
    correlation_matrix JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    UNIQUE(symbol, layer_name, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_layer_cache_symbol_layer ON layer_analysis_cache(symbol, layer_name);

-- ── Market Snapshot tables ──────────────────────────────────────────────────
-- Daily Fear & Greed and Market Sentiment snapshots for historical comparison

CREATE TABLE IF NOT EXISTS fear_greed_snapshots (
    date TIMESTAMPTZ PRIMARY KEY,
    value INTEGER NOT NULL,
    label VARCHAR(20) NOT NULL,
    vix DECIMAL(8,2),
    spy_close DECIMAL(12,4),
    qqq_close DECIMAL(12,4),
    spy_ma20 DECIMAL(12,4),
    momentum_score DECIMAL(6,2),
    breadth_score DECIMAL(6,2),
    vol_score DECIMAL(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fear_greed_date ON fear_greed_snapshots(date DESC);

CREATE TABLE IF NOT EXISTS market_sentiment_snapshots (
    date TIMESTAMPTZ PRIMARY KEY,
    value INTEGER NOT NULL,
    label VARCHAR(20) NOT NULL,
    trend_score INTEGER,
    momentum_score INTEGER,
    breadth_score INTEGER,
    volatility_score INTEGER,
    spy_close DECIMAL(12,4),
    spy_ma20 DECIMAL(12,4),
    spy_ma50 DECIMAL(12,4),
    advancers INTEGER,
    decliners INTEGER,
    unchanged INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_date ON market_sentiment_snapshots(date DESC);
