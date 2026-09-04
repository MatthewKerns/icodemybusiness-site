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
| Visitors reach a booked call | splash → assessment → `/book` funnel completion | PostHog 206048 (EU), dashboard 761841 | measured 09-04: 0 real visitors (prod = placeholder); staging 30d: 65 views / 3 assessments / 1 lead / 1 book click / 0 bookings captured |
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
| M2 | Baseline the funnel numbers | R-011 | cmo | fable | team-cmo | — | `docs/marketing/funnel-baseline.md` with `{ref, tree, command, result}` per step from PostHog 206048 | **done** — 65 pageviews/30d, all staging; 1 lead, 1 book click, recap reached once ever | 09-04 11:05 | re-run after cutover (R-002) and after `ac20cfb` deploys | none |
| M3 | Claim scan of live surfaces — audit at `docs/marketing/copy-trust-gap-audit.md`; C7/C8 sent to email-followup for story-intake | copy-principles §2 | cmo | fable | team-cmo | — | list of every number/duration/"every"/"guarantee" on `/`, `/consulting`, `/book`, `/free-tools` with source or `[CLAIM NEEDED]` | **done** | 09-04 12:05 | grep `src/content` + route files; coordinate with `offer` before touching the letter. Authoritative claims inventory is `docs/matthew-story-intake.md` on `agent/nurture/email-sequence` (email-followup) — groups C1–C6 cover landing.ts :67 :134 :145 :154 :155 :195 and academy :95 :229 :238; M3 appends to it, never a second list. Known-unverified already with `offer` (do not re-flag): `PATHS.fractional.commitment` "I hold very few of these at once", `PATHS.program.commitment` "a handful a year" — both agent-authored; second contradicts paper (2/month) | none (edits to the letter need `offer`) |
| M4 | Blog route decision brief | R-013 | cmo | fable | team-cmo | — | one-page brief: what the first 4 posts are (from `content/tracker.md`), what the route needs, sized for `sdm`/`dev-N` | queued | 09-04 | read `content/tracker.md` + `content/calendar.md` | none |
| M5 | Email follow-up copy review | R-010 / emailSends | cmo | fable | team-cmo | — | every template in `convex/emails.ts` + `/api/email/*` passes copy-principles §1–§3 | blocked | 09-04 10:35 | wait for `email-followup` ping that `convex/emails.ts` has settled (their approved nurture build touches it) | none (sends are Matthew's) |
| M6 | Opt-in audit — answer "are we missing opt-ins?" | directive (Matthew 09-04) | cmo | fable | team-cmo | — | `docs/marketing/opt-in-audit.md` with every capture surface, consent state, and ranked gaps | review | 09-04 10:40 | Matthew reads it; decides D3 | YES (D3) |
| M8 | `/consulting` says 15-minute (was 30-minute ×4) | R-001 / copy-principles §3 | cmo | fable | team-cmo / agent/cmo/team-protocol | — | 0 hits for `30-minute` on the consulting surface; gates green at head | review | 09-04 12:05 | gates on VPS; Matthew merges | YES (merge) |
| M9 | Consent line on every capture form (EmailCapture.tsx ×4 surfaces; DiscoveryRecap.tsx is business-intake's) | D3 (Matthew's ruling, REPORTED via email-followup 09-04) | cmo (copy) | fable | team-cmo | — | one line per form stating what emails follow and how to stop; no cadence word until F1 is answered | blocked(HUMAN: story-intake F1 cadence) | 09-04 12:05 | wait for F1 | YES (F1) |
| M7 | Booking email copy: "30-minute discovery call" + "no pressure, just clarity" (`convex/emails.ts:200-206`); dead Calendly fallback handle in `convex/http.ts:237` | R-001 / copy-principles §5 | cmo (copy) + email-followup (http.ts fallback) | fable | team-cmo | — | template says Introduction Call, no duration hardcoded unless Matthew asserts it; fallback URL is the live handle or absent | queued | 09-04 | after M5 unblocks; ask email-followup to fix the fallback in their run since they own http.ts | none |

## Decision list
| # | decision | options | recommendation | evidence | raised | by |
|---|---|---|---|---|---|---|
| ~~D3~~ | ~~Add marketing consent to captures before the nurture sequence sends~~ — RESOLVED (REPORTED via email-followup 09-04): Matthew chose the strict option — consent line on every form + `leads.consentedAt`/`consentSource` first; every address captured before that is held out of sequences permanently. Capture on `/` + `/consulting` still open → D6 | — | — | email-followup message 09-04 ~11:50 | 09-04 | cmo |
| D5 | Move a one-line Measurable Progress Guarantee into the `/consulting` hero (the audit's trigger fix). It is a promise; repositioning duplicates it on the page | move / duplicate one line / leave | one line in the hero, full text stays | `copy-trust-gap-audit.md` §/consulting | 09-04 | cmo |
| D6 | Splash trigger: replace "Save time. Make money. / Make a Difference." with one concrete PROBLEM line the letter already has (`landing.ts:44`); and one line of the write-up promise above the fold | yes / no / after OFFER.md | yes, after OFFER.md if it changes the ladder | audit ranked #4; `offer` asked 09-04 12:00 | 09-04 | cmo |
| D4 | `/services` subtitle "I take on a limited number of projects at a time" — agent-authored capacity claim (§2). Keep with real numbers (3/wk, 2/mo per paper plan via offer) / delete | keep w/ numbers / delete | keep with Matthew's numbers once OFFER.md lands | `src/app/services/page.tsx:240` | 09-04 | cmo |
| D1 | Where team worktrees live: skill says `.worktrees/<slug>` (mango board discovery finds these), AGENTS.md says `../icmb-wt-<you>` (a sibling checkout mango reads as a separate repo) | `.worktrees/` for team roles / sibling dirs for everyone / update AGENTS.md | `.worktrees/` for team roles, note it in AGENTS.md | `.gitignore:64` ignores `.worktrees/`; `mango…/team_board/reader.py` `_WORKTREE_CONTAINERS` | 09-04 | cmo |
| D2 | Is `cmo` a permanent role in the `/team` skill (add to `role ∈ …` in `~/.claude/skills/team/SKILL.md`) or a per-repo extension only? | global skill / repo-only | global — the skill's role list is the only place it is not yet named | this board, `roles/cmo.md` | 09-04 | cmo |

## Digest log
- 09-04 12:05 — cmo: plan approved by Matthew (`~/.claude/plans/refactored-forging-otter.md`). Copy audit filed; `/consulting` 30→15 committed (M8); offer asked for the splash/above-fold moves (D6); C7/C8 handed to email-followup; business-intake's recap-confirm correction applied to baseline + assessment. Consent: Matthew ruled strict (REPORTED) — D3 resolved, M9 opened, blocked on F1.
- 09-04 11:50 — email-followup → cmo: Matthew's consent ruling (strict); pushback on the quotes framing line accepted (dropped the "first thing to correct" clause — it invited an action the email can't offer). Their groundwork is `18ed3fd` on agent/nurture/email-sequence.
- 09-04 11:15 — cmo: read email-followup's `docs/matthew-story-intake.md` (their branch). It is the single claims questionnaire for Matthew; M3/M5 will append, not compete. Two audits (funnel+instrumentation, copy trust gaps) running on Sonnet subagents after the Explore agent type 404'd four times.
- 09-04 11:05 — cmo: M2 done. VERIFIED the 30d numbers business-intake reported (identical). Zero traffic from icodemybusiness.com; prod is still the placeholder (R-002). Their `ac20cfb` (Q1 anchor + recap events) is a pending behaviour change — baseline labelled pre-change.
- 09-04 10:40 — cmo: opt-in audit written (M6). Four gaps: no capture on `/`,`/consulting`,`/book`; no consent on any form; no unsubscribe anywhere (academy promises one); no blog surface. D3/D4 raised.
- 09-04 10:30 — email-followup → cmo: `convex/emails.ts` is in their approved nurture build (unsubscribe slot, suppressions, schema, crons); M5 blocked until they ping. Handed over 3 copy defects: booking email (M7), academy "leave any time" (fixed by their Phase 2, not by copy), landing.ts:145 capacity line (offer's, already D-tracked as known-unverified). CORRECTION from them 10:45: the memory file `reference_calendly_booking_links` was already right (15-min `new-meeting-1`); only its MEMORY.md index line said 60 min, and they fixed that line.
- 09-04 10:20 — offer → cmo: ACK on ownership split. Two capacity lines in landing.ts are agent-authored and with Matthew for real numbers; offer has proposed `docs/OFFER.md` as the single offer source and will notify when it lands.
- 09-04 10:05 — cmo: protocol, 7 role cards, board template and this board written in `.worktrees/team-cmo`; not pushed (human gate). No `sdm`/`qam`/`cto` live in this project; `offer`, `email-followup`, `business-intake` are live peers outside the protocol.
- 09-04 09:55 — cmo: searched the whole workspace — no `PROTOCOL.md`, no role cards, no `board.md` exist anywhere on this machine; the only prior definition of the board format is mango's parser + test fixture.
