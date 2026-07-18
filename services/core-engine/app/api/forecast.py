"""SystemOne Forecast API — price projections, indicator histories, and Monte Carlo scenarios."""

from fastapi import APIRouter, Depends, Query
from app.services.forecast import ForecastService
from app.api.deps import get_current_user

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/{symbol}/summary")
async def get_forecast_summary(
    symbol: str,
    current_user: str = Depends(get_current_user),
):
    """Full forecast summary: indicators, layer scores, and 30-day Monte Carlo projection."""
    service = ForecastService()
    return await service.get_forecast_summary(symbol)


@router.get("/{symbol}/ohlcv")
async def get_ohlcv_chart(
    symbol: str,
    period: str = Query("3mo", description="Period: 1mo, 3mo, 6mo, 1y, 2y, 5y"),
    current_user: str = Depends(get_current_user),
):
    """OHLCV candle data for price chart."""
    service = ForecastService()
    return await service.get_ohlcv_chart(symbol, period=period)


@router.get("/{symbol}/indicators")
async def get_indicator_history(
    symbol: str,
    indicator: str = Query(..., description="rsi | ema8 | ema21 | ema55"),
    days: int = Query(90, ge=10, le=365),
    current_user: str = Depends(get_current_user),
):
    """Time-series of a specific indicator for trend analysis."""
    service = ForecastService()
    return await service.get_indicator_history(symbol, indicator, days=days)


@router.get("/{symbol}/projection")
async def get_price_projection(
    symbol: str,
    days_ahead: int = Query(30, ge=5, le=180),
    n_scenarios: int = Query(100, ge=10, le=500),
    current_user: str = Depends(get_current_user),
):
    """Monte Carlo price projection with percentile paths (p10/p50/p90)."""
    service = ForecastService()
    return await service.project_price_path(symbol, days_ahead=days_ahead, n_scenarios=n_scenarios)
