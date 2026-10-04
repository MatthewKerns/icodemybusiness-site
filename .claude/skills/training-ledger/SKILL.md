---
name: training-ledger
description: >
  Track what building iCodeMyBusiness trainings actually takes: Matthew's Clockify time, Claude Code
  usage, Claude project time, Higgsfield credits, other paid and free tools, worksheet Doc changes, and
  the change history of every Skool lesson. Use when he says "snapshot Skool", "what changed in the
  Classroom", "update the training ledger", "how much time went into trainings", "training usage report",
  "what did Module 2 cost", "log 30 minutes in the Claude project", "which tools am I paying for", or at
  the start and end of any training-building session. Reads only; it never edits Skool, Clockify,
  Higgsfield or Drive.
allowed-tools: [Read, Bash, Grep, Glob, Write]
---

# training-ledger — usage signals + Skool history, one ledger

`KIT=.claude/skills/training-kit/bin`. Ledger: `~/.icmb-training/ledger/` (`events.jsonl`, `trainings.tsv`
registry, `tools.tsv`, `skool/snapshots/`). Local, not in git. Event shape: `$KIT/ledgerlib.py`.
Three sources exist only inside a Claude session (Mango, Higgsfield, the artifact list), so this runs
in-session; nothing here can run from cron.

## Full update (run in this order)
1. **Skool snapshot** — needs his logged-in Skool tab + the Claude Chrome extension connected
   (`list_connected_browsers`; if empty, ask him to open the extension signed in to this session's account).
   - new tab in the session's tab group → `https://www.skool.com/icodemybusiness/classroom`
   - `$KIT/skool.py capture-js` prints two snippets: run 1 with `javascript_tool` (returns lesson counts),
     run 2 (renders one line per lesson into that tab), then `get_page_text`
   - save the lines to a scratch file → `$KIT/skool.py import <file>` → close the tab
   - read-only, ~3 pages per second; it stores titles, ids, dates, word counts and a text fingerprint,
     not the lesson text. Never sign in to Skool in Playwright; never scrape logged-out.
2. **Registry**: `$KIT/ledger.py registry` (permanent ids; re-keys Skool and Doc events).
3. **Clockify** — call `mcp__claude_ai_Mango__get_time_entries {start, end, client_name:"iCodeMyBusiness"}`.
   The result is too large for context and the harness saves it to a file: pass that path to
   `$KIT/ledger.py clockify <file>`. An entry counts as training only if its description says so.
4. **Claude Code**: `$KIT/ledger.py claude-code <start> <end>` (add `--all-projects` for other config dirs).
5. **Higgsfield** — `mcp__claude_ai_Higgsfield__transactions {size:100}` (+ `show_generations` to read
   prompts when a spend is not obviously a cover). Read-only tools ONLY: never `generate_*`, `upscale_*`,
   `create_*`. Write the spends as TSV (`created_at, credits, n, model, training_id or -, note`) and
   `$KIT/ledger.py higgsfield <file.tsv>`. A spend is academy work only when its prompt says so.
6. **Artifacts**: `Artifact {action:"list", limit:50}` → save only the training-related lines →
   `$KIT/ledger.py artifacts <file>` (personal artifacts never enter the ledger).
7. **Worksheet Docs**: `$KIT/ledger.py gdocs` (Drive mount; the first run only records a baseline, later
   runs report Docs changed since). `$KIT/ledger.py drift` shows lesson-vs-worksheet drift at any time.
8. **Subscriptions**: once a month, `$KIT/ledger.py subscriptions <YYYY-MM>`; `$KIT/ledger.py tools` lists
   what is paid, what is free and which prices are still unknown. Prices are his to state — edit
   `tools.tsv` only with a figure he gave.
9. **Manual lines** for what no tool can see (claude.ai Projects and chats, Apps Script runs, anything
   done by hand): `$KIT/ledger.py log --source claude_project --qty 0.5 --unit hours --training m2 --note "…"`.
10. **Report**: `$KIT/ledger.py report [<start> <end>]` — by signal, by module, lessons changed, by day,
    and the gaps.

Free kit tools log themselves when run as `$KIT/kit [-t <id>] <tool> …` (a tool outside the kit works too:
`$KIT/kit -t m2 ~/.claude/skills/raw-video-transcript/transcribe.sh <name>`).
This repo is public: the ledger, the registry, prices and anything quoted from a lesson stay in
`~/.icmb-training/`, never in git.

## Reading the report honestly
- Hours are his Clockify entries; module is the finest grain his descriptions give. A convention like
  `M2: …` at the start of a description would make it exact — his choice.
- Claude Code numbers are whole session-days that touched training files: a heuristic, and mixed-purpose
  sessions overstate it. No dollar figure: he is on subscription plans.
- Skool records no author or revision history. A change is known only between two snapshots, so the
  history starts at the first snapshot (2026-10-04) plus Skool's own created/updated dates.
- "Unknown" and "unassigned" are answers. Never fill a price, a training id or a cause by guessing.

## Never
Write to Clockify, Skool, Higgsfield, ClickUp or Drive · spend credits · put a dollar figure on tokens ·
record personal artifacts, client names or other clients' time entries · move lesson text to disk in bulk
(refused by the safety check on 2026-10-04; ask him if he wants that archive and how).
