from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import col
from models.helpers import new_id, now_iso, serialize, serialize_many
from schemas.schemas import UpdateInput
from services.seed_service import audit

admin_router = APIRouter(prefix="/updates", tags=["updates"])
client_router = APIRouter(prefix="/update", tags=["update"])

@client_router.get("/check")
async def check_update():
    doc = await col("updates").find_one({"status": "published"}, sort=[("published_at", -1)])
    if not doc:
        return {
            "latest_version": "1.0.0",
            "minimum_supported_version": "1.0.0",
            "mandatory": False,
            "download_url": "",
            "release_notes": "No updates available.",
            "sha256": "",
            "published_at": ""
        }
    return {
        "latest_version": doc["version"],
        "minimum_supported_version": doc.get("minimum_supported_version", ""),
        "mandatory": doc.get("mandatory", False),
        "download_url": doc["download_url"],
        "release_notes": doc.get("release_notes", ""),
        "sha256": doc.get("sha256", ""),
        "published_at": doc.get("published_at", "")
    }

@admin_router.get("")
async def list_updates(user: dict = Depends(get_current_user)):
    docs = await col("updates").find().sort("created_at", -1).to_list(None)
    return serialize_many(docs)

@admin_router.post("")
async def create_update(payload: UpdateInput, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = new_id("up")
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["published_at"] = None
    await col("updates").insert_one(dict(doc))
    await audit("UPDATE_CREATED", f"Version {doc['version']}", user["email"])
    return serialize(doc)

@admin_router.put("/{update_id}")
async def update_update(update_id: str, payload: UpdateInput, user: dict = Depends(get_current_user)):
    update_data = payload.model_dump()
    update_data["updated_at"] = now_iso()
    
    existing = await col("updates").find_one({"id": update_id})
    if existing:
        update_data["published_at"] = existing.get("published_at")
        
    await col("updates").update_one({"id": update_id}, {"$set": update_data})
    doc = await col("updates").find_one({"id": update_id})
    if not doc:
        raise HTTPException(404, "Update not found")
    await audit("UPDATE_MODIFIED", f"Version {doc['version']}", user["email"])
    return serialize(doc)

@admin_router.post("/{update_id}/publish")
async def publish_update(update_id: str, user: dict = Depends(get_current_user)):
    now = now_iso()
    await col("updates").update_one({"id": update_id}, {"$set": {"status": "published", "published_at": now, "updated_at": now}})
    doc = await col("updates").find_one({"id": update_id})
    if not doc:
        raise HTTPException(404, "Update not found")
    await audit("UPDATE_PUBLISHED", f"Version {doc['version']}", user["email"])
    return serialize(doc)

@admin_router.post("/{update_id}/archive")
async def archive_update(update_id: str, user: dict = Depends(get_current_user)):
    now = now_iso()
    await col("updates").update_one({"id": update_id}, {"$set": {"status": "archived", "updated_at": now}})
    doc = await col("updates").find_one({"id": update_id})
    if not doc:
        raise HTTPException(404, "Update not found")
    await audit("UPDATE_ARCHIVED", f"Version {doc['version']}", user["email"])
    return serialize(doc)

@admin_router.delete("/{update_id}")
async def delete_update(update_id: str, user: dict = Depends(get_current_user)):
    await col("updates").delete_one({"id": update_id})
    await audit("UPDATE_DELETED", update_id, user["email"])
    return {"ok": True}
