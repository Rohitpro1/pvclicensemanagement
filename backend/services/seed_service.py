import random
from datetime import datetime, timedelta, timezone

from auth import hash_password
from config import settings
from database import col
from models.helpers import new_id, now_iso
from services.license_service import generate_license_key

MACHINE_NAMES = [
    "WORKSTATION-01", "PRINT-STATION-A", "FRONTDESK-PC", "LAB-PC-09",
    "ADMIN-LAPTOP", "KIOSK-04", "OFFICE-DESKTOP", "STUDIO-MAC",
]

FEATURE_PRESETS = {
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
TYPE_DURATION = {"Trial": 14, "Monthly": 30, "Yearly": 365, "Lifetime": None, "Enterprise": 365}
TYPE_DEVICE_LIMIT = {"Trial": 1, "Monthly": 2, "Yearly": 3, "Lifetime": 5, "Enterprise": 25}


def days(n: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=n)).isoformat()


async def ensure_admin() -> None:
    existing = await col("users").find_one({"email": settings.ADMIN_EMAIL})
    if existing:
        return
    await col("users").insert_one({
        "id": new_id("usr"),
        "name": "Admin User",
        "email": settings.ADMIN_EMAIL,
        "company": "PVC License Platform",
        "phone": "+1 555 010 0000",
        "role": "admin",
        "password_hash": hash_password(settings.ADMIN_PASSWORD),
        "must_change_password": True,
        "created_at": now_iso(),
    })


async def audit(action: str, detail: str, actor: str | None = None) -> None:
    await col("audit_logs").insert_one({
        "id": new_id("aud"), "action": action, "detail": detail,
        "actor": actor or settings.ADMIN_EMAIL, "created_at": now_iso(),
    })
    # keep last 100
    docs = await col("audit_logs").find().sort("created_at", -1).skip(100).to_list(None)
    if docs:
        await col("audit_logs").delete_many({"id": {"$in": [d["id"] for d in docs]}})


async def seed_sample_data(force: bool = False) -> dict:
    if not force and await col("licenses").count_documents({}) > 0:
        return {"seeded": False, "reason": "data already present"}

    if force:
        for c in ("customers", "licenses", "activations", "usage_logs", "subscription_plans", "audit_logs"):
            await col(c).delete_many({})

    now = datetime.now(timezone.utc)
    customers = [
        {"id": "c1", "name": "Rajesh Kumar", "email": "rajesh@idprints.in", "company": "ID Prints India", "phone": "+91 98765 43210", "role": "customer", "created_at": days(-210)},
        {"id": "c2", "name": "Sara Mendez", "email": "sara@cardpro.mx", "company": "CardPro Solutions", "phone": "+52 55 1234 5678", "role": "customer", "created_at": days(-180)},
        {"id": "c3", "name": "Daniel Owusu", "email": "daniel@swiftbadge.com", "company": "SwiftBadge Ltd", "phone": "+44 20 7946 0958", "role": "customer", "created_at": days(-150)},
        {"id": "c4", "name": "Mei Lin", "email": "mei@printhub.sg", "company": "PrintHub Asia", "phone": "+65 6123 4567", "role": "customer", "created_at": days(-120)},
        {"id": "c5", "name": "Omar Haddad", "email": "omar@gulfcards.ae", "company": "Gulf Cards", "phone": "+971 4 123 4567", "role": "customer", "created_at": days(-90)},
        {"id": "c6", "name": "Lucia Rossi", "email": "lucia@bellacard.it", "company": "BellaCard Studio", "phone": "+39 06 1234 567", "role": "customer", "created_at": days(-60)},
    ]
    await col("customers").insert_many([dict(c) for c in customers])

    plans = [
        {"id": "p1", "name": "Trial", "price": 0, "duration_days": 14, "device_limit": 1, "features": dict(FEATURE_PRESETS["Trial"])},
        {"id": "p2", "name": "Basic", "price": 49, "duration_days": 30, "device_limit": 2, "features": dict(FEATURE_PRESETS["Monthly"])},
        {"id": "p3", "name": "Professional", "price": 199, "duration_days": 365, "device_limit": 3, "features": dict(FEATURE_PRESETS["Yearly"])},
        {"id": "p4", "name": "Enterprise", "price": 999, "duration_days": 365, "device_limit": 25, "features": dict(FEATURE_PRESETS["Enterprise"])},
    ]
    await col("subscription_plans").insert_many([dict(p) for p in plans])

    setup = [
        ("c1", "Yearly", "active", -120), ("c1", "Monthly", "active", -20),
        ("c2", "Enterprise", "active", -200), ("c3", "Lifetime", "active", -300),
        ("c3", "Yearly", "expired", -400), ("c4", "Yearly", "active", -350),
        ("c4", "Trial", "expired", -30), ("c5", "Monthly", "blocked", -45),
        ("c5", "Yearly", "active", -355), ("c6", "Trial", "active", -5),
        ("c6", "Enterprise", "active", -60), ("c2", "Monthly", "active", -355),
    ]
    licenses, activations, usage = [], [], []
    for idx, (cid, ltype, status, start_off) in enumerate(setup):
        dur = TYPE_DURATION[ltype]
        expires = None if dur is None else days(start_off + dur)
        plan_name = {"Yearly": "Professional", "Enterprise": "Enterprise", "Monthly": "Basic"}.get(ltype, "Trial")
        plan = next((p for p in plans if p["name"] == plan_name), None)
        lic = {
            "id": f"l{idx + 1}", "license_key": generate_license_key(ltype), "license_type": ltype,
            "status": status, "device_limit": TYPE_DEVICE_LIMIT[ltype], "features": dict(FEATURE_PRESETS[ltype]),
            "customer_id": cid, "plan_id": plan["id"] if plan else None, "created_at": days(start_off),
            "start_date": days(start_off), "expires_at": expires, "renewal_due_date": expires,
        }
        licenses.append(lic)
        devices = min(lic["device_limit"], 1 + (idx % 3))
        for d in range(devices):
            mid = "MID-" + new_id().upper()[:8]
            activations.append({
                "id": new_id("a"), "license_id": lic["id"], "machine_id": mid,
                "machine_name": MACHINE_NAMES[(idx + d) % len(MACHINE_NAMES)],
                "software_version": f"3.{1 + (d % 4)}.0",
                "activated_at": days(start_off + 1), "last_seen": days(-(idx % 3)),
            })
            for day in range(30):
                for ev in ("CARD_GENERATED", "CARD_PRINTED", "PDF_IMPORTED", "BATCH_JOB"):
                    base = {"CARD_GENERATED": 40, "CARD_PRINTED": 25, "PDF_IMPORTED": 4, "BATCH_JOB": 2}[ev]
                    cnt = max(0, round(base * random.random() * (1 if status == "active" else 0.2)))
                    if cnt > 0:
                        usage.append({
                            "id": new_id("u"), "license_id": lic["id"], "machine_id": mid,
                            "event_type": ev, "event_count": cnt, "created_at": days(-day),
                        })

    await col("licenses").insert_many([dict(x) for x in licenses])
    if activations:
        await col("activations").insert_many([dict(x) for x in activations])
    if usage:
        await col("usage_logs").insert_many([dict(x) for x in usage])

    await col("audit_logs").insert_many([
        {"id": new_id("aud"), "action": "LICENSE_BLOCKED", "detail": "License for Gulf Cards blocked (payment overdue)", "actor": settings.ADMIN_EMAIL, "created_at": days(-3)},
        {"id": new_id("aud"), "action": "LICENSE_CREATED", "detail": "Yearly license created for ID Prints India", "actor": settings.ADMIN_EMAIL, "created_at": days(-20)},
    ])
    return {"seeded": True, "licenses": len(licenses), "customers": len(customers)}
