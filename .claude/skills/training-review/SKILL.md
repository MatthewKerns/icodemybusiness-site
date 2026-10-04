---
name: training-review
description: >
  Stage 3 of building an iCodeMyBusiness Skool training: review a drafted lesson or lesson pack before
  Matthew sees it, and hand him one approval sheet with verdicts and one-line decisions. Use when he says
  "review the lesson", "fact-check this training", "is this ready to paste", "run the gauntlet on…",
  "prepare the approval sheet", or after training-draft finishes. Scales the review to the risk of the lesson.
allowed-tools: [Read, Bash, Grep, Glob, Write, Edit, Agent, WebFetch, WebSearch]
---

# training-review — review angles → one approval sheet → reverify

`KIT=.claude/skills/training-kit/bin`.
`SKOOL="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/content/skool"` — the working
files (builds, packs, reviews) live untracked in the MAIN checkout, not in a worktree; this repo is public,
so never commit lesson text, time entries or prices.
Inputs: `$SKOOL/builds/<id>.md` (one lesson) or `$SKOOL/fix-first/packs/module-N.md`. Outputs go to `$SKOOL/fix-first/`.

**Why:** his standard is "the best training you can get", and he reads nearly every line himself. The
review exists so his reading time goes to judgement, not to catching things a check could have caught.

## Pick the depth (say which you picked and why)
- **Light** — a lesson built only from his own recorded method (most of Modules 1–3): lint, one
  adversarial pass, the approval sheet.
- **Full gauntlet** — a lesson that states vendor facts, steps in someone else's product, or anything
  about money, results or the business (the 4.1 accountability email, AI Audit Fundamentals): three
  independent angles, then reverify rounds until no blocker remains.

## Steps
1. `$KIT/academy.py lint $SKOOL/builds/<id>.md` → 0 FAIL before any reviewer runs. Lint the BUILD (it carries
   SOURCES and the SOURCE MAP); a pack has its tags stripped for pasting and cannot pass the lint, so for
   a pack, lint the build behind each of its lessons.
2. **Review angles** — independent agents that do not see each other's output; sonnet unless noted:
   - `review-<id>-adversarial.md`: build the lesson from the draft alone as a first-week member; every
     guess, missing step or place a beginner stops is a finding.
   - `review-<id>-factcheck.md` (full only): trace every claim to its source line or timestamp; re-read
     every vendor page raw (not through a summarizer) on the day; uncited = cut.
   - `review-<id>-prose.md` (full only): his format (`reference/lesson-format.md`), plain words, one idea
     per lesson, no promise, price, duration or result (`docs/copy-principles.md`).
3. **Approval sheet** `approval-sheet-<id>.md` (opus): one verdict per lesson — APPROVE / APPROVE-WITH-FIXES
   / NOT READY — five numbered reasons at most, then a numbered list of decisions only he can make, each
   answerable in one line. Say what you checked yourself and what you did not.
4. **Apply his answers**, then `reverify-<n>.md`: the same reviewers re-check their own findings by
   number (continue them; do not respawn). Stop when no blocker is left or a decision is his.
5. **Marker sweep** before anything is called paste-ready: no `[Matthew`, `[DECIDE`, `[S#]`, `[I#]`,
   "needs banking" in member-facing text (`grep -n`).
6. **Report**: verdict per lesson, what is open for him, files written.

## Never
Mark a lesson ready with an open `[Matthew: …]` in member text · settle a business claim yourself ·
skip the raw re-read of a vendor page in a full review · treat an agent's "verified" as verified
without the command or line it cites.

Next stage: `training-publish`.
