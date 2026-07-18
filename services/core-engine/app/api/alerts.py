"""NTFY alert delivery API."""
import os
from datetime import datetime
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.models.database import get_db
from app.models import AlertDelivery

router = APIRouter()

NTFY_BASE = "https://ntfy.sh"
DEFAULT_TOPIC = os.getenv("NTFY_TOPIC", "systemone-alerts")
DEFAULT_PRIORITY = os.getenv("ALERT_PRIORITY", "default")

# ntfy.sh priority: 1=min, 3=low, 4=normal, 5=max
PRIORITY_HEADER = {
    "default": "default",
    "min": "4",
    "low": "3",
    "urgent": "4",
    "max": "5",
}


class NotifyRequest(BaseModel):
    symbol: str
    signal_id: Optional[str] = None
    alert_type: str
    priority: Optional[str] = "default"
    title: str
    message: str
    ntfy_topic: Optional[str] = None
    tags: Optional[list[str]] = None


class NotifyResponse(BaseModel):
    ok: bool
    delivery_id: str
    delivered: bool
    error: Optional[str] = None


class TestAlertRequest(BaseModel):
    ntfy_topic: Optional[str] = None
    priority: Optional[str] = "default"


async def _send_ntfy(
    topic: str, title: str, body: str, priority: str, tags: list[str] | None
) -> tuple[bool, str | None]:
    """Send to ntfy.sh. Returns (success, error_message)."""
    try:
        headers = {"Priority": PRIORITY_HEADER.get(priority, "default")}
        if tags:
            headers["Tags"] = ",".join(tags)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{NTFY_BASE}/{topic}",
                content=body,
                headers=headers,
            )
            if resp.status_code in (200, 201, 204):
                return True, None
            return False, f"ntfy.sh returned {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return False, str(e)


@router.post("/notify", response_model=NotifyResponse)
async def send_alert(req: NotifyRequest, db: AsyncSession = Depends(get_db), _user: str = Depends(get_current_user)):
    topic = req.ntfy_topic or DEFAULT_TOPIC
    tags = req.tags or []

    delivered, error = await _send_ntfy(topic, req.title, req.message, req.priority, tags)

    delivery = AlertDelivery(
        symbol=req.symbol,
        signal_id=UUID(req.signal_id) if req.signal_id else None,
        alert_type=req.alert_type,
        priority=req.priority,
        title=req.title,
        message=req.message,
        ntfy_topic=topic,
        ntfy_tags=tags,
        delivered=delivered,
        delivery_error=error,
    )
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)

    return NotifyResponse(
        ok=delivered,
        delivery_id=str(delivery.id),
        delivered=delivered,
        error=error,
    )


@router.post("/test")
async def test_alert(req: TestAlertRequest, _user: str = Depends(get_current_user)):
    topic = req.ntfy_topic or DEFAULT_TOPIC
    msg = f"SystemOne Alert Test — {datetime.utcnow().isoformat()}"
    success, error = await _send_ntfy(
        topic, "SystemOne Test", msg, req.priority or "default", ["test", "bell"]
    )
    if success:
        return {"ok": True, "message": msg, "topic": topic}
    return {"ok": False, "error": error}


class AlertHistoryItem(BaseModel):
    id: str
    symbol: str
    alert_type: str
    priority: str
    title: str
    message: str
    ntfy_topic: Optional[str]
    delivered: bool
    delivery_error: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


class AlertHistoryResponse(BaseModel):
    alerts: list
    total: int


@router.get("/history", response_model=AlertHistoryResponse)
async def alert_history(
    symbol: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: str = Depends(get_current_user),
):
    conditions = []
    if symbol:
        conditions.append(AlertDelivery.symbol.ilike(f"%{symbol}%"))

    count_q = select(func.count(AlertDelivery.id))
    if conditions:
        count_q = count_q.where(*conditions)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    q = (
        select(AlertDelivery)
        .order_by(desc(AlertDelivery.created_at))
        .limit(limit)
        .offset(offset)
    )
    if conditions:
        q = q.where(*conditions)
    result = await db.execute(q)
    alerts = result.scalars().all()

    return AlertHistoryResponse(
        alerts=[
            {
                "id": str(a.id),
                "symbol": a.symbol,
                "alert_type": a.alert_type,
                "priority": a.priority,
                "title": a.title,
                "message": a.message,
                "ntfy_topic": a.ntfy_topic,
                "delivered": a.delivered,
                "delivery_error": a.delivery_error,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        total=total,
    )
