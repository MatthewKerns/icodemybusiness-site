import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyResendSignature, MAX_SKEW_MS } from "./resendWebhook";

// The expected signature is computed here with Node's crypto — an
// implementation independent of the Web Crypto path under test — from the
// procedure Svix documents (secret = base64 after "whsec_", HMAC-SHA256 over
// "id.timestamp.body", base64 output).
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const ID = "msg_2Xy6NX3o0vXyKQ1nLsjuKk";
const TS = 1700000000; // seconds
const NOW = TS * 1000 + 15_000; // 15 s later
const BODY = JSON.stringify({
  type: "email.opened",
  created_at: "2023-11-14T22:13:20.000Z",
  data: { email_id: "re_test_abc123", to: ["lead@example.com"] },
});

function sign(body: string, id = ID, ts = TS, secret = SECRET): string {
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  return createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

const headers = (signature: string, ts: number = TS) => ({
  id: ID,
  timestamp: String(ts),
  signature,
});

describe("verifyResendSignature", () => {
  it("accepts a fresh, correctly signed body", async () => {
    const ok = await verifyResendSignature(BODY, headers(`v1,${sign(BODY)}`), SECRET, NOW);
    expect(ok).toBe(true);
  });

  it("accepts when the matching signature is not the first entry (secret rotation)", async () => {
    const h = headers(`v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= v1,${sign(BODY)}`);
    expect(await verifyResendSignature(BODY, h, SECRET, NOW)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const tampered = BODY.replace("re_test_abc123", "re_test_abc124");
    expect(await verifyResendSignature(tampered, headers(`v1,${sign(BODY)}`), SECRET, NOW)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const sig = sign(BODY);
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(await verifyResendSignature(BODY, headers(`v1,${flipped}`), SECRET, NOW)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const other = "whsec_" + Buffer.from("another-secret-of-32-bytes-long!").toString("base64");
    expect(await verifyResendSignature(BODY, headers(`v1,${sign(BODY)}`), other, NOW)).toBe(false);
  });

  it("rejects a stale timestamp even when the signature is correct", async () => {
    const late = NOW + MAX_SKEW_MS + 1000;
    expect(await verifyResendSignature(BODY, headers(`v1,${sign(BODY)}`), SECRET, late)).toBe(false);
  });

  it("rejects garbage headers and a malformed secret without throwing", async () => {
    expect(await verifyResendSignature(BODY, headers("not-a-signature"), SECRET, NOW)).toBe(false);
    expect(await verifyResendSignature(BODY, headers("v2," + sign(BODY)), SECRET, NOW)).toBe(false);
    expect(await verifyResendSignature(BODY, headers(`v1,${sign(BODY)}`, NaN), SECRET, NOW)).toBe(false);
    expect(await verifyResendSignature(BODY, headers(`v1,${sign(BODY)}`), "nope", NOW)).toBe(false);
    expect(await verifyResendSignature(BODY, { id: "", timestamp: "", signature: "" }, SECRET, NOW)).toBe(false);
  });
});
