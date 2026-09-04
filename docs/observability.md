# Observability — icodemybusiness.com

How the site is instrumented, what we measure, and where to look. Product
analytics + error health live in **PostHog project 206048** (EU cloud); deep
error debugging lives in **Sentry**. The two are complementary: PostHog answers
"how is the business doing / how often are we erroring", Sentry answers "what
exactly broke and where".

- **Main dashboard:** [iCodeMyBusiness — Operations](https://eu.posthog.com/project/206048/dashboard/761841) (pinned, project 206048)
- **Runbook:** [RUNBOOK.md](./RUNBOOK.md)
- **Event taxonomy (code):** [`src/lib/analytics-events.ts`](../src/lib/analytics-events.ts)

---

## How it's wired

| Layer | File | Role |
|-------|------|------|
| Client init | `src/instrumentation-client.ts` → `src/lib/posthog.ts` | Boots posthog-js at startup. `capture_pageview:false` (manual), `capture_pageleave:true`, `capture_exceptions:true`. Ingestion via same-origin `/ingest` proxy (ad-blocker resistant). |
| Pageviews + identify | `src/components/shared/PostHogProvider.tsx` | Manual `$pageview` on route change (Suspense-wrapped), `identify()` on Clerk sign-in, `reset()` on sign-out. |
| Client events | `src/lib/analytics.ts` | Typed `analytics.*` helpers; no-op when PostHog isn't loaded. |
| Server events | `src/lib/posthog-server.ts` | posthog-node singleton. Direct EU host (server can't use `/ingest`). `captureServerEvent`, `captureServerError`, `flushServerAnalytics`. |
| Reverse proxy | `next.config.js` | Rewrites `/ingest/*` → `eu(-assets).i.posthog.com`. Activate with `NEXT_PUBLIC_POSTHOG_HOST=/ingest`. |
| Error pipe | `src/lib/api-error-handler.ts` | `errorResponse` → Sentry (all) + PostHog `api_error` (5xx only), auto-tagged with `route`. |

`NEXT_PUBLIC_POSTHOG_KEY` **must be project 206048's client token** and
`NEXT_PUBLIC_POSTHOG_HOST` must resolve to EU (`/ingest` or
`https://eu.i.posthog.com`). A US host or a different project's key sends data
into the void — see RUNBOOK "Dashboard is flat / no data".

---

## Golden Signals coverage

PostHog owns business + error signals; **Sentry** owns latency/throughput (tracing,
`tracesSampleRate: 1.0` in `src/instrumentation*.ts`). Mapping the four SRE signals:

| Signal | Where | Status |
|--------|-------|--------|
| **Latency** | Sentry performance tracing (server + client transactions) | ✅ Covered (Sentry, not PostHog) |
| **Traffic** | PostHog `$pageview` + conversion events (user flows); Sentry transactions (API throughput) | ✅ User flows; ⚠️ no PostHog success-counter per API route |
| **Errors** | PostHog `api_error` (5xx, by route) + `$exception`; Sentry exceptions | ✅ Covered |
| **Saturation** | — | ⚠️ Not metered. Managed deps (Convex, Stripe, Resend, Retell) self-scale; saturation surfaces as latency/errors. Add only if a dependency starts throttling. |

**Gaps (intentional / follow-up):**
- No per-route *success* counter in PostHog — successful API traffic is inferred from
  Sentry transactions and downstream conversion events. Add a `api_request` counter
  only if route-level volume becomes a question PostHog must answer.
- No unified correlation ID across Convex/Stripe/PostHog/Sentry. Sentry trace IDs and
  PostHog `distinct_id`/`$session_id` exist independently; Stripe events carry
  `stripeEventId` in the audit log. Acceptable today; revisit if cross-system tracing is needed.

## PII in analytics (by design)

PostHog is used as an identified-person store (`person_profiles: "identified_only"`).
We **intentionally** send `email` and `name` on `identify` and use `email` as the
server-side `distinctId` for lead/Top 3 flows — this is the intended CRM-style use,
not a leak. Guardrails: no secrets/tokens are ever captured; `api_error.message` is a
developer string (avoid interpolating user data into thrown error messages so it can't
carry PII into the error metric).

---

## Metric catalog

### Tier 1 — most important (leads & revenue)

These are the business. If one of these goes to zero, something that makes money
is broken.

| Metric (event) | Fires from | Key props | Dashboard tile |
|----------------|-----------|-----------|----------------|
| **Leads captured** (`lead_captured`) | EmailCapture (client), free-tools (client), Top 3 complete (server); discovery assessments write `leads.source = "discovery-assessment"` directly in Convex | `source`, `form_variant` | "Leads captured (30d)" + Tier 1 trend |
| **Consultations booked** (`consultation_booked`) | CalendlyEmbed `postMessage` (client) | — | Tier 1 trend |
| **Paid subscriptions** (`checkout_completed`) | Stripe webhook `checkout.session.completed` (server) | `plan` | "Paid subscriptions started (30d)" + Tier 1 trend |

### Tier 2 — next most important (activation & engagement)

Leading indicators — these precede Tier 1 conversions. Watch them to predict and
diagnose Tier 1 movement.

| Metric (event) | Fires from | Key props |
|----------------|-----------|-----------|
| **Checkout started** (`checkout_started`) | Stripe checkout route (server) | `plan` |
| **Free tool accessed** (`free_tool_accessed`) | free-tools page (client) | — |
| **Top 3 completed** (`top3_completed`) | Top 3 complete route (server) | `issueCount` |
| **Discovery assessment completed** (`discovery_assessment_completed`) | DiscoveryAssessment on submit (client) | `source`, `degraded` |
| **Discovery report ready** (`discovery_report_ready`) | DiscoveryResultView when status flips to ready (client) | `path` |
| **Voice call started** (`voice_call_started`) | RetellVoiceWidget on `call_started` (client) | — |
| **Subscription canceled** (`subscription_canceled`) | Stripe webhook `subscription.deleted` (server) | `subscriptionId` |

### Discovery assessment decisions (dual-written to `visitorEvents`)

| Event | Fires from | Key props |
|-------|-----------|-----------|
| `assessment_started` | AssessmentGate CTA (client) | `already_signed_in` |
| `assessment_account_choice` | AssessmentGate doors (client) | `choice` |
| `discovery_stage_advanced` | DiscoveryAssessment on each server `state` event with `advanced` (client) | `stage`, `followUpsUsed`, `forced`, `degraded` |
| `discovery_recap_correction_opened` | DiscoveryAssessment when "Not quite" is clicked (client) | — |
| `discovery_recap_corrected` | DiscoveryAssessment when a correction is submitted (client) | `chars`, `degraded` |
| `discovery_recap_accepted` | DiscoveryAssessment when "Yes, that's right" is clicked, before the email form opens (client) | `needsEmail` |
| `discovery_recap_confirmed` | DiscoveryAssessment in `onSubmit`, i.e. when the email is submitted — **not** when "Yes, that's right" is clicked. A guest clicking it only opens the email form, which fires nothing. This event therefore trails `discovery_assessment_completed` by one `await` and can only exceed it if `submit` throws. The click itself is unmeasured. | — |
| `discovery_account_claimed` | DiscoveryAccountCta after `claim` succeeds (client) | — |
| `book_call_clicked` | result-screen CTA (client) | `placement: "discovery-result"` |

### Operational — health

| Metric (event) | Fires from | Key props | Notes |
|----------------|-----------|-----------|-------|
| **API errors** (`api_error`) | `errorResponse` (server) | `route`, `code`, `status_code`, `message` | **5xx only** — 4xx (validation/auth/rate-limit) are expected and excluded to keep the signal meaningful. |
| **Client exceptions** (`$exception`) | posthog-js autocapture | (stack) | Count on dashboard; full stack traces in Sentry. |
| **Pageviews / pageleaves** (`$pageview` / `$pageleave`) | PostHogProvider / posthog-js | `$current_url` | Foundation for bounce rate & time-on-page. |

---

## Identity model

- **Known users** (post Clerk sign-in): `identify(clerkUserId)`. Server events on
  these paths (`checkout_*`) use the same `clerkUserId` as `distinctId`, so client
  and server events stitch onto one person.
- **Anonymous → email** (lead/Top 3 flows): server events use **email** as
  `distinctId`. These become identified persons keyed by email. Anonymous client
  events before email capture won't perfectly stitch — acceptable, since the
  dashboards count event volume, not per-person journeys.

## Known gaps / follow-ups

- **`consultation_booked` depends on Calendly's `postMessage`.** If Calendly
  changes its embed messaging it could silently stop. A Calendly→webhook
  integration would be more robust (future).
- **No PostHog alerting yet.** Dashboard is pull, not push. Consider a PostHog
  alert on `api_error` > threshold and an `$exception` spike alert.
- **Server identity stitching** for anonymous lead flows is email-based, not
  device-based (see Identity model).
