import type { LicenseType } from "./types";

// ============================================================
// Cryptographic license key generator.
// Format: PVC-<TT>-XXXX-XXXX-XXXX
// where TT is a 2-char license type code and X is a base32 char.
// Uses crypto.getRandomValues for non-sequential, secure keys.
// ============================================================

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/O/1/I

const TYPE_CODE: Record<LicenseType, string> = {
  Trial: "TR",
  Monthly: "MO",
  Yearly: "1Y",
  Lifetime: "LT",
  Enterprise: "EN",
};

function randomBlock(len = 4): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

export function generateLicenseKey(type: LicenseType): string {
  return `PVC-${TYPE_CODE[type]}-${randomBlock()}-${randomBlock()}-${randomBlock()}`;
}

export function generateMachineId(): string {
  // Simulates hashed machine fingerprint
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateActivationToken(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "");
}
