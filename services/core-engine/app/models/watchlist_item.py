from sqlalchemy import Column, String, Boolean, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from .database import Base


class TimeframeType(str, enum.Enum):
    DAY_TRADE = "day_trade"
    SWING = "swing"
    POSITION = "position"


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id        = Column(String(100), nullable=False, index=True)
    symbol         = Column(String(20), nullable=False)
    timeframe      = Column(String(20), nullable=False, default="swing")
    min_confidence = Column(Integer, nullable=False, default=50)
    enabled        = Column(Boolean, nullable=False, default=True)
    last_generated = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at     = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        {"schema": None},
    )
