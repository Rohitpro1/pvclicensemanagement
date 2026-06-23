import type { DB, UsageEventType } from "./types";
import { effectiveStatus } from "./store";
import { dayKey, shortDay } from "./format";

export function metrics(db: DB) {
  const statuses = db.licenses.map(effectiveStatus);
  const total = db.licenses.length;
  const active = statuses.filter((s) => s === "active").length;
  const expired = statuses.filter((s) => s === "expired").length;
  const blocked = statuses.filter((s) => s === "blocked").length;
  const disabled = statuses.filter((s) => s === "disabled").length;

  const todayKey = new Date().toISOString().slice(0, 10);
  let cardsToday = 0;
  let printsToday = 0;
  db.usage.forEach((u) => {
    if (dayKey(u.created_at) === todayKey) {
      if (u.event_type === "CARD_GENERATED") cardsToday += u.event_count;
      if (u.event_type === "CARD_PRINTED") printsToday += u.event_count;
    }
  });

  return {
    total,
    active,
    expired,
    blocked,
    disabled,
    activations: db.activations.length,
    cardsToday,
    printsToday,
  };
}

export function expiringSoon(db: DB, days = 30) {
  const now = Date.now();
  const limit = now + days * 86400000;
  return db.licenses
    .filter((l) => l.expires_at && new Date(l.expires_at).getTime() > now && new Date(l.expires_at).getTime() < limit)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
}

export function topCustomers(db: DB, limit = 6) {
  const map = new Map<string, number>();
  db.usage.forEach((u) => {
    const lic = db.licenses.find((l) => l.id === u.license_id);
    if (!lic?.customer_id) return;
    if (u.event_type === "CARD_GENERATED") map.set(lic.customer_id, (map.get(lic.customer_id) ?? 0) + u.event_count);
  });
  return Array.from(map.entries())
    .map(([cid, cards]) => ({ customer: db.customers.find((c) => c.id === cid), cards }))
    .filter((x) => x.customer)
    .sort((a, b) => b.cards - a.cards)
    .slice(0, limit);
}

/** time series for last N days */
export function dailySeries(db: DB, days = 30) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  const init = () => keys.map((k) => ({ date: shortDay(k + "T00:00:00"), key: k, value: 0 }));

  const make = (filter: (ev: UsageEventType) => boolean) => {
    const arr = init();
    const idx = new Map(arr.map((a, i) => [a.key, i]));
    db.usage.forEach((u) => {
      if (!filter(u.event_type)) return;
      const k = dayKey(u.created_at);
      const i = idx.get(k);
      if (i !== undefined) arr[i].value += u.event_count;
    });
    return arr;
  };

  const generated = make((e) => e === "CARD_GENERATED");
  const printed = make((e) => e === "CARD_PRINTED");

  // activations per day
  const acts = init();
  const aIdx = new Map(acts.map((a, i) => [a.key, i]));
  db.activations.forEach((a) => {
    const k = dayKey(a.activated_at);
    const i = aIdx.get(k);
    if (i !== undefined) acts[i].value += 1;
  });

  // license growth (cumulative)
  const growth = init();
  const created = db.licenses
    .map((l) => dayKey(l.created_at))
    .sort();
  let baseline = db.licenses.filter((l) => new Date(l.created_at) < new Date(keys[0] + "T00:00:00")).length;
  growth.forEach((g) => {
    baseline += created.filter((c) => c === g.key).length;
    g.value = baseline;
  });

  return { generated, printed, acts, growth };
}

export function usageByType(db: DB) {
  const map: Record<string, number> = {};
  db.usage.forEach((u) => {
    map[u.event_type] = (map[u.event_type] ?? 0) + u.event_count;
  });
  return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
}
