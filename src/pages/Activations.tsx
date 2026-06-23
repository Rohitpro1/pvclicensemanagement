import { useMemo, useState } from "react";
import { Search, MonitorSmartphone, Heart, PlayCircle, Activity } from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Card, Badge, Modal, Field, Input, Select, Empty } from "../components/ui";
import { format, formatDistanceToNow } from "date-fns";

export default function Activations() {
  const { data, simulateActivation, simulateHeartbeat, recordUsage } = useStore();
  const { activations, licenses, customers } = data;
  const [q, setQ] = useState("");
  const [testOpen, setTestOpen] = useState(false);

  const enriched = useMemo(() => {
    return activations.map(a => {
      const lic = licenses.find(l => l.id === a.license_id);
      const cust = customers.find(c => c.id === lic?.customer_id);
      return { a, lic, cust };
    }).filter(({ a, lic, cust }) => {
      if (!q.trim()) return true;
      const blob = `${a.machine_name} ${a.machine_id} ${lic?.license_key} ${cust?.company} ${cust?.name}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    }).sort((x, y) => new Date(y.a.last_seen).getTime() - new Date(x.a.last_seen).getTime());
  }, [activations, licenses, customers, q]);

  const online = (lastSeen: string) => (Date.now() - new Date(lastSeen).getTime()) < 86400000 * 2;

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Device Activations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Every desktop machine bound to a license. Heartbeats arrive every 24 hours.</p>
        </div>
        <Button onClick={() => setTestOpen(true)}><PlayCircle className="h-4 w-4" /> Simulate API Call</Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search machines, license keys, customers…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3">Machine</th>
                <th className="px-5 py-3">License</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">OS / Version</th>
                <th className="px-5 py-3">Activated</th>
                <th className="px-5 py-3">Last Seen</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map(({ a, lic, cust }) => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${online(a.last_seen) ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <MonitorSmartphone className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">{a.machine_name}</div>
                        <div className="mono text-[10px] text-slate-500">{a.machine_id.slice(0, 24)}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 mono text-xs text-slate-700">{lic?.license_key}</td>
                  <td className="px-5 py-3">
                    <div className="text-slate-900 font-medium">{cust?.company}</div>
                    <div className="text-xs text-slate-500">{cust?.name}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <div>{a.os}</div>
                    <div className="text-xs text-slate-500">v{a.software_version}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{format(new Date(a.activated_at), "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{formatDistanceToNow(new Date(a.last_seen), { addSuffix: true })}</td>
                  <td className="px-5 py-3">
                    {online(a.last_seen) ? <Badge tone="emerald">Online</Badge> : <Badge tone="slate">Stale</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" title="Send heartbeat now" onClick={() => simulateHeartbeat(a.license_id, a.machine_id)}>
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Generate usage event" onClick={() => recordUsage(a.license_id, a.machine_id, "CARD_GENERATED", Math.floor(5 + Math.random() * 20))}>
                      <Activity className="h-3.5 w-3.5 text-indigo-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enriched.length === 0 && <Empty title="No activations found" hint="Try issuing a license, then simulate /activate from the desktop client." />}
        </div>
      </Card>

      {testOpen && <SimulateModal onClose={() => setTestOpen(false)} licenses={licenses.map(l => l.license_key)} onSubmit={(k, m) => {
        const r = simulateActivation(k, m);
        alert(r.message + (r.activation ? `\n\nactivation_token issued.\nmachine_id: ${r.activation.machine_id}` : ""));
        if (r.ok) setTestOpen(false);
      }} />}
    </div>
  );
}

function SimulateModal({ onClose, licenses, onSubmit }: { onClose: () => void; licenses: string[]; onSubmit: (key: string, machine: string) => void }) {
  const [key, setKey] = useState(licenses[0] ?? "");
  const [machine, setMachine] = useState("DESKTOP-TEST-001");
  return (
    <Modal open onClose={onClose} title="Simulate POST /activate" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(key, machine)}>Send Request</Button>
      </>}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Simulates a real desktop client calling the FastAPI <code className="mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /activate</code> endpoint with a fingerprint.
        </p>
        <Field label="License key">
          <Select value={key} onChange={e => setKey(e.target.value)}>
            {licenses.map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
        </Field>
        <Field label="Machine name">
          <Input value={machine} onChange={e => setMachine(e.target.value)} />
        </Field>
        <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
{`POST /activate
Content-Type: application/json

{
  "license_key": "${key}",
  "machine_id": "<auto-generated SHA-256 fingerprint>",
  "machine_name": "${machine}",
  "software_version": "2.6.0"
}`}
        </pre>
      </div>
    </Modal>
  );
}
