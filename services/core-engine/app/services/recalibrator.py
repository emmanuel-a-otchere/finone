from dataclasses import dataclass
from typing import List, Dict, Optional
from .event_lens import calculate_event_risk, EventRiskScore

@dataclass
class Recalibration:
    signal_id: str
    symbol: str
    original_certainty: float
    adjusted_certainty: float
    adjustment_reason: str
    event_type: str
    days_until_event: int
    suggested_action: str  # 'HOLD' | 'REDUCE_SIZE' | 'AVOID_NEW' | 'CLOSE_POSITION'

def should_recalibrate(symbol: str, certainty_dial_score: float,
                       days_until_event: int, event_type: str) -> bool:
    """
    Returns True if an active position should be recalibrated given an upcoming event.
    """
    if event_type == 'earnings' and days_until_event <= 7:
        return True
    if event_type == 'fomc' and days_until_event <= 5:
        return True
    return False

def recalibrate_signal(signal_id: str, symbol: str,
                       original_certainty: float,
                       event_risk: EventRiskScore,
                       days_until: int) -> Recalibration:
    """
    Given an active signal and upcoming event risk, compute adjusted certainty
    and suggested action.
    """
    # Reduce certainty based on proximity to event
    if event_risk.earnings_risk >= 80:
        # Very close to earnings — major haircut
        if days_until == 0:
            adjustment = -25
            action = 'CLOSE_POSITION'
        elif days_until == 1:
            adjustment = -20
            action = 'REDUCE_SIZE'
        elif days_until <= 3:
            adjustment = -15
            action = 'REDUCE_SIZE'
        elif days_until <= 7:
            adjustment = -8
            action = 'HOLD'
        else:
            adjustment = -3
            action = 'HOLD'
    elif event_risk.fomc_risk >= 60:
        if days_until <= 3:
            adjustment = -15
            action = 'REDUCE_SIZE'
        elif days_until <= 7:
            adjustment = -8
            action = 'HOLD'
        else:
            adjustment = -3
            action = 'HOLD'
    else:
        adjustment = 0
        action = 'HOLD'
    
    adjusted = max(0, min(100, original_certainty + adjustment))
    
    return Recalibration(
        signal_id=signal_id,
        symbol=symbol,
        original_certainty=original_certainty,
        adjusted_certainty=adjusted,
        adjustment_reason=f"Event risk: {event_risk.earnings_risk:.0f}% earnings / {event_risk.fomc_risk:.0f}% FOMC",
        event_type=event_risk.active_events[0].event_type if event_risk.active_events else 'unknown',
        days_until_event=days_until,
        suggested_action=action,
    )

def recalibrate_active_signals(signals: List[dict], days_ahead: int = 14) -> List[Recalibration]:
    """
    For a list of active signals, check upcoming events and return
    recalibrations for any that need adjustment.
    """
    results = []
    for sig in signals:
        symbol = sig.get('symbol')
        if not symbol:
            continue
        
        risk = calculate_event_risk(symbol, days_ahead)
        
        if not risk.active_events:
            continue
        
        # Find the most imminent high-impact event
        imminent = [e for e in risk.active_events if e.days_until >= 0]
        if not imminent:
            continue
        
        closest = min(imminent, key=lambda e: e.days_until)
        
        certainty = sig.get('confidence', 50)
        original = certainty  # map confidence directly
        
        if should_recalibrate(symbol, original, closest.days_until, closest.event_type):
            rec = recalibrate_signal(
                signal_id=str(sig.get('id', '')),
                symbol=symbol,
                original_certainty=original,
                event_risk=risk,
                days_until=closest.days_until,
            )
            results.append(rec)
    
    return results
