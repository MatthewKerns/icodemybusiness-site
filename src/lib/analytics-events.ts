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
  /**
   * The splash gate was passed — "Start Now" clicked on the full-screen opener.
   * The first funnel step there is: page views before this are arrivals, and the
   * drop between them is the gate's bounce rate, which nothing measured before.
   */
  SPLASH_ENTERED: "splash_entered",
  /** Homepage "Assess where you are now" clicked — entry to the assessment. */
  ASSESSMENT_STARTED: "assessment_started",
  /** Discovery assessment submitted (email given, report generation started). */
  DISCOVERY_ASSESSMENT_COMPLETED: "discovery_assessment_completed",
  /** Discovery assessment report finished generating and was shown to the visitor. */
  DISCOVERY_REPORT_READY: "discovery_report_ready",
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
  /**
   * Which door the visitor took at the assessment's optional account gate:
   * `create_account` | `sign_in` | `guest`. Signing in is what makes the report
   * retrievable later, so the guest share is the number worth watching.
   */
  ASSESSMENT_ACCOUNT_CHOICE: "assessment_account_choice",
  /** Discovery assessment: a question stage was completed (props: stage, followUpsUsed, forced). */
  DISCOVERY_STAGE_ADVANCED: "discovery_stage_advanced",
  /**
   * Discovery assessment: the visitor opened the "Not quite" box. Paired with
   * DISCOVERY_RECAP_CORRECTED so the drop between opening and submitting is
   * visible — someone who opens it and gives up is telling us the recap is
   * wrong just as loudly as someone who types a correction.
   */
  DISCOVERY_RECAP_CORRECTION_OPENED: "discovery_recap_correction_opened",
  /** Discovery assessment: a recap correction was submitted (props: chars, degraded). */
  DISCOVERY_RECAP_CORRECTED: "discovery_recap_corrected",
  /** Discovery assessment: the visitor confirmed the recap in their own words. */
  DISCOVERY_RECAP_CONFIRMED: "discovery_recap_confirmed",
  /** Discovery assessment: the report was claimed into a signed-in account. */
  DISCOVERY_ACCOUNT_CLAIMED: "discovery_account_claimed",

  // --- Operational: health signals ------------------------------------
  /** An API route returned an error (captured in errorResponse). */
  API_ERROR: "api_error",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
