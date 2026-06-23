import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useStore } from "../lib/store";
import { Card, CardHeader, Select } from "../components/ui";
import { format, isSameDay, startOfDay, subDays } from "date-fns";

export default function Analytics() {
  const { data } = useStore();
  const [range, setRange] = useState(30);

  const series = useMemo(() => {
    const days = Array.from({ length: range }).map((_, i) => startOfDay(subDays(new Date(), range - 1 - i)));
    return days.map(d => {
      const dayUsage = data.usage.filter(u => isSameDay(new Date(u.created_at), d));
      const dayActs = data.activations.filter(a => isSameDay(new Date(a.activated_at), d));
      return {
        date: format(d, "MMM d"),
        Generated: dayUsage.filter(u => u.event_type === "CARD_GENERATED").reduce((s, u) => s + u.event_count, 0),
        Printed:   dayUsage.filter(u => u.event_type === "CARD_PRINTED").reduce((s, u) => s + u.event_count, 0),
        PDFs:      dayUsage.filter(u => u.event_type === "PDF_IMPORTED").reduce((s, u) => s + u.event_count, 0),
        Batches:   dayUsage.filter(u => u.event_type === "BATCH_JOB").reduce((s, u) => s + u.event_count, 0),
        Activations: dayActs.length,
      };
    });
  }, [data, range]);

  const growth = useMemo(() => {
    const days = Array.from({ length: range }).map((_, i) => startOfDay(subDays(new Date(), range - 1 - i)));
    let cumulative = data.licenses.filter(l => new Date(l.created_at) < days[0]).length;
    return days.map(d => {
      const created = data.licenses.filter(l => isSameDay(new Date(l.created_at), d)).length;
      cumulative += created;
      return { date: format(d, "MMM d"), Licenses: cumulative, New: created };
    });
  }, [data, range]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    data.usage.forEach(u => {
      const lic = data.licenses.find(l => l.id === u.license_id);
      if (!lic) return;
      map.set(lic.customer_id, (map.get(lic.customer_id) ?? 0) + u.event_count);
    });
    return Array.from(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cid, v]) => ({ name: data.customers.find(c => c.id === cid)?.company ?? "Unknown", events: v }));
  }, [data]);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usage Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Card generation, printing & license growth trends.</p>
        </div>
        <Select value={String(range)} onChange={e => setRange(parseInt(e.target.value))} className="w-auto">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>

      <Card>
        <CardHeader title="Card generation activity" subtitle="Daily totals across all licenses" />
        <div className="p-4 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Generated" stroke="#6366f1" strokeWidth={2} fill="url(#ag1)" />
              <Area type="monotone" dataKey="Printed"   stroke="#10b981" strokeWidth={2} fill="url(#ag2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Daily activations" />
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
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
          <CardHeader title="License growth (cumulative)" />
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Licenses" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="New" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Event mix" subtitle="PDF imports, batch jobs & more" />
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="PDFs" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="Batches" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top customers by volume" />
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={140} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="events" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
