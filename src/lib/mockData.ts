import type {
  Customer,
  License,
  Activation,
  UsageLog,
  SubscriptionPlan,
  Features,
  LicenseType,
  UsageEvent,
  AuditLog,
} from "./types";
import { generateLicenseKey, generateMachineId } from "./licenseKey";

// ============================================================
// Seed deterministic-ish mock data so the UI looks alive.
// ============================================================

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function daysFromNow(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
}

const FEATURE_PRESETS: Record<LicenseType, Features> = {
  Trial:      { batch_processing: false, card_history: true,  analytics: false, multi_operator: false, pdf_import: false, cloud_sync: false },
  Monthly:    { batch_processing: true,  card_history: true,  analytics: false, multi_operator: false, pdf_import: true,  cloud_sync: false },
  Yearly:     { batch_processing: true,  card_history: true,  analytics: true,  multi_operator: false, pdf_import: true,  cloud_sync: true  },
  Lifetime:   { batch_processing: true,  card_history: true,  analytics: true,  multi_operator: true,  pdf_import: true,  cloud_sync: true  },
  Enterprise: { batch_processing: true,  card_history: true,  analytics: true,  multi_operator: true,  pdf_import: true,  cloud_sync: true  },
};

export function featuresForType(t: LicenseType): Features {
  return { ...FEATURE_PRESETS[t] };
}

const COMPANIES = [
  "Acme Identity Co.", "Globex Print Services", "Initech Solutions", "Soylent Cards Ltd.",
  "Umbrella ID Systems", "Stark Industries", "Wayne Enterprises", "Wonka Cards & Co.",
  "Pied Piper PrintWorks", "Hooli ID Cloud", "Vandelay Imports", "Cyberdyne Systems",
];

const FIRST = ["Aarav","Priya","Rohan","Sneha","Vikram","Anaya","Karthik","Meera","Rahul","Divya","Aditya","Isha"];
const LAST  = ["Sharma","Kapoor","Iyer","Reddy","Khan","Patel","Verma","Singh","Nair","Gupta","Mehta","Rao"];

function pick<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

const OS_LIST = ["Windows 11 Pro", "Windows 10 Pro", "Windows 11 Home", "Windows Server 2022"];

function makeCustomer(): Customer {
  const first = pick(FIRST);
  const last = pick(LAST);
  const company = pick(COMPANIES);
  return {
    id: rid("usr"),
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${company.split(" ")[0].toLowerCase()}.com`,
    company,
    phone: `+91 ${Math.floor(70000 + Math.random() * 29999)} ${Math.floor(10000 + Math.random() * 89999)}`,
    role: "customer",
    created_at: daysFromNow(-Math.floor(Math.random() * 365)),
  };
}

const PLAN_DEFAULTS: SubscriptionPlan[] = [
  {
    id: "plan_trial",
    name: "Trial",
    price: 0,
    duration_days: 14,
    device_limit: 1,
    features: FEATURE_PRESETS.Trial,
    description: "14-day evaluation. Core card generation only.",
  },
  {
    id: "plan_basic",
    name: "Basic — Monthly",
    price: 19,
    duration_days: 30,
    device_limit: 2,
    features: FEATURE_PRESETS.Monthly,
    description: "Single operator with batch & PDF import.",
  },
  {
    id: "plan_pro",
    name: "Professional — Yearly",
    price: 149,
    duration_days: 365,
    device_limit: 5,
    features: FEATURE_PRESETS.Yearly,
    description: "Includes analytics & cloud sync for SMBs.",
  },
  {
    id: "plan_lifetime",
    name: "Lifetime",
    price: 599,
    duration_days: 0,
    device_limit: 5,
    features: FEATURE_PRESETS.Lifetime,
    description: "Pay once, own forever. All features.",
  },
  {
    id: "plan_ent",
    name: "Enterprise",
    price: 1499,
    duration_days: 365,
    device_limit: 50,
    features: FEATURE_PRESETS.Enterprise,
    description: "Multi-operator, SLA, dedicated support.",
  },
];

function makeLicense(customer_id: string): License {
  const types: LicenseType[] = ["Trial", "Monthly", "Yearly", "Lifetime", "Enterprise"];
  const t = pick(types);
  const expiresOffset =
    t === "Trial" ? Math.floor(Math.random() * 28) - 14 :
    t === "Monthly" ? Math.floor(Math.random() * 60) - 15 :
    t === "Yearly" ? Math.floor(Math.random() * 400) - 30 :
    t === "Enterprise" ? Math.floor(Math.random() * 300) + 30 :
    null;
  const status =
    expiresOffset !== null && expiresOffset < 0 ? "expired" :
    Math.random() < 0.06 ? "blocked" : "active";
  const start = daysFromNow(-Math.floor(Math.random() * 200));
  return {
    id: rid("lic"),
    license_key: generateLicenseKey(t),
    customer_id,
    license_type: t,
    status,
    device_limit:
      t === "Enterprise" ? 50 :
      t === "Lifetime" ? 5 :
      t === "Yearly" ? 5 :
      t === "Monthly" ? 2 : 1,
    features: featuresForType(t),
    created_at: start,
    start_date: start,
    expires_at: expiresOffset === null ? null : daysFromNow(expiresOffset),
    renewal_due_date: t === "Yearly" || t === "Enterprise" ? daysFromNow(expiresOffset ?? 365) : null,
    plan_id:
      t === "Trial" ? "plan_trial" :
      t === "Monthly" ? "plan_basic" :
      t === "Yearly" ? "plan_pro" :
      t === "Lifetime" ? "plan_lifetime" : "plan_ent",
  };
}

function makeActivation(license: License): Activation {
  return {
    id: rid("act"),
    license_id: license.id,
    machine_id: generateMachineId(),
    machine_name: `${pick(["DESKTOP","PRINTSTATION","KIOSK","OPS","HR"])}-${Math.floor(1000 + Math.random()*9000)}`,
    software_version: pick(["2.4.1", "2.4.2", "2.5.0", "2.5.1-beta", "2.6.0"]),
    os: pick(OS_LIST),
    activated_at: daysFromNow(-Math.floor(Math.random() * 60)),
    last_seen: daysFromNow(-Math.floor(Math.random() * 3)),
  };
}

function makeUsage(license: License, machine_id: string, daysBack: number): UsageLog[] {
  const events: UsageEvent[] = ["CARD_GENERATED", "CARD_PRINTED", "PDF_IMPORTED", "BATCH_JOB", "TEMPLATE_CREATED"];
  const logs: UsageLog[] = [];
  for (let i = 0; i < daysBack; i++) {
    for (const e of events) {
      if (Math.random() < 0.7) {
        logs.push({
          id: rid("usg"),
          license_id: license.id,
          machine_id,
          event_type: e,
          event_count:
            e === "CARD_GENERATED" ? Math.floor(5 + Math.random() * 60) :
            e === "CARD_PRINTED"   ? Math.floor(3 + Math.random() * 40) :
            e === "PDF_IMPORTED"   ? Math.floor(Math.random() * 8) :
            e === "BATCH_JOB"      ? Math.floor(Math.random() * 3) :
                                      Math.floor(Math.random() * 4),
          created_at: daysFromNow(-i),
        });
      }
    }
  }
  return logs;
}

export function buildSeedData() {
  const customers: Customer[] = Array.from({ length: 18 }, makeCustomer);
  const licenses: License[] = [];
  const activations: Activation[] = [];
  const usage: UsageLog[] = [];

  customers.forEach((c) => {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const lic = makeLicense(c.id);
      licenses.push(lic);
      const actCount = Math.min(lic.device_limit, 1 + Math.floor(Math.random() * Math.max(1, lic.device_limit)));
      for (let j = 0; j < actCount; j++) {
        const act = makeActivation(lic);
        activations.push(act);
        usage.push(...makeUsage(lic, act.machine_id, 30));
      }
    }
  });

  const audit: AuditLog[] = [
    { id: rid("aud"), actor: "admin@pvclm.io", action: "LICENSE_CREATED", target: licenses[0]?.license_key ?? "—", created_at: daysFromNow(-3) },
    { id: rid("aud"), actor: "admin@pvclm.io", action: "LICENSE_BLOCKED", target: licenses[1]?.license_key ?? "—", created_at: daysFromNow(-2) },
    { id: rid("aud"), actor: "admin@pvclm.io", action: "PLAN_UPDATED",    target: "plan_pro", created_at: daysFromNow(-1) },
    { id: rid("aud"), actor: "admin@pvclm.io", action: "DEVICES_RESET",   target: licenses[2]?.license_key ?? "—", created_at: daysFromNow(0) },
  ];

  return {
    customers,
    licenses,
    activations,
    usage,
    plans: PLAN_DEFAULTS,
    audit,
  };
}

export { PLAN_DEFAULTS };
