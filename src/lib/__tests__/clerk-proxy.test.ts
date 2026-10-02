import { describe, it, expect } from "vitest";
import { clerkProxyTarget, isClerkProxyPath } from "../clerk-proxy";

function req(path: string, search: string, h: Record<string, string>) {
  const headers = new Headers(h);
  return {
    request: {
      headers,
      nextUrl: { protocol: "https:", host: "0.0.0.0:3000", pathname: path, search },
    },
    headers,
  };
}

describe("isClerkProxyPath", () => {
  it("matches /__clerk and everything under it", () => {
    expect(isClerkProxyPath("/__clerk")).toBe(true);
    expect(isClerkProxyPath("/__clerk/v1/client")).toBe(true);
    expect(isClerkProxyPath("/__clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js")).toBe(true);
  });

  it("does not match site routes that merely start with the same letters", () => {
    expect(isClerkProxyPath("/__clerkish")).toBe(false);
    expect(isClerkProxyPath("/sign-in")).toBe(false);
    expect(isClerkProxyPath("/")).toBe(false);
  });
});

describe("clerkProxyTarget", () => {
  const behindTraefik = {
    "x-forwarded-host": "icodemybusiness.com",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "203.0.113.7, 10.0.0.2",
    cookie: "__client_uat=1",
  };

  it("rewrites to Clerk's Frontend API with the /__clerk prefix stripped and the query kept", () => {
    const { request, headers } = req("/__clerk/v1/client", "?_clerk_js_version=5", behindTraefik);
    const t = clerkProxyTarget(request, headers, "sk_test_x");
    expect(t?.url.toString()).toBe("https://frontend-api.clerk.dev/v1/client?_clerk_js_version=5");
  });

  it("names the PUBLIC proxy URL, not the container's bind address", () => {
    const { request, headers } = req("/__clerk/v1/client", "", behindTraefik);
    const t = clerkProxyTarget(request, headers, "sk_test_x");
    expect(t?.headers.get("Clerk-Proxy-Url")).toBe("https://icodemybusiness.com/__clerk");
  });

  it("forwards the secret key, the client IP and the visitor's cookies", () => {
    const { request, headers } = req("/__clerk/v1/client", "", behindTraefik);
    const t = clerkProxyTarget(request, headers, "sk_test_x");
    expect(t?.headers.get("Clerk-Secret-Key")).toBe("sk_test_x");
    expect(t?.headers.get("X-Forwarded-For")).toBe("203.0.113.7");
    expect(t?.headers.get("cookie")).toBe("__client_uat=1");
  });

  it("maps the bare /__clerk path to the API root", () => {
    const { request, headers } = req("/__clerk", "", behindTraefik);
    expect(clerkProxyTarget(request, headers, "sk_test_x")?.url.pathname).toBe("/");
  });

  it("refuses to proxy without a secret key", () => {
    const { request, headers } = req("/__clerk/v1/client", "", behindTraefik);
    expect(clerkProxyTarget(request, headers, undefined)).toBeNull();
    expect(clerkProxyTarget(request, headers, "")).toBeNull();
  });
});
