#!/usr/bin/env bash
# End-to-end apex verification, for the cutover and for any time afterwards.
#
# Everything here is checked from OUTSIDE the VPS, the way a visitor sees it, and
# every check prints the evidence rather than a bare pass/fail. Written during the
# 2026-09-04 cutover, where three things went wrong that a checklist in prose did
# not catch: the old A records were added-to rather than replaced (five-way
# round-robin), Traefik served its self-signed fallback for a host it had no
# router for, and the sign-in redirect carried the container's bind address.
#
# --resolve pins the connection to the VPS so the check works before public
# resolvers have expired the old records; drop --pin to test what a real visitor
# gets from your own resolver.
#
# Usage: scripts/verify-apex.sh [--pin] [host]     (default host: icodemybusiness.com)
# Exit 0 only if every check passes.
set -uo pipefail

VPS_IP="2.25.207.149"
HOST="${2:-icodemybusiness.com}"
PIN=""
[ "${1:-}" = "--pin" ] && PIN="--resolve ${HOST}:443:${VPS_IP}"
[ "${1:-}" != "--pin" ] && [ -n "${1:-}" ] && HOST="$1"

fails=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fails=$((fails+1)); }
head_() { printf '\n%s\n' "$1"; }

head_ "1. DNS — exactly one A record, pointing at the VPS"
apex=$(dig +short @dns1.registrar-servers.com "$HOST" A | sort)
n_gh=$(printf '%s\n' "$apex" | grep -c '^185\.199\.' || true)
n_all=$(printf '%s\n' "$apex" | grep -c . || true)
echo "     authoritative: $(printf '%s ' $apex)"
[ "$n_gh" = "0" ] && ok "no GitHub Pages records" || bad "$n_gh GitHub Pages record(s) still present — the apex round-robins"
[ "$n_all" = "1" ] && ok "single A record" || bad "$n_all A records; expected 1"
printf '%s\n' "$apex" | grep -q "^${VPS_IP}$" && ok "points at $VPS_IP" || bad "does not include $VPS_IP"

head_ "2. TLS — a real certificate, not Traefik's fallback"
cert=$(echo | timeout 15 openssl s_client -connect "${VPS_IP}:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null)
echo "$cert" | sed 's/^/     /'
if echo "$cert" | grep -q "TRAEFIK DEFAULT"; then
  bad "Traefik is serving its self-signed fallback — visitors get a browser interstitial"
elif echo "$cert" | grep -qi 'issuer.*let'; then
  ok "certificate issued by Let's Encrypt"
elif [ -n "$cert" ]; then
  ok "certificate present (check the issuer above is expected)"
else
  bad "no certificate returned"
fi

head_ "3. The site itself, over HTTPS"
code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 $PIN "https://${HOST}/" || true)
title=$(curl -s -m 15 $PIN "https://${HOST}/" | grep -o '<title>[^<]*' | head -1 | sed 's/<title>//')
echo "     HTTP $code — ${title:-<no title>}"
[ "$code" = "200" ] && ok "apex returns 200" || bad "apex returned $code"
case "$title" in
  *"Internal Design Portfolio"*) bad "still the GitHub Pages placeholder" ;;
  "")                            bad "no title — nothing rendered" ;;
  *)                             ok "serving the app, not the placeholder" ;;
esac

head_ "4. Owner gate — /admin/funnel redirects to sign-in on the PUBLIC host"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' -m 15 $PIN "https://${HOST}/admin/funnel" || true)
echo "     -> ${loc:-<none>}"
case "$loc" in
  *0.0.0.0*)        bad "redirect carries the container bind address — owner lands on a dead host" ;;
  *"${HOST}"*sign-in*|*sign-in*"${HOST}"*) ok "redirects to sign-in on ${HOST}" ;;
  "")               bad "no redirect — /admin/funnel may not be gated" ;;
  *)                bad "unexpected redirect target" ;;
esac

head_ "5. Google Safe Browsing"
if [ -x "$(dirname "$0")/safe-browsing-check.sh" ]; then
  "$(dirname "$0")/safe-browsing-check.sh" "$HOST" "www.${HOST}" | sed 's/^/     /' && ok "clean" || bad "not clean — open the Transparency Report link above"
else
  bad "safe-browsing-check.sh not found beside this script"
fi

head_ "Result"
if [ "$fails" = "0" ]; then
  echo "  All checks passed for ${HOST}."
  echo "  Still needs a human: sign in as an owner and confirm /admin/funnel renders the constraint identifier."
  exit 0
fi
echo "  ${fails} check(s) failed for ${HOST}."
exit 1
