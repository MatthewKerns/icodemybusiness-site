# Error Matrix — PostHog instrumentation & API routes

Feature-factory ERRORS bucket artifact for the observability/instrumentation work.
Enumerates failure modes for the instrumented API routes and the analytics layer,
how each is detected, how the code handles it today, and the operator action.
Resolution detail lives in [`docs/RUNBOOK.md`](../../docs/RUNBOOK.md).

Convention: API routes wrap handlers in `withErrorHandler` → `errorResponse`,
which logs **all** errors to Sentry and emits PostHog `api_error` for **5xx only**
(4xx are expected client errors: validation, auth, rate-limit).

## Strategy: correctness vs robustness

- **Correctness-first (fail loud, never silently succeed wrong):**
  - **Stripe webhook** — must provision the correct subscription or fail so Stripe
    retries. Non-2xx ⇒ Stripe redelivers; we never swallow a provisioning error.
  - **Lead creation** (`convex/leads.ts`) — a lost lead is lost revenue; the mutation
    throws on rate-limit/validation rather than pretend-succeed, surfaced inline.
- **Robustness-first (degrade, never break the request):**
  - **All analytics capture** (client + server) — wrapped/guarded; a PostHog outage
    cannot fail a user action. This is the single most important resilience rule here.
  - **Welcome email** — best-effort; lead + tool access are already granted, so an
    email failure degrades silently.
- **Rationale:** money + leads are correctness paths (loud failure is recoverable;
  silent wrong state is not). Everything observability/notification-shaped is
  robustness — it must never be in the critical path of a conversion.

| # | Failure mode | Route / surface | Detection | Code handling today | Retry | Operator action |
|---|--------------|-----------------|-----------|---------------------|-------|-----------------|
| 1 | Convex/Stripe call throws in webhook | `/api/webhooks/stripe` | `api_error` 500 + Sentry; `checkout_completed` flat vs `checkout_started` | `try/catch` → `InternalError`; non-2xx makes Stripe retry | Stripe auto-retries; manual replay in Stripe UI | Fix downstream, replay event (RUNBOOK) |
| 2 | Bad webhook signature | `/api/webhooks/stripe` | `ValidationError` 400 (not on error tile) | `ValidationError "Invalid signature"` | Stripe retries | Fix `STRIPE_WEBHOOK_SECRET`, ensure raw body |
| 3 | Plan price-ID missing | `/api/stripe/checkout` | `api_error` 500 | `InternalError "Plan not configured"` | Client may retry | Set price-ID env var |
| 4 | Unauthenticated / invalid plan | `/api/stripe/checkout` | 401 / 400 (expected, no alert) | `AuthError` / `ValidationError` | Client re-auth | None (expected) |
| 5 | Resend not configured | `/api/agent/top3/complete` | `api_error` 503 | `ApiError 503 "Email service not configured"` | Lead already created; re-send safe | Restore `RESEND_API_KEY` |
| 6 | Resend send fails | `/api/agent/top3/complete` | `api_error` 500 | `InternalError(error.message)` | Re-trigger completion | Check Resend dashboard |
| 7 | Session missing / no issues | `/api/agent/top3/complete` | 404 / 400 (expected) | `NotFoundError` / `ValidationError` | n/a | None (expected) |
| 8 | Retell not configured / API down | `/api/retell/create-call` | `api_error` 500 | `InternalError "Retell API not configured"` | User retries call | Restore Retell env / check status |
| 9 | Welcome email fails | `/api/email/welcome` | `api_error` 500 | `errorResponse` (non-critical) | Best-effort | Check Resend; lead+access already granted |
| 10 | Lead capture rate-limited | EmailCapture / `convex/leads.ts` | Inline form error; Convex `RateLimited` | `ConvexError {kind:"RateLimited"}` surfaced inline | User waits/retries | Investigate only if widespread |
| 11 | Uncaught client error | Any client component | `$exception` tile + Sentry | posthog-js `capture_exceptions:true`; Sentry captures | n/a | Triage in Sentry, fix/rollback |
| 12 | Analytics ingestion blocked/misrouted | All | Dashboard flat despite traffic | Capture is wrapped & swallowed — never breaks requests | n/a | Verify key=206048 + EU host + `/ingest` 200s (RUNBOOK) |
| 13 | Calendly `postMessage` contract changes | CalendlyEmbed | `consultation_booked` silently stops | Listener guards on origin + event name | n/a | Re-test booking; consider Calendly webhook |
| 14 | posthog-node flush dropped on shutdown | server routes | Missing server events | Critical paths (`webhook`, `top3`) call `flushServerAnalytics()` before responding | n/a | Ensure flush on new server-capture paths |

## Retry policy summary

- **Stripe webhooks** — no app-level retry; rely on Stripe's built-in redelivery
  (idempotent via `stripeEventId` in the audit log). Manual replay available in the
  Stripe UI. No infinite loops.
- **posthog-node** — fire-and-forget with `flushAt:1`; critical server paths
  (`/api/webhooks/stripe`, `/api/agent/top3/complete`) `await flushServerAnalytics()`
  before responding. No retry on capture failure (robustness path — drop, don't block).
- **Client-initiated routes** (checkout, retell, top3) — no automatic retry; the user
  re-triggers via the UI. Operations are not blindly retried because checkout/lead
  creation are non-idempotent at the app layer (lead creation de-dupes on email in
  Convex, so a user retry is safe).
- **No silent retries on non-idempotent operations**; no unbounded backoff anywhere.

## Design decisions

- **5xx-only `api_error`.** 4xx are expected and high-volume; including them would
  drown the operational error signal. They remain in Sentry as warnings.
- **Analytics is non-blocking.** Every capture path is wrapped in try/catch (or a
  loaded-guard on the client). A PostHog outage cannot fail a user request.
- **Dual sink.** Sentry = debugging depth (stack/replay); PostHog = operational
  counts next to business metrics. Intentional redundancy.
- **Flush on critical paths.** Long-running Node server + `flushAt:1` makes
  fire-and-forget safe, but webhook/Top 3 paths `await flushServerAnalytics()` to
  guarantee delivery before the response ends.
