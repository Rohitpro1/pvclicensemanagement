import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, KeyRound, MonitorSmartphone, Users, BarChart3,
  Package, FileCode2, Container, Settings, LogOut, CreditCard, Bell, ShieldCheck,
} from "lucide-react";
import { useStore } from "../lib/store";
import { Badge } from "./ui";
import { cn } from "../utils/cn";

const nav = [
  { to: "/dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { to: "/licenses",   label: "Licenses",           icon: KeyRound },
  { to: "/activations",label: "Activations",        icon: MonitorSmartphone },
  { to: "/customers",  label: "Customers",          icon: Users },
  { to: "/analytics",  label: "Usage Analytics",    icon: BarChart3 },
  { to: "/plans",      label: "Subscription Plans", icon: Package },
  { to: "/api-docs",   label: "API Reference",      icon: FileCode2 },
  { to: "/deployment", label: "Deployment",         icon: Container },
  { to: "/settings",   label: "Settings",           icon: Settings },
];

export default function Layout() {
  const { user, logout, data } = useStore();
  const nav2 = useNavigate();

  const blockedCount = data.licenses.filter(l => l.status === "blocked").length;
  const expiringSoon = data.licenses.filter(l => {
    if (!l.expires_at || l.status !== "active") return false;
    const d = (new Date(l.expires_at).getTime() - Date.now()) / 86400000;
    return d >= 0 && d <= 14;
  }).length;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 leading-tight">PVC License</div>
            <div className="text-[10px] text-slate-500 leading-tight uppercase tracking-wide">Admin Console</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition group",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.to === "/licenses" && blockedCount > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 rounded">{blockedCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              {user?.email[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? "Admin"}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={() => { logout(); nav2("/login"); }}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-rose-600"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
          <div className="flex-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-slate-600">Production cluster — <span className="text-emerald-700 font-medium">healthy</span></span>
          </div>
          <div className="flex items-center gap-2">
            {expiringSoon > 0 && (
              <Badge tone="amber">{expiringSoon} expiring ≤ 14d</Badge>
            )}
            {blockedCount > 0 && (
              <Badge tone="rose">{blockedCount} blocked</Badge>
            )}
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
