# Release Pipeline — icodemybusiness-site

Project layer read by the guide's `release-*` skills. Facts only; pipeline logic lives in the skills,
command detail lives in [`docs/DEPLOY.md`](DEPLOY.md).

## Integration branch

`main` — PRs / fast-forwards land here; staging deploys build from it.

## Local verification gates

Run by `release-verify-local` (and by `scripts/deploy-staging.sh` on the VPS, on the clean export):

```bash
npm run lint
npx tsc --noEmit
npm test
```

- Baseline: none — all three must be green. A test that fails is fixed in the implementation, never skipped.
- Worktree note: `node_modules` is per-worktree (`npm ci --ignore-scripts`); the shared checkout must not be reinstalled while other sessions are active.
- Where they run: on the VPS through `~/bin/offload-run --lane node-full` (default in the deploy script); locally only for a single named test file while the laptop RAM guard is WARN/CRIT.

## Staging

- Model: `deploy-target` (no staging branch; `main` tip → staging)
- URL: https://staging.icodemybusiness.com
- Deploy runbook: [`docs/DEPLOY.md`](DEPLOY.md) → `scripts/deploy-staging.sh <sha>`
- Verification: `scripts/deploy-staging.sh status` (reads `DEPLOYED_SHA` on the VPS) + the script's route/no-price/noindex checks
- Smoke routes: `/`, `/free-tools`, `/consulting`, `/book`, `/academy`, `/services`, `/assessment`, `/vsl`; `/subscribe` → 307
- Hazards: `NEXT_PUBLIC_*` values are baked at build time (VPS `.env.build` + `--build-arg` in the VPS `deploy.sh`); Calendly env must point at a live event (`12kernsmatthew/new-meeting-1`); never `./deploy.sh run` (re-exposes the legacy host); Convex must be pushed before the app when `convex/` changed; GitHub Actions is informational only (billing-locked as of 2026-09-02)

## Production

- URL: https://icodemybusiness.com — still the static GitHub Pages placeholder (cutover pending)
- Deploy runbook: [`docs/DEPLOY.md`](DEPLOY.md) → "Production (later)" (DNS at Namecheap, `./deploy.sh cutover`, retire `CNAME` + `deploy-apex.yml`)
- Verification: same smoke routes on the apex; Google Safe Browsing status afterwards
- Rollback: `scripts/deploy-staging.sh <previous sha>` (history in `docs/release/DEPLOY_QUEUE.md` and `DEPLOY_LOG` on the VPS)

## Deploy queue

- Path: `docs/release/DEPLOY_QUEUE.md`

## Cadence

- Staging: continuous (every hand-off). Prod: weekly, on a day Matthew picks, with a human `--confirm` carrying the approved sha. Off-cadence prod deploys require an explicit request.

## Issue flagging

- Tracker: `docs/ROADMAP.md` (R-xxx items) and GitHub issues via `gh issue create`
- Label: `staging-blocker`
