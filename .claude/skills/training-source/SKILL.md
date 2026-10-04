---
name: training-source
description: >
  Stage 1 of building an iCodeMyBusiness Skool training: turn a new recording or dictation from Matthew
  into a transcript, cited outline entries and tactic leads. Use when he says "I recorded a training",
  "new video in Raw Videos", "here's a dictation for a lesson", "add this to the outline", "ingest the
  trainings videos", or pastes a block of spoken notes for a lesson. Structures his words; never adds to them.
allowed-tools: [Read, Bash, Grep, Glob, Write, Edit]
---

# training-source — recording → transcript → outline → tactic leads

`KIT=.claude/skills/training-kit/bin` (from a worktree off `origin/main`). Run kit tools through
`$KIT/kit -t <module or training id> <tool> …` so the run lands in the usage ledger.

**Why this stage exists:** every later line of a lesson has to trace to something Matthew said. The
outline is the citation of record; a lesson can only be as good as what is captured here.

## Steps
1. **Find the source.**
   - Video: `~/.claude/skills/raw-video-transcript/transcribe.sh --list`, then
     `$KIT/kit -t <module> ~/.claude/skills/raw-video-transcript/transcribe.sh <name>` (local whisper, the
     script's default model; running it through `kit` logs the run). Output lands in Drive
     `Youtube Content Plan/Transcripts/<name>.txt` + `.srt`.
   - Dictation pasted in chat: save it verbatim to `Transcripts/<Pillar>-Dictation-<YYYY-MM-DD>.txt`
     (ask before writing into Drive; it is his folder) and treat it exactly like a transcript.
2. **Read the whole transcript.** Fix only obvious whisper errors, and note each fix inline
   (`"cloud" → Claude`), as the outline already does.
3. **Add outline entries** to `Skool Academy/academy-outline.md` under the right pillar — ping the module
   lane first if one is live (M1+M3 `clockify-and-writing`, M2+M4 `plan-on-paper-and-claude`):
   - one numbered item per training he described, in his order, title in his words;
   - his sentences quoted, each with a tag: a new `[TAG]` defined in the outline header for a new
     transcript file, or `P1 m:ss` style timestamps;
   - `[Matthew: …]` wherever a lesson would need something he did not say (a number, a price, a story,
     the *why*). Do not fill it.
4. **Bank tactic leads**, not tactics: list each candidate as `pillar · one line · source` for him to
   approve in `/admin/x`. The kit never writes to Convex. (`$KIT/tactics.py find <words>` shows what is
   already banked, so you do not propose duplicates.)
5. **Check and register.** `$KIT/academy.py check` must show 0 FAIL. If the training is new, it gets its
   permanent id when it first appears in Skool or gets a worksheet (`$KIT/ledger.py registry`).
6. **Report**: transcript path, the outline items added (line numbers), the `[Matthew: …]` gaps as a
   numbered list he can answer in one pass, the tactic leads.

## Never
Paraphrase him into a claim he did not make · invent a timestamp · move or rename the outline, the tsv or
any `.gdoc` · write to Convex · record time for him (his Clockify entries are his).

Next stage: `training-draft`.
