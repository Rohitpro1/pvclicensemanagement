from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.MONGO_DB]
    # Helpful indexes
    await _db.users.create_index("email", unique=True)
    await _db.licenses.create_index("license_key", unique=True)
    await _db.activations.create_index([("license_id", 1), ("machine_id", 1)])
    await _db.usage_logs.create_index("created_at")


async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    assert _db is not None, "Database not initialised. Did startup run?"
    return _db


# Collection shortcuts
def col(name: str):
    return get_db()[name]
