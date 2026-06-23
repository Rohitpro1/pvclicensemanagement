import { useState } from "react";
import { Plus, Edit3, Trash2, Package, Check, X, Infinity as Inf } from "lucide-react";
import { useStore } from "../lib/store";
import type { SubscriptionPlan, Features } from "../lib/types";
import { Button, Card, Badge, Modal, Field, Input, Textarea, Toggle } from "../components/ui";

const DEFAULT_FEATURES: Features = {
  batch_processing: false, card_history: true, analytics: false,
  multi_operator: false, pdf_import: false, cloud_sync: false,
};

export default function Plans() {
  const { data, createPlan, updatePlan, deletePlan } = useStore();
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define the plan catalog. <span className="italic">Payment gateway integration is intentionally out of scope.</span></p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create Plan</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
        <Package className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Plan catalog only.</strong> Prices are stored for reference. Database & UI placeholders exist for future payment provider integration (Stripe / Razorpay / Paddle).
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.plans.map(p => (
          <Card key={p.id} className="p-6 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">{p.duration_days === 0 ? "Lifetime" : `${p.duration_days}-day cycle`}</div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{p.name}</h3>
              </div>
              <Badge tone="violet">{p.device_limit} device{p.device_limit > 1 ? "s" : ""}</Badge>
            </div>

            <div className="mt-4">
              <span className="text-3xl font-bold text-slate-900">${p.price}</span>
              <span className="text-sm text-slate-500 ml-1">
                {p.duration_days === 0 ? "one-time" : p.duration_days === 30 ? "/ month" : p.duration_days === 365 ? "/ year" : `/ ${p.duration_days}d`}
              </span>
            </div>

            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{p.description}</p>

            <div className="mt-4 space-y-1.5 text-sm flex-1">
              {(Object.keys(p.features) as (keyof Features)[]).map(k => (
                <div key={k} className="flex items-center gap-2">
                  {p.features[k]
                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={p.features[k] ? "text-slate-700" : "text-slate-400 line-through"}>{k.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this plan?")) deletePlan(p.id); }}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
            </div>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <PlanForm
          plan={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(p) => {
            if (editing) updatePlan(editing.id, p);
            else createPlan(p);
            setCreating(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PlanForm({ plan, onClose, onSave }: { plan?: SubscriptionPlan; onClose: () => void; onSave: (p: Omit<SubscriptionPlan, "id">) => void }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price ?? 0);
  const [duration, setDuration] = useState(plan?.duration_days ?? 30);
  const [devices, setDevices] = useState(plan?.device_limit ?? 1);
  const [description, setDescription] = useState(plan?.description ?? "");
  const [features, setFeatures] = useState<Features>(plan?.features ?? DEFAULT_FEATURES);

  return (
    <Modal open onClose={onClose} title={plan ? "Edit plan" : "Create plan"} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ name, price, duration_days: duration, device_limit: devices, description, features })}>{plan ? "Save plan" : "Create plan"}</Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Plan name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Professional — Yearly" /></Field>
        <Field label="Price (USD)"><Input type="number" min={0} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} /></Field>
        <Field label="Duration (days) — 0 for Lifetime" hint={duration === 0 ? "This plan never expires." : ""}>
          <Input type="number" min={0} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Device limit">
          <div className="relative">
            <Input type="number" min={1} value={devices} onChange={e => setDevices(parseInt(e.target.value) || 1)} />
            <Inf className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
          </div>
        </Field>
        <div className="col-span-2">
          <Field label="Description"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></Field>
        </div>
        <div className="col-span-2">
          <div className="text-xs font-medium text-slate-600 mb-2">Features (features_json)</div>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
            {(Object.keys(features) as (keyof Features)[]).map(k => (
              <Toggle key={k} checked={features[k]} onChange={v => setFeatures({ ...features, [k]: v })} label={k.replace(/_/g, " ")} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
