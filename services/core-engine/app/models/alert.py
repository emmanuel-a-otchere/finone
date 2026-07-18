"""Alert delivery model."""
import uuid

from sqlalchemy import Column, String, Text, Boolean, ARRAY, UUID, TIMESTAMP, func

from app.models import Base


class AlertDelivery(Base):
    __tablename__ = "alert_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False)
    signal_id = Column(UUID(as_uuid=True), nullable=True)
    alert_type = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False, default="default")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    ntfy_topic = Column(String(100), nullable=True)
    ntfy_tags = Column(ARRAY(String), nullable=True)
    delivered = Column(Boolean, nullable=False, default=False)
    delivery_error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
