import { useMemo, useState } from "react";
import { Plus, Search, Building2, Mail, Phone, Edit3, Trash2, Eye, MonitorSmartphone, KeyRound } from "lucide-react";
import { useStore } from "../lib/store";
import type { Customer } from "../lib/types";
import { Button, Card, Badge, Modal, Field, Input, Empty } from "../components/ui";
import { format } from "date-fns";

export default function Customers() {
  const { data, createCustomer, updateCustomer, deleteCustomer } = useStore();
  const { customers, licenses, activations, usage } = data;
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const filtered = useMemo(() => customers.filter(c => {
    if (!q.trim()) return true;
    return `${c.name} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase());
  }), [customers, q]);

  const viewingCust = viewing ? customers.find(c => c.id === viewing) : null;

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Companies and contacts that own licenses.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search customers, emails, companies…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => {
          const licCount = licenses.filter(l => l.customer_id === c.id).length;
          const devCount = activations.filter(a => licenses.some(l => l.id === a.license_id && l.customer_id === c.id)).length;
          const eventCount = usage.filter(u => licenses.some(l => l.id === u.license_id && l.customer_id === c.id)).reduce((s, u) => s + u.event_count, 0);
          return (
            <Card key={c.id} className="p-5 hover:shadow-md transition group">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold shrink-0">
                  {c.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{c.company}</div>
                  <div className="text-sm text-slate-500 truncate">{c.name}</div>
                </div>
                <Badge tone="indigo">{licCount} lic</Badge>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                <div className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{c.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {c.phone}</div>
                <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-400" /> Joined {format(new Date(c.created_at), "MMM yyyy")}</div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg py-2"><div className="text-lg font-bold text-slate-900">{licCount}</div><div className="text-[10px] text-slate-500 uppercase">Licenses</div></div>
                <div className="bg-slate-50 rounded-lg py-2"><div className="text-lg font-bold text-slate-900">{devCount}</div><div className="text-[10px] text-slate-500 uppercase">Devices</div></div>
                <div className="bg-slate-50 rounded-lg py-2"><div className="text-lg font-bold text-slate-900">{eventCount.toLocaleString()}</div><div className="text-[10px] text-slate-500 uppercase">Events</div></div>
              </div>

              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <Button size="sm" variant="outline" onClick={() => setViewing(c.id)}><Eye className="h-3.5 w-3.5" /> View</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this customer?")) deleteCustomer(c.id); }}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full"><Empty title="No customers found" /></div>}
      </div>

      {(creating || editing) && (
        <CustomerForm
          customer={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(c) => {
            if (editing) updateCustomer(editing.id, c);
            else createCustomer(c);
            setCreating(false); setEditing(null);
          }}
        />
      )}

      {viewingCust && (
        <Modal open onClose={() => setViewing(null)} title={viewingCust.company} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Info label="Name">{viewingCust.name}</Info>
              <Info label="Email">{viewingCust.email}</Info>
              <Info label="Phone">{viewingCust.phone}</Info>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-500" /> Licenses</h4>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr><th className="px-3 py-2 text-left">Key</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Devices</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {licenses.filter(l => l.customer_id === viewingCust.id).map(l => {
                      const dev = activations.filter(a => a.license_id === l.id).length;
                      return (
                        <tr key={l.id}>
                          <td className="px-3 py-2 mono text-xs">{l.license_key}</td>
                          <td className="px-3 py-2"><Badge tone="violet">{l.license_type}</Badge></td>
                          <td className="px-3 py-2"><Badge tone={l.status === "active" ? "emerald" : l.status === "blocked" ? "rose" : "amber"}>{l.status}</Badge></td>
                          <td className="px-3 py-2">{dev} / {l.device_limit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><MonitorSmartphone className="h-4 w-4 text-indigo-500" /> Devices</h4>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">OS</th><th className="px-3 py-2 text-left">License</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activations.filter(a => licenses.some(l => l.id === a.license_id && l.customer_id === viewingCust.id)).map(a => {
                      const l = licenses.find(l => l.id === a.license_id);
                      return (
                        <tr key={a.id}>
                          <td className="px-3 py-2 font-medium">{a.machine_name}</td>
                          <td className="px-3 py-2 text-slate-600">{a.os}</td>
                          <td className="px-3 py-2 mono text-xs">{l?.license_key}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function CustomerForm({ customer, onClose, onSave }: { customer?: Customer; onClose: () => void; onSave: (c: Omit<Customer, "id" | "created_at" | "role">) => void }) {
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [company, setCompany] = useState(customer?.company ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  return (
    <Modal open onClose={onClose} title={customer ? "Edit customer" : "Create customer"} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ name, email, company, phone })}>{customer ? "Save changes" : "Create"}</Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company"><Input value={company} onChange={e => setCompany(e.target.value)} /></Field>
        <Field label="Contact name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
