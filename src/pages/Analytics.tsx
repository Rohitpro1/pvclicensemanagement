import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDB } from "../lib/hooks";
import { dailySeries, topCustomers } from "../lib/analytics";
import { Card } from "../components/ui";

const RANGES = [
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const axis = { tick: { fontSize: 11, fill: "#94a3b8" }, tickLine: false, axisLine: false };
const tooltip = { contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 } };

export function Analytics() {
  const db = useDB();
  const [days, setDays] = useState(30);
  const series = dailySeries(db, days);
  const top = topCustomers(db, 8);

  const totalGenerated = series.generated.reduce((s, d) => s + d.value, 0);
  const totalPrinted = series.printed.reduce((s, d) => s + d.value, 0);
  const totalActs = series.acts.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${days === r.days ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-sm text-slate-500">Cards Generated</p><p className="mt-1 text-2xl font-bold text-indigo-600">{totalGenerated.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Cards Printed</p><p className="mt-1 text-2xl font-bold text-fuchsia-600">{totalPrinted.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Activations</p><p className="mt-1 text-2xl font-bold text-sky-600">{totalActs.toLocaleString()}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Daily Card Generation">
          <AreaChart data={series.generated}>
            <defs>
              <linearGradient id="aGen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" {...axis} interval={Math.floor(days / 7)} />
            <YAxis {...axis} width={36} />
            <Tooltip {...tooltip} />
            <Area type="monotone" dataKey="value" name="Generated" stroke="#6366f1" strokeWidth={2} fill="url(#aGen)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Daily Printing">
          <AreaChart data={series.printed}>
            <defs>
              <linearGradient id="aPr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} /><stop offset="100%" stopColor="#d946ef" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" {...axis} interval={Math.floor(days / 7)} />
            <YAxis {...axis} width={36} />
            <Tooltip {...tooltip} />
            <Area type="monotone" dataKey="value" name="Printed" stroke="#d946ef" strokeWidth={2} fill="url(#aPr)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Daily Activations">
          <BarChart data={series.acts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" {...axis} interval={Math.floor(days / 7)} />
            <YAxis {...axis} width={30} allowDecimals={false} />
            <Tooltip {...tooltip} />
            <Bar dataKey="value" name="Activations" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="License Growth (Cumulative)">
          <LineChart data={series.growth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" {...axis} interval={Math.floor(days / 7)} />
            <YAxis {...axis} width={30} />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="value" name="Licenses" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      <ChartCard title="Top Active Customers (Cards Generated)">
        <BarChart data={top.map((t) => ({ name: t.customer!.company, value: t.cards }))} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={130} tickLine={false} axisLine={false} />
          <Tooltip {...tooltip} />
          <Bar dataKey="value" name="Cards" fill="#6366f1" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
