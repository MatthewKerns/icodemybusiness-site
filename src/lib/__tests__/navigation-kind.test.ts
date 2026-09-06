import { describe, it, expect } from "vitest";
import { isNavigationRequest, describeRequestKind } from "../navigation-kind";

function headers(h: Record<string, string>) {
  const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (n: string) => lower[n.toLowerCase()] ?? null };
}

describe("isNavigationRequest", () => {
  it("treats a full document load as a navigation", () => {
    expect(isNavigationRequest(headers({ Accept: "text/html,application/xhtml+xml" }))).toBe(true);
  });

  it("treats a Next.js client-side navigation (RSC fetch) as a navigation", () => {
    // What the App Router sends after a Clerk sign-in redirects back into the app.
    expect(isNavigationRequest(headers({ RSC: "1", Accept: "text/x-component" }))).toBe(true);
    expect(isNavigationRequest(headers({ RSC: "1" }))).toBe(true);
    expect(isNavigationRequest(headers({ Accept: "text/x-component" }))).toBe(true);
  });

  it("does not treat a link prefetch as a navigation, even though it carries RSC: 1", () => {
    expect(isNavigationRequest(headers({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe(false);
  });

  it("labels each request shape for the refusal log", () => {
    expect(describeRequestKind(headers({ Accept: "text/html" }))).toBe("document");
    expect(describeRequestKind(headers({ RSC: "1", Accept: "text/x-component" }))).toBe("rsc-navigation");
    expect(describeRequestKind(headers({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe("prefetch");
    expect(describeRequestKind(headers({ Accept: "application/json" }))).toBe("fetch(accept=application/json)");
  });

  it("does not treat a JSON fetch or API call as a navigation", () => {
    expect(isNavigationRequest(headers({ Accept: "application/json" }))).toBe(false);
    expect(isNavigationRequest(headers({ Accept: "*/*" }))).toBe(false);
    expect(isNavigationRequest(headers({}))).toBe(false);
  });
});
