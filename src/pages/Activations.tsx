import { useMemo, useState } from "react";
import { Search, MonitorSmartphone, Wifi, WifiOff } from "lucide-react";
import { useDB } from "../lib/hooks";
import { Card, EmptyState, StatusBadge, inputCls } from "../components/ui";
import { effectiveStatus } from "../lib/store";
import { fmtDateTime, timeAgo } from "../lib/format";

export function Activations() {
  const db = useDB();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return db.activations
      .map((a) => {
        const lic = db.licenses.find((l) => l.id === a.license_id);
        const cust = db.customers.find((c) => c.id === lic?.customer_id);
        return { a, lic, cust };
      })
      .filter(({ a, lic, cust }) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          a.machine_name.toLowerCase().includes(q) ||
          a.machine_id.toLowerCase().includes(q) ||
          (lic?.license_key.toLowerCase().includes(q) ?? false) ||
          (cust?.company.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((x, y) => new Date(y.a.last_seen).getTime() - new Date(x.a.last_seen).getTime());
  }, [db, search]);

  const online = (iso: string) => Date.now() - new Date(iso).getTime() < 26 * 3600000;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Devices</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{db.activations.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Online (24h)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{db.activations.filter((a) => online(a.last_seen)).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Offline</p>
          <p className="mt-1 text-2xl font-bold text-slate-400">{db.activations.filter((a) => !online(a.last_seen)).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Licensed Seats</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{db.licenses.reduce((s, l) => s + l.device_limit, 0)}</p>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input className={inputCls + " pl-9"} placeholder="Search by machine, ID, license key, customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">License / Customer</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Activated</th>
                <th className="px-5 py-3 font-medium">Heartbeat</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ a, lic, cust }) => {
                const isOnline = online(a.last_seen);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <MonitorSmartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{a.machine_name}</p>
                          <p className="font-mono text-xs text-slate-400">{a.machine_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-slate-700">{lic?.license_key ?? "—"}</p>
                      <p className="text-xs text-slate-400">{cust?.company ?? "Unassigned"}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">v{a.software_version}</td>
                    <td className="px-5 py-3 text-slate-600">{fmtDateTime(a.activated_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-emerald-600" : "text-slate-400"}`}>
                        {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                        {timeAgo(a.last_seen)}
                      </span>
                    </td>
                    <td className="px-5 py-3">{lic && <StatusBadge status={effectiveStatus(lic)} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState title="No device activations found" />}
      </Card>
    </div>
  );
}
