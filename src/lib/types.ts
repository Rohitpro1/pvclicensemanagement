// ============================================================
// Domain Types — mirrors the SQLAlchemy / PostgreSQL schema
// ============================================================

export type LicenseType = "Trial" | "Monthly" | "Yearly" | "Lifetime" | "Enterprise";
export type LicenseStatus = "active" | "expired" | "blocked";

export interface Features {
  batch_processing: boolean;
  card_history: boolean;
  analytics: boolean;
  multi_operator: boolean;
  pdf_import: boolean;
  cloud_sync: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  role: "customer" | "admin";
  created_at: string;
}

export interface License {
  id: string;
  license_key: string;
  customer_id: string;
  license_type: LicenseType;
  status: LicenseStatus;
  device_limit: number;
  features: Features;
  created_at: string;
  start_date: string;
  expires_at: string | null; // null for Lifetime
  renewal_due_date: string | null;
  plan_id?: string;
}

export interface Activation {
  id: string;
  license_id: string;
  machine_id: string;
  machine_name: string;
  software_version: string;
  os: string;
  activated_at: string;
  last_seen: string;
}

export type UsageEvent =
  | "CARD_GENERATED"
  | "CARD_PRINTED"
  | "PDF_IMPORTED"
  | "BATCH_JOB"
  | "TEMPLATE_CREATED";

export interface UsageLog {
  id: string;
  license_id: string;
  machine_id: string;
  event_type: UsageEvent;
  event_count: number;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number; // 0 = lifetime
  device_limit: number;
  features: Features;
  description: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  created_at: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: "admin" | "support";
}
