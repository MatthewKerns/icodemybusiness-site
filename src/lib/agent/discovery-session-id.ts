/**
 * The discovery conversation's session id, and the one place that owns it.
 *
 * Lifted out of DiscoveryAssessment so three callers can share it: the
 * component that creates it, the hook that binds it to an account, and the
 * portal that adopts one to resume. It lives under `src/lib/agent/*` rather
 * than `src/components/agent/*` because the ESLint phase rule forbids app
 * routes from statically importing the latter.
 *
 * Storage is `sessionStorage`, so the id is PER TAB, not per browser. That is
 * why an unfinished assessment needs an account binding to be findable at all:
 * close the tab and this is gone. The format is unchanged from the original —
 * `Math.random()` rather than `crypto.randomUUID()` — because changing it would
 * orphan every conversation currently in flight. Worth doing separately; it is
 * not a secret and must not be treated as one.
 */

export const DISCOVERY_SESSION_STORAGE_KEY = "discovery-session-id";

/**
 * Fired after a write so listeners above the router outlet notice. `storage`
 * events only fire in *other* tabs, and the binding hook never remounts, so
 * without this it would not see an id created later in the same tab.
 */
const CHANGE_EVENT = "icmb:discovery-session-id";

export function readDiscoverySessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(DISCOVERY_SESSION_STORAGE_KEY);
  } catch {
    return null; // private browsing, or storage disabled
  }
}

export function setDiscoverySessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISCOVERY_SESSION_STORAGE_KEY, id);
  } catch {
    // Nothing to do — the conversation simply will not survive a reload.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Read the id for this tab, creating one on first use. */
/** The one place the id format lives, so minting and rotating cannot drift. */
function mintId(): string {
  return `da_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;
}

export function ensureDiscoverySessionId(): string {
  if (typeof window === "undefined") return "";
  const stored = readDiscoverySessionId();
  if (stored) return stored;
  const fresh = mintId();
  setDiscoverySessionId(fresh);
  return fresh;
}

/**
 * Abandon this tab's session id and mint a new one.
 *
 * For the case where the stored id belongs to a different account — someone
 * else signed in on this browser, or the same person signed in as a different
 * user. The conversation behind that id is not ours to read, so the only useful
 * move is to start a fresh one.
 */
export function rotateDiscoverySessionId(): string {
  const fresh = mintId();
  setDiscoverySessionId(fresh);
  return fresh;
}

export function subscribeDiscoverySessionId(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}
