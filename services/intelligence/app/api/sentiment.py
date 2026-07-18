from fastapi import APIRouter
from pydantic import BaseModel
from app.nlp.sentiment import SentimentAnalyzer

router = APIRouter(prefix="/sentiment", tags=["Sentiment"])


class SentimentRequest(BaseModel):
    texts: list[str]


class SymbolSentimentRequest(BaseModel):
    symbol: str


@router.post("")
async def analyze_sentiment(request: SentimentRequest):
    analyzer = SentimentAnalyzer()
    return {
        "results": analyzer.analyze(request.texts),
        "count": len(request.texts),
    }


@router.get("/{symbol}")
async def get_symbol_sentiment(symbol: str):
    analyzer = SentimentAnalyzer()
    return analyzer.analyze_symbol(symbol)
