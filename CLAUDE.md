<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Analytics & Observability

- **Product analytics + error health:** PostHog project **206048** (EU cloud). Main dashboard: "iCodeMyBusiness — Operations" (`/project/206048/dashboard/761841`). **Deep error debugging:** Sentry.
- **Event taxonomy:** `src/lib/analytics-events.ts` (Tier 1 = leads/revenue, Tier 2 = activation, operational = errors). Add new events here, then capture via `src/lib/analytics.ts` (client) or `src/lib/posthog-server.ts` (server) — never hardcode event-name strings.
- **Errors:** all API routes wrap handlers in `withErrorHandler` → `errorResponse` (`src/lib/api-error-handler.ts`), which logs to Sentry + emits PostHog `api_error` for **5xx only**.
- **Config:** `NEXT_PUBLIC_POSTHOG_KEY` = project 206048 token; `NEXT_PUBLIC_POSTHOG_HOST` = `/ingest` (same-origin proxy → EU, set in `next.config.js`) or `https://eu.i.posthog.com`. Never US.
- **Docs:** [`docs/observability.md`](docs/observability.md) (metric catalog) and [`docs/RUNBOOK.md`](docs/RUNBOOK.md) (error → action).

## Deployment

- **Hosting:** Dokploy (Docker-based)
- **Staging:** Every push to `main` auto-deploys to `staging.icodemybusiness.com`
- **Build:** Uses `Dockerfile` (multi-stage: deps → build → runner with standalone output)
- **Note:** `docker-compose.yml` exists for local dev / env reference but Dokploy should be configured to use `Dockerfile` directly, not docker-compose
