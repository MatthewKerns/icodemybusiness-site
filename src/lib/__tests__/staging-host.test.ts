import { describe, it, expect } from "vitest";
import { isStagingHost, stagingNotFound } from "../staging-host";

function headers(h: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (n: string) => lower[n.toLowerCase()] ?? null };
}

describe("isStagingHost", () => {
  it("blocks the staging host", () => {
    expect(isStagingHost(headers({ Host: "staging.icodemybusiness.com" }))).toBe(true);
  });

  it("never blocks the apex or www — a false positive here takes the live site down", () => {
    expect(isStagingHost(headers({ Host: "icodemybusiness.com" }))).toBe(false);
    expect(isStagingHost(headers({ Host: "www.icodemybusiness.com" }))).toBe(false);
    expect(isStagingHost(headers({ "X-Forwarded-Host": "icodemybusiness.com", Host: "0.0.0.0:3000" }))).toBe(false);
  });

  it("prefers X-Forwarded-Host (set by Traefik) over Host", () => {
    expect(isStagingHost(headers({ "X-Forwarded-Host": "staging.icodemybusiness.com", Host: "0.0.0.0:3000" }))).toBe(true);
    expect(isStagingHost(headers({ "X-Forwarded-Host": "icodemybusiness.com", Host: "staging.icodemybusiness.com" }))).toBe(false);
  });

  it("uses the first host in a forwarded chain, ignores case and port", () => {
    expect(isStagingHost(headers({ "X-Forwarded-Host": "Staging.ICodeMyBusiness.com:443, proxy.internal" }))).toBe(true);
  });

  it("does not match a host that merely contains the word", () => {
    expect(isStagingHost(headers({ Host: "notstaging.example.com" }))).toBe(false);
    expect(isStagingHost(headers({ Host: "icodemybusiness.com.staging.example" }))).toBe(false);
  });

  it("treats a missing host as not staging", () => {
    expect(isStagingHost(headers({}))).toBe(false);
  });
});

describe("stagingNotFound", () => {
  it("is a bare plain-text 404 with no site chrome", async () => {
    const res = stagingNotFound();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const body = await res.text();
    expect(body).not.toMatch(/<html/i);
    expect(body).not.toMatch(/iCodeMyBusiness/i);
  });
});
