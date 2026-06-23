from fastapi import APIRouter, Depends

from auth import get_current_user
from database import col
from models.helpers import serialize
from schemas.schemas import SettingsInput
from services.seed_service import audit

router = APIRouter(prefix="/settings", tags=["settings"])

_DOC_ID = "global"


@router.get("")
async def get_settings(user: dict = Depends(get_current_user)):
    doc = await col("settings").find_one({"id": _DOC_ID})
    if not doc:
        default = {
            "id": _DOC_ID,
            "data": {
                "company_name": "PVC CardLicense",
                "support_email": "support@pvccards.com",
                "heartbeat_interval_hours": 24,
                "default_device_limit": 1,
            },
        }
        await col("settings").insert_one(dict(default))
        return serialize(default)
    return serialize(doc)


@router.put("")
async def update_settings(payload: SettingsInput, user: dict = Depends(get_current_user)):
    await col("settings").update_one(
        {"id": _DOC_ID}, {"$set": {"id": _DOC_ID, "data": payload.data}}, upsert=True
    )
    await audit("SETTINGS_UPDATED", "global settings", user["email"])
    return serialize(await col("settings").find_one({"id": _DOC_ID}))
