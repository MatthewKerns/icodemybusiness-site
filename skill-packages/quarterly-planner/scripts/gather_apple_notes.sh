#!/usr/bin/env bash
# Export Apple Notes to markdown for quarterly planning. READ-ONLY — never
# creates, edits, or deletes a note. macOS only (uses AppleScript via osascript).
#
# Usage:
#   bash gather_apple_notes.sh [--days 120] [--since "120 days ago"] \
#       [--folder "Planning"] [--out context/apple-notes.md]
#
# --days/--since limit to notes modified in the window (default 120 days).
# --folder limits to one Notes folder (default: all folders).
set -euo pipefail

DAYS=120
FOLDER=""
OUT="context/apple-notes.md"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)   DAYS="$2"; shift 2 ;;
    --since)  DAYS="$(printf '%s' "$2" | grep -oE '[0-9]+' | head -1)"; DAYS="${DAYS:-120}"; shift 2 ;;
    --folder) FOLDER="$2"; shift 2 ;;
    --out)    OUT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if ! command -v osascript >/dev/null 2>&1; then
  echo "osascript not found — Apple Notes export needs macOS." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

# Build the per-note source: either one folder or all notes, filtered by date.
if [[ -n "$FOLDER" ]]; then
  SOURCE="notes of (first folder whose name is \"$FOLDER\") whose modification date > cutoff"
else
  SOURCE="notes whose modification date > cutoff"
fi

# AppleScript: emit "<<<NOTE>>>" delimited records of name | date | plaintext.
SCRIPT=$(cat <<APPLESCRIPT
set cutoff to (current date) - ($DAYS * 24 * 60 * 60)
set out to ""
tell application "Notes"
  try
    set theNotes to ($SOURCE)
  on error
    set theNotes to {}
  end try
  repeat with n in theNotes
    set theName to name of n
    set theDate to (modification date of n) as string
    try
      set theBody to plaintext of n
    on error
      set theBody to body of n
    end try
    set out to out & "<<<NOTE>>>" & theName & "<<<META>>>" & theDate & "<<<BODY>>>" & theBody & linefeed
  end repeat
end tell
return out
APPLESCRIPT
)

RAW="$(osascript -e "$SCRIPT" 2>/dev/null || true)"

# Format into markdown (read-only post-processing in awk).
{
  echo "# Apple Notes (last $DAYS days${FOLDER:+, folder: $FOLDER})"
  echo
  echo "_Read-only export. $(date)._"
  echo
  if [[ -z "${RAW// }" ]]; then
    echo "_No notes matched (or Notes access not granted — System Settings → Privacy → Automation)._"
  else
    printf '%s' "$RAW" | awk '
      BEGIN { RS="<<<NOTE>>>" }
      NR==1 { next }
      {
        name=$0; meta=""; bodytext=""
        i=index(name,"<<<META>>>")
        if (i>0) { rest=substr(name,i+9); name=substr(name,1,i-1) }
        j=index(rest,"<<<BODY>>>")
        if (j>0) { meta=substr(rest,1,j-1); bodytext=substr(rest,j+9) }
        gsub(/^[ \t\r\n]+|[ \t\r\n]+$/,"",name)
        gsub(/^[ \t\r\n]+|[ \t\r\n]+$/,"",meta)
        print "## " name
        print "_" meta "_"
        print ""
        print bodytext
        print ""
        print "---"
        print ""
      }'
  fi
} > "$OUT"

echo "Wrote $OUT"
