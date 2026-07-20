from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import (auth_router, signals_router, portfolio_router,
                     strategy_router, strategy_engine_router, positions_router, sizing_router,
                     layers_router, health_router, symbols_router, forecast_router,
                     admin_router, history_router, alerts_router, analysis_router,
                     market_router, screener_router,
)

app = FastAPI(
    title="SystemOne Core Engine",
    description="Signals, intelligence, and portfolio management for SystemOne Trading Intelligence.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
# NOTE: no prefix="/api" here — the frontend reaches these via /api/core/*,
# which the proxy (Vite/Caddy) strips before forwarding. Mounting them with an
# extra /api prefix made every analysis/strategy/positions endpoint 404.
app.include_router(analysis_router)
app.include_router(strategy_router)
app.include_router(strategy_engine_router)
app.include_router(sizing_router)
app.include_router(positions_router)
app.include_router(signals_router)
app.include_router(portfolio_router)
app.include_router(layers_router)
app.include_router(symbols_router)
app.include_router(forecast_router)
app.include_router(market_router)
app.include_router(screener_router)
app.include_router(admin_router)
app.include_router(history_router, prefix="/history", tags=["history"])
app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])


@app.get("/")
async def root():
    return {"service": "SystemOne Core Engine", "version": "1.1.0", "status": "operational"}
