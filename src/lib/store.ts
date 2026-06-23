import type {
  DB,
  License,
  LicenseType,
  FeatureSet,
  Customer,
  Activation,
  UsageLog,
  SubscriptionPlan,
  AuditLog,
  UsageEventType,
} from "./types";
import {
  HAS_BACKEND,
  dbApi,
  licensesApi,
  customersApi,
  plansApi,
  deviceApi,
  adminApi,
} from "./api";

const STORAGE_KEY = "pvc_license_platform_v1";

/* ---------------- Crypto helpers ---------------- */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

function randomBlock(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const TYPE_PREFIX: Record<LicenseType, string> = {
  Trial: "TR",
  Monthly: "MO",
  Yearly: "1Y",
  Lifetime: "LT",
  Enterprise: "EN",
};

export function generateLicenseKey(type: LicenseType): string {
  const prefix = TYPE_PREFIX[type];
  return `PVC-${prefix}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
}

export function uid(prefix = ""): string {
  return prefix + randomBlock(8) + Date.now().toString(36).toUpperCase();
}

export function generateToken(): string {
  return Array.from(randomBytes(24))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------- Feature presets ---------------- */

export const FEATURE_PRESETS: Record<LicenseType, FeatureSet> = {
  Trial: { batch_processing: false, card_history: true, analytics: false, multi_operator: false, pdf_import: false, cloud_backup: false },
  Monthly: { batch_processing: true, card_history: true, analytics: false, multi_operator: false, pdf_import: true, cloud_backup: false },
  Yearly: { batch_processing: true, card_history: true, analytics: true, multi_operator: false, pdf_import: true, cloud_backup: true },
  Lifetime: { batch_processing: true, card_history: true, analytics: true, multi_operator: true, pdf_import: true, cloud_backup: true },
  Enterprise: { batch_processing: true, card_history: true, analytics: true, multi_operator: true, pdf_import: true, cloud_backup: true },
};

export const TYPE_DURATION_DAYS: Record<LicenseType, number | null> = {
  Trial: 14,
  Monthly: 30,
  Yearly: 365,
  Lifetime: null,
  Enterprise: 365,
};

export const TYPE_DEVICE_LIMIT: Record<LicenseType, number> = {
  Trial: 1,
  Monthly: 2,
  Yearly: 3,
  Lifetime: 5,
  Enterprise: 25,
};

/* ---------------- Date helpers ---------------- */

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function iso(d: Date): string {
  return d.toISOString();
}

export function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

/* ---------------- Status computation ---------------- */

export function effectiveStatus(lic: License): License["status"] {
  if (lic.status === "blocked") return "blocked";
  if (lic.status === "disabled") return "disabled";
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) return "expired";
  return "active";
}

/* ---------------- Offline seed (demo mode only) ---------------- */

const MACHINE_NAMES = [
  "WORKSTATION-01", "PRINT-STATION-A", "FRONTDESK-PC", "LAB-PC-09",
  "ADMIN-LAPTOP", "KIOSK-04", "OFFICE-DESKTOP", "STUDIO-MAC",
];

function seed(): DB {
  const now = new Date();
  const customers: Customer[] = [
    { id: "c1", name: "Rajesh Kumar", email: "rajesh@idprints.in", company: "ID Prints India", phone: "+91 98765 43210", role: "customer", created_at: iso(addDays(now, -210)) },
    { id: "c2", name: "Sara Mendez", email: "sara@cardpro.mx", company: "CardPro Solutions", phone: "+52 55 1234 5678", role: "customer", created_at: iso(addDays(now, -180)) },
    { id: "c3", name: "Daniel Owusu", email: "daniel@swiftbadge.com", company: "SwiftBadge Ltd", phone: "+44 20 7946 0958", role: "customer", created_at: iso(addDays(now, -150)) },
    { id: "c4", name: "Mei Lin", email: "mei@printhub.sg", company: "PrintHub Asia", phone: "+65 6123 4567", role: "customer", created_at: iso(addDays(now, -120)) },
    { id: "c5", name: "Omar Haddad", email: "omar@gulfcards.ae", company: "Gulf Cards", phone: "+971 4 123 4567", role: "customer", created_at: iso(addDays(now, -90)) },
    { id: "c6", name: "Lucia Rossi", email: "lucia@bellacard.it", company: "BellaCard Studio", phone: "+39 06 1234 567", role: "customer", created_at: iso(addDays(now, -60)) },
    { id: "c7", name: "Admin User", email: "admin@pvccards.com", company: "PVC License Platform", phone: "+1 555 010 0000", role: "admin", created_at: iso(addDays(now, -365)) },
  ];

  const plans: SubscriptionPlan[] = [
    { id: "p1", name: "Trial", price: 0, duration_days: 14, device_limit: 1, features: { ...FEATURE_PRESETS.Trial } },
    { id: "p2", name: "Basic", price: 49, duration_days: 30, device_limit: 2, features: { ...FEATURE_PRESETS.Monthly } },
    { id: "p3", name: "Professional", price: 199, duration_days: 365, device_limit: 3, features: { ...FEATURE_PRESETS.Yearly } },
    { id: "p4", name: "Enterprise", price: 999, duration_days: 365, device_limit: 25, features: { ...FEATURE_PRESETS.Enterprise } },
  ];

  const licenses: License[] = [];
  const activations: Activation[] = [];
  const usage: UsageLog[] = [];

  const setup: Array<[string, LicenseType, License["status"], number]> = [
    ["c1", "Yearly", "active", -120], ["c1", "Monthly", "active", -20],
    ["c2", "Enterprise", "active", -200], ["c3", "Lifetime", "active", -300],
    ["c3", "Yearly", "expired", -400], ["c4", "Yearly", "active", -350],
    ["c4", "Trial", "expired", -30], ["c5", "Monthly", "blocked", -45],
    ["c5", "Yearly", "active", -355], ["c6", "Trial", "active", -5],
    ["c6", "Enterprise", "active", -60], ["c2", "Monthly", "active", -355],
  ];

  setup.forEach(([cid, type, status, startOffset], idx) => {
    const start = addDays(now, startOffset);
    const dur = TYPE_DURATION_DAYS[type];
    const expires = dur === null ? null : addDays(start, dur);
    const plan = plans.find((p) => p.name === (type === "Yearly" ? "Professional" : type === "Enterprise" ? "Enterprise" : type === "Monthly" ? "Basic" : "Trial"));
    const lic: License = {
      id: `l${idx + 1}`,
      license_key: generateLicenseKey(type),
      license_type: type,
      status,
      device_limit: TYPE_DEVICE_LIMIT[type],
      features: { ...FEATURE_PRESETS[type] },
      customer_id: cid,
      plan_id: plan?.id ?? null,
      created_at: iso(start),
      start_date: iso(start),
      expires_at: expires ? iso(expires) : null,
      renewal_due_date: expires ? iso(expires) : null,
    };
    licenses.push(lic);

    const devices = Math.min(lic.device_limit, 1 + (idx % 3));
    for (let d = 0; d < devices; d++) {
      const act: Activation = {
        id: uid("a"),
        license_id: lic.id,
        machine_id: "MID-" + randomBlock(8),
        machine_name: MACHINE_NAMES[(idx + d) % MACHINE_NAMES.length],
        software_version: "3." + (1 + (d % 4)) + ".0",
        activated_at: iso(addDays(start, 1)),
        last_seen: iso(addDays(now, -(idx % 3))),
      };
      activations.push(act);

      const events: UsageEventType[] = ["CARD_GENERATED", "CARD_PRINTED", "PDF_IMPORTED", "BATCH_JOB"];
      for (let day = 0; day < 30; day++) {
        events.forEach((ev) => {
          const base = ev === "CARD_GENERATED" ? 40 : ev === "CARD_PRINTED" ? 25 : ev === "PDF_IMPORTED" ? 4 : 2;
          const cnt = Math.max(0, Math.round(base * Math.random() * (status === "active" ? 1 : 0.2)));
          if (cnt > 0) {
            usage.push({ id: uid("u"), license_id: lic.id, machine_id: act.machine_id, event_type: ev, event_count: cnt, created_at: iso(addDays(now, -day)) });
          }
        });
      }
    }
  });

  const audit: AuditLog[] = [
    { id: uid(), action: "LICENSE_BLOCKED", detail: "License for Gulf Cards blocked (payment overdue)", actor: "admin@pvccards.com", created_at: iso(addDays(now, -3)) },
    { id: uid(), action: "LICENSE_CREATED", detail: "Yearly license created for ID Prints India", actor: "admin@pvccards.com", created_at: iso(addDays(now, -20)) },
  ];

  return { customers, licenses, activations, usage, plans, audit };
}

/* ---------------- State + persistence ---------------- */

const EMPTY_DB: DB = { customers: [], licenses: [], activations: [], usage: [], plans: [], audit: [] };

let db: DB;

function loadOffline(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* ignore */
  }
  const fresh = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

// In online mode start empty and hydrate from the API after login.
db = HAS_BACKEND ? structuredClone(EMPTY_DB) : loadOffline();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  if (!HAS_BACKEND) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  notify();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDB(): DB {
  return db;
}

/** Pull the full dataset from the backend (online mode) and refresh the UI. */
export async function hydrate(): Promise<void> {
  if (!HAS_BACKEND) {
    db = loadOffline();
    notify();
    return;
  }
  try {
    const data = await dbApi.get();
    db = {
      customers: data.customers ?? [],
      licenses: data.licenses ?? [],
      activations: data.activations ?? [],
      usage: data.usage ?? [],
      plans: data.plans ?? [],
      audit: data.audit ?? [],
    };
    notify();
  } catch (e) {
    console.error("Failed to hydrate from API", e);
  }
}

// Run a backend write in the background, then reconcile by re-hydrating.
function bg(p: Promise<unknown>) {
  p.then(() => hydrate()).catch((e) => console.error("Sync error", e));
}

function audit(action: string, detail: string) {
  db.audit.unshift({ id: uid(), action, detail, actor: "admin@pvccards.com", created_at: new Date().toISOString() });
  db.audit = db.audit.slice(0, 100);
}

export function resetDB() {
  if (HAS_BACKEND) {
    bg(adminApi.reset());
    return;
  }
  db = seed();
  persist();
}

/* ---------------- License operations ---------------- */

export function createLicense(input: {
  license_type: LicenseType;
  customer_id: string | null;
  plan_id: string | null;
  device_limit: number;
  features: FeatureSet;
  start_date: string;
  expires_at: string | null;
}): License {
  const lic: License = {
    id: uid("l"),
    license_key: generateLicenseKey(input.license_type),
    license_type: input.license_type,
    status: "active",
    device_limit: input.device_limit,
    features: input.features,
    customer_id: input.customer_id,
    plan_id: input.plan_id,
    created_at: new Date().toISOString(),
    start_date: input.start_date,
    expires_at: input.expires_at,
    renewal_due_date: input.expires_at,
  };
  db.licenses.unshift(lic);
  audit("LICENSE_CREATED", `${lic.license_key} (${lic.license_type})`);
  persist();
  if (HAS_BACKEND) {
    bg(licensesApi.create({
      license_type: lic.license_type,
      status: lic.status,
      device_limit: lic.device_limit,
      features: lic.features,
      customer_id: lic.customer_id,
      plan_id: lic.plan_id,
      start_date: lic.start_date,
      expires_at: lic.expires_at,
    }));
  }
  return lic;
}

export function updateLicense(id: string, patch: Partial<License>) {
  const lic = db.licenses.find((l) => l.id === id);
  if (!lic) return;
  Object.assign(lic, patch);
  audit("LICENSE_UPDATED", `${lic.license_key}`);
  persist();
  if (HAS_BACKEND) {
    bg(licensesApi.update(id, {
      license_type: lic.license_type,
      status: lic.status,
      device_limit: lic.device_limit,
      features: lic.features,
      customer_id: lic.customer_id,
      plan_id: lic.plan_id,
      start_date: lic.start_date,
      expires_at: lic.expires_at,
      renewal_due_date: lic.renewal_due_date,
    }));
  }
}

export function renewLicense(id: string, days: number) {
  const lic = db.licenses.find((l) => l.id === id);
  if (!lic) return;
  const base = lic.expires_at && new Date(lic.expires_at) > new Date() ? new Date(lic.expires_at) : new Date();
  const newExpiry = addDays(base, days);
  lic.expires_at = newExpiry.toISOString();
  lic.renewal_due_date = newExpiry.toISOString();
  if (lic.status === "expired") lic.status = "active";
  audit("LICENSE_RENEWED", `${lic.license_key} +${days} days`);
  persist();
  if (HAS_BACKEND) bg(licensesApi.renew(id, days));
}

export function setLicenseStatus(id: string, status: License["status"]) {
  const lic = db.licenses.find((l) => l.id === id);
  if (!lic) return;
  lic.status = status;
  audit(status === "blocked" ? "LICENSE_BLOCKED" : status === "disabled" ? "LICENSE_DISABLED" : "LICENSE_ACTIVATED", `${lic.license_key} → ${status}`);
  persist();
  if (HAS_BACKEND) bg(licensesApi.setStatus(id, status));
}

export function deleteLicense(id: string) {
  const lic = db.licenses.find((l) => l.id === id);
  db.licenses = db.licenses.filter((l) => l.id !== id);
  db.activations = db.activations.filter((a) => a.license_id !== id);
  db.usage = db.usage.filter((u) => u.license_id !== id);
  if (lic) audit("LICENSE_DELETED", `${lic.license_key}`);
  persist();
  if (HAS_BACKEND) bg(licensesApi.remove(id));
}

export function resetDevices(id: string) {
  db.activations = db.activations.filter((a) => a.license_id !== id);
  const lic = db.licenses.find((l) => l.id === id);
  if (lic) audit("DEVICES_RESET", `${lic.license_key}`);
  persist();
  if (HAS_BACKEND) bg(licensesApi.resetDevices(id));
}

/* ---------------- Customer operations ---------------- */

export function createCustomer(input: Omit<Customer, "id" | "created_at" | "role"> & { role?: Customer["role"] }): Customer {
  const c: Customer = { id: uid("c"), created_at: new Date().toISOString(), role: input.role ?? "customer", ...input };
  db.customers.unshift(c);
  audit("CUSTOMER_CREATED", `${c.name} (${c.company})`);
  persist();
  if (HAS_BACKEND) {
    bg(customersApi.create({ name: c.name, email: c.email, company: c.company, phone: c.phone, role: c.role }));
  }
  return c;
}

export function updateCustomer(id: string, patch: Partial<Customer>) {
  const c = db.customers.find((x) => x.id === id);
  if (!c) return;
  Object.assign(c, patch);
  persist();
  if (HAS_BACKEND) {
    bg(customersApi.update(id, { name: c.name, email: c.email, company: c.company, phone: c.phone, role: c.role }));
  }
}

export function deleteCustomer(id: string) {
  db.customers = db.customers.filter((c) => c.id !== id);
  db.licenses.forEach((l) => {
    if (l.customer_id === id) l.customer_id = null;
  });
  persist();
  if (HAS_BACKEND) bg(customersApi.remove(id));
}

/* ---------------- Plan operations ---------------- */

export function createPlan(input: Omit<SubscriptionPlan, "id">): SubscriptionPlan {
  const p: SubscriptionPlan = { id: uid("p"), ...input };
  db.plans.unshift(p);
  persist();
  if (HAS_BACKEND) {
    bg(plansApi.create({ name: p.name, price: p.price, duration_days: p.duration_days, device_limit: p.device_limit, features: p.features }));
  }
  return p;
}

export function updatePlan(id: string, patch: Partial<SubscriptionPlan>) {
  const p = db.plans.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  persist();
  if (HAS_BACKEND) {
    bg(plansApi.update(id, { name: p.name, price: p.price, duration_days: p.duration_days, device_limit: p.device_limit, features: p.features }));
  }
}

export function deletePlan(id: string) {
  db.plans = db.plans.filter((p) => p.id !== id);
  persist();
  if (HAS_BACKEND) bg(plansApi.remove(id));
}

/* ---------------- Simulated / real Desktop APIs ---------------- */

export interface ActivateResult {
  ok: boolean;
  error?: string;
  activation_token?: string;
  license_status?: string;
  expiry_date?: string | null;
  enabled_features?: FeatureSet;
}

export function apiActivate(license_key: string, machine_id: string, machine_name: string, software_version: string): ActivateResult {
  const lic = db.licenses.find((l) => l.license_key === license_key.trim());
  if (!lic) return { ok: false, error: "License does not exist" };
  const status = effectiveStatus(lic);
  if (status === "blocked") return { ok: false, error: "License is blocked" };
  if (status === "disabled") return { ok: false, error: "License is disabled" };
  if (status === "expired") return { ok: false, error: "License has expired" };

  const existing = db.activations.find((a) => a.license_id === lic.id && a.machine_id === machine_id);
  if (existing) {
    existing.last_seen = new Date().toISOString();
    existing.software_version = software_version;
  } else {
    const count = db.activations.filter((a) => a.license_id === lic.id).length;
    if (count >= lic.device_limit) return { ok: false, error: `Device limit reached (${lic.device_limit})` };
    db.activations.unshift({
      id: uid("a"), license_id: lic.id, machine_id, machine_name, software_version,
      activated_at: new Date().toISOString(), last_seen: new Date().toISOString(),
    });
  }
  audit("DEVICE_ACTIVATED", `${lic.license_key} on ${machine_name}`);
  persist();
  if (HAS_BACKEND) bg(deviceApi.activate(license_key, machine_id, machine_name, software_version));
  return { ok: true, activation_token: generateToken(), license_status: status, expiry_date: lic.expires_at, enabled_features: lic.features };
}

export function apiValidate(license_key: string, machine_id: string) {
  const lic = db.licenses.find((l) => l.license_key === license_key.trim());
  if (!lic) return { valid: false, expired: false, blocked: false, disabled: false, feature_set: null, error: "Not found" };
  const status = effectiveStatus(lic);
  const bound = db.activations.some((a) => a.license_id === lic.id && a.machine_id === machine_id);
  return { valid: status === "active" && bound, expired: status === "expired", blocked: status === "blocked", disabled: status === "disabled", bound, feature_set: lic.features };
}

export function apiHeartbeat(license_key: string, machine_id: string, software_version: string) {
  const lic = db.licenses.find((l) => l.license_key === license_key.trim());
  if (!lic) return { status: "invalid" };
  const status = effectiveStatus(lic);
  const act = db.activations.find((a) => a.license_id === lic.id && a.machine_id === machine_id);
  if (act) {
    act.last_seen = new Date().toISOString();
    act.software_version = software_version;
    persist();
  }
  if (HAS_BACKEND) bg(deviceApi.heartbeat(license_key, machine_id, software_version));
  if (status === "blocked") return { status: "blocked" };
  return { license_status: status, expiry_date: lic.expires_at, enabled_features: lic.features };
}

export function apiUsage(license_key: string, machine_id: string, event_type: UsageEventType, event_count: number) {
  const lic = db.licenses.find((l) => l.license_key === license_key.trim());
  if (!lic) return { ok: false, error: "License not found" };
  db.usage.unshift({ id: uid("u"), license_id: lic.id, machine_id, event_type, event_count, created_at: new Date().toISOString() });
  persist();
  if (HAS_BACKEND) bg(deviceApi.usage(license_key, machine_id, event_type, event_count));
  return { ok: true };
}
