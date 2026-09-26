# Per-PR preview lane — spec (T8)

Spec only; nothing here is built or applied. icmb-dev-2, 2026-09-26, at `origin/main` `dc213cf`.
**V** verified (read/ran it) · **R** reported (Convex docs via fetch) · **I** inferred, not measured.

## Starting facts

- **V** `staging.`, apex and `www` are one container; every `deploy-staging.sh` run is a prod deploy (`docs/DEPLOY.md`). It reads `CONVEX_DEPLOYMENT` from `.env.local` and pushes there (`deploy-staging.sh:154`).
- **V** `staging.` now 404s because a byte-identical second host got the domain flagged by Comcast/Cox scanners (`docs/staging-route-patch.md`). A public preview host repeats that risk, so previews must be gated.
- **V** Actions can't start: "account is locked due to a billing issue" (`gh run view 36245461915`). The repo is public, so PR comments are public.
- **V** DNS is at Namecheap (`dig NS` → `registrar-servers.com`); no wildcard exists (`dig pr-1.preview…` empty).

## (a) Options for a per-PR URL

Baseline **V** (`ramstat`, 13:2xZ): VPS 32 GB, 1.5 GB used. RAM is not the constraint; disk is: 387 G hit 0 free on 09-06, 15 GB after a prune, current free unmeasured (D12, `ENGINEERING_LOG.md`).

| | Shape | RAM each | Disk each | Fit |
|---|---|---|---|---|
| **A** | Container `icmb-pr-<n>` behind Traefik at `pr-<n>.preview.icodemybusiness.com` | ~0.3 GB running; 2–4 GB peak during `next build`, one at a time **I** | image ~0.4 GB + build-cache layers ~0.5–1.5 GB **I** (the 09-06 prune reclaimed 14.4 GB of cache box-wide **V**) | Stable link per PR. Needs cap + teardown. |
| **B** | One rotating `preview` slot | as one A | flat | Cheapest, but the link stops meaning "this PR" when a second PR opens. |
| **C** | Local `npm run dev` against a preview Convex | 0 on VPS | 0 | Laptop is CRIT (24 GB swap **V**); steps, not a link. Use as the PR's fallback. |

`NEXT_PUBLIC_*` is baked at build (`Dockerfile:16-40` **V**), so every preview needs its own image build.

**Gating (required):** Traefik `basicauth` + `X-Robots-Tag: noindex` on each preview router **I**. Router/service names `icmb-pr-<n>`; never touch `icmb`, `icmb-apex`, `services.icmb` (deleting it took the apex down 09-05, `staging-route-patch.md` **V**). TLS: per-host Let's Encrypt via the existing `letsencrypt` resolver **V**; avoid a wildcard cert (needs DNS-01 at Namecheap **I**). LE's weekly per-domain limit is shared with `mango.` and `ideabrandcoach.` hosts **I**.

## (b) A Convex backend that can't write to `neat-hamster-414`

**Use Convex preview deployments**, one per PR. **R** (docs.convex.dev, preview-deployments): all plans; `CONVEX_DEPLOY_KEY` = a preview deploy key, then `npx convex deploy --preview-name pr-<n>`; own data and env; expire after 5 days (Free/Starter); each counts toward the team's deployment limit (number not stated). Seeding needs `--preview-run <fn>`, a new `convex/` function (Ask First). Rejected: a shared second dev deployment (PRs collide) and a self-hosted `convex-backend` container (another service on the shared box **I**).

**Isolation, in layers:**
1. Different credential: the script never reads `.env.local`, unsets `CONVEX_DEPLOYMENT`, uses only a preview key. That a preview key can't target 014 is **I**; confirm in the dashboard before first use. It is the load-bearing assumption.
2. Pre-build assert: target matches `^pr-[0-9]+$` and the resolved Convex URL doesn't contain `neat-hamster-414`; else abort.
3. Build args come from a new `.env.preview` on the VPS, never `.env.build` (prod **V**).
4. Side-effect keys left unset so features fail closed: without `RESEND_API_KEY` mail is skipped and logged (`convex/email.ts:13-15`, `emails.ts:54-57` **V**).
5. Canary after the first preview: write a row there, confirm 014's count is unchanged (read-only).

**Env names** (from `grep process.env convex/`, not a listing of any deployment; `scripts/convex-env-names.sh` takes only `--prod|--dev` **V**, so previews need a deploy-owned extension):
- *Set:* `CLERK_JWT_ISSUER_DOMAIN` (Clerk **dev** instance, with its `convex` JWT template, `DEPLOY.md` **V**), `OWNER_EMAIL_DOMAINS` (or `OWNER_EMAILS`/`OWNER_CLERK_USER_IDS`), `NEXT_PUBLIC_APP_URL` (preview host), `CALENDLY_URL`.
- *Unset on purpose:* `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`, `MANGO_MCP_URL`, `MANGO_MCP_TOKEN`, `MANGO_OVERHEAD_KEY`, `RETELL_API_KEY`, the Skool Drive set (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `SKOOL_WORKSHEETS_FOLDER_ID`; from `convex/AGENTS.md`, absent from my grep).
- *Spend-gated, optional:* `ANTHROPIC_API_KEY` (separate capped key; unset → chat fails visibly).
- Check `convex/crons.ts` uses only unset keys before first deploy **I**.

**App build args:** preview Convex URL; Clerk `pk_test`; `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, Retell, Stripe **empty** (no preview traffic into PostHog 629815).

## (c) Trigger, no Actions

The **deploy session** runs it (it owns `scripts/deploy*`, `scripts/AGENTS.md` **V**), on a hand-off `preview: <pr#> <sha>`; each new push needs a new request. A VPS poller would need a GitHub token on the VPS (new secret): not v1.

`scripts/deploy-preview.sh <pr#>` (new, mirrors `deploy-staging.sh`): (1) `gh pr view --json headRefOid`, `git archive` that sha; (2) gates on the VPS via `offload-run --lane node-full`, no skip; (3) `convex deploy --preview-name`; (4) build `icmb-preview-pr-<n>:<sha7>`, `docker run` with the gated labels; (5) smoke the 8 routes through basic auth, zero visible `$` on `/`; (6) `gh pr comment` with URL, sha, expiry, never credentials (public repo; Matthew shares them out of band); (7) ClickUp: the PR template has a `ClickUp:` field (open PR #2 **V**); the deploy session posts the URL with `clickup_create_task_comment`, since a shell script can't call the connector.

**Serialization:** `deploy-staging.sh:143` refuses while any `docker build` runs or `.deploy.lock` exists **V**, so previews and prod deploys block each other. Accept it; use a separate `.preview.lock`, yield to `.deploy.lock`, never write `DEPLOYED_SHA`, `DEPLOY_LOG` or `DEPLOY_QUEUE.md`.

## (d) Teardown and cap

- `deploy-preview.sh teardown <pr#>`: remove the container, that PR's images, any live Convex preview. It never runs `docker builder prune` (capped prune is D12, deploy's call).
- No merge/close signal without Actions, so `sweep` runs at the start of each deploy-session pass: tear down any `icmb-pr-*` whose PR isn't `OPEN` or is older than 5 days (Convex expiry **R**).
- **Cap 2 live previews** (proposed, disk-driven **I**). Refuse a third; refuse any when free disk < 20 GB (my number; 15 GB was the post-prune free space) or VPS RAM > 70 % (RAM guard WARN **V**).

## (e) Human gates (this doc passes none)

| Gate | What | Who |
|---|---|---|
| DNS | one wildcard `*.preview` A → `2.25.207.149` at Namecheap, scoped to `preview`, not the apex | Matthew |
| Config/env | Convex preview deploy key + preview env; Clerk dev JWT template + allowed origins; `.env.preview` and the basic-auth credential on the VPS | Matthew |
| Spend | Convex deployment limit beyond Free/Starter (unknown **R**); capped Anthropic key; more disk if D12 says so | Matthew |
| Script ownership | `deploy-preview.sh`, Traefik labels, `convex-env-names.sh` extension, `DEPLOY.md`/`AGENTS.md` updates | deploy session |
| Convex code | `--preview-run` seed function | Matthew |
| Merge | this spec PR | Matthew |

## (f) Recommendation

**Option A, cap 2, basic auth + noindex, Convex preview deployments, run on request by the deploy session.** RAM is ample, so the costs are disk (D12) and operator attention; the cap and sweep address both. B is not chosen because its link goes stale when a second PR opens, but the same script at cap 1 behaves like B, so it isn't a fork.

Order: (1) Matthew decides D12 (capped prune + disk alert), since this adds disk load; (2) DNS, preview key, `.env.preview` gates; (3) deploy session builds the script and runs one preview by hand with canary (b.5); (4) then the PR template's "Test it" line points at previews.

A preview can't prove: Clerk sign-in round trip, real bookings, email (off by design), voice. Those stay "needs a human".

**Measurements to take** (read-only, deploy session; I didn't touch the VPS): `df -h /`, `docker system df`, `docker images` sizes for this project, `docker stats --no-stream icodemybusiness-site`, one timed build with peak RSS. They replace every **I** number in (a).
