import { useState } from "react";
import { CreditCard, ShieldCheck, KeyRound } from "lucide-react";
import { Button, inputCls } from "../components/ui";
import { HAS_BACKEND } from "../lib/api";
import { changePassword, login } from "../lib/session";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [phase, setPhase] = useState<"login" | "change">("login");
  const [email, setEmail] = useState("admin@pvccards.com");
  const [password, setPassword] = useState("Admin@123");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { mustChange } = await login(email, password);
      if (mustChange) {
        setPhase("change");
      } else {
        onLogin();
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await changePassword(password, newPassword);
      onLogin();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
            <CreditCard className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">PVC License Platform</h1>
          <p className="mt-1 text-sm text-slate-400">Admin Dashboard — Commercial Licensing</p>
        </div>

        {phase === "login" ? (
          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-500">JWT-secured admin access</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                <ShieldCheck className="h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <div className="mt-5 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
              Default admin: <span className="font-mono font-medium text-slate-700">admin@pvccards.com</span> /{" "}
              <span className="font-mono font-medium text-slate-700">Admin@123</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <KeyRound className="h-5 w-5 text-indigo-600" /> Set a new password
            </h2>
            <p className="mt-1 text-sm text-slate-500">First login requires a password change.</p>
            <form onSubmit={submitChange} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
                <input className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
                <input className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                <ShieldCheck className="h-4 w-4" /> {busy ? "Saving…" : "Update password & continue"}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          {HAS_BACKEND ? "Connected to FastAPI backend" : "Offline demo mode"} · HTTPS Ready · Rate Limited · Audit Logged
        </p>
      </div>
    </div>
  );
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail || e?.message || "Something went wrong";
}
