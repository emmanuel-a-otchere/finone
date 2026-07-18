import numpy as np
from datetime import datetime, timedelta
from app.services.forecast import ForecastService


class LayerService:
    LAYER_NAMES = [
        "trend_structure",
        "momentum_convergence",
        "multi_timeframe",
        "institutional_flow",
        "sentiment_alignment",
        "intermarket_filter",
    ]

    def __init__(self):
        self.forecast_service = ForecastService()



    async def calculate_layer_scores(self, symbol: str) -> dict:
        return await self.forecast_service.calculate_layer_scores(symbol)

    async def _calculate_trend(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def _calculate_momentum(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def _calculate_mtf(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def _calculate_institutional(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def _calculate_sentiment(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def _calculate_intermarket(self, symbol: str) -> int:
        return np.random.randint(40, 80)

    async def get_current_price(self, symbol: str) -> dict:
        return {
            "symbol": symbol,
            "price": 150.00 + np.random.uniform(-10, 10),
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_layer_drilldown(self, layer_name: str, symbol: str) -> dict:
        if layer_name not in self.LAYER_NAMES:
            return {"error": f"Unknown layer: {layer_name}"}

        indicators = self._get_layer_indicators(layer_name)
        datapoints = []

        for indicator in indicators:
            datapoints.append({
                "indicator": indicator["id"],
                "display_name": indicator["name"],
                "value_current": self._format_indicator_value(indicator),
                "value_raw": {
                    "value": np.random.uniform(0, 100),
                    "normalized": np.random.uniform(0, 1),
                },
                "historical_series": self._generate_historical_data(30),
            })

        return {
            "layer_name": layer_name,
            "symbol": symbol,
            "schema_version": "1.1.0",
            "datapoints": datapoints,
            "cross_layer_impact": self._calculate_cross_layer_impact(layer_name),
        }

    def _get_layer_indicators(self, layer_name: str) -> list[dict]:
        indicators_map = {
            "trend_structure": [
                {"id": "ichimoku_cloud", "name": "Ichimoku Cloud"},
                {"id": "ema_ribbon", "name": "EMA Ribbon (8/21/55)"},
                {"id": "adx", "name": "ADX Trend Strength"},
            ],
            "momentum_convergence": [
                {"id": "rsi", "name": "RSI (14)"},
                {"id": "macd", "name": "MACD Histogram"},
                {"id": "stochastic", "name": "Stochastic %K/%D"},
            ],
            "multi_timeframe": [
                {"id": "mtf_trend", "name": "MTF Trend Alignment"},
                {"id": "mtf_momentum", "name": "MTF Momentum"},
                {"id": "mtf_support", "name": "MTF Support/Resistance"},
            ],
            "institutional_flow": [
                {"id": "volume_profile", "name": "Volume Profile"},
                {"id": "dark_pool", "name": "Dark Pool Indicator"},
                {"id": "options_flow", "name": "Options Flow"},
            ],
            "sentiment_alignment": [
                {"id": "finbert", "name": "FinBERT Score"},
                {"id": "social_sentiment", "name": "Social Sentiment"},
                {"id": "news_sentiment", "name": "News Sentiment"},
            ],
            "intermarket_filter": [
                {"id": "sector_rotation", "name": "Sector Rotation"},
                {"id": "correlation", "name": "Asset Correlation"},
                {"id": "macro_regime", "name": "Macro Regime"},
            ],
        }
        return indicators_map.get(layer_name, [])

    def _format_indicator_value(self, indicator: dict) -> str:
        value = np.random.uniform(0, 100)
        if value > 70:
            return f"Bullish ({value:.1f})"
        elif value < 30:
            return f"Bearish ({value:.1f})"
        return f"Neutral ({value:.1f})"

    def _generate_historical_data(self, days: int) -> list[dict]:
        data = []
        base = datetime.utcnow() - timedelta(days=days)
        for i in range(days):
            data.append({
                "ts": (base + timedelta(days=i)).isoformat(),
                "value": np.random.uniform(30, 70),
                "signal_contribution": np.random.uniform(-1, 1),
            })
        return data

    def _calculate_cross_layer_impact(self, layer_name: str) -> list[dict]:
        impacts = []
        for other_layer in self.LAYER_NAMES:
            if other_layer != layer_name:
                impacts.append({
                    "target_layer": other_layer,
                    "correlation_coefficient": round(np.random.uniform(-0.5, 0.8), 3),
                    "influence_score": round(np.random.uniform(0, 1), 3),
                    "insight_text": f"{layer_name.replace('_', ' ').title()} influences {other_layer.replace('_', ' ')}",
                })
        return impacts

    def get_correlation_matrix(self) -> dict:
        n = len(self.LAYER_NAMES)
        matrix = np.random.uniform(-0.3, 0.8, (n, n))
        np.fill_diagonal(matrix, 1.0)
        matrix = (matrix + matrix.T) / 2

        return {
            "matrix": matrix.tolist(),
            "labels": self.LAYER_NAMES,
            "timestamp": datetime.utcnow().isoformat(),
        }
