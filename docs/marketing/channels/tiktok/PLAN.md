# TikTok — channel plan (proposed)

**Status:** not connected. No business account, no posts, no ads. Proposed
plan only (`docs/copy-principles.md` §2).

## Windsor connector

Organic first: slug `tiktok_organic` — fields `date`, `video_title`,
`video_views`, `likes`, `comments`, `shares`, `profile_views`,
`follower_count`. Ads later: slug `tiktok` — `campaign_name`, `impressions`,
`clicks`, `spend`, `cpc`. Confirm IDs with `get_fields <slug>`.

## Ties to the annual objective / weekly plan

- `[candidate] Start TikTok (organic)` in list 30 Comms via the Saturday plan.
- `Serves:` arrivals; the content funnel in `docs/OFFER.md` already names
  TikTok as a distribution channel for short video.
- `Measure:` Windsor `video_views` and `profile_views` against PostHog
  `$pageview` with `utm_source=tiktok`.
- `Automation:` not-yet (posting stays manual; `content-distribute` covers
  the repurposing step)
- `Size:` S to start (account + link in bio + first 5 shorts from existing
  YouTube material)

## Setup steps (proposed)

1. TikTok business account (Matthew).
2. Bio link → `/?utm_source=tiktok&utm_medium=organic`.
3. Connect `tiktok_organic` in Windsor.
4. Posting cadence proposed by `content-distribute`, chosen by Matthew.

## What "started" means

Five posts live and the skill reading views and profile visits for them.

## Current state

Not run — Windsor `tiktok_organic` not connected (2026-09-26).

## Open questions for Matthew

- Same account as any existing personal TikTok, or a new business handle?
- Shorts source: cut from YouTube long-form, or native?
