import { useMemo, useState } from "react";
import { Plus, Search, MoreVertical, Pencil, RefreshCw, Ban, Play, Trash2, RotateCcw, History, Copy, Check } from "lucide-react";
import { useDB } from "../lib/hooks";
import {
  createLicense,
  updateLicense,
  renewLicense,
  setLicenseStatus,
  deleteLicense,
  resetDevices,
  effectiveStatus,
  FEATURE_PRESETS,
  TYPE_DEVICE_LIMIT,
  TYPE_DURATION_DAYS,
  addDays,
} from "../lib/store";
import type { License, LicenseType, FeatureSet } from "../lib/types";
import { FEATURE_LABELS } from "../lib/types";
import { Button, Card, Modal, Field, inputCls, StatusBadge, TypeBadge, Toggle, EmptyState } from "../components/ui";
import { fmtDate, fmtDateTime, timeAgo } from "../lib/format";

const TYPES: LicenseType[] = ["Trial", "Monthly", "Yearly", "Lifetime", "Enterprise"];

function CopyKey({ k }: { k: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(k);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-800 hover:text-indigo-600"
    >
      {k}
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
    </button>
  );
}

export function Licenses() {
  const db = useDB();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<License | null>(null);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<License | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const rows = useMemo(() => {
    return db.licenses.filter((l) => {
      const st = effectiveStatus(l);
      if (filter !== "all" && st !== filter) return false;
      if (!search) return true;
      const cust = db.customers.find((c) => c.id === l.customer_id);
      const q = search.toLowerCase();
      return l.license_key.toLowerCase().includes(q) || (cust?.company.toLowerCase().includes(q) ?? false) || (cust?.name.toLowerCase().includes(q) ?? false);
    });
  }, [db, search, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className={inputCls + " pl-9"} placeholder="Search by key, customer, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={inputCls + " sm:w-44"} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="blocked">Blocked</option>
          <option value="disabled">Disabled</option>
        </select>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Create License
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">License Key</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Devices</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => {
                const cust = db.customers.find((c) => c.id === l.customer_id);
                const devCount = db.activations.filter((a) => a.license_id === l.id).length;
                const st = effectiveStatus(l);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3"><CopyKey k={l.license_key} /></td>
                    <td className="px-5 py-3"><TypeBadge type={l.license_type} /></td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{cust?.company ?? "Unassigned"}</p>
                      <p className="text-xs text-slate-400">{cust?.name ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={st} /></td>
                    <td className="px-5 py-3">
                      <span className={devCount >= l.device_limit ? "font-medium text-amber-600" : "text-slate-700"}>
                        {devCount}/{l.device_limit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{l.expires_at ? fmtDate(l.expires_at) : "Lifetime"}</td>
                    <td className="relative px-5 py-3 text-right">
                      <button onClick={() => setMenu(menu === l.id ? null : l.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menu === l.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                          <div className="absolute right-5 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <MenuItem icon={Pencil} label="Edit License" onClick={() => { setEditing(l); setMenu(null); }} />
                            <MenuItem icon={RefreshCw} label="Renew (+1 Year)" onClick={() => { renewLicense(l.id, 365); setMenu(null); }} />
                            <MenuItem icon={History} label="Activation History" onClick={() => { setHistory(l); setMenu(null); }} />
                            <MenuItem icon={RotateCcw} label="Reset Devices" onClick={() => { resetDevices(l.id); setMenu(null); }} />
                            {st === "blocked" ? (
                              <MenuItem icon={Play} label="Unblock" tone="text-emerald-600" onClick={() => { setLicenseStatus(l.id, "active"); setMenu(null); }} />
                            ) : (
                              <MenuItem icon={Ban} label="Block (Remote Disable)" tone="text-rose-600" onClick={() => { setLicenseStatus(l.id, "blocked"); setMenu(null); }} />
                            )}
                            <MenuItem icon={Trash2} label="Delete" tone="text-rose-600" onClick={() => { if (confirm("Delete this license?")) deleteLicense(l.id); setMenu(null); }} />
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState title="No licenses found" hint="Try adjusting filters or create a new license." />}
      </Card>

      {(creating || editing) && (
        <LicenseModal
          license={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {history && <HistoryModal license={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, tone }: { icon: typeof Pencil; label: string; onClick: () => void; tone?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 ${tone ?? "text-slate-700"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function LicenseModal({ license, onClose }: { license: License | null; onClose: () => void }) {
  const db = useDB();
  const isEdit = !!license;
  const [type, setType] = useState<LicenseType>(license?.license_type ?? "Yearly");
  const [customerId, setCustomerId] = useState(license?.customer_id ?? "");
  const [planId, setPlanId] = useState(license?.plan_id ?? "");
  const [deviceLimit, setDeviceLimit] = useState(license?.device_limit ?? TYPE_DEVICE_LIMIT["Yearly"]);
  const [startDate, setStartDate] = useState((license?.start_date ?? new Date().toISOString()).slice(0, 10));
  const dur = TYPE_DURATION_DAYS[type];
  const defaultExpiry = dur === null ? "" : addDays(new Date(startDate), dur).toISOString().slice(0, 10);
  const [expires, setExpires] = useState(license?.expires_at ? license.expires_at.slice(0, 10) : defaultExpiry);
  const [features, setFeatures] = useState<FeatureSet>(license?.features ?? { ...FEATURE_PRESETS["Yearly"] });
  const [notes, setNotes] = useState(license?.notes ?? "");

  const onTypeChange = (t: LicenseType) => {
    setType(t);
    setDeviceLimit(TYPE_DEVICE_LIMIT[t]);
    setFeatures({ ...FEATURE_PRESETS[t] });
    const d = TYPE_DURATION_DAYS[t];
    setExpires(d === null ? "" : addDays(new Date(startDate), d).toISOString().slice(0, 10));
  };

  const save = () => {
    const payload = {
      license_type: type,
      customer_id: customerId || null,
      plan_id: planId || null,
      device_limit: deviceLimit,
      features,
      start_date: new Date(startDate).toISOString(),
      expires_at: type === "Lifetime" || !expires ? null : new Date(expires).toISOString(),
    };
    if (isEdit && license) {
      updateLicense(license.id, { ...payload, notes, renewal_due_date: payload.expires_at });
    } else {
      createLicense(payload);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit License" : "Create License"} wide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="License Type">
          <select className={inputCls} value={type} onChange={(e) => onTypeChange(e.target.value as LicenseType)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Customer">
          <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Unassigned</option>
            {db.customers.filter((c) => c.role === "customer").map((c) => (
              <option key={c.id} value={c.id}>
                {c.company} — {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subscription Plan">
          <select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">None</option>
            {db.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Device Limit">
          <input type="number" min={1} className={inputCls} value={deviceLimit} onChange={(e) => setDeviceLimit(Number(e.target.value))} />
        </Field>
        <Field label="Start Date">
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Expiry Date" hint={type === "Lifetime" ? "Lifetime licenses never expire" : "Yearly renewal tracked"}>
          <input type="date" className={inputCls} value={expires} disabled={type === "Lifetime"} onChange={(e) => setExpires(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-slate-700">Feature Unlocking (features_json)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(features) as (keyof FeatureSet)[]).map((k) => (
            <Toggle key={k} label={FEATURE_LABELS[k]} checked={features[k]} onChange={(v) => setFeatures({ ...features, [k]: v })} />
          ))}
        </div>
      </div>

      {isEdit && (
        <div className="mt-4">
          <Field label="Internal Notes">
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save}>{isEdit ? "Save Changes" : "Generate License Key"}</Button>
      </div>
    </Modal>
  );
}

function HistoryModal({ license, onClose }: { license: License; onClose: () => void }) {
  const db = useDB();
  const acts = db.activations.filter((a) => a.license_id === license.id);
  return (
    <Modal open onClose={onClose} title="Activation History" wide>
      <p className="mb-3 font-mono text-sm text-slate-700">{license.license_key}</p>
      {acts.length === 0 ? (
        <EmptyState title="No device activations yet" />
      ) : (
        <div className="space-y-2">
          {acts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div>
                <p className="font-medium text-slate-800">{a.machine_name}</p>
                <p className="font-mono text-xs text-slate-400">{a.machine_id}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>v{a.software_version} · activated {fmtDateTime(a.activated_at)}</p>
                <p className="text-emerald-600">last seen {timeAgo(a.last_seen)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
