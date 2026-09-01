---
name: disk-space-optimizer
description: >
  Recurring, safety-gated disk-space optimization sweep for a developer Mac.
  Use when the user reports low disk space, wants to reclaim headroom for more
  Docker/server projects, asks to "clean up my disk / free space / optimize disk
  usage", or wants a hands-off loop that watches disk and proposes cleanups.
  Measures first, then proposes tiered cleanups across Docker, screenshots,
  Downloads, and caches — and NEVER deletes or uploads anything without explicit
  per-iteration approval via AskUserQuestion. Archiving to Google Drive is
  delegated to the separate google-drive-archiver skill (verify-before-delete).
allowed-tools: Bash, Read, AskUserQuestion
---

# disk-space-optimizer

A recurring disk-space optimization sweep. Each iteration: **measure → (only if a
trigger fires) propose one batched cleanup → act only on explicit approval →
report what was freed.** When idle, it sleeps and rechecks.

## Companion skills

- **`docker-resource-manager/`** (bundled here) — Docker inventory, classification,
  and tiered reclaim. Read `docker-resource-manager/SKILL.md`.
- **`google-drive-archiver`** (separate skill, install alongside) — does all
  Google Drive uploads with verify-before-delete. The screenshot and Downloads
  tiers below call its scripts via the bash wrappers in `scripts/`.

## First-run setup

1. Install the `google-drive-archiver` skill and set
   `GOOGLE_DRIVE_ARCHIVER_DIR` (see its README; needs a `.venv` + your OAuth token).
2. `cp scripts/disk_maintenance.conf.example ~/.config/disk-optimizer/disk_maintenance.conf`
   and fill in `ARCHIVE_DRIVE_ID`, `PROTECTED_GLOBS` (your active projects), etc.
3. `chmod +x scripts/*.sh`

## 1. Measure (every iteration)

```bash
df -h /System/Volumes/Data                       # free GB — the number that matters on APFS
docker system df                                  # Docker reclaimable
du -sh ~/Downloads "$HOME/Desktop/ScreenShot Archive" 2>/dev/null
ls ~/Desktop/*.mov ~/Desktop/Screen\ Recording*.mov 2>/dev/null   # loose recordings
```

Report ONE line: free GB, Docker reclaimable, Downloads size, and what changed
since last iteration. If nothing crosses a trigger, that line is the whole
iteration — sleep.

## 2. Docker cleanup — trigger: reclaimable > 5 GB or free disk < 40 GB

Invoke `docker-resource-manager` to inventory → classify → propose a tiered
cleanup. Rules:

- **Never delete without explicit approval via AskUserQuestion** — show the exact
  list (stopped containers, dangling/unused images) and the GB each tier frees.
- **Never touch volumes** and never remove containers/images of a *running*
  compose stack (local dev DBs live in volumes).
- Fair game to propose: stopped containers idle > 7 days, dangling images,
  tagged images with no container referencing them, build cache (usually the
  biggest, safest win).

## 3. Screenshots / recordings — trigger: archive > 1 GB, loose recordings, or free < 40 GB

Uses `scripts/disk_maintenance_safe.sh` (wraps the google-drive-archiver;
verifies upload before deleting).

1. `scripts/disk_maintenance_safe.sh --screenshots-only --dry-run` — summarize.
2. Ask via AskUserQuestion.
3. On approval: `scripts/disk_maintenance_safe.sh --screenshots-only --force`
   — `--force` only replaces the script's interactive terminal prompt; your
   AskUserQuestion approval IS the confirmation. Never `--force` without it.
4. Loose recordings on the Desktop aren't auto-covered — list them and ask
   whether to move them into the archive folder first.

## 4. Downloads backup — trigger: ~/Downloads > 3 GB or free disk < 40 GB

Uses `scripts/disk_maintenance_downloads_safe.sh` (uploads to a "Downloads
Archive" Drive folder, verify-before-delete, default skips files < 30 days old).

1. `scripts/disk_maintenance_downloads_safe.sh --dry-run` — summarize the plan.
2. Ask via AskUserQuestion (offer "upload only, keep local" → adds `--no-delete`).
3. On approval: `scripts/disk_maintenance_downloads_safe.sh --force`
   (plus `--no-delete` if chosen).

## 5. Monthly cache tier — trigger: > 30 days since last sweep, or free < 30 GB

Caches regrow fast (a single tool's cache can hit several GB in weeks).

1. Measure: `du -sh ~/.cache/uv ~/.npm ~/Library/Caches/pip ~/Library/Caches/ms-playwright 2>/dev/null` and `brew --cache`.
2. Propose via AskUserQuestion with measured sizes (batched with other proposals).
3. On approval run ONLY these sanctioned commands:
   `uv cache prune`, `npm cache clean --force`, `brew cleanup --prune=all`, `pip3 cache purge`.
   **Note:** `~/.npm/_npx` (can hold running MCP servers) is NOT covered — only
   clear it if explicitly approved and never while MCP servers may be mid-session.
4. Stale repo artifacts: list (never auto-delete) node_modules/venvs whose repo
   `.git` mtime is > 60 days old, with sizes, for one-tap confirmation. Honor
   `PROTECTED_GLOBS`.
5. After the sweep: `date +%Y-%m-%d > ~/.disk_maintenance_logs/last_cache_sweep`.

## 6. After any live run

`tail -50` the newest log in `~/.disk_maintenance_logs/` and report space freed.
If a Drive upload or verification failed, **STOP** — do not delete anything,
report the failure, leave files in place.

## Hard guardrails

- No deletions outside the verify-before-delete scripts, the approved Docker
  tier list, and the sanctioned cache commands in §5. No `rm -rf` improvisation,
  no `docker system prune --volumes`.
- APFS purgeable space can swing free-GB readings by several GB. Compare the
  `used` column, not just `avail`, before alarming on a drop.
- One AskUserQuestion per iteration max — batch pending proposals into a single
  question.
- If the user declines a proposal, don't re-ask the same items; re-raise only if
  free disk drops another 10 GB.

## Pacing (when run as a `/loop`)

Disk state changes slowly. When idle, sleep the max (3600s). If approved work is
running or a dry-run awaits an answer, check back at ~270s. End only when told.

See `DISCLAIMER.md` before any live run.
