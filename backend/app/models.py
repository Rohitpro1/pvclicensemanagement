"""SQLAlchemy models for the PVC Card Generator licensing platform."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    company = Column(String)
    phone = Column(String)
    role = Column(String, default="customer")  # customer | admin
    password_hash = Column(String)  # bcrypt; nullable for non-portal customers
    created_at = Column(DateTime, default=datetime.utcnow)

    licenses = relationship("License", back_populates="customer")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    price = Column(Float, default=0)
    duration_days = Column(Integer, default=30)  # 0 = lifetime
    device_limit = Column(Integer, default=1)
    features_json = Column(JSON, default=dict)


class License(Base):
    __tablename__ = "licenses"

    id = Column(String, primary_key=True, default=_uuid)
    license_key = Column(String, unique=True, index=True, nullable=False)
    license_type = Column(String, nullable=False)  # Trial|Monthly|Yearly|Lifetime|Enterprise
    status = Column(String, default="active")  # active|expired|blocked|disabled
    device_limit = Column(Integer, default=1)
    features_json = Column(JSON, default=dict)

    customer_id = Column(String, ForeignKey("users.id"), nullable=True)
    plan_id = Column(String, ForeignKey("subscription_plans.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    start_date = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # null = lifetime
    renewal_due_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    customer = relationship("User", back_populates="licenses")
    activations = relationship("Activation", back_populates="license", cascade="all, delete-orphan")


class Activation(Base):
    __tablename__ = "activations"

    id = Column(String, primary_key=True, default=_uuid)
    license_id = Column(String, ForeignKey("licenses.id"), nullable=False)
    machine_id = Column(String, index=True, nullable=False)
    machine_name = Column(String)
    software_version = Column(String)
    activated_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

    license = relationship("License", back_populates="activations")


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(String, primary_key=True, default=_uuid)
    license_id = Column(String, ForeignKey("licenses.id"), index=True, nullable=False)
    machine_id = Column(String, index=True)
    event_type = Column(String)  # CARD_GENERATED|CARD_PRINTED|PDF_IMPORTED|BATCH_JOB
    event_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_uuid)
    action = Column(String)
    detail = Column(Text)
    actor = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
