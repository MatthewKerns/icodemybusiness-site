# Funnel analysis — run contract

The `/funnel-analysis` skill (`.claude/skills/funnel-analysis/SKILL.md`) turns
the funnel into one snapshot per run, with a source for every number. This
file is the contract the skill and its readers share: where the data lives,
what each row means, and the snapshot shape.

Started 2026-09-26. Owner: the session that runs the Friday review
(`mango docs/agency/icmb-weekly-cadence.md`, step 3 "Funnel").

## IDs

| Thing | Value |
|---|---|
| Convex deployment | `neat-hamster-414` |
| PostHog project | 629815 (US) — `docs/observability.md`; EU 206048 holds history before 2026-09-26 |
| ClickUp folder | ICMB Funnel `901413789766` |
| ClickUp lists | 00 Weekly Cadence `901421549191` · 01 Feedback & Decisions `901421549193` · 10 Frontend `901421549194` · 20 Brain `901421549195` · 30 Comms `901421549196` · 40 Skool `901421549199` · 50 Leads (resolve by name) |
| Standing task | "Funnel state" in list 00 (created by the skill on its first run) |
| Windsor usage task | https://app.clickup.com/t/86bc839bu — checklist due Fri 2026-10-02 12:00 PT |
| Drive | ICMB Funnel OS `1cbKS64jNfjQsbyLZnrzZjB4n_xh8XgjA` · Weekly Reviews `1bQ8U1RAroyxbYETJZ_VPx5n1qAmNpaC8` |
| Artifact | URL in `ARTIFACT_URL` (this folder); republished in place every run |

## Sources by stage

| Stage | Source | Read with | Notes |
|---|---|---|---|
| Channels (pre-landing) | Windsor.ai connectors — one per channel, see `../channels/README.md` | `get_connectors`, `get_fields`, `get_data` | None connected as of 2026-09-26. GA4 is not a source: the site carries no tag. |
| Leads | ClickUp list 50 Leads (record: Mango, via `icmb_lead_ingest`) · Convex `leads` · Apollo contacts | `clickup_filter_tasks` · `leads:adminCounts` (PR-B) · `apollo_contacts_search` | Stage = task status; source = `src:site | src:clay | src:referral | src:apollo`; offer = `offer:assessment | offer:intro-call | offer:consulting | offer:dfy` (mango `docs/agency/icmb-lead-flow.md`). |
| Landing pages | PostHog web analytics | `query-web-overview`, `query-web-stats` | Filter out `utm_source = t9-test` (verification traffic). |
| Funnel steps + constraint | Convex `funnelConstraint:adminFunnelConstraint` | `npx convex run … --identity "$ID"` | Only source for step counts. Rule lives in `convex/lib/funnelConstraint.ts` (50 arrivals / 20 entrants). PostHog dashboard "Funnel constraint (reality)" in 629815 is the cross-check. |
| Email — site transactional | Convex `emailSends`; engagement from `emailEvents` (Resend webhook, PR-B) | `emailSends:adminCounts`, `emailEvents:adminCounts` | Until PR-B: count `emailSends:listRecent` by hand; engagement = not run. |
| Email — outbound follow-up | Apollo sequences (owner of follow-up, D-email 2026-09-26) | `apollo_emailer_campaigns_search`, `…_activity_feed` | 0 sequences on 2026-09-26. |
| Email — custom nurture engine | branch `agent/nurture/email-sequence` | — | Parked. Always reported as not run with that reason. |
| Booking | PostHog `consultation_booked` | `query-trends` | Client-side only (`CalendlyEmbed`); no server record. |
| Website visitors (identified) | Apollo website-visitor tracker | `apollo_contacts_search` with `website_visitors_people_from_domains` | Domain not added until PR-C ships. |

## What a row can say

- `VERIFIED` — the skill ran the command this run; the result is quoted.
- `REPORTED` — a person or another session said it; the skill did not run it.
- `INFERRED` — derived from verified rows; the derivation is stated.
- `NOT RUN: <reason>` — the source was unreachable, not deployed, or not
  connected. The reason is the exact failure or the exact gate.

Nothing else. No estimates, no "about", no "should be".

## Snapshot schema (v1)

Written to `<scratchpad>/funnel/<YYYY-MM-DD>.json` and embedded in the
artifact's data island. Shaped for Mango's planned `record_icmb_funnel_week`
tool; provisional until that tool's input schema lands (icmb-dev-3).

```json
{
  "version": 1,
  "runId": "2026-10-02T19:05:00-07:00",
  "generatedAt": 1791000300000,
  "windowDays": 7,
  "sources": { "posthog": "ok | not run: …", "convex": "…", "clickup": "…", "windsor": "…", "apollo": "…", "drive": "…" },
  "steps": [],
  "transitions": [],
  "constraint": { "kind": "traffic | step | unmeasured | insufficient", "title": "", "why": [], "nextAction": "" },
  "landing": { "visitors": 0, "sessions": 0, "topPages": [], "utmSources": [] },
  "leads": { "clickup": { "total": 0, "byStage": {}, "bySource": {} }, "convex": { "total": 0, "bySource": {} }, "apollo": { "contacts": 0, "newest": null } },
  "email": {
    "transactional": { "sent": 0, "failed": 0, "byTemplate": {}, "engagement": "not run: …" },
    "apolloSequences": "not run: … | [ { name, active, delivered, opened, replied, bounced } ]",
    "nurtureEngine": "not run: parked — Apollo owns follow-up (D-email 2026-09-26)"
  },
  "booking": { "count": 0, "caveat": "client-side only, no server record" },
  "channels": { "meta-ads": { "status": "not connected" }, "tiktok": {}, "google-ads": {}, "youtube": {}, "x": {}, "linkedin": {}, "instagram": {} },
  "usage": { "run": 1, "windsor": { "sourcesConnected": [], "fieldsRead": [] }, "apollo": { "creditsUsedSinceLastRun": 0 } },
  "claims": [ { "claim": "", "label": "VERIFIED", "source": "", "command": "", "result": "" } ],
  "history": [ { "generatedAt": 0, "arrivals": 0, "leads": 0, "bookings": null, "constraintTitle": "" } ]
}
```

`history` keeps the newest 12 runs, oldest first; the artifact draws its
sparklines from it.

## Artifact

`.claude/skills/funnel-analysis/artifact.html` is the page template. The
skill replaces the `window.__FUNNEL_SNAPSHOT__` data island and republishes to
the URL in `ARTIFACT_URL`. The page shows "Last updated" from `generatedAt`
and turns the stamp red after 8 days (one missed weekly run). It is private
until Matthew changes its sharing himself; the skill never does.

## Rules that reach outside this folder

- The constraint rule is edited in `convex/lib/funnelConstraint.ts` and the
  PostHog "Key constraint" tile together (`memory: project_funnel_map_dashboard`).
- Lead tags and stages are owned by mango `docs/agency/icmb-lead-flow.md`;
  change them there first.
- Channel plans are proposed until Matthew says otherwise
  (`docs/copy-principles.md` §2).
