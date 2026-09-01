---
name: quarterly-planner
description: >
  EOS-style quarterly planning session for a founder. Use when the user wants to
  plan the next quarter, set or review their Rocks, run a quarterly pulse /
  "Same Page Meeting", refresh their V/TO 1-year plan, or asks to "plan my
  quarter / set my rocks / do quarterly planning / what should I focus on this
  quarter". Captures real context first — from Google Drive (prior plans, the
  V/TO), Apple Notes, and your Claude history (recurring goals, commitments,
  open threads) — then walks the EOS quarterly workflow: review last quarter →
  set 3–7 quarterly Rocks aligned to the 1-year plan → define a weekly Scorecard
  → produce a 90-day plan + Level 10 meeting agenda. Never invents data: every
  Rock and measurable traces to reviewed context or an explicit user answer.
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# quarterly-planner

A founder's quarterly planning session built on **EOS** (the Entrepreneurial
Operating System). One run takes you from "it's a new quarter" to a written
**90-day plan**: 3–7 Rocks, a weekly Scorecard, and a Level 10 meeting agenda —
grounded in what you actually said and shipped last quarter, not a blank page.

> **EOS in one paragraph.** EOS runs a company on six "components" (Vision,
> People, Data, Issues, Process, Traction). *Traction* comes from two
> disciplines: **Rocks** (the 3–7 most important 90-day priorities) and the
> weekly **Level 10 Meeting** driven by a **Scorecard** (5–15 weekly
> measurables). Every quarter you "pulse": review last quarter's Rocks, refresh
> the **V/TO** (Vision/Traction Organizer) 1-year plan, and set new Rocks. This
> skill runs that pulse for a solo founder or a small leadership team.

## Workflow

Run the phases in order. Gather context **before** proposing anything.

### Phase 0 — Gather context (do this first)

Pull the founder's real signals so the plan is grounded. Run whichever sources
are available; skip any that error and note it. Write everything under a working
dir `./.quarterly-planner/context/`.

```bash
mkdir -p .quarterly-planner/context
# 1) Claude history — recurring goals, /goal commands, commitments, open threads
python3 scripts/gather_claude_history.py --days 120 --out .quarterly-planner/context/claude-history.md
# 2) Apple Notes — planning notes, ideas, meeting notes (filter to a folder if you keep one)
bash scripts/gather_apple_notes.sh --since "120 days ago" --out .quarterly-planner/context/apple-notes.md
# 3) Google Drive — last quarter's plan, the V/TO, strategy docs (folder name or 'My Drive')
python3 scripts/gather_drive.py --folder "EOS" --since 120 --out .quarterly-planner/context/drive.md
```

Then **Read** the three files. If Google Drive auth isn't set up, fall back to a
local Drive mount (`~/Library/CloudStorage/GoogleDrive-*`) or just ask the user
to paste their current V/TO 1-year plan and last quarter's Rocks.

From the gathered context, extract and summarize for the user:
- **Last quarter's Rocks** and their status (done / not done) if you can find them.
- The **1-year plan** and **annual Rocks** from the V/TO (the north star Rocks roll up to).
- **Recurring themes & commitments** that keep showing up in notes/history — these are candidate Rocks or Issues.
- An **Issues list** — open problems, decisions, and dropped threads worth solving this quarter.

### Phase 1 — Review last quarter (close the loop)

Present last quarter's Rocks and ask the user to confirm status. Use
`AskUserQuestion` for each ambiguous one (Done / Mostly / Dropped). Capture
**why** anything missed — that pattern usually predicts this quarter's risk.

### Phase 2 — Refresh the 1-year plan

Confirm (don't invent) the **1-year plan**: 3–7 goals for the year and the
revenue/profit/measurable targets. New Rocks MUST ladder up to these. If the
user has no 1-year plan yet, build a lightweight one with them first
(`templates/quarterly-plan-template.md` has the V/TO skeleton).

### Phase 3 — Set this quarter's Rocks (the core output)

Propose **3–7 Rocks** for the next 90 days. Each Rock is:
- **Specific & measurable** — "done" is unambiguous.
- **Owned** — one accountable person (for a solo founder, still name it).
- **Due** — by the end of the quarter.
- **Laddered** — traces to a 1-year goal.

Derive candidates from Phase 0 context; never pad to hit a number. Pressure-test
with the user via `AskUserQuestion`: *"Is this truly a top-7 priority, or an
Issue/task?"* Park everything that doesn't make the cut on the **Issues list**.

### Phase 4 — Build the weekly Scorecard

Define **5–15 weekly measurables** (leading indicators, not lagging) with an
owner and a weekly goal each — the numbers you'll review every week to know
you're on track for the Rocks. Examples: sales conversations booked, demos run,
cash balance, MRR, content shipped, hires in pipeline.

### Phase 5 — 90-day plan + Level 10 agenda

Produce the deliverable with **Write** to `./quarterly-plan-YYYY-Qn.md` from
`templates/quarterly-plan-template.md`, filled in with: the 1-year plan, the
Rocks (owner/due/ladder), the Scorecard, the Issues list, and a standard weekly
**Level 10 Meeting** agenda (Segue · Scorecard · Rock review · Headlines ·
To-Dos · IDS issues · Conclude). Offer to schedule the weekly L10 as a recurring
calendar hold.

### Phase 6 — Close

Summarize: the Rocks, the top 3 Issues to solve first, and the next L10 date.
Remind the user this is a **living plan** — re-run the skill next quarter; it
will read this quarter's plan back in as context and close the loop.

## Principles

- **Grounded, not generated.** Every Rock/measurable traces to reviewed context
  or an explicit answer. If you're unsure, ask — don't fabricate a target.
- **3–7 Rocks, hard cap.** More than 7 priorities means none are priorities.
- **Leading over lagging** on the Scorecard — measure the activity that drives
  the result, not just the result.
- **Read-only on your data.** Context gathering only reads; it never edits your
  Notes, Drive, or history. See `DISCLAIMER.md`.

## Files

- `scripts/gather_claude_history.py` — mine `~/.claude` for goals/themes/commitments.
- `scripts/gather_apple_notes.sh` — export Apple Notes (read-only) via AppleScript.
- `scripts/gather_drive.py` — read prior plans / the V/TO from Google Drive (read-only).
- `templates/quarterly-plan-template.md` — the V/TO + Rocks + Scorecard + L10 skeleton.
- `credentials/README.md` — one-time Google Drive read-only OAuth setup.
