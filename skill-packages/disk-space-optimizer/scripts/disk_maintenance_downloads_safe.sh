#!/bin/bash
# Safe Downloads Archive — uploads ~/Downloads to Google Drive with
# verify-before-delete safety. Thin wrapper around the google-drive-archiver
# skill's archive_downloads.py.
#
# Portable config (override via env or ~/.config/disk-optimizer/disk_maintenance.conf):
#   GOOGLE_DRIVE_ARCHIVER_DIR  where you installed the google-drive-archiver skill
#                              (must contain .venv/ and scripts/archive_downloads.py)

set -u

# ── Load optional config file ────────────────────────────────────────────────
CONF="${DISK_MAINT_CONF:-$HOME/.config/disk-optimizer/disk_maintenance.conf}"
[ -f "$CONF" ] && source "$CONF"

LOG_DIR="${DISK_MAINT_LOG_DIR:-$HOME/.disk_maintenance_logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/downloads_${TIMESTAMP}.log"
GOOGLE_DRIVE_DIR="${GOOGLE_DRIVE_ARCHIVER_DIR:-$HOME/.claude/skills/google-drive-archiver}"
PY_SCRIPT="$GOOGLE_DRIVE_DIR/scripts/archive_downloads.py"
TOKEN_FILE="$GOOGLE_DRIVE_DIR/tokens/google_drive_token.json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

DRY_RUN=false
FORCE=false
NO_DELETE=false
MAX_AGE_DAYS=30

usage() {
    cat <<EOF
Safe Downloads Archive

Usage: $0 [OPTIONS]

Options:
  --dry-run           Show what would be archived without touching Drive or disk
  --force             Skip all confirmation prompts (use with caution)
  --no-delete         Upload + verify but never delete local files
  --max-age=DAYS      Skip files/dirs modified within this many days (default: 30)
  --help              Show this help

Env:
  GOOGLE_DRIVE_ARCHIVER_DIR   Path to the google-drive-archiver skill install
                              (default: \$HOME/.claude/skills/google-drive-archiver)

Flow:
  1) Scan ~/Downloads, plan loose files + subdirs older than threshold
  2) (Live only) Create "Downloads Archive" folder in Drive, prompt for confirmation
  3) Upload loose files (routed by type) + zip each subdir and upload
  4) Verify every uploaded name appears in a recursive Drive scan
  5) Delete locally only after full verification (skipped if --no-delete)
EOF
}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true ;;
        --force)   FORCE=true ;;
        --no-delete) NO_DELETE=true ;;
        --max-age=*) MAX_AGE_DAYS="${1#*=}" ;;
        --help|-h) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
    shift
done

mkdir -p "$LOG_DIR"

log() {
    local level=$1; shift
    local msg="$*"
    local ts; ts=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$ts] [$level] $msg" >> "$LOG_FILE"
    case "$level" in
        ERROR)   echo -e "${RED}❌ $msg${NC}" ;;
        WARNING) echo -e "${YELLOW}⚠️  $msg${NC}" ;;
        SUCCESS) echo -e "${GREEN}✅ $msg${NC}" ;;
        INFO)    echo -e "${BLUE}ℹ️  $msg${NC}" ;;
        *)       echo "$msg" ;;
    esac
}

echo -e "${BLUE}📦 Safe Downloads Archive${NC}"
echo "=========================="
echo "=== Log: $(date) ===" > "$LOG_FILE"
echo "Args: dry-run=$DRY_RUN force=$FORCE no-delete=$NO_DELETE max-age=$MAX_AGE_DAYS" >> "$LOG_FILE"
echo "Archiver dir: $GOOGLE_DRIVE_DIR" >> "$LOG_FILE"

# Pre-flight
if [ ! -d "$GOOGLE_DRIVE_DIR/.venv" ]; then
    log ERROR "Python venv not found at $GOOGLE_DRIVE_DIR/.venv"
    log INFO  "Install the google-drive-archiver skill there, or set GOOGLE_DRIVE_ARCHIVER_DIR."
    exit 1
fi
if [ ! -f "$PY_SCRIPT" ]; then
    log ERROR "archive_downloads.py not found at $PY_SCRIPT"
    exit 1
fi
if [ "$DRY_RUN" = false ] && [ ! -f "$TOKEN_FILE" ]; then
    log ERROR "Token file missing — run scripts/authenticate.py in the archiver first"
    exit 1
fi

USAGE_PCT=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | sed 's/%//')
log INFO "Current disk usage: ${USAGE_PCT}%"

# Build python args
PY_ARGS=(--max-age-days "$MAX_AGE_DAYS")
[ "$DRY_RUN" = true ]   && PY_ARGS+=(--dry-run)
[ "$FORCE" = true ]     && PY_ARGS+=(--force)
[ "$NO_DELETE" = true ] && PY_ARGS+=(--no-delete)

cd "$GOOGLE_DRIVE_DIR" || exit 1
# shellcheck disable=SC1091
source .venv/bin/activate

log INFO "Invoking archive_downloads.py ${PY_ARGS[*]}"
echo
python3 "$PY_SCRIPT" "${PY_ARGS[@]}"
RC=$?

echo
if [ $RC -eq 0 ]; then
    log SUCCESS "Archive run completed (rc=0)"
elif [ $RC -eq 2 ]; then
    log WARNING "Archive run finished with safe exit (rc=2) — local files preserved"
else
    log ERROR "Archive run failed (rc=$RC)"
fi

if [ "$DRY_RUN" = false ] && [ $RC -eq 0 ]; then
    NEW_PCT=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | sed 's/%//')
    log INFO "Disk usage: ${USAGE_PCT}% → ${NEW_PCT}%"
fi

log INFO "Log: $LOG_FILE"
exit $RC
