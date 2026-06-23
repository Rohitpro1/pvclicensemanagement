import secrets
from datetime import datetime, timezone

# Crockford-style alphabet (no ambiguous chars)
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

TYPE_CODE = {
    "Trial": "TR",
    "Monthly": "MO",
    "Yearly": "1Y",
    "Lifetime": "LT",
    "Enterprise": "EN",
}


def _block(n: int) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(n))


def generate_license_key(license_type: str) -> str:
    code = TYPE_CODE.get(license_type, "PV")
    return f"PVC-{code}-{_block(4)}-{_block(4)}-{_block(4)}"


def generate_activation_token() -> str:
    return secrets.token_hex(24)


def is_expired(expires_at: str | None) -> bool:
    if not expires_at:
        return False
    try:
        dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except ValueError:
        return False
    return dt < datetime.now(timezone.utc)


def effective_status(license: dict) -> str:
    status = license.get("status", "active")
    if status in ("blocked", "disabled"):
        return status
    if is_expired(license.get("expires_at")):
        return "expired"
    return status
