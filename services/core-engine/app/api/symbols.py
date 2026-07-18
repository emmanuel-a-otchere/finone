import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.api.deps import get_current_user
from app.services.symbol_cache_service import (
    get_cached_symbol,
    refresh_symbol,
    fetch_live_info,
    FIELDS_STATIC, FIELDS_SEMI, FIELDS_DYNAMIC,
    TTL_STATIC, TTL_SEMI, TTL_DYNAMIC,
)

router = APIRouter(prefix="/symbols", tags=["Symbols"])


def _build_response(data: dict, from_cache: bool, age_seconds: float) -> dict:
    """Shape the API response, stripping internal fields."""
    resp = {k: v for k, v in data.items() if not k.startswith("_")}
    resp["_cache"] = {
        "from_cache": from_cache,
        "age_seconds": round(age_seconds, 1),
        "ttl_static": TTL_STATIC,
        "ttl_semi_static": TTL_SEMI,
        "ttl_dynamic": TTL_DYNAMIC,
    }
    return resp


@router.get("/{symbol}/info")
async def get_symbol_info(
    symbol: str,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user),
):
    """
    Returns cached SymbolInfo with TTL-aware freshness.
    If the cache is stale for dynamic fields (< 15 min), the response includes
    _cache.stale_dynamic=true and a background refresh is triggered.
    """
    upper = symbol.upper()

    # Try cache
    cached = get_cached_symbol(upper)

    if cached:
        age = cached.get("_age_seconds", 0)
        is_stale = cached.get("_is_stale", False)
        stale_fields = cached.get("_stale_fields", [])

        # If dynamic fields are stale, trigger background refresh and return stale data
        if is_stale:
            background_tasks.add_task(refresh_symbol, upper)

        return _build_response(cached, from_cache=True, age_seconds=age)

    # Cache miss — fetch live
    try:
        fresh = fetch_live_info(upper)
        # Store in cache (async is fine, don't block response)
        background_tasks.add_task(refresh_symbol, upper)
        return _build_response(fresh, from_cache=False, age_seconds=0)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch info for {upper}: {str(e)}",
        )


@router.post("/{symbol}/refresh")
async def refresh_symbol_endpoint(
    symbol: str,
    current_user: str = Depends(get_current_user),
):
    """Force-refresh a symbol's cache from Yahoo Finance."""
    upper = symbol.upper()
    try:
        fresh = refresh_symbol(upper)
        if fresh is None:
            raise HTTPException(status_code=502, detail=f"Could not reach Yahoo Finance for {upper}")
        return {"status": "refreshed", "symbol": upper, "data": fresh}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/cache/status")
async def cache_status(
    symbols: str | None = None,  # comma-separated list
    current_user: str = Depends(get_current_user),
):
    """
    Return cache status for all cached symbols, or just the ones requested.
    Useful for debugging TTL behaviour.
    """
    import psycopg2
    from datetime import datetime, timezone

    conn = psycopg2.connect(host="localhost", database="systemone", user="sysops", password="sysone123")
    cur = conn.cursor()

    if symbols:
        sym_list = [s.strip().upper() for s in symbols.split(",")]
        cur.execute("SELECT symbol, fetched_at FROM symbol_cache WHERE symbol = ANY(%s)", (sym_list,))
    else:
        cur.execute("SELECT symbol, fetched_at FROM symbol_cache")

    rows = cur.fetchall()
    conn.close()

    now = datetime.now(timezone.utc)
    result = []
    for sym, fetched_at in rows:
        age = (now - fetched_at).total_seconds()
        result.append({
            "symbol": sym,
            "age_seconds": round(age, 1),
            "is_stale": age > TTL_DYNAMIC,
            "dynamic_stale": age > TTL_DYNAMIC,
            "semi_stale": age > TTL_SEMI,
            "static_stale": age > TTL_STATIC,
        })

    return {"symbols": result}
# ---------------------------------------------------------------------------
# Symbol search — unauthenticated
# ---------------------------------------------------------------------------

POPULAR_SYMBOLS = [
    {"symbol": "AAPL",  "name": "Apple Inc.",               "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "MSFT",  "name": "Microsoft Corporation",    "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "NVDA",  "name": "NVIDIA Corporation",       "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "AMZN",  "name": "Amazon.com Inc.",          "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "META",  "name": "Meta Platforms Inc.",      "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "TSLA",  "name": "Tesla Inc.",               "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "AVGO",  "name": "Broadcom Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "JPM",   "name": "JPMorgan Chase & Co.",     "type": "Stock", "exchange": "NYSE"},
    {"symbol": "V",     "name": "Visa Inc.",                "type": "Stock", "exchange": "NYSE"},
    {"symbol": "UNH",   "name": "UnitedHealth Group",       "type": "Stock", "exchange": "NYSE"},
    {"symbol": "MA",    "name": "Mastercard Inc.",          "type": "Stock", "exchange": "NYSE"},
    {"symbol": "XOM",   "name": "Exxon Mobil Corp.",        "type": "Stock", "exchange": "NYSE"},
    {"symbol": "JNJ",   "name": "Johnson & Johnson",        "type": "Stock", "exchange": "NYSE"},
    {"symbol": "PG",    "name": "Procter & Gamble",         "type": "Stock", "exchange": "NYSE"},
    {"symbol": "HD",    "name": "Home Depot Inc.",          "type": "Stock", "exchange": "NYSE"},
    {"symbol": "CVX",   "name": "Chevron Corporation",       "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ABBV",  "name": "AbbVie Inc.",              "type": "Stock", "exchange": "NYSE"},
    {"symbol": "LLY",   "name": "Eli Lilly and Co.",        "type": "Stock", "exchange": "NYSE"},
    {"symbol": "PEP",   "name": "PepsiCo Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "KO",    "name": "Coca-Cola Company",        "type": "Stock", "exchange": "NYSE"},
    {"symbol": "COST",  "name": "Costco Wholesale",         "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "AMD",   "name": "Advanced Micro Devices",   "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "INTC",  "name": "Intel Corporation",        "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "NFLX",  "name": "Netflix Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "DIS",   "name": "Walt Disney Company",      "type": "Stock", "exchange": "NYSE"},
    {"symbol": "PYPL",  "name": "PayPal Holdings",          "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "ADBE",  "name": "Adobe Inc.",               "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "CRM",   "name": "Salesforce Inc.",          "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ORCL",  "name": "Oracle Corporation",       "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ACN",   "name": "Accenture plc",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "CSCO",  "name": "Cisco Systems",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "MCD",   "name": "McDonald's Corporation",   "type": "Stock", "exchange": "NYSE"},
    {"symbol": "QCOM",  "name": "Qualcomm Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "TXN",   "name": "Texas Instruments",        "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "LOW",   "name": "Lowe's Companies",          "type": "Stock", "exchange": "NYSE"},
    {"symbol": "NKE",   "name": "Nike Inc.",               "type": "Stock", "exchange": "NYSE"},
    {"symbol": "SPY",   "name": "SPDR S&P 500 ETF",        "type": "ETF",  "exchange": "NYSE"},
    {"symbol": "QQQ",   "name": "Invesco QQQ Trust",        "type": "ETF",  "exchange": "NASDAQ"},
    {"symbol": "IWM",   "name": "iShares Russell 2000 ETF", "type": "ETF",  "exchange": "NYSE"},
    {"symbol": "DIA",   "name": "SPDR Dow Jones ETF",       "type": "ETF",  "exchange": "NYSE"},
    {"symbol": "GME",   "name": "GameStop Corp.",           "type": "Stock", "exchange": "NYSE"},
    {"symbol": "AMC",   "name": "AMC Entertainment",         "type": "Stock", "exchange": "NYSE"},
    {"symbol": "PLTR",  "name": "Palantir Technologies",   "type": "Stock", "exchange": "NYSE"},
    {"symbol": "COIN",  "name": "Coinbase Global",           "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "RIVN",  "name": "Rivian Automotive",         "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "SOFI",  "name": "SoFi Technologies",         "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "SMCI",  "name": "Super Micro Computer",      "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "ARM",   "name": "Arm Holdings",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "MSTR",  "name": "MicroStrategy Inc.",        "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "HOOD",  "name": "Robinhood Markets",         "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "UBER",  "name": "Uber Technologies",         "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ABNB",  "name": "Airbnb Inc.",              "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "SQ",    "name": "Block Inc.",               "type": "Stock", "exchange": "NYSE"},
    {"symbol": "RBLX",  "name": "Roblox Corporation",       "type": "Stock", "exchange": "NYSE"},
    {"symbol": "SNAP",  "name": "Snap Inc.",                "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ZM",    "name": "Zoom Video Communications", "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "DOCU",  "name": "DocuSign Inc.",            "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "TWLO",  "name": "Twilio Inc.",              "type": "Stock", "exchange": "NYSE"},
    {"symbol": "PATH",  "name": "UiPath Inc.",              "type": "Stock", "exchange": "NYSE"},
    {"symbol": "VEEV",  "name": "Veeva Systems",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "DKNG",  "name": "DraftKings Inc.",           "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "PENN",  "name": "PENN Entertainment",       "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "MGNI",  "name": "Magnite Inc.",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "PINS",  "name": "Pinterest Inc.",           "type": "Stock", "exchange": "NYSE"},
    {"symbol": "SNOW",  "name": "Snowflake Inc.",           "type": "Stock", "exchange": "NYSE"},
    {"symbol": "DDOG",  "name": "Datadog Inc.",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "CRWD",  "name": "CrowdStrike Holdings",     "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "ZS",    "name": "Zscaler Inc.",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "NET",   "name": "Cloudflare Inc.",          "type": "Stock", "exchange": "NYSE"},
    {"symbol": "MDB",   "name": "MongoDB Inc.",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "OKTA",  "name": "Okta Inc.",               "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "U",    "name": "Unity Software",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "F",    "name": "Ford Motor Company",        "type": "Stock", "exchange": "NYSE"},
    {"symbol": "GM",   "name": "General Motors",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "RIVN",  "name": "Rivian Automotive",        "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "LCID",  "name": "Lucid Group",              "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "NIO",   "name": "NIO Inc.",                "type": "Stock", "exchange": "NYSE"},
    {"symbol": "BABA",  "name": "Alibaba Group",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "TME",   "name": "Tencent Music",            "type": "Stock", "exchange": "NYSE"},
    {"symbol": "JD",    "name": "JD.com Inc.",              "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "PDD",   "name": "PDD Holdings",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "NTES",  "name": "NetEase Inc.",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "BYD",   "name": "BYD Company",              "type": "Stock", "exchange": "NYSE"},
    {"symbol": "TSM",   "name": "TSMC",                     "type": "Stock", "exchange": "NYSE"},
    {"symbol": "ASML",  "name": "ASML Holding",             "type": "Stock", "exchange": "NASDAQ"},
    {"symbol": "SAP",   "name": "SAP SE",                   "type": "Stock", "exchange": "NYSE"},
    {"symbol": "SHOP",  "name": "Shopify Inc.",             "type": "Stock", "exchange": "NYSE"},
    {"symbol": "BTC",   "name": "Bitcoin",                   "type": "Crypto", "exchange": "Crypto"},
    {"symbol": "ETH",   "name": "Ethereum",                  "type": "Crypto", "exchange": "Crypto"},
]

# Build a fast lookup dict keyed by symbol
SYMBOL_MAP = {s["symbol"]: s for s in POPULAR_SYMBOLS}
_popular_set = set(SYMBOL_MAP.keys())


def _search_in_popular(query: str) -> list[dict]:
    """Case-insensitive prefix + contains match on symbol and name."""
    q = query.upper().strip()
    results = []
    for sym, info in SYMBOL_MAP.items():
        if sym.startswith(q) or q in info["name"].upper():
            results.append(info)
            if len(results) >= 8:
                break
    return results


def _validate_with_yfinance(symbol: str) -> dict | None:
    """Validate a single symbol against Yahoo Finance. Returns info or None."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        if not info or info.get("regularMarketPrice") is None:
            return None
        return {
            "symbol":   symbol.upper(),
            "name":     info.get("shortName") or info.get("longName", symbol),
            "type":     info.get("quoteType", "Stock"),
            "exchange": info.get("exchange", "Unknown"),
        }
    except Exception:
        return None


@router.get("/search")
async def search_symbols(q: str = ""):
    """
    Unauthenticated symbol search.

    ?q=        → return popular/recent symbols (up to 8)
    ?q={ticker} → return exact + partial matches from the popular list.
                  If the query doesn't match the popular list AND is 1-5 uppercase
                  chars, also validate live via Yahoo Finance.

    Response: [{symbol, name, type, exchange}]
    """
    q = q.strip()

    if not q:
        # Return top 8 most-traded symbols as defaults
        defaults = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "TSLA", "AMD", "META"]
        return [SYMBOL_MAP[s] for s in defaults if s in SYMBOL_MAP]

    # First: exact symbol match in our popular list (instant, no network)
    exact = SYMBOL_MAP.get(q.upper())
    results = []
    if exact:
        results.append(exact)

    # Second: fuzzy matches from popular list
    partial = _search_in_popular(q)
    for p in partial:
        if p["symbol"] not in [r["symbol"] for r in results]:
            results.append(p)
            if len(results) >= 8:
                break

    # Third: if query is 1-5 uppercase chars not yet saturated, validate live
    if len(results) < 8 and 1 <= len(q) <= 5 and q.isalpha():
        live = _validate_with_yfinance(q.upper())
        if live and live["symbol"] not in [r["symbol"] for r in results]:
            results.append(live)

    return results[:8]
