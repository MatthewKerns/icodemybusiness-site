# Agent-team protocol — icodemybusiness-site

Multi-session Claude Code team for this repo. One human (Matthew). Each role is one
`/rename`d session. Roles: `cto | sdm | qam | sde | qa | ux-reviewer | cmo`. Cards in
`roles/`. The `/team <role>` skill (`~/.claude/skills/team/SKILL.md`) is the entry point.

Landed 2026-09-04 by the `cmo` session (first team run in this repo). Before then the
protocol lived only in the mango repo's board reader; this file is the human-readable
source, and mango's `TeamBoardReader` parses the board in §5.

## §0 Guardrails (every role, every message)

- **Own worktree, never the main checkout.** `.worktrees/<slug>` (gitignored) off
  `origin/main` (this repo has no `staging` branch). The shared checkout is read-only.
  AGENTS.md's shared-checkout rules still apply on top of this.
- **Label every claim** `VERIFIED` (you ran it), `REPORTED` (someone told you),
  `INFERRED` (you deduced it). Never launder one into another.
- **Numbers as `{ref, tree, command, result}`** — a number without its command is a claim.
- **CI terminal per commit at head SHA.** "Gates green" means the three gates on that SHA
  (`npm run lint && npx tsc --noEmit && npm test`, VPS-routed when the RAM guard is WARN/CRIT).
- **CORRECTION** goes to every recipient of the wrong message and into every doc it reached.
- **Human gates are the human's and non-relayable:** merge, push to `main`, prod/staging
  deploy, dependencies, Slack/X/email sends, spend, config/env, and (this repo) any
  visitor-facing claim about the business (`docs/copy-principles.md` §2). A lead may
  queue a gate on the board; nobody may pass one on the human's behalf.
- **No container installs.** `npm ci --ignore-scripts` in your worktree only.
- **Address by `name [ref]` fresh from `ListAgents`**, read the send result, record with
  the uuid `session_id` from mango `dev_roster`.
- **BLOCKED is a message, not a wait state.** Send it, then take the next unblocked item.
- **The deliverable is a file, the message is the notification.** Reports, findings and
  drafts land in the worktree (or `docs/`); the envelope points at the path.
- **Tests are the spec.** Never weaken one (`test-guard` hook). See AGENTS.md § Never Do.

## §1 Roles and model tiers

| role | tier allowed | lead | loop |
|---|---|---|---|
| `cto` | opus / fable | human | none — trigger-driven |
| `sdm` | opus / fable | cto (else human) | `/loop SDM pass — PROTOCOL §3.1` |
| `cmo` | opus / fable | human | `/loop CMO pass — PROTOCOL §3.2` |
| `qam` | opus / fable | cto / sdm | triggers (§4) |
| `sde` (`dev-N`) | any | sdm (or cmo for content work) | wait for ASSIGN |
| `qa` (`qa-N`) | any | qam | wait for ASSIGN |
| `ux-reviewer` (`-N`) | any | qam | on demand (G# from qam) |

Bare `qa`/`dev`/`ux-reviewer` names are reserved-and-taken; always number. One `cto` per
machine, one `sdm`/`qam`/`cmo` per project. The tier goes on the board roster and in
every STATUS.

## §2 Envelopes

Every cross-session message starts with a bracketed type on line 1 (the recipient's human
sees only that line as preview), then `from:` / `tier:` / `re:` lines, then the body.

| type | who → whom | required fields |
|---|---|---|
| `[STATUS]` | anyone → lead | `state:` active / idle / blocked · `worktree:` · `tier:` · `working-on:` T# |
| `[ASSIGN]` | lead → worker | `task:` T# · `done-predicate:` · `worktree:` · `human-gate:` · `deadline:` (optional) |
| `[ACK]` | worker → lead | `task:` · `plan:` 1–3 lines · `first-check:` |
| `[RESULT]` | worker → lead | `task:` · `path:` (the file) · `sha:` · `gates:` pasted · `claims:` labelled |
| `[BLOCKED]` | anyone → lead | `task:` · `blocker:` · `tried:` · `needs:` (human / peer / info) |
| `[QUESTION]` | anyone → lead/human | one question, options, recommendation |
| `[ESCALATE]` | lead → cto/human | `decision:` · `options:` · `recommendation:` · `evidence:` |
| `[CORRECTION]` | anyone → all prior recipients | `wrong:` · `right:` · `docs-fixed:` |
| `[G#]` | qam → ux-reviewer | gate id, surface, URL, what to look at |

Example:

```
[STATUS] cmo online — owns marketing board this run
from: cmo [144b81]   tier: fable   session_id: f9ec1669-…
state: active   worktree: .worktrees/team-cmo   working-on: M1
board: docs/developer/kerns/active/team/board.md
```

## §3 Lead loops

### §3.1 SDM pass
1. `ListAgents` + `dev_roster` — who is live, idle, waiting. 2. Drain inbound envelopes:
ACK/RESULT/BLOCKED update the board row; QUESTION gets one answer or an ESCALATE. 3. For
each idle worker with capacity, ASSIGN the top queued task whose inputs exist. 4. Verify
one RESULT claim yourself (re-run its command). 5. Commit the board if any cell changed.
6. Two consecutive passes with no change → say so to the human and stop the loop.

### §3.2 CMO pass
Same shape as §3.1, over the marketing board (`roles/cmo.md` § Loop), with two additions:
every task's done-predicate must name the **measurement** (PostHog event or funnel step)
that proves it, and every visitor-facing word passes `docs/copy-principles.md` before it
reaches a RESULT.

## §4 QAM triggers
`qam` acts on: a RESULT carrying a SHA (verify gates at that SHA, then assign `qa-N`
functional checks); a task entering `qa` state; a `G#` surface gate request from a lead
(dispatch `ux-reviewer-N`); a CORRECTION touching anything already verified (re-verify).
No scheduled sweep unless the human asks.

## §5 The board
One markdown file per project at `docs/developer/kerns/active/team/board.md`, owned by
the session carrying dispatch this run (named in the `_Owned this run by_` line), committed
on every material edit, in that session's worktree. **When the board and any other record
disagree, the board wins.** Template: `.claude/team/board.template.md`. Sections and
columns are fixed (mango's `TeamBoardReader` parses them): `0. Objectives`, `Roster`,
`Tasks` (12 columns), `Decision list` (7 columns, strike `~~D#~~` when resolved), `Digest
log` (newest first). Task states, in order: `queued → assigned → acked → in-progress →
blocked → review → qa → done | cancelled`; decoration after the word is allowed
(`blocked(HUMAN)`, `**done — DEPLOYED**`). `serves` names the roadmap item, rock or
directive the task pursues; `none` must be justified in the row. Escape `|` inside a cell
as `\|`.
