# Deploying icodemybusiness-site

One person (or one agent session — the **deploy** session) deploys. Everyone
else commits, pushes, and hands off. This page is the whole process.

## Environments

| Name | URL | What it is | How it gets code |
|---|---|---|---|
| Staging | `https://staging.icodemybusiness.com` | The only place the app runs today; **all manual verification happens here** | `scripts/deploy-staging.sh <sha>` |
| Production | `https://icodemybusiness.com` | Still the old static GitHub Pages placeholder | DNS cutover + `./deploy.sh cutover` on the VPS (not yet done) |

`git push` deploys nothing. CI (`.github/workflows/ci.yml`) lints, typechecks,
tests, and proves the Docker image compiles — it does not deploy.

## The rule that matters

**Deploy only committed code, from a clean export.** Several agent sessions
share the same working tree; anyone's uncommitted files would otherwise ride
along. `scripts/deploy-staging.sh` therefore refuses to touch the working tree:
it `git archive`s exactly one commit that is already on `origin/main`, and syncs
that.

## Branch flow

1. **Work on a branch, ideally in your own worktree** so your WIP never sits in
   someone else's checkout:
   ```bash
   git worktree add ../icmb-wt-<you> -b agent/<you>/<topic> origin/main
   ```
   (`node_modules` is not shared across worktrees — run `npm ci --ignore-scripts`
   there, or symlink the main checkout's.)
2. Commit small, with the attribution trailer the repo uses.
3. **Push the branch.** CI runs on it? No — CI runs on `main`. So:
4. **Integrate into `main`** when it's ready to be verified: fast-forward or
   merge locally after `npm run lint && npx tsc --noEmit && npm test` pass, then
   `git push origin main`. Open a PR instead if you want a review; merge it when
   CI is green.
5. **Hand off to the deploy session** with one message:
   ```
   ready to deploy: <sha> (on origin/main)
   Convex changes: yes/no   New env vars: none | NAME=… (Matthew to set)
   Verify: <what to look at on staging>
   ```
6. The deploy session runs `scripts/deploy-staging.sh <sha>`, reports the
   verification back, and you check the rest by hand on staging.

Never run `git restore`, `git checkout -- .`, `git stash` or `npm install`
in the shared main checkout without telling the others — it has wiped
`node_modules` and other people's edits before.

## What the script does

```
scripts/deploy-staging.sh <ref> [--skip-ci] [--allow-unmerged] [--no-convex] [--dry-run]
scripts/deploy-staging.sh status
```

1. Resolves the ref and **requires it to be on `origin/main`** (`--allow-unmerged`
   for a throwaway preview only).
2. Checks GitHub Actions for that commit via `gh` (warns if none, fails on a
   failed run unless `--skip-ci`).
3. `git archive`s the commit into a temp dir.
4. Compares with the sha recorded on the VPS (`DEPLOYED_SHA`) to see whether
   `convex/` changed.
5. Takes a lock on the VPS (`.deploy.lock`) and refuses if a Docker build is
   already running.
6. **Pushes Convex first** when `convex/` changed (`npx convex dev --once` from
   the export, using the laptop's Convex login) — the app must never ship
   before the functions it calls.
7. Rsyncs `src/`, `convex/`, `public/` (with `--delete`) plus the root config
   files. It never touches `deploy.sh`, `.env*`, `build.log`, `node_modules`.
8. `./deploy.sh build` then `./deploy.sh staging` on the VPS, records
   `DEPLOYED_SHA` and appends to `DEPLOY_LOG`.
9. Verifies: every listed route is 200, `/subscribe` redirects, zero visible
   currency amounts on `/`, `/vsl` carries `noindex`.

Rollback = deploy the previous sha: `scripts/deploy-staging.sh <prev-sha>`
(the script prints it on failure; `DEPLOY_LOG` on the VPS has the history).

## Things the script cannot know — say them in the hand-off

- **Convex env vars** (`npx convex env set …`) and **VPS runtime env**
  (`/opt/icodemybusiness-site/.env.build`, edited by Matthew) — new keys must
  exist before the code that reads them ships. `NEXT_PUBLIC_*` values are baked
  at build time and also need a `--build-arg` line in the VPS `deploy.sh`.
- **Anything only a browser can check** (a Clerk round-trip, a Calendly embed,
  375 px layout) — name it so the deploy session screenshots it.

## Manual verification checklist on staging

- Routes 200; `/subscribe` → `/consulting`; `/testimonials` 404 (flag off).
- No `$` amounts anywhere public (check rendered text, not HTML source — RSC
  payloads contain `"$12"`-style refs).
- Every CTA that should book a call resolves to `/book` or `/consulting`, and
  the Calendly embed loads a real event.
- Free-tools email: capture → welcome email arrives (~1 s), button lands on
  `/free-tools`; a row appears via `npx convex run emailSends:listRecent '{"limit":3}'`.
- Homepage assessment answers (probe: `npx convex run agentSessions:getOrCreate …`
  then POST `/api/agent/top3/chat`).
- 375 px: no horizontal scroll on `/` and `/vsl`.

## Production (later)

Tag the verified staging sha (`git tag -a v… <sha>`), then: Namecheap `@` A →
`2.25.207.149`, `www` CNAME → `icodemybusiness.com`; remove `CNAME` and
`.github/workflows/deploy-apex.yml` in the same change; on the VPS set
`NEXT_PUBLIC_APP_URL=https://icodemybusiness.com` in `.env.build`, rebuild, and
`./deploy.sh cutover`. Watch Google Safe Browsing afterwards.
