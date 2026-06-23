"""Lightweight document helpers (MongoDB is schema-less; we normalise shapes here)."""
import secrets
import uuid
from datetime import datetime, timezone


def new_id(prefix: str = "") -> str:
    h = uuid.uuid4().hex[:16]
    return f"{prefix}_{h}" if prefix else h


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def serialize(doc: dict | None) -> dict | None:
    """Strip Mongo's internal _id so the JSON matches the frontend contract."""
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def serialize_many(docs) -> list[dict]:
    return [serialize(d) for d in docs]
