---
name: training-publish
description: >
  Stage 4 of building an iCodeMyBusiness Skool training: assemble approved lessons into a paste-ready
  pack, protect the lessons Matthew has edited live, and verify the Classroom after a paste. Use when he
  says "get these ready to paste", "what's safe to paste", "prepare the pack for Module 2", "verify the
  Classroom", "did the paste land", "sync the worksheets with my Skool edits", or after training-review
  approves lessons. It prepares and verifies; pasting itself is his call each time.
allowed-tools: [Read, Bash, Grep, Glob, Write, Edit]
---

# training-publish — paste-ready pack, protect his edits, verify

`KIT=.claude/skills/training-kit/bin`.
`SKOOL="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/content/skool"` — the working
files (builds, packs, reviews) live untracked in the MAIN checkout, not in a worktree; this repo is public,
so never commit lesson text, time entries or prices.
**His live Classroom text is newer than any pack or Doc.** He edits there directly, so a pack older than
his last edit is stale by definition. (Whether the Classroom is formally the source of record is his
decision — `training-kit/reference/lesson-format.md` § Open.)

## Steps
1. **Fresh snapshot first.** `$KIT/skool.py status`; if he has edited since the last capture (or you
   cannot tell), take one — it needs his logged-in Skool tab and the Claude Chrome extension
   (`training-ledger` skill, "Skool snapshot"). Then `$KIT/skool.py diff` and `$KIT/skool.py lessons`.
2. **Build the do-not-overwrite list.** Any live lesson whose fingerprint changed after the pack was
   written, or that he created himself (no pack lesson behind it), is HIS. List them at the top of the
   pack. Approved text for those lessons goes to him as a proposed change, never into a paste.
3. **Assemble** `$SKOOL/fix-first/packs/module-N.md`: internal header (Source, Cleaned, Status,
   Held, Tiers, Decisions before paste) above the first `---`; then `# PASTE-READY`, `ALREADY LIVE IN
   CLASSROOM — do not paste`, `HOLD`. Each paste-ready lesson is complete: title, body in his format,
   one `Worksheet (make a copy)` link ending in `/copy`.
4. **Pre-paste checks**: every paste-ready lesson body is PART 1 of a build that linted 0 FAIL
   (`$KIT/academy.py lint $SKOOL/builds/<id>.md` — the pack itself has no tags and cannot be linted); marker sweep (`grep -n '\[Matthew\|\[DECIDE\|\[S[0-9]\|\[I[0-9]'`
   on the paste-ready part → nothing); every worksheet link is a Doc in `worksheet-links.tsv`.
5. **Paste — a human gate, every batch.** Default: he pastes by hand from the pack. An agent pastes only
   on his explicit go for that batch, through his own tab, and only into the lessons on the paste list.
6. **Verify after the paste**: new snapshot → `$KIT/skool.py diff` shows exactly the lessons pasted,
   nothing retitled or removed; each has one worksheet resource; no lesson is titled "New page" or empty.
   **Completeness:** for each pasted lesson compare the snapshot's word and character counts
   (`$KIT/skool.py lessons`) with the same counts for its pack text; where they differ, read that lesson in
   his tab and compare it with the pack paragraph by paragraph (in the tab — lesson text does not go to
   disk). Write `$SKOOL/fix-first/verify-classroom-<date>.md` with the diff output and the per-lesson counts.
7. **Worksheet resync report.** After his rewrite passes: `$KIT/ledger.py drift` lists each live lesson,
   whether a worksheet is linked, and whether the lesson was edited after its Doc. What to do about drift
   is his decision; propose, do not relink.
8. `$KIT/ledger.py registry` so new lessons get permanent ids.

## Never
Paste over a lesson on the do-not-overwrite list · paste without a same-day snapshot · change tiers,
drip, course settings or Drive sharing · sign in to Skool in an automated browser · scrape Skool logged-out.

Usage and history: `training-ledger`.
