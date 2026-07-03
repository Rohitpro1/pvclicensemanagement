import os
import sys

# Ensure backend directory is in sys.path for Vercel serverless environment
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import close_mongo_connection, connect_to_mongo
from routes import (activation_routes, analytics_routes, auth_routes,
                    customer_routes, db_routes, license_routes, plan_routes,
                    settings_routes)
from services.seed_service import ensure_admin, seed_sample_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    await ensure_admin()
    await seed_sample_data()  # only seeds if collections are empty
    yield
    await close_mongo_connection()


app = FastAPI(
    title="PVC License Manager API",
    description="Commercial licensing platform for PVC Card Generator desktop software.",
    version="2.0.0",
    lifespan=lifespan,
)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

_db_setup_done = False

class DatabaseSetupMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        global _db_setup_done
        if not _db_setup_done:
            _db_setup_done = True
            from database import get_db
            db = get_db()
            try:
                await db.users.create_index("email", unique=True)
                await db.licenses.create_index("license_key", unique=True)
                await db.activations.create_index([("license_id", 1), ("machine_id", 1)])
                await db.usage_logs.create_index("created_at")
            except Exception as ex:
                print(f"[Database] Index creation ignored/failed: {ex}")

            try:
                from services.seed_service import ensure_admin, seed_sample_data
                await ensure_admin()
                await seed_sample_data()
                print("[Database] Lazy Vercel database setup completed.")
            except Exception as ex:
                print(f"[Database] Lazy Vercel setup error: {ex}")
        return await call_next(request)

app.add_middleware(DatabaseSetupMiddleware)

origins = ["*"] if settings.CORS_ORIGINS.strip() == "*" else [
    o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"service": "PVC License Manager API", "status": "ok", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# API base router
api_router = APIRouter(prefix="/api")

# Version 1 API routes (device activation) under /api/v1
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(activation_routes.router)

api_router.include_router(auth_routes.router)
api_router.include_router(db_routes.router)
api_router.include_router(license_routes.router)
api_router.include_router(v1_router)
api_router.include_router(customer_routes.router)
api_router.include_router(plan_routes.router)
api_router.include_router(analytics_routes.router)
api_router.include_router(settings_routes.router)

@api_router.get("/debug-status")
async def debug_status():
    from config import settings
    from database import get_db, _use_mock
    import traceback
    
    raw_uri = settings.MONGO_URI or ""
    redacted_uri = raw_uri
    if "@" in raw_uri:
        try:
            parts = raw_uri.split("@")
            prefix = parts[0]
            suffix = parts[1]
            if ":" in prefix:
                sub_parts = prefix.split(":")
                redacted_uri = f"{sub_parts[0]}:{sub_parts[1]}:****@{suffix}"
        except Exception:
            redacted_uri = "invalid-uri-format"
            
    res = {
        "mongo_uri": redacted_uri,
        "mongo_db": settings.MONGO_DB,
        "use_mock": _use_mock,
    }
    
    try:
        db = get_db()
        users_count = await db.users.count_documents({})
        licenses_count = await db.licenses.count_documents({})
        res["users_count"] = users_count
        res["licenses_count"] = licenses_count
        
        user_list = []
        async for u in db.users.find({}):
            u_copy = dict(u)
            u_copy.pop("password_hash", None)
            if "_id" in u_copy:
                u_copy["_id"] = str(u_copy["_id"])
            user_list.append(u_copy)
        res["users"] = user_list
    except Exception as e:
        res["error"] = str(e)
        res["traceback"] = traceback.format_exc()
        
    return res

app.include_router(api_router)


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
