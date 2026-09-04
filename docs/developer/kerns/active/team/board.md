# Team board — icodemybusiness-site — run started 2026-09-04 09:51 PDT

_Owned this run by `cmo`._

## 0. Objectives

### 0.1 Directive
> **`/team cmo` — seat a marketing lead for this repo; write the cmo role card first, land the team protocol here.** (Matthew, 2026-09-04, via the `/team` skill and its two follow-up answers.)
> Standing decisions carried in: no visible prices, email capture + booked calls as the conversion (memory `project_offer_model_no_pricing`, 2026-09-02).

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
| M3 | Claim scan of live surfaces | copy-principles §2 | cmo | fable | team-cmo | — | list of every number/duration/"every"/"guarantee" on `/`, `/consulting`, `/book`, `/free-tools` with source or `[CLAIM NEEDED]` | queued | 09-04 | grep `src/content` + route files; coordinate with `offer` before touching the letter | none (edits to the letter need `offer`) |
| M4 | Blog route decision brief | R-013 | cmo | fable | team-cmo | — | one-page brief: what the first 4 posts are (from `content/tracker.md`), what the route needs, sized for `sdm`/`dev-N` | queued | 09-04 | read `content/tracker.md` + `content/calendar.md` | none |
| M5 | Email follow-up copy review | R-010 / emailSends | cmo | fable | team-cmo | — | every template in `convex/emails.ts` + `/api/email/*` passes copy-principles §1–§3 | queued | 09-04 | ask `email-followup` what is in flight before reading | none (sends are Matthew's) |

## Decision list
| # | decision | options | recommendation | evidence | raised | by |
|---|---|---|---|---|---|---|
| D1 | Where team worktrees live: skill says `.worktrees/<slug>` (mango board discovery finds these), AGENTS.md says `../icmb-wt-<you>` (a sibling checkout mango reads as a separate repo) | `.worktrees/` for team roles / sibling dirs for everyone / update AGENTS.md | `.worktrees/` for team roles, note it in AGENTS.md | `.gitignore:64` ignores `.worktrees/`; `mango…/team_board/reader.py` `_WORKTREE_CONTAINERS` | 09-04 | cmo |
| D2 | Is `cmo` a permanent role in the `/team` skill (add to `role ∈ …` in `~/.claude/skills/team/SKILL.md`) or a per-repo extension only? | global skill / repo-only | global — the skill's role list is the only place it is not yet named | this board, `roles/cmo.md` | 09-04 | cmo |

## Digest log
- 09-04 10:05 — cmo: protocol, 7 role cards, board template and this board written in `.worktrees/team-cmo`; not pushed (human gate). No `sdm`/`qam`/`cto` live in this project; `offer`, `email-followup`, `business-intake` are live peers outside the protocol.
- 09-04 09:55 — cmo: searched the whole workspace — no `PROTOCOL.md`, no role cards, no `board.md` exist anywhere on this machine; the only prior definition of the board format is mango's parser + test fixture.
