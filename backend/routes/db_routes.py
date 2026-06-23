from fastapi import APIRouter, Depends

from auth import get_current_user
from database import col
from models.helpers import serialize_many
from services.seed_service import seed_sample_data

router = APIRouter(tags=["db"])


@router.get("/db")
async def get_db(user: dict = Depends(get_current_user)):
    """Return the whole dataset in the frontend's DB shape (single hydration call)."""
    customers = await col("customers").find().sort("created_at", -1).to_list(None)
    licenses = await col("licenses").find().sort("created_at", -1).to_list(None)
    activations = await col("activations").find().sort("last_seen", -1).to_list(None)
    usage = await col("usage_logs").find().sort("created_at", -1).limit(20000).to_list(None)
    plans = await col("subscription_plans").find().to_list(None)
    audit = await col("audit_logs").find().sort("created_at", -1).limit(100).to_list(None)
    return {
        "customers": serialize_many(customers),
        "licenses": serialize_many(licenses),
        "activations": serialize_many(activations),
        "usage": serialize_many(usage),
        "plans": serialize_many(plans),
        "audit": serialize_many(audit),
    }


@router.post("/admin/reset")
async def reset_db(user: dict = Depends(get_current_user)):
    """Reseed demo data (Settings → Reset Demo Data)."""
    result = await seed_sample_data(force=True)
    return result
