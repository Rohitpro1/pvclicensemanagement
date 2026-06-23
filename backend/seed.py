"""Seed an initial admin user + sample subscription plans.

Run once after the database is up:
    docker compose exec backend python seed.py
"""
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app import models
from app.services.license_generator import DEFAULT_FEATURES

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if not db.query(models.User).filter_by(email="admin@pvclicense.io").first():
    db.add(models.User(
        name="Admin User",
        email="admin@pvclicense.io",
        company="PVC License Platform",
        role="admin",
        password_hash=hash_password("admin123"),
    ))

plans = [
    ("Trial", 0, 14, 1, DEFAULT_FEATURES["Trial"]),
    ("Basic", 49, 30, 2, DEFAULT_FEATURES["Monthly"]),
    ("Professional", 199, 365, 3, DEFAULT_FEATURES["Yearly"]),
    ("Enterprise", 999, 365, 25, DEFAULT_FEATURES["Enterprise"]),
]
for name, price, dur, dl, feats in plans:
    if not db.query(models.SubscriptionPlan).filter_by(name=name).first():
        db.add(models.SubscriptionPlan(
            name=name, price=price, duration_days=dur, device_limit=dl, features_json=feats
        ))

db.commit()
db.close()
print("Seeded admin user (admin@pvclicense.io / admin123) and plans.")
