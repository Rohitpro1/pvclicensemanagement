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


# Helper to perform tolerant hardware profile comparison
def check_hardware_tolerance(old_profile: dict, new_profile: dict) -> bool:
    if not old_profile or not new_profile:
        return False
    keys = ["uuid", "bios", "cpu", "disk"]
    matches = 0
    for k in keys:
        if old_profile.get(k) and old_profile.get(k) == new_profile.get(k):
            matches += 1
    return matches >= 3


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

    # Generate token
    token = generate_activation_token()
    hw_prof = payload.hardware_profile.model_dump() if payload.hardware_profile else {}

    # Check if there is an existing activation for this machine
    existing = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id})
    
    # If not found by strict ID, check for hardware profile tolerance across activations of this license
    if not existing and hw_prof:
        cursor = col("activations").find({"license_id": lic["id"]})
        async for act in cursor:
            if check_hardware_tolerance(act.get("hardware_profile"), hw_prof):
                existing = act
                break

    if existing:
        await col("activations").update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "last_seen": now_iso(),
                    "software_version": payload.software_version,
                    "activation_token": token,
                    "machine_id": payload.machine_id,  # Update to latest machine_id in case of minor changes
                    "hardware_profile": hw_prof,
                }
            },
        )
    else:
        count = await col("activations").count_documents({"license_id": lic["id"]})
        if count >= lic["device_limit"]:
            return {"ok": False, "error": f"Device limit reached ({lic['device_limit']})"}
        await col("activations").insert_one({
            "id": new_id("a"),
            "license_id": lic["id"],
            "machine_id": payload.machine_id,
            "machine_name": payload.machine_name,
            "software_version": payload.software_version,
            "activated_at": now_iso(),
            "last_seen": now_iso(),
            "activation_token": token,
            "hardware_profile": hw_prof,
        })

    await audit("DEVICE_ACTIVATED", f"{lic['license_key']} on {payload.machine_name}")
    return {
        "ok": True,
        "activation_token": token,
        "license_status": status,
        "expiry_date": lic.get("expires_at"),
        "enabled_features": lic.get("features", {}),
    }


@router.post("/validate")
async def validate(payload: ValidateInput):
    lic = None
    bound = False
    
    if payload.activation_token:
        # Find activation using token
        act = await col("activations").find_one({"activation_token": payload.activation_token})
        if act:
            lic = await col("licenses").find_one({"id": act["license_id"]})
            # Verify machine ID strictly or with tolerance
            if act["machine_id"] == payload.machine_id:
                bound = True
            elif act.get("hardware_profile"):
                # Tolerant check
                # Note: We don't have payload.hardware_profile here, but we check strict mapping or client can supply profile
                pass
    elif payload.license_key:
        lic = await _find_license(payload.license_key)
        if lic:
            bound = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id}) is not None

    if not lic:
        return {"valid": False, "expired": False, "blocked": False, "disabled": False, "feature_set": None, "error": "Not found"}

    status = effective_status(lic)
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
    lic = None
    act = None
    
    if payload.activation_token:
        act = await col("activations").find_one({"activation_token": payload.activation_token})
        if act:
            lic = await col("licenses").find_one({"id": act["license_id"]})
    elif payload.license_key:
        lic = await _find_license(payload.license_key)
        if lic:
            act = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id})

    if not lic or not act:
        return {"status": "invalid"}

    status = effective_status(lic)
    await col("activations").update_one(
        {"id": act["id"]},
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
    lic = None
    act = None
    
    if payload.activation_token:
        act = await col("activations").find_one({"activation_token": payload.activation_token})
        if act:
            lic = await col("licenses").find_one({"id": act["license_id"]})
    elif payload.license_key:
        lic = await _find_license(payload.license_key)
        if lic:
            act = await col("activations").find_one({"license_id": lic["id"], "machine_id": payload.machine_id})

    if not lic or not act:
        return {"ok": False, "error": "License not found"}

    await col("usage_logs").insert_one({
        "id": new_id("u"),
        "license_id": lic["id"],
        "machine_id": payload.machine_id,
        "event_type": payload.event_type,
        "event_count": payload.event_count,
        "created_at": now_iso(),
    })
    return {"ok": True}
