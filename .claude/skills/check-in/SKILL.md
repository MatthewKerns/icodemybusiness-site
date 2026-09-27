---
name: check-in
description: >
  iCodeMyBusiness check-in: confirm this session's connectors are bound to the ICMB accounts, then
  pull the latest ClickUp priorities from the ICMB Funnel folder, rank them with a fixed rule, and
  report what needs Matthew, what changed since the last check-in, and the ranked queue. Writes the
  ranked queue for /dig to pick from. Read-only in every connector. Use when Matthew says
  "/check-in", "check in", "what are my priorities", "what's on the board", "what changed", or at
  the start of an ICMB session. This repo's own check-in: the global InventoryHero /check-in defers
  to it (its step 0).
allowed-tools: [Read, Bash, Grep, Glob, AskUserQuestion]
---

# ICMB check-in

Three questions, in order: **am I connected to the right accounts**, **what are the priorities right
now**, and **what changed since last time**. Read-only everywhere — nothing is posted, commented,
moved or edited. Anything that needs a response is a *drafted* next step for Matthew.

`/dig` reads the queue this skill writes. Run this first; `/dig` re-runs it itself when the queue is
older than 4 hours.

## 0. Lookback

State file: `~/.claude/skills-state/icmb-check-in/last-run.json` →
`{"completed_at": "<ISO UTC>", "dark_lanes": [...]}`. Lookback = since `completed_at`, 24h floor;
no file → 3 days. Print the window in UTC and PT on the first line.

## 1. Pre-flight — bindings (one parallel batch)

This session must be on **matthew@icodemybusiness.com** (`~/.claude-config-map` routes this repo).
A connector on another account returns *wrong* answers, which is worse than none.

| Connector | Probe | ✓ when | ⚠ when |
|---|---|---|---|
| **ClickUp** | `clickup_get_workspace_hierarchy` `max_depth: 0` | root id `90141695233` (space "Team Space" 90148910288) | any other workspace (seen: 90141672456 = JASON Learning, when the session was on the InfinityVault login) |
| **Mango** | `clickup_status` | answers | `unauthorized` / not connected |
| **PostHog** | `exec` → `call project-get {}` | `id: 629815` | any other project (168621 = InventoryHero, 206048 = retired EU) |
| **Slack** | `slack_read_user_profile` | second line `iCodeMyBusiness` | Dad Vibes or any other workspace |
| **Git/GitHub** | `gh auth status`; `git fetch -q origin` in the repo | logged in as `MatthewKerns` | fetch fails |

A tool missing from the list ("not connected") is ✗ *connector not loaded*: the fix is `/mcp` →
reconnect, not a retry. If ClickUp is ✗/⚠, fall back to Mango `clickup_board` for the read and say
so; if both are dark, stop and ask one `AskUserQuestion` (fix and wait / proceed with the repo and
peer lanes only). Never gather ICMB priorities from a wrong-account connector.

## 2. ClickUp priorities

Folder **ICMB Funnel** `901413789766`, lists:
`00 Weekly Cadence 901421549191` · `01 Feedback & Decisions 901421549193` ·
`10 Frontend 901421549194` · `20 Brain 901421549195` · `30 Comms 901421549196` ·
`40 Skool 901421549199` · `50 Leads 901421549442`.
Statuses: `to do` → `in progress` → `complete` (50 Leads uses its own stage statuses once Matthew
adds them).

1. `clickup_filter_tasks` `folder_ids: ["901413789766"]`, open tasks only, `order_by: updated`
   (page until `has_more` is false). Keep the call count; the workspace shares a daily cap.
2. Separately, tasks updated since the lookback **including closed**, for "what changed".
3. For the top 10 after ranking, `clickup_get_task` with `include: ["dependencies","checklists"]`
   (≤10 calls). No comment reads here — `/dig` does that for the one it picks.

**Ranking rule (apply in this order; the first rule that separates two tasks decides):**

1. **Overdue** — due date before today (PT).
2. **Due today.**
3. **ClickUp priority** — urgent > high > normal > low > none.
4. **Waiting on Matthew** — list 01 decisions (`D#`) and any task whose description/checklist has an
   unticked "Matthew:" step. These unblock other sessions, so they outrank ordinary build work.
5. **In progress** before to do.
6. **Due this week** (through Sunday PT).
7. **Weekly cadence** — the current week's `Fri review` / `Sat plan` tasks by their due time.
8. Tie-break: least recently updated first (the one going stale).

Exclusions from the ranked queue (list them separately, don't drop them silently):
- `[candidate]` tasks — the Saturday plan's picks are Matthew's to make; show them as "awaiting your
  pick".
- Tasks assigned only to someone else.
- `Funnel state` (86bc85tya) — it's a report surface, not work.

## 3. What changed + live state

- **ClickUp:** tasks created, completed or moved since the lookback (from 2.2), one line each.
- **Peers:** `ListAgents`; for each `icmb-*` session note busy/idle/waiting. Read
  `docs/developer/kerns/active/team/board.md` on `origin/main` for open `D#` rows and `ASSIGN`s.
- **Repo:** `gh pr list -R MatthewKerns/icodemybusiness-site --state open` and merged since the
  lookback; `origin/main` head; `/opt/icodemybusiness-site/DEPLOYED_SHA` on the VPS
  (`ssh root@2.25.207.149 cat …`) vs `origin/main` — anything merged but not deployed is a line.
- **Funnel:** the latest constraint from ClickUp task `Funnel state` (86bc85tya) description —
  quote its "Last updated" and constraint line; don't re-run the funnel analysis here.

Before calling any ClickUp item *open*, check it against live state: a task that says "merge PR #N"
when #N is merged is **done (evidence)**, not open — report the drift, never edit the task.

## 4. Output

```
CHECK-IN  <window UTC> (<window PT>)
CONNECTORS  ClickUp ✓ ICMB · Mango ✓ · PostHog ✓ 629815 · Slack ✓ iCodeMyBusiness · GitHub ✓

NEEDS YOU
- <task link> · <why it's yours: decision / Matthew step / overdue> · <state + evidence>

PRIORITIES (ranked — rule # that placed it)
1. [Task name](https://app.clickup.com/t/<id>) · <list> · due <date|—> · <priority> · <status> · rule <n>
…10

AWAITING YOUR PICK  <[candidate] tasks, one line each>
WHAT CHANGED        <ClickUp moves · peers · PRs merged/open · deployed vs main · funnel constraint>
ALREADY DONE        <item · evidence>          (board says open, live says done)
BLIND SPOTS         <lane · why · fix>
```

ClickUp tasks are always written as `[name](url)` links. Every line cites its source. Terse.

## 5. Finish

Write, only after a completed run:

- `~/.claude/skills-state/icmb-check-in/last-run.json` —
  `{"completed_at": "<ISO UTC>", "window_from": "<ISO>", "dark_lanes": [...]}`
- `~/.claude/skills-state/icmb-check-in/priorities.json` — the ranked queue for `/dig`:
  `{"generated_at": "<ISO UTC>", "source": "clickup|mango", "tasks": [{"rank", "id", "name", "url",
  "list", "due", "priority", "status", "rule", "blocked_by": [...], "assignees": [...]}],
  "awaiting_pick": [...], "excluded": [...]}`

A run that stopped at the § 1 question writes neither file.

## Rules

- Read-only in ClickUp, Slack, PostHog, Mango and GitHub. No comments, status changes or moves.
- ICMB account only. Never pull InventoryHero, JASON or InfinityVault data into this report.
- The ranking rule above is the only ranking; no judgement re-ordering. If the rule gives a wrong
  answer, change the rule here in a commit, not the output.
- Nothing guessed: a lane that couldn't be read is a blind spot, not "nothing new".
