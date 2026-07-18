"""SystemOne Forecast Service — per-symbol predictive engine using real Yahoo Finance data."""

import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional


class ForecastService:
    _cache: dict[str, dict] = {}
    _cache_ttl = 300

    def _is_cache_valid(self, symbol: str) -> bool:
        if symbol not in self._cache:
            return False
        elapsed = (datetime.utcnow() - self._cache[symbol]["computed_at"]).total_seconds()
        return elapsed < self._cache_ttl

    async def get_ohlcv(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        if not self._is_cache_valid(symbol):
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            self._cache[symbol] = {"ohlcv": hist, "computed_at": datetime.utcnow()}
        return self._cache[symbol]["ohlcv"]

    async def get_current_price(self, symbol: str) -> dict:
        ohlcv = await self.get_ohlcv(symbol)
        price = float(ohlcv["Close"].iloc[-1])
        prev = float(ohlcv["Close"].iloc[-2]) if len(ohlcv) > 1 else price
        change = price - prev
        pct = round((change / prev) * 100, 2) if prev else 0
        return {"symbol": symbol, "price": round(price, 4), "change": round(change, 2),
                "change_pct": pct, "volume": int(ohlcv["Volume"].iloc[-1]),
                "timestamp": datetime.utcnow().isoformat()}

    def _ema(self, series: pd.Series, span: int) -> pd.Series:
        return series.ewm(span=span, adjust=False).mean()

    def _atr(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.ewm(alpha=1/period, adjust=False).mean()

    def _adx(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> float:
        plus_dm = high.diff().clip(lower=0)
        minus_dm = (-low.diff()).clip(lower=0)
        tr = self._atr(high, low, close, period)
        plus_di = 100 * (plus_dm.ewm(alpha=1/period).mean() / tr)
        minus_di = 100 * (minus_dm.ewm(alpha=1/period).mean() / tr)
        dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di))
        return round(float(dx.ewm(alpha=1/period).mean().iloc[-1]), 1)

    def _stochastic(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> float:
        k_val = float(close.iloc[-1])
        hh = float(high.tail(period).max())
        ll = float(low.tail(period).min())
        if hh == ll:
            return 50.0
        return round(((k_val - ll) / (hh - ll)) * 100, 1)

    def _rsi(self, close: pd.Series, period: int = 14) -> pd.Series:
        delta = close.diff()
        gain = delta.clip(lower=0).ewm(alpha=1/period, adjust=False).mean()
        loss = (-delta.clip(upper=0)).ewm(alpha=1/period, adjust=False).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    async def compute_indicators(self, symbol: str) -> dict:
        ohlcv = await self.get_ohlcv(symbol)
        close = ohlcv["Close"]; high = ohlcv["High"]; low = ohlcv["Low"]; volume = ohlcv["Volume"]
        ema8 = self._ema(close, 8); ema21 = self._ema(close, 21); ema55 = self._ema(close, 55)
        ema12 = self._ema(close, 12); ema26 = self._ema(close, 26)
        macd_line = ema12 - ema26; signal_line = self._ema(macd_line, 9); macd_hist = macd_line - signal_line
        bb_mid = close.rolling(20).mean(); bb_std = close.rolling(20).std()
        bb_upper = bb_mid + bb_std * 2; bb_lower = bb_mid - bb_std * 2
        atr = self._atr(high, low, close, 14); rsi = self._rsi(close)
        stoch = self._stochastic(high, low, close); adx = self._adx(high, low, close)
        cur = float(close.iloc[-1]); vol = float(volume.iloc[-1]); avg_vol = float(volume.tail(20).mean())
        v8, v21, v55 = float(ema8.iloc[-1]), float(ema21.iloc[-1]), float(ema55.iloc[-1])
        if v8 > v21 > v55: ema_align = "BULLISH_ALIGNED"
        elif v8 < v21 < v55: ema_align = "BEARISH_ALIGNED"
        elif v8 > v55: ema_align = "BULLISH_DIVERGING"
        elif v8 < v55: ema_align = "BEARISH_DIVERGING"
        else: ema_align = "NEUTRAL"
        return {"symbol": symbol, "price": round(cur, 4), "atr": round(float(atr.iloc[-1]), 3),
                "adx": adx, "rsi": round(float(rsi.iloc[-1]), 1), "stochastic": stoch,
                "ema_8": round(v8, 3), "ema_21": round(v21, 3), "ema_55": round(v55, 3),
                "ema_alignment": ema_align, "macd_line": round(float(macd_line.iloc[-1]), 3),
                "macd_signal": round(float(signal_line.iloc[-1]), 3),
                "macd_histogram": round(float(macd_hist.iloc[-1]), 3),
                "bb_upper": round(float(bb_upper.iloc[-1]), 3), "bb_mid": round(float(bb_mid.iloc[-1]), 3),
                "bb_lower": round(float(bb_lower.iloc[-1]), 3),
                "bb_position": round((cur - float(bb_lower.iloc[-1])) / (float(bb_upper.iloc[-1]) - float(bb_lower.iloc[-1])), 3),
                "volume_ratio": round(vol / avg_vol, 2) if avg_vol else 1.0,
                "avg_volume_20": round(avg_vol, 0), "timestamp": datetime.utcnow().isoformat()}

    async def get_entry_stop_target(self, symbol: str, protocol: str = "LONG_BUY") -> dict:
        ohlcv = await self.get_ohlcv(symbol)
        close = ohlcv["Close"]; high = ohlcv["High"]; low = ohlcv["Low"]
        cur = float(close.iloc[-1])
        atr = float(self._atr(high, low, close, 14).iloc[-1])
        low20 = float(low.tail(20).min()); high20 = float(high.tail(20).max())
        if protocol in ("LONG_BUY", "LONG_SELL"):
            entry, stop = cur, round(cur - atr * 1.5, 2)
            target = round(cur + atr * 2.0, 2)
            rr = round((target - entry) / (entry - stop), 2) if entry != stop else 0
        else:
            entry, stop = cur, round(cur + atr * 1.5, 2)
            target = round(cur - atr * 2.0, 2)
            rr = round((entry - target) / (stop - entry), 2) if stop != entry else 0
        return {"symbol": symbol, "protocol": protocol, "entry_price": round(entry, 4),
                "stop_loss": stop, "take_profit": target, "risk_reward_ratio": rr,
                "atr": round(atr, 3), "current_price": round(cur, 4),
                "range_20d_low": round(low20, 2), "range_20d_high": round(high20, 2),
                "distance_to_support": round(((cur - low20) / low20) * 100, 2),
                "distance_to_resistance": round(((high20 - cur) / high20) * 100, 2),
                "timestamp": datetime.utcnow().isoformat()}

    async def project_price_path(self, symbol: str, days_ahead: int = 30, n_scenarios: int = 100) -> dict:
        ohlcv = await self.get_ohlcv(symbol)
        close = ohlcv["Close"]; high = ohlcv["High"]; low = ohlcv["Low"]
        cur = float(close.iloc[-1])
        atr = float(self._atr(high, low, close, 14).iloc[-1])
        daily_vol = float(close.pct_change().tail(30).std())
        ema20 = float(self._ema(close, 20).iloc[-1])
        np.random.seed(42); paths = []
        for _ in range(n_scenarios):
            path = [cur]
            for _ in range(days_ahead):
                shock = np.random.normal(0, max(daily_vol, 0.005))
                mr = 0.05 * (ema20 - path[-1]) / ema20
                path.append(max(path[-1] * (1 + mr + shock), 1))
            paths.append(path)
        arr = np.array(paths); times = list(range(days_ahead + 1))
        dates = [(datetime.utcnow() + timedelta(days=d)).date().isoformat() for d in times]
        pct = ((float(np.percentile(arr, 50, axis=0)[-1]) - cur) / cur) * 100
        outlook = "STRONG_BULLISH" if pct > 10 else "MODERATE_BULLISH" if pct > 3 else "STRONG_BEARISH" if pct < -10 else "MODERATE_BEARISH" if pct < -3 else "NEUTRAL"
        return {"symbol": symbol, "current_price": round(cur, 2), "days_ahead": days_ahead,
                "n_scenarios": n_scenarios,
                "paths": {"p10": [round(float(v), 2) for v in np.percentile(arr, 10, axis=0)],
                          "p50": [round(float(v), 2) for v in np.percentile(arr, 50, axis=0)],
                          "p90": [round(float(v), 2) for v in np.percentile(arr, 90, axis=0)],
                          "dates": dates},
                "outlook": outlook, "timestamp": datetime.utcnow().isoformat()}

    async def calculate_layer_scores(self, symbol: str) -> dict:
        ind = await self.compute_indicators(symbol)
        ohlcv = await self.get_ohlcv(symbol); close = ohlcv["Close"]
        cur, rsi, macd_h, bb_pos = ind["price"], ind["rsi"], ind["macd_histogram"], ind["bb_position"]
        adx, atr, vol_ratio = ind["adx"], ind["atr"], ind["volume_ratio"]
        ema8, ema21, ema55, stoch = ind["ema_8"], ind["ema_21"], ind["ema_55"], ind["stochastic"]
        trend = min(100, max(0, int((adx/100*40) + (ema8>ema21>ema55 and cur>ema8 and adx>25)*30 + (adx>20)*15 + ((ema8>ema21 and cur>ema8) or (ema8<ema21 and cur<ema8))*15)))
        momentum = min(100, max(0, int((rsi/100*35) + (macd_h>0 and 40<rsi<70)*20 + (20<stoch<80)*20 + (rsi>50 and bb_pos>0.4)*25)))
        weekly_ema = self._ema(close, 20)
        mtf = min(100, max(0, int((ema8>ema21>ema55)*40 + (ema8>float(weekly_ema.iloc[-1]))*30 + (cur>ema55)*30)))
        vol_sc = min(100, int(min(vol_ratio, 3)/3*50 + (atr/cur*100<3)*30 + (vol_ratio>1.5)*20))
        sentiment = min(100, max(0, int((bb_pos>0.5 and 40<rsi<70)*40 + (0.2<bb_pos<0.8)*30 + (rsi>50)*30)))
        atr_pct = (atr / cur) * 100
        intermarket = min(100, max(0, int((atr_pct<2)*40 + (0.3<bb_pos<0.7)*30 + (adx>20)*30)))
        weights = {"trend_structure": 0.20, "momentum_convergence": 0.20, "multi_timeframe": 0.15,
                   "institutional_flow": 0.15, "sentiment_alignment": 0.15, "intermarket_filter": 0.15}
        scores = {"trend_structure": trend, "momentum_convergence": momentum, "multi_timeframe": mtf,
                  "institutional_flow": vol_sc, "sentiment_alignment": sentiment, "intermarket_filter": intermarket}
        confidence = min(100, max(0, int(sum(scores[k] * weights[k] for k in weights))))
        return {**scores, "derived_confidence": confidence, "timestamp": datetime.utcnow().isoformat()}

    async def get_ohlcv_chart(self, symbol: str, period: str = "3mo") -> dict:
        ohlcv = await self.get_ohlcv(symbol, period=period)
        return {"symbol": symbol, "period": period,
                "data": [{"date": str(idx.date()), "open": round(float(r.Open), 2),
                           "high": round(float(r.High), 2), "low": round(float(r.Low), 2),
                           "close": round(float(r.Close), 2), "volume": int(r.Volume)}
                         for idx, r in ohlcv.iterrows()],
                "timestamp": datetime.utcnow().isoformat()}

    async def get_indicator_history(self, symbol: str, indicator: str, days: int = 90) -> dict:
        import math
        ohlcv = await self.get_ohlcv(symbol); close = ohlcv["Close"]; result = []
        for i in range(min(days, len(close))):
            subset = close.iloc[:i+1]
            val = None
            if indicator == "rsi":
                if len(subset) >= 14:
                    delta = subset.diff(); gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
                    loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
                    rs = gain / loss
                    rs = rs.replace([float("inf"), -float("inf")], float("nan"))
                    raw = float((100 - (100 / (1 + rs))).iloc[-1])
                    if not math.isnan(raw): val = round(raw, 3)
            elif indicator == "ema8":
                if len(subset) >= 8:
                    raw = float(self._ema(subset, 8).iloc[-1])
                    if not math.isnan(raw): val = round(raw, 3)
            elif indicator == "ema21":
                if len(subset) >= 21:
                    raw = float(self._ema(subset, 21).iloc[-1])
                    if not math.isnan(raw): val = round(raw, 3)
            elif indicator == "ema55":
                if len(subset) >= 55:
                    raw = float(self._ema(subset, 55).iloc[-1])
                    if not math.isnan(raw): val = round(raw, 3)
            else:
                raw = float(subset.iloc[-1])
                if not math.isnan(raw): val = round(raw, 3)
            if val is not None:
                result.append({"date": str(close.index[i].date()), "value": val})
        return {"symbol": symbol, "indicator": indicator, "series": result,
                "timestamp": datetime.utcnow().isoformat()}

    async def get_forecast_summary(self, symbol: str) -> dict:
        ind = await self.compute_indicators(symbol)
        proj = await self.project_price_path(symbol, days_ahead=30)
        layers = await self.calculate_layer_scores(symbol)
        return {"symbol": symbol, "current_price": ind["price"], "change_pct": ind.get("change_pct", 0),
                "ema_alignment": ind["ema_alignment"], "rsi": ind["rsi"], "adx": ind["adx"],
                "atr_pct": round((ind["atr"] / ind["price"]) * 100, 3),
                "projection": {"30d_outlook": proj["outlook"], "30d_median_target": proj["paths"]["p50"][-1],
                               "30d_bear_case": proj["paths"]["p10"][-1], "30d_bull_case": proj["paths"]["p90"][-1]},
                "layers": layers, "timestamp": datetime.utcnow().isoformat()}
