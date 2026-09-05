#!/usr/bin/env bash
# Google Safe Browsing status for the site's hosts, via the Transparency Report endpoint
# (the same data the public "Safe Browsing site status" page renders; no API key needed).
#
# Why this exists: the apex was flagged domain-wide once (see commit 13fa75c — mockup email
# inputs read as phishing-pattern harvesting), which is the whole reason a static placeholder
# sat on icodemybusiness.com. Cutting a real app with real email forms and a Clerk sign-in
# onto the apex re-opens that exposure, so this runs at cutover and on a cron afterwards.
#
# Exit 0 only when every host returns the "no unsafe content" status; anything else exits 1
# and prints the raw row so a human can look before acting. Status decoding: the row is
#   ["sb.ssr", <status>, ...flags..., <ts>, "<host>", <bool>]
# and 1 has been observed for hosts the public page shows as clean (2026-09-04). Treat that
# mapping as INFERRED until confirmed against the page for a host in each state.
#
# Usage: scripts/safe-browsing-check.sh [host ...]   (default: apex, www, staging)
set -euo pipefail
HOSTS=("$@")
[ ${#HOSTS[@]} -gt 0 ] || HOSTS=(icodemybusiness.com www.icodemybusiness.com staging.icodemybusiness.com)
API="https://transparencyreport.google.com/transparencyreport/api/v3/safebrowsing/status?site="
PAGE="https://transparencyreport.google.com/safe-browsing/search?url="
fail=0
rate_limited=0
for h in "${HOSTS[@]}"; do
  raw="$(curl -s -m 20 -A 'icmb-safe-browsing-check/1 (+https://icodemybusiness.com)' "${API}${h}" | tail -n +2 || true)"
  status="$(printf '%s' "$raw" | python3 -c 'import sys,json
try:
    rows=json.load(sys.stdin); print(rows[0][1])
except Exception: print("parse-error")' 2>/dev/null || echo parse-error)"
  if [ "$status" = "1" ]; then
    echo "OK    $h  status=1 (no unsafe content)  $(date -u +%FT%TZ)"
  elif printf '%s' "$raw" | grep -q 'google.com/sorry'; then
    # Google rate-limits repeated calls and answers with a captcha redirect. That
    # is NOT a flag, and reporting it as one would cry wolf on the exact signal
    # this script exists to make trustworthy. Report unknown and exit non-zero
    # only if nothing else failed, so a real flag is never masked by a retry.
    echo "UNKNOWN $h  rate-limited by Google (captcha redirect) — not a flag; retry later or open ${PAGE}${h}"
    rate_limited=1
  else
    echo "CHECK $h  status=$status  ->  ${PAGE}${h}"
    echo "      raw: $raw"
    fail=1
  fi
done
if [ "$fail" = "0" ] && [ "$rate_limited" = "1" ]; then
  echo "(one or more hosts could not be checked — rate limit, not a flag)"
  exit 3
fi
exit $fail
