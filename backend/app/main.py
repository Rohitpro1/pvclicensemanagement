"""PVC Card Generator — License Management Platform API.

FastAPI + PostgreSQL + Redis + JWT.
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
Swagger docs available at /docs, ReDoc at /redoc.
"""
import os
from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import create_access_token, get_current_admin, hash_password, verify_password
from .database import Base, engine, get_db
from .services import license_service
from .services.license_generator import (
    DEFAULT_FEATURES,
    TYPE_DEVICE_LIMIT,
    TYPE_DURATION_DAYS,
    generate_license_key,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PVC Card Generator — License Management Platform",
    description="Commercial licensing API: activation, validation, heartbeat, "
                "usage analytics, feature unlocking and remote disable.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def audit(db: Session, action: str, detail: str, actor: str = "system"):
    db.add(models.AuditLog(action=action, detail=detail, actor=actor))
    db.commit()


# ============ Desktop client endpoints ============
@app.post("/activate", response_model=schemas.ActivateResponse, tags=["Desktop"])
def activate(req: schemas.ActivateRequest, db: Session = Depends(get_db)):
    ok, err, data = license_service.activate(
        db, req.license_key, req.machine_id, req.machine_name, req.software_version
    )
    if not ok:
        raise HTTPException(status_code=403, detail=err)
    audit(db, "DEVICE_ACTIVATED", f"{req.license_key} on {req.machine_name}")
    return data


@app.post("/validate", response_model=schemas.ValidateResponse, tags=["Desktop"])
def validate(req: schemas.ValidateRequest, db: Session = Depends(get_db)):
    return license_service.validate(db, req.license_key, req.machine_id)


@app.post("/heartbeat", tags=["Desktop"])
def heartbeat(req: schemas.HeartbeatRequest, db: Session = Depends(get_db)):
    return license_service.heartbeat(db, req.license_key, req.machine_id, req.software_version)


@app.post("/usage", tags=["Desktop"])
def usage(req: schemas.UsageRequest, db: Session = Depends(get_db)):
    ok = license_service.log_usage(db, req.license_key, req.machine_id, req.event_type, req.event_count)
    if not ok:
        raise HTTPException(status_code=404, detail="License not found")
    return {"ok": True}


# ============ Auth ============
@app.post("/auth/login", response_model=schemas.TokenResponse, tags=["Auth"])
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=req.email).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.email, user.role)
    return {"access_token": token}


# ============ Admin: Licenses ============
@app.get("/admin/licenses", tags=["Admin"])
def list_licenses(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(models.License).all()


@app.post("/admin/licenses", tags=["Admin"])
def create_license(req: schemas.LicenseCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    start = req.start_date or datetime.utcnow()
    dur = TYPE_DURATION_DAYS.get(req.license_type)
    expires = req.expires_at or (None if dur is None else start + timedelta(days=dur))
    lic = models.License(
        license_key=generate_license_key(req.license_type),
        license_type=req.license_type,
        status="active",
        device_limit=req.device_limit or TYPE_DEVICE_LIMIT.get(req.license_type, 1),
        features_json=req.features_json or DEFAULT_FEATURES.get(req.license_type, {}),
        customer_id=req.customer_id,
        plan_id=req.plan_id,
        start_date=start,
        expires_at=expires,
        renewal_due_date=expires,
    )
    db.add(lic)
    db.commit()
    db.refresh(lic)
    audit(db, "LICENSE_CREATED", lic.license_key, admin["sub"])
    return lic


@app.post("/admin/licenses/{license_id}/renew", tags=["Admin"])
def renew_license(license_id: str, days: int = 365, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    lic = db.get(models.License, license_id)
    if not lic:
        raise HTTPException(404, "Not found")
    base = lic.expires_at if lic.expires_at and lic.expires_at > datetime.utcnow() else datetime.utcnow()
    lic.expires_at = base + timedelta(days=days)
    lic.renewal_due_date = lic.expires_at
    if lic.status == "expired":
        lic.status = "active"
    db.commit()
    audit(db, "LICENSE_RENEWED", f"{lic.license_key} +{days}d", admin["sub"])
    return lic


@app.post("/admin/licenses/{license_id}/status", tags=["Admin"])
def set_status(license_id: str, status: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    lic = db.get(models.License, license_id)
    if not lic:
        raise HTTPException(404, "Not found")
    lic.status = status  # active | blocked | disabled  (remote disable)
    db.commit()
    audit(db, "LICENSE_STATUS", f"{lic.license_key} -> {status}", admin["sub"])
    return lic


@app.post("/admin/licenses/{license_id}/reset-devices", tags=["Admin"])
def reset_devices(license_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    db.query(models.Activation).filter_by(license_id=license_id).delete()
    db.commit()
    audit(db, "DEVICES_RESET", license_id, admin["sub"])
    return {"ok": True}


@app.delete("/admin/licenses/{license_id}", tags=["Admin"])
def delete_license(license_id: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    lic = db.get(models.License, license_id)
    if lic:
        db.delete(lic)
        db.commit()
        audit(db, "LICENSE_DELETED", lic.license_key, admin["sub"])
    return {"ok": True}


# ============ Admin: Customers & Plans ============
@app.get("/admin/customers", tags=["Admin"])
def list_customers(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(models.User).filter_by(role="customer").all()


@app.post("/admin/customers", tags=["Admin"])
def create_customer(req: schemas.CustomerCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    user = models.User(name=req.name, email=req.email, company=req.company, phone=req.phone, role="customer")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/admin/plans", tags=["Admin"])
def list_plans(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(models.SubscriptionPlan).all()


@app.post("/admin/plans", tags=["Admin"])
def create_plan(req: schemas.PlanCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    plan = models.SubscriptionPlan(**req.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


# ============ Admin: Dashboard metrics ============
@app.get("/admin/metrics", tags=["Admin"])
def metrics(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    licenses = db.query(models.License).all()
    statuses = [license_service.effective_status(l) for l in licenses]
    today = datetime.utcnow().date()
    usage_today = db.query(models.UsageLog).filter(
        models.UsageLog.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    return {
        "total": len(licenses),
        "active": statuses.count("active"),
        "expired": statuses.count("expired"),
        "blocked": statuses.count("blocked"),
        "activations": db.query(models.Activation).count(),
        "cards_today": sum(u.event_count for u in usage_today if u.event_type == "CARD_GENERATED"),
        "prints_today": sum(u.event_count for u in usage_today if u.event_type == "CARD_PRINTED"),
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}
