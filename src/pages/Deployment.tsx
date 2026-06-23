import { useState } from "react";
import { Container, Database, Server, Layers, Code2, FileText, Copy, CheckCheck } from "lucide-react";
import { Card } from "../components/ui";

const FILES: Record<string, { icon: any; lang: string; content: string }> = {
  "docker-compose.yml": {
    icon: Container, lang: "yaml",
    content: `version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       \${POSTGRES_DB:-pvclm}
      POSTGRES_USER:     \${POSTGRES_USER:-pvclm}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-changeme}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-pvclm}"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_started }
    environment:
      DATABASE_URL: postgresql+psycopg://\${POSTGRES_USER:-pvclm}:\${POSTGRES_PASSWORD:-changeme}@postgres:5432/\${POSTGRES_DB:-pvclm}
      REDIS_URL:    redis://redis:6379/0
      JWT_SECRET:   \${JWT_SECRET:-replace-me-in-production}
      JWT_ALG:      HS256
      ENV:          production
    ports:
      - "8000:8000"
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

  frontend:
    build: ./frontend
    restart: unless-stopped
    depends_on: [backend]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports:
      - "3000:3000"

volumes:
  pg_data:
`,
  },
  "backend/app/main.py": {
    icon: Server, lang: "python",
    content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.routers import auth, licenses, activations, customers, plans, analytics, runtime
from app.db import init_db

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="PVC Card Generator — License Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Runtime endpoints called by the desktop client.
app.include_router(runtime.router, tags=["runtime"])

# Admin console endpoints (JWT protected).
app.include_router(auth.router,        prefix="/auth",                tags=["auth"])
app.include_router(licenses.router,    prefix="/admin/licenses",      tags=["admin · licenses"])
app.include_router(activations.router, prefix="/admin/activations",   tags=["admin · activations"])
app.include_router(customers.router,   prefix="/admin/customers",     tags=["admin · customers"])
app.include_router(plans.router,       prefix="/admin/plans",         tags=["admin · plans"])
app.include_router(analytics.router,   prefix="/admin/analytics",     tags=["admin · analytics"])


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
`,
  },
  "backend/app/models.py": {
    icon: Database, lang: "python",
    content: `from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, ForeignKey, JSON, Enum, Text,
)
from sqlalchemy.orm import relationship
import uuid, enum
from app.db import Base


def _uid() -> str:
    return uuid.uuid4().hex


class LicenseType(str, enum.Enum):
    Trial = "Trial"; Monthly = "Monthly"; Yearly = "Yearly"
    Lifetime = "Lifetime"; Enterprise = "Enterprise"


class LicenseStatus(str, enum.Enum):
    active = "active"; expired = "expired"; blocked = "blocked"


class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=_uid)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    company       = Column(String, nullable=False)
    phone         = Column(String)
    role          = Column(String, default="customer")
    password_hash = Column(String)   # NULL for customers (no portal yet)
    created_at    = Column(DateTime, default=datetime.utcnow)


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id            = Column(String, primary_key=True, default=_uid)
    name          = Column(String, nullable=False)
    price         = Column(Integer, default=0)
    duration_days = Column(Integer, default=30)   # 0 = lifetime
    device_limit  = Column(Integer, default=1)
    features_json = Column(JSON, default=dict)
    description   = Column(Text)


class License(Base):
    __tablename__ = "licenses"
    id                = Column(String, primary_key=True, default=_uid)
    license_key       = Column(String, unique=True, index=True, nullable=False)
    customer_id       = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    plan_id           = Column(String, ForeignKey("subscription_plans.id"))
    license_type      = Column(Enum(LicenseType), default=LicenseType.Trial)
    status            = Column(Enum(LicenseStatus), default=LicenseStatus.active, index=True)
    device_limit      = Column(Integer, default=1)
    features_json     = Column(JSON, default=dict)
    created_at        = Column(DateTime, default=datetime.utcnow)
    start_date        = Column(DateTime, default=datetime.utcnow)
    expires_at        = Column(DateTime, nullable=True)            # NULL = lifetime
    renewal_due_date  = Column(DateTime, nullable=True)

    customer    = relationship("User")
    activations = relationship("Activation", cascade="all, delete-orphan")


class Activation(Base):
    __tablename__ = "activations"
    id               = Column(String, primary_key=True, default=_uid)
    license_id       = Column(String, ForeignKey("licenses.id", ondelete="CASCADE"), index=True)
    machine_id       = Column(String, index=True, nullable=False)
    machine_name     = Column(String)
    software_version = Column(String)
    os               = Column(String)
    activated_at     = Column(DateTime, default=datetime.utcnow)
    last_seen        = Column(DateTime, default=datetime.utcnow, index=True)


class UsageLog(Base):
    __tablename__ = "usage_logs"
    id          = Column(String, primary_key=True, default=_uid)
    license_id  = Column(String, ForeignKey("licenses.id", ondelete="CASCADE"), index=True)
    machine_id  = Column(String, index=True)
    event_type  = Column(String, index=True)   # CARD_GENERATED, CARD_PRINTED, ...
    event_count = Column(Integer, default=1)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id         = Column(String, primary_key=True, default=_uid)
    actor      = Column(String, index=True)
    action     = Column(String, index=True)
    target     = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
`,
  },
  "backend/app/services/license_key.py": {
    icon: Code2, lang: "python",
    content: `import secrets
from app.models import LicenseType

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"     # 32 symbols, no 0/O/1/I
TYPE_CODE = {
    LicenseType.Trial:      "TR",
    LicenseType.Monthly:    "MO",
    LicenseType.Yearly:     "1Y",
    LicenseType.Lifetime:   "LT",
    LicenseType.Enterprise: "EN",
}


def _block(n: int = 4) -> str:
    """Cryptographically-random block of n base32 characters."""
    return "".join(ALPHABET[secrets.randbelow(len(ALPHABET))] for _ in range(n))


def generate_license_key(t: LicenseType) -> str:
    """
    Returns a non-sequential, cryptographically-secure license key:
        PVC-1Y-ABCD-EFGH-IJKL
    """
    return f"PVC-{TYPE_CODE[t]}-{_block()}-{_block()}-{_block()}"
`,
  },
  "backend/app/routers/runtime.py": {
    icon: Server, lang: "python",
    content: `"""
Runtime endpoints invoked by the desktop client (PVC Card Generator).
Public — no JWT required — but rate-limited and validated.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets, hashlib, json

from app.db import get_db
from app.models import License, LicenseStatus, Activation, UsageLog
from app.cache import redis_client
from app.main import limiter

router = APIRouter()


# ---------- Pydantic schemas ----------
class ActivateIn(BaseModel):
    license_key: str
    machine_id: str
    machine_name: str
    software_version: str


class ValidateIn(BaseModel):
    license_key: str
    machine_id: str


class HeartbeatIn(BaseModel):
    license_key: str
    machine_id: str
    software_version: str


class UsageIn(BaseModel):
    license_key: str
    machine_id: str
    event_type: str
    event_count: int = 1


# ---------- Helpers ----------
def _resolve(db: Session, key: str) -> License:
    lic = db.query(License).filter(License.license_key == key).first()
    if not lic:
        raise HTTPException(404, "License not found")
    return lic


def _status_after_expiry(lic: License) -> LicenseStatus:
    if lic.status == LicenseStatus.blocked:
        return LicenseStatus.blocked
    if lic.expires_at and lic.expires_at < datetime.utcnow():
        return LicenseStatus.expired
    return LicenseStatus.active


# ---------- POST /activate ----------
@router.post("/activate")
@limiter.limit("20/minute")
def activate(payload: ActivateIn, request: Request, db: Session = Depends(get_db)):
    lic = _resolve(db, payload.license_key)
    st = _status_after_expiry(lic)
    if st == LicenseStatus.blocked: raise HTTPException(403, "License is blocked")
    if st == LicenseStatus.expired: raise HTTPException(403, "License has expired")

    existing = db.query(Activation).filter(Activation.license_id == lic.id).all()
    if not any(a.machine_id == payload.machine_id for a in existing):
        if len(existing) >= lic.device_limit:
            raise HTTPException(409, f"Device limit ({lic.device_limit}) reached")
        db.add(Activation(
            license_id=lic.id,
            machine_id=payload.machine_id,
            machine_name=payload.machine_name,
            software_version=payload.software_version,
            os="unknown",
        ))
        db.commit()

    token = secrets.token_urlsafe(24)
    return {
        "activation_token": token,
        "license_status":   st.value,
        "expiry_date":      lic.expires_at.isoformat() if lic.expires_at else None,
        "enabled_features": lic.features_json or {},
    }


# ---------- POST /validate ----------
@router.post("/validate")
@limiter.limit("60/minute")
def validate(payload: ValidateIn, request: Request, db: Session = Depends(get_db)):
    cache_key = f"validate:{payload.license_key}:{payload.machine_id}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    lic = _resolve(db, payload.license_key)
    st = _status_after_expiry(lic)
    out = {
        "valid":    st == LicenseStatus.active,
        "expired":  st == LicenseStatus.expired,
        "blocked":  st == LicenseStatus.blocked,
        "disabled": st == LicenseStatus.blocked,
        "feature_set": lic.features_json or {},
    }
    redis_client.setex(cache_key, 60, json.dumps(out))
    return out


# ---------- POST /heartbeat ----------
@router.post("/heartbeat")
@limiter.limit("60/minute")
def heartbeat(payload: HeartbeatIn, request: Request, db: Session = Depends(get_db)):
    lic = _resolve(db, payload.license_key)
    if lic.status == LicenseStatus.blocked:
        return {"status": "blocked"}     # desktop MUST lock

    act = db.query(Activation).filter(
        Activation.license_id == lic.id,
        Activation.machine_id == payload.machine_id,
    ).first()
    if act:
        act.last_seen = datetime.utcnow()
        act.software_version = payload.software_version
        db.commit()

    return {
        "license_status":   _status_after_expiry(lic).value,
        "expiry_date":      lic.expires_at.isoformat() if lic.expires_at else None,
        "enabled_features": lic.features_json or {},
    }


# ---------- POST /usage ----------
@router.post("/usage")
@limiter.limit("120/minute")
def usage(payload: UsageIn, request: Request, db: Session = Depends(get_db)):
    lic = _resolve(db, payload.license_key)
    db.add(UsageLog(
        license_id=lic.id,
        machine_id=payload.machine_id,
        event_type=payload.event_type,
        event_count=payload.event_count,
    ))
    db.commit()
    return {"accepted": True}
`,
  },
  "backend/app/auth.py": {
    icon: Code2, lang: "python",
    content: `from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import os

SECRET = os.getenv("JWT_SECRET", "dev-only")
ALG    = os.getenv("JWT_ALG", "HS256")
TTL_S  = 3600

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(p: str) -> str:           return pwd.hash(p)
def verify_password(p: str, h: str) -> bool: return pwd.verify(p, h)


def create_access_token(sub: str) -> str:
    return jwt.encode(
        {"sub": sub, "exp": datetime.utcnow() + timedelta(seconds=TTL_S)},
        SECRET, algorithm=ALG,
    )


def current_admin(token: str = Depends(oauth2)) -> str:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALG])
        return payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(401, "Invalid or expired token")
`,
  },
  "backend/Dockerfile": {
    icon: Container, lang: "dockerfile",
    content: `FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \\
        build-essential libpq-dev curl && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
  },
  "backend/requirements.txt": {
    icon: FileText, lang: "text",
    content: `fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
psycopg[binary]==3.2.3
pydantic==2.9.2
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
redis==5.0.8
slowapi==0.1.9
alembic==1.13.3
python-dotenv==1.0.1
`,
  },
  ".env.example": {
    icon: FileText, lang: "ini",
    content: `# PostgreSQL
POSTGRES_DB=pvclm
POSTGRES_USER=pvclm
POSTGRES_PASSWORD=changeme-in-production

# JWT
JWT_SECRET=replace-with-openssl-rand-hex-32
JWT_ALG=HS256

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
`,
  },
};

export default function Deployment() {
  const [selected, setSelected] = useState<string>("docker-compose.yml");
  const [copied, setCopied] = useState(false);
  const f = FILES[selected];

  const copy = () => {
    navigator.clipboard.writeText(f.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Deployment & Backend Code</h1>
        <p className="text-sm text-slate-500 mt-0.5">Reference source for the FastAPI service, SQLAlchemy schema, and Docker Compose stack.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Stack icon={Layers}    title="Backend"    items={["FastAPI · Python 3.12", "SQLAlchemy 2.0 + Alembic", "JWT (HS256) · bcrypt", "SlowAPI rate limiting"]} />
        <Stack icon={Database}  title="Datastore"  items={["PostgreSQL 16", "Redis 7 (cache + rate limiter)", "Indexed by license_key", "Cascading deletes"]} />
        <Stack icon={Container} title="Deployment" items={["Docker Compose (4 services)", "Healthchecks", "HTTPS-ready (TLS terminator)", "Single-command bootstrap"]} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-3 p-2">
          <div className="space-y-0.5">
            {Object.keys(FILES).map(name => {
              const Icon = FILES[name].icon;
              const active = name === selected;
              return (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition ${active ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="mono text-xs truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-9 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <f.icon className="h-4 w-4 text-slate-500" />
              <span className="mono text-xs text-slate-700">{selected}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{f.lang}</span>
            </div>
            <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">
              {copied ? <><CheckCheck className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <pre className="text-xs leading-relaxed bg-slate-900 text-slate-100 p-5 overflow-x-auto mono max-h-[calc(100vh-340px)]">{f.content}</pre>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <h3 className="font-semibold text-slate-900 mb-2">Quick start</h3>
        <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mono leading-relaxed">{`# 1. Clone & configure
cp .env.example .env
openssl rand -hex 32   # paste into JWT_SECRET

# 2. Bring up the stack
docker compose up -d --build

# 3. Run migrations & seed default plans
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed

# 4. Open the admin console
open http://localhost:3000

# Swagger UI:        http://localhost:8000/docs
# Postgres:          postgres://pvclm:***@localhost:5432/pvclm
# Redis CLI:         docker compose exec redis redis-cli`}</pre>
      </Card>
    </div>
  );
}

function Stack({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon className="h-4.5 w-4.5" /></div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-1.5 text-sm text-slate-600">
        {items.map(i => <li key={i} className="flex gap-2"><span className="text-indigo-500">›</span> {i}</li>)}
      </ul>
    </Card>
  );
}
