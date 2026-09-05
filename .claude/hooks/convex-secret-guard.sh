#!/usr/bin/env bash
# convex-secret-guard.sh — Claude Code PreToolUse hook (Bash).
#
# `npx convex env list` / `env get` print live secret VALUES to stdout — not just names.
# On 2026-09-04, running it to check for a production deployment printed a real
# RESEND_API_KEY into a session transcript (docs/ENGINEERING_LOG.md 2026-09-04). This
# repo's other secret guard only blocks reading .env files directly; it does not cover a
# CLI subcommand whose whole purpose is to print configured values.
# Blocked (exit 2): `convex env list` · `convex env get <NAME>` (any invocation — npx,
# npx --no-install, pnpm dlx, direct `convex`).
# Safe alternative: scripts/convex-env-names.sh [--prod|--dev] — names only, no values.
# Legitimate exception: CONVEX_ENV_READ_APPROVED="<reason>" on the command (echoed to stderr).
set -u
HOOK_INPUT="$(cat)"; export HOOK_INPUT
python3 - <<'PY'
import json, os, re, sys
try: data = json.loads(os.environ.get("HOOK_INPUT", "") or "{}")
except Exception: sys.exit(0)
if data.get("tool_name") != "Bash": sys.exit(0)
cmd = (data.get("tool_input") or {}).get("command", "") or ""
m = re.search(r'CONVEX_ENV_READ_APPROVED=("([^"]*)"|\'([^\']*)\'|(\S+))', cmd)
if m:
    sys.stderr.write(f"convex-secret-guard: override used: {m.group(2) or m.group(3) or m.group(4)}\n"); sys.exit(0)
nq = re.sub(r'"(?:[^"\\]|\\.)*"|\'[^\']*\'', '""', cmd)
def block(msg):
    sys.stderr.write("========== CONVEX SECRET GUARD ==========\n" + msg +
        "\n`convex env list`/`env get` print real secret VALUES, not just names — that's how a "
        "RESEND_API_KEY reached a session transcript on 2026-09-04.\n"
        "Use scripts/convex-env-names.sh [--prod|--dev] for a names-only listing instead.\n"
        "Override per case: prefix CONVEX_ENV_READ_APPROVED=\"<reason>\". See AGENTS.md > Boundaries > Never Do.\n"
        "==========================================\n"); sys.exit(2)
for seg in re.split(r'\s*(?:&&|\|\||;|\|)\s*|\n', nq):
    s = seg.strip()
    if re.search(r'\bconvex\s+env\s+(list|get)\b', s):
        block("Blocked: this prints Convex env VALUES to stdout.")
sys.exit(0)
PY
exit $?
