#!/usr/bin/env bash
# Exercise .claude/hooks/test-guard.sh with synthetic tool calls. Run: scripts/hooks-test.sh
set -u
HOOK="$(cd "$(dirname "$0")/.." && pwd)/.claude/hooks/test-guard.sh"
pass=0; fail=0
run() { # $1 expected exit (0 allow / 2 block), $2 label, $3 json
  local out; out=$(printf '%s' "$3" | CLAUDE_PROJECT_DIR="$(mktemp -d)" "$HOOK" 2>/dev/null); local rc=$?
  if [ "$rc" = "$1" ]; then pass=$((pass+1)); printf '  ok   %s\n' "$2"; else fail=$((fail+1)); printf '  FAIL %s (exit %s, expected %s)\n' "$2" "$rc" "$1"; fi
}
run 2 "rm test file"            '{"tool_name":"Bash","tool_input":{"command":"rm src/x/__tests__/a.test.ts"}}'
run 2 "git commit --no-verify"  '{"tool_name":"Bash","tool_input":{"command":"git commit -m x --no-verify"}}'
run 2 "typecheck disable"       '{"tool_name":"Bash","tool_input":{"command":"npx convex dev --once --typecheck disable"}}'
run 2 "passWithNoTests"         '{"tool_name":"Bash","tool_input":{"command":"npx vitest run --passWithNoTests"}}'
run 0 "override with reason"    '{"tool_name":"Bash","tool_input":{"command":"TEST_CHANGE_APPROVED=\"flaky timer, approved by Matthew\" rm src/a.test.ts"}}'
run 0 "normal test run"         '{"tool_name":"Bash","tool_input":{"command":"npx vitest run src/a.test.ts"}}'
run 0 "flag mentioned in prose"  '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"docs: the --skip-ci flag is gone; never use --no-verify\""}}'
run 2 "flag as real argument"    '{"tool_name":"Bash","tool_input":{"command":"git commit -m \"x\" --no-verify"}}'
run 2 "edit adds .skip"         '{"tool_name":"Edit","tool_input":{"file_path":"src/a.test.ts","old_string":"it(\"x\"","new_string":"it.skip(\"x\""}}'
run 0 "edit removes .skip"      '{"tool_name":"Edit","tool_input":{"file_path":"src/a.test.ts","old_string":"it.skip(\"x\"","new_string":"it(\"x\""}}'
run 2 "edit adds ts-ignore"     '{"tool_name":"Edit","tool_input":{"file_path":"convex/b.test.ts","old_string":"const t = 1","new_string":"// @ts-ignore\nconst t = 1"}}'
run 2 "write empties test"      '{"tool_name":"Write","tool_input":{"file_path":"src/a.test.ts","content":""}}'
run 2 "tsconfig excludes tests" '{"tool_name":"Edit","tool_input":{"file_path":"convex/tsconfig.json","old_string":"\"exclude\": [\"./_generated\"]","new_string":"\"exclude\": [\"./_generated\", \"./**/*.test.ts\"]"}}'
run 0 "unrelated edit"          '{"tool_name":"Edit","tool_input":{"file_path":"src/app/page.tsx","old_string":"a","new_string":"b"}}'
HOOK="$(cd "$(dirname "$0")/.." && pwd)/.claude/hooks/shared-checkout-guard.sh"
run 2 "commit -a"                '{"tool_name":"Bash","tool_input":{"command":"git commit -am \"x\""}}'
run 2 "commit without pathspec"  '{"tool_name":"Bash","tool_input":{"command":"git add docs/a.md && git commit -q -m \"x\""}}'
run 0 "commit with pathspec"     '{"tool_name":"Bash","tool_input":{"command":"git commit -q -m \"x\" -- docs/a.md"}}'
run 0 "commit --amend"           '{"tool_name":"Bash","tool_input":{"command":"git commit --amend --no-edit"}}'
run 2 "update-ref main"          '{"tool_name":"Bash","tool_input":{"command":"git update-ref refs/heads/main origin/main"}}'
run 2 "reset --hard"             '{"tool_name":"Bash","tool_input":{"command":"git reset --hard origin/main"}}'
run 2 "checkout -- ."            '{"tool_name":"Bash","tool_input":{"command":"git checkout -- ."}}'
run 0 "checkout one file"        '{"tool_name":"Bash","tool_input":{"command":"git checkout dafc551 -- src/a.ts"}}'
run 0 "git -C worktree commit paths" '{"tool_name":"Bash","tool_input":{"command":"git -C /tmp/wt commit -m \"x\" -- a.md"}}'
run 0 "override with reason"     '{"tool_name":"Bash","tool_input":{"command":"SHARED_CHECKOUT_APPROVED=\"clean worktree, Matthew ok\" git commit -am x"}}'
run 0 "prose mentioning commit -a" '{"tool_name":"Bash","tool_input":{"command":"echo \"never git commit -a here\""}}'
printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" = 0 ]
