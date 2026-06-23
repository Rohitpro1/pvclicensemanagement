import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, ShieldCheck, KeyRound, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const { login } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@pvclm.io");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) nav("/dashboard");
    else setErr("Invalid credentials");
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-grid flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg leading-tight">PVC License Manager</div>
              <div className="text-xs text-slate-500 leading-tight uppercase tracking-wide">Admin Console</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Sign in to your workspace</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage licenses, devices and usage analytics for PVC Card Generator.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email address">
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {err && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{err}</div>}
            <Button type="submit" className="w-full">Sign in</Button>
            <div className="text-xs text-slate-500 text-center">
              Demo: any credentials work. JWT auth is wired on the FastAPI backend.
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Protected by JWT, bcrypt password hashing & rate limiting.
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-12 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative max-w-md">
          <Sparkles className="h-8 w-8 mb-4 opacity-90" />
          <h2 className="text-3xl font-bold leading-tight">Commercial licensing,<br/>built for desktop software.</h2>
          <p className="mt-4 text-indigo-100 leading-relaxed">
            Issue secure license keys, bind to devices, track usage, enforce expiry, and remotely disable rogue installations — all from a single console.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { i: KeyRound, t: "Cryptographic key generation", d: "PVC-1Y-XXXX-XXXX-XXXX format with 32-symbol alphabet." },
              { i: ShieldCheck, t: "Heartbeat & remote disable", d: "Desktop clients beacon every 24h. Block instantly." },
              { i: Sparkles, t: "Feature unlocking via JSON", d: "Server-driven feature flags per license." },
            ].map(({i: Icon, t, d}) => (
              <div key={t} className="flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-indigo-100/90">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
