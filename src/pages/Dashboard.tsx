import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KeyRound, CheckCircle2, Clock, Ban, MonitorSmartphone, IdCard, Printer, AlertTriangle } from "lucide-react";
import { useDB } from "../lib/hooks";
import { metrics, expiringSoon, topCustomers, dailySeries, usageByType } from "../lib/analytics";
import { Card, StatusBadge, TypeBadge } from "../components/ui";
import { fmtDate, daysBetweenLabel } from "../lib/dashboardUtils";

function Stat({ icon: Icon, label, value, tone }: { icon: typeof KeyRound; label: string; value: number | string; tone: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const PIE_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899"];

export function Dashboard({ go }: { go: (p: "licenses" | "customers" | "analytics") => void }) {
  const db = useDB();
  const m = metrics(db);
  const series = dailySeries(db, 30);
  const expiring = expiringSoon(db, 30);
  const top = topCustomers(db);
  const byType = usageByType(db);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={KeyRound} label="Total Licenses" value={m.total} tone="bg-indigo-50 text-indigo-600" />
        <Stat icon={CheckCircle2} label="Active Licenses" value={m.active} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Clock} label="Expired Licenses" value={m.expired} tone="bg-amber-50 text-amber-600" />
        <Stat icon={Ban} label="Blocked Licenses" value={m.blocked} tone="bg-rose-50 text-rose-600" />
        <Stat icon={MonitorSmartphone} label="Total Activations" value={m.activations} tone="bg-sky-50 text-sky-600" />
        <Stat icon={IdCard} label="Cards Generated Today" value={m.cardsToday.toLocaleString()} tone="bg-violet-50 text-violet-600" />
        <Stat icon={Printer} label="Cards Printed Today" value={m.printsToday.toLocaleString()} tone="bg-fuchsia-50 text-fuchsia-600" />
        <Stat icon={KeyRound} label="Disabled Licenses" value={m.disabled} tone="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Cards Generated (Last 30 Days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.generated}>
                <defs>
                  <linearGradient id="gGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#gGen)" name="Cards" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Usage by Event Type</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {byType.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {b.name}
                </span>
                <span className="font-medium text-slate-800">{b.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Top Customers (Cards Generated)</h3>
            <button onClick={() => go("customers")} className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </button>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.map((t) => ({ name: t.customer!.company, value: t.cards }))} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={110} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Cards" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Expiring Licenses (30 days)
            </h3>
            <button onClick={() => go("licenses")} className="text-xs font-medium text-indigo-600 hover:underline">
              Manage
            </button>
          </div>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {expiring.length === 0 && <p className="py-12 text-center text-sm text-slate-400">No licenses expiring soon.</p>}
            {expiring.map((l) => {
              const cust = db.customers.find((c) => c.id === l.customer_id);
              return (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <div>
                    <p className="font-mono text-xs font-medium text-slate-800">{l.license_key}</p>
                    <p className="text-xs text-slate-500">{cust?.company ?? "Unassigned"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TypeBadge type={l.license_type} />
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-600">{daysBetweenLabel(l.expires_at)}</p>
                      <p className="text-[11px] text-slate-400">{fmtDate(l.expires_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">License Growth</h3>
          <StatusBadge status="active" />
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.growth}>
              <defs>
                <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#gGrowth)" name="Total Licenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
