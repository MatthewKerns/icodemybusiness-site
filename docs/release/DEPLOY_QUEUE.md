# Deploy queue

Append-only. Status flow: `pending-staging` → `staging-verified` | `blocked` → `deployed` (prod).
`scripts/deploy-staging.sh` appends a row for every attempt with the gate evidence; humans edit the
status column after verification. Never delete rows.

| When (UTC) | Sha | Subject | Gates (lint / tsc / test) | Result | By |
|---|---|---|---|---|---|
| 2026-09-02T12:16Z | ed96f01 | fix(agents): never show raw upstream errors to visitors | hand-run on VPS lane: green | staging-verified (manual rsync, pre-script) | deploy session |
| 2026-09-02T14:04Z | 4a32306 | chore(process): tests are the spec — AGENTS.md hierarchy, test-guard hook, VPS gates in the deploy script, release layer | FAILED on VPS | blocked | matthewkerns@Drs-MacBook-Pro |
| 2026-09-02T14:19Z | 849da40 | fix(process): pre-push gates a clean export of the pushed commit in a per-process VPS dir | lint/tsc/test green on VPS | staging-verified (script checks) | matthewkerns@Drs-MacBook-Pro |
| 2026-09-02T14:51Z | dafc551 | Merge remote-tracking branch 'origin/main' into agent/offer/landing | lint/tsc/test green on VPS | staging-verified (script checks) | matthewkerns@Drs-MacBook-Pro |
| 2026-09-02T16:59Z | 6e4a5af | feat(landing): show the five assessment questions as the second diagram | lint/tsc/test green on VPS | staging-verified (script checks) | matthewkerns@Drs-MacBook-Pro |
| 2026-09-02T17:11Z | 5bdcdee | fix(landing): the hero diagrams were unreadable on a phone | lint/tsc/test green on VPS | staging-verified (script checks) | matthewkerns@Drs-MacBook-Pro |
| 2026-09-02T17:16Z | 71ee7aa | fix(auth): signing in never created a user record | lint/tsc/test green on VPS | deployed — sign-in leg unverified (needs a real sign-in, then `npx convex data users --limit 5`) | matthewkerns@Drs-MacBook-Pro |
