# SystemOne Trading Skill for OpenClaw

## Metadata
```yaml
skill_id: systemone-trading
name: "SystemOne Quantitative Trading"
version: "1.1.0"
description: |
  Advanced 6-layer ensemble trading system with self-learning capabilities.
  Monitors portfolios, generates signals, and provides drilldown analysis.
icon: chart_with_upwards_trend
author: "SystemOne Team"
license: "AGPL-3.0"
min_openclaw_version: "1.5.0"
```

## External Dependencies (OpenClaw-Provided)

### NTFY Notifications
**Endpoint**: `https://ping.otchere.com`
**Topic**: `portfolio` (default, configurable)
**Integration**: SystemOne references OpenClaw's NTFY configuration

```yaml
skills:
  systemone-trading:
    ntfy:
      server_url: https://ping.otchere.com
      topic: portfolio
      priority_map:
        critical: 5
        high: 4
        normal: 3
        low: 2
        min: 1
```

### SMTP Relay
**Provider**: OpenClaw internal messaging service
**Method**: SystemOne calls OpenClaw API rather than direct SMTP

## Agent Compatibility

| Agent | Role | Capabilities |
|-------|------|--------------|
| **Stockman** | Primary | Execute trades, portfolio optimization, rebalancing |
| **Analyst** | Secondary | Deep layer analysis, correlation studies, backtesting |
| **RiskManager** | Tertiary | Position sizing limits, drawdown monitoring |

## API Endpoints (Exposed to OpenClaw)

### 1. Query Endpoint
**Path**: `POST /api/core/openclaw/query`
**Auth**: Bearer token from OpenClaw

**Intents**:
- `generate_signal`: Get trading signals for symbols
- `optimize_portfolio`: Bayesian optimization of parameters
- `analyze_sentiment`: NLP sentiment analysis
- `drilldown_layer`: Detailed layer analysis with correlations
- `rebalance_suggestion`: Portfolio rebalancing recommendations

### 2. Alert Endpoint (Incoming)
**Path**: `POST /api/core/openclaw/alert`
**Purpose**: Receive alerts from other OpenClaw agents

### 3. Report Endpoint
**Path**: `GET /api/core/openclaw/report?period=daily`
**Returns**: Markdown or JSON performance reports

## Portfolio File Monitoring

SystemOne accepts portfolio files via:

1. **Upload**: `POST /api/core/portfolio/upload` (multipart/form-data)
2. **OpenClaw Integration**: Stockman can push portfolio updates via query context

**Supported Formats**:
- JSON (schema defined in SystemOne spec)
- CSV (Symbol, Qty, AvgCost, Strategy columns)

## Notification Flow

```
SystemOne Signal Generated
        |
Priority Assessment (1-5)
        |
    +---+---+
    |       |
   NTFY    OpenClaw
(ping.     Agent
otchere)   Message
    |       |
  Mobile   Stockman
  Push     Inbox
```

## Data Sources (Free Tier Only)

SystemOne operates on zero-cost data:
- Yahoo Finance (prices)
- FRED (economic data)
- SEC EDGAR (fundamentals)
- Reddit API (sentiment)
- RSS feeds (news)

No API costs incurred by OpenClaw host.

## Installation via OpenClaw

```bash
# Stockman installs skill
openclaw skills install systemone-trading

# Configure
openclaw skills configure systemone-trading --config systemone-config.yaml

# Verify
openclaw skills test systemone-trading --agent Stockman
```
