"""Activation, validation, heartbeat and usage business logic."""
from datetime import datetime

from sqlalchemy.orm import Session

from .. import models
from .license_generator import generate_activation_token


def effective_status(lic: models.License) -> str:
    if lic.status in ("blocked", "disabled"):
        return lic.status
    if lic.expires_at and lic.expires_at < datetime.utcnow():
        return "expired"
    return "active"


def activate(db: Session, license_key: str, machine_id: str, machine_name: str, version: str):
    lic = db.query(models.License).filter_by(license_key=license_key.strip()).first()
    if not lic:
        return False, "License does not exist", None
    status = effective_status(lic)
    if status == "blocked":
        return False, "License is blocked", None
    if status == "disabled":
        return False, "License is disabled", None
    if status == "expired":
        return False, "License has expired", None

    act = (
        db.query(models.Activation)
        .filter_by(license_id=lic.id, machine_id=machine_id)
        .first()
    )
    if act:
        act.last_seen = datetime.utcnow()
        act.software_version = version
    else:
        count = db.query(models.Activation).filter_by(license_id=lic.id).count()
        if count >= lic.device_limit:
            return False, f"Device limit reached ({lic.device_limit})", None
        act = models.Activation(
            license_id=lic.id,
            machine_id=machine_id,
            machine_name=machine_name,
            software_version=version,
        )
        db.add(act)
    db.commit()
    return True, None, {
        "activation_token": generate_activation_token(),
        "license_status": status,
        "expiry_date": lic.expires_at,
        "enabled_features": lic.features_json or {},
    }


def validate(db: Session, license_key: str, machine_id: str):
    lic = db.query(models.License).filter_by(license_key=license_key.strip()).first()
    if not lic:
        return {"valid": False, "expired": False, "blocked": False,
                "disabled": False, "feature_set": None}
    status = effective_status(lic)
    bound = (
        db.query(models.Activation)
        .filter_by(license_id=lic.id, machine_id=machine_id)
        .first()
        is not None
    )
    return {
        "valid": status == "active" and bound,
        "expired": status == "expired",
        "blocked": status == "blocked",
        "disabled": status == "disabled",
        "feature_set": lic.features_json or {},
    }


def heartbeat(db: Session, license_key: str, machine_id: str, version: str):
    lic = db.query(models.License).filter_by(license_key=license_key.strip()).first()
    if not lic:
        return {"status": "invalid"}
    status = effective_status(lic)
    act = (
        db.query(models.Activation)
        .filter_by(license_id=lic.id, machine_id=machine_id)
        .first()
    )
    if act:
        act.last_seen = datetime.utcnow()
        act.software_version = version
        db.commit()
    if status == "blocked":
        return {"status": "blocked"}  # desktop software must lock
    return {
        "license_status": status,
        "expiry_date": lic.expires_at,
        "enabled_features": lic.features_json or {},
    }


def log_usage(db: Session, license_key: str, machine_id: str, event_type: str, count: int):
    lic = db.query(models.License).filter_by(license_key=license_key.strip()).first()
    if not lic:
        return False
    db.add(models.UsageLog(
        license_id=lic.id,
        machine_id=machine_id,
        event_type=event_type,
        event_count=count,
    ))
    db.commit()
    return True
