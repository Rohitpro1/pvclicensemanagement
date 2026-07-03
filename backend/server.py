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

app.include_router(api_router)


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
