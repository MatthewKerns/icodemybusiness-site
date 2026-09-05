/**
 * A failure in the session hooks must not take the site down.
 *
 * Both hooks in SessionBridge call Convex `useQuery`, which throws during render
 * on error. In the root layout that throw reached app/global-error.tsx and
 * replaced the whole page — observed on the apex on 2026-09-05, minutes after
 * the cutover. These tests pin the asymmetry: the hooks may break, the page
 * may not.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Providers reads the Convex URL at module scope and throws without it, so it
// must exist before the dynamic import in each test. Any URL will do — the
// Convex client itself is mocked.
beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
});

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isSignedIn: false, userId: null, isLoaded: true }),
  useUser: () => ({ user: null, isSignedIn: false }),
}));
vi.mock("convex/react-clerk", () => ({
  ConvexProviderWithClerk: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("convex/react", () => ({
  ConvexReactClient: class {},
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));
vi.mock("@/components/shared/PostHogProvider", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/shared/PageViewTracker", () => ({ PageViewTracker: () => null }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const ensureUser = vi.fn();
vi.mock("@/hooks/useEnsureUser", () => ({ useEnsureUser: () => ensureUser() }));
vi.mock("@/hooks/useBindDiscoverySession", () => ({ useBindDiscoverySession: () => {} }));

afterEach(() => {
  cleanup();
  ensureUser.mockReset();
});

describe("SessionBridge isolates the session hooks from the page", () => {
  it("renders children when the hooks are healthy", async () => {
    const { Providers } = await import("../Providers");
    render(
      <Providers>
        <p>the site</p>
      </Providers>,
    );
    expect(screen.getByText("the site")).toBeInTheDocument();
  });

  it("still renders the page when a session hook throws", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    ensureUser.mockImplementation(() => {
      throw new Error("Convex query failed — e.g. a function or index the deployment lacks");
    });

    const { Providers } = await import("../Providers");
    render(
      <Providers>
        <p>the site</p>
      </Providers>,
    );

    // The funnel survives; only the invisible bookkeeping is lost.
    expect(screen.getByText("the site")).toBeInTheDocument();
    expect(screen.queryByText(/critical error/i)).not.toBeInTheDocument();
    quiet.mockRestore();
  });
});
