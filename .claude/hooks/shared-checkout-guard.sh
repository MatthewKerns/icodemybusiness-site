#!/usr/bin/env bash
# shared-checkout-guard.sh — Claude Code PreToolUse hook (Bash).
#
# Several sessions share this checkout. These git shapes have each destroyed or reverted another
# session's work here (docs/ENGINEERING_LOG.md 2026-09-02): moving a branch pointer under a live
# tree, hard resets, whole-index or all-tracked commits, and blanket restores.
# Blocked (exit 2): git update-ref refs/heads/… · git reset --hard · git commit -a/--all ·
# git commit without an explicit pathspec after "--" · git checkout -- . / git restore .
# Legitimate exception: SHARED_CHECKOUT_APPROVED="<reason>" on the command (echoed to stderr).
set -u
HOOK_INPUT="$(cat)"; export HOOK_INPUT
python3 - <<'PY'
import json, os, re, sys
try: data = json.loads(os.environ.get("HOOK_INPUT", "") or "{}")
except Exception: sys.exit(0)
if data.get("tool_name") != "Bash": sys.exit(0)
cmd = (data.get("tool_input") or {}).get("command", "") or ""
m = re.search(r'SHARED_CHECKOUT_APPROVED=("([^"]*)"|\'([^\']*)\'|(\S+))', cmd)
if m:
    sys.stderr.write(f"shared-checkout-guard: override used: {m.group(2) or m.group(3) or m.group(4)}\n"); sys.exit(0)
nq = re.sub(r'"(?:[^"\\]|\\.)*"|\'[^\']*\'', '""', cmd)
def block(msg):
    sys.stderr.write("========== SHARED-CHECKOUT GUARD ==========\n" + msg +
        "\nThis checkout is shared by several sessions. Commit with explicit paths "
        "(git commit -m \"…\" -- <paths>), never move/reset a shared branch pointer, never restore the tree.\n"
        "Override per case: prefix SHARED_CHECKOUT_APPROVED=\"<reason>\". See AGENTS.md > Boundaries > Never Do.\n"
        "===========================================\n"); sys.exit(2)
for seg in re.split(r'\s*(?:&&|\|\||;|\|)\s*|\n', nq):
    s = seg.strip()
    if not re.search(r'(^|\s)git(\s+-C\s+\S+)?\s', s): continue
    if re.search(r'\bupdate-ref\s+refs/heads/', s): block("git update-ref on a branch: moves the pointer without touching the shared tree/index.")
    if re.search(r'\breset\s+(.*\s)?--hard\b', s): block("git reset --hard discards other sessions' uncommitted work.")
    if re.search(r'\bcommit\b', s) and re.search(r'\s(-a|--all|-am|-a[a-zA-Z]+)\b', s): block("git commit -a commits every tracked change in the shared tree, not only yours.")
    if re.search(r'\bcommit\b', s) and not re.search(r'\s--\s+\S', s) and not re.search(r'--amend|--allow-empty', s): block("git commit without an explicit pathspec commits whatever is staged, including files you did not stage.")
    if re.search(r'\bcheckout\s+--\s+\.(\s|$)', s) or re.search(r'\brestore\s+(\.|:/)(\s|$)', s) or re.search(r'\brestore\s+--staged\s+\.(\s|$)', s): block("blanket checkout/restore of the tree wipes other sessions' edits.")
sys.exit(0)
PY
exit $?
