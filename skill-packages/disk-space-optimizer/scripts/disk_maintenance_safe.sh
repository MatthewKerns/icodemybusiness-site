#!/bin/bash
# Safe Disk Maintenance Script v2.0 (portable)
# Verify-before-delete screenshot/recording archiving to Google Drive, plus
# optional node_modules / cache / Downloads cleanup. Nothing personal is
# hard-coded — everything below is overridable by env or the config file.
#
# Config file (sourced if present):
#   ${DISK_MAINT_CONF:-$HOME/.config/disk-optimizer/disk_maintenance.conf}
# See disk_maintenance.conf.example for every knob.

# ── Defaults (override via env or config file) ───────────────────────────────
LOG_DIR="${DISK_MAINT_LOG_DIR:-$HOME/.disk_maintenance_logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/cleanup_${TIMESTAMP}.log"
ARCHIVE_LOCAL="${ARCHIVE_LOCAL:-$HOME/Desktop/ScreenShot Archive}"
ARCHIVE_DRIVE_ID="${ARCHIVE_DRIVE_ID:-}"          # REQUIRED for archiving — your Drive folder ID
GOOGLE_DRIVE_DIR="${GOOGLE_DRIVE_ARCHIVER_DIR:-$HOME/.claude/skills/google-drive-archiver}"
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$HOME}"          # where to hunt for stale node_modules
DISK_USAGE_THRESHOLD="${DISK_USAGE_THRESHOLD:-85}"
NODE_MODULES_AGE="${NODE_MODULES_AGE:-60}"
CACHE_AGE="${CACHE_AGE:-30}"
DOWNLOADS_AGE="${DOWNLOADS_AGE:-365}"
CONFIRM_NODE_MODULES="${CONFIRM_NODE_MODULES:-10}"
CONFIRM_DOWNLOADS="${CONFIRM_DOWNLOADS:-50}"
EXCLUDE_FILES=()           # filenames never archived/deleted from the screenshot archive
PROTECTED_GLOBS=()         # node_modules paths to never delete, e.g. "*/my-active-app/*"

# Load configuration file if it exists
CONFIG_FILE="${DISK_MAINT_CONF:-$HOME/.config/disk-optimizer/disk_maintenance.conf}"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
    echo "Loaded configuration from $CONFIG_FILE"
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command-line arguments
DRY_RUN=false
FORCE=false
SKIP_ARCHIVE=false
NODE_MODULES_ONLY=false
SCREENSHOTS_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        --skip-archive) SKIP_ARCHIVE=true ;;
        --node-modules-only) NODE_MODULES_ONLY=true; SKIP_ARCHIVE=true ;;
        --screenshots-only) SCREENSHOTS_ONLY=true ;;
        --help)
            echo "Safe Disk Maintenance Script v2.0 (portable)"
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run            Preview what would be deleted without actually deleting"
            echo "  --force              Skip confirmation prompts (use with caution)"
            echo "  --skip-archive       Skip Google Drive archive verification"
            echo "  --node-modules-only  Only clean node_modules directories (skips archive, cache, downloads)"
            echo "  --screenshots-only   Only archive/clean screenshots (includes Google Drive verification)"
            echo "  --help               Show this help message"
            echo ""
            echo "Requires the google-drive-archiver skill (set GOOGLE_DRIVE_ARCHIVER_DIR)"
            echo "and ARCHIVE_DRIVE_ID (your Drive folder) for archive operations."
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
    shift
done

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Initialize log file
init_log() {
    echo "=== Disk Maintenance Log ===" > "$LOG_FILE"
    echo "Date: $(date)" >> "$LOG_FILE"
    echo "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")" >> "$LOG_FILE"
    echo "Options: dry-run=$DRY_RUN, force=$FORCE, skip-archive=$SKIP_ARCHIVE" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Build find exclusion flags from EXCLUDE_FILES array
find_exclude_flags() {
    local flags=()
    for f in "${EXCLUDE_FILES[@]}"; do
        flags+=(! -name "$f")
    done
    echo "${flags[@]}"
}

# Build compare_files.py --exclude args from EXCLUDE_FILES array
compare_exclude_args() {
    local args=()
    for f in "${EXCLUDE_FILES[@]}"; do
        args+=(--exclude "$f")
    done
    echo "${args[@]}"
}

# Log function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"

    case $level in
        ERROR)   echo -e "${RED}❌ $message${NC}" ;;
        WARNING) echo -e "${YELLOW}⚠️  $message${NC}" ;;
        SUCCESS) echo -e "${GREEN}✅ $message${NC}" ;;
        INFO)    echo -e "${BLUE}ℹ️  $message${NC}" ;;
        *)       echo "$message" ;;
    esac
}

# Pre-flight checks
perform_preflight_checks() {
    log_message "INFO" "Performing pre-flight checks..."

    local all_checks_passed=true

    if [ "$SKIP_ARCHIVE" = false ]; then
        if [ ! -d "$GOOGLE_DRIVE_DIR" ]; then
            log_message "ERROR" "Archive tools not found at $GOOGLE_DRIVE_DIR (set GOOGLE_DRIVE_ARCHIVER_DIR)"
            all_checks_passed=false
        fi
        if [ ! -d "$GOOGLE_DRIVE_DIR/.venv" ]; then
            log_message "ERROR" "Python virtual environment not found at $GOOGLE_DRIVE_DIR/.venv"
            all_checks_passed=false
        fi
        if [ ! -f "$GOOGLE_DRIVE_DIR/scripts/archive.py" ]; then
            log_message "ERROR" "archive.py script not found"
            all_checks_passed=false
        fi
        if [ ! -f "$GOOGLE_DRIVE_DIR/scripts/compare_files.py" ]; then
            log_message "ERROR" "compare_files.py script not found"
            all_checks_passed=false
        fi
        if [ -z "$ARCHIVE_DRIVE_ID" ]; then
            log_message "ERROR" "ARCHIVE_DRIVE_ID is not set — pass your Drive folder ID or use --skip-archive"
            all_checks_passed=false
        fi
    fi

    if [ ! -d "$ARCHIVE_LOCAL" ]; then
        log_message "WARNING" "Screenshot archive directory not found at $ARCHIVE_LOCAL"
        mkdir -p "$ARCHIVE_LOCAL"
        log_message "INFO" "Created archive directory"
    fi

    if [ "$all_checks_passed" = false ]; then
        log_message "ERROR" "Pre-flight checks failed. Exiting."
        exit 1
    fi

    log_message "SUCCESS" "Pre-flight checks passed"
    return 0
}

# Test Google Drive connection
test_google_drive_connection() {
    if [ "$SKIP_ARCHIVE" = true ]; then
        log_message "INFO" "Skipping Google Drive connection test (--skip-archive)"
        return 0
    fi

    log_message "INFO" "Testing Google Drive connection..."

    cd "$GOOGLE_DRIVE_DIR" || exit 1
    source .venv/bin/activate

    python3 scripts/compare_files.py "$ARCHIVE_LOCAL" "$ARCHIVE_DRIVE_ID" > /tmp/gdrive_test.log 2>&1

    if [ $? -ne 0 ]; then
        log_message "ERROR" "Cannot connect to Google Drive"
        cat /tmp/gdrive_test.log >> "$LOG_FILE"
        return 1
    fi

    log_message "SUCCESS" "Google Drive connection successful"
    return 0
}

# Archive screenshots with verification
archive_screenshots() {
    if [ "$SKIP_ARCHIVE" = true ]; then
        log_message "INFO" "Skipping screenshot archive (--skip-archive)"
        return 0
    fi

    log_message "INFO" "Starting screenshot archive process..."

    cd "$GOOGLE_DRIVE_DIR" || exit 1
    source .venv/bin/activate

    local exclude_flags=$(find_exclude_flags)
    local files_before=$(find "$ARCHIVE_LOCAL" -type f \( -name "*.png" -o -name "*.mov" -o -name "*.mp4" \) $exclude_flags 2>/dev/null | wc -l)
    log_message "INFO" "Found $files_before screenshot/recording files to archive"

    if [ $files_before -eq 0 ]; then
        log_message "INFO" "No screenshots or screen recordings to archive"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "DRY RUN: Would archive $files_before files"
        find "$ARCHIVE_LOCAL" -type f \( -name "*.png" -o -name "*.mov" -o -name "*.mp4" \) $exclude_flags -print | head -10 >> "$LOG_FILE"
        return 0
    fi

    log_message "INFO" "Running archive.py..."
    python3 scripts/archive.py "$ARCHIVE_LOCAL" "$ARCHIVE_DRIVE_ID" > /tmp/archive_output.log 2>&1

    if [ $? -ne 0 ]; then
        log_message "ERROR" "Archive script failed"
        cat /tmp/archive_output.log >> "$LOG_FILE"
        return 1
    fi

    sleep 2

    log_message "INFO" "Verifying uploads..."
    local exclude_args=$(compare_exclude_args)
    python3 scripts/compare_files.py "$ARCHIVE_LOCAL" "$ARCHIVE_DRIVE_ID" $exclude_args > /tmp/verify.log 2>&1

    if grep -q "All local files are present in Google Drive" /tmp/verify.log; then
        local missing_count="0"
    else
        local missing_count=$(grep "Files in local folder NOT in Google Drive:" /tmp/verify.log | awk '{print $NF}')
    fi

    if [ -z "$missing_count" ]; then
        log_message "WARNING" "Could not verify upload status"
        cat /tmp/verify.log >> "$LOG_FILE"
        return 1
    fi

    if [ "$missing_count" != "0" ]; then
        log_message "WARNING" "$missing_count files not uploaded to Google Drive"
        log_message "WARNING" "Skipping local file deletion for safety"
        grep "NOT in Google Drive:" -A 20 /tmp/verify.log >> "$LOG_FILE"
        return 1
    fi

    log_message "SUCCESS" "All files verified in Google Drive"

    log_message "INFO" "Removing successfully archived screenshots and screen recordings..."
    find "$ARCHIVE_LOCAL" -type f \( -name "*.png" -o -name "*.mov" -o -name "*.mp4" \) $exclude_flags -print >> "$LOG_FILE"
    find "$ARCHIVE_LOCAL" -type f \( -name "*.png" -o -name "*.mov" -o -name "*.mp4" \) $exclude_flags -delete

    return 0
}

# Clean node_modules with confirmation
clean_node_modules() {
    log_message "INFO" "Checking for old node_modules directories..."

    local protect_args=()
    for g in "${PROTECTED_GLOBS[@]}"; do
        [ -n "$g" ] && protect_args+=( ! -path "$g" )
    done

    local node_modules_list=$(find "$WORKSPACE_ROOT" -name "node_modules" -type d -mtime +$NODE_MODULES_AGE \
        "${protect_args[@]}" 2>/dev/null)

    local count=0
    if [ -n "$node_modules_list" ]; then
        count=$(echo "$node_modules_list" | wc -l | tr -d ' ')
    fi

    if [ $count -eq 0 ]; then
        log_message "INFO" "No old node_modules directories found"
        return 0
    fi

    log_message "INFO" "Found $count node_modules directories older than $NODE_MODULES_AGE days"

    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "DRY RUN: Would delete $count node_modules directories"
        echo "$node_modules_list" | head -10 >> "$LOG_FILE"
        return 0
    fi

    if [ "$count" -gt $CONFIRM_NODE_MODULES ] && [ "$FORCE" = false ]; then
        echo -e "${YELLOW}About to delete $count node_modules directories${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message "INFO" "Skipped node_modules cleanup (user cancelled)"
            return 0
        fi
    fi

    echo "=== node_modules directories to delete ===" >> "$LOG_FILE"
    echo "$node_modules_list" >> "$LOG_FILE"

    echo "$node_modules_list" | while read -r dir; do
        if [ -n "$dir" ]; then
            rm -rf "$dir" 2>/dev/null
        fi
    done

    log_message "SUCCESS" "Cleaned $count node_modules directories"
    return 0
}

# Clean cache files
clean_cache_files() {
    log_message "INFO" "Checking for old cache files..."

    local cache_count=$(find ~/Library/Caches -type f -mtime +$CACHE_AGE 2>/dev/null | wc -l)

    if [ $cache_count -eq 0 ]; then
        log_message "INFO" "No old cache files found"
        return 0
    fi

    log_message "INFO" "Found $cache_count cache files older than $CACHE_AGE days"

    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "DRY RUN: Would delete $cache_count cache files"
        find ~/Library/Caches -type f -mtime +$CACHE_AGE 2>/dev/null | head -10 >> "$LOG_FILE"
        return 0
    fi

    echo "=== Sample cache files to delete ===" >> "$LOG_FILE"
    find ~/Library/Caches -type f -mtime +$CACHE_AGE 2>/dev/null | head -20 >> "$LOG_FILE"

    find ~/Library/Caches -type f -mtime +$CACHE_AGE -delete 2>/dev/null

    log_message "SUCCESS" "Cleaned $cache_count cache files"
    return 0
}

# Clean old downloads
clean_downloads() {
    log_message "INFO" "Checking for old downloads..."

    local downloads_list=$(find ~/Downloads -type f -mtime +$DOWNLOADS_AGE 2>/dev/null)
    local count=$(echo "$downloads_list" | grep -c "/" || echo "0")

    if [ $count -eq 0 ]; then
        log_message "INFO" "No old downloads found"
        return 0
    fi

    log_message "INFO" "Found $count files in Downloads older than $DOWNLOADS_AGE days"

    if [ "$DRY_RUN" = true ]; then
        log_message "INFO" "DRY RUN: Would delete $count download files"
        echo "$downloads_list" | head -10 >> "$LOG_FILE"
        return 0
    fi

    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}About to delete $count files from Downloads (>$DOWNLOADS_AGE days old)${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_message "INFO" "Skipped downloads cleanup (user cancelled)"
            return 0
        fi
    fi

    echo "=== Downloads files to delete ===" >> "$LOG_FILE"
    echo "$downloads_list" >> "$LOG_FILE"

    find ~/Downloads -type f -mtime +$DOWNLOADS_AGE -delete 2>/dev/null

    log_message "SUCCESS" "Cleaned $count download files"
    return 0
}

# Main execution
main() {
    echo -e "${BLUE}🧹 Safe Disk Maintenance Script v2.0${NC}"
    echo "===================================="

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
    fi

    init_log

    USAGE=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | sed 's/%//')
    log_message "INFO" "Current disk usage: ${USAGE}%"
    echo "Disk Usage: ${USAGE}%" >> "$LOG_FILE"

    perform_preflight_checks || exit 1

    if [ "$SKIP_ARCHIVE" = false ]; then
        test_google_drive_connection || {
            log_message "ERROR" "Google Drive connection failed"
            log_message "INFO" "Use --skip-archive to skip archive operations"
            exit 1
        }
    fi

    if [ $USAGE -gt $DISK_USAGE_THRESHOLD ] || [ "$DRY_RUN" = true ]; then
        if [ $USAGE -gt $DISK_USAGE_THRESHOLD ]; then
            log_message "WARNING" "Disk usage above ${DISK_USAGE_THRESHOLD}% - starting cleanup"
        fi

        if [ "$NODE_MODULES_ONLY" = false ]; then
            archive_screenshots
        fi

        if [ "$SCREENSHOTS_ONLY" = false ]; then
            clean_node_modules
        fi

        if [ "$NODE_MODULES_ONLY" = false ] && [ "$SCREENSHOTS_ONLY" = false ]; then
            clean_cache_files
            clean_downloads
        fi

        if [ "$DRY_RUN" = false ]; then
            NEW_USAGE=$(df -h /System/Volumes/Data | tail -1 | awk '{print $5}' | sed 's/%//')
            FREED=$((USAGE - NEW_USAGE))

            echo "" >> "$LOG_FILE"
            echo "=== Results ===" >> "$LOG_FILE"
            echo "Previous usage: ${USAGE}%" >> "$LOG_FILE"
            echo "Current usage: ${NEW_USAGE}%" >> "$LOG_FILE"
            echo "Space freed: ~${FREED}%" >> "$LOG_FILE"

            log_message "SUCCESS" "Maintenance complete!"
            log_message "INFO" "Previous usage: ${USAGE}%"
            log_message "INFO" "Current usage: ${NEW_USAGE}%"
            log_message "INFO" "Space freed: ~${FREED}%"
        else
            log_message "INFO" "Dry run complete - no changes made"
        fi
    else
        log_message "SUCCESS" "Disk usage is healthy (${USAGE}%)"
        log_message "INFO" "No maintenance needed"
    fi

    echo ""
    log_message "INFO" "Log saved to: $LOG_FILE"

    echo ""
    echo -e "${BLUE}💡 Tips:${NC}"
    echo "  • Run with --dry-run first to preview changes"
    echo "  • Use --force to skip confirmation prompts"
    echo "  • Check logs in $LOG_DIR/"
    echo "  • Add to crontab for weekly runs:"
    echo "    0 2 * * 0 $HOME/.claude/skills/disk-space-optimizer/scripts/disk_maintenance_safe.sh"
}

main
