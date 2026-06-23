# PVC Card Generator — License Management Platform

A production-ready commercial licensing platform for PVC Card Generator desktop software.
It handles license key generation, activation, device binding, validation, expiry &
yearly renewal tracking, remote disable (blocking), feature unlocking, usage analytics,
desktop heartbeat, subscription plan management and customer management.

> **Phase 1 + Phase 2.** No payment gateway, offline activation, or customer
> self-service portal — but the schema and UI carry placeholders for future integration.

---

## Live Admin Dashboard (this repo's build)

The repository ships with a **fully interactive admin dashboard** built in
**React + Vite + TailwindCSS + Recharts**. It runs entirely in the browser using a
persistent in-browser store that simulates the FastAPI backend, so you can explore the
full product without infrastructure.

```bash
npm install
npm run dev      # local dev
npm run build    # production build (dist/index.html)
```

**Demo login:** `admin@pvclicense.io` / `admin123`

Pages: Dashboard · Licenses · Activations · Customers · Usage Analytics ·
Subscription Plans · Desktop Simulator · Settings.

The **Desktop Simulator** page lets you fire real `/activate`, `/validate`,
`/heartbeat` and `/usage` calls against the simulated engine to see device binding,
device limits, remote disable and feature unlocking in action.

---

## Backend (FastAPI) — `/backend`

| Layer        | Tech                          |
|--------------|-------------------------------|
| API          | FastAPI / Python 3.12         |
| Database     | PostgreSQL                    |
| ORM          | SQLAlchemy 2.0                |
| Auth         | JWT (python-jose) + bcrypt    |
| Cache / RL   | Redis + slowapi rate limiting |
| Docs         | Swagger `/docs`, ReDoc `/redoc` |

### Key files
```
backend/app/main.py                       FastAPI app + all routes
backend/app/models.py                      SQLAlchemy models (schema)
backend/app/schemas.py                     Pydantic validation
backend/app/auth.py                        JWT + bcrypt
backend/app/database.py                    Engine / session
backend/app/services/license_generator.py  Secure key generation
backend/app/services/license_service.py    Activation/validation/heartbeat/usage
backend/seed.py                            Seed admin + plans
```

### Endpoints
**Desktop:** `POST /activate` · `POST /validate` · `POST /heartbeat` · `POST /usage`
**Auth:** `POST /auth/login`
**Admin (JWT):** `/admin/licenses` (CRUD, renew, status, reset-devices),
`/admin/customers`, `/admin/plans`, `/admin/metrics`

### License key format
`PVC-1Y-ABCD-EFGH-IJKL` — cryptographically random (`secrets`), unique, non-sequential.
Prefixes: `TR` Trial · `MO` Monthly · `1Y` Yearly · `LT` Lifetime · `EN` Enterprise.

---

## Run the full stack with Docker

```bash
docker compose up --build
docker compose exec backend python seed.py   # create admin + plans
```

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8000        |
| Swagger  | http://localhost:8000/docs   |
| Postgres | localhost:5432               |
| Redis    | localhost:6379               |

---

## Security
JWT auth · bcrypt password hashing · Redis rate limiting · Pydantic input validation ·
environment variables · audit logging · HTTPS ready.

## Database tables
`users` · `licenses` · `activations` · `usage_logs` · `subscription_plans` · `audit_logs`
— feature flags stored as JSON in `features_json` for flexible feature unlocking.
