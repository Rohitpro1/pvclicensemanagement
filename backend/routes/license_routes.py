from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import col
from models.helpers import new_id, now_iso, serialize, serialize_many
from schemas.schemas import LicenseInput, RenewInput, StatusInput
from services.license_service import generate_license_key
from services.seed_service import audit

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("")
async def list_licenses(user: dict = Depends(get_current_user)):
    docs = await col("licenses").find().sort("created_at", -1).to_list(None)
    return serialize_many(docs)


@router.post("")
async def create_license(payload: LicenseInput, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id("l"),
        "license_key": payload.license_key or generate_license_key(payload.license_type),
        "license_type": payload.license_type,
        "status": payload.status or "active",
        "device_limit": payload.device_limit,
        "features": payload.features,
        "customer_id": payload.customer_id,
        "plan_id": payload.plan_id,
        "created_at": now_iso(),
        "start_date": payload.start_date or now_iso(),
        "expires_at": payload.expires_at,
        "renewal_due_date": payload.renewal_due_date or payload.expires_at,
        "notes": payload.notes,
    }
    await col("licenses").insert_one(dict(doc))
    await audit("LICENSE_CREATED", f"{doc['license_key']} ({doc['license_type']})", user["email"])
    return serialize(doc)


@router.put("/{license_id}")
async def update_license(license_id: str, payload: LicenseInput, user: dict = Depends(get_current_user)):
    patch = payload.model_dump(exclude_none=True)
    patch.pop("license_key", None)
    await col("licenses").update_one({"id": license_id}, {"$set": patch})
    doc = await col("licenses").find_one({"id": license_id})
    if not doc:
        raise HTTPException(404, "License not found")
    await audit("LICENSE_UPDATED", doc["license_key"], user["email"])
    return serialize(doc)


@router.delete("/{license_id}")
async def delete_license(license_id: str, user: dict = Depends(get_current_user)):
    doc = await col("licenses").find_one({"id": license_id})
    await col("licenses").delete_one({"id": license_id})
    await col("activations").delete_many({"license_id": license_id})
    await col("usage_logs").delete_many({"license_id": license_id})
    if doc:
        await audit("LICENSE_DELETED", doc["license_key"], user["email"])
    return {"ok": True}


@router.post("/{license_id}/renew")
async def renew_license(license_id: str, payload: RenewInput, user: dict = Depends(get_current_user)):
    doc = await col("licenses").find_one({"id": license_id})
    if not doc:
        raise HTTPException(404, "License not found")
    base = datetime.now(timezone.utc)
    if doc.get("expires_at"):
        exp = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
        if exp > base:
            base = exp
    new_exp = (base + timedelta(days=payload.days)).isoformat()
    status = "active" if doc.get("status") == "expired" else doc.get("status", "active")
    await col("licenses").update_one({"id": license_id},
                                     {"$set": {"expires_at": new_exp, "renewal_due_date": new_exp, "status": status}})
    await audit("LICENSE_RENEWED", f"{doc['license_key']} +{payload.days} days", user["email"])
    return serialize(await col("licenses").find_one({"id": license_id}))


@router.post("/{license_id}/status")
async def set_status(license_id: str, payload: StatusInput, user: dict = Depends(get_current_user)):
    doc = await col("licenses").find_one({"id": license_id})
    if not doc:
        raise HTTPException(404, "License not found")
    await col("licenses").update_one({"id": license_id}, {"$set": {"status": payload.status}})
    action = {"blocked": "LICENSE_BLOCKED", "disabled": "LICENSE_DISABLED"}.get(payload.status, "LICENSE_ACTIVATED")
    await audit(action, f"{doc['license_key']} -> {payload.status}", user["email"])
    return serialize(await col("licenses").find_one({"id": license_id}))


@router.post("/{license_id}/block")
async def block_license(license_id: str, user: dict = Depends(get_current_user)):
    return await set_status(license_id, StatusInput(status="blocked"), user)


@router.post("/{license_id}/unblock")
async def unblock_license(license_id: str, user: dict = Depends(get_current_user)):
    return await set_status(license_id, StatusInput(status="active"), user)


@router.post("/{license_id}/reset-devices")
async def reset_devices(license_id: str, user: dict = Depends(get_current_user)):
    doc = await col("licenses").find_one({"id": license_id})
    await col("activations").delete_many({"license_id": license_id})
    if doc:
        await audit("DEVICES_RESET", doc["license_key"], user["email"])
    return {"ok": True}
