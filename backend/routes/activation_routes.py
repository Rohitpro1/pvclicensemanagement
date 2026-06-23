from fastapi import APIRouter

from database import col
from models.helpers import new_id, now_iso
from schemas.schemas import (ActivateInput, HeartbeatInput, UsageInput,
                             ValidateInput)
from services.license_service import (effective_status,
                                      generate_activation_token)
from services.seed_service import audit

# Public endpoints called by the desktop client (license key acts as credential)
router = APIRouter(tags=["device"])


async def _find_license(key: str):
    return await col("licenses").find_one(
        {"license_key": {"$regex": f"^{key.strip()}$", "$options": "i"}}
    )


@router.post("/activate")
async def activate(payload: ActivateInput):
    lic = await _find_license(payload.license_key)
    if not lic:
        return {"ok": False, "error": "License does not exist"}
    status = effective_status(lic)
    if status == "blocked":
        return {"ok": False, "error": "License is blocked"}
    if status == "disabled":
        return {"ok": False, "error": "License is disabled"}
    if status == "expired":
        return {"ok": False, "error": "License has expired"}

    existing = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id})
    if existing:
        await col("activations").update_one(
            {"id": existing["id"]},
            {"$set": {"last_seen": now_iso(), "software_version": payload.software_version}},
        )
    else:
        count = await col("activations").count_documents({"license_id": lic["id"]})
        if count >= lic["device_limit"]:
            return {"ok": False, "error": f"Device limit reached ({lic['device_limit']})"}
        await col("activations").insert_one({
            "id": new_id("a"), "license_id": lic["id"], "machine_id": payload.machine_id,
            "machine_name": payload.machine_name, "software_version": payload.software_version,
            "activated_at": now_iso(), "last_seen": now_iso(),
        })
    await audit("DEVICE_ACTIVATED", f"{lic['license_key']} on {payload.machine_name}")
    return {
        "ok": True,
        "activation_token": generate_activation_token(),
        "license_status": status,
        "expiry_date": lic.get("expires_at"),
        "enabled_features": lic.get("features", {}),
    }


@router.post("/validate")
async def validate(payload: ValidateInput):
    lic = await _find_license(payload.license_key)
    if not lic:
        return {"valid": False, "expired": False, "blocked": False, "disabled": False, "feature_set": None, "error": "Not found"}
    status = effective_status(lic)
    bound = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id}) is not None
    return {
        "valid": status == "active" and bound,
        "expired": status == "expired",
        "blocked": status == "blocked",
        "disabled": status == "disabled",
        "bound": bound,
        "feature_set": lic.get("features", {}),
    }


@router.post("/heartbeat")
async def heartbeat(payload: HeartbeatInput):
    lic = await _find_license(payload.license_key)
    if not lic:
        return {"status": "invalid"}
    status = effective_status(lic)
    await col("activations").update_one(
        {"license_id": lic["id"], "machine_id": payload.machine_id},
        {"$set": {"last_seen": now_iso(), "software_version": payload.software_version}},
    )
    if status == "blocked":
        return {"status": "blocked"}
    return {
        "license_status": status,
        "expiry_date": lic.get("expires_at"),
        "enabled_features": lic.get("features", {}),
    }


@router.post("/usage")
async def usage(payload: UsageInput):
    lic = await _find_license(payload.license_key)
    if not lic:
        return {"ok": False, "error": "License not found"}
    await col("usage_logs").insert_one({
        "id": new_id("u"), "license_id": lic["id"], "machine_id": payload.machine_id,
        "event_type": payload.event_type, "event_count": payload.event_count, "created_at": now_iso(),
    })
    return {"ok": True}
