from fastapi import APIRouter
from pydantic import BaseModel
from app.ml.lstm_model import LSTMForecaster

router = APIRouter(prefix="/forecast", tags=["Forecast"])


class ForecastRequest(BaseModel):
    symbol: str
    days: int = 30


@router.post("")
async def generate_forecast(request: ForecastRequest):
    forecaster = LSTMForecaster()
    return forecaster.predict(request.symbol, request.days)


@router.get("/{symbol}")
async def get_forecast(symbol: str, days: int = 30):
    forecaster = LSTMForecaster()
    return forecaster.predict(symbol, days)
