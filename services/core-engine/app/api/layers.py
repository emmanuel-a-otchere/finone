from fastapi import APIRouter, Depends, HTTPException
from app.services.layers import LayerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/layers", tags=["Layers"])


@router.get("/{layer_name}/drilldown")
async def get_layer_drilldown(
    layer_name: str,
    symbol: str,
    include_correlations: bool = True,
    format_version: str = "2.0",
    current_user: str = Depends(get_current_user),
):
    service = LayerService()

    if layer_name not in service.LAYER_NAMES:
        raise HTTPException(
            status_code=404,
            detail=f"Layer '{layer_name}' not found. Available layers: {service.LAYER_NAMES}",
        )

    drilldown = await service.get_layer_drilldown(layer_name, symbol)

    if not include_correlations:
        drilldown.pop("cross_layer_impact", None)

    return drilldown


@router.get("/correlation-matrix")
async def get_correlation_matrix(
    current_user: str = Depends(get_current_user),
):
    service = LayerService()
    return service.get_correlation_matrix()


@router.get("")
async def list_layers(
    current_user: str = Depends(get_current_user),
):
    service = LayerService()
    return {
        "layers": [
            {
                "name": layer,
                "display_name": layer.replace("_", " ").title(),
                "description": _get_layer_description(layer),
            }
            for layer in service.LAYER_NAMES
        ]
    }


def _get_layer_description(layer_name: str) -> str:
    descriptions = {
        "trend_structure": "Analyzes overall market trend using Ichimoku Cloud, EMA ribbons, and ADX.",
        "momentum_convergence": "Measures momentum using RSI, MACD, and Stochastic indicators.",
        "multi_timeframe": "Confirms signals across multiple timeframes (daily, weekly, monthly).",
        "institutional_flow": "Tracks institutional activity through volume profile and options flow.",
        "sentiment_alignment": "Analyzes market sentiment using NLP on news and social media.",
        "intermarket_filter": "Evaluates sector rotation and cross-asset correlations.",
    }
    return descriptions.get(layer_name, "")
