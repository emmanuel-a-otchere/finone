from .forecast import router as forecast_router
from .sentiment import router as sentiment_router
from .optimize import router as optimize_router
from .health import router as health_router

__all__ = ["forecast_router", "sentiment_router", "optimize_router", "health_router"]
