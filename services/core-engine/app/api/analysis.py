from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import get_db
from app.api.deps import get_current_user
from app.services.signal_analysis import build_signal_analysis
from app.services.signals import SignalService
from app.services.event_lens import calculate_event_risk
from app.services.recalibrator import recalibrate_active_signals


router = APIRouter(prefix="/analysis", tags=["analysis"])



@router.get("/{signal_id}/xgboost")
async def get_signal_xgboost_forecast(
    signal_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get GradientBoosting horizon forecast for a signal's symbol."""
    service = SignalService(db)
    signal = await service.get_signal_by_id(signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    symbol = signal.to_dict().get('symbol', '')
    try:
        from app.services.horizon_model import get_horizon_model
        model = get_horizon_model(symbol)
        pred = model.predict()
        if not pred or 'error' in pred:
            return {'symbol': symbol, 'forecast': None, 'note': 'Model not yet trained for this symbol'}
        return {'symbol': symbol, 'forecast': pred}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"XGBoost model error: {str(e)}")


@router.post("/xgboost/batch")
async def batch_xgboost_forecast(
    body: dict,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get horizon forecasts for multiple symbols.
    Body: { "symbols": ["AAPL", "TSLA"] }
    """
    symbols = body.get('symbols', [])
    results = {}
    for sym in symbols:
        try:
            from app.services.horizon_model import get_horizon_model
            model = get_horizon_model(sym)
            pred = model.predict()
            results[sym] = pred if pred and 'error' not in pred else {'error': 'Model not trained'}
        except Exception as e:
            results[sym] = {'error': str(e)}
    return {'forecasts': results}

@router.get("/config/strategy")
def get_strategy_config_endpoint(user: dict = Depends(get_current_user)):
    """Get current strategy configuration."""
    from config.loader import get_strategy_config
    config = get_strategy_config()
    return {
        'weights': {'technical': config.weights.technical, 'regime': config.weights.regime,
                    'historical': config.weights.historical, 'event': config.weights.event},
        'horizon_caps': {'immediate': config.horizon_caps.immediate,
                         'near_term': config.horizon_caps.near_term,
                         'far_term': config.horizon_caps.far_term},
        'risk_limits': {'max_position_pct': config.risk_limits.max_position_pct,
                        'kelly_fraction': config.risk_limits.kelly_fraction},
        'conflict_penalty': {'threshold_dispersion': config.conflict_penalty.threshold_dispersion,
                             'penalty_multiplier': config.conflict_penalty.penalty_multiplier},
    }



@router.post("/outcomes")
def record_signal_outcome(
    body: dict,
    user: dict = Depends(get_current_user)
):
    """Record a trading outcome for a signal."""
    from app.services.historical_lens import record_outcome

    signal_id = body.get('signal_id')
    setup_type = body.get('setup_type')
    direction = body.get('direction')
    entry_price = body.get('entry_price')
    exit_price = body.get('exit_price')
    pnl_pct = body.get('pnl_pct')
    notes = body.get('notes', '')

    if not all([signal_id, setup_type, direction, entry_price]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    outcome_id = record_outcome(signal_id, setup_type, direction, entry_price, exit_price, pnl_pct, notes=notes)
    return {'id': outcome_id, 'status': 'recorded'}


@router.get("/outcomes/stats/{setup_type}")
def get_outcome_stats(setup_type: str, user: dict = Depends(get_current_user)):
    """Get historical stats for a setup type."""
    from app.services.historical_lens import get_historical_stats

    stats = get_historical_stats(setup_type)
    return {
        'setup_type': stats.setup_type,
        'win_rate': stats.win_rate,
        'avg_return_pct': stats.avg_return_pct,
        'avg_loss_pct': stats.avg_loss_pct,
        'max_drawdown_pct': stats.max_drawdown_pct,
        'expectancy': stats.expectancy,
        'sample_size': stats.sample_size,
        'last_updated': stats.last_updated,
    }


@router.get("/outcomes/types")
def list_setup_types(user: dict = Depends(get_current_user)):
    """List all setup types that have recorded outcomes."""
    from app.services.historical_lens import get_all_setup_types

    return {'setup_types': get_all_setup_types()}


@router.get("/events/{symbol}")
def get_event_risk(symbol: str, days_ahead: int = 30, user: dict = Depends(get_current_user)):
    """Get event risk analysis for a symbol."""
    risk = calculate_event_risk(symbol.upper(), days_ahead)
    return {
        'symbol': symbol.upper(),
        'event_risk_score': risk.combined_risk,
        'earnings_risk': risk.earnings_risk,
        'fomc_risk': risk.fomc_risk,
        'macro_risk': risk.macro_risk,
        'score_breakdown': risk.score_breakdown,
        'active_events': [
            {
                'type': e.event_type,
                'date': e.date,
                'name': e.name,
                'impact': e.impact,
                'days_until': e.days_until,
                'description': e.description,
            }
            for e in risk.active_events
        ],
        'event_lens_score': 100 - risk.combined_risk,
    }


@router.post("/recalibrate")
def recalibrate_signals(body: dict, user: dict = Depends(get_current_user)):
    """
    Recalibrate active signals based on upcoming events.
    Body: { "signals": [...active signal dicts...], "days_ahead": 14 }
    """
    signals = body.get('signals', [])
    days_ahead = body.get('days_ahead', 14)
    recalibrations = recalibrate_active_signals(signals, days_ahead)
    return {
        'recalibrations': [
            {
                'signal_id': r.signal_id,
                'symbol': r.symbol,
                'original_certainty': r.original_certainty,
                'adjusted_certainty': r.adjusted_certainty,
                'adjustment_reason': r.adjustment_reason,
                'event_type': r.event_type,
                'days_until_event': r.days_until_event,
                'suggested_action': r.suggested_action,
            }
            for r in recalibrations
        ],
        'total_checked': len(signals),
        'recalibrated_count': len(recalibrations),
    }
@router.get("/{signal_id}")
async def get_signal_analysis(
    signal_id: UUID,
    setup_type: Optional[str] = None,
    include_events: bool = False,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get full SignalAnalysis for a specific signal."""
    service = SignalService(db)
    signal = await service.get_signal_by_id(signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    # Get enriched signal (with atr, etc.)
    enriched = await service._enrich_signal_metadata(signal.to_dict())
    analysis = build_signal_analysis(enriched, setup_type=setup_type, include_events=include_events)
    return analysis
