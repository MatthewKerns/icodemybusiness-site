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
