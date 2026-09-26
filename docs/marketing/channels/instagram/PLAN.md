# Instagram — channel plan (proposed)

**Status:** not connected. No business account linked, no posting cadence.
Proposed plan only (`docs/copy-principles.md` §2).

## Windsor connector

Slug: `instagram` (Instagram Insights — needs a business/creator account
linked to a Facebook page). Fields: `date`, `media_type`, `reach`,
`impressions`, `profile_views`, `website_clicks`, `follower_count`,
`plays` (reels). Confirm IDs with `get_fields instagram`. Paid Instagram is
covered by the Meta Ads plan (`facebook`).

## Ties to the annual objective / weekly plan

- `[candidate] Start Instagram (reels)` in list 30 Comms via the Saturday plan.
- `Serves:` arrivals; reels reuse the same shorts as TikTok and YouTube.
- `Measure:` Windsor `website_clicks` and `reach` against PostHog `$pageview`
  with `utm_source=instagram`.
- `Automation:` not-yet
- `Size:` S once TikTok shorts exist (same assets)

## Setup steps (proposed)

1. Instagram business account linked to the Meta business (shared with the
   Meta Ads plan).
2. Bio link → `/?utm_source=instagram&utm_medium=organic`.
3. Connect `instagram` in Windsor.

## What "started" means

Five reels live and the skill reading reach, profile views and website clicks.

## Current state

Not run — Windsor `instagram` not connected (2026-09-26).

## Open questions for Matthew

- Start after TikTok (reuse shorts) or in parallel?
