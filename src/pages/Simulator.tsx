import { useState } from "react";
import { TerminalSquare, Power, ShieldCheck, HeartPulse, Activity } from "lucide-react";
import { useDB } from "../lib/hooks";
import { apiActivate, apiValidate, apiHeartbeat, apiUsage } from "../lib/store";
import type { UsageEventType } from "../lib/types";
import { Button, Card, Field, inputCls } from "../components/ui";

const EVENTS: UsageEventType[] = ["CARD_GENERATED", "CARD_PRINTED", "PDF_IMPORTED", "BATCH_JOB"];

export function Simulator() {
  const db = useDB();
  const [licenseKey, setLicenseKey] = useState(db.licenses[0]?.license_key ?? "");
  const [machineId, setMachineId] = useState("MID-DEMO-001");
  const [machineName, setMachineName] = useState("DEMO-WORKSTATION");
  const [version, setVersion] = useState("3.4.0");
  const [event, setEvent] = useState<UsageEventType>("CARD_GENERATED");
  const [count, setCount] = useState(10);
  const [output, setOutput] = useState<{ label: string; data: unknown; ok: boolean } | null>(null);

  const run = (label: string, fn: () => unknown, ok = true) => {
    const data = fn();
    const okFlag = typeof data === "object" && data !== null && "ok" in (data as object) ? (data as { ok: boolean }).ok : ok;
    setOutput({ label, data, ok: okFlag !== false });
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Desktop Software API Simulator</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Simulate the PVC Card Generator desktop client calling the licensing endpoints (<code className="text-indigo-600">/activate</code>, <code className="text-indigo-600">/validate</code>, <code className="text-indigo-600">/heartbeat</code>, <code className="text-indigo-600">/usage</code>).
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="License Key">
            <select className={inputCls} value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)}>
              {db.licenses.map((l) => (
                <option key={l.id} value={l.license_key}>{l.license_key} ({l.license_type})</option>
              ))}
            </select>
          </Field>
          <Field label="Machine ID"><input className={inputCls} value={machineId} onChange={(e) => setMachineId(e.target.value)} /></Field>
          <Field label="Machine Name"><input className={inputCls} value={machineName} onChange={(e) => setMachineName(e.target.value)} /></Field>
          <Field label="Software Version"><input className={inputCls} value={version} onChange={(e) => setVersion(e.target.value)} /></Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => run("POST /activate", () => apiActivate(licenseKey, machineId, machineName, version))}>
            <Power className="h-4 w-4" /> Activate
          </Button>
          <Button variant="secondary" onClick={() => run("POST /validate", () => apiValidate(licenseKey, machineId))}>
            <ShieldCheck className="h-4 w-4" /> Validate
          </Button>
          <Button variant="secondary" onClick={() => run("POST /heartbeat", () => apiHeartbeat(licenseKey, machineId, version))}>
            <HeartPulse className="h-4 w-4" /> Heartbeat
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
          <Field label="Usage Event">
            <select className={inputCls + " sm:w-48"} value={event} onChange={(e) => setEvent(e.target.value as UsageEventType)}>
              {EVENTS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Count">
            <input type="number" min={1} className={inputCls + " w-28"} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </Field>
          <Button variant="success" onClick={() => run("POST /usage", () => apiUsage(licenseKey, machineId, event, count))}>
            <Activity className="h-4 w-4" /> Send Usage
          </Button>
        </div>
      </Card>

      {output && (
        <Card className="overflow-hidden">
          <div className={`flex items-center justify-between px-5 py-3 ${output.ok ? "bg-emerald-50" : "bg-rose-50"}`}>
            <span className="font-mono text-sm font-semibold text-slate-800">{output.label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${output.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {output.ok ? "200 OK" : "403 / Error"}
            </span>
          </div>
          <pre className="overflow-x-auto bg-slate-900 px-5 py-4 text-xs leading-relaxed text-emerald-300">
{JSON.stringify(output.data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
