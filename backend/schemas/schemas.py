from typing import Any, Optional

from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    user: dict


# ---------- License ----------
class LicenseInput(BaseModel):
    license_key: Optional[str] = None
    license_type: str = "Yearly"
    status: str = "active"
    device_limit: int = 1
    features: dict[str, Any] = {}
    customer_id: Optional[str] = None
    plan_id: Optional[str] = None
    start_date: Optional[str] = None
    expires_at: Optional[str] = None
    renewal_due_date: Optional[str] = None
    notes: Optional[str] = None


class RenewInput(BaseModel):
    days: int = 365


class StatusInput(BaseModel):
    status: str  # active | blocked | disabled


# ---------- Customer ----------
class CustomerInput(BaseModel):
    name: str
    email: Optional[str] = ""
    company: str
    phone: Optional[str] = ""
    role: str = "customer"


# ---------- Plan ----------
class PlanInput(BaseModel):
    name: str
    price: float = 0
    duration_days: int = 365
    device_limit: int = 1
    features: dict[str, Any] = {}


# ---------- Desktop client APIs ----------
class HardwareProfile(BaseModel):
    uuid: Optional[str] = ""
    bios: Optional[str] = ""
    cpu: Optional[str] = ""
    disk: Optional[str] = ""


class ActivateInput(BaseModel):
    license_key: str
    machine_id: str
    machine_name: str
    software_version: str = ""
    hardware_profile: Optional[HardwareProfile] = None


class ValidateInput(BaseModel):
    license_key: Optional[str] = None
    machine_id: str
    activation_token: Optional[str] = None


class HeartbeatInput(BaseModel):
    license_key: Optional[str] = None
    machine_id: str
    software_version: str = ""
    activation_token: Optional[str] = None


class UsageInput(BaseModel):
    license_key: Optional[str] = None
    machine_id: str
    event_type: str
    event_count: int = 1
    activation_token: Optional[str] = None


# ---------- Settings ----------
class SettingsInput(BaseModel):
    data: dict[str, Any]
