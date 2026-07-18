from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
from app.services.certainty_dial import calculate_certainty_dial
from config.loader import get_strategy_config


@dataclass
class PriceZone:
    low: float
    high: float
    label: str


@dataclass
class PriceLevel:
    price: float
    label: str


@dataclass
class HorizonForecast:
    horizon: str
    horizon_label: str
    expected_move_pct: float
    probability_up: float
    certainty_cap: float
    key_level: float
    max_uncertainty: float


@dataclass
class SuggestedPlan:
    direction: str
    entry_zones: List[PriceZone]
    stop_loss: PriceLevel
    targets: List[PriceLevel]
    position_size_pct: float
    invalidation: str

@dataclass
class XGBoostForecast:
    immediate_direction: str
    immediate_confidence: float
    immediate_probability: float
    near_term_direction: str
    near_term_confidence: float
    near_term_probability: float
    far_term_direction: str
    far_term_confidence: float
    far_term_probability: float
    model: str


@dataclass
class SignalAnalysis:
    signal_id: int
    symbol: str
    protocol_type: str
    setup_type: Optional[str]
    certainty_dial: dict
    lens_scores: Dict[str, float]
    historical_stats: Optional[dict]
    event_risk: Optional[dict]
    horizons: List[dict]
    suggested_plan: dict
    xgboost_forecast: Optional[dict]
    computed_at: str


def _get_xgboost_forecast(symbol: str) -> Optional[dict]:
    try:
        from app.services.horizon_model import get_horizon_model
        model = get_horizon_model(symbol)
        pred = model.predict()
        if not pred or 'error' in pred:
            return None
        return {
            'immediate_direction': pred.get('immediate', {}).get('direction', 'UNKNOWN'),
            'immediate_confidence': pred.get('immediate', {}).get('confidence', 0.0),
            'immediate_probability': pred.get('immediate', {}).get('direction_probability', 0.0),
            'near_term_direction': pred.get('near_term', {}).get('direction', 'UNKNOWN'),
            'near_term_confidence': pred.get('near_term', {}).get('confidence', 0.0),
            'near_term_probability': pred.get('near_term', {}).get('direction_probability', 0.0),
            'far_term_direction': pred.get('far_term', {}).get('direction', 'UNKNOWN'),
            'far_term_confidence': pred.get('far_term', {}).get('confidence', 0.0),
            'far_term_probability': pred.get('far_term', {}).get('direction_probability', 0.0),
            'model': pred.get('immediate', {}).get('model', 'GradientBoostingClassifier'),
        }
    except Exception:
        return None

def build_signal_analysis(signal: dict, setup_type: Optional[str] = None, include_events: bool = False) -> SignalAnalysis:
    config = get_strategy_config()
    layer_scores = signal.get('layer_scores', {})
    symbol = signal.get('symbol', '')
    xgboost_data = _get_xgboost_forecast(symbol)

    direction = signal.get('protocol_type', 'LONG_BUY')

    # Classify setup_type if not provided
    if setup_type is None:
        from app.services.historical_lens import classify_setup_type
        setup_type = classify_setup_type(layer_scores, direction)

    # Get historical stats for the setup type
    from app.services.historical_lens import get_historical_stats
    hist_stats = get_historical_stats(setup_type)
    hist_stats_dict = {
        'setup_type': hist_stats.setup_type,
        'win_rate': hist_stats.win_rate,
        'avg_return_pct': hist_stats.avg_return_pct,
        'avg_loss_pct': hist_stats.avg_loss_pct,
        'max_drawdown_pct': hist_stats.max_drawdown_pct,
        'expectancy': hist_stats.expectancy,
        'sample_size': hist_stats.sample_size,
        'last_updated': hist_stats.last_updated,
    }

    # Compute event risk if requested
    event_risk_data = None
    event_lens_score = 50.0
    if include_events:
        from app.services.event_lens import calculate_event_risk
        event_risk = calculate_event_risk(signal.get('symbol', ''))
        event_lens_score = 100 - event_risk.combined_risk
        event_risk_data = {
            'earnings_risk': event_risk.earnings_risk,
            'fomc_risk': event_risk.fomc_risk,
            'macro_risk': event_risk.macro_risk,
            'combined_risk': event_risk.combined_risk,
            'score_breakdown': event_risk.score_breakdown,
            'active_events': [
                {
                    'event_type': e.event_type,
                    'date': e.date,
                    'name': e.name,
                    'impact': e.impact,
                    'days_until': e.days_until,
                    'description': e.description,
                }
                for e in event_risk.active_events
            ],
            'event_lens_score': event_lens_score,
        }

    certainty_dial = calculate_certainty_dial(layer_scores, setup_type=setup_type, event_risk_score=event_risk_data['combined_risk'] if event_risk_data else None)

    technical = (layer_scores.get('trend_structure', 50) + layer_scores.get('momentum_convergence', 50)) / 2
    regime = sum([
        layer_scores.get('institutional_flow', 50),
        layer_scores.get('sentiment_alignment', 50),
        layer_scores.get('multi_timeframe', 50),
        layer_scores.get('intermarket_filter', 50),
    ]) / 4
    lens_scores = {
        'technical': round(technical, 1),
        'regime': round(regime, 1),
        'historical': hist_stats.win_rate,
        'event': event_lens_score,
    }

    atr = signal.get('atr', 0)
    entry_price = signal.get('entry_price', 0)
    target_price = signal.get('take_profit', 0)
    stop_price = signal.get('stop_loss', 0)

    is_long = 'BUY' in direction

    horizons = []
    horizon_configs = [
        ('immediate', '1-5 days', config.horizon_caps.immediate, 1.0),
        ('near_term', '1-4 weeks', config.horizon_caps.near_term, 2.5),
        ('far_term', '3-6 months', config.horizon_caps.far_term, 5.0),
    ]

    for h_key, h_label, h_cap, atr_mult in horizon_configs:
        move_pct = (atr_mult * atr / entry_price * 100) if entry_price else 0
        prob_up = 60 if is_long else 40
        cap = min(certainty_dial.adjusted_score, h_cap)
        key_level = entry_price + (atr_mult * atr) if is_long else entry_price - (atr_mult * atr)

        horizons.append(HorizonForecast(
            horizon=h_key,
            horizon_label=h_label,
            expected_move_pct=round(move_pct, 2),
            probability_up=round(prob_up, 1),
            certainty_cap=round(cap, 1),
            key_level=round(key_level, 2),
            max_uncertainty=round(atr_mult * atr, 2),
        ))

    risk = entry_price - stop_price if is_long else stop_price - entry_price
    reward = target_price - entry_price if is_long else entry_price - target_price
    rr_ratio = (reward / risk) if risk > 0 else 0

    targets = []
    for i, mult in enumerate([1.0, 2.0, 3.0], 1):
        p = entry_price + (mult * risk) if is_long else entry_price - (mult * risk)
        targets.append(PriceLevel(price=round(p, 2), label=f'target_{i}r'))

    plan = SuggestedPlan(
        direction='long' if is_long else 'short',
        entry_zones=[PriceZone(low=round(entry_price - atr * 0.5, 2), high=round(entry_price + atr * 0.5, 2), label='entry')],
        stop_loss=PriceLevel(price=round(stop_price, 2), label='stop'),
        targets=targets,
        position_size_pct=round(min(config.risk_limits.kelly_fraction * rr_ratio * 100, config.risk_limits.max_position_pct), 2),
        invalidation=f'Close below {round(stop_price, 2)} on volume' if is_long else f'Close above {round(stop_price, 2)} on volume',
    )

    return SignalAnalysis(
        signal_id=signal['id'],
        symbol=signal['symbol'],
        protocol_type=signal['protocol_type'],
        setup_type=setup_type,
        certainty_dial={
            'raw_score': certainty_dial.raw_score,
            'adjusted_score': certainty_dial.adjusted_score,
            'dispersion': certainty_dial.dispersion,
            'bottleneck': certainty_dial.bottleneck,
            'confidence_interval': list(certainty_dial.confidence_interval),
        },
        lens_scores=lens_scores,
        historical_stats=hist_stats_dict,
        event_risk=event_risk_data,
        horizons=[{'horizon': h.horizon, 'horizon_label': h.horizon_label,
                   'expected_move_pct': h.expected_move_pct,
                   'probability_up': h.probability_up,
                   'certainty_cap': h.certainty_cap,
                   'key_level': h.key_level,
                   'max_uncertainty': h.max_uncertainty} for h in horizons],
        suggested_plan={
            'direction': plan.direction,
            'entry_zones': [{'low': z.low, 'high': z.high, 'label': z.label} for z in plan.entry_zones],
            'stop_loss': {'price': plan.stop_loss.price, 'label': plan.stop_loss.label},
            'targets': [{'price': t.price, 'label': t.label} for t in plan.targets],
            'position_size_pct': plan.position_size_pct,
            'invalidation': plan.invalidation,
        },
        xgboost_forecast=xgboost_data,
        computed_at=datetime.utcnow().isoformat(),
    )
