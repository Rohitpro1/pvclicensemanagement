import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    expired: "bg-amber-50 text-amber-700 ring-amber-600/20",
    blocked: "bg-rose-50 text-rose-700 ring-rose-600/20",
    disabled: "bg-slate-100 text-slate-600 ring-slate-500/20",
  };
  const dot: Record<string, string> = {
    active: "bg-emerald-500",
    expired: "bg-amber-500",
    blocked: "bg-rose-500",
    disabled: "bg-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", map[status] ?? map.disabled)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status] ?? dot.disabled)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Trial: "bg-slate-100 text-slate-700",
    Monthly: "bg-sky-100 text-sky-700",
    Yearly: "bg-indigo-100 text-indigo-700",
    Lifetime: "bg-violet-100 text-violet-700",
    Enterprise: "bg-fuchsia-100 text-fuchsia-700",
  };
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", map[type] ?? map.Trial)}>{type}</span>;
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: BtnVariant; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<BtnVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
      <div className={cn("my-4 w-full rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors", checked ? "border-indigo-200 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-600")}
    >
      <span className="font-medium">{label}</span>
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4" : "left-0.5")} />
      </span>
    </button>
  );
}
