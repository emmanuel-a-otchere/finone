"""SystemOne Horizon Model — XGBoost with full regularization + distributed split finding."""
import os, pickle, numpy as np, pandas as pd, xgboost as xgb
from datetime import datetime
from pathlib import Path
from typing import Optional

MODEL_DIR = Path("/home/sysops/sysone/SystemOne/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "return_1d", "return_5d", "return_20d",
    "rsi_14", "macd_signal", "bb_position",
    "volume_ratio", "atr_regime", "adx_14",
]

HORIZONS = {
    "immediate": (1, 5,   "immediate"),
    "near_term": (5, 20,  "near_term"),
    "far_term":  (20, 60, "far_term"),
}

ROLLING_WINDOW = 300   # larger window — XGBoost handles it efficiently via hist
PREDICTION_TTL = 3600

# XGBoost hyper-parameters — tuned for low overfitting on small financial datasets
XGB_PARAMS = {
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "tree_method": "hist",       # histogram-based split finding (fast, distributed-ready)
    "max_depth": 4,              # shallow trees — regularize complexity
    "learning_rate": 0.05,       # lower LR → better generalization, more rounds
    "n_estimators": 300,         # compensated by lower LR
    "min_child_weight": 5,      # minimum sum of instance weight needed in child
    "gamma": 0.1,                # minimum loss reduction required to make a split (pre-pruning)
    "reg_alpha": 0.5,           # L1 regularization on leaf weights
    "reg_lambda": 2.0,          # L2 regularization on leaf weights (ridge)
    "colsample_bytree": 0.7,    # sample 70% of features per tree
    "colsample_bylevel": 0.6,   # sample 60% of features per level
    "subsample": 0.7,           # sample 70% of rows per tree (per boosting round)
    "random_state": 42,
    "n_jobs": -1,               # parallel training across all CPU cores
}


def _build_features(ohlcv):
    close = ohlcv["Close"]; high = ohlcv["High"]; low = ohlcv["Low"]; volume = ohlcv["Volume"]
    ret1 = close.pct_change(1); ret5 = close.pct_change(5); ret20 = close.pct_change(20)
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1/14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1/14, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi14 = 100 - (100 / (1 + rs))
    ema12 = close.ewm(span=12, adjust=False).mean(); ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26; signal = macd.ewm(span=9, adjust=False).mean()
    sma20 = close.ewm(span=20, adjust=False).mean(); std20 = close.ewm(span=20, adjust=False).std()
    bb_upper = sma20 + 2*std20; bb_lower = sma20 - 2*std20
    bb_pos = (close - bb_lower) / (bb_upper - bb_lower).replace(0, np.nan)
    vol20 = volume.rolling(20).mean(); vol252 = volume.expanding().mean()
    vol_ratio = (vol20 / vol252.replace(0, np.nan)).clip(upper=5)
    tr1 = high - low; tr2 = (high - close.shift()).abs(); tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1,tr2,tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/14, adjust=False).mean(); atr_regime = atr / sma20.replace(0, np.nan)
    plus_dm = high.diff().clip(lower=0); minus_dm = (-low.diff()).clip(lower=0)
    tr14 = tr.ewm(alpha=1/14, adjust=False).mean()
    plus_di = 100 * (plus_dm.ewm(alpha=1/14, adjust=False).mean() / tr14)
    minus_di = 100 * (minus_dm.ewm(alpha=1/14, adjust=False).mean() / tr14)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    adx14 = dx.ewm(alpha=1/14, adjust=False).mean()
    return pd.DataFrame({
        "return_1d": ret1, "return_5d": ret5, "return_20d": ret20,
        "rsi_14": rsi14, "macd_signal": macd - signal, "bb_position": bb_pos,
        "volume_ratio": vol_ratio, "atr_regime": atr_regime, "adx_14": adx14,
    }, index=close.index)[FEATURE_COLS]


def _build_target(close, horizon):
    min_h, max_h = horizon
    future_ret = close.pct_change(max_h).shift(-max_h)
    return (future_ret > 0).astype(int)


class HorizonModel:
    def __init__(self, symbol):
        self.symbol = symbol
        self.models = {}
        self._pred_cache = {}

    def _model_path(self, horizon_key):
        return MODEL_DIR / f"{self.symbol}_{horizon_key}.json"

    def _get_ohlcv(self, period="2y"):
        try:
            import yfinance as yf
            return yf.Ticker(self.symbol).history(period=period)
        except Exception:
            return None

    def _latest_features(self, period="2y"):
        ohlcv = self._get_ohlcv(period)
        if ohlcv is None or len(ohlcv) < ROLLING_WINDOW + 60:
            return None
        feats = _build_features(ohlcv).dropna()
        if feats is None or len(feats) < ROLLING_WINDOW:
            return None
        return feats

    def train(self, force=False):
        ohlcv = self._get_ohlcv("2y")
        if ohlcv is None:
            return {k: False for k in HORIZONS}
        feats = _build_features(ohlcv).dropna()
        if feats is None or len(feats) < ROLLING_WINDOW:
            return {k: False for k in HORIZONS}
        close_series = pd.Series(ohlcv["Close"].loc[feats.index], index=feats.index)
        results = {}
        for key, (min_h, max_h, label) in HORIZONS.items():
            path = self._model_path(key)
            if not force and path.exists():
                try:
                    self.models[key] = xgb.XGBClassifier()
                    self.models[key].load_model(path)
                    results[key] = True
                    continue
                except Exception:
                    pass
            target = _build_target(close_series, (min_h, max_h))
            aligned = feats.loc[target.index].iloc[:-max_h]
            target_aligned = target.loc[target.index[:-max_h]]
            if len(aligned) < ROLLING_WINDOW:
                results[key] = False
                continue
            X = aligned[FEATURE_COLS].values[-ROLLING_WINDOW:]
            y = target_aligned.values[-ROLLING_WINDOW:]
            params = XGB_PARAMS.copy()
            n_estimators = params.pop("n_estimators", 300)
            model = xgb.XGBClassifier(n_estimators=n_estimators, **params)
            model.fit(X, y)
            self.models[key] = model
            model.save_model(str(path))
            results[key] = True
        return results

    def load(self):
        all_loaded = True
        for key in HORIZONS:
            path = self._model_path(key)
            if path.exists():
                try:
                    model = xgb.XGBClassifier()
                    model.load_model(path)
                    self.models[key] = model
                except Exception:
                    all_loaded = False
            else:
                all_loaded = False
        return all_loaded

    def predict(self, horizon=None):
        now = datetime.utcnow()
        cache_key = horizon or "all"
        if cache_key in self._pred_cache:
            ts, cached = self._pred_cache[cache_key]
            if (now - ts).total_seconds() < PREDICTION_TTL:
                return cached
        if not self.models:
            self.load()
        feats = self._latest_features()
        if feats is None:
            return {"error": f"Could not fetch data for {self.symbol}"}
        latest = feats[FEATURE_COLS].iloc[-1:].values
        result = {}
        for key in ([horizon] if horizon else list(HORIZONS.keys())):
            if key not in self.models:
                continue
            model = self.models[key]
            _, max_h, label = HORIZONS[key]
            proba = model.predict_proba(latest)[0]
            direction = "LONG" if proba[1] > 0.5 else "SHORT"
            direction_prob = round(float(max(proba)), 4)
            confidence = round(float(proba[1] if direction == "LONG" else proba[0]), 4)
            score = round(confidence * 100, 1)
            # Extract feature importances for explainability
            importances = {
                col: float(model.feature_importances_[i])
                for i, col in enumerate(FEATURE_COLS)
            }
            result[key] = {
                "direction": direction,
                "direction_probability": direction_prob,
                "confidence": score,
                "horizon_label": label,
                "horizon_days": list(HORIZONS[key][:2]),
                "model": "XGBoost",
                "feature_importances": importances,
            }
        self._pred_cache[cache_key] = (now, result)
        return result


_model_cache = {}


def get_horizon_model(symbol):
    if symbol not in _model_cache:
        _model_cache[symbol] = HorizonModel(symbol)
        _model_cache[symbol].load()
    return _model_cache[symbol]
