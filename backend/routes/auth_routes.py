from fastapi import APIRouter, Depends, HTTPException

from auth import (create_access_token, get_current_user, hash_password,
                  verify_password)
from database import col
from models.helpers import serialize
from schemas.schemas import ChangePasswordInput, LoginInput, TokenOut
from services.seed_service import audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginInput):
    email = payload.email.strip()
    user = await col("users").find_one({"email": email}) or await col("users").find_one({"email": email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["email"], "role": user.get("role", "admin")})
    safe = serialize(user)
    safe.pop("password_hash", None)
    await audit("LOGIN", user["email"], user["email"])
    return TokenOut(
        access_token=token,
        must_change_password=bool(user.get("must_change_password", False)),
        user=safe,
    )


@router.post("/change-password")
async def change_password(payload: ChangePasswordInput, user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await col("users").update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(payload.new_password), "must_change_password": False}},
    )
    await audit("CHANGE_PASSWORD", user["email"], user["email"])
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    safe = serialize(user)
    safe.pop("password_hash", None)
    return safe
