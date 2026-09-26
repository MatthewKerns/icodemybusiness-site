---
name: funnel-analysis
description: >
  Assemble the state of the iCodeMyBusiness funnel — pre-landing channels,
  leads, landing pages, funnel steps, email sends and engagement, outbound
  follow-up, bookings, and the current constraint — into one snapshot; then
  republish the shareable funnel artifact, update the standing ClickUp
  "Funnel state" task, and hand back a claims table. Use when the user says
  "run the funnel analysis", "funnel state", "how's the funnel", "update the
  funnel artifact", or as step 3 (Funnel) of the Friday review runbook. Every
  number is {source, command, result} or "not run" with the reason — never a
  guess. Reads only; the two ClickUp writes and the artifact republish are the
  only side effects.
allowed-tools: [Read, Bash, Grep, Glob, Write, AskUserQuestion]
---

# Funnel analysis

Produce the funnel numbers the Friday review needs
(`mango docs/agency/icmb-weekly-cadence.md` step 3), with a source per number.
Read `docs/marketing/funnel/README.md` first — it holds the IDs, the sources
table, the snapshot schema and what "not run" means. Mango is the system of
record; ClickUp and the artifact are projections of this run.

Owner identity for owner-gated Convex reads (deployment `neat-hamster-414`,
run from the repo root — a data read, never `npx convex dev`/`deploy`):

```bash
ID='{"subject":"cli-funnel","tokenIdentifier":"cli|funnel","email":"matthew@icodemybusiness.com","emailVerified":true}'
```

Windows: report **7 days** (the weekly cadence) and **30 days**. Times in PT.

## Workflow

### 0. Preflight — bind every source before reading a number

Record the result of each check in the snapshot's `sources` block. A source
that fails here makes every row that depends on it **not run**, with the
failure quoted verbatim.

| Source | Check | Fails when |
|---|---|---|
| PostHog | `exec: call project-get {}` | `id` ≠ the project in `docs/observability.md` (629815), or `ingested_event` is false, or the connector is down |
| Convex | `npx convex run funnelConstraint:adminFunnelConstraint '{"windowDays":7}' --identity "$ID"` returns JSON | any error (`Unauthorized` = identity problem, not data) |
| ClickUp | folder `ICMB Funnel` 901413789766 reachable; list `00 Weekly Cadence` 901421549191 and list `50 Leads` found by name | either list missing |
| Windsor.ai | `get_connectors` → per slug in `docs/marketing/channels/README.md`: connected / not | auth failure → recorded once, every channel = not run |
| Apollo.io | `apollo_users_api_profile` with `include_credit_usage: true` | connector down |
| Drive | folder `ICMB Funnel OS` 1cbKS64jNfjQsbyLZnrzZjB4n_xh8XgjA reachable | not reachable (only step 9's review-task lookup needs it) |

Never query PostHog with an event name you have not confirmed via
`call read-data-schema {"query":{"kind":"events"}}` this run.

### 1. Channels (pre-landing)

For each channel in `docs/marketing/channels/README.md`: if its Windsor slug is
connected, `get_fields` then `get_data` for the fields listed in that
channel's `PLAN.md`, 7d and 30d. Otherwise the row is
`not run: Windsor <slug> not connected — see docs/marketing/channels/<channel>/PLAN.md`.
GA4 is not a source (the site carries no tag); say so in one line, do not
probe it. Never connect, upgrade or buy anything in Windsor (Matthew,
2026-09-26: no Windsor spend yet).

### 2. Leads

- ClickUp `clickup_filter_tasks` on list `50 Leads`: created in the window, by
  status (stage), by `src:` tag (`src:site | src:clay | src:referral |
  src:apollo`) and `offer:` tag. If the list still has only "to do" (statuses
  not added yet), report the flat count and say `stages: not configured`.
- Convex `npx convex run leads:adminCounts '{"windowDays":7}' --identity "$ID"`
  (and 30). Until that query ships (PR-B): `not run: leads.adminCounts not deployed`.
- Apollo `apollo_contacts_search` `{"per_page":1,"sort_by_field":"contact_created_at"}`
  → total contacts and newest `created_at`; label it
  `Apollo (outbound source; not the record)`. Never call search/enrich tools
  that spend credits — that is `icmb-prospect`'s job.

A mismatch between ClickUp and Convex is a reported gap, not something to
reconcile.

### 3. Landing pages and funnel steps

- PostHog: `query-web-overview` (visitors, sessions, bounce) and
  `query-web-stats` (top pages, UTM sources, referrers), 7d, filtering
  `utm_source = t9-test` out.
- Convex: `npx convex run funnelConstraint:adminFunnelConstraint '{"windowDays":7}' --identity "$ID"`
  and `{"windowDays":30}` → `steps[]`, `transitions[]`, `constraint`. This is
  the only source for step counts; never re-derive them from raw events.
- PostHog funnel insight (dashboard "Funnel constraint (reality)" in 629815,
  once rebuilt): read the same 7-step numbers. If it disagrees with Convex,
  report both and say which window and host filter each used.

### 4. Email — three lanes, reported separately

- **Site transactional (Resend):** `npx convex run emailSends:adminCounts '{"windowDays":7}' --identity "$ID"`.
  Until PR-B ships: `npx convex run emailSends:listRecent '{"limit":100}' --identity "$ID"`
  and count by `template` and `status` inside the window.
  Engagement: `npx convex run emailEvents:adminCounts '{"windowDays":7}' --identity "$ID"`
  or `not run: emailEvents not deployed (PR-B)`.
- **Outbound follow-up (Apollo sequences — the owner of follow-up, D-email
  2026-09-26):** `apollo_emailer_campaigns_search {"per_page":25}` → per
  sequence: active contacts, delivered, opened, replied, bounced; then
  `apollo_emailer_campaigns_activity_feed` for the window. With no sequences:
  `not run: no Apollo sequences yet`.
- **Custom nurture engine:** always
  `not run: parked — Apollo owns follow-up (D-email 2026-09-26); code on agent/nurture/email-sequence`.

### 5. Booking

`consultation_booked` is PostHog-only (fired client-side by `CalendlyEmbed`;
`measured: false` in `convex/funnelConstraint.ts`). Confirm the event exists in
the schema, then `query-trends` for 7d and 30d. Always attach the caveat
`client-side only, no server record`. If PostHog failed preflight: not run.

### 6. Constraint

Copy `constraint` from the step-3 Convex result verbatim (`kind`, `title`,
`why[]`, `nextAction`). Do not recompute it, do not apply the floors yourself
(`convex/lib/funnelConstraint.ts` owns them: 50 arrivals / 20 entrants).

### 7. Snapshot and claims table

Write `<scratchpad>/funnel/<YYYY-MM-DD>.json` in the schema from
`docs/marketing/funnel/README.md` (shaped for Mango's
`record_icmb_funnel_week`; provisional until that tool ships). Then the claims
table — one row per number:

| # | Claim | Label | Source | Command | Result |
|---|---|---|---|---|---|

Labels: `VERIFIED` (you ran the command this run), `REPORTED` (a peer or tool
said it, you did not run it), `INFERRED` (derived; say from what), `NOT RUN`
(with the reason). Run `comms-evidence-loop` over the table before anything
reaches ClickUp or the artifact.

### 8. Artifact

1. Read `docs/marketing/funnel/ARTIFACT_URL`. If it holds a URL, `Artifact
   action: read` it and take `history[]` from its data island.
2. Append this run to `history` (keep the newest 12), render
   `.claude/skills/funnel-analysis/artifact.html` with the data island
   replaced, and publish — with `url` when one exists, without it on the
   first run.
3. First run only: write the returned URL into
   `docs/marketing/funnel/ARTIFACT_URL` and commit that one file on your
   branch. Show Matthew the link. **Sharing stays private** — changing it is
   Matthew's own action in the artifact's share menu, never the skill's.

### 9. ClickUp — at most four calls

1. `clickup_search` "Funnel state" in list 00. Missing → `clickup_create_task`
   once (list 901421549191, assignee Matthew, no due date).
2. `clickup_update_task`: description = the summary table + artifact link +
   `Last updated: <ISO> PT (<n>h ago)` + the not-run list.
3. `clickup_create_task_comment` on it: this run's summary (history survives
   description rewrites).
4. `clickup_search` `Fri review — week <ISO week>` in list 00; if found, one
   comment linking the artifact and the Funnel state task.

Never create other tasks — `[candidate]` rows are the Saturday plan's job.

### 9b. Usage log (Windsor + Apollo)

Each run records in the snapshot and in the run comment:
`{run: n, date, windsor: {sources connected + connect dates, fields/reports read}, apollo: {credits used since last run}}`.
Before **Fri 2026-10-02 12:00 PT** fill the "Usage on the trial" checklist on
https://app.clickup.com/t/86bc839bu: sources + dates, fields + run count, and
whether channel data changed a Friday review or Saturday pick (yes/no, with
the example).

### 10. Hand-off

Reply with: the constraint verdict, the claims table, the artifact URL, the
Funnel state task URL, the grouped not-run list, and what a human must check.
If PR-B/PR-C gates are outstanding, say which, in the deploy hand-off form
from `AGENTS.md`.

## Rules

- Nothing guessed. A number without a command is not a number; write
  **not run** and the reason.
- Never re-derive the constraint; never report PostHog when preflight failed.
- Never author a claim about the business (`docs/copy-principles.md` §2).
  Channel plans are proposed; the artifact shows counts, not promises.
- No visible prices anywhere in the artifact or ClickUp.
- Data reads only: never `npx convex dev`/`deploy`, never spend Windsor or
  Apollo credits, never change the artifact's sharing.
- Mango is the record. The snapshot is for `record_icmb_funnel_week`; do not
  build another store.
- ClickUp writes touch the standing task and the week's review task only.
