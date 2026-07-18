from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.signal import Signal, ProtocolType, SignalStatus
from app.services.layers import LayerService
from app.services.forecast import ForecastService


# Timeframe → TTL mapping
TIMEFRAME_TTL = {
    "day_trade": timedelta(hours=1),
    "swing":     timedelta(hours=24),
    "position":  timedelta(days=5),
}

class SignalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.layer_service = LayerService()
        self.forecast_service = ForecastService()

    async def generate_signals(
        self,
        symbols: list[str],
        protocols: list[str] | None = None,
        min_confidence: int = 0,
        timeframe: str = "swing",
    ) -> list[Signal]:
        if protocols is None:
            protocols = [p.value for p in ProtocolType]

        ttl = TIMEFRAME_TTL.get(timeframe, timedelta(hours=24))

        signals = []
        for symbol in symbols:
            layer_scores = await self.layer_service.calculate_layer_scores(symbol)
            confidence = self._calculate_confidence(layer_scores)

            # Expire any existing ACTIVE signals for this symbol/timeframe combo
            # so we always have exactly one signal per symbol (no duplicates)
            await self.db.execute(
                update(Signal)
                .where(
                    Signal.symbol == symbol,
                    Signal.timeframe == timeframe,
                    Signal.status == SignalStatus.ACTIVE,
                )
                .values(status=SignalStatus.EXPIRED)
            )

            if confidence >= min_confidence:
                protocol = self._determine_protocol(layer_scores)
                if protocol.value in protocols:
                    scenario = await self.forecast_service.get_entry_stop_target(symbol, protocol.value)
                    signal = Signal(
                        symbol=symbol,
                        protocol_type=protocol,
                        confidence_score=confidence,
                        entry_price=scenario["entry_price"],
                        stop_loss=scenario["stop_loss"],
                        take_profit=scenario["take_profit"],
                        expires_at=datetime.now(timezone.utc) + ttl,
                        layer_scores=layer_scores,
                        timeframe=timeframe,
                    )
                    self.db.add(signal)
                    signals.append(signal)

        if signals:
            await self.db.commit()
            # Enrich each signal with trading metadata and projections (stored, not on-demand)
            for signal in signals:
                s_dict = signal.to_dict()
                enriched = await self._enrich_signal_metadata(s_dict)
                # Persist enrichment into signal row
                signal.signal_metadata = {
                    k: v for k, v in enriched.items()
                    if k in ("atr", "risk_reward", "eta_hours", "regime",
                              "momentum_delta", "volume_surge")
                }
                signal.projection_dates = enriched.get("projection_dates", [])
                signal.projection_p10    = enriched.get("projection_p10", [])
                signal.projection_p50   = enriched.get("projection_p50", [])
                signal.projection_p90   = enriched.get("projection_p90", [])
                self.db.add(signal)
            await self.db.commit()

        return signals

    def _calculate_confidence(self, layer_scores: dict) -> int:
        weights = {
            "trend_structure": 0.20,
            "momentum_convergence": 0.20,
            "multi_timeframe": 0.15,
            "institutional_flow": 0.15,
            "sentiment_alignment": 0.15,
            "intermarket_filter": 0.15,
        }
        total = sum(
            layer_scores.get(layer, 0) * weight
            for layer, weight in weights.items()
        )
        return min(100, max(0, int(total)))

    def _determine_protocol(self, layer_scores: dict) -> ProtocolType:
        trend = layer_scores.get("trend_structure", 50)
        momentum = layer_scores.get("momentum_convergence", 50)

        if trend > 60 and momentum > 60:
            return ProtocolType.LONG_BUY
        elif trend < 40 and momentum < 40:
            return ProtocolType.SHORT_SELL
        elif trend > 60 and momentum < 40:
            return ProtocolType.LONG_SELL
        else:
            return ProtocolType.LONG_BUY

    def _calculate_stop_loss(self, price: float | None, protocol: ProtocolType) -> float | None:
        if price is None:
            return None
        if protocol in [ProtocolType.LONG_BUY, ProtocolType.LONG_SELL]:
            return round(price * 0.95, 2)
        return round(price * 1.05, 2)

    def _calculate_take_profit(self, price: float | None, protocol: ProtocolType) -> float | None:
        if price is None:
            return None
        if protocol in [ProtocolType.LONG_BUY, ProtocolType.LONG_SELL]:
            return round(price * 1.10, 2)
        return round(price * 0.90, 2)


    async def _enrich_signal_metadata(self, signal_dict: dict) -> dict:
        """Attach computed trading metadata to a signal dict using ForecastService async API."""
        import yfinance as yf
        import pandas as pd

        symbol = signal_dict.get("symbol")
        entry  = signal_dict.get("entry_price")
        stop   = signal_dict.get("stop_loss")
        target = signal_dict.get("take_profit")

        if not symbol:
            return {**signal_dict,
                    "atr": None, "risk_reward": None, "eta_hours": None,
                    "regime": "UNKNOWN", "momentum_delta": None,
                    "volume_surge": None,
                    "projection_dates": [], "projection_p10": [],
                    "projection_p50": [], "projection_p90": []}

        try:
            # Fetch 30 days of daily OHLCV directly via yfinance
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="30d", interval="1d")
            if df.empty or len(df) < 15:
                raise ValueError(f"Not enough data for {symbol}: {len(df)} rows")
        except Exception:
            return {**signal_dict,
                    "atr": None, "risk_reward": None, "eta_hours": None,
                    "regime": "UNKNOWN", "momentum_delta": None,
                    "volume_surge": None,
                    "projection_dates": [], "projection_p10": [],
                    "projection_p50": [], "projection_p90": []}

        closes = df["Close"].tolist()
        highs  = df["High"].tolist()
        lows   = df["Low"].tolist()
        vols   = df["Volume"].tolist()

        # ATR(14)
        trs = []
        for i in range(1, len(df)):
            hl = highs[i] - lows[i]
            hc = abs(highs[i] - closes[i-1])
            lc = abs(lows[i]  - closes[i-1])
            trs.append(max(hl, hc, lc))
        atr = float(sum(trs[-14:])) / 14 if len(trs) >= 14 else (float(sum(trs)) / len(trs) if trs else 0.0)

        # Risk/Reward
        risk_reward = None
        if entry and stop and target and entry != stop:
            risk   = abs(entry - stop)
            reward = abs(target - entry)
            risk_reward = round(reward / risk, 2) if risk > 0 else None

        # ETA (hours to target at 1 ATR/day)
        eta_hours = None
        if entry and target and atr and atr > 0 and entry != target:
            dist = abs(target - entry)
            eta_hours = round((dist / atr) * 24)

        # Regime — compute ADX and EMA from DataFrame
        n = len(df)
        high_s = df["High"]
        low_s  = df["Low"]
        close_s = df["Close"]

        # ADX(14)
        plus_dm = high_s.diff()
        minus_dm = -low_s.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        tr_raw = high_s - low_s
        adx_val = 50.0  # neutral default
        if tr_raw.sum() > 0:
            atr_series = tr_raw.rolling(14).mean()
            plus_di = (plus_dm.rolling(14).mean() / atr_series) * 100
            minus_di = (minus_dm.rolling(14).mean() / atr_series) * 100
            dx = (abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)) * 100
            adx_val = float(dx.dropna().iloc[-1]) if len(dx.dropna()) > 0 else 50.0

        # EMA(8) vs price for regime
        ema8 = close_s.ewm(span=8).mean().iloc[-1]
        cur_price = closes[-1]
        if adx_val > 25:
            regime = "TRENDING_BULLISH" if float(ema8) > cur_price * 0.995 else "TRENDING_BEARISH"
        elif adx_val < 20:
            regime = "RANGE_BOUND"
        else:
            regime = "VOLATILE"

        # Momentum delta
        ls = signal_dict.get("layer_scores") or {}
        momentum_delta = round((ls.get("momentum_convergence", 50)) - 50)

        # Volume surge
        vol_surge = None
        if len(vols) >= 20:
            avg_vol = sum(vols[-20:]) / 20
            today_vol = vols[-1]
            vol_surge = round(((today_vol - avg_vol) / avg_vol) * 100) if avg_vol > 0 else 0

        # 14-day Monte Carlo projection via ForecastService.project_price_path
        try:
            fs = ForecastService()
            proj_raw = await fs.project_price_path(symbol, days_ahead=14, n_scenarios=100)
            dates = proj_raw.get("paths", {}).get("dates", [])
            paths = proj_raw.get("paths", {})
            p10_list = paths.get("p10", [])
            p50_list = paths.get("p50", [])
            p90_list = paths.get("p90", [])
        except Exception:
            dates, p10_list, p50_list, p90_list = [], [], [], []

        return {
            **signal_dict,
            "atr":             round(atr, 4),
            "risk_reward":     risk_reward,
            "eta_hours":       eta_hours,
            "regime":          regime,
            "momentum_delta":  momentum_delta,
            "volume_surge":    vol_surge,
            "projection_dates": dates[-14:],
            "projection_p10":  [round(float(v), 2) for v in p10_list[-14:]],
            "projection_p50":  [round(float(v), 2) for v in p50_list[-14:]],
            "projection_p90":  [round(float(v), 2) for v in p90_list[-14:]],
        }


    async def get_signals(
        self,
        status: SignalStatus | None = None,
        symbol: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        query = select(Signal).order_by(Signal.created_at.desc()).limit(limit)
        if status:
            query = query.where(Signal.status == status)
        if symbol:
            query = query.where(Signal.symbol == symbol)
        result = await self.db.execute(query)
        signals = list(result.scalars().all())
        # Projections and metadata are stored at generate time, so to_dict has them
        return [s.to_dict() for s in signals]

    async def get_signal_by_id(self, signal_id: UUID) -> Signal | None:
        result = await self.db.execute(
            select(Signal).where(Signal.id == signal_id)
        )
        return result.scalar_one_or_none()
