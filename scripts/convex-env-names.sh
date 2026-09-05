#!/usr/bin/env bash
# convex-env-names.sh — list Convex env var NAMES only, never values.
# Safe alternative to `npx convex env list`, which prints values and can leak secrets
# into a transcript (docs/ENGINEERING_LOG.md 2026-09-04). Blocked directly by
# .claude/hooks/convex-secret-guard.sh; this is the approved path.
# Usage: scripts/convex-env-names.sh [--prod|--dev]
set -euo pipefail
CONVEX_ENV_READ_APPROVED="names-only wrapper" npx convex env list "$@" | cut -d= -f1
