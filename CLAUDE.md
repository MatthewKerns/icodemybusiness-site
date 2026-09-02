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

- **Hosting:** Hostinger VPS (`root@2.25.207.149`), Docker container `icodemybusiness-site` behind Traefik. Not Dokploy.
- **Staging = the only place the app runs:** `https://staging.icodemybusiness.com` (Namecheap A record → the VPS). The old `icodemybusiness.srv1757482.hstgr.cloud` host is unrouted on purpose. The apex `icodemybusiness.com` still serves the old static GitHub Pages placeholder until cutover.
- **`git push` deploys nothing** (CI is `push: false`). Deploy with `scripts/deploy-staging.sh <sha>`: it exports a clean `git archive` of one commit that is already on `origin/main`, pushes Convex first when `convex/` changed, syncs, rebuilds and swaps the staging container, verifies, and records `DEPLOYED_SHA` on the VPS. Never rsync the shared working tree — other sessions' uncommitted files ride along. Full process, branch flow and hand-off format: `docs/DEPLOY.md`.
- **Only the deploy session deploys.** Other sessions commit + push and send `ready to deploy: <sha>` with Convex/env notes.
- **Convex deploys separately** from the Docker image and must go first; the script handles it (`npx convex dev --once` from the export, using the laptop's Convex login — the VPS has no Convex access).
- **VPS-only files, never in git:** `deploy.sh` (modes `build` | `staging` | `cutover`; `run` is the legacy hstgr-host mode — don't use it), `.env.build` (runtime + build-arg values), `build.log`, `DEPLOYED_SHA`, `DEPLOY_LOG`. Deleted files linger on the VPS unless synced with `--delete` — the script does that for `src/ convex/ public/`.
- **Build:** `Dockerfile` (multi-stage: deps → build → runner with standalone output); `docker-compose.yml` is local-dev/env reference only.
