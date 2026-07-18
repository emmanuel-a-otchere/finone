from sqlalchemy import Column, String, Numeric, BigInteger, DateTime
from datetime import datetime

from .database import Base


class MarketData(Base):
    __tablename__ = "market_data"

    time = Column(DateTime(timezone=True), primary_key=True, default=datetime.utcnow)
    symbol = Column(String(10), primary_key=True, index=True)
    open = Column(Numeric(12, 4))
    high = Column(Numeric(12, 4))
    low = Column(Numeric(12, 4))
    close = Column(Numeric(12, 4))
    volume = Column(BigInteger)

    def to_dict(self):
        return {
            "time": self.time.isoformat() if self.time else None,
            "symbol": self.symbol,
            "open": float(self.open) if self.open else None,
            "high": float(self.high) if self.high else None,
            "low": float(self.low) if self.low else None,
            "close": float(self.close) if self.close else None,
            "volume": self.volume,
        }
