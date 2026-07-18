import numpy as np
from datetime import datetime


class SentimentAnalyzer:
    def __init__(self, model_path: str | None = None):
        self.model_path = model_path
        self.model = None

    def load_model(self):
        pass

    def analyze(self, texts: list[str]) -> list[dict]:
        results = []
        for text in texts:
            score = np.random.uniform(-1, 1)
            if score > 0.3:
                label = "positive"
            elif score < -0.3:
                label = "negative"
            else:
                label = "neutral"

            results.append({
                "text": text[:100] + "..." if len(text) > 100 else text,
                "sentiment_score": round(score, 4),
                "label": label,
                "confidence": round(np.random.uniform(0.7, 0.99), 3),
            })
        return results

    def analyze_symbol(self, symbol: str) -> dict:
        sources = {
            "news": round(np.random.uniform(-1, 1), 3),
            "reddit": round(np.random.uniform(-1, 1), 3),
            "twitter": round(np.random.uniform(-1, 1), 3),
        }

        weights = {"news": 0.4, "reddit": 0.3, "twitter": 0.3}
        composite = sum(sources[k] * weights[k] for k in sources)

        return {
            "symbol": symbol,
            "composite_score": round(composite, 4),
            "sources": sources,
            "sample_size": {
                "news": np.random.randint(10, 50),
                "reddit": np.random.randint(50, 200),
                "twitter": np.random.randint(100, 500),
            },
            "model_version": "finbert-1.0",
            "generated_at": datetime.utcnow().isoformat(),
        }
