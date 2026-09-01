#!/bin/bash
# Build downloadable skill zips into public/downloads/.
# Run from repo root:  bash skill-packages/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/skill-packages"
OUT="$ROOT/public/downloads"
mkdir -p "$OUT"

PACKAGES=(disk-space-optimizer google-drive-archiver quarterly-planner ecommerce-brand-automation-audit)

# Safety net: refuse to package anything that looks like a real secret/token.
echo "🔒 Secret scan..."
for pkg in "${PACKAGES[@]}"; do
  # Match actual secret VALUES (assigned literals), not dict key names in source.
  if grep -rIlE 'ya29\.[A-Za-z0-9_-]{20,}|1//[0-9A-Za-z_-]{30,}|AIza[0-9A-Za-z_-]{30,}|"(client_secret|refresh_token|token)"[[:space:]]*:[[:space:]]*"[A-Za-z0-9._-]{15,}"' "$SRC/$pkg" 2>/dev/null; then
    echo "❌ Potential secret found in $pkg — aborting." >&2
    exit 1
  fi
  # Never ship actual token/credential JSONs even if present locally.
  if find "$SRC/$pkg" -name '*token*.json' -o -name 'credentials.json' | grep -q .; then
    echo "❌ Token/credential JSON present in $pkg — aborting." >&2
    exit 1
  fi
done
echo "✅ Clean."

for pkg in "${PACKAGES[@]}"; do
  echo "📦 Zipping $pkg..."
  # Remove any prior archive first — `zip -r` merges into an existing zip and
  # would leave behind entries for source files/folders since deleted (stale).
  rm -f "$OUT/${pkg}-skill.zip"
  ( cd "$SRC" && zip -r -X "$OUT/${pkg}-skill.zip" "$pkg" \
      -x '*.DS_Store' -x '*/__pycache__/*' -x '*/.venv/*' -x '*/tokens/*' \
      -x '*/credentials/*.json' >/dev/null )
  echo "   → public/downloads/${pkg}-skill.zip"
done

echo ""
echo "Done. Contents:"
ls -lh "$OUT"/*.zip
