---
name: training-draft
description: >
  Stage 2 of building an iCodeMyBusiness Skool training: draft one lesson and its worksheet in Matthew's
  own lesson format, cited to his recordings, with gaps left for the parts only he can write. Use when
  he says "draft the lesson for…", "build out the training on…", "write the worksheet for 2.4", "make a
  lesson from the outline", "build the next training", or assigns a training by id or title. Also covers
  the optional pieces: diagram, clip, workbook, check-your-knowledge quiz.
allowed-tools: [Read, Bash, Grep, Glob, Write, Edit]
---

# training-draft — one lesson + worksheet, in his format

`KIT=.claude/skills/training-kit/bin`. **Read `.claude/skills/training-kit/reference/lesson-format.md`
first** — it is the format, drawn from the lessons he rewrote himself on 2026-10-03. Set
`export TRAINING_ID=<registry id or module>` and run kit tools as `$KIT/kit <tool> …` so usage is logged.
`SKOOL="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/content/skool"` — the working
files (builds, packs, reviews) live untracked in the MAIN checkout, not in a worktree; this repo is public,
so never commit lesson text, time entries or prices.

## Steps
1. **Know the training before writing.** `$KIT/academy.py brief <N.T or words>` (worksheet row, tactics
   joined by Doc URL, his outline item, citation tags) and `$KIT/tactics.py find <words>`. A pending
   tactic is a lead to his words, not a source.
2. **Check what is live.** `$KIT/skool.py lessons` — if the lesson already exists in the Classroom and he
   has edited it (`skool.py history <words>`), you are drafting a *proposed change*, not a replacement.
   Ask for a fresh snapshot if the last one is older than his last edit session.
3. **Draft** to `$SKOOL/builds/<training_id>.md`:
   - PART 1 lesson page in his shape: proposed concept title · **Expected Lesson Outcome:** · his concept
     section (only his recorded words, cited; `[Matthew: your story / rule here — …]` where it needs him)
     · **Pro Tip:** drafted on one real quote · **Do this** (4–6 numbered steps with blanks) · **You are
     done when** · **Post your check-in (in the community)** · **Resources**.
   - PART 2 worksheet: the same Do-this questions with `Answer: ____` lines, "unknown / none yet" allowed.
   - `# SOURCES` (`- [S1] transcript file + line or timestamp`), `# SOURCE MAP` if tags are stripped
     from publish-ready text, `# OPEN ITEMS FOR MATTHEW`.
   - Talk to the member as "you". No third-person narration of him outside quotes. No first-person
     anecdote, habit, number, price, duration or result written for him.
4. **Lint.** `$KIT/academy.py lint $SKOOL/builds/<training_id>.md` → 0 FAIL. Every WARN is a
   quote or number to check against its source by hand.
5. **Optional pieces, only if the lesson needs them:**
   - diagram: `$KIT/kit diagram.py spec.json` (needs `source`; look at the PNG);
   - clip from his recording: `$KIT/kit clip.py frames|words|build|qa` (his segments only);
   - workbook: `$KIT/kit workbook.py spec.json` → Google Sheet;
   - check-your-knowledge quiz: `quiz.py` is on PR #13 and not in the kit until that merges — skip it until then.
6. **Worksheet Doc** (human gate): after his OK on the draft, copy PART 2 ONLY into
   `$SKOOL/builds/<training_id>.worksheet.md` (no lesson page, SOURCES, SOURCE MAP or OPEN ITEMS; no tags or
   `[Matthew: …]` markers left), then `$KIT/docbuild.py $SKOOL/builds/<training_id>.worksheet.md --worksheet
   --title "<title>"` prints the app command that creates the native Doc; then file it in its module
   folder, append the tsv row (ping the lane), `$KIT/academy.py check`, `$KIT/ledger.py registry`.
7. **Hand to review** with: the build path, lint output, the `[Matthew: …]` list, what you could not source.

## Never
Fill a `[Matthew: …]` gap · reuse the old "What you will finish / Why this matters" labels · draft over a
lesson he has rewritten without showing the diff as a proposal · create Docs or touch Drive sharing
without his go.

Next stage: `training-review`.
