# Runbook — icodemybusiness.com

Operational runbook for the analytics + error-tracking layer and the API routes
it covers. Goal: a teammate (or future you at 2am) resolves an issue without
asking anyone.

- **Dashboard:** [iCodeMyBusiness — Operations](https://eu.posthog.com/project/206048/dashboard/761841) (PostHog project 206048, EU)
- **Error detail:** Sentry (stack traces, breadcrumbs, replays)
- **Metric catalog & wiring:** [observability.md](./observability.md)

## Overview

A lead-gen / consulting site (Next.js standalone + Convex + Clerk + Stripe).
Visitors convert through email capture, the Top 3 Issues agent, a Retell voice
agent, free tools, a Calendly consultation, and paid Stripe subscriptions. Every
conversion emits a PostHog event; every API failure (5xx) emits `api_error` and a
Sentry exception.

## Operational notes

- **Hosting:** Hostinger VPS (Docker + Traefik; see docs/DEPLOY.md), `output: standalone` (long-running Node server — posthog-node batching with `flushAt:1` flushes promptly).
- **Dependencies:** Convex (data), Clerk (auth), Stripe (payments), Resend (email), Retell (voice), Calendly (booking), PostHog (analytics), Sentry (errors).
- **Analytics never blocks a request** — all capture is wrapped; failures are swallowed. A broken PostHog will *not* take down a route.

---

## Error resolution guide

All API routes funnel errors through `errorResponse` (`src/lib/api-error-handler.ts`),
which logs to Sentry and, for **5xx only**, emits `api_error` to PostHog tagged
with `route`. Start triage at the **"API errors (5xx) by route"** dashboard tile —
the `route` breakdown points you at the section below.

### `api_error` on `/api/webhooks/stripe`
- **Signature:** `api_error{route="/api/webhooks/stripe"}`, `InternalError "Webhook handler failed"`, HTTP 500. Tier 1 `checkout_completed` flatlines while `checkout_started` keeps rising.
- **Likely cause:** Convex mutation (`createSubscription` / `logAuditEvent`) failed, or `stripe.subscriptions.retrieve` failed.
- **Investigate:** Sentry exception for the route → which call threw. Check Convex deployment health. Check Stripe Dashboard → Developers → Webhooks for delivery + response.
- **Resolve:** Fix the downstream (Convex/Stripe), then **replay the Stripe event** from the Stripe webhook UI — Stripe also auto-retries, so transient failures self-heal.
- **Escalate:** Sustained failures = subscriptions not provisioning → revenue impact. Page after ~15 min sustained.

### Stripe webhook `400 Invalid signature` (NOT in `api_error` — it's 4xx)
- **Signature:** `ValidationError "Invalid signature"`, HTTP 400. Won't appear on the error tile (4xx excluded by design).
- **Likely cause:** `STRIPE_WEBHOOK_SECRET` mismatch (wrong env, rotated secret) or a proxy mangling the raw body.
- **Resolve:** Confirm the secret matches the endpoint's signing secret in Stripe. Ensure the raw body reaches the route unmodified.

### `api_error` on `/api/stripe/checkout`
- **Signature:** `api_error{route="/api/stripe/checkout"}`, HTTP 500.
- **Likely cause:** `InternalError "Plan not configured"` (missing/invalid Stripe price env for the plan), or Stripe API unavailable. Note: `401` (not signed in) and `400` (invalid plan) are expected 4xx and won't alert.
- **Investigate:** Sentry context → plan requested. Verify the price-ID env vars (`src/lib/stripe-plans.ts`). Check Stripe status.
- **Resolve:** Set/correct the price-ID env var; redeploy.

### `api_error` on `/api/agent/top3/complete`
- **Signature:** `api_error{route="/api/agent/top3/complete"}`, HTTP 500/503.
- **Likely cause:** `503 "Email service not configured"` (missing `RESEND_API_KEY`), `500` from Resend send failure, or a Convex mutation throwing. Expected 4xx: `404` (session not found), `400` (no issues / missing email).
- **Investigate:** Sentry for the throwing call. Check Resend dashboard for delivery/bounces. Confirm `RESEND_API_KEY` / `RESEND_FROM_EMAIL`.
- **Resolve:** Restore Resend config; the lead is still created before the email step, so re-sending is safe.

### `api_error` on `/api/retell/create-call`
- **Signature:** `api_error{route="/api/retell/create-call"}`, HTTP 500.
- **Likely cause:** `InternalError "Retell API not configured"` (missing `RETELL_API_KEY` / `RETELL_AGENT_ID`) or Retell API down.
- **Investigate:** Sentry. Confirm Retell env vars. Check Retell status.
- **Resolve:** Restore env/config. User-facing symptom: voice widget shows "Failed to start voice call".

### `api_error` on `/api/email/welcome`
- **Signature:** `api_error{route="/api/email/welcome"}`, HTTP 500.
- **Likely cause:** Resend misconfigured/unavailable.
- **Note:** Non-critical — the lead + tool access are already granted client-side; only the welcome email is affected.

### Client `$exception` spike
- **Signature:** "Client-side exceptions" tile climbs.
- **Investigate:** PostHog has the **count**; go to **Sentry** for the stack trace, breadcrumbs, and session replay. Correlate the spike time with a deploy.
- **Resolve:** Fix forward or roll back the implicated deploy.

### Lead capture rate-limited (client, not a 5xx)
- **Signature:** EmailCapture shows "Too many attempts…"; no `api_error` (it's a Convex `RateLimited` error surfaced inline).
- **Cause:** Per-session+email rate limit in `convex/leads.ts`. Expected under abuse/retry; investigate only if widespread.

---

## Dashboard is flat / no data

If conversions are happening but the dashboard shows nothing:
1. **Region/key:** Confirm `NEXT_PUBLIC_POSTHOG_KEY` is **project 206048's** client token and `NEXT_PUBLIC_POSTHOG_HOST` resolves to **EU** (`/ingest` or `https://eu.i.posthog.com`). A US host or wrong-project key drops everything silently.
2. **Proxy:** With `/ingest`, open the browser Network tab and confirm `/ingest/*` requests return 200. If 404, the `next.config.js` rewrites aren't deployed.
3. **Server events:** posthog-node uses the direct EU host even when the client uses `/ingest`. Confirm `NEXT_PUBLIC_POSTHOG_KEY` exists in the server runtime env (not just the browser bundle).
4. **Test-account filter:** The insights have `filterTestAccounts:false`, so internal traffic is included — not the cause of emptiness.

---

## Metric interpretation

| Metric | Spike means | Zero / drop means |
|--------|-------------|-------------------|
| `lead_captured` | Campaign/traffic working, or a tool flow converting | **Capture broken** — check `api_error` on lead routes + that `analytics.leadCaptured` still fires after `createLead` |
| `consultation_booked` | Consulting demand up | Calendly `postMessage` may have changed, or booking page broken — test a real booking |
| `checkout_completed` | Revenue ↑ | If `checkout_started` is healthy but this is 0 → **payment or webhook broken**; check Stripe webhook `api_error` |
| `checkout_started` | Purchase intent ↑ | Subscribe page or checkout route broken — check `/api/stripe/checkout` errors |
| `free_tool_accessed` / `top3_completed` / `voice_call_started` | Activation healthy | A specific funnel broke — check that route/component |
| `subscription_canceled` | **Churn** — investigate cause (billing failures, dissatisfaction) | Normal is low/zero |
| `api_error` | Something broke — use the `route` breakdown | Healthy |
| `$exception` | Client regression, often post-deploy | Healthy |

---

## Related
- Metric catalog & instrumentation map: [observability.md](./observability.md)
- Error matrix (failure modes): [`.feature-factory/posthog-observability/errors.md`](../.feature-factory/posthog-observability/errors.md)
- Event taxonomy: [`src/lib/analytics-events.ts`](../src/lib/analytics-events.ts)
