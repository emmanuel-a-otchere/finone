from sqlalchemy import Column, String, Integer, Numeric, DateTime, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from .database import Base


class ProtocolType(str, enum.Enum):
    LONG_BUY = "LONG_BUY"
    LONG_SELL = "LONG_SELL"
    SHORT_SELL = "SHORT_SELL"
    SHORT_BUY = "SHORT_BUY"


class SignalStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXECUTED = "EXECUTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class Signal(Base):
    __tablename__ = "signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String(10), default="1.1.0")
    protocol_type = Column(Enum(ProtocolType), nullable=False)
    symbol = Column(String(10), nullable=False, index=True)
    confidence_score = Column(Integer)
    entry_price = Column(Numeric(12, 4))
    stop_loss = Column(Numeric(12, 4))
    take_profit = Column(Numeric(12, 4))
    position_size_pct = Column(Numeric(5, 2))
    status = Column(Enum(SignalStatus), default=SignalStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True))
    layer_scores = Column(JSON, default=dict)
    signal_metadata = Column(JSON, default=dict)
    timeframe = Column(String(20), default="swing")
    # Price projections — stored at generate time so list endpoint has them
    projection_dates = Column(JSON, default=list)
    projection_p10 = Column(JSON, default=list)
    projection_p50 = Column(JSON, default=list)
    projection_p90 = Column(JSON, default=list)

    def to_dict(self):
        meta = self.signal_metadata or {}
        return {
            "id": str(self.id),
            "version": self.version,
            "protocol_type": self.protocol_type.value,
            "symbol": self.symbol,
            "confidence_score": self.confidence_score,
            "entry_price": float(self.entry_price) if self.entry_price else None,
            "stop_loss": float(self.stop_loss) if self.stop_loss else None,
            "take_profit": float(self.take_profit) if self.take_profit else None,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "layer_scores": self.layer_scores,
            "timeframe": self.timeframe,
            # From signal_metadata (enriched at generate time)
            "atr": meta.get("atr"),
            "risk_reward": meta.get("risk_reward"),
            "eta_hours": meta.get("eta_hours"),
            "regime": meta.get("regime"),
            "momentum_delta": meta.get("momentum_delta"),
            "volume_surge": meta.get("volume_surge"),
            # Dedicated projection columns
            "projection_dates": self.projection_dates or [],
            "projection_p10": self.projection_p10 or [],
            "projection_p50": self.projection_p50 or [],
            "projection_p90": self.projection_p90 or [],
        }
