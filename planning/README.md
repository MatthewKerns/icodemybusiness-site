# planning/ — planning-meeting transcripts and digests

Every planning conversation that bears on how this business is run — Fireflies voice notes,
Fathom calls — stored chronologically, so a later session plans from what Matthew actually
said instead of from memory. Planning is everything; this is its record.

**Never committed.** This repository is PUBLIC. `transcripts/` and `digests/` are excluded
from git (`.git/info/exclude` now; `.gitignore` once that PR merges). Only this README and
`bin/` are tracked. Nothing under `transcripts/` or `digests/` goes into a commit, a PR, a
Skool post, a ClickUp task body, or a chat with a third party. Quote from them into
decisions, not into public surfaces.

## Layout

```
planning/
  README.md
  bin/index.py                 rebuilds transcripts/INDEX.md from file frontmatter
  transcripts/
    INDEX.md                   generated: chronological table of every stored recording
    _skipped_<cluster>.md      recordings looked at but not stored (personal/medical/family)
    2026-09-26_1311_fireflies_01M3FNFX3YXKKPQTHF5TKSG6AV.md
    2026-10-02_fathom_189230400_matt-abhi.md
    ...
  digests/
    skool/
      2026-10-11_fathom-skool-statements.md
      2026-10-11_skool-current-state.md
      2026-10-03_01M41YV5BJATDWN3S68RW3CZF7.md   one per recording that touches the plan
      ROLLUP.md                synthesized, cited; the input to any Skool plan
```

## File naming

`YYYY-MM-DD_HHMM_<source>_<id>[_<slug>].md` in the recording's local Pacific time.
`HHMM` is omitted when the source gives only a date (Fathom). `<source>` is `fireflies` or
`fathom`. `<id>` is the source's own id, so the file can always be traced back.

## Frontmatter (every transcript file)

```
---
id: 01M41YV5BJATDWN3S68RW3CZF7
source: fireflies            # fireflies | fathom
account: <the connector's account email>
date_local: 2026-10-03 15:41 PT
date_utc: 2026-10-03T22:41:04Z
duration_min: 4
title: "Oct 03, 03:41 PM"
participants: [Matthew Kerns]       # as labelled; "solo" for a voice note
url: https://app.fireflies.ai/view/01M41YV5BJATDWN3S68RW3CZF7
topics: [skool, offer, tiers]
relevance: yes                      # yes | partly | no  (to the business plan)
---
```

Body: `## Summary (source)` (the tool's own summary and action items, verbatim), then
`## Transcript` — the raw timestamped transcript exactly as the tool returned it. Never edit
transcript text; corrections go in a digest.

## Adding a recording

1. Pull with the connector: Fireflies `fireflies_get_summary` + `fireflies_get_transcript`;
   Fathom `get_meeting_summary` + `get_meeting_transcript`.
2. Write the file with the frontmatter above. If the tool result was saved to a file because
   it was large, build the store file from that file (header + `cat`), don't retype it.
3. `python3 planning/bin/index.py` to rebuild `transcripts/INDEX.md`.
4. Purely personal, medical or family recordings are not stored: one line in
   `_skipped_<cluster>.md` (`date | id | why`) and nothing else.

## Digests

One per recording that touches a plan: `digests/<area>/YYYY-MM-DD_<id>.md`. Matthew's own
statements only, each as a verbatim quote of 25 words or fewer with `mm:ss` and a deep link
(`https://app.fireflies.ai/view/{id}?t={seconds}`), grouped by (A) content pipeline,
(B) classroom roadmap, (C) offer & tiers, (D) community operations, then numbers stated and
contradictions. Someone else's suggestion is tagged `[OTHER: name]`; an unclear speaker
`[SPEAKER UNCERTAIN]`. A tentative remark stays tentative; nothing is upgraded into a
commitment. `ROLLUP.md` merges the digests chronologically and is what a plan cites.
