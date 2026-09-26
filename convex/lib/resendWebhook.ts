/**
 * Resend signs webhook deliveries with Svix: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${raw body}`, keyed with the base64-decoded
 * secret (the part after `whsec_`), base64-encoded, sent as one or more
 * space-separated `v1,<sig>` entries in `svix-signature`.
 * (https://docs.svix.com/receiving/verifying-payloads/how-manual)
 *
 * Pure and runtime-agnostic: only Web Crypto, TextEncoder and atob, so it
 * runs in a Convex httpAction and under vitest alike. No Svix dependency.
 */

export interface SvixHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

/** Deliveries older (or newer) than this are rejected — replay protection. */
export const MAX_SKEW_MS = 5 * 60_000;

const SECRET_PREFIX = "whsec_";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Length-independent-in-time comparison of two strings of equal length. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * True only when the timestamp is fresh and at least one `v1` signature in
 * the header matches the HMAC of the raw body. Never throws on bad input.
 */
export async function verifyResendSignature(
  body: string,
  headers: SvixHeaders,
  secret: string,
  now: number = Date.now()
): Promise<boolean> {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  if (!secret.startsWith(SECRET_PREFIX)) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(now - ts * 1000) > MAX_SKEW_MS) return false;

  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(secret.slice(SECRET_PREFIX.length));
  } catch {
    return false;
  }
  if (keyBytes.length === 0) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${headers.id}.${headers.timestamp}.${body}`)
  );
  const expected = bytesToBase64(new Uint8Array(signed));

  for (const entry of headers.signature.split(" ")) {
    const [version, sig] = entry.split(",");
    if (version === "v1" && sig && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}
