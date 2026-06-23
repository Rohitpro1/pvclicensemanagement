"""Pydantic schemas (input validation + response models)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---------- Desktop client APIs ----------
class ActivateRequest(BaseModel):
    license_key: str
    machine_id: str
    machine_name: str
    software_version: str


class ActivateResponse(BaseModel):
    activation_token: str
    license_status: str
    expiry_date: Optional[datetime]
    enabled_features: dict


class ValidateRequest(BaseModel):
    license_key: str
    machine_id: str


class ValidateResponse(BaseModel):
    valid: bool
    expired: bool
    blocked: bool
    disabled: bool
    feature_set: Optional[dict]


class HeartbeatRequest(BaseModel):
    license_key: str
    machine_id: str
    software_version: str


class UsageRequest(BaseModel):
    license_key: str
    machine_id: str
    event_type: str
    event_count: int = 1


# ---------- Admin / management ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LicenseCreate(BaseModel):
    license_type: str
    customer_id: Optional[str] = None
    plan_id: Optional[str] = None
    device_limit: Optional[int] = None
    features_json: Optional[dict] = None
    start_date: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    company: Optional[str] = None
    phone: Optional[str] = None


class PlanCreate(BaseModel):
    name: str
    price: float = 0
    duration_days: int = 30
    device_limit: int = 1
    features_json: dict = {}
