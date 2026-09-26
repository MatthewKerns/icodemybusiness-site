# Google Ads — channel plan (proposed)

**Status:** not connected. No Google Ads account. Proposed plan only
(`docs/copy-principles.md` §2).

## Windsor connector

Slug: `google_ads`. Fields: `date`, `campaign`, `ad_group`, `impressions`,
`clicks`, `cost`, `cpc`, `ctr`, `search_impression_share`, `conversions`.
Confirm IDs with `get_fields google_ads`. Related, not a channel: Google
Search Console (`google_search_console`) for organic impressions/clicks per
page — connect it if a property exists for icodemybusiness.com.

## Ties to the annual objective / weekly plan

- `[candidate] Start Google Ads (search)` in list 30 Comms via the Saturday plan.
- `Serves:` arrivals with intent — search terms around what the offer
  solves, sent to `/consulting` or `/book`.
- `Measure:` Windsor `clicks` and `cost` against PostHog `$pageview` with
  `utm_source=google&utm_medium=cpc`; cost per assessment start and per
  `book_call_clicked`.
- `Automation:` not-yet
- `Size:` M (account, keyword list, conversion goal, first ad group)

## Setup steps (proposed)

1. Google Ads account under the business Google account (Matthew).
2. Conversion tracking: prefer PostHog UTMs over a Google tag on the site
   (a tag is a new third-party script — ask-first).
3. Connect `google_ads` in Windsor.
4. First search campaign with exact-match terms, landing on `/consulting`.

## What "started" means

A search campaign live 7 days with impressions, clicks and cost readable
through the skill.

## Current state

Not run — Windsor `google_ads` not connected (2026-09-26).

## Open questions for Matthew

- Which Google account owns Ads and (if any) Search Console.
- Daily budget ceiling for the first test.
