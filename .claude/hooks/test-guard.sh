#!/usr/bin/env bash
# test-guard.sh — Claude Code PreToolUse hook (Bash | Write | Edit).
#
# Tests are the spec. This hook hard-blocks (exit 2) anything that weakens a test to get a
# build or deploy through: deleting/renaming/emptying test files, .skip/.only/xit/xdescribe,
# @ts-ignore / @ts-expect-error inside tests, excluding test globs from a tsconfig or vitest
# config, --typecheck disable, --no-verify, --passWithNoTests, --skip-ci.
#
# Legitimate exception: put TEST_CHANGE_APPROVED="<reason>" on the Bash command (Matthew grants
# it per case). The reason is echoed to stderr so it lands in the transcript.
# For Write/Edit, create the marker file .claude/test-change-approved containing the reason;
# it is consumed (deleted) by the first edit it allows.
#
# Exit-code contract (same as the guide's security-check.sh): 0 = allow, 2 = block (stderr shown).
set -u
HOOK_INPUT="$(cat)"
export HOOK_INPUT
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

python3 - "$ROOT" <<'PY'
import json, os, re, sys
root = sys.argv[1]
try:
    data = json.loads(os.environ.get("HOOK_INPUT", "") or "{}")
except Exception:
    sys.exit(0)
tool = data.get("tool_name", "")
ti = data.get("tool_input", {}) or {}

TEST_PATH = re.compile(r'(\.test\.[cm]?[jt]sx?|\.spec\.[cm]?[jt]sx?|(^|/)__tests__/)')
WEAKEN = re.compile(r'(\.(skip|only)\s*\(|\bxit\s*\(|\bxdescribe\s*\(|\bxtest\s*\(|@ts-ignore|@ts-expect-error)')
CONFIG = re.compile(r'(tsconfig[^/]*\.json|vitest\.config\.[cm]?[jt]s)$')
BYPASS = re.compile(r'(--typecheck[= ]disable|--no-verify\b|--passWithNoTests\b|--skip-ci\b)')

def block(msg):
    sys.stderr.write("========== TEST-GUARD BLOCK ==========\n" + msg +
        "\nTests are the spec: fix the implementation, or fix the test with a stated reason and Matthew's OK.\n"
        "Override (per case, granted by Matthew): Bash -> prefix TEST_CHANGE_APPROVED=\"<reason>\"; "
        "Write/Edit -> create .claude/test-change-approved with the reason.\n"
        "See AGENTS.md > Boundaries > Never Do.\n=======================================\n")
    sys.exit(2)

def approved_marker():
    p = os.path.join(root, ".claude", "test-change-approved")
    if os.path.isfile(p):
        reason = open(p).read().strip()
        try: os.remove(p)
        except OSError: pass
        sys.stderr.write(f"test-guard: override used (marker file): {reason}\n")
        return True
    return False

if tool == "Bash":
    cmd = ti.get("command", "") or ""
    m = re.search(r'TEST_CHANGE_APPROVED=("([^"]*)"|\'([^\']*)\'|(\S+))', cmd)
    if m:
        reason = m.group(2) or m.group(3) or m.group(4)
        sys.stderr.write(f"test-guard: override used: {reason}\n")
        sys.exit(0)
    # Prose inside quotes (commit messages, echo strings) is not a command: strip it before
    # matching flags/paths, so `git commit -m "remove --skip-ci"` is not a bypass.
    nq = re.sub(r'"(?:[^"\\]|\\.)*"|\'[^\']*\'', '""', cmd)
    if BYPASS.search(nq):
        block(f"Command bypasses a test/typecheck gate: {BYPASS.search(nq).group(0)}")
    # deleting / renaming / emptying test files
    if re.search(r'(^|[;&|]\s*|\s)(rm|git\s+rm|mv|git\s+mv)\s', nq) and TEST_PATH.search(nq):
        block("Command removes or renames a test file.")
    if re.search(r'(^|\s)(:|true|echo\s*(""|\'\')?)\s*>\s*\S*(\.test\.|\.spec\.|__tests__/)', cmd):
        block("Command empties a test file.")
    # weakening a test through a shell edit (heredocs/sed payloads are outside quotes)
    if TEST_PATH.search(nq) and WEAKEN.search(cmd):
        block(f"Command introduces a test-weakening pattern ({WEAKEN.search(cmd).group(0)}) into a test file.")
    if CONFIG.search(nq.replace("\n", " ")) and re.search(r'exclude[^\n]*test', cmd):
        block("Command adds test files to a tsconfig/vitest exclude list.")
    sys.exit(0)

if tool in ("Write", "Edit"):
    path = ti.get("file_path", "") or ""
    new = ti.get("content", None)
    if new is None:
        new = ti.get("new_string", "") or ""
    old = ti.get("old_string", "") or ""
    if TEST_PATH.search(path):
        if tool == "Write" and len(new.strip()) < 40:
            if not approved_marker(): block(f"Write would empty a test file: {path}")
        added = WEAKEN.findall(new)
        if added and len(added) > len(WEAKEN.findall(old)):
            if not approved_marker(): block(f"Edit introduces a test-weakening pattern into {path}: {[a[0] for a in added]}")
    if CONFIG.search(path):
        if re.search(r'exclude[\s\S]{0,200}test', new) and not re.search(r'exclude[\s\S]{0,200}test', old):
            if not approved_marker(): block(f"Edit excludes test files from typecheck/test config: {path}")
    sys.exit(0)

sys.exit(0)
PY
exit $?
