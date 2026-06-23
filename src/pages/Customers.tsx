import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Building2, Mail, Phone, KeyRound, MonitorSmartphone, IdCard } from "lucide-react";
import { useDB } from "../lib/hooks";
import { createCustomer, updateCustomer, deleteCustomer, effectiveStatus } from "../lib/store";
import type { Customer } from "../lib/types";
import { Button, Card, Modal, Field, inputCls, EmptyState, StatusBadge, TypeBadge } from "../components/ui";
import { fmtDate } from "../lib/format";

export function Customers() {
  const db = useDB();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Customer | null>(null);

  const rows = useMemo(
    () =>
      db.customers
        .filter((c) => c.role === "customer")
        .filter((c) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
        }),
    [db, search],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={inputCls + " pl-9"} placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => {
          const licenses = db.licenses.filter((l) => l.customer_id === c.id);
          const devices = db.activations.filter((a) => licenses.some((l) => l.id === a.license_id)).length;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                    {c.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.company}</p>
                    <p className="text-sm text-slate-500">{c.name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete customer?")) deleteCustomer(c.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> {c.email}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {c.phone}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900"><KeyRound className="h-4 w-4 text-indigo-500" />{licenses.length}</p>
                  <p className="text-xs text-slate-400">Licenses</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900"><MonitorSmartphone className="h-4 w-4 text-sky-500" />{devices}</p>
                  <p className="text-xs text-slate-400">Devices</p>
                </div>
              </div>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => setViewing(c)}>
                View Details
              </Button>
            </Card>
          );
        })}
      </div>
      {rows.length === 0 && (
        <Card>
          <EmptyState title="No customers found" hint="Add your first customer to assign licenses." />
        </Card>
      )}

      {(creating || editing) && <CustomerModal customer={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
      {viewing && <CustomerDetail customer={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CustomerModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [company, setCompany] = useState(customer?.company ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");

  const save = () => {
    if (customer) updateCustomer(customer.id, { name, email, company, phone });
    else createCustomer({ name, email, company, phone });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={customer ? "Edit Customer" : "Add Customer"}>
      <div className="space-y-4">
        <Field label="Full Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Company"><input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!name || !company}>{customer ? "Save" : "Create Customer"}</Button>
      </div>
    </Modal>
  );
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const db = useDB();
  const licenses = db.licenses.filter((l) => l.customer_id === customer.id);
  const cards = db.usage
    .filter((u) => licenses.some((l) => l.id === u.license_id) && u.event_type === "CARD_GENERATED")
    .reduce((s, u) => s + u.event_count, 0);
  const devices = db.activations.filter((a) => licenses.some((l) => l.id === a.license_id));

  return (
    <Modal open onClose={onClose} title={customer.company} wide>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-indigo-50 p-3 text-center">
          <p className="text-xl font-bold text-indigo-700">{licenses.length}</p>
          <p className="text-xs text-indigo-600">Licenses</p>
        </div>
        <div className="rounded-xl bg-sky-50 p-3 text-center">
          <p className="text-xl font-bold text-sky-700">{devices.length}</p>
          <p className="text-xs text-sky-600">Devices</p>
        </div>
        <div className="rounded-xl bg-violet-50 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-xl font-bold text-violet-700"><IdCard className="h-4 w-4" />{cards.toLocaleString()}</p>
          <p className="text-xs text-violet-600">Cards Generated</p>
        </div>
      </div>

      <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-800">Licenses</h4>
      <div className="space-y-2">
        {licenses.length === 0 && <p className="text-sm text-slate-400">No licenses assigned.</p>}
        {licenses.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <span className="font-mono text-xs text-slate-700">{l.license_key}</span>
            <div className="flex items-center gap-2">
              <TypeBadge type={l.license_type} />
              <StatusBadge status={effectiveStatus(l)} />
              <span className="text-xs text-slate-400">{l.expires_at ? fmtDate(l.expires_at) : "Lifetime"}</span>
            </div>
          </div>
        ))}
      </div>

      <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-800">Devices</h4>
      <div className="space-y-2">
        {devices.length === 0 && <p className="text-sm text-slate-400">No active devices.</p>}
        {devices.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
            <span className="flex items-center gap-2 text-sm text-slate-700"><Building2 className="h-3.5 w-3.5 text-slate-400" />{d.machine_name}</span>
            <span className="font-mono text-xs text-slate-400">{d.machine_id}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
