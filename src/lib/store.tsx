import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  Customer, License, Activation, UsageLog, SubscriptionPlan, AuditLog, LicenseType, Features, UsageEvent, AdminUser,
} from "./types";
import { buildSeedData, featuresForType } from "./mockData";
import { generateLicenseKey, generateMachineId } from "./licenseKey";

const STORAGE_KEY = "pvclm.v1";
const AUTH_KEY = "pvclm.auth.v1";

interface Data {
  customers: Customer[];
  licenses: License[];
  activations: Activation[];
  usage: UsageLog[];
  plans: SubscriptionPlan[];
  audit: AuditLog[];
}

interface Ctx {
  data: Data;
  user: AdminUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Customers
  createCustomer: (c: Omit<Customer, "id" | "created_at" | "role">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Licenses
  createLicense: (input: {
    customer_id: string;
    license_type: LicenseType;
    device_limit: number;
    durationDays: number; // 0 = lifetime
    features: Features;
    plan_id?: string;
  }) => License;
  updateLicense: (id: string, patch: Partial<License>) => void;
  blockLicense: (id: string) => void;
  unblockLicense: (id: string) => void;
  renewLicense: (id: string, days: number) => void;
  resetDevices: (id: string) => void;
  deleteLicense: (id: string) => void;

  // Plans
  createPlan: (p: Omit<SubscriptionPlan, "id">) => SubscriptionPlan;
  updatePlan: (id: string, patch: Partial<SubscriptionPlan>) => void;
  deletePlan: (id: string) => void;

  // Simulation
  simulateActivation: (license_key: string, machine_name: string) => { ok: boolean; message: string; activation?: Activation };
  simulateHeartbeat: (license_id: string, machine_id: string) => void;
  recordUsage: (license_id: string, machine_id: string, e: UsageEvent, n: number) => void;

  resetSeed: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = buildSeedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function loadUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(loadData);
  const [user, setUser] = useState<AdminUser | null>(loadUser);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  const audit = useCallback((action: string, target: string) => {
    setData(d => ({
      ...d,
      audit: [
        { id: "aud_" + Math.random().toString(36).slice(2, 10), actor: user?.email ?? "system", action, target, created_at: new Date().toISOString() },
        ...d.audit,
      ].slice(0, 200),
    }));
  }, [user]);

  const login: Ctx["login"] = (email, password) => {
    // Mock JWT: any non-empty password works. In production, this hits POST /auth/login (FastAPI).
    if (!email || !password) return false;
    const u: AdminUser = { email, name: email.split("@")[0].replace(/\./g, " "), role: "admin" };
    setUser(u);
    return true;
  };

  const logout = () => setUser(null);

  // ---------------- CRUD ----------------
  const createCustomer: Ctx["createCustomer"] = (c) => {
    const newCust: Customer = {
      id: "usr_" + Math.random().toString(36).slice(2, 10),
      created_at: new Date().toISOString(),
      role: "customer",
      ...c,
    };
    setData(d => ({ ...d, customers: [newCust, ...d.customers] }));
    audit("CUSTOMER_CREATED", newCust.email);
    return newCust;
  };
  const updateCustomer: Ctx["updateCustomer"] = (id, patch) => {
    setData(d => ({ ...d, customers: d.customers.map(c => c.id === id ? { ...c, ...patch } : c) }));
    audit("CUSTOMER_UPDATED", id);
  };
  const deleteCustomer: Ctx["deleteCustomer"] = (id) => {
    setData(d => ({ ...d, customers: d.customers.filter(c => c.id !== id) }));
    audit("CUSTOMER_DELETED", id);
  };

  const createLicense: Ctx["createLicense"] = (input) => {
    const now = new Date();
    const expires = input.durationDays > 0 ? new Date(now.getTime() + input.durationDays * 86400000) : null;
    const lic: License = {
      id: "lic_" + Math.random().toString(36).slice(2, 10),
      license_key: generateLicenseKey(input.license_type),
      customer_id: input.customer_id,
      license_type: input.license_type,
      status: "active",
      device_limit: input.device_limit,
      features: input.features,
      created_at: now.toISOString(),
      start_date: now.toISOString(),
      expires_at: expires ? expires.toISOString() : null,
      renewal_due_date: (input.license_type === "Yearly" || input.license_type === "Enterprise") && expires
        ? expires.toISOString() : null,
      plan_id: input.plan_id,
    };
    setData(d => ({ ...d, licenses: [lic, ...d.licenses] }));
    audit("LICENSE_CREATED", lic.license_key);
    return lic;
  };
  const updateLicense: Ctx["updateLicense"] = (id, patch) => {
    setData(d => ({ ...d, licenses: d.licenses.map(l => l.id === id ? { ...l, ...patch } : l) }));
    audit("LICENSE_UPDATED", id);
  };
  const blockLicense: Ctx["blockLicense"] = (id) => {
    setData(d => ({ ...d, licenses: d.licenses.map(l => l.id === id ? { ...l, status: "blocked" } : l) }));
    audit("LICENSE_BLOCKED", id);
  };
  const unblockLicense: Ctx["unblockLicense"] = (id) => {
    setData(d => ({ ...d, licenses: d.licenses.map(l => {
      if (l.id !== id) return l;
      const expired = l.expires_at && new Date(l.expires_at) < new Date();
      return { ...l, status: expired ? "expired" : "active" };
    }) }));
    audit("LICENSE_UNBLOCKED", id);
  };
  const renewLicense: Ctx["renewLicense"] = (id, days) => {
    setData(d => ({
      ...d,
      licenses: d.licenses.map(l => {
        if (l.id !== id) return l;
        const base = l.expires_at && new Date(l.expires_at) > new Date() ? new Date(l.expires_at) : new Date();
        const newExp = new Date(base.getTime() + days * 86400000);
        return {
          ...l,
          expires_at: newExp.toISOString(),
          renewal_due_date: newExp.toISOString(),
          status: "active",
        };
      }),
    }));
    audit("LICENSE_RENEWED", id);
  };
  const resetDevices: Ctx["resetDevices"] = (id) => {
    setData(d => ({ ...d, activations: d.activations.filter(a => a.license_id !== id) }));
    audit("DEVICES_RESET", id);
  };
  const deleteLicense: Ctx["deleteLicense"] = (id) => {
    setData(d => ({
      ...d,
      licenses: d.licenses.filter(l => l.id !== id),
      activations: d.activations.filter(a => a.license_id !== id),
      usage: d.usage.filter(u => u.license_id !== id),
    }));
    audit("LICENSE_DELETED", id);
  };

  // Plans
  const createPlan: Ctx["createPlan"] = (p) => {
    const np: SubscriptionPlan = { id: "plan_" + Math.random().toString(36).slice(2, 8), ...p };
    setData(d => ({ ...d, plans: [...d.plans, np] }));
    audit("PLAN_CREATED", np.name);
    return np;
  };
  const updatePlan: Ctx["updatePlan"] = (id, patch) => {
    setData(d => ({ ...d, plans: d.plans.map(p => p.id === id ? { ...p, ...patch } : p) }));
    audit("PLAN_UPDATED", id);
  };
  const deletePlan: Ctx["deletePlan"] = (id) => {
    setData(d => ({ ...d, plans: d.plans.filter(p => p.id !== id) }));
    audit("PLAN_DELETED", id);
  };

  // Simulated runtime API calls (what the desktop app would invoke)
  const simulateActivation: Ctx["simulateActivation"] = (license_key, machine_name) => {
    const lic = data.licenses.find(l => l.license_key === license_key);
    if (!lic) return { ok: false, message: "License not found." };
    if (lic.status === "blocked") return { ok: false, message: "License is blocked." };
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) return { ok: false, message: "License has expired." };
    const existing = data.activations.filter(a => a.license_id === lic.id);
    if (existing.length >= lic.device_limit) return { ok: false, message: `Device limit (${lic.device_limit}) reached.` };
    const act: Activation = {
      id: "act_" + Math.random().toString(36).slice(2, 10),
      license_id: lic.id,
      machine_id: generateMachineId(),
      machine_name,
      software_version: "2.6.0",
      os: "Windows 11 Pro",
      activated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };
    setData(d => ({ ...d, activations: [act, ...d.activations] }));
    audit("DEVICE_ACTIVATED", `${license_key} / ${machine_name}`);
    return { ok: true, message: "Activation successful.", activation: act };
  };

  const simulateHeartbeat: Ctx["simulateHeartbeat"] = (license_id, machine_id) => {
    setData(d => ({
      ...d,
      activations: d.activations.map(a =>
        a.license_id === license_id && a.machine_id === machine_id
          ? { ...a, last_seen: new Date().toISOString() } : a
      ),
    }));
  };

  const recordUsage: Ctx["recordUsage"] = (license_id, machine_id, event_type, event_count) => {
    setData(d => ({
      ...d,
      usage: [{
        id: "usg_" + Math.random().toString(36).slice(2, 10),
        license_id, machine_id, event_type, event_count,
        created_at: new Date().toISOString(),
      }, ...d.usage],
    }));
  };

  const resetSeed = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(buildSeedData());
  };

  const value = useMemo<Ctx>(() => ({
    data, user, login, logout,
    createCustomer, updateCustomer, deleteCustomer,
    createLicense, updateLicense, blockLicense, unblockLicense, renewLicense, resetDevices, deleteLicense,
    createPlan, updatePlan, deletePlan,
    simulateActivation, simulateHeartbeat, recordUsage,
    resetSeed,
  }), [data, user]); // eslint-disable-line

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore must be inside StoreProvider");
  return v;
}

export { featuresForType };
