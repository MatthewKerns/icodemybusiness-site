# LinkedIn — channel plan (proposed)

**Status:** not connected. No page analytics, no posting cadence. Proposed
plan only (`docs/copy-principles.md` §2).

## Windsor connector

Slug: `linkedin` (organic page analytics; personal-profile analytics are not
exposed by LinkedIn's API — only a company page). Fields: `date`,
`impressions`, `clicks`, `engagement_rate`, `followers_gained`,
`page_views`. Ads later: `linkedin_ads`. Confirm IDs with `get_fields linkedin`.

## Ties to the annual objective / weekly plan

- `[candidate] Start LinkedIn page` in list 30 Comms via the Saturday plan.
- `Serves:` arrivals from business owners, and the outbound follow-up lane —
  Apollo sequences (D-email 2026-09-26) can reference LinkedIn profiles.
- `Measure:` Windsor `clicks` and `impressions` against PostHog `$pageview`
  with `utm_source=linkedin`; leads tagged `src:apollo` whose first touch was LinkedIn.
- `Automation:` not-yet
- `Size:` S (page + connect); posting cadence is a separate pick

## Setup steps (proposed)

1. Company page for iCodeMyBusiness (Matthew), personal profile links to it.
2. Connect `linkedin` in Windsor.
3. Post links carry `utm_source=linkedin&utm_medium=organic`.

## What "started" means

A page with five posts and the skill reading impressions and clicks for them.

## Current state

Not run — Windsor `linkedin` not connected (2026-09-26).

## Open questions for Matthew

- Company page vs. personal profile as the primary voice.
- Whether LinkedIn is the first outbound list for Apollo sequences.
