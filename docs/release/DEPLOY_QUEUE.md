# Deploy queue

Append-only. Status flow: `pending-staging` → `staging-verified` | `blocked` → `deployed` (prod).
`scripts/deploy-staging.sh` appends a row for every attempt with the gate evidence; humans edit the
status column after verification. Never delete rows.

| When (UTC) | Sha | Subject | Gates (lint / tsc / test) | Result | By |
|---|---|---|---|---|---|
| 2026-09-02T12:16Z | ed96f01 | fix(agents): never show raw upstream errors to visitors | hand-run on VPS lane: green | staging-verified (manual rsync, pre-script) | deploy session |
