# X — channel plan (proposed)

**Status:** not connected in Windsor. The X post engine exists
(`.claude/skills/x-post-batch`, `/admin/x`, Convex `xPosts`) and posts are
sign-off-gated by Matthew; this plan is about measuring what the engine
publishes. Proposed plan only (`docs/copy-principles.md` §2).

## Windsor connector

Slug: `twitter` (X public metrics; a paid X API tier may be required — check
`get_connectors` for the account state before assuming). Fields: `date`,
`tweet_text`, `impressions`, `engagements`, `likes`, `replies`, `reposts`,
`link_clicks`, `followers`. Confirm IDs with `get_fields twitter`.

## Ties to the annual objective / weekly plan

- `[candidate] Measure X posts` in list 30 Comms via the Saturday plan.
- `Serves:` arrivals; X is the loop-post channel that hands off between the
  four pillars (clockify / paper / writing / claude).
- `Measure:` Windsor `link_clicks` and `impressions` per post against PostHog
  `$pageview` with `utm_source=x`; post links from the engine must carry the UTM.
- `Automation:` partial (drafting is automated; posting and sign-off are Matthew's)
- `Size:` S (connect + UTM on engine links)

## Setup steps (proposed)

1. Check whether the X account's API tier exposes analytics to Windsor.
2. Connect `twitter` in Windsor.
3. Add `utm_source=x&utm_medium=post&utm_campaign=<tactic-id>` to links in
   `x-post-batch` output (a change to that skill, in its own PR).

## What "started" means

The skill reads impressions and link clicks for the last 7 days of posts.

## Current state

Not run — Windsor `twitter` not connected (2026-09-26).

## Open questions for Matthew

- Is the X account on a tier that exposes analytics? If not, is that spend
  worth it before the first 50 arrivals?
