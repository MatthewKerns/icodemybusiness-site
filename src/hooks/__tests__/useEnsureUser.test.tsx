/**
 * Regression test for the guard that stopped every Clerk sign-in from creating
 * a Convex user record.
 *
 * The original effect held two conditions that could not both be true:
 *
 *   if (!isSignedIn || !clerkUser || convexUser !== null) return;  // needs null
 *   if (convexUser !== undefined) return;                          // needs undefined
 *
 * so `ensureCurrentUser` was never reached. In production `users` sat empty
 * while `leads` carried real Clerk user ids — someone had signed in and no
 * record existed (docs/ROADMAP.md R-010).
 *
 * These cases pin the intended contract: fire exactly once when the query has
 * resolved and found nothing, and never while it is still loading.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

const mockEnsure = vi.fn();
let convexUserValue: unknown = undefined;
let clerkState: { user: unknown; isSignedIn: boolean } = {
  user: null,
  isSignedIn: false,
};

vi.mock("convex/react", () => ({
  useMutation: () => mockEnsure,
  useQuery: () => convexUserValue,
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => clerkState,
}));

import { useEnsureUser } from "../useEnsureUser";

function Probe() {
  useEnsureUser();
  return null;
}

describe("useEnsureUser", () => {
  beforeEach(() => {
    mockEnsure.mockReset();
    mockEnsure.mockResolvedValue("user_id");
    convexUserValue = undefined;
    clerkState = { user: null, isSignedIn: false };
  });
  afterEach(cleanup);

  it("creates the record once the query resolves to null", async () => {
    clerkState = { user: { id: "user_1", fullName: "Matthew Kerns" }, isSignedIn: true };
    convexUserValue = null; // loaded, no row found

    render(<Probe />);

    await waitFor(() => expect(mockEnsure).toHaveBeenCalledTimes(1));
    expect(mockEnsure).toHaveBeenCalledWith({ name: "Matthew Kerns" });
  });

  it("does not fire while the query is still loading", async () => {
    clerkState = { user: { id: "user_1", fullName: "Matthew Kerns" }, isSignedIn: true };
    convexUserValue = undefined; // still loading

    render(<Probe />);

    await new Promise((r) => setTimeout(r, 20));
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it("does not fire when a record already exists", async () => {
    clerkState = { user: { id: "user_1", fullName: "Matthew Kerns" }, isSignedIn: true };
    convexUserValue = { _id: "abc", clerkUserId: "user_1" };

    render(<Probe />);

    await new Promise((r) => setTimeout(r, 20));
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it("does not fire for a signed-out visitor", async () => {
    clerkState = { user: null, isSignedIn: false };
    convexUserValue = null;

    render(<Probe />);

    await new Promise((r) => setTimeout(r, 20));
    expect(mockEnsure).not.toHaveBeenCalled();
  });
});
