export type LicenseType = "Trial" | "Monthly" | "Yearly" | "Lifetime" | "Enterprise";
export type LicenseStatus = "active" | "expired" | "blocked" | "disabled";

export interface FeatureSet {
  batch_processing: boolean;
  card_history: boolean;
  analytics: boolean;
  multi_operator: boolean;
  pdf_import: boolean;
  cloud_backup: boolean;
}

export const FEATURE_LABELS: Record<keyof FeatureSet, string> = {
  batch_processing: "Batch Processing",
  card_history: "Card History",
  analytics: "Analytics Module",
  multi_operator: "Multi-Operator",
  pdf_import: "PDF Import",
  cloud_backup: "Cloud Backup",
};

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
  license_type: LicenseType;
  status: LicenseStatus;
  device_limit: number;
  features: FeatureSet;
  customer_id: string | null;
  plan_id: string | null;
  created_at: string;
  start_date: string;
  expires_at: string | null; // null = lifetime
  renewal_due_date: string | null;
  notes?: string;
}

export interface Activation {
  id: string;
  license_id: string;
  machine_id: string;
  machine_name: string;
  software_version: string;
  activated_at: string;
  last_seen: string;
}

export type UsageEventType =
  | "CARD_GENERATED"
  | "CARD_PRINTED"
  | "PDF_IMPORTED"
  | "BATCH_JOB";

export interface UsageLog {
  id: string;
  license_id: string;
  machine_id: string;
  event_type: UsageEventType;
  event_count: number;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number; // 0 = lifetime
  device_limit: number;
  features: FeatureSet;
}

export interface AuditLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  created_at: string;
}

export interface DB {
  customers: Customer[];
  licenses: License[];
  activations: Activation[];
  usage: UsageLog[];
  plans: SubscriptionPlan[];
  audit: AuditLog[];
}
