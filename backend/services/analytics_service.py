from collections import defaultdict
from datetime import datetime, timedelta, timezone

from database import col
from models.helpers import serialize
from services.license_service import effective_status


def _day_key(iso: str) -> str:
    return iso[:10]


async def overview() -> dict:
    licenses = await col("licenses").find().to_list(None)
    counts = {"total": len(licenses), "active": 0, "expired": 0, "blocked": 0, "disabled": 0}
    for l in licenses:
        counts[effective_status(l)] = counts.get(effective_status(l), 0) + 1

    today = datetime.now(timezone.utc).date().isoformat()
    usage = await col("usage_logs").find().to_list(None)
    cards_today = sum(u["event_count"] for u in usage if u["event_type"] == "CARD_GENERATED" and u["created_at"][:10] == today)
    printed_today = sum(u["event_count"] for u in usage if u["event_type"] == "CARD_PRINTED" and u["created_at"][:10] == today)

    activations = await col("activations").count_documents({})

    return {
        "counts": counts,
        "total_activations": activations,
        "cards_generated_today": cards_today,
        "cards_printed_today": printed_today,
    }


async def daily_series(days: int = 30) -> list[dict]:
    buckets = {}
    for i in range(days - 1, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        buckets[d] = {"date": d, "generated": 0, "printed": 0, "imported": 0, "batch": 0, "activations": 0}

    async for u in col("usage_logs").find():
        k = _day_key(u["created_at"])
        if k not in buckets:
            continue
        if u["event_type"] == "CARD_GENERATED":
            buckets[k]["generated"] += u["event_count"]
        elif u["event_type"] == "CARD_PRINTED":
            buckets[k]["printed"] += u["event_count"]
        elif u["event_type"] == "PDF_IMPORTED":
            buckets[k]["imported"] += u["event_count"]
        elif u["event_type"] == "BATCH_JOB":
            buckets[k]["batch"] += u["event_count"]

    async for a in col("activations").find():
        k = _day_key(a["activated_at"])
        if k in buckets:
            buckets[k]["activations"] += 1

    return list(buckets.values())


async def top_customers(limit: int = 8) -> list[dict]:
    licenses = {l["id"]: l for l in await col("licenses").find().to_list(None)}
    customers = {c["id"]: c for c in await col("customers").find().to_list(None)}
    totals = defaultdict(int)
    async for u in col("usage_logs").find():
        lic = licenses.get(u["license_id"])
        if not lic or not lic.get("customer_id"):
            continue
        totals[lic["customer_id"]] += u["event_count"]

    rows = []
    for cid, count in totals.items():
        c = customers.get(cid)
        rows.append({"id": cid, "name": c["company"] if c else "Unknown",
                     "contact": c["name"] if c else "", "count": count})
    rows.sort(key=lambda r: r["count"], reverse=True)
    return rows[:limit]


async def expiring(within_days: int = 30) -> list[dict]:
    now = datetime.now(timezone.utc)
    out = []
    async for l in col("licenses").find():
        if not l.get("expires_at") or effective_status(l) != "active":
            continue
        exp = datetime.fromisoformat(l["expires_at"].replace("Z", "+00:00"))
        d = (exp - now).days
        if 0 <= d <= within_days:
            out.append({"license": serialize(l), "days": d})
    out.sort(key=lambda x: x["days"])
    return out
