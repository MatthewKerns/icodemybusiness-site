# Quarterly Planner (EOS)

A founder's quarterly planning session, built on **EOS** (the Entrepreneurial
Operating System). It captures real context from your **Google Drive**, **Apple
Notes**, and **Claude history**, then walks the EOS quarterly pulse — review last
quarter → set 3–7 **Rocks** for the next 90 days → define a weekly **Scorecard**
→ produce a **90-day plan** and a **Level 10 meeting** agenda.

This is a **Claude skill**: drop the folder into your Claude Code skills
directory and ask Claude to "plan my quarter". Claude runs `SKILL.md`.

## Install

```bash
# Personal (all projects):
cp -r quarterly-planner ~/.claude/skills/
# or Project-local:
cp -r quarterly-planner .claude/skills/
```

Then in Claude Code: **"plan my quarter"** / **"set my rocks"** / **"run
quarterly planning"**.

## What it reads (all read-only)

| Source | How | Setup |
|--------|-----|-------|
| Claude history | `scripts/gather_claude_history.py` scans `~/.claude` for goals/themes | none |
| Apple Notes | `scripts/gather_apple_notes.sh` exports via AppleScript (macOS) | grant Automation access when prompted |
| Google Drive | `scripts/gather_drive.py` reads Docs / the V/TO (`drive.readonly`) | `credentials/README.md` (optional) |

It **never** writes to your Notes, Drive, or history — it only reads, then
writes a plan file into your working directory. See `DISCLAIMER.md`.

## Output

`quarterly-plan-YYYY-Qn.md` — your 1-year plan, this quarter's Rocks (owner /
due / how they ladder up), the weekly Scorecard, the Issues list, and a Level 10
agenda. Built from `templates/quarterly-plan-template.md`.

## Why EOS

EOS gives a small company **Traction** through two habits: **Rocks** (the few
90-day priorities that actually move the year) and a weekly **Level 10 Meeting**
run off a **Scorecard**. This skill makes the quarterly "pulse" — where you set
those Rocks — fast, grounded, and repeatable.
