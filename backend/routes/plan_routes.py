from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import col
from models.helpers import new_id, serialize, serialize_many
from schemas.schemas import PlanInput
from services.seed_service import audit

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
async def list_plans(user: dict = Depends(get_current_user)):
    docs = await col("subscription_plans").find().to_list(None)
    return serialize_many(docs)


@router.post("")
async def create_plan(payload: PlanInput, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = new_id("p")
    await col("subscription_plans").insert_one(dict(doc))
    await audit("PLAN_CREATED", doc["name"], user["email"])
    return serialize(doc)


@router.put("/{plan_id}")
async def update_plan(plan_id: str, payload: PlanInput, user: dict = Depends(get_current_user)):
    await col("subscription_plans").update_one({"id": plan_id}, {"$set": payload.model_dump()})
    doc = await col("subscription_plans").find_one({"id": plan_id})
    if not doc:
        raise HTTPException(404, "Plan not found")
    await audit("PLAN_UPDATED", doc["name"], user["email"])
    return serialize(doc)


@router.delete("/{plan_id}")
async def delete_plan(plan_id: str, user: dict = Depends(get_current_user)):
    await col("subscription_plans").delete_one({"id": plan_id})
    await audit("PLAN_DELETED", plan_id, user["email"])
    return {"ok": True}
