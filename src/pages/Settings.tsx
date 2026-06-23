import { useState } from "react";
import { ShieldCheck, Bell, Server, Trash2, Database, KeyRound } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHeader, Button, Field, Input, Toggle, Badge } from "../components/ui";
import { format, formatDistanceToNow } from "date-fns";

export default function Settings() {
  const { user, resetSeed, data } = useStore();
  const [notifyExpiry, setNotifyExpiry] = useState(true);
  const [notifyBlock, setNotifyBlock] = useState(true);
  const [hbWindow, setHbWindow] = useState(24);

  return (
    <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Workspace, security and runtime configuration.</p>
      </div>

      <Card>
        <CardHeader title="Workspace" subtitle="Your admin profile and team" />
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Display name"><Input defaultValue={user?.name ?? ""} /></Field>
          <Field label="Email"><Input defaultValue={user?.email ?? ""} /></Field>
          <Field label="Role"><Input defaultValue={user?.role ?? "admin"} disabled /></Field>
          <Field label="Workspace ID"><Input defaultValue="ws_pvclm_prod" disabled /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Security" subtitle="JWT, password hashing & rate limiting" action={<Badge tone="emerald">Production-ready</Badge>} />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Toggle checked onChange={()=>{}} label="Enforce HTTPS only" />
          <Toggle checked onChange={()=>{}} label="JWT (HS256) · 1h expiry" />
          <Toggle checked onChange={()=>{}} label="Bcrypt password hashing (12 rounds)" />
          <Toggle checked onChange={()=>{}} label="Per-IP rate limiting via Redis" />
          <Toggle checked onChange={()=>{}} label="Audit logging for admin mutations" />
          <Toggle checked onChange={()=>{}} label="Pydantic v2 input validation" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Runtime — Desktop client behavior" subtitle="Controls how PVC Card Generator clients beacon and react" />
        <div className="p-5 grid grid-cols-2 gap-4">
          <Field label="Heartbeat window (hours)" hint="Clients beacon every N hours. Default 24.">
            <Input type="number" min={1} max={168} value={hbWindow} onChange={e => setHbWindow(parseInt(e.target.value) || 24)} />
          </Field>
          <Field label="Validate cache TTL (seconds)" hint="Redis TTL on /validate responses.">
            <Input type="number" defaultValue={60} />
          </Field>
          <Field label="Grace period after expiry (days)" hint="Soft block before full disable.">
            <Input type="number" defaultValue={3} />
          </Field>
          <Field label="Max heartbeats missed before lock">
            <Input type="number" defaultValue={3} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Alert me about lifecycle events" />
        <div className="p-5 space-y-3">
          <Toggle checked={notifyExpiry} onChange={setNotifyExpiry} label="Email me when licenses expire in ≤ 14 days" />
          <Toggle checked={notifyBlock} onChange={setNotifyBlock} label="Email me when any license is blocked" />
          <Toggle checked={false} onChange={()=>{}} label="Email me on every new activation" />
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
            <Bell className="h-3.5 w-3.5" /> Notifications dispatched via the FastAPI background worker (Redis queue).
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Integrations placeholders" subtitle="Reserved hooks — not active in this build" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {[
            { i: KeyRound, t: "Payment Gateway", h: "Stripe / Razorpay / Paddle webhook URL" },
            { i: ShieldCheck, t: "Offline Activation", h: "Air-gapped license signing key (CSR-based)" },
            { i: Server, t: "Customer Self-Service Portal", h: "Public-facing license management UI" },
          ].map(({i: Icon, t, h}) => (
            <div key={t} className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-700"><Icon className="h-4 w-4" /> <span className="font-medium">{t}</span></div>
              <div className="text-xs text-slate-500 mt-1.5">{h}</div>
              <Badge tone="amber">Phase 3 — placeholder</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Audit log" subtitle="Last 25 admin actions" />
        <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
          {data.audit.slice(0, 25).map(a => (
            <div key={a.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
              <div className="text-xs text-slate-400 w-28 shrink-0">{format(new Date(a.created_at), "MMM d, HH:mm")}</div>
              <Badge tone="slate">{a.action}</Badge>
              <div className="text-slate-600 truncate">{a.target}</div>
              <div className="ml-auto text-xs text-slate-400">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Danger zone" subtitle="Destructive operations" />
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><Database className="h-5 w-5" /></div>
            <div>
              <div className="font-medium text-slate-900">Reset demo database</div>
              <div className="text-xs text-slate-500">Wipes local state and re-seeds customers, licenses, activations & usage.</div>
            </div>
          </div>
          <Button variant="danger" onClick={() => { if (confirm("This will wipe all local data. Continue?")) resetSeed(); }}>
            <Trash2 className="h-4 w-4" /> Reset & re-seed
          </Button>
        </div>
      </Card>
    </div>
  );
}
