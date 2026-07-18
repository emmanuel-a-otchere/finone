from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import math

@dataclass
class Event:
    event_type: str        # 'earnings' | 'fomc' | 'macro'
    date: str              # ISO date
    name: str              # e.g. "AAPL Earnings" or "FOMC Meeting"
    impact: str            # 'high' | 'medium' | 'low'
    days_until: int        # negative = past
    description: str

@dataclass  
class EventRiskScore:
    earnings_risk: float      # 0-100, 100 = maximum risk
    fomc_risk: float          # 0-100
    macro_risk: float         # 0-100
    combined_risk: float       # weighted composite
    active_events: List[Event]
    score_breakdown: Dict[str, float]

def get_upcoming_events(symbol: str, days_ahead: int = 30) -> List[Event]:
    """
    Get all events for a symbol within the look-ahead window.
    Uses yfinance for earnings dates.
    Returns empty list if no events found.
    """
    events = []
    
    # Earnings from yfinance
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # next earnings date
        next_earnings = info.get('nextEarningsDate')
        if next_earnings:
            if isinstance(next_earnings, datetime):
                edate = next_earnings
            else:
                edate = datetime.fromisoformat(str(next_earnings).replace('Z', '+00:00'))
            
            days_until = (edate.date() - datetime.now().date()).days
            if -30 <= days_until <= days_ahead:
                events.append(Event(
                    event_type='earnings',
                    date=edate.isoformat(),
                    name=f"{symbol} Earnings",
                    impact='high',  # earnings are always high impact
                    days_until=days_until,
                    description=f"Q earnings report"
                ))
    except Exception:
        pass
    
    # FOMC meetings — use known FOMC dates (2024-2026, publicly available)
    # FOMC meetings are held 8 times per year, roughly every 6 weeks
    # Known dates for 2026:
    fomc_dates_2026 = [
        '2026-01-28', '2026-03-18', '2026-05-05', '2026-06-16',
        '2026-07-28', '2026-09-15', '2026-11-03', '2026-12-15'
    ]
    today = datetime.now().date()
    for fd_str in fomc_dates_2026:
        fd = datetime.fromisoformat(fd_str).date()
        days_until = (fd - today).days
        if 0 <= days_until <= days_ahead:
            events.append(Event(
                event_type='fomc',
                date=fd_str,
                name='FOMC Meeting',
                impact='high',
                days_until=days_until,
                description='Federal Reserve policy meeting — major market mover'
            ))
    
    return events

def calculate_event_risk(symbol: str, days_ahead: int = 30) -> EventRiskScore:
    """
    Calculate composite event risk score for a symbol.
    Returns risk scores (0-100) for earnings, FOMC, and macro categories.
    """
    events = get_upcoming_events(symbol, days_ahead)
    
    earnings_risk = 0.0
    fomc_risk = 0.0
    macro_risk = 0.0
    
    earnings_events = [e for e in events if e.event_type == 'earnings']
    fomc_events = [e for e in events if e.event_type == 'fomc']
    
    # Earnings risk: peaks at 100 on the earnings date, decays as you get further away
    if earnings_events:
        for ev in earnings_events:
            if ev.days_until == 0:
                earnings_risk = 100.0
            elif ev.days_until == 1:
                earnings_risk = max(earnings_risk, 95.0)
            elif ev.days_until <= 3:
                earnings_risk = max(earnings_risk, 80.0)
            elif ev.days_until <= 7:
                earnings_risk = max(earnings_risk, 60.0)
            elif ev.days_until <= 14:
                earnings_risk = max(earnings_risk, 40.0)
            else:
                earnings_risk = max(earnings_risk, 20.0)
    
    # FOMC risk: similar decay curve
    if fomc_events:
        for ev in fomc_events:
            if ev.days_until == 0:
                fomc_risk = max(fomc_risk, 90.0)
            elif ev.days_until == 1:
                fomc_risk = max(fomc_risk, 85.0)
            elif ev.days_until <= 3:
                fomc_risk = max(fomc_risk, 70.0)
            elif ev.days_until <= 7:
                fomc_risk = max(fomc_risk, 50.0)
            elif ev.days_until <= 14:
                fomc_risk = max(fomc_risk, 30.0)
            else:
                fomc_risk = max(fomc_risk, 15.0)
    
    # Macro risk: sector-wide events based on symbol
    # Technology sector: higher sensitivity to Fed rates
    tech_symbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'NVDA', 'AMD', 'INTC', 'TSLA', 'CRM', 'ORCL', 'ADBE']
    energy_symbols = ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'VLO']
    financial_symbols = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW']
    
    if symbol.upper() in tech_symbols:
        macro_risk = max(macro_risk, fomc_risk * 1.2)  # Tech is rate-sensitive
    if symbol.upper() in energy_symbols:
        macro_risk = max(macro_risk, 30.0)  # Oil price sensitivity
    if symbol.upper() in financial_symbols:
        macro_risk = max(macro_risk, 25.0)  # Financials sensitive to rate environment
    
    # Combined: earnings is dominant, FOMC secondary, macro tertiary
    combined_risk = (
        earnings_risk * 0.50 +
        fomc_risk * 0.35 +
        min(macro_risk, 100) * 0.15
    )
    
    score_breakdown = {
        'earnings': round(earnings_risk, 1),
        'fomc': round(fomc_risk, 1),
        'macro': round(min(macro_risk, 100), 1),
    }
    
    return EventRiskScore(
        earnings_risk=round(earnings_risk, 1),
        fomc_risk=round(fomc_risk, 1),
        macro_risk=round(min(macro_risk, 100), 1),
        combined_risk=round(combined_risk, 1),
        active_events=events,
        score_breakdown=score_breakdown,
    )

def get_event_lens_score(symbol: str, days_ahead: int = 30) -> float:
    """
    Returns a single event lens score (0-100) for use in CertaintyDial.
    0 = no event risk (safe to enter), 100 = maximum event risk (avoid).
    """
    risk = calculate_event_risk(symbol, days_ahead)
    return risk.combined_risk
