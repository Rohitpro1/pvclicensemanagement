import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound, CheckCircle2, XCircle, Ban, MonitorSmartphone, CreditCard, Printer,
  TrendingUp, AlertTriangle, ArrowUpRight, Activity,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { useStore } from "../lib/store";
import { Card, CardHeader, Badge } from "../components/ui";
import { format, formatDistanceToNow, subDays, startOfDay, isSameDay } from "date-fns";

function StatCard({ icon: Icon, label, value, tone = "indigo", hint }: { icon: any; label: string; value: string | number; tone?: string; hint?: string }) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data } = useStore();
  const { licenses, activations, usage, customers } = data;

  const stats = useMemo(() => {
    const today = new Date();
    const isToday = (iso: string) => isSameDay(new Date(iso), today);

    const generatedToday = usage.filter(u => u.event_type === "CARD_GENERATED" && isToday(u.created_at)).reduce((s, u) => s + u.event_count, 0);
    const printedToday = usage.filter(u => u.event_type === "CARD_PRINTED" && isToday(u.created_at)).reduce((s, u) => s + u.event_count, 0);

    return {
      total: licenses.length,
      active: licenses.filter(l => l.status === "active").length,
      expired: licenses.filter(l => l.status === "expired").length,
      blocked: licenses.filter(l => l.status === "blocked").length,
      activations: activations.length,
      generatedToday,
      printedToday,
    };
  }, [licenses, activations, usage]);

  // 14-day series
  const series14 = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map(d => {
      const dayUsage = usage.filter(u => isSameDay(new Date(u.created_at), d));
      const dayActs = activations.filter(a => isSameDay(new Date(a.activated_at), d));
      return {
        date: format(d, "MMM d"),
        Generated: dayUsage.filter(u => u.event_type === "CARD_GENERATED").reduce((s, u) => s + u.event_count, 0),
        Printed:   dayUsage.filter(u => u.event_type === "CARD_PRINTED").reduce((s, u) => s + u.event_count, 0),
        Activations: dayActs.length,
      };
    });
  }, [usage, activations]);

  const licenseMix = useMemo(() => {
    const m = new Map<string, number>();
    licenses.forEach(l => m.set(l.license_type, (m.get(l.license_type) ?? 0) + 1));
    return Array.from(m).map(([name, value]) => ({ name, value }));
  }, [licenses]);

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const topCustomers = useMemo(() => {
    const m = new Map<string, number>();
    usage.forEach(u => {
      const lic = licenses.find(l => l.id === u.license_id);
      if (!lic) return;
      m.set(lic.customer_id, (m.get(lic.customer_id) ?? 0) + u.event_count);
    });
    return Array.from(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, total]) => ({ customer: customers.find(c => c.id === cid), total }));
  }, [usage, licenses, customers]);

  const expiringLicenses = useMemo(() => {
    const now = Date.now();
    return licenses
      .filter(l => l.expires_at && l.status === "active")
      .map(l => ({ l, days: (new Date(l.expires_at!).getTime() - now) / 86400000 }))
      .filter(x => x.days >= 0 && x.days <= 30)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [licenses]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time view of licenses, activations & usage across the PVC Card Generator fleet.</p>
        </div>
        <div className="text-sm text-slate-500">{format(new Date(), "EEEE, MMM d · h:mm a")}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={KeyRound} label="Total Licenses" value={stats.total} tone="indigo" hint={`${stats.active} active`} />
        <StatCard icon={CheckCircle2} label="Active" value={stats.active} tone="emerald" />
        <StatCard icon={XCircle} label="Expired" value={stats.expired} tone="amber" />
        <StatCard icon={Ban} label="Blocked" value={stats.blocked} tone="rose" />
        <StatCard icon={MonitorSmartphone} label="Total Activations" value={stats.activations} tone="blue" hint="Devices currently bound" />
        <StatCard icon={CreditCard} label="Cards Generated Today" value={stats.generatedToday.toLocaleString()} tone="violet" />
        <StatCard icon={Printer} label="Cards Printed Today" value={stats.printedToday.toLocaleString()} tone="indigo" />
        <StatCard icon={TrendingUp} label="Customers" value={customers.length} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Card generation & printing (last 14 days)" subtitle="Aggregated across all licenses" />
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series14}>
                <defs>
                  <linearGradient id="gGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPrn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Generated" stroke="#6366f1" strokeWidth={2} fill="url(#gGen)" />
                <Area type="monotone" dataKey="Printed"   stroke="#10b981" strokeWidth={2} fill="url(#gPrn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="License mix" subtitle="By plan type" />
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={licenseMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {licenseMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Daily activations" subtitle="New device bindings" />
          <div className="p-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="Activations" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Expiring soon"
            subtitle="Within next 30 days"
            action={<Link to="/licenses" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link>}
          />
          <div className="divide-y divide-slate-100">
            {expiringLicenses.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No upcoming expirations 🎉</div>
            )}
            {expiringLicenses.map(({ l, days }) => {
              const c = customers.find(c => c.id === l.customer_id);
              const tone = days <= 7 ? "rose" : days <= 14 ? "amber" : "indigo";
              return (
                <Link to={`/licenses?key=${l.license_key}`} key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                  <AlertTriangle className={`h-4 w-4 ${days <= 7 ? "text-rose-500" : days <= 14 ? "text-amber-500" : "text-indigo-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm text-slate-900 truncate">{l.license_key}</div>
                    <div className="text-xs text-slate-500 truncate">{c?.company} — {c?.name}</div>
                  </div>
                  <Badge tone={tone as any}>in {Math.ceil(days)}d</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Top active customers" subtitle="By card volume (last 30 days)" />
          <div className="divide-y divide-slate-100">
            {topCustomers.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No usage yet.</div>}
            {topCustomers.map(({ customer, total }, i) => (
              <div key={customer?.id ?? i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{customer?.company ?? "—"}</div>
                  <div className="text-xs text-slate-500 truncate">{customer?.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{total.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 uppercase">events</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Audit log" />
          <div className="divide-y divide-slate-100 max-h-[330px] overflow-y-auto">
            {data.audit.slice(0, 12).map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-slate-500">{a.action.toLowerCase().replace(/_/g, " ")}</span>{" "}
                    <span className="mono text-xs text-slate-700">{a.target}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
