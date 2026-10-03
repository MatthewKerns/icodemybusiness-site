---
name: training-kit
description: >
  The training-builder's toolkit for the iCodeMyBusiness Skool Academy — one preflight, then separate
  tools for each job: video clips (ffmpeg + whisper), diagrams (house-style PNG, linted), Google Docs,
  Google Sheets workbooks, the tactics knowledge base, and the training↔worksheet citation checker.
  Use when building or fixing a training, worksheet, lesson pack, clip, diagram or workbook; when the
  user says "training kit", "build a training", "cut a clip", "make a diagram", "build the workbook",
  "look up a tactic", "check the citations", or when a session runs `/team training-builder`.
  Builds locally and reads freely; every publish (Drive, Skool, YouTube) is Matthew's gate.
allowed-tools: [Read, Bash, Grep, Glob, Write, Edit]
---

# training-kit

Everything is in `bin/` (run from this directory or by full path). Start every session with:

```bash
bin/doctor.sh            # what's ready / missing, in one screen (read-only)
bin/tactics.py sync      # refresh the tactics cache from LIVE Convex (neat-hamster-414)
bin/academy.py check     # outline ↔ tsv ↔ Drive Docs ↔ tactics integrity
```

| Job | Tool | Output | Publish lane (human gate) |
|---|---|---|---|
| Know the training before you touch it | `academy.py brief 2.1` | Doc row, tactics joined by Doc URL, outline item in Matthew's words, citation tags | — |
| Tactics knowledge base | `tactics.py find|show|pillar|stats` | rows from the cache | — |
| Citations on a draft | `academy.py lint draft.md` | FAIL/WARN per line | — |
| Video clip | `clip.py frames|words|build|qa` | 1920×1080 MP4, burned captions, −14 LUFS | Matthew uploads to Skool / YouTube |
| Diagram | `diagram.py spec.json` | SVG + HTML + 2800×1580 PNG | into a Doc / Skool lesson with the training |
| Card / graphic | `render.py page.html` | PNG (1400×790 @2× default) | same |
| Google Doc | `docbuild.py draft.md` | Docs-ready HTML | A: app `createDocFromMarkdown` · B: Drive connector |
| Google Sheet workbook | `workbook.py spec.json` | styled `.xlsx` | Drive connector → native Sheet |

**Google Suite for everything shared** (Matthew, 2026-10-02): Docs for worksheets, lesson packs and
briefs; Sheets for trackers and workbooks. Members get the `/copy` link. Nothing is shared as .docx,
.xlsx, PDF or a local file. Sharing settings are Matthew's to change — never the kit's.

## Sources of record (read; never move)
Drive desktop mount `~/Library/CloudStorage/GoogleDrive-12kernsmatthew@gmail.com/My Drive/iCodeMyBusiness/`:
`Skool Academy/academy-outline.md` (Matthew's words, the citation of record) · `Skool Academy/worksheet-links.tsv`
(Doc URL = join key) · `Skool Academy/Skool Worksheets/Module N · …/` · `Youtube Content Plan/Transcripts/`
(`raw-video-transcript` skill writes here) · `Youtube Content Plan/Raw Videos/`. Build spec for the 30-training
build-out: `content/skool/goal-prompt-skool-buildout.md` (main checkout, untracked; owner: value-delivery).

## Citations — the convention every draft line follows
A line that states a fact about how Matthew works carries one of:
`[BT] [WC] [P2D] [P4D]` (transcript tags defined in the outline header) · `(P1 m:ss)` / `(P2 m:ss)`
(AcademyOutline videos) · `[CLK-003]` (tactic id; a *pending* tactic is a lead to the transcript, not a
source on its own) · `[Fathom <call-id> m:ss]` (his segment, unpaid-client call only) · `[tsv 2.1]` (a
worksheet row) · `[Matthew: …]` (open — he must say it; list it for his sign-off). A quotation with no
citation is a FAIL; a number, duration or absolute ("every", "always") with none is a WARN under
`docs/copy-principles.md` §2. Two independent angles per claim where the goal prompt asks for it.
Worksheets link trainings by the tsv Doc URL; trainings cite worksheets as `[tsv N.T]`; a tactic links
its worksheet in Convex (`worksheetUrl`). `academy.py check` proves the three agree.

## Video (`clip.py`)
Proven on 2026-10-02 (value-delivery's Skool intro v10, generalized here; `reference/intro-v10/`).
1. Transcribe raw recordings first: `~/.claude/skills/raw-video-transcript/transcribe.sh <name>`.
2. `clip.py frames <video> 11:40 34:30` → look at the frames; set `host_crop` to Matthew's tile.
3. `clip.py words <video> 11:38 12:12` → cut on word timings (Fathom times mark turn starts only).
4. Write the cut spec (`clip.py --example`), `clip.py build cut.json`, then **always** `clip.py qa out.mp4`
   and read the transcript and two frames before calling it done.
Layouts: `full` (his own recording) · `face` (his tile cropped beside a card) · `audio` (his voice over a
card — any frame with someone else, or an internal screen share). Guardrails: Matthew's segments only;
zero guest voice or face; no client names, rates, money figures or third parties; Fathom only from
clients Mango classifies as unpaid. Sniper is out (its Docker renderer is broken); Remotion
(`~/workspace/agency-operations/video-studio`) needs `npm ci` and is not needed for clips.
Laptop RAM CRIT: keep builds short, run with `nice`, one at a time.

## Diagrams (`diagram.py`) — the retrofitted diagram builder
Input is the `diagrams@cc-plugins` JSON schema (nodes / connections / groups), so a spec written for
`/diagrams:drawio` renders here too; that plugin stays the way to get an editable `.drawio`. Types:
`flowchart` (LR/TD, back-edges routed around boxes), `swimlane`, `loop`, `hub`. Rules it enforces, and why:
- `source` required — a diagram is content; it cites like a sentence does.
- ≤9 nodes (WARN), ≤12 (FAIL) — one idea per picture for a first-week member.
- Text ≥18px at 1400 wide, nothing overlapping, nothing off-canvas, no label colliding with a node —
  the three 2026-09-02 diagram defects (`docs/ENGINEERING_LOG.md`) were all geometry.
- Every decision branch labelled; every label a short outcome, not internal process (copy-principles §1).
- Digits in labels WARN — numbers are Matthew's; the `source` must carry them.
- Tokens only (`assets/base.css`): bg #0A0A0A, panel #141414, line #2A2A2A, gold #D4AF37/#E8C84A,
  ink #F2EEE3, muted #A39E92; Anton titles, IBM Plex Sans labels, IBM Plex Mono kicker.
Then LOOK at the PNG — the linter measures geometry, not meaning.

## Docs (`docbuild.py`)
Lint first (`academy.py lint`). Lane A — a worksheet that belongs in the tsv: `docbuild.py draft.md
--worksheet --title "N.T Title"` prints the `createDocFromMarkdown` command (app-owned Doc in `Skool
Worksheets/`; then move it into its module folder on the mount — moving keeps the id — and append the
tsv row; ping the lane owner first). Lane B — any other shared Doc: `docbuild.py draft.md` writes HTML;
upload with the Drive connector `create_file` (`contentMimeType: text/html` converts to a native Doc).
Lane B's first upload on 2026-10-02 was **denied by the auto-mode classifier** — it needs Matthew to
allow `mcp__claude_ai_Google_Drive__create_file` (or approve the call) before it works unattended.

## Workbooks (`workbook.py`)
`workbook.py --example > spec.json`, edit, `workbook.py spec.json` → `.xlsx` with a black/gold header,
frozen header row, gold input columns, dropdowns, filled-down formulas, totals, and a Sources sheet.
Upload: connector `create_file` with `base64Content` and contentMimeType
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` → native Google Sheet. Verified
2026-10-02: formulas and totals survived conversion (test Sheet trashed after).

## Never
Publish to Skool/YouTube, change Drive sharing, move or rename the outline/tsv, write another lane's Docs
or tsv rows, author a claim about the business, cite a guest, or run `npx convex dev/deploy`. Reads of
Convex go through `tactics.py sync` only.
