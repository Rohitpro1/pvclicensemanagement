import { ShieldCheck, Database, Server, RefreshCw, FileText, Lock, Activity } from "lucide-react";
import { useDB } from "../lib/hooks";
import { resetDB } from "../lib/store";
import { Button, Card } from "../components/ui";
import { fmtDateTime } from "../lib/format";

const ENDPOINTS = [
  { method: "POST", path: "/activate", desc: "License activation + device binding" },
  { method: "POST", path: "/validate", desc: "Validate license & feature set" },
  { method: "POST", path: "/heartbeat", desc: "24h heartbeat, returns status (locks if blocked)" },
  { method: "POST", path: "/usage", desc: "Log usage analytics events" },
  { method: "POST", path: "/auth/login", desc: "JWT admin authentication" },
  { method: "GET", path: "/admin/licenses", desc: "List / manage licenses (JWT)" },
  { method: "GET", path: "/docs", desc: "Swagger / OpenAPI documentation" },
];

const SECURITY = [
  "JWT Authentication (admin)",
  "Password Hashing (bcrypt)",
  "Rate Limiting (Redis)",
  "Input Validation (Pydantic)",
  "Environment Variables (.env)",
  "Audit Logging",
  "HTTPS Ready",
];

export function Settings() {
  const db = useDB();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Server className="h-4 w-4 text-indigo-600" /> Backend API Endpoints</h3>
          <p className="mt-1 text-xs text-slate-500">FastAPI + PostgreSQL + Redis · Swagger at <code className="text-indigo-600">/docs</code></p>
          <div className="mt-4 space-y-2">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${e.method === "POST" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{e.method}</span>
                <code className="text-xs font-medium text-slate-800">{e.path}</code>
                <span className="ml-auto text-xs text-slate-400">{e.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Lock className="h-4 w-4 text-emerald-600" /> Security</h3>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {SECURITY.map((s) => (
              <div key={s} className="flex items-center gap-2 rounded-lg bg-emerald-50/60 p-2.5 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> {s}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Database className="h-4 w-4 text-violet-600" /> Deployment Stack</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Backend", "FastAPI / Python 3.12"],
            ["Database", "PostgreSQL"],
            ["Cache", "Redis"],
            ["Frontend", "Next.js / TS"],
            ["ORM", "SQLAlchemy"],
            ["Auth", "JWT + bcrypt"],
            ["Charts", "Recharts"],
            ["Deploy", "Docker Compose"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-xs text-slate-400">{k}</p>
              <p className="text-sm font-medium text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity className="h-4 w-4 text-amber-600" /> Audit Log</h3>
        <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
          {db.audit.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 text-sm">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{a.action}</span>
              <span className="text-slate-700">{a.detail}</span>
              <span className="ml-auto text-xs text-slate-400">{fmtDateTime(a.created_at)}</span>
            </div>
          ))}
          {db.audit.length === 0 && <p className="text-sm text-slate-400">No audit entries yet.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText className="h-4 w-4 text-slate-600" /> Demo Data</h3>
        <p className="mt-1 text-sm text-slate-500">Reset all licenses, customers, activations and analytics back to the seeded demo dataset.</p>
        <Button variant="danger" className="mt-4" onClick={() => { if (confirm("Reset all demo data?")) resetDB(); }}>
          <RefreshCw className="h-4 w-4" /> Reset Demo Data
        </Button>
      </Card>
    </div>
  );
}
