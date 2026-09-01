---
name: google-drive-archiver
description: >
  Archive local folders to your own Google Drive with verify-before-delete
  safety. Use when the user wants to back up Downloads, screenshots, or screen
  recordings off-machine, free local disk by moving (not just copying) files to
  Drive, or asks to "archive to Drive / upload to Google Drive / back up before
  deleting / move old downloads to the cloud". The hard rule: a local file is
  deleted ONLY after its upload is confirmed present in Drive by a recursive
  re-scan. Pairs with the disk-space-optimizer skill, which calls this one for
  its screenshot and Downloads tiers.
allowed-tools: Bash, Read, AskUserQuestion
---

# google-drive-archiver

## Overview

Move local files to **your** Google Drive safely. Every flow is
**upload → verify → (only then) delete**. If verification finds a single
uploaded name missing from Drive, the run exits without deleting anything.

OAuth scope is `drive.file`: the app can only touch files **it** created.
It never reads the rest of your Drive.

## One-time setup

1. `python3 -m venv .venv && source .venv/bin/activate`
2. `pip install -r requirements.txt`
3. Drop your OAuth client at `credentials/credentials.json`
   (see `credentials/README.md`).
4. `python3 scripts/authenticate.py` — browser flow, writes
   `tokens/google_drive_token.json`. **You** run this; it can't be done headless.

Token expired (`invalid_grant`)? Re-run `scripts/authenticate.py`.

## The scripts

| Script | Job |
|---|---|
| `scripts/authenticate.py` | One-time / re-auth OAuth browser flow → writes the token. |
| `scripts/archive_downloads.py` | Archive `~/Downloads`: loose files routed by type, subdirs zipped, recursive verify, optional delete. The workhorse. |
| `scripts/archive.py` | Archive a flat folder (e.g. a screenshot archive) into a Drive folder by ID, auto-routing screenshots vs recordings. |
| `scripts/compare_files.py` | Read-only diff: what's local but **not** in a Drive folder. Used to verify before any delete. |

## Safe Downloads archive — the main flow

Always dry-run first.

```bash
# 1. Plan only — no Drive calls, no deletions
python3 scripts/archive_downloads.py --dry-run

# 2. Upload + verify, but KEEP local copies (safest live run)
python3 scripts/archive_downloads.py --no-delete

# 3. Upload + verify + delete locally (only after you've trusted it)
python3 scripts/archive_downloads.py --force
```

Key flags: `--max-age-days N` (default 30 — never touches recently-modified
files/dirs), `--no-delete` (upload only), `--force` (skip the interactive
confirm — use **only** when an outer approval already happened), `--dry-run`.

Exit codes: `0` = success, `2` = **safe exit** (something unverified — local
files preserved on purpose), other = failure. On `2` or failure: **stop, do
not delete, report.**

## Verify a folder before trusting deletion

```bash
python3 scripts/compare_files.py "<local_folder>" "<drive_folder_id_or_url>"
# Prints "✅ All local files are present in Google Drive!" or lists what's missing.
```

## Guardrails (do not break)

- Never delete a local file whose name isn't confirmed in a fresh recursive
  Drive scan.
- Never pass `--force` unless the user (or an outer skill's AskUserQuestion)
  has explicitly approved this exact deletion.
- Recently-modified files are out of scope by default (`--max-age-days`).
- Never commit or transmit `credentials/credentials.json` or
  `tokens/*.json`. They are git-ignored for a reason.

See `DISCLAIMER.md` before any live run.
