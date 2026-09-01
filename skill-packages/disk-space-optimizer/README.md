# Disk Space Optimizer

> Your Mac's disk, on autopilot — measures, proposes, and reclaims gigabytes
> without ever deleting behind your back.

A recurring, safety-gated disk-cleanup toolkit for developer Macs. It watches
free space and, only when a threshold trips, proposes one batched cleanup across
**Docker, screenshots, Downloads, and caches**. Nothing is deleted or uploaded
without your explicit approval, and everything that leaves local disk is first
**verified present in your Google Drive**.

Real result from a single live run on the author's machine: **+12 GB freed**
(19 GB → 31 GB), `uv` cache `7.6 GB`, stale Docker `~5 GB`, and 150 Downloads
archived to Drive with `missing in Drive: 0` — kept local because "upload only"
was chosen.

## What's in the box

```
disk-space-optimizer/
├── SKILL.md                         # The loop logic Claude Code follows
├── README.md                        # You are here
├── DISCLAIMER.md                    # Read first — this toolkit can delete files
├── scripts/
│   ├── disk_maintenance_safe.sh             # Screenshots/recordings → Drive (verify-before-delete)
│   ├── disk_maintenance_downloads_safe.sh   # ~/Downloads → Drive (verify-before-delete)
│   └── disk_maintenance.conf.example        # Copy to ~/.config/disk-optimizer/ and edit
└── docker-resource-manager/         # Bundled sub-skill: safe Docker reclaim
    ├── SKILL.md
    └── references/lessons-from-may-2026.md
```

Personal paths, project names, and Drive folder IDs are **not** hard-coded —
they're configuration. No secrets are included.

## Requires

- macOS (uses `df -h /System/Volumes/Data`, `~/Library/Caches`).
- The companion **`google-drive-archiver`** skill for the Drive-archiving tiers
  (set `GOOGLE_DRIVE_ARCHIVER_DIR`). The Docker and cache tiers work without it.
- Docker Desktop (only for the Docker tier).

## Quick start

```bash
# 1. Install alongside the google-drive-archiver skill, then configure:
mkdir -p ~/.config/disk-optimizer
cp scripts/disk_maintenance.conf.example ~/.config/disk-optimizer/disk_maintenance.conf
$EDITOR ~/.config/disk-optimizer/disk_maintenance.conf      # set ARCHIVE_DRIVE_ID, PROTECTED_GLOBS
chmod +x scripts/*.sh

# 2. Always dry-run first
scripts/disk_maintenance_safe.sh --dry-run
scripts/disk_maintenance_downloads_safe.sh --dry-run

# 3. Live, but keep local copies (safest)
scripts/disk_maintenance_downloads_safe.sh --no-delete
```

## Run it as a hands-off loop (Claude Code)

Drop this folder into `~/.claude/skills/disk-space-optimizer/`, then:

```
/loop optimize my disk space
```

Claude reads `SKILL.md` and runs the measure → propose → approve → report cycle,
sleeping between iterations. It asks **once per iteration**, batched, before
touching anything.

## Safety model

- **Measure before acting**; thresholds gate every tier.
- **One AskUserQuestion per iteration** — explicit approval required.
- **Verify-before-delete** for everything archived to Drive (exit code `2` =
  safe exit, nothing deleted).
- **`PROTECTED_GLOBS`** keeps your active projects' `node_modules` off-limits.
- **Volumes are sacred** — the Docker sub-skill never proposes volume deletion
  unprompted.
- **APFS-aware** — compares `used`, not just `avail`, to ignore purgeable-space noise.

## License & disclaimer

MIT-style "as is", no warranty. **This toolkit can permanently delete files and
Docker resources.** Read [`DISCLAIMER.md`](./DISCLAIMER.md) first. Always
`--dry-run`, always keep backups.

— A free Builder tool from [iCodeMyBusiness](https://icodemybusiness.com/free-tools)
