"""Market snapshot models for historical Fear & Greed and Market Sentiment data."""

from sqlalchemy import Column, String, Integer, DateTime, Numeric, Index
from datetime import datetime

from .database import Base


class FearGreedSnapshot(Base):
    """Daily Fear & Greed Index snapshot — computed once per day and stored
    for historical reference.  The UI period tabs (1D/1W/1M/3M/1Y/ALL)
    read from this table rather than recalculating from live prices.
    """
    __tablename__ = "fear_greed_snapshots"

    date = Column(DateTime(timezone=True), primary_key=True)
    value = Column(Integer, nullable=False)
    label = Column(String(20), nullable=False)
    vix = Column(Numeric(8, 2))
    spy_close = Column(Numeric(12, 4))
    qqq_close = Column(Numeric(12, 4))
    spy_ma20 = Column(Numeric(12, 4))
    momentum_score = Column(Numeric(6, 2))
    breadth_score = Column(Numeric(6, 2))
    vol_score = Column(Numeric(6, 2))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("ix_fear_greed_date", "date"),
    )

    def to_dict(self):
        return {
            "date": self.date.isoformat() if self.date else None,
            "value": self.value,
            "label": self.label,
            "vix": float(self.vix) if self.vix else None,
            "spy_close": float(self.spy_close) if self.spy_close else None,
            "qqq_close": float(self.qqq_close) if self.qqq_close else None,
        }


class MarketSentimentSnapshot(Base):
    """Daily Market Sentiment snapshot — stores the composite sentiment
    score and component readings for historical comparison.
    """
    __tablename__ = "market_sentiment_snapshots"

    date = Column(DateTime(timezone=True), primary_key=True)
    value = Column(Integer, nullable=False)
    label = Column(String(20), nullable=False)
    # Component scores (0-100 each)
    trend_score = Column(Integer)
    momentum_score = Column(Integer)
    breadth_score = Column(Integer)
    volatility_score = Column(Integer)
    # Underlying market data
    spy_close = Column(Numeric(12, 4))
    spy_ma20 = Column(Numeric(12, 4))
    spy_ma50 = Column(Numeric(12, 4))
    advancers = Column(Integer)
    decliners = Column(Integer)
    unchanged = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("ix_sentiment_date", "date"),
    )

    def to_dict(self):
        return {
            "date": self.date.isoformat() if self.date else None,
            "value": self.value,
            "label": self.label,
            "trend_score": self.trend_score,
            "momentum_score": self.momentum_score,
            "breadth_score": self.breadth_score,
            "volatility_score": self.volatility_score,
        }
