# Meta Ads — channel plan (proposed)

**Status:** not connected. No ad account, no spend. Everything below is a
proposed plan, not a description of anything running (`docs/copy-principles.md` §2).

## Windsor connector

Slug: `facebook` (Meta Ads: Facebook + Instagram paid). Fields the skill will
ask for once connected (confirm IDs with `get_fields facebook`): `date`,
`campaign`, `adset_name`, `impressions`, `clicks`, `spend`, `cpc`, `ctr`,
`actions` (landing page views), `link_clicks`. Window: 7d and 30d.

## Ties to the annual objective / weekly plan

- Enters the plan as `[candidate] Start Meta Ads` in ClickUp list 30 Comms
  through the Saturday plan — never created by the funnel skill.
- `Serves:` arrivals (funnel step 1) — the constraint is "traffic" until the
  site sees 50 arrivals in a window.
- `Measure:` Windsor `link_clicks` and `spend` against PostHog `$pageview`
  with `utm_source=meta`; cost per assessment start.
- `Automation:` not-yet
- `Size:` M (account + pixel decision + first creative)

## Setup steps (proposed)

1. Meta Business account and ad account under the business (Matthew).
2. Decide whether a Meta pixel goes on the site — a new third-party script
   and a `/privacy` change, ask-first, same shape as PR-C for Apollo.
3. Connect `facebook` in Windsor (Matthew; no paid Windsor tier).
4. First campaign points at `/` with `utm_source=meta&utm_medium=paid&utm_campaign=<name>`.

## What "started" means

One campaign live for 7 days with spend, clicks and landing views all
readable through the skill.

## Current state

Not run — Windsor `facebook` not connected (2026-09-26).

## Open questions for Matthew

- Budget ceiling for a first test, and who signs off creative.
- Pixel: yes/no. Without it, attribution is UTM-only (fine for a first test).
