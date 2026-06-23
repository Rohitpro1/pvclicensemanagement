from fastapi import APIRouter, Depends

from auth import get_current_user
from database import col
from models.helpers import serialize_many
from services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(user: dict = Depends(get_current_user)):
    return await analytics_service.overview()


@router.get("/daily")
async def daily(days: int = 30, user: dict = Depends(get_current_user)):
    return await analytics_service.daily_series(days)


@router.get("/top-customers")
async def top_customers(limit: int = 8, user: dict = Depends(get_current_user)):
    return await analytics_service.top_customers(limit)


@router.get("/expiring")
async def expiring(within_days: int = 30, user: dict = Depends(get_current_user)):
    return await analytics_service.expiring(within_days)


@router.get("/activations")
async def activations(user: dict = Depends(get_current_user)):
    docs = await col("activations").find().sort("last_seen", -1).to_list(None)
    return serialize_many(docs)


@router.get("/usage-logs")
async def usage_logs(limit: int = 5000, user: dict = Depends(get_current_user)):
    docs = await col("usage_logs").find().sort("created_at", -1).limit(limit).to_list(None)
    return serialize_many(docs)


@router.get("/audit-logs")
async def audit_logs(limit: int = 200, user: dict = Depends(get_current_user)):
    docs = await col("audit_logs").find().sort("created_at", -1).limit(limit).to_list(None)
    return serialize_many(docs)
