# SystemOne API Field Reference v1.2.0

**Status**: Production
**Date**: 2026-05-10

---

## Signal Object

Returned by `GET /api/core/signals` and `GET /api/core/signals/{id}`.

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique signal identifier |
| `version` | string | Schema version (currently "1.1.0") |
| `protocol_type` | enum | LONG_BUY, LONG_SELL, SHORT_SELL, SHORT_BUY |
| `symbol` | string | Ticker symbol (e.g. "AAPL") |
| `confidence_score` | integer\|null | 0–100, AI conviction |
| `entry_price` | decimal\|null | Proposed entry price (USD) |
| `stop_loss` | decimal\|null | Stop loss price (USD), Entry − 1.5× ATR |
| `take_profit` | decimal\|null | Target price (USD), Entry + 2.0× ATR |
| `status` | enum | PENDING, ACTIVE, EXPIRED, CANCELLED |
| `created_at` | ISO8601\|null | Signal generation timestamp |
| `expires_at` | ISO8601\|null | Signal expiration timestamp |
| `layer_scores` | object | 6-layer ensemble scores (see below) |
| `timeframe` | string\|null | Analysis timeframe (e.g. "daily") |

### Enriched Fields (v1.2.0)

| Field | Type | Description |
|-------|------|-------------|
| `atr` | decimal\|null | 14-day Average True Range (volatility context) |
| `risk_reward` | decimal\|null | Reward-to-risk ratio: \|target − entry\| / \|entry − stop\| |
| `eta_hours` | integer\|null | Estimated hours to reach target at 1 ATR/day |
| `regime` | enum | TRENDING_BULLISH, TRENDING_BEARISH, RANGE_BOUND, VOLATILE, UNKNOWN |
| `momentum_delta` | integer\|null | momentum_convergence layer score − 50 |
| `volume_surge` | integer\|null | Today's volume vs 20-day average (%, can be negative) |
| `projection_dates` | string[] | ISO date strings for Monte Carlo projection (14 days) |
| `projection_p10` | decimal[] | Bear-case 10th-percentile price path (14 points) |
| `projection_p50` | decimal[] | Base-case 50th-percentile price path (14 points) |
| `projection_p90` | decimal[] | Bull-case 90th-percentile price path (14 points) |

### Layer Scores Object

```json
{
  "trend_structure": 0-100,
  "momentum_convergence": 0-100,
  "multi_timeframe": 0-100,
  "institutional_flow": 0-100,
  "sentiment_alignment": 0-100,
  "intermarket_filter": 0-100
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| PENDING | Generated but not yet activated |
| ACTIVE | Live signal, recommended for trading |
| EXPIRED | No longer valid (replaced by newer signal or time-elapsed) |
| CANCELLED | Manually cancelled |

---

## Symbol Info Object

Returned by `GET /api/core/symbols/{symbol}/info`.

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker symbol |
| `name` | string | Company/security name |
| `type` | string | Security type |
| `exchange` | string | Primary exchange |
| `currency` | string | Trading currency |
| `current_price` | decimal | Last trade price |
| `market_cap` | integer | Market capitalization |
| `pe_ratio` | decimal\|null | Price-to-earnings ratio |
| `dividend_yield` | decimal\|null | Annual dividend yield % |
| `week_52_high` | decimal | 52-week high price |
| `week_52_low` | decimal | 52-week low price |
| `analyst_rating` | string | Analyst consensus (e.g. "Buy") |
| `revenue_growth` | decimal | Revenue growth % |
| `earnings_growth` | decimal | Earnings growth % |
| `next_earnings_date` | string\|null | ISO date of next earnings |
| `timestamp` | string | Data fetch timestamp |

---

## Price Projection Object

Returned by `GET /api/intel/forecast/{symbol}/projection` or embedded in Signal.

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Ticker |
| `current_price` | decimal | Price at projection start |
| `days_ahead` | integer | Number of forecast days |
| `n_scenarios` | integer | Number of Monte Carlo paths |
| `outlook` | enum | STRONG_BULLISH / MODERATE_BULLISH / NEUTRAL / MODERATE_BEARISH / STRONG_BEARISH |
| `paths.p10` | decimal[] | 10th percentile prices per day |
| `paths.p50` | decimal[] | 50th percentile prices per day |
| `paths.p90` | decimal[] | 90th percentile prices per day |
| `paths.dates` | string[] | ISO dates for each projection step |
| `timestamp` | string | Computation timestamp |

---

## Layer Scores Weights

Used in `calculate_layer_scores()` for final confidence computation:

| Layer | Weight | Key Indicators |
|-------|--------|----------------|
| trend_structure | 20% | ADX, EMA alignment |
| momentum_convergence | 20% | RSI, MACD histogram, Stochastic |
| multi_timeframe | 15% | Daily/weekly EMA cross |
| institutional_flow | 15% | Volume ratio, ATR% |
| sentiment_alignment | 15% | Bollinger position, RSI zone |
| intermarket_filter | 15% | ATR regime, ADX regime |

Final `confidence_score` = weighted sum of layer scores.
