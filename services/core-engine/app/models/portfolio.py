from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from .database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(100), index=True)
    name = Column(String(200), default="")
    description = Column(String(500), default="")
    format_version = Column(String(10), default="2.0")
    holdings = Column(JSON, nullable=False)
    watchlist = Column(JSON, default=list)
    settings = Column(JSON, default=dict)
    last_uploaded = Column(DateTime(timezone=True), default=datetime.utcnow)
    monitoring_active = Column(Boolean, default=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": str(self.name),
            "description": str(self.description),
            "user_id": self.user_id,
            "format_version": str(self.format_version),
            "holdings": self.holdings,
            "watchlist": self.watchlist,
            "settings": self.settings,
            "last_uploaded": self.last_uploaded.isoformat() if self.last_uploaded else None,
            "monitoring_active": self.monitoring_active,
        }
