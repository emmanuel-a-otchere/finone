from fastapi import APIRouter
from app.tasks.celery_app import celery_app

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.1.0",
        "service": "intelligence",
    }


@router.get("/scheduler")
async def scheduler_health():
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()
        scheduled = inspect.scheduled()

        return {
            "status": "healthy",
            "workers": list(active.keys()) if active else [],
            "scheduled_tasks": len(scheduled) if scheduled else 0,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }
