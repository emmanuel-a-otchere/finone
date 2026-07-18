from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, date
import uuid

from app.models.portfolio import Portfolio
from app.models.database import get_db
from app.api.auth import get_current_user
from app.services.portfolio_performance_service import compute_performance

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


class PortfolioUpload(BaseModel):
    name: str
    description: Optional[str] = ""
    holdings: list = []

class PortfolioResponse(BaseModel):
    id: str
    user_id: str
    format_version: str
    holdings: list
    watchlist: list
    settings: dict
    last_uploaded: Optional[str]
    monitoring_active: bool
    name: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True

class SignalEntry(BaseModel):
    symbol: str
    qty: float
    avg_cost: float
    strategy: str = "swing"
    entry_date: Optional[str] = None

class AddSignalsRequest(BaseModel):
    signals: list[SignalEntry]

class CreatePortfolioRequest(BaseModel):
    name: str
    description: Optional[str] = ""

async def get_portfolio_or_404(db: AsyncSession, portfolio_id: UUID, user_id: str) -> Portfolio:
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id)
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this portfolio")
    return portfolio

@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(
    req: CreatePortfolioRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    portfolio = Portfolio(
        user_id=current_user,
        name=req.name,
        description=req.description,
        holdings=[],
        watchlist=[],
        settings={},
    )
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio)
    return PortfolioResponse(**portfolio.to_dict())

@router.get("/", response_model=list[PortfolioResponse])
async def list_portfolios(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == current_user)
    )
    portfolios = result.scalars().all()
    return [PortfolioResponse(**p.to_dict()) for p in portfolios]

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    portfolio = await get_portfolio_or_404(db, portfolio_id, current_user)
    return PortfolioResponse(**portfolio.to_dict())

@router.post("/{portfolio_id}/signals", response_model=PortfolioResponse)
async def add_signals_to_portfolio(
    portfolio_id: UUID,
    req: AddSignalsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    portfolio = await get_portfolio_or_404(db, portfolio_id, current_user)

    holdings = list(portfolio.holdings) if portfolio.holdings else []

    for sig in req.signals:
        entry_date = None
        if sig.entry_date:
            try:
                entry_date = datetime.strptime(sig.entry_date, "%Y-%m-%d").date()
            except ValueError:
                entry_date = date.today()
        else:
            entry_date = date.today()

        holdings.append({
            "symbol": sig.symbol.upper(),
            "qty": float(sig.qty),
            "avg_cost": float(sig.avg_cost),
            "strategy": sig.strategy,
            "entry_date": entry_date.isoformat() if entry_date else None,
            "added_at": datetime.utcnow().isoformat(),
            "source": "signal",
        })

    portfolio.holdings = holdings
    portfolio.last_uploaded = datetime.utcnow()
    await db.commit()
    await db.refresh(portfolio)
    return PortfolioResponse(**portfolio.to_dict())

@router.get("/{portfolio_id}/performance")
async def get_portfolio_performance(
    portfolio_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """
    Returns live P&L, sector allocation, top winners/losers for a portfolio.
    Prices come from the symbol_cache (15-min TTL) or Yahoo Finance directly.
    """
    portfolio = await get_portfolio_or_404(db, portfolio_id, current_user)
    if not portfolio.holdings:
        return {
            "portfolio_id": str(portfolio_id),
            "holdings": [],
            "summary": {
                "total_cost": 0,
                "total_value": 0,
                "total_pnl": None,
                "total_pnl_pct": None,
                "holding_count": 0,
            },
            "sector_allocation": [],
            "top_winners": [],
            "top_losers": [],
            "as_of": datetime.utcnow().isoformat(),
        }

    perf = compute_performance(list(portfolio.holdings))
    perf["portfolio_id"] = str(portfolio_id)
    return perf

@router.get("/{portfolio_id}/recommendations")
async def get_portfolio_recommendations(
    portfolio_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    portfolio = await get_portfolio_or_404(db, portfolio_id, current_user)
    if not portfolio.holdings:
        return {"portfolio_id": str(portfolio_id), "recommendations": []}

    recommendations = []
    for holding in portfolio.holdings:
        recommendations.append({
            "symbol": holding.get("symbol"),
            "action": "HOLD",
            "reason": "Monitor for optimal exit timing",
        })

    return {
        "portfolio_id": str(portfolio_id),
        "recommendations": recommendations,
    }