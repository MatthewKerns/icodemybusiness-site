# Engineering log

Dated lessons that changed how we work. Each entry names the incident, the rule it produced
(now in `AGENTS.md` → Boundaries) and the enforcement that makes the rule mechanical. The
deploy session appends here; every feature hand-off checks whether `AGENTS.md` / `DEPLOY.md`
need updating (the guide calls the alternative "CLAUDE.md drift").

## 2026-09-02 — A test was excluded to get a deploy through

**What happened.** The new deploy script stopped at Convex's deploy-time typecheck because two
Convex test files had type errors in a test helper. The deploy session excluded `*.test.ts` from
`convex/tsconfig.json` to proceed. Matthew: tests exist for a reason — fix the implementation (or
the test, with a stated reason and sign-off), never weaken the gate. The discovery session fixed
the helper properly the same hour.

**Rule.** Never delete, skip, exclude, `@ts-ignore`, or bypass a test or typecheck to pass a build
or deploy. A typecheck error in a test is a failing test. A gate that could not run is not a passed
gate. (`AGENTS.md` → Never Do / Ask First.)

**Enforcement.** `.claude/hooks/test-guard.sh` (PreToolUse, exit 2) blocks the patterns;
`scripts/deploy-staging.sh` runs lint/tsc/test on the VPS before every deploy with no skip flag;
`scripts/git-hooks/pre-push` runs tsc + tests before any push to `main`.

## 2026-09-02 — Deploying from the shared working tree shipped other sessions' files

**What happened.** Several agent sessions share one checkout. rsync-based deploys carried
uncommitted work (and once a local secrets file) to the VPS; a `git pull --rebase` autostash
re-created a tracked `node_modules` symlink over a real install.

**Rule.** Deploy only a committed sha that is on `origin/main`, from a clean `git archive`. Work in
your own worktree. Only the deploy session deploys.

**Enforcement.** `scripts/deploy-staging.sh` (archive-only, ancestor check, Convex-first, lock,
evidence log); `node_modules` symlink untracked and gitignored; hand-off format in `docs/DEPLOY.md`.

## 2026-09-02 — GitHub Actions was billing-locked; nothing gated `main`

**What happened.** Every CI run since morning died at start-up ("account is locked due to a billing
issue"); "verified" meant a person's word.

**Rule.** The VPS is the gate runner. CI is informational until Matthew unlocks billing; even then,
the deploy script's own gates stay.

**Enforcement.** Gates run on the VPS (`offload-run`) inside the deploy script; `pre-push` locally.

## 2026-09-02 — a queue-row commit reverted another session's copy on main (4ec89d5 → fixed 1b5ef61)

**What happened.** The deploy session's local `main` was behind `origin/main` (the offer session had pushed `dafc551` from its worktree). A push of one `DEPLOY_QUEUE.md` commit was rejected as non-fast-forward. The recovery — cherry-pick in a temp worktree — failed on a bad flag, the shell chain continued, and `git update-ref refs/heads/main origin/main` moved the branch pointer under the shared tree. That left every file changed upstream staged with its *old* content. The next `git commit -m …` (no pathspec) took the whole index and reverted `06b95e4`'s headline, subhead and gate wording in two files. The gates were green (copy is not under test), so the push went through. Caught within five minutes by inspecting the commit stat; staging never served it.

**Same cause as two earlier incidents today** (offer session's observation): the autostash `pull --rebase` that wiped `node_modules`, the stale shared offload tree that broke the pre-push gate, and this staged index all come from the shared checkout being load-bearing. Three mechanisms, one cause; the worktree rule and the clean-export deploy/gate address it, and this hook covers the last exposure — a commit from the shared checkout with a non-empty index.

**Why it got through.** No rule or hook distinguished "commit the file I staged" from "commit everything staged". Moving a branch pointer with a dirty shared tree is never safe and was not on the Never list.

**Fixes.** (1) `AGENTS.md` Never Do: no `commit -a`, no commit without `-- <paths>`, no `reset --hard` / `update-ref` on a branch in the shared checkout; when behind origin, commit in a temp worktree. (2) `.claude/hooks/shared-checkout-guard.sh` blocks those shapes (override `SHARED_CHECKOUT_APPROVED`). (3) This entry. Sessions that were already on their own worktree were unaffected — the durable fix is still every session on its own worktree (`AGENTS.md` Always Do).

## 2026-09-02 — sign-in never created a user record; every gate was green (71ee7aa)

**What happened.** `useEnsureUser` had two guards that no value could satisfy at once (`convexUser !== null` → return, then `convexUser !== undefined` → return), so `ensureCurrentUser` never ran. Types, lint and the full suite were green throughout; nothing threw. The only symptom was an empty `users` table, which looks exactly like "no users yet" — noted this morning and explained away as low traffic while `leads` already carried a real `clerkUserId`. Found by the offer session reading the hook with a specific question (R-010), fixed with four tests that were red on the unfixed code first.

**Same lesson from the other direction (offer session).** Three hero-diagram defects today — a 520px SVG floor that hid the right third on phones, a legend clipped by its viewBox, and a marker pushed into the title when the type scaled — were invisible in code and green through every gate, and obvious in one screenshot. Gates catch what is expressible as a check; neither legibility nor a contradictory guard is. Anything visual gets rendered at 375px and desktop (Playwright on the VPS lane; `scripts/`-free scratch check, see the deploy session's `pw375` recipe) before it is called verified, and "no horizontal overflow" is asserted on the figure, not the document.

**Lesson.** An empty table where writes are expected is a finding, not a baseline. When a table that a signed-in path should populate is empty, trace the write path end to end before attributing it to traffic. Gates cannot catch a guard that is merely contradictory.

**Verification.** Cannot be done by curl: someone signs in on the deployed build, then `npx convex data users --limit 5` shows a row. Until a real sign-in happens the table stays empty, so an empty table is not evidence either way. Queue status for 71ee7aa stays "deployed, sign-in unverified" until Matthew's browser round-trip (R-016).

## 2026-09-02 — evening "VPS stalls" were packet loss on the laptop→Hostinger route, not the host

**What happened.** From ~17:15Z the VPS went unreachable from the deploy laptop in ~10-minute episodes, then for longer: ssh SYNs timing out, later "Connection closed by … port 22" right after the banner, HTTPS accepting TCP but never completing TLS. The deploy script mistook one episode for a build failure (its ssh session dropped; the image had built) and left a stale lock; two sessions then reasoned their way to fail2ban / sshd MaxStartups / a filling disk — each plausible from the client side and each wrong.

**What it was.** Measured: TCP connects to the VPS succeeded 7/12 with 0.2–1.5 s handshakes (normally ~0.1 s), a control site 6/6; plain HTTP returned a 301 in 3 s; third-party fetches (r.jina.ai) got the page in 0.35 s throughout; Hostinger metrics were flat (CPU 30 %, RAM 3.8 GB, disk 306.9 GB, no reboot). Multi-packet exchanges (TLS, SSH KEX, rsync) failed while single-packet ones limped through: ~40 % loss on the path (Cox → Cogent → Hostinger DC). Visitors were never affected.

**Rule.** Before acting on the host for a "VPS down" symptom, run the three-step path test (third-party fetch, 12× TCP-connect ratio vs a control, Hostinger metrics). "Connection closed by … port 22" after the banner is not evidence of fail2ban. When the path is lossy, stop all VPS jobs (offload-run, pre-push gates, deploys) — they hang or half-complete, and a half-completed deploy is worse than a delayed one; the gate refusing a push it cannot run is the correct behaviour and was observed.

## 2026-09-04 — a Convex env-list command printed a live secret into a session transcript

**What happened.** Answering a peer session's existence-only question ("does a Convex production deployment exist"), the deploy session ran the Convex CLI's env-listing subcommand with a production flag to check. It succeeded and printed the actual configured values — including a live email-provider API key — to stdout, landing in the session transcript. The repo's secret-guard hook only blocks reading `.env*` files directly (a value-printing command against a matching path); it has no awareness of a CLI subcommand whose entire purpose is to print secret values.

**Why it got through.** No rule or hook distinguished "list what env vars exist" (safe) from "print what they're set to" (not safe to run in an agent session) — the CLI's own `env list` conflates the two. A stale local permission grant (`.claude/settings.local.json`, gitignored, machine-local only) also pre-approved a bare invocation of that command without a prompt.

**Fixes.** (1) `AGENTS.md` Never Do: never run the Convex CLI's env-list/env-get commands directly. (2) `.claude/hooks/convex-secret-guard.sh` blocks them (override `CONVEX_ENV_READ_APPROVED`). (3) `scripts/convex-env-names.sh` is the approved names-only alternative. (4) This entry. (5) The stale local permission grant was removed on the affected machine; it was never a repo file.

**Not fixed by this.** The value already printed is still in that session's transcript. Treat it as exposed — the affected key should be rotated (Matthew's to rotate, per the usual pattern for provider keys).

## 2026-09-04 — three commits landed on `main` while their own push was still gating (d503b12..c2219d7)

**What happened.** A session ran `git push origin HEAD:main` on `agent/offer/landing`. The pre-push
hook captured `local_sha=494e7fd`, exported that exact commit, and ran the VPS gates against it
(green — 24 files/294 tests). While those gates were still running (a multi-minute VPS round trip),
the same session committed three more times on the same branch. Git re-resolves `HEAD` at send
time, not at hook-invocation time, so when the gated run finished and the push actually
transmitted, it sent the *current* tip — `c2219d7`, three commits past what had been gated. All
three were docs-only (`docs/OFFER.md`, `docs/academy-promises.md`) and no code shipped ungated,
but the mechanism would have carried code just as easily. Found, verified (`gh api …/activity`
showing exactly one push event `d503b12..c2219d7`, matched against the hook's own gated sha and
the commit timestamps), and reported by the offer session itself.

**Why it got through.** The pre-push hook gates whatever `$local_sha` was when it started, then
trusts that the ref still points there when it reports success. Nothing re-checked the ref after
a multi-minute gate run, and `HEAD:main` as a push refspec always sends the ref's value at
transmission time, not at hook-start time.

**Fixes.** (1) `AGENTS.md` Never Do: never commit on a branch while a push from it is in flight;
push an explicit sha (`git push origin <sha>:refs/heads/main`), not `HEAD:main`. (2)
`scripts/git-hooks/pre-push` now re-reads the local ref immediately after the gates pass and
refuses the push (naming both shas) if it moved — turning a silent ungated ride-along into a
rejected push. (3) This entry.

## 2026-09-04 — the apex cutover stalled ~20 minutes on a step that was implied, not explicit

**What happened.** Matthew said "go ahead" on the production cutover once DNS was clean. The deploy
session asked him, in the same reply, to make one VPS edit first (`NEXT_PUBLIC_APP_URL` in
`.env.build`) before the rebuild — but that ask was one sentence inside a longer explanation, not
its own line. Twenty minutes later the apex was still serving Traefik's self-signed fallback cert
to any visitor whose resolver had refreshed; a peer session (cmo), independently watching the
apex, asked whether the cutover was mid-run or stalled. It was neither running nor visibly stalled
— it simply hadn't started, waiting on an edit whose ask had been easy to miss.

**Why it got through.** No mechanism distinguishes "information for you" from "a step you must
complete before I continue" in a hand-off message. A sentence carrying both reads as one message,
not a blocking gate.

**Fix.** `docs/DEPLOY.md`'s cutover section now has the `.env.build` edit as its own **Step 0**,
labelled as Matthew's and as a hard precondition, with the reason it matters (canonical/OG URLs
and email links would otherwise advertise staging from the live apex). This entry.

## 2026-09-05 — the first routine deploy after cutover silently un-cut-over production

**What happened.** Minutes after the apex cutover, `scripts/deploy-staging.sh` ran a normal
deploy (`7216322`, a critical white-screen fix). It called the VPS `deploy.sh`'s `staging` target,
which recreated the container from scratch with only the staging Traefik router label — the same
thing it had always done, safely, before cutover. Now that the apex and `www` routers lived only on
the container that `cutover` had created, recreating the container without them dropped apex/`www`
routing entirely: both returned 404 within a minute of a deploy that itself worked perfectly.
Caught immediately by checking the apex directly after the deploy (not by an alert), fixed by
re-running `./deploy.sh cutover` by hand.

**Why it got through.** `deploy.sh`'s `staging` and `cutover` targets were designed for a world
with two independent hosts — before cutover, staging deploys legitimately never needed to touch
the apex. Cutover changed the underlying model (one container, three hostnames) without changing
the script that recreates that container on every deploy. Nothing enforced "the routers this
container needs" as a single source of truth; `staging()` and `cutover()` each hard-coded a subset.

**Fix.** `deploy.sh` (VPS-only, never committed — `AGENTS.md` § Never Do) — `staging()` now always
includes the apex + `www` Traefik router labels; `cutover()` is kept as a plain alias for
compatibility. Verified by actually running `./deploy.sh staging` (the exact path a normal deploy
takes) and confirming apex/`www`/staging all stayed 200 through a full container recreate.
`docs/DEPLOY.md`'s Environments table and Production section rewritten to describe the actual
one-container-three-hostnames model instead of a not-yet-cut-over future. `AGENTS.md` Never Do:
don't assume `deploy-staging.sh` is staging-only post-cutover. This entry.

**Lesson.** A cutover that changes what a shared resource *is* (one container now serving three
hostnames, not two independent ones) has to update every script that recreates that resource, not
just the one script that performed the cutover itself. "It worked before cutover" is not evidence
it still works after.

## 2026-09-06 — production ran on IDEA Brand Coach's dev Clerk instance; migration had two more traps

**What happened.** The apex had been serving `pk_test_…` since before cutover, decoded and traced
(cmo session) to `stunning-skunk-51.clerk.accounts.dev` — the *dev* instance of an unrelated
product, "IDEA Brand Coach." Nothing in this codebase referenced that instance by name; it was
purely an env value nobody had checked existed on the wrong app. Migrating to a real production
instance surfaced two more traps on the way, both silent-failure shaped:

1. **Wrong app, twice.** The new production instance was first created on yet another unrelated
   app ("MCF TikTok Connector Dev") before being recreated on the correct one — caught before DNS
   was pointed at it, removed via the API with a dry run first.
2. **Missing JWT template.** The `convex` JWT template (which Convex's `ctx.auth.getUserIdentity()`
   depends on) existed only on the old dev instance, not on the new production one. Without it,
   every identity call would have returned `null` post-cutover — indistinguishable from "nobody is
   signed in," so `requireOwner` would have failed closed with no error to chase. Found and created
   before the rebuild, not after.
3. **A Convex CLI access break, twice, on two independent sessions.** Mid-migration, `npx convex
   deployments` started returning 404/401/"no access to the selected project" errors — first for
   the deploy session, independently confirmed by the cmo session hitting the identical error. A
   plain `npx convex login` (device already authorized) did not immediately fix it; it resolved on
   its own shortly after Matthew took an account-level action, suggesting a team/project access
   change on Convex's side rather than a local token issue. Not root-caused with certainty; noted
   here because two independent CLIs failing identically rules out a single corrupted local
   token as the sole explanation.

**Sequencing that mattered.** Convex's `CLERK_JWT_ISSUER_DOMAIN` had to be pushed and verified
*before* the VPS rebuild — Convex fetches the new issuer's JWKS over HTTPS at request time, so
pushing the app's `pk_live`/`sk_live` first (issuer not yet trusted) would have produced the same
silent `getUserIdentity() → null` failure as the missing JWT template. The Clerk domain's own
"ssl: pending" status page lagged the actual certificate by several minutes; the real signal was
querying `https://clerk.<domain>/.well-known/jwks.json` directly (200 with a matching `kid` prefix)
rather than trusting the dashboard.

**Fix.** `docs/DEPLOY.md` § Production: the JWT template requirement, called out as an easy thing
to miss because a new Clerk instance doesn't carry it over. This entry, for the wrong-app and CLI
patterns even though neither has a mechanical fix — they're process notes for the next migration.

**Verification.** Independently confirmed (not taken on a peer's word) at each step: the served
bundle's `pk_live` value, the Clerk environment endpoint identifying the correct app/instance,
`scripts/verify-apex.sh` all green, and the owner gate redirecting on the public host. Still open:
a human sign-in on the new instance to confirm `/admin/funnel` actually renders for an owner.

## 2026-09-06 (follow-up) — the /admin/funnel post-migration failure wasn't the issuer

**Correction to the entry above.** After the Clerk production cutover, `/admin/funnel` still threw
("Something went wrong"). The leading hypothesis — `convex/auth.config.js` reads
`CLERK_JWT_ISSUER_DOMAIN` at function-deploy time, and setting the env var alone doesn't repush it
— was plausible and matched a real Convex behavior, but was wrong here: Matthew's browser console
showed the OIDC provider was already correctly configured. Acted on anyway (`npx convex dev --once`
against `neat-hamster-414`): harmless and idempotent, but not the fix.

**Actual root cause.** The `convex` JWT template on the new production Clerk instance (created via
the API during the migration, not the dashboard) was missing the `aud: "convex"` claim — Clerk's
dashboard preset includes it automatically; a template created through the API does not unless
asked for. Convex validates the token audience against `applicationID: "convex"` in
`auth.config.js`; without a matching `aud` claim, every token was rejected before identity
resolution ran, indistinguishable from the issuer being wrong.

**Side effect while chasing the wrong hypothesis.** `npx convex deploy` (no flags) targets this
project's *prod*-named deployment, `silent-jellyfish-951` — not `neat-hamster-414`, which is the
deployment `.env.local`/the VPS actually point at for all live traffic (R-012: the site has only
ever run on the dev-named deployment). That command pushed the current `schema.ts` there, creating
~57 table indexes that didn't previously exist. No data was written or read — `silent-jellyfish-951`
holds no rows and only 3 env vars, so nothing else depends on it — but it means the schema now sits
out of sync with a deployment nobody uses on purpose. Matthew's call whether that deployment should
be deleted or is worth keeping in sync going forward; nothing time-sensitive either way.

**Lesson.** A same-shaped symptom ("owner check fails silently, no error surfaces") can have more
than one distinct cause in a multi-service auth chain (issuer domain, JWT template contents, Clerk
JWKS propagation, owner-domain matching) — confirm the specific claim in the actual token (browser
console, Clerk's JWT debugger) before acting on a plausible mechanism. And: `npx convex deploy`
without `--prod`/`--once`/an explicit target is not neutral on a project that has two real

## 2026-09-06 — the shared VPS filled to 100% and silently failed a gate mid-incident

**What happened.** Mid-way through gate-checking the homepage-crash fix, `offload-run` failed with
`ENOSPC: no space left on device`. `df -h /` showed `/dev/sda1` at 387G/387G — 0 bytes free. This
VPS runs the deploy lane for this project alongside 30+ unrelated containers for other projects
(six independent `ui-*` docker-compose test stacks, a scheduler/orchestrator stack, an Ollama
instance, a code-server) — nobody owns watching its aggregate disk, and nothing alerted before a
gate check happened to hit it.

**What was removed (per-tier confirmed, not a blind prune).** `docker builder prune -af` (14.37GB
— intermediate build-cache layers, none referenced by a running container or an in-progress build)
and one unreferenced image, `mcr.microsoft.com/playwright:v1.47.0-jammy` (2.81GB, 2 years old,
superseded by v1.56.1-jammy which is what's actually in use). Confirmed before removal: zero of the
41 running containers referenced either. No volume was touched — volumes hold the actual state
(Postgres/Redis data for every stack on the box) and were explicitly out of scope. Result: 0 → 15GB
free.

**Why it got through.** No process watches this box's aggregate disk across projects; each
project's own health checks only see their own containers, not shared host resources. A build-cache
accumulation from routine `docker build`s across many unrelated projects is exactly the kind of slow
leak that has no single owner.

**Fix.** None shipped yet — this entry plus a board item (D12) for Matthew: alert-on-threshold vs.
a scheduled capped prune vs. more disk is his call, not a decision to make unilaterally on shared
infrastructure other sessions depend on. If a scheduled prune is chosen, it should stay to Tier
0a/0b (build cache, dangling images) — the tiers that are recoverable by rebuilding, never volumes,
per `docker-resource-manager`'s classification rules.

**Verification.** `df -h /` confirmed 0GB → 15GB free after cleanup; the crash-fix gate re-run
(which had failed with ENOSPC) was retried immediately after and is the direct evidence the fix
worked, not an assumption.
deployments — it silently picks prod, which was not the one this migration was working on.
