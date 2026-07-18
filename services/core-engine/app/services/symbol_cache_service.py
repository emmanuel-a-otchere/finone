import psycopg2
from psycopg2.extras import RealDictCursor
import yfinance as yf
import time
from datetime import datetime, timezone

# TTL constants (seconds)
TTL_STATIC = 86400      # 24 hours  — sector, market cap, company name, industry
TTL_SEMI = 14400       # 4 hours   — analyst recommendation, target price, earnings date
TTL_DYNAMIC = 900      # 15 minutes — current price, 52w range, revenue/earnings growth

FIELDS_STATIC = {'name', 'description', 'sector', 'industry', 'exchange'}
FIELDS_SEMI    = {'next_earnings_date', 'recommendation', 'target_price', 'pe_ratio', 'dividend_yield'}
FIELDS_DYNAMIC = {'current_price', 'fifty_two_week_high', 'fifty_two_week_low',
                  'fifty_two_week_range_pct', 'revenue_growth', 'earnings_growth', 'market_cap'}

conn = psycopg2.connect(host="localhost", database="systemone", user="sysops", password="sysone123")
cur = conn.cursor()

# Create table
cur.execute("""
    CREATE TABLE IF NOT EXISTS symbol_cache (
        symbol        VARCHAR(20) PRIMARY KEY,
        data          JSONB    NOT NULL,
        fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        static_ttl    INTEGER     NOT NULL DEFAULT 86400,
        semi_static_ttl INTEGER   NOT NULL DEFAULT 14400,
        dynamic_ttl   INTEGER     NOT NULL DEFAULT 900
    )
""")
conn.commit()
print("Table created / verified")

def fetch_live_info(symbol: str) -> dict:
    """Fetch fresh data from Yahoo Finance."""
    ticker = yf.Ticker(symbol.upper())

    # Fast path: info dict (has most fields)
    info = ticker.info or {}

    def fmt(v):
        if v is None: return None
        try: return round(float(v), 2)
        except: return v

    def pct(v):
        if v is None: return None
        try: return f"{float(v) * 100:.2f}%"
        except: return None

    price    = info.get("currentPrice") or info.get("regularMarketPrice")
    high52   = info.get("fiftyTwoWeekHigh")
    low52    = info.get("fiftyTwoWeekLow")
    range_pct = round((float(price) - float(low52)) / (float(high52) - float(low52)) * 100, 1) \
                 if price and high52 and low52 else None

    # Earnings date
    earnings_dates = ticker.calendar or {}
    next_earnings = earnings_dates.get("Earnings Date") or earnings_dates.get("earnings_date")
    if isinstance(next_earnings, list) and len(next_earnings) > 0:
        next_earnings = str(next_earnings[0])

    return {
        "symbol":                  symbol.upper(),
        "name":                    info.get("shortName") or info.get("longName") or symbol.upper(),
        "description":             (info.get("longBusinessSummary") or "")[:400] or None,
        "sector":                  info.get("sector"),
        "industry":                info.get("industry"),
        "market_cap":              fmt(info.get("marketCap")),
        "current_price":           fmt(price),
        "pe_ratio":                fmt(info.get("trailingPE") or info.get("forwardPE")),
        "dividend_yield":          pct(info.get("dividendYield")),
        "fifty_two_week_high":     fmt(high52),
        "fifty_two_week_low":      fmt(low52),
        "fifty_two_week_range_pct": range_pct,
        "next_earnings_date":      str(next_earnings) if next_earnings else None,
        "revenue_growth":          pct(info.get("revenueGrowth")),
        "earnings_growth":         pct(info.get("earningsQuarterlyGrowth")),
        "recommendation":          info.get("recommendationKey"),
        "target_price":            fmt(info.get("targetMeanPrice")),
        "exchange":                info.get("exchange"),
    }

def merge_with_ttls(fresh: dict) -> dict:
    """Add TTL metadata to each top-level field (not needed in data itself,
    TTL applies to field groups at read time."""
    return fresh

def upsert_symbol(symbol: str, data: dict) -> bool:
    """Insert or update cached symbol data. Returns True if inserted/updated."""
    try:
        cur.execute("""
            INSERT INTO symbol_cache (symbol, data, fetched_at, static_ttl, semi_static_ttl, dynamic_ttl)
            VALUES (%s, %s, NOW(), %s, %s, %s)
            ON CONFLICT (symbol) DO UPDATE
                SET data = EXCLUDED.data,
                    fetched_at = EXCLUDED.fetched_at
            WHERE symbol_cache.fetched_at < NOW() - (interval '1 second' * CASE
                WHEN symbol_cache.symbol = EXCLUDED.symbol THEN 0  -- always update; TTL check below
                ELSE 0
            END)
        """, (symbol, psycopg2.extras.Json(data), TTL_STATIC, TTL_SEMI, TTL_DYNAMIC))
        conn.commit()
        return True
    except Exception as e:
        print(f"Upsert error for {symbol}: {e}")
        conn.rollback()
        return False

def get_cached_symbol(symbol: str) -> dict | None:
    """Return cached data if fresh enough, else None.
    TTL is field-group-aware: dynamic fields expire at 15min, semi at 4h, static at 24h."""
    cur.execute("""
        SELECT data, fetched_at, static_ttl, semi_static_ttl, dynamic_ttl
        FROM symbol_cache WHERE symbol = %s
    """, (symbol,))
    row = cur.fetchone()
    if not row:
        return None

    data, fetched_at, static_ttl, semi_static_ttl, dynamic_ttl = row
    age = (datetime.now(timezone.utc) - fetched_at).total_seconds()

    # For each field group: if expired, we return partial data and flag for refresh
    result = dict(data)

    for f in FIELDS_STATIC:
        if f in result and age > static_ttl:
            result.setdefault("_stale_fields", []).append(f)

    for f in FIELDS_SEMI:
        if f in result and age > semi_static_ttl:
            result.setdefault("_stale_fields", []).append(f)

    for f in FIELDS_DYNAMIC:
        if f in result and age > dynamic_ttl:
            result.setdefault("_stale_fields", []).append(f)

    result["_age_seconds"] = age
    result["_is_stale"] = age > TTL_DYNAMIC  # any dynamic field stale → whole record stale
    return result

def refresh_symbol(symbol: str) -> dict | None:
    """Force-fetch from Yahoo Finance and update cache. Returns the fresh data."""
    print(f"Refreshing {symbol}...")
    try:
        fresh = fetch_live_info(symbol)
        upsert_symbol(symbol, fresh)
        return fresh
    except Exception as e:
        print(f"Refresh failed for {symbol}: {e}")
        return None

def refresh_stale_symbols():
    """Background job: find and refresh stale symbols."""
    cur.execute("SELECT symbol FROM symbol_cache")
    stale = [r[0] for r in cur.fetchall()]
    for sym in stale:
        cached = get_cached_symbol(sym)
        if cached and cached.get("_is_stale"):
            refresh_symbol(sym)
            time.sleep(0.5)  # be nice to Yahoo Finance

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 symbol_cache_service.py <symbol>")
        sys.exit(1)

    symbol = sys.argv[1].upper()

    # Try cache first
    cached = get_cached_symbol(symbol)
    if cached and not cached.get("_is_stale"):
        print(f"CACHE HIT ({cached['_age_seconds']:.0f}s old): {symbol}")
        for k, v in cached.items():
            if not k.startswith("_"):
                print(f"  {k}: {v}")
    else:
        print(f"CACHE MISS or STALE: {symbol}")
        fresh = refresh_symbol(symbol)
        if fresh:
            print("Fresh data:")
            for k, v in fresh.items():
                print(f"  {k}: {v}")
        else:
            print("ERROR: Could not fetch data")
