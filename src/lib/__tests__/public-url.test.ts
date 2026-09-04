import { describe, it, expect } from "vitest";
import { publicOrigin, publicUrl } from "../public-url";

function req(headers: Record<string, string>, url = "https://0.0.0.0:3000/admin/funnel?w=30") {
  const u = new URL(url);
  return {
    headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    nextUrl: { protocol: u.protocol, host: u.host, pathname: u.pathname, search: u.search },
  };
}

describe("publicUrl behind a reverse proxy", () => {
  it("uses x-forwarded-host and x-forwarded-proto over the container bind address", () => {
    const r = req({ "x-forwarded-host": "staging.icodemybusiness.com", "x-forwarded-proto": "https", host: "0.0.0.0:3000" });
    expect(publicOrigin(r)).toBe("https://staging.icodemybusiness.com");
    expect(publicUrl(r)).toBe("https://staging.icodemybusiness.com/admin/funnel?w=30");
  });

  it("falls back to the host header when nothing is forwarded", () => {
    const r = req({ host: "icodemybusiness.com" });
    expect(publicUrl(r)).toBe("https://icodemybusiness.com/admin/funnel?w=30");
  });

  it("falls back to the runtime URL only when there is no host at all (next dev)", () => {
    const r = req({}, "http://localhost:3000/admin");
    expect(publicUrl(r)).toBe("http://localhost:3000/admin");
  });

  it("takes the first value of a comma-joined forwarded list", () => {
    const r = req({ "x-forwarded-host": "icodemybusiness.com, internal-lb", "x-forwarded-proto": "https, http" });
    expect(publicOrigin(r)).toBe("https://icodemybusiness.com");
  });

  it("never returns the 0.0.0.0 bind address when any host header exists", () => {
    const r = req({ host: "staging.icodemybusiness.com" });
    expect(publicUrl(r)).not.toContain("0.0.0.0");
  });
});
