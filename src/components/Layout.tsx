import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  KeyRound,
  MonitorSmartphone,
  Users,
  BarChart3,
  Package,
  Settings,
  TerminalSquare,
  CreditCard,
  LogOut,
  Menu,
  X,
  ArrowUpCircle,
} from "lucide-react";
import { cn } from "../utils/cn";

export type Page =
  | "dashboard"
  | "licenses"
  | "activations"
  | "customers"
  | "analytics"
  | "plans"
  | "simulator"
  | "settings"
  | "updates";

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "licenses", label: "Licenses", icon: KeyRound },
  { id: "activations", label: "Activations", icon: MonitorSmartphone },
  { id: "customers", label: "Customers", icon: Users },
  { id: "analytics", label: "Usage Analytics", icon: BarChart3 },
  { id: "plans", label: "Subscription Plans", icon: Package },
  { id: "updates", label: "Software Updates", icon: ArrowUpCircle },
  { id: "simulator", label: "Desktop Simulator", icon: TerminalSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Layout({
  page,
  setPage,
  onLogout,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">PVC License</p>
          <p className="text-[11px] text-slate-400">Management Platform</p>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-slate-400">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold capitalize text-slate-900">
            {NAV.find((n) => n.id === page)?.label}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">Admin User</p>
              <p className="text-xs text-slate-400">admin@pvclicense.io</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
              A
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
