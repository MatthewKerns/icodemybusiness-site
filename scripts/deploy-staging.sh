#!/usr/bin/env bash
# Deploy a COMMITTED git ref of icodemybusiness-site to staging.icodemybusiness.com.
#
#   scripts/deploy-staging.sh <ref> [--skip-ci] [--allow-unmerged] [--no-convex] [--dry-run]
#   scripts/deploy-staging.sh status
#
# Why this exists: several agent sessions share one working tree. Deploying by
# rsyncing that tree shipped other people's uncommitted work (and once, a
# secrets file). This script only ever deploys `git archive <ref>` — a clean
# export of exactly one commit that is already on origin/main — pushes Convex
# first when convex/ changed, builds on the VPS, swaps the staging container,
# verifies, and records the deployed sha on the VPS.
#
# Never rsyncs: deploy.sh, .env*, build.log, node_modules, .git, docs, _bmad, _legacy.
set -euo pipefail

VPS="${ICMB_VPS:-root@2.25.207.149}"
DIR="${ICMB_DIR:-/opt/icodemybusiness-site}"
STAGING="${ICMB_STAGING_URL:-https://staging.icodemybusiness.com}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
ROUTES=(/ /free-tools /consulting /book /academy /services /vsl)

SKIP_CI=0; ALLOW_UNMERGED=0; NO_CONVEX=0; DRY=0; REF=""
for a in "$@"; do
  case "$a" in
    --skip-ci) SKIP_CI=1 ;;
    --allow-unmerged) ALLOW_UNMERGED=1 ;;
    --no-convex) NO_CONVEX=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) REF="$a" ;;
  esac
done

log()  { printf '\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
remote() { ssh -o ConnectTimeout=15 "$VPS" "$@"; }

verify() {
  local bad=0
  for p in "${ROUTES[@]}"; do
    local code; code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$STAGING$p" || echo 000)
    printf '   %-14s %s\n' "$p" "$code"
    [ "$code" = "200" ] || bad=1
  done
  local home; home=$(curl -s --max-time 25 "$STAGING/")
  # Visible currency amounts (ignores RSC refs like "$12" which are quoted/escaped).
  local prices; prices=$(printf '%s' "$home" | grep -oE '[^"\\]\$[0-9][0-9,]*(\.[0-9]+)?' | wc -l | tr -d ' ')
  printf '   visible $-amounts on /: %s (must be 0)\n' "$prices"
  [ "$prices" = "0" ] || bad=1
  local sub; sub=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$STAGING/subscribe")
  printf '   /subscribe        %s (expect 307)\n' "$sub"
  printf '   /vsl noindex      %s\n' "$(curl -s --max-time 25 "$STAGING/vsl" | grep -ciE 'name="robots"[^>]*noindex' || true)"
  return $bad
}

if [ "$REF" = "status" ]; then
  log "staging status"
  remote "cd $DIR && echo \"deployed sha: \$(cat DEPLOYED_SHA 2>/dev/null || echo unknown)\"; tail -3 DEPLOY_LOG 2>/dev/null; docker ps --filter name=icodemybusiness-site --format '{{.Names}} {{.Status}}'"
  verify || true
  exit 0
fi
[ -n "$REF" ] || fail "usage: $0 <git-ref> | status   (see --help)"

cd "$REPO"
git fetch -q origin
SHA=$(git rev-parse --verify "$REF^{commit}" 2>/dev/null) || fail "unknown ref: $REF"
SHORT=$(git rev-parse --short "$SHA")
SUBJECT=$(git log -1 --format=%s "$SHA")
log "deploying $SHORT — $SUBJECT"

# 1. Must be integrated: staging deploys come from origin/main.
if git merge-base --is-ancestor "$SHA" origin/main; then
  ok "$SHORT is on origin/main"
else
  [ "$ALLOW_UNMERGED" = 1 ] || fail "$SHORT is not on origin/main. Merge/push first, or pass --allow-unmerged for a throwaway preview."
  log "WARNING: deploying an unmerged ref (--allow-unmerged)"
fi

# 2. CI gate (GitHub Actions on push to main).
if [ "$SKIP_CI" = 0 ] && command -v gh >/dev/null 2>&1; then
  runs=$(gh run list --commit "$SHA" --json status,conclusion,name --limit 5 2>/dev/null || echo "[]")
  if [ "$runs" = "[]" ] || [ -z "$runs" ]; then
    log "no CI runs found for $SHORT (not pushed yet, or CI still queued) — continuing; the VPS build is the gate"
  elif printf '%s' "$runs" | grep -q '"conclusion":"failure"'; then
    fail "CI failed for $SHORT — fix it or pass --skip-ci"
  elif printf '%s' "$runs" | grep -q '"status":"in_progress"\|"status":"queued"'; then
    log "CI still running for $SHORT — continuing; the VPS build is the gate"
  else
    ok "CI green for $SHORT"
  fi
fi

# 3. Clean export of exactly this commit.
T=$(mktemp -d "${TMPDIR:-/tmp}/icmb-deploy.XXXXXX")
trap 'rm -rf "$T"' EXIT
git archive "$SHA" | tar -x -C "$T"
ok "clean export → $T ($(find "$T" -type f | wc -l | tr -d ' ') files)"

# 4. What changed since the last deploy?
PREV=$(remote "cat $DIR/DEPLOYED_SHA 2>/dev/null" || true)
CONVEX_CHANGED=1
if [ -n "$PREV" ] && git cat-file -e "$PREV^{commit}" 2>/dev/null; then
  if git diff --quiet "$PREV" "$SHA" -- convex/; then CONVEX_CHANGED=0; fi
  log "previously deployed: $(git rev-parse --short "$PREV"); convex/ changed: $CONVEX_CHANGED"
else
  log "no previous deployed sha recorded — treating convex/ as changed"
fi

if [ "$DRY" = 1 ]; then
  log "dry run — would: $( [ "$CONVEX_CHANGED" = 1 ] && [ "$NO_CONVEX" = 0 ] && printf 'push Convex, ' )sync src/ convex/ public/ + root config, build, swap staging, verify"
  exit 0
fi

# 5. Serialize against other deploys / builds on the VPS.
remote "if pgrep -f '^docker build' >/dev/null; then echo 'another build is running'; exit 1; fi; if [ -e $DIR/.deploy.lock ]; then echo \"lock held: \$(cat $DIR/.deploy.lock)\"; exit 1; fi; echo \"$SHORT \$(date -u +%FT%TZ) by \$USER@\$(hostname)\" > $DIR/.deploy.lock" \
  || fail "VPS busy — try again shortly"
trap 'remote "rm -f $DIR/.deploy.lock" >/dev/null 2>&1; rm -rf "$T"' EXIT

# 6. Convex first (new functions/schema must exist before the app that calls them).
if [ "$CONVEX_CHANGED" = 1 ] && [ "$NO_CONVEX" = 0 ]; then
  log "pushing Convex functions + schema from the export"
  [ -d "$REPO/node_modules" ] || fail "node_modules missing in $REPO — run: npm ci --ignore-scripts"
  ln -s "$REPO/node_modules" "$T/node_modules"
  # CONVEX_DEPLOYMENT is read from the repo's untracked local env (value never printed).
  DEP=$(grep -E '^CONVEX_DEPLOYMENT=' "$REPO/.env.local" | head -1 | cut -d= -f2- | tr -d '"' || true)
  [ -n "$DEP" ] || fail "CONVEX_DEPLOYMENT not found in .env.local"
  ( cd "$T" && CONVEX_DEPLOYMENT="$DEP" npx convex dev --once >"$T/convex-push.log" 2>&1 ) \
    || { tail -20 "$T/convex-push.log"; fail "Convex push failed"; }
  ok "Convex pushed"
fi

# 7. Sync build inputs from the export (never the working tree).
log "syncing to $VPS:$DIR"
for d in src convex public; do
  rsync -az --delete "$T/$d/" "$VPS:$DIR/$d/"
done
rsync -az "$T/package.json" "$T/package-lock.json" "$T/next.config.js" "$T/tsconfig.json" \
  "$T/tailwind.config.js" "$T/postcss.config.js" "$T/components.json" "$T/.eslintrc.cjs" \
  "$T/next-env.d.ts" "$T/Dockerfile" "$T/.dockerignore" "$VPS:$DIR/"
ok "synced"

# 8. Build + swap on the VPS.
log "building on the VPS (this takes a few minutes)"
if ! remote "cd $DIR && ./deploy.sh build > build.log 2>&1"; then
  remote "grep -nE 'Failed to compile|Type error|error TS|ERROR' $DIR/build.log | head -20" || true
  fail "VPS build failed — see $DIR/build.log"
fi
remote "cd $DIR && ./deploy.sh staging >/dev/null && echo $SHA > DEPLOYED_SHA && echo \"\$(date -u +%FT%TZ) $SHORT $(printf '%q' "$SUBJECT")\" >> DEPLOY_LOG"
ok "container swapped; DEPLOYED_SHA=$SHORT"
sleep 8

# 9. Verify.
log "verifying $STAGING"
if verify; then ok "staging is serving $SHORT"; else fail "verification failed — inspect above; roll back with: $0 $(git rev-parse --short "${PREV:-HEAD~1}")"; fi
