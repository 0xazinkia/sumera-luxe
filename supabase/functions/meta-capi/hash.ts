// PII hashing helpers. Hashing must only ever happen server-side.

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  // Meta expects digits only, including country code, no leading +/spaces/dashes.
  return phone.replace(/[^\d]/g, "");
}

export async function hashEmail(email: string): Promise<string> {
  return sha256Hex(normalizeEmail(email));
}

export async function hashPhone(phone: string): Promise<string> {
  return sha256Hex(normalizePhone(phone));
}
