# Google Drive Archiver

> Move it to the cloud before you delete it. Never lose a file to a cleanup again.

A self-contained Claude Code skill (and standalone CLI) that archives local
folders — Downloads, screenshots, screen recordings — to **your own** Google
Drive with an ironclad rule: **a local file is deleted only after its upload is
verified present in Drive.** If anything is unverified, the run exits and
deletes nothing.

Built and battle-tested on a real Mac: in one run it uploaded 150 files,
re-scanned Drive, confirmed `missing in Drive: 0`, and (because `--no-delete`
was chosen) kept every local copy.

## What's in the box

```
google-drive-archiver/
├── SKILL.md                 # How Claude Code should drive this skill
├── README.md                # You are here
├── DISCLAIMER.md            # Read before any live run — this can delete files
├── requirements.txt         # Python deps (Google API client)
├── .gitignore               # Keeps your tokens/credentials out of git
├── credentials/
│   └── README.md            # How to bring your OWN OAuth client (no secrets shipped)
└── scripts/
    ├── authenticate.py      # One-time OAuth browser flow → writes your token
    ├── archive_downloads.py # Archive ~/Downloads (verify-before-delete)
    ├── archive.py           # Archive a flat folder into a Drive folder by ID
    └── compare_files.py     # Read-only: what's local but not yet in Drive
```

No credentials, tokens, or personal folder IDs are included. You supply your
own Google OAuth client (`credentials/README.md`) — your data stays yours.

## Quick start

```bash
cd google-drive-archiver
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Bring your OAuth client — see credentials/README.md, then:
python3 scripts/authenticate.py        # browser authorize, one time

# Try it safely
python3 scripts/archive_downloads.py --dry-run      # plan only
python3 scripts/archive_downloads.py --no-delete    # upload + verify, keep local
```

## Safety model

- **Scope `drive.file`** — the app only sees files it created, never the rest
  of your Drive.
- **Recency filter** — `--max-age-days` (default 30) never touches recently
  modified files.
- **Verify-before-delete** — a recursive Drive re-scan must list every uploaded
  name before a single local byte is removed. Exit code `2` = safe exit,
  nothing deleted.
- **Your keys, your Drive** — nothing is uploaded anywhere except the Google
  account you authorize.

## Use with Claude Code

Drop this folder into `~/.claude/skills/google-drive-archiver/` (or your
project's `.claude/skills/`). Then ask Claude to "archive my Downloads to
Drive" — it will read `SKILL.md` and run the dry-run → confirm → live flow.

## License & disclaimer

MIT-style "as is", no warranty. **It can delete local files.** Read
[`DISCLAIMER.md`](./DISCLAIMER.md) first. You are responsible for your own
backups.

— A free Builder tool from [iCodeMyBusiness](https://icodemybusiness.com/free-tools)
