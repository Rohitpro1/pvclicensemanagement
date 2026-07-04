import os
import json
import asyncio
import re
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None
_use_mock: bool = False
_mock_db = None

# ---------- Transparent Mock MongoDB Implementation ----------

class MockCursor:
    def __init__(self, data):
        self._data = data
        self._index = 0

    def sort(self, key, direction=-1):
        reverse = (direction == -1)
        self._data = sorted(self._data, key=lambda x: x.get(key, "") or "", reverse=reverse)
        return self

    def skip(self, n):
        self._data = self._data[n:]
        return self

    async def to_list(self, limit):
        if limit is None:
            return self._data
        return self._data[:limit]

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self._data):
            res = self._data[self._index]
            self._index += 1
            return res
        else:
            raise StopAsyncIteration

class MockCollection:
    def __init__(self, name, db_path):
        self.name = name
        self.db_path = db_path

    def _load_data(self):
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_data(self, data):
        try:
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception:
            pass

    async def find_one(self, query, **kwargs):
        data = self._load_data()
        docs = data.get(self.name, [])
        matched_docs = []
        for doc in docs:
            match = True
            for k, v in query.items():
                if isinstance(v, dict) and "$regex" in v:
                    pattern = v["$regex"]
                    flags = re.IGNORECASE if "i" in v.get("$options", "") else 0
                    if not re.search(pattern, str(doc.get(k, "")), flags):
                        match = False
                        break
                else:
                    if doc.get(k) != v:
                        match = False
                        break
            if match:
                matched_docs.append(doc)

        if not matched_docs:
            return None

        sort_kwargs = kwargs.get("sort")
        if sort_kwargs:
            for key, direction in reversed(sort_kwargs):
                reverse = (direction == -1)
                matched_docs.sort(key=lambda x: x.get(key, "") or "", reverse=reverse)

        return matched_docs[0]

    async def insert_one(self, doc):
        data = self._load_data()
        if self.name not in data:
            data[self.name] = []
        data[self.name].append(doc)
        self._save_data(data)
        return doc

    async def insert_many(self, docs):
        data = self._load_data()
        if self.name not in data:
            data[self.name] = []
        data[self.name].extend(docs)
        self._save_data(data)
        return docs

    async def update_one(self, query, update):
        data = self._load_data()
        docs = data.get(self.name, [])
        found_idx = -1
        for idx, doc in enumerate(docs):
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                found_idx = idx
                break
        if found_idx != -1:
            doc = docs[found_idx]
            if "$set" in update:
                for k, v in update["$set"].items():
                    doc[k] = v
            self._save_data(data)
            return True
        return False

    async def delete_one(self, query):
        data = self._load_data()
        docs = data.get(self.name, [])
        new_docs = []
        deleted = False
        for doc in docs:
            if not deleted:
                match = True
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    deleted = True
                    continue
            new_docs.append(doc)
        data[self.name] = new_docs
        self._save_data(data)
        return deleted

    async def delete_many(self, query):
        data = self._load_data()
        docs = data.get(self.name, [])
        new_docs = []
        deleted_count = 0
        for doc in docs:
            match = True
            if isinstance(query.get("id"), dict) and "$in" in query["id"]:
                in_list = query["id"]["$in"]
                if doc.get("id") not in in_list:
                    match = False
            elif "license_id" in query and "machine_id" in query:
                if doc.get("license_id") != query["license_id"] or doc.get("machine_id") != query["machine_id"]:
                    match = False
            else:
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
            if match:
                deleted_count += 1
            else:
                new_docs.append(doc)
        data[self.name] = new_docs
        self._save_data(data)
        return deleted_count

    async def count_documents(self, query):
        data = self._load_data()
        docs = data.get(self.name, [])
        count = 0
        for doc in docs:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    def find(self, query=None):
        if query is None:
            query = {}
        data = self._load_data()
        docs = data.get(self.name, [])
        matched = []
        for doc in docs:
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                matched.append(doc)
        return MockCursor(matched)

    async def create_index(self, *args, **kwargs):
        pass

class MockDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        self._collections = {}

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = MockCollection(name, self.db_path)
        return self._collections[name]

# ---------- Connection Lifecycle ----------

async def connect_to_mongo() -> None:
    global _client, _db, _use_mock, _mock_db
    try:
        _client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
        await _client.admin.command('ping')
        _db = _client[settings.MONGO_DB]
        await _db.users.create_index("email", unique=True)
        await _db.licenses.create_index("license_key", unique=True)
        await _db.activations.create_index([("license_id", 1), ("machine_id", 1)])
        await _db.usage_logs.create_index("created_at")
        print("[Database] Successfully connected to MongoDB.")
    except Exception as e:
        print(f"[Database] MongoDB connection failed: {e}. Falling back to local Mock JSON database.")
        _use_mock = True
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_db.json")
        _mock_db = MockDatabase(db_path)

async def close_mongo_connection() -> None:
    global _client
    if _client:
        _client.close()

def get_db():
    global _client, _db, _use_mock, _mock_db
    if _use_mock:
        return _mock_db
    if _db is None:
        try:
            _client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
            _db = _client[settings.MONGO_DB]
        except Exception:
            _use_mock = True
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_db.json")
            _mock_db = MockDatabase(db_path)
            return _mock_db
    return _db

def col(name: str):
    return get_db()[name]
