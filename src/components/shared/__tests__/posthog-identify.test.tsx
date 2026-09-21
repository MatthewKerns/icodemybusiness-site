/**
 * Analytics must not carry visitor PII, and must not tunnel through our own
 * domain.
 *
 * Both used to be true: PostHogProvider sent email + full name to PostHog as
 * person properties (never disclosed in /privacy), and the client defaulted to a
 * same-origin `/ingest` proxy whose stated purpose was defeating tracking
 * blockers. On a domain blocked by Comcast/Cox Advanced Security those read as a
 * policy mismatch and an evasion pattern respectively (docs/trust-pages.md).
 */
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, cleanup } from "@testing-library/react";

const identify = vi.fn();
const reset = vi.fn();
vi.mock("posthog-js", () => ({
  default: { __loaded: true, identify: (...a: unknown[]) => identify(...a), reset: () => reset(), capture: vi.fn() },
}));
vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

let currentUser: unknown = null;
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: currentUser }) }));

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
});

afterEach(() => {
  cleanup();
  identify.mockReset();
  reset.mockReset();
  currentUser = null;
});

describe("PostHogProvider identify", () => {
  it("identifies a signed-in user by account id only — no email, no name", async () => {
    currentUser = {
      id: "user_123",
      fullName: "Ada Lovelace",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    };
    const { PostHogProvider } = await import("../PostHogProvider");
    render(<PostHogProvider><p>site</p></PostHogProvider>);

    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify.mock.calls[0][0]).toBe("user_123");
    const props = identify.mock.calls[0][1] as Record<string, unknown> | undefined;
    expect(props?.email).toBeUndefined();
    expect(props?.name).toBeUndefined();
    expect(JSON.stringify(identify.mock.calls)).not.toContain("ada@example.com");
  });

  it("resets on sign-out", async () => {
    const { PostHogProvider } = await import("../PostHogProvider");
    render(<PostHogProvider><p>site</p></PostHogProvider>);
    expect(reset).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });
});

describe("resolveClientHost", () => {
  it("defaults to PostHog EU when unset or empty (an empty build arg must not yield an empty host)", async () => {
    const { resolveClientHost } = await import("@/lib/posthog");
    expect(resolveClientHost(undefined)).toBe("https://eu.i.posthog.com");
    expect(resolveClientHost("")).toBe("https://eu.i.posthog.com");
  });

  it("never returns a relative, same-origin path — a leftover /ingest would 404 and drop every event", async () => {
    const { resolveClientHost } = await import("@/lib/posthog");
    expect(resolveClientHost("/ingest")).toBe("https://eu.i.posthog.com");
    expect(resolveClientHost("ingest")).toBe("https://eu.i.posthog.com");
  });

  it("honours an explicit absolute host", async () => {
    const { resolveClientHost } = await import("@/lib/posthog");
    expect(resolveClientHost("https://eu.i.posthog.com")).toBe("https://eu.i.posthog.com");
  });
});

describe("next.config.js", () => {
  it("has no /ingest rewrite tunnelling PostHog through our own domain", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("../../../../next.config.js");
    const rewrites = typeof config.rewrites === "function" ? await config.rewrites() : [];
    const all = Array.isArray(rewrites) ? rewrites : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])];
    const tunnels = all.filter((r: { destination?: string }) => /posthog\.com/.test(r.destination ?? ""));
    expect(tunnels).toEqual([]);
  });
});
