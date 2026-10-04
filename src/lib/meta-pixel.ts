/**
 * Meta Pixel for icodemybusiness.com (pixel set up by Matthew, 2026-10-04).
 *
 * The id is a constant, not an env var: it is public by design — it appears in
 * every page's HTML — and a constant keeps the deploy code-only.
 *
 * Anything the pixel receives must also be disclosed on /privacy
 * (src/lib/processors.ts); src/lib/__tests__/processors.test.ts pins that.
 */
export const META_PIXEL_ID = "183644391008635";

/**
 * The Meta standard events this site sends. Names are Meta's own
 * (developers.facebook.com/docs/meta-pixel/reference) and must not be renamed.
 * No parameters are sent with them — never an email, name or form text.
 */
export const META_STANDARD_EVENTS = {
  /** Every page view; the base code sends the first, MetaPixel sends the rest. */
  PAGE_VIEW: "PageView",
  /** A sign-up completed: email capture, or the discovery assessment submitted. */
  LEAD: "Lead",
  /** A call booked through the Calendly embed. */
  SCHEDULE: "Schedule",
} as const;

export type MetaStandardEvent =
  (typeof META_STANDARD_EVENTS)[keyof typeof META_STANDARD_EVENTS];

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Sends a standard event. A no-op on the server or when the pixel is blocked or not loaded. */
export function trackMeta(event: MetaStandardEvent): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event);
}
