# Channels — pre-landing sources

Every way a person can reach the site before they land on it. As of
2026-09-26 none of these run: no ad account, no posting cadence, no Windsor
source connected. Matthew's direction (2026-09-26): start all of them, plan
files first, built out through the annual objective and the weekly plan.

Each channel has a `PLAN.md` here. Everything in those files is **proposed**
(`docs/copy-principles.md` §2) until Matthew edits it in his own words.

| Channel | Windsor slug | Status | Plan |
|---|---|---|---|
| Meta Ads (Facebook + Instagram paid) | `facebook` | not connected | [meta-ads/PLAN.md](meta-ads/PLAN.md) |
| TikTok (organic first, ads later) | `tiktok_organic`, `tiktok` | not connected | [tiktok/PLAN.md](tiktok/PLAN.md) |
| Google Ads | `google_ads` | not connected | [google-ads/PLAN.md](google-ads/PLAN.md) |
| YouTube | `youtube` | not connected | [youtube/PLAN.md](youtube/PLAN.md) |
| X | `twitter` (public) | not connected | [x/PLAN.md](x/PLAN.md) |
| LinkedIn (personal + page) | `linkedin` | not connected | [linkedin/PLAN.md](linkedin/PLAN.md) |
| Instagram (organic) | `instagram` | not connected | [instagram/PLAN.md](instagram/PLAN.md) |

Not a channel here: Google Analytics 4 — the site has no GA4 tag; PostHog is
the landing-page source. Google Search Console is worth connecting in Windsor
if a property exists for icodemybusiness.com (organic search impressions and
clicks per page); it is a landing-page signal, not a channel plan.

## How a channel goes from "not connected" to "running"

1. Matthew picks it: the channel's `PLAN.md` becomes a `[candidate] Start
   <channel>` task in ClickUp list **30 Comms** (`901421549196`) through the
   Saturday plan (`mango docs/agency/icmb-weekly-cadence.md`, step 2), with
   the `Serves:` / `Measure:` / `Automation:` / `Size:` lines copied from the
   plan. The funnel-analysis skill never creates these tasks.
2. The account exists and the Windsor source is connected — by Matthew, in
   Windsor. No Windsor spend until he says so (2026-09-26); usage is logged
   on https://app.clickup.com/t/86bc839bu.
3. `/funnel-analysis` starts reporting the channel's `PLAN.md` fields instead
   of "not run".
4. Status here flips to `connected`, then `running` once the first
   post/campaign is live. Update this table in the same PR as the change.

## Windsor.ai

Two claude.ai connectors: "Windsor.ai" (ads and social) and "Windsor.ai for
Web Analytics". Both are authorised by Matthew from claude.ai (`/mcp` in
Claude Code → select → authorize). Trial started 2026-09-26 (30 days). Field
IDs come from `get_fields <slug>` at run time — the plans list the fields to
ask for, not their exact IDs.
