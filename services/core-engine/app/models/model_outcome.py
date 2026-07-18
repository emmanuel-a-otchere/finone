"""Model outcome records for backtesting/audit."""
import uuid
from sqlalchemy import Column, String, Numeric, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from app.models import Base


class ModelOutcome(Base):
    __tablename__ = "model_outcomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signal_id = Column(UUID(as_uuid=True), nullable=True)
    model_version = Column(String(50), nullable=True)
    actual_outcome = Column(String(20), nullable=True)  # WIN | LOSS | BREAK_EVEN
    profit_loss_pct = Column(Numeric(10, 4), nullable=True)
    market_regime = Column(String(50), nullable=True)
    recorded_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
