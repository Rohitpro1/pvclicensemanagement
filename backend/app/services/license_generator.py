"""Cryptographically secure, non-sequential license key generator.

Format examples:
    PVC-1Y-ABCD-EFGH-IJKL
    PVC-MO-QWER-TYUI-OPAS
    PVC-LT-ZXCV-BNMQ-WERT
"""
import secrets

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

TYPE_PREFIX = {
    "Trial": "TR",
    "Monthly": "MO",
    "Yearly": "1Y",
    "Lifetime": "LT",
    "Enterprise": "EN",
}

TYPE_DURATION_DAYS = {
    "Trial": 14,
    "Monthly": 30,
    "Yearly": 365,
    "Lifetime": None,
    "Enterprise": 365,
}

TYPE_DEVICE_LIMIT = {
    "Trial": 1,
    "Monthly": 2,
    "Yearly": 3,
    "Lifetime": 5,
    "Enterprise": 25,
}

DEFAULT_FEATURES = {
    "Trial": {"batch_processing": False, "card_history": True, "analytics": False,
              "multi_operator": False, "pdf_import": False, "cloud_backup": False},
    "Monthly": {"batch_processing": True, "card_history": True, "analytics": False,
                "multi_operator": False, "pdf_import": True, "cloud_backup": False},
    "Yearly": {"batch_processing": True, "card_history": True, "analytics": True,
               "multi_operator": False, "pdf_import": True, "cloud_backup": True},
    "Lifetime": {"batch_processing": True, "card_history": True, "analytics": True,
                 "multi_operator": True, "pdf_import": True, "cloud_backup": True},
    "Enterprise": {"batch_processing": True, "card_history": True, "analytics": True,
                   "multi_operator": True, "pdf_import": True, "cloud_backup": True},
}


def _block(length: int = 4) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def generate_license_key(license_type: str) -> str:
    prefix = TYPE_PREFIX.get(license_type, "TR")
    return f"PVC-{prefix}-{_block()}-{_block()}-{_block()}"


def generate_activation_token() -> str:
    return secrets.token_hex(24)
