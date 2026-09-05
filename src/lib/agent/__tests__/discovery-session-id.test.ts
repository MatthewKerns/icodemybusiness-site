/**
 * The tab-scoped discovery session id.
 *
 * `sessionStorage`, so it is per tab — closing the tab loses the conversation.
 * That fragility is the reason the account binding exists, and these cases pin
 * the two things the binding and the portal resume depend on: the id is stable
 * within a tab, and adopting one notifies listeners that never remount.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DISCOVERY_SESSION_STORAGE_KEY,
  ensureDiscoverySessionId,
  readDiscoverySessionId,
  setDiscoverySessionId,
  subscribeDiscoverySessionId,
} from "../discovery-session-id";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("ensureDiscoverySessionId", () => {
  it("creates one on first use and keeps it after that", () => {
    expect(readDiscoverySessionId()).toBeNull();
    const first = ensureDiscoverySessionId();
    expect(first).toMatch(/^da_/);
    expect(ensureDiscoverySessionId()).toBe(first);
    expect(
      window.sessionStorage.getItem(DISCOVERY_SESSION_STORAGE_KEY)
    ).toBe(first);
  });

  it("returns whatever the tab already holds, including an adopted id", () => {
    // This is the portal resume path: the id is written before navigating, and
    // the assessment must pick it up rather than starting a new conversation.
    setDiscoverySessionId("da_adopted_1");
    expect(ensureDiscoverySessionId()).toBe("da_adopted_1");
  });
});

describe("subscribeDiscoverySessionId", () => {
  it("notifies on a write, because the binding hook never remounts", () => {
    const seen = vi.fn();
    const unsubscribe = subscribeDiscoverySessionId(seen);
    setDiscoverySessionId("da_x");
    expect(seen).toHaveBeenCalledTimes(1);
    setDiscoverySessionId("da_y");
    expect(seen).toHaveBeenCalledTimes(2);
    unsubscribe();
    setDiscoverySessionId("da_z");
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
