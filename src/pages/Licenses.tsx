import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Search, KeyRound, Ban, RotateCcw, Trash2, RefreshCw, Copy, CheckCheck,
  Eye, MoreHorizontal, ShieldOff, ShieldCheck, MonitorSmartphone,
} from "lucide-react";
import { useStore, featuresForType } from "../lib/store";
import type { License, LicenseType, Features } from "../lib/types";
import { Button, Card, Badge, Modal, Field, Input, Select, Toggle, Empty } from "../components/ui";
import { format } from "date-fns";

function statusBadge(l: License) {
  if (l.status === "blocked") return <Badge tone="rose">Blocked</Badge>;
  if (l.status === "expired") return <Badge tone="amber">Expired</Badge>;
  if (l.expires_at) {
    const days = (new Date(l.expires_at).getTime() - Date.now()) / 86400000;
    if (days < 7) return <Badge tone="amber">Expires in {Math.ceil(days)}d</Badge>;
  }
  return <Badge tone="emerald">Active</Badge>;
}

const TYPES: LicenseType[] = ["Trial", "Monthly", "Yearly", "Lifetime", "Enterprise"];
const DEFAULT_DAYS: Record<LicenseType, number> = { Trial: 14, Monthly: 30, Yearly: 365, Lifetime: 0, Enterprise: 365 };

export default function Licenses() {
  const { data, createLicense, blockLicense, unblockLicense, renewLicense, resetDevices, deleteLicense } = useStore();
  const { licenses, customers, activations, plans } = data;
  const [sp] = useSearchParams();
  const initialKey = sp.get("key") ?? "";

  const [q, setQ] = useState(initialKey);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<License | null>(null);

  const filtered = useMemo(() => {
    return licenses.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (typeFilter !== "all" && l.license_type !== typeFilter) return false;
      if (q.trim()) {
        const cust = customers.find(c => c.id === l.customer_id);
        const blob = `${l.license_key} ${cust?.name} ${cust?.email} ${cust?.company}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [licenses, customers, q, statusFilter, typeFilter]);

  const detail = detailId ? licenses.find(l => l.id === detailId) : null;

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Issue, renew, block, and manage all license keys.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Issue New License</Button>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by key, customer, email, company…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="blocked">Blocked</option>
        </Select>
        <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-auto">
          <option value="all">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3">License Key</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Devices</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(l => {
                const cust = customers.find(c => c.id === l.customer_id);
                const used = activations.filter(a => a.license_id === l.id).length;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="mono text-slate-900">{l.license_key}</span>
                        <CopyBtn text={l.license_key} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{cust?.company}</div>
                      <div className="text-xs text-slate-500">{cust?.name} · {cust?.email}</div>
                    </td>
                    <td className="px-5 py-3"><Badge tone="violet">{l.license_type}</Badge></td>
                    <td className="px-5 py-3">{statusBadge(l)}</td>
                    <td className="px-5 py-3">
                      <span className={used >= l.device_limit ? "text-amber-700 font-medium" : "text-slate-700"}>
                        {used} / {l.device_limit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {l.expires_at ? format(new Date(l.expires_at), "MMM d, yyyy") : <Badge tone="indigo">Lifetime</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(l.id)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setRenewing(l)} title="Renew"><RefreshCw className="h-3.5 w-3.5" /></Button>
                        {l.status === "blocked" ? (
                          <Button variant="ghost" size="sm" onClick={() => unblockLicense(l.id)} title="Unblock"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /></Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => blockLicense(l.id)} title="Block"><Ban className="h-3.5 w-3.5 text-rose-600" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Reset all device activations?")) resetDevices(l.id); }} title="Reset devices"><RotateCcw className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this license permanently?")) deleteLicense(l.id); }} title="Delete"><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty title="No licenses match" hint="Try clearing the filters." />}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
          Showing {filtered.length} of {licenses.length} licenses
        </div>
      </Card>

      {/* Create modal */}
      {showCreate && <CreateLicenseModal onClose={() => setShowCreate(false)} onCreate={(input) => { createLicense(input); setShowCreate(false); }} />}

      {/* Renew modal */}
      {renewing && (
        <Modal open onClose={() => setRenewing(null)} title="Renew license" size="sm"
          footer={<>
            <Button variant="ghost" onClick={() => setRenewing(null)}>Cancel</Button>
            <Button onClick={() => { renewLicense(renewing.id, 365); setRenewing(null); }}>Extend +365 days</Button>
          </>}
        >
          <div className="space-y-3">
            <div className="text-sm text-slate-600">Add time to <span className="mono">{renewing.license_key}</span></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { renewLicense(renewing.id, 30); setRenewing(null); }}>+30 days</Button>
              <Button variant="outline" size="sm" onClick={() => { renewLicense(renewing.id, 90); setRenewing(null); }}>+90 days</Button>
              <Button variant="outline" size="sm" onClick={() => { renewLicense(renewing.id, 365); setRenewing(null); }}>+1 year</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detail && <LicenseDetailModal license={detail} onClose={() => setDetailId(null)} />}
    </div>
  );

  function CreateLicenseModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: any) => void }) {
    const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
    const [type, setType] = useState<LicenseType>("Yearly");
    const [deviceLimit, setDeviceLimit] = useState(5);
    const [days, setDays] = useState<number>(DEFAULT_DAYS["Yearly"]);
    const [features, setFeatures] = useState<Features>(featuresForType("Yearly"));
    const [planId, setPlanId] = useState<string>("plan_pro");

    const setT = (t: LicenseType) => {
      setType(t);
      setDays(DEFAULT_DAYS[t]);
      setFeatures(featuresForType(t));
      setDeviceLimit(t === "Enterprise" ? 50 : t === "Trial" ? 1 : t === "Monthly" ? 2 : 5);
    };

    return (
      <Modal open onClose={onClose} title="Issue new license" size="lg"
        footer={<>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onCreate({ customer_id: customerId, license_type: type, device_limit: deviceLimit, durationDays: days, features, plan_id: planId })}>
            <KeyRound className="h-4 w-4" /> Generate License Key
          </Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <Select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company} — {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Subscription plan">
            <Select value={planId} onChange={e => setPlanId(e.target.value)}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="License type">
            <div className="grid grid-cols-5 gap-1.5">
              {TYPES.map(t => (
                <button key={t} type="button" onClick={() => setT(t)}
                  className={`px-2 py-2 text-xs font-medium rounded-lg border transition ${type === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Device limit">
            <Input type="number" min={1} max={500} value={deviceLimit} onChange={e => setDeviceLimit(parseInt(e.target.value) || 1)} />
          </Field>
          <Field label={`Duration (days)${days === 0 ? " — Lifetime" : ""}`}>
            <Input type="number" min={0} value={days} onChange={e => setDays(parseInt(e.target.value) || 0)} />
          </Field>
          <div className="col-span-2">
            <div className="text-xs font-medium text-slate-600 mb-2">Feature unlocking (sent to desktop via /activate)</div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
              {(Object.keys(features) as (keyof Features)[]).map(k => (
                <Toggle key={k} checked={features[k]} onChange={v => setFeatures({ ...features, [k]: v })} label={k.replace(/_/g, " ")} />
              ))}
            </div>
          </div>
          <div className="col-span-2 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
            <strong>Key format preview:</strong> <span className="mono">PVC-{type === "Yearly" ? "1Y" : type === "Monthly" ? "MO" : type === "Trial" ? "TR" : type === "Lifetime" ? "LT" : "EN"}-XXXX-XXXX-XXXX</span> · generated via <span className="mono">crypto.getRandomValues</span> · 32-symbol Crockford-style alphabet.
          </div>
        </div>
      </Modal>
    );
  }

  function LicenseDetailModal({ license, onClose }: { license: License; onClose: () => void }) {
    const cust = customers.find(c => c.id === license.customer_id);
    const acts = activations.filter(a => a.license_id === license.id);
    const plan = plans.find(p => p.id === license.plan_id);
    return (
      <Modal open onClose={onClose} title="License details" size="xl">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <KeyRound className="h-6 w-6" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider opacity-80">License Key</div>
              <div className="mono text-lg font-semibold">{license.license_key}</div>
            </div>
            <CopyBtn text={license.license_key} variant="invert" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Info label="Type"><Badge tone="violet">{license.license_type}</Badge></Info>
            <Info label="Status">{statusBadge(license)}</Info>
            <Info label="Plan">{plan?.name ?? "—"}</Info>
            <Info label="Device limit">{license.device_limit}</Info>
            <Info label="Start date">{format(new Date(license.start_date), "MMM d, yyyy")}</Info>
            <Info label="Expires">{license.expires_at ? format(new Date(license.expires_at), "MMM d, yyyy") : "Lifetime"}</Info>
            <Info label="Renewal due">{license.renewal_due_date ? format(new Date(license.renewal_due_date), "MMM d, yyyy") : "—"}</Info>
            <Info label="Customer">{cust?.company}</Info>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600 mb-2">Enabled features</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(license.features) as (keyof Features)[]).map(k => (
                <div key={k} className={`px-2.5 py-1.5 rounded-md text-xs font-medium ring-1 ring-inset ${license.features[k] ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-400 ring-slate-200 line-through"}`}>
                  {k.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-slate-600">Activation history ({acts.length})</div>
              <Button size="sm" variant="outline" onClick={() => { resetDevices(license.id); }}>
                <ShieldOff className="h-3.5 w-3.5" /> Reset all devices
              </Button>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {acts.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No devices activated yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">OS</th><th className="px-3 py-2 text-left">Version</th><th className="px-3 py-2 text-left">Activated</th><th className="px-3 py-2 text-left">Last seen</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {acts.map(a => (
                      <tr key={a.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <MonitorSmartphone className="h-3.5 w-3.5 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-900">{a.machine_name}</div>
                              <div className="mono text-[10px] text-slate-500">{a.machine_id.slice(0, 16)}…</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{a.os}</td>
                        <td className="px-3 py-2 text-slate-600">{a.software_version}</td>
                        <td className="px-3 py-2 text-slate-600">{format(new Date(a.activated_at), "MMM d, yyyy")}</td>
                        <td className="px-3 py-2 text-slate-600">{format(new Date(a.last_seen), "MMM d, h:mm a")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

function CopyBtn({ text, variant = "default" }: { text: string; variant?: "default" | "invert" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1 rounded transition ${variant === "invert" ? "text-white/80 hover:bg-white/15" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
      title="Copy"
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// Unused placeholder to silence the lucide MoreHorizontal import.
void MoreHorizontal;
