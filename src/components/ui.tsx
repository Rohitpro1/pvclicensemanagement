import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

// ---------- Button ----------
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
export function Button({
  variant = "primary", size = "md", className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const variants: Record<BtnVariant, string> = {
    primary:   "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost:     "text-slate-600 hover:bg-slate-100",
    danger:    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
    success:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    outline:   "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };
  return <button className={cn(base, sizes, variants[variant], className)} {...rest}>{children}</button>;
}

// ---------- Card ----------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Badge ----------
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "emerald" | "rose" | "amber" | "indigo" | "blue" | "violet" }) {
  const tones: Record<string, string> = {
    slate:   "bg-slate-100 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose:    "bg-rose-50 text-rose-700 ring-rose-200",
    amber:   "bg-amber-50 text-amber-700 ring-amber-200",
    indigo:  "bg-indigo-50 text-indigo-700 ring-indigo-200",
    blue:    "bg-blue-50 text-blue-700 ring-blue-200",
    violet:  "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset", tones[tone])}>{children}</span>;
}

// ---------- Inputs ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition", props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition", props.className)} />;
}

// ---------- Modal ----------
export function Modal({
  open, onClose, title, children, footer, size = "md",
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("bg-white w-full rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]", sizes)} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Empty state ----------
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">∅</div>
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ---------- Toggle ----------
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span
        onClick={() => onChange(!checked)}
        className={cn("relative inline-block h-5 w-9 rounded-full transition", checked ? "bg-indigo-600" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition shadow", checked ? "left-4" : "left-0.5")} />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}
