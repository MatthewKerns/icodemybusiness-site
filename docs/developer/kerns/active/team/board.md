# Team board — icodemybusiness-site — run started 2026-09-04 09:51 PDT

_Owned this run by `cmo`._

## 0. Objectives

### 0.1 Directive
> **`/team cmo` — seat a marketing lead for this repo; write the cmo role card first, land the team protocol here.** (Matthew, 2026-09-04, via the `/team` skill and its two follow-up answers.)
> Standing decisions carried in: no visible prices, email capture + booked calls as the conversion (memory `project_offer_model_no_pricing`, 2026-09-02).
> REPORTED via `offer` 09-04 10:20, from Matthew's paper plan (not seen by cmo): selling "peace of mind" and "show up to work prepared with extra training"; ladder free training → paid consulting → done-for-you; capacity paid consulting 3 slots/week, done-for-you 2 slots/month; lead flow warm network (~20–30 people) + inbound from the four content pillars. Becomes VERIFIED when `docs/OFFER.md` lands.

### 0.3 Engagement objectives
| Objective | Metric | Source | Status this run |
|---|---|---|---|
| Visitors reach a booked call | splash → assessment → `/book` funnel completion | PostHog 206048 (EU), dashboard 761841 | not yet measured this run |
| Copy carries no unsourced business claims | 0 unsourced claims on live surfaces | `docs/copy-principles.md` §2 scan | not yet scanned this run |

## Roster
| name [ref] | session_id (uuid) | role | tier | worktree | status | since |
|---|---|---|---|---|---|---|
| cmo [144b81] (pending `/rename`; currently `icodemybusiness-site-86`) | f9ec1669-ade1-4050-a37d-6b0989a1b017 | cmo | fable | .worktrees/team-cmo | active | 09-04 |
| offer [a878a0] | 1c021960-799f-46f1-a2f7-88c22654d9ee | peer (owns homepage letter) | — | ../icmb-wt-offer | live, not on team | 09-04 |
| email-followup [9c72de] | 999a964d-7db5-4e1d-9fd0-509f227b3ac1 | peer | — | shared checkout | live, not on team | 09-04 |
| business-intake [ee4b6f] | ebcf9937-75cc-42f9-8140-6ec9b5c9cdf5 | peer (owns intake flow) | — | shared checkout | live, not on team | 09-04 |

## Tasks
| id | title | serves | owner | tier | worktree / branch | PR | done-predicate | state | last update | next action | human gate? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | Land the team protocol + cmo role card | directive | cmo | fable | team-cmo / agent/cmo/team-protocol | — | `.claude/team/{PROTOCOL.md,roles/*.md,board.template.md}` committed on the branch | review | 09-04 10:05 | Matthew reviews the cmo card; push + merge are his | YES (push/merge) |
| M2 | Baseline the funnel numbers | R-011 | cmo | fable | team-cmo | — | `docs/marketing/funnel-baseline.md` with `{ref, tree, command, result}` per step from PostHog 206048 | queued | 09-04 | run PostHog exec: splash gate + assessment + book events, last 14d | none |
| M3 | Claim scan of live surfaces | copy-principles §2 | cmo | fable | team-cmo | — | list of every number/duration/"every"/"guarantee" on `/`, `/consulting`, `/book`, `/free-tools` with source or `[CLAIM NEEDED]` | queued | 09-04 | grep `src/content` + route files; coordinate with `offer` before touching the letter. Known-unverified already with `offer` (do not re-flag): `PATHS.fractional.commitment` "I hold very few of these at once", `PATHS.program.commitment` "a handful a year" — both agent-authored; second contradicts paper (2/month) | none (edits to the letter need `offer`) |
| M4 | Blog route decision brief | R-013 | cmo | fable | team-cmo | — | one-page brief: what the first 4 posts are (from `content/tracker.md`), what the route needs, sized for `sdm`/`dev-N` | queued | 09-04 | read `content/tracker.md` + `content/calendar.md` | none |
| M5 | Email follow-up copy review | R-010 / emailSends | cmo | fable | team-cmo | — | every template in `convex/emails.ts` + `/api/email/*` passes copy-principles §1–§3 | blocked | 09-04 10:35 | wait for `email-followup` ping that `convex/emails.ts` has settled (their approved nurture build touches it) | none (sends are Matthew's) |
| M6 | Opt-in audit — answer "are we missing opt-ins?" | directive (Matthew 09-04) | cmo | fable | team-cmo | — | `docs/marketing/opt-in-audit.md` with every capture surface, consent state, and ranked gaps | review | 09-04 10:40 | Matthew reads it; decides D3 | YES (D3) |
| M7 | Booking email copy: "30-minute discovery call" + "no pressure, just clarity" (`convex/emails.ts:200-206`); dead Calendly fallback handle in `convex/http.ts:237` | R-001 / copy-principles §5 | cmo (copy) + email-followup (http.ts fallback) | fable | team-cmo | — | template says Introduction Call, no duration hardcoded unless Matthew asserts it; fallback URL is the live handle or absent | queued | 09-04 | after M5 unblocks; ask email-followup to fix the fallback in their run since they own http.ts | none |

## Decision list
| # | decision | options | recommendation | evidence | raised | by |
|---|---|---|---|---|---|---|
| D3 | Add marketing consent to captures before the nurture sequence sends: consent line + `leads.consentedAt`/`consentSource` (schema change, ask-first) and a capture on `/` + `/consulting` | consent line + field / consent line only / send to existing leads as-is | consent line + field, and hold the sequence for addresses captured without it | `docs/marketing/opt-in-audit.md` | 09-04 | cmo |
| D4 | `/services` subtitle "I take on a limited number of projects at a time" — agent-authored capacity claim (§2). Keep with real numbers (3/wk, 2/mo per paper plan via offer) / delete | keep w/ numbers / delete | keep with Matthew's numbers once OFFER.md lands | `src/app/services/page.tsx:240` | 09-04 | cmo |
| D1 | Where team worktrees live: skill says `.worktrees/<slug>` (mango board discovery finds these), AGENTS.md says `../icmb-wt-<you>` (a sibling checkout mango reads as a separate repo) | `.worktrees/` for team roles / sibling dirs for everyone / update AGENTS.md | `.worktrees/` for team roles, note it in AGENTS.md | `.gitignore:64` ignores `.worktrees/`; `mango…/team_board/reader.py` `_WORKTREE_CONTAINERS` | 09-04 | cmo |
| D2 | Is `cmo` a permanent role in the `/team` skill (add to `role ∈ …` in `~/.claude/skills/team/SKILL.md`) or a per-repo extension only? | global skill / repo-only | global — the skill's role list is the only place it is not yet named | this board, `roles/cmo.md` | 09-04 | cmo |

## Digest log
- 09-04 10:40 — cmo: opt-in audit written (M6). Four gaps: no capture on `/`,`/consulting`,`/book`; no consent on any form; no unsubscribe anywhere (academy promises one); no blog surface. D3/D4 raised.
- 09-04 10:30 — email-followup → cmo: `convex/emails.ts` is in their approved nurture build (unsubscribe slot, suppressions, schema, crons); M5 blocked until they ping. Handed over 3 copy defects: booking email (M7), academy "leave any time" (fixed by their Phase 2, not by copy), landing.ts:145 capacity line (offer's, already D-tracked as known-unverified). They are correcting memory `reference_calendly_booking_links` (60-min claim stale; live event is 15-min `new-meeting-1`).
- 09-04 10:20 — offer → cmo: ACK on ownership split. Two capacity lines in landing.ts are agent-authored and with Matthew for real numbers; offer has proposed `docs/OFFER.md` as the single offer source and will notify when it lands.
- 09-04 10:05 — cmo: protocol, 7 role cards, board template and this board written in `.worktrees/team-cmo`; not pushed (human gate). No `sdm`/`qam`/`cto` live in this project; `offer`, `email-followup`, `business-intake` are live peers outside the protocol.
- 09-04 09:55 — cmo: searched the whole workspace — no `PROTOCOL.md`, no role cards, no `board.md` exist anywhere on this machine; the only prior definition of the board format is mango's parser + test fixture.
