/**
 * Unsubscribe tokens: stateless, unguessable, no auth, no expiry.
 *
 * Stateless because an unsubscribe must work for an address that has no
 * enrollment row (a bounce-suppressed lead, a forwarded email) and must keep
 * working after any table changes. No expiry because a two-year-old email
 * sitting in someone's archive must still be able to unsubscribe them — an
 * expired opt-out link is an opt-out that does not work.
 *
 * `crypto.subtle` only; no new dependency. The same Web Crypto path
 * `convex/http.ts` already uses to verify the Retell webhook signature.
 */

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  // Indexed rather than for-of: the repo's tsconfig target predates
  // downlevelIteration, so iterating a Uint8Array directly is a type error.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return new Uint8Array(sig);
}

/** Length-independent constant-time compare. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface UnsubscribePayload {
  /** Normalized email address. */
  e: string;
  /** Token version — lets the secret rotate with a dual-verify window. */
  v: number;
}

export const UNSUBSCRIBE_TOKEN_VERSION = 1;

export async function createUnsubscribeToken(
  email: string,
  secret: string
): Promise<string> {
  const payload = base64UrlEncode(
    encoder.encode(
      JSON.stringify({ e: email, v: UNSUBSCRIBE_TOKEN_VERSION } satisfies UnsubscribePayload)
    )
  );
  return `${payload}.${base64UrlEncode(await hmac(payload, secret))}`;
}

/**
 * Returns the email the token authorizes, or null. Never throws on malformed
 * input — an unsubscribe endpoint that 500s on a mangled link is an
 * unsubscribe that does not work.
 */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string
): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const provided = token.slice(dot + 1);

  let expected: string;
  try {
    expected = base64UrlEncode(await hmac(payload, secret));
  } catch {
    return null;
  }
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    ) as Partial<UnsubscribePayload>;
    if (typeof decoded.e !== "string" || !decoded.e) return null;
    if (decoded.v !== UNSUBSCRIBE_TOKEN_VERSION) return null;
    return decoded.e;
  } catch {
    return null;
  }
}

/** The link that goes in the email body and the List-Unsubscribe header. */
export function unsubscribeUrl(convexSiteUrl: string, token: string): string {
  return `${convexSiteUrl.replace(/\/$/, "")}/unsubscribe?t=${encodeURIComponent(token)}`;
}
