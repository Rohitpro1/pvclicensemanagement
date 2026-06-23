import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, CreditCard } from "lucide-react";
import { useDB } from "../lib/hooks";
import { createPlan, updatePlan, deletePlan, FEATURE_PRESETS } from "../lib/store";
import type { SubscriptionPlan, FeatureSet } from "../lib/types";
import { FEATURE_LABELS } from "../lib/types";
import { Button, Card, Modal, Field, inputCls, Toggle } from "../components/ui";
import { money } from "../lib/format";

export function Plans() {
  const db = useDB();
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Management interface only — no payment gateway integration (placeholders ready for future billing).</p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {db.plans.map((p) => {
          const assigned = db.licenses.filter((l) => l.plan_id === p.id).length;
          return (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete plan?")) deletePlan(p.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1">
                <span className="text-2xl font-bold text-slate-900">{money(p.price)}</span>
                {p.price > 0 && <span className="text-sm text-slate-400"> / {p.duration_days === 0 ? "lifetime" : p.duration_days >= 365 ? "year" : `${p.duration_days}d`}</span>}
              </p>
              <p className="mt-2 text-xs text-slate-500">{p.device_limit} device{p.device_limit > 1 ? "s" : ""} · {assigned} active license{assigned !== 1 ? "s" : ""}</p>
              <div className="mt-4 flex-1 space-y-1.5">
                {(Object.keys(p.features) as (keyof FeatureSet)[]).map((k) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    {p.features[k] ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300" />}
                    <span className={p.features[k] ? "text-slate-700" : "text-slate-400"}>{FEATURE_LABELS[k]}</span>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="mt-4 w-full cursor-not-allowed opacity-60" disabled title="Payment gateway not implemented">
                Subscribe (Coming Soon)
              </Button>
            </Card>
          );
        })}
      </div>

      {(creating || editing) && <PlanModal plan={editing} onClose={() => { setCreating(false); setEditing(null); }} />}
    </div>
  );
}

function PlanModal({ plan, onClose }: { plan: SubscriptionPlan | null; onClose: () => void }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price ?? 0);
  const [duration, setDuration] = useState(plan?.duration_days ?? 30);
  const [deviceLimit, setDeviceLimit] = useState(plan?.device_limit ?? 1);
  const [features, setFeatures] = useState<FeatureSet>(plan?.features ?? { ...FEATURE_PRESETS.Monthly });

  const save = () => {
    if (plan) updatePlan(plan.id, { name, price, duration_days: duration, device_limit: deviceLimit, features });
    else createPlan({ name, price, duration_days: duration, device_limit: deviceLimit, features });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={plan ? "Edit Plan" : "New Subscription Plan"} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Plan Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Price (USD)"><input type="number" min={0} className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
        <Field label="Duration (days)" hint="0 = lifetime"><input type="number" min={0} className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
        <Field label="Device Limit"><input type="number" min={1} className={inputCls} value={deviceLimit} onChange={(e) => setDeviceLimit(Number(e.target.value))} /></Field>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-slate-700">Included Features</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(features) as (keyof FeatureSet)[]).map((k) => (
            <Toggle key={k} label={FEATURE_LABELS[k]} checked={features[k]} onChange={(v) => setFeatures({ ...features, [k]: v })} />
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!name}>{plan ? "Save" : "Create Plan"}</Button>
      </div>
    </Modal>
  );
}
