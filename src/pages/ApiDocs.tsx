import { useState } from "react";
import { Lock, ChevronRight } from "lucide-react";
import { Card, Badge } from "../components/ui";

type Endpoint = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  auth: boolean;
  desc: string;
  request?: string;
  response: string;
};

const ENDPOINTS: { group: string; items: Endpoint[] }[] = [
  {
    group: "Authentication",
    items: [
      {
        method: "POST", path: "/auth/login", title: "Admin login", auth: false,
        desc: "Exchange admin credentials for a JWT access token. Bcrypt password verification + Redis rate limit (10/min/IP).",
        request: `{
  "email": "admin@pvclm.io",
  "password": "••••••••"
}`,
        response: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}`,
      },
    ],
  },
  {
    group: "License Lifecycle (called by Desktop client)",
    items: [
      {
        method: "POST", path: "/activate", title: "Activate license on device", auth: false,
        desc: "Binds a license_key to a machine fingerprint. Validates existence, expiry, blocked status, and device_limit. Returns activation_token + enabled feature flags.",
        request: `{
  "license_key":      "PVC-1Y-ABCD-EFGH-IJKL",
  "machine_id":       "sha256:9a4f...",
  "machine_name":     "DESKTOP-OPS-1042",
  "software_version": "2.6.0"
}`,
        response: `{
  "activation_token": "eyJraWQiOiJsaWMtc2lnIn0...",
  "license_status":   "active",
  "expiry_date":      "2026-08-15T00:00:00Z",
  "enabled_features": {
    "batch_processing": true,
    "card_history": true,
    "analytics": true,
    "multi_operator": false,
    "pdf_import": true,
    "cloud_sync": true
  }
}`,
      },
      {
        method: "POST", path: "/validate", title: "Validate license + device pair", auth: false,
        desc: "Lightweight check used by the desktop app at startup. Cached in Redis for 60s per (license_key, machine_id).",
        request: `{
  "license_key": "PVC-1Y-ABCD-EFGH-IJKL",
  "machine_id":  "sha256:9a4f..."
}`,
        response: `{
  "valid":     true,
  "expired":   false,
  "blocked":   false,
  "disabled":  false,
  "feature_set": { "batch_processing": true, "analytics": true, "...": "..." }
}`,
      },
      {
        method: "POST", path: "/heartbeat", title: "24-hour heartbeat", auth: false,
        desc: "Desktop client beacons every 24h. Server updates activations.last_seen. If the license has been blocked, response is { \"status\": \"blocked\" } and the desktop client MUST lock premium features.",
        request: `{
  "license_key":      "PVC-1Y-ABCD-EFGH-IJKL",
  "machine_id":       "sha256:9a4f...",
  "software_version": "2.6.0"
}`,
        response: `{
  "license_status":   "active",
  "expiry_date":      "2026-08-15T00:00:00Z",
  "enabled_features": { "...": "..." }
}

// If blocked:
{ "status": "blocked" }`,
      },
      {
        method: "POST", path: "/usage", title: "Submit usage event", auth: false,
        desc: "Telemetry endpoint. Events are batched and inserted into the UsageLogs table for analytics.",
        request: `{
  "license_key": "PVC-1Y-ABCD-EFGH-IJKL",
  "machine_id":  "sha256:9a4f...",
  "event_type":  "CARD_GENERATED",  // or CARD_PRINTED | PDF_IMPORTED | BATCH_JOB
  "event_count": 47
}`,
        response: `{ "accepted": true }`,
      },
    ],
  },
  {
    group: "Admin — Licenses",
    items: [
      {
        method: "GET",  path: "/admin/licenses", title: "List licenses", auth: true,
        desc: "Paginated list with filters: status, license_type, customer_id, expires_before.",
        response: `{ "items": [ /* License[] */ ], "total": 248, "page": 1 }`,
      },
      {
        method: "POST", path: "/admin/licenses", title: "Create license", auth: true,
        desc: "Generates a cryptographic key (crypto.token_urlsafe + base32 reformat) and persists the row.",
        request: `{
  "customer_id":  "usr_3f8a...",
  "license_type": "Yearly",
  "device_limit": 5,
  "duration_days": 365,
  "features": { /* feature flag map */ },
  "plan_id": "plan_pro"
}`,
        response: `{ "id": "lic_a4f...", "license_key": "PVC-1Y-XXXX-XXXX-XXXX", "...": "..." }`,
      },
      { method: "PUT",    path: "/admin/licenses/{id}",          title: "Update license",      auth: true, desc: "Partial update of features, device_limit, expiry, etc.", response: `{ "ok": true }` },
      { method: "POST",   path: "/admin/licenses/{id}/block",    title: "Block license",       auth: true, desc: "Sets status=blocked. Desktop clients lock on next heartbeat.", response: `{ "status": "blocked" }` },
      { method: "POST",   path: "/admin/licenses/{id}/unblock",  title: "Unblock license",     auth: true, desc: "Restores status to active/expired (whichever applies).", response: `{ "status": "active" }` },
      { method: "POST",   path: "/admin/licenses/{id}/renew",    title: "Renew / extend",      auth: true, desc: "Adds `days` to the current expiry (or now, if already expired).", request: `{ "days": 365 }`, response: `{ "expires_at": "2027-08-15T00:00:00Z" }` },
      { method: "POST",   path: "/admin/licenses/{id}/reset",    title: "Reset device bindings", auth: true, desc: "Deletes all rows from the Activations table for this license.", response: `{ "removed": 5 }` },
      { method: "DELETE", path: "/admin/licenses/{id}",          title: "Delete license",      auth: true, desc: "Hard-deletes the license plus cascaded activations + usage rows.", response: `{ "ok": true }` },
    ],
  },
  {
    group: "Admin — Customers, Plans, Analytics",
    items: [
      { method: "GET",    path: "/admin/customers",         title: "List customers",        auth: true, desc: "Filterable list of customer accounts.", response: `{ "items": [ /* Customer[] */ ] }` },
      { method: "POST",   path: "/admin/customers",         title: "Create customer",       auth: true, desc: "", response: `{ "id": "usr_...", "...": "..." }` },
      { method: "PUT",    path: "/admin/customers/{id}",    title: "Update customer",       auth: true, desc: "", response: `{ "ok": true }` },
      { method: "DELETE", path: "/admin/customers/{id}",    title: "Delete customer",       auth: true, desc: "", response: `{ "ok": true }` },
      { method: "GET",    path: "/admin/plans",             title: "List subscription plans", auth: true, desc: "", response: `{ "items": [ /* SubscriptionPlan[] */ ] }` },
      { method: "POST",   path: "/admin/plans",             title: "Create plan",           auth: true, desc: "", response: `{ "id": "plan_..." }` },
      { method: "GET",    path: "/admin/analytics/summary", title: "Dashboard metrics",     auth: true, desc: "Aggregated counters for the dashboard widgets.", response: `{ "total": 248, "active": 201, "expired": 31, "blocked": 16, "activations": 412, "generated_today": 4821, "printed_today": 3104 }` },
      { method: "GET",    path: "/admin/analytics/series",  title: "Time-series analytics", auth: true, desc: "?range=30 — returns daily counts (generated, printed, activations, etc.).", response: `[{ "date": "2026-07-10", "generated": 412, "printed": 311, "activations": 4 }, ...]` },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-emerald-100 text-emerald-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

export default function ApiDocs() {
  const [selected, setSelected] = useState<Endpoint>(ENDPOINTS[1].items[0]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">API Reference</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Base URL: <code className="mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">https://api.pvclm.io/v1</code>
          {" · "}Auto-generated Swagger UI at <code className="mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/docs</code>
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4 p-2 overflow-hidden">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {ENDPOINTS.map(g => (
              <div key={g.group} className="mb-2">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">{g.group}</div>
                {g.items.map(e => (
                  <button
                    key={e.path + e.method}
                    onClick={() => setSelected(e)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition mb-0.5 ${selected === e ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${methodColors[e.method]}`}>{e.method}</span>
                    <span className="mono text-xs text-slate-700 flex-1 truncate">{e.path}</span>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-8 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColors[selected.method]}`}>{selected.method}</span>
            <code className="mono text-sm text-slate-900">{selected.path}</code>
            {selected.auth ? <Badge tone="rose"><Lock className="h-3 w-3 inline mr-1" /> JWT required</Badge> : <Badge tone="emerald">Public</Badge>}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">{selected.title}</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{selected.desc}</p>

          {selected.request && (
            <div className="mt-5">
              <div className="text-xs font-semibold text-slate-700 mb-2">Request body</div>
              <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mono leading-relaxed">{selected.request}</pre>
            </div>
          )}

          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-700 mb-2">Response</div>
            <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mono leading-relaxed">{selected.response}</pre>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500">
            <strong className="text-slate-700">Security:</strong> HTTPS-only · JWT (HS256, 1h TTL) · bcrypt password hashing · Redis-backed rate limiting (per-IP and per-license_key) · Pydantic v2 input validation · Audit logged via SQLAlchemy event listener.
          </div>
        </Card>
      </div>
    </div>
  );
}
