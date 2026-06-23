/**
 * Canonical PostHog event taxonomy for icodemybusiness.com.
 *
 * Shared by the client (`src/lib/analytics.ts`) and server
 * (`src/lib/posthog-server.ts`) capture helpers so event names never drift
 * between the two. The tiers below mirror the operational dashboard in
 * PostHog project 206048 and the metric catalog in docs/observability.md.
 *
 *   Tier 1 (most important)  — leads & revenue: the business depends on these.
 *   Tier 2 (next most important) — activation & engagement that precede Tier 1.
 *   Operational              — health signals (errors) shown on the dashboard.
 */
export const ANALYTICS_EVENTS = {
  // --- Tier 1: leads & revenue ----------------------------------------
  /** Email/lead captured (email form, free-tools sign-in, Top 3 agent). */
  LEAD_CAPTURED: "lead_captured",
  /** Free consultation booked via the Calendly embed. */
  CONSULTATION_BOOKED: "consultation_booked",
  /** Stripe checkout completed (paid subscription started). */
  CHECKOUT_COMPLETED: "checkout_completed",

  // --- Tier 2: activation & engagement --------------------------------
  /** Stripe checkout session created (intent to pay). */
  CHECKOUT_STARTED: "checkout_started",
  /** Visitor unlocked the free tools. */
  FREE_TOOL_ACCESSED: "free_tool_accessed",
  /** Top 3 Issues agent finished + summary emailed. */
  TOP3_COMPLETED: "top3_completed",
  /** Retell voice chat connected. */
  VOICE_CALL_STARTED: "voice_call_started",
  /** Subscription canceled (churn). */
  SUBSCRIPTION_CANCELED: "subscription_canceled",

  // --- Decisions & high-value clicks ----------------------------------
  // Captured durably in the Convex `visitorEvents` log (dual-written to
  // PostHog) so an admin can review the decisions and clicks a visitor made.
  /** Homepage "choose your path" offer card clicked. */
  PATH_CHOSEN: "path_chosen",
  /** A subscription pricing tier was selected on /subscribe. */
  TIER_SELECTED: "tier_selected",
  /** A Mango plan (free vs advanced) CTA was chosen. */
  PLAN_SELECTED: "plan_selected",
  /** A copy-to-clipboard value (MCP URL, CLI command, config) was copied. */
  COPY_CLICKED: "copy_clicked",
  /** A free tool was downloaded (or its external/repo link opened). */
  TOOL_DOWNLOADED: "tool_downloaded",
  /** The "Book a Call" CTA was clicked (intent, precedes consultation_booked). */
  BOOK_CALL_CLICKED: "book_call_clicked",
  /** The e-commerce intake agent was submitted into an application. */
  ECOMMERCE_INTAKE_COMPLETED: "ecommerce_intake_completed",

  // --- Operational: health signals ------------------------------------
  /** An API route returned an error (captured in errorResponse). */
  API_ERROR: "api_error",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
