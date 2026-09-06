# Agent Development Instructions — icodemybusiness-site

## Scope

Universal rules for AI agents working on the iCodeMyBusiness marketing/lead-gen site
(Next.js 15 + Convex + Clerk, deployed as a Docker container on a Hostinger VPS). Area rules
live in nested `AGENTS.md` files (`convex/`, `src/app/api/`, `scripts/`); this file holds only
what applies everywhere. Generic engineering standards (naming, TDD, refactoring, code review)
are NOT restated here — consult `~/workspace/software-development-best-practices-guide`
(`99-reference/*.md` checklists, `04-quality-through-testing/`, `07-agentic-coding/`).

## On Startup

- Load this file (via `CLAUDE.md` → `@AGENTS.md`) — always.
- Load a local `AGENTS.md` only when entering `convex/`, `src/app/api/`, or `scripts/`.
- For Convex API details read `convex/_generated/ai/guidelines.md` once, when touching Convex.
- **Before editing any visitor-facing words, read `docs/copy-principles.md`** (outcomes not process; only Matthew asserts facts about the business; nothing promised that isn't built; no visible prices).
- Load `docs/DEPLOY.md` only when deploying; `docs/RUNBOOK.md` only when debugging prod errors;
  `docs/ROADMAP.md` when picking up work. Never bulk-load docs.

## Boundaries

### Always Do
- Work on a branch in **your own git worktree**: `git worktree add ../icmb-wt-<you> -b agent/<you>/<topic> origin/main`
  (`npm ci --ignore-scripts` there). Several sessions share this checkout; uncommitted files are not yours to move.
- Run the gates before any hand-off: `npm run lint && npx tsc --noEmit && npm test` — on the VPS via
  `~/bin/offload-run --lane node-full -- '<the three commands>'` when the laptop RAM guard is WARN/CRIT.
  The `pre-push` hook and the deploy script do this routing themselves (pre-push reads the guard's
  status; the deploy script always uses the VPS). A gate that could not run is not a passed gate.
- Hand off deploys to the **deploy session** with: `ready to deploy: <sha> / Convex: y|n / env: none|NAME=… / gates: <pasted result> / verify: <what a human must look at>`.
- Wrap API routes in `withErrorHandler`; surface agent/LLM failures with `visitorSafeAgentError`; record every transactional send with `api.emailSends.record`.
- Add analytics events to `src/lib/analytics-events.ts` first; never hardcode event names. PostHog project 206048, EU host only.
- Keep the site free of visible prices. Paid interest goes to a booked call (`/book`, `/consulting`).

### Ask First (Matthew)
- New dependencies; new/changed API routes, auth, middleware; Convex schema changes; new env vars (VPS `.env.build` or Convex env).
- **Changing what a test expects.** If a red test is wrong, say why in the commit body and get Matthew's OK; the default is that the implementation is wrong. Record the OK in the commit itself — a
  `Test-Change-Approved: <who, date>` trailer — not just in a session's conversation with him. An
  approval that lives only in one session's transcript is invisible to every other session and to
  the git history, and looks exactly like no approval was ever given (`docs/ENGINEERING_LOG.md`
  2026-09-06). `scripts/git-hooks/pre-push` refuses a push whose `*.test.*` diff removes a
  `toThrow`/`.rejects` assertion unless that trailer is present in the range being pushed.
- Any copy that makes a promise (durations, guarantees, deliverables, "coming soon"): it goes in the promises workbook.

### Never Do
- **Weaken a test to make anything pass**: delete/rename/empty a `*.test.*` file, `.skip`/`.only`/`xit`/`xdescribe`, `@ts-ignore`/`@ts-expect-error` in tests, exclude test globs from any `tsconfig*.json` or vitest config, `--typecheck disable`, `--no-verify`, `--passWithNoTests`. The `test-guard` hook blocks these; a legitimate exception needs `TEST_CHANGE_APPROVED="<reason>"` on the command, granted by Matthew per case.
- Deploy, rsync to the VPS, or run `npx convex dev/deploy` from any session but the deploy session. `git push` deploys nothing.
- Run `./deploy.sh run` on the VPS (legacy host), or rsync the working tree (ships other sessions' work).
- Treat `scripts/deploy-staging.sh` as staging-only. Since the 2026-09-05 cutover it updates the
  live apex too — same container, three hostnames. `docs/DEPLOY.md` § Production.
- `git restore`, `git checkout -- .`, `git stash`, `npm install`, `git pull --rebase` (autostash) in the shared checkout — this has wiped `node_modules` and others' edits before.
- In the shared checkout: `git commit -a`, `git commit` without `-- <paths>`, `git reset --hard`, or `git update-ref` on a branch. A plain commit takes the whole index, and moving the branch pointer leaves upstream-changed files staged with stale content — that reverted another session's copy on `main` on 2026-09-02 (`4ec89d5`, fixed `1b5ef61`). Enforced by `.claude/hooks/shared-checkout-guard.sh`; override `SHARED_CHECKOUT_APPROVED="<reason>"`. Behind `origin/main`? Do the commit in a temp worktree, not by moving pointers.
- Commit secrets. `.env*`, `deploy.sh`, `.claude/mcp.json` are never committed.
- Print a Convex env listing with real values (`npx convex env list`/`env get`, any flags). It
  prints VALUES, not just names, and did exactly that with a live `RESEND_API_KEY` on 2026-09-04.
  Use `scripts/convex-env-names.sh [--prod|--dev]` for a names-only listing; enforced by
  `.claude/hooks/convex-secret-guard.sh`.
- Commit on a branch while a push from it is in flight. The VPS-routed gate run takes minutes;
  `git push origin HEAD:main` re-resolves `HEAD` at send time, so a commit made mid-gate rides
  along ungated. Push an explicit sha instead — `git push origin <sha>:refs/heads/main` — or just
  wait. `scripts/git-hooks/pre-push` refuses the push if the ref moved after the gates finish.
- **Author a claim about the business.** Capacity, timelines, delivery standards, prices, guarantees, "every time" statements are Matthew's to assert. Nine plausible agent-invented claims reached the live homepage on 2026-09-02. If you need one and don't have it, ask or leave it out (`docs/copy-principles.md` §2).

## Chosen Tools

| Category | Tool | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router), React | standalone Docker build (`Dockerfile`) |
| Backend / data | Convex (`convex/`), deployment `neat-hamster-414` | schema in `convex/schema.ts`; push before the app |
| Auth | Clerk (dev keys until R-003) | owner gate: `OWNER_EMAIL_DOMAINS` |
| Email | Resend via `/api/email/*` and `convex/emails.ts` | from `matthew@icodemybusiness.com`; log with `emailSends.record` |
| AI | Anthropic SDK in API routes / Convex actions only | key in VPS env AND Convex env |
| Analytics / errors | PostHog 206048 (EU), Sentry | `src/lib/analytics-events.ts` taxonomy; dashboard `/project/206048/dashboard/761841`; `docs/observability.md`, `docs/RUNBOOK.md` |
| Booking | Calendly embed (`CalendlyEmbed`) | live event: `12kernsmatthew/new-meeting-1` (15 min) |
| Styling | Tailwind | gold/black brand tokens |
| Tests | vitest (+ `convex-test`) | `npm test` |
| Hosting | Hostinger VPS, Docker + Traefik | `scripts/deploy-staging.sh`; **not** Dokploy/Vercel |

## Task Management & Parallel Execution

- For >2 steps, keep a task list current. Launch independent subagents in parallel; never parallelize edits to the same file.
- Coordinate with peer sessions before touching a file another session owns (homepage letter: `offer`; discovery assessment: `discovery-assessment-intake-flow`; deploys: `deploy`).

## Git Workflow

```
agent/<you>/<topic> (own worktree) → main (after gates) → staging via scripts/deploy-staging.sh <sha> → prod (cutover, later)
```
- Integrate to `main` by fast-forward or PR only after the gates are green; push; then hand off the sha.
- Commit trailer: `Co-Authored-By: Claude … <noreply@anthropic.com>` plus the session link.
- The deploy session deploys exactly one commit that is on `origin/main` from a clean `git archive` — see `docs/DEPLOY.md` and `docs/RELEASE_PIPELINE.md`.

## Permission Profiles

Hooks always active in this repo: `.claude/hooks/test-guard.sh` (blocks test weakening) and the global
`security-check.sh` / `secret-guard.sh` (catastrophic ops, secrets). Direct edits on `main` in the shared
checkout are tolerated until every session is on a worktree; then `PROTECTED_BRANCHES=("main")` is enabled.

## Testing Protocol (Before Human Handoff)

1. `npm run lint` · 2. `npx tsc --noEmit` (tests included — a type error in a test is a failing test) · 3. `npm test`
4. Verify what you can on `staging.icodemybusiness.com`; 5. list exactly what needs a human (browser auth round-trips, real bookings, inbox checks).

## Documentation Areas

| Area | AGENTS.md focus |
|---|---|
| `convex/` | schema/function rules, Convex-before-app ordering, Convex env, `convex-test` |
| `src/app/api/` | error handling, visitor-safe messages, email logging, secrets |
| `scripts/` | deploy ownership and the deploy script contract |

## Skills Index

Skills live in `~/.claude/skills/` (global) and the guide. Relevant: `new-worktree`, `pr-retrospective`,
`release-verify-local` / `release-stage-verify` / `release-queue` / `release-deploy-prod` (project layer: `docs/RELEASE_PIPELINE.md`),
`initiate-team-review`, `deploy-database` (ask-first).

## Communication

- Show the command and its output, not a description of it. Evidence or it didn't happen.
- Surface blockers immediately; report what a human still has to verify.

## Meta

Maintained by the deploy session. **How this file changes:** every process incident produces (1) a line in Boundaries,
(2) an enforcement — hook, script, or check, (3) a dated entry in `docs/ENGINEERING_LOG.md`. Every feature hand-off ends
with "AGENTS.md / DEPLOY.md updated if architecture or process changed". After each merged batch, run the guide's
`pr-retrospective`. Generated 2026-09-02 from the guide's `07-agentic-coding/AGENTS.template.md`.
