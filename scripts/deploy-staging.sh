#!/usr/bin/env bash
# Deploy a COMMITTED git ref of icodemybusiness-site to staging.icodemybusiness.com.
#
#   scripts/deploy-staging.sh <ref> [--allow-unmerged] [--no-convex] [--dry-run]
#   scripts/deploy-staging.sh status
#
# Why this exists: several agent sessions share one working tree. Deploying by
# rsyncing that tree shipped other people's uncommitted work (and once, a
# secrets file). This script only ever deploys `git archive <ref>` — a clean
# export of exactly one commit that is already on origin/main — runs the gates
# (lint, tsc, tests) ON THE VPS against that export, pushes Convex first when
# convex/ changed, builds on the VPS, swaps the staging container, verifies, and
# records the deployed sha + gate evidence (VPS DEPLOY_LOG, docs/release/DEPLOY_QUEUE.md).
#
# Tests are the spec: there is no flag that skips the gates. A gate that could
# not run is not a passed gate — the deploy aborts. GitHub CI is informational.
# Never rsyncs: deploy.sh, .env*, build.log, node_modules, .git, docs, _bmad, _legacy.
set -euo pipefail

VPS="${ICMB_VPS:-root@2.25.207.149}"
DIR="${ICMB_DIR:-/opt/icodemybusiness-site}"
STAGING="${ICMB_STAGING_URL:-https://staging.icodemybusiness.com}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
QUEUE="$REPO/docs/release/DEPLOY_QUEUE.md"
OFFLOAD="${ICMB_OFFLOAD:-$HOME/bin/offload-run}"
GATES='npm ci --ignore-scripts && npm run lint && npx tsc --noEmit && npm test'
ROUTES=(/ /free-tools /consulting /book /academy /services /vsl /assessment)

ALLOW_UNMERGED=0; NO_CONVEX=0; DRY=0; REF=""
for a in "$@"; do
  case "$a" in
    --skip-ci) echo "--skip-ci no longer exists: gates always run (see AGENTS.md > Testing Protocol)" >&2; exit 1 ;;
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

# 2. GitHub CI status — informational only (the gates below are authoritative).
if command -v gh >/dev/null 2>&1; then
  runs=$(gh run list --commit "$SHA" --json status,conclusion --limit 3 2>/dev/null || echo "[]")
  if printf '%s' "$runs" | grep -q '"conclusion":"success"'; then log "GitHub CI: green for $SHORT"
  elif printf '%s' "$runs" | grep -q '"conclusion":"failure"'; then log "GitHub CI: red or never started for $SHORT (informational — VPS gates decide)"
  else log "GitHub CI: no result for $SHORT (informational)"; fi
fi

# 3. Clean export of exactly this commit.
T=$(mktemp -d "${TMPDIR:-/tmp}/icmb-deploy.XXXXXX")
trap 'rm -rf "$T"' EXIT
git archive "$SHA" | tar -x -C "$T"
ok "clean export → $T ($(find "$T" -type f | wc -l | tr -d ' ') files)"

# 3b. Gates on the VPS, against the export. No skip flag exists.
GATE_RESULT="not run"
record_queue() { # $1 result text
  [ -f "$QUEUE" ] && printf '| %s | %s | %s | %s | %s | %s |\n' "$(date -u +%FT%H:%MZ)" "$SHORT" "$(printf '%s' "$SUBJECT" | tr '|' '/')" "$GATE_RESULT" "$1" "${USER:-deploy}@$(hostname -s)" >> "$QUEUE"
}
if [ "$DRY" = 0 ]; then
  [ -x "$OFFLOAD" ] || fail "gate runner $OFFLOAD not found — a gate that cannot run is not a passed gate"
  log "gates on the VPS (lint, tsc, tests) against the clean export"
  GLOG="$T/gates.log"
  if "$OFFLOAD" --dir "$T" --lane node-full --no-mark -- "$GATES" > "$GLOG" 2>&1 \
     && grep -qE '■ exit=0' "$GLOG"; then
    GATE_RESULT="lint/tsc/test green on VPS"
    ok "$GATE_RESULT"
  else
    GATE_RESULT="FAILED on VPS"
    grep -E "error TS|✖|FAIL|Tests |failed|Error:" "$GLOG" | head -25 >&2 || true
    record_queue "blocked"
    fail "gates failed for $SHORT — fix the implementation (or the test, with a stated reason); nothing was deployed"
  fi
fi

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
  log "dry run — would: run gates on the VPS ($GATES), $( [ "$CONVEX_CHANGED" = 1 ] && [ "$NO_CONVEX" = 0 ] && printf 'push Convex, ' )sync src/ convex/ public/ + root config, build, swap staging, verify, record evidence"
  exit 0
fi

# 5. Serialize against other deploys / builds on the VPS.
remote "if pgrep -f '^docker build' >/dev/null; then echo 'another build is running'; exit 1; fi; if [ -e $DIR/.deploy.lock ]; then if [ -z \"\$(find $DIR/.deploy.lock -mmin -40)\" ]; then mv $DIR/.deploy.lock $DIR/.deploy.lock.stale-\$(date -u +%H%M); echo \"stale lock (>40 min, no build running) moved aside\"; else echo \"lock held: \$(cat $DIR/.deploy.lock)\"; exit 1; fi; fi; echo \"$SHORT \$(date -u +%FT%TZ) by \$USER@\$(hostname)\" > $DIR/.deploy.lock" \
  || fail "VPS busy — try again shortly"
trap 'remote "rm -f $DIR/.deploy.lock" >/dev/null 2>&1; rm -rf "$T"' EXIT

# 6. Convex first (new functions/schema must exist before the app that calls them).
if [ "$CONVEX_CHANGED" = 1 ] && [ "$NO_CONVEX" = 0 ]; then
  log "pushing Convex functions + schema from the export"
  [ -d "$REPO/node_modules" ] || fail "node_modules missing in $REPO — run: npm ci --ignore-scripts"
  ln -s "$REPO/node_modules" "$T/node_modules"
  # CONVEX_DEPLOYMENT is read from the repo's untracked local env (value never printed).
  # Line format is CONVEX_DEPLOYMENT=dev:name # team: t, project: p  -> keep only the value.
  DEP=$(grep -E '^CONVEX_DEPLOYMENT=' "$REPO/.env.local" | head -1 | cut -d= -f2- | cut -d'#' -f1 | tr -d '[:space:]"')
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
  rc=$?
  if [ "$rc" = 255 ]; then
    # ssh's own exit code: the session dropped (host stall, network), not necessarily the build.
    # Seen 2026-09-02: the image had built and tagged fine while the script reported a failure.
    fail "ssh session to the VPS dropped during the build (exit 255) — the build may have finished; check $DIR/build.log, then re-run. The lock is released on exit."
  fi
  remote "grep -nE 'Failed to compile|Type error|error TS|ERROR' $DIR/build.log | head -20" || true
  fail "VPS build failed — see $DIR/build.log"
fi
remote "cd $DIR && ./deploy.sh staging >/dev/null && echo $SHA > DEPLOYED_SHA && echo \"\$(date -u +%FT%TZ) $SHORT gates=[$GATE_RESULT] $(printf '%q' "$SUBJECT")\" >> DEPLOY_LOG"
ok "container swapped; DEPLOYED_SHA=$SHORT"
sleep 8

# 9. Verify and record evidence.
log "verifying $STAGING"
if verify; then
  record_queue "staging-verified (script checks)"
  ok "staging is serving $SHORT — evidence appended to docs/release/DEPLOY_QUEUE.md (commit it)"
else
  record_queue "deployed but verification failed"
  fail "verification failed — inspect above; roll back with: $0 $(git rev-parse --short "${PREV:-HEAD~1}")"
fi
