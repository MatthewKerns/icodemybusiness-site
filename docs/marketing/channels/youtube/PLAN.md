# YouTube — channel plan (proposed)

**Status:** not connected in Windsor. The content pipeline
(`content-idea-log` → `content-create` → `content-distribute`) already targets
YouTube as the first stop (`docs/ROADMAP.md`, `docs/OFFER.md`); this plan is
about measuring it, not inventing it. Proposed plan only
(`docs/copy-principles.md` §2).

## Windsor connector

Slug: `youtube` (YouTube Analytics). Fields: `date`, `video_title`, `views`,
`watch_time_minutes`, `average_view_duration`, `subscribers_gained`,
`impressions`, `impressions_ctr`, `traffic_source`. Confirm IDs with
`get_fields youtube`.

## Ties to the annual objective / weekly plan

- `[candidate] Connect YouTube analytics` in list 30 Comms via the Saturday
  plan (the channel itself is already in the content plan).
- `Serves:` arrivals; the YouTube → blog → site path (R-013 in the roadmap
  is the missing blog route).
- `Measure:` Windsor `views` and `impressions_ctr` per video against PostHog
  `$pageview` with `utm_source=youtube`; description links must carry the UTM.
- `Automation:` partial (Mango's `get_youtube_tactics` / `scan_youtube_tactics`
  already read YouTube for tactics; analytics is the missing half)
- `Size:` S (connect + add UTMs to descriptions)

## Setup steps (proposed)

1. Confirm the channel is under the business Google account.
2. Connect `youtube` in Windsor (read-only analytics).
3. Add `?utm_source=youtube&utm_medium=video&utm_campaign=<video-slug>` to
   every description link.

## What "started" means

The skill reads views and CTR per video and matches them to UTM arrivals.

## Current state

Not run — Windsor `youtube` not connected (2026-09-26).

## Open questions for Matthew

- Which Google account owns the channel.
- Whether older video descriptions get the UTM retrofitted or only new ones.
