from dataclasses import dataclass
from typing import Dict, Tuple, Optional
from config.loader import get_strategy_config


@dataclass
class LensScore:
    name: str
    score: float  # 0-100
    weight: float  # 0-1


@dataclass
class CertaintyDial:
    raw_score: float
    adjusted_score: float
    dispersion: float
    bottleneck: str  # lens name with lowest score
    confidence_interval: Tuple[float, float]  # (p10, p90) as percentages


def calculate_certainty_dial(layer_scores: Dict[str, float], setup_type: Optional[str] = None, event_risk_score: Optional[float] = None) -> CertaintyDial:
    """
    Maps 6 existing layer scores to 4 lens categories:
      technical = avg(trend_structure, momentum_convergence)
      regime = avg(institutional_flow, sentiment_alignment, multi_timeframe, intermarket_filter)
      historical = computed from signal_outcomes table via HistoricalLens (or 50 if no setup_type)
      event = from EventLens risk score (or 50 if not provided)

    Computes weighted composite, applies conflict penalty, applies horizon caps.
    """
    config = get_strategy_config()

    # Map layers to lens categories
    technical = (layer_scores.get('trend_structure', 50) + layer_scores.get('momentum_convergence', 50)) / 2
    regime = sum([
        layer_scores.get('institutional_flow', 50),
        layer_scores.get('sentiment_alignment', 50),
        layer_scores.get('multi_timeframe', 50),
        layer_scores.get('intermarket_filter', 50),
    ]) / 4

    # Historical lens: use HistoricalLens if setup_type is provided
    if setup_type is not None:
        from app.services.historical_lens import compute_setup_win_rate
        historical = compute_setup_win_rate(setup_type)
    else:
        historical = 50.0

    # Event lens: use EventLens risk score if provided, else fallback to 50.0
    # Mapping: event_risk_score 0 (no risk) -> event lens score 100 (safe)
    #          event_risk_score 100 (max risk) -> event lens score 0 (dangerous)
    if event_risk_score is not None:
        event = 100 - event_risk_score
    else:
        event = 50.0

    lenses = {
        'technical': LensScore('technical', technical, config.weights.technical),
        'regime': LensScore('regime', regime, config.weights.regime),
        'historical': LensScore('historical', historical, config.weights.historical),
        'event': LensScore('event', event, config.weights.event),
    }

    # Weighted score
    raw_score = sum(l.score * l.weight for l in lenses.values())

    # Dispersion (conflict check)
    scores = [l.score for l in lenses.values()]
    dispersion = max(scores) - min(scores)

    # Conflict penalty
    if dispersion > config.conflict_penalty.threshold_dispersion:
        raw_score *= config.conflict_penalty.penalty_multiplier

    # Bottleneck = lowest scoring lens
    bottleneck = min(lenses, key=lambda k: lenses[k].score)

    # Horizon caps (near_term as the "overall" adjusted score)
    horizon_cap = config.horizon_caps.near_term
    adjusted = min(raw_score, horizon_cap)

    # Confidence interval: spread based on dispersion
    # High dispersion = wider CI
    spread = dispersion * 0.5
    p10 = max(0, adjusted - spread)
    p90 = min(100, adjusted + spread)

    return CertaintyDial(
        raw_score=round(raw_score, 1),
        adjusted_score=round(adjusted, 1),
        dispersion=round(dispersion, 1),
        bottleneck=bottleneck,
        confidence_interval=(round(p10, 1), round(p90, 1))
    )
