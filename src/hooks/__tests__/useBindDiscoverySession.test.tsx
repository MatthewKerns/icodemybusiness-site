/**
 * Binding an in-progress conversation to the account that just signed in.
 *
 * The hook runs on every page for every signed-in visitor, so the cases that
 * matter most are the ones where it must do NOTHING: signed out, no session in
 * this tab, the status query still loading, or a session that already has an
 * owner. Firing wrongly here either wastes a write on every navigation or hands
 * one person's conversation to another.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

const mockBind = vi.fn(() => Promise.resolve({ bound: true }));
let statusValue: unknown = undefined;
let clerkState: { isSignedIn: boolean; userId: string | null } = {
  isSignedIn: false,
  userId: null,
};

vi.mock("convex/react", () => ({
  useMutation: () => mockBind,
  useQuery: () => statusValue,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => clerkState,
}));

vi.mock("@/hooks/useTrackEvent", () => ({
  useTrackEvent: () => () => {},
}));

import { useBindDiscoverySession } from "../useBindDiscoverySession";
import {
  DISCOVERY_SESSION_STORAGE_KEY,
  setDiscoverySessionId,
} from "@/lib/agent/discovery-session-id";

function Probe() {
  useBindDiscoverySession();
  return null;
}

const SIGNED_IN = { isSignedIn: true, userId: "user_visitor" };
const UNBOUND = { exists: true, boundToMe: false, boundToOther: false };

beforeEach(() => {
  mockBind.mockClear();
  statusValue = undefined;
  clerkState = { isSignedIn: false, userId: null };
  window.sessionStorage.clear();
});

afterEach(cleanup);

describe("useBindDiscoverySession", () => {
  it("does nothing for a signed-out visitor", async () => {
    setDiscoverySessionId("da_1");
    statusValue = UNBOUND;
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
  });

  it("does nothing when this tab has no conversation", async () => {
    clerkState = SIGNED_IN;
    statusValue = UNBOUND;
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
    expect(
      window.sessionStorage.getItem(DISCOVERY_SESSION_STORAGE_KEY)
    ).toBeNull();
  });

  it("waits while the status query is still loading", async () => {
    setDiscoverySessionId("da_2");
    clerkState = SIGNED_IN;
    statusValue = undefined; // in flight, not "no row"
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
  });

  it("waits until the session row exists", async () => {
    setDiscoverySessionId("da_3");
    clerkState = SIGNED_IN;
    statusValue = { exists: false, boundToMe: false, boundToOther: false };
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
  });

  it("binds once when a signed-in visitor has an unowned conversation", async () => {
    setDiscoverySessionId("da_4");
    clerkState = SIGNED_IN;
    statusValue = UNBOUND;
    const { rerender } = render(<Probe />);
    await waitFor(() => expect(mockBind).toHaveBeenCalledTimes(1));
    expect(mockBind).toHaveBeenCalledWith({ sessionId: "da_4" });
    rerender(<Probe />);
    rerender(<Probe />);
    await waitFor(() => expect(mockBind).toHaveBeenCalledTimes(1));
  });

  it("does not re-bind a conversation it already owns", async () => {
    setDiscoverySessionId("da_5");
    clerkState = SIGNED_IN;
    statusValue = { exists: true, boundToMe: true, boundToOther: false };
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
  });

  it("never touches a conversation owned by someone else", async () => {
    // A shared machine: the previous person's assessment is still in this tab.
    setDiscoverySessionId("da_6");
    clerkState = SIGNED_IN;
    statusValue = { exists: true, boundToMe: false, boundToOther: true };
    render(<Probe />);
    await waitFor(() => expect(mockBind).not.toHaveBeenCalled());
  });
});
