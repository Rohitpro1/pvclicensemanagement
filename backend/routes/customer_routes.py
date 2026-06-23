from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import col
from models.helpers import new_id, now_iso, serialize, serialize_many
from schemas.schemas import CustomerInput
from services.seed_service import audit

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
async def list_customers(user: dict = Depends(get_current_user)):
    docs = await col("customers").find().sort("created_at", -1).to_list(None)
    return serialize_many(docs)


@router.post("")
async def create_customer(payload: CustomerInput, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = new_id("c")
    doc["created_at"] = now_iso()
    await col("customers").insert_one(dict(doc))
    await audit("CUSTOMER_CREATED", f"{doc['name']} ({doc['company']})", user["email"])
    return serialize(doc)


@router.put("/{customer_id}")
async def update_customer(customer_id: str, payload: CustomerInput, user: dict = Depends(get_current_user)):
    await col("customers").update_one({"id": customer_id}, {"$set": payload.model_dump()})
    doc = await col("customers").find_one({"id": customer_id})
    if not doc:
        raise HTTPException(404, "Customer not found")
    await audit("CUSTOMER_UPDATED", doc["name"], user["email"])
    return serialize(doc)


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    await col("customers").delete_one({"id": customer_id})
    await col("licenses").update_many({"customer_id": customer_id}, {"$set": {"customer_id": None}})
    await audit("CUSTOMER_DELETED", customer_id, user["email"])
    return {"ok": True}
