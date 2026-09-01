---
name: docker-resource-manager
description: >
  Inventory and safely reclaim Docker disk space. Use when the user reports
  Docker disk pressure, low disk space tied to Docker, a hung Docker daemon,
  needs headroom to run additional server projects, or asks to "clean up
  docker / prune docker / check docker usage / free docker space / docker
  taking too much space / docker is full". Walks through daemon health →
  inventory → classification → tiered proposal → execution-gated-by-explicit-
  approval. **Never deletes anything without the user confirming the exact
  tier or list to remove.**
allowed-tools: Bash, Read, AskUserQuestion
---

# docker-resource-manager

## Overview

Operational skill for reclaiming Docker disk space without destroying state.
The hard rule: **no `prune`, `rm`, `volume rm`, or `image rm` call ever runs
without an explicit `AskUserQuestion` confirming the exact tier or list.**
The skill inventories first, classifies second, proposes tiered cleanups
third, and executes only what the user explicitly OKs.

## When NOT to use

- **Host disk full but Docker isn't the culprit.** Run
  `du -sh ~/Library/Containers/com.docker.docker` first. If <5 GB, point the
  user at the disk-space-optimizer's `disk_maintenance_safe.sh --dry-run`
  instead — it handles screenshot archives, stale node_modules, system caches,
  and old Downloads. It does NOT touch Docker.
- **Debugging a single failing compose stack.** Use `docker-compose logs`
  directly. This skill is for resource reclamation, not app debugging.
- **CI / non-interactive contexts.** This skill is interactive by design — it
  must ask before deleting. Don't try to make it autonomous.

## Phase 1 — Daemon health check

Always start here. A hung daemon under disk pressure is a common root cause.

```bash
docker version | head -5        # should respond in <2s
df -h /                          # if avail < 5 GB, Docker may refuse to start
du -sh ~/Library/Containers/com.docker.docker
```

**If `docker version` hangs:**
1. Stop. Don't retry in a loop.
2. Free at least 5 GB of host disk first (clear caches and old Downloads — see
   `disk_maintenance_safe.sh`).
3. Restart Docker Desktop: `open -a Docker` (you may have to grant permissions
   in the Mac menu bar).
4. Wait until `docker version` returns cleanly before continuing.

## Phase 2 — Inventory

Run all four. Report sizes inline. Don't propose anything yet.

```bash
# 1. High-level breakdown
docker system df

# 2. Containers + their compose project labels (active first)
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Size}}\t{{.Label "com.docker.compose.project"}}'

# 3. Images with tags + age
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}'

# 4. Volumes with per-volume real sizes (the alpine du trick)
for v in $(docker volume ls -q); do
  size=$(docker run --rm -v "$v:/data" alpine du -sh /data 2>/dev/null | cut -f1)
  in_use=$(docker ps -a --filter "volume=$v" --format '{{.Names}}' | head -1)
  echo "$size  ${in_use:-<unused>}  $v"
done | sort -hr
```

The last loop is the only way to get real volume sizes — `docker volume ls`
alone doesn't show bytes.

## Phase 3 — Classification rules

Apply this decision table to every resource. Default is **preserve**.

| Class | Definition | Action |
|---|---|---|
| **ACTIVE** | Container running, OR image used by running container, OR volume mounted by running container | Preserve, never propose |
| **PROJECT-LINKED** | Resource has `com.docker.compose.project` label, project dir still exists on host with a compose file | Preserve, mark "linked to `<path>`" |
| **STATELESS-STALE** | Stopped container >24h with `exited` status, OR dangling image (no tag), OR build cache | Tier 0 (safe to prune) |
| **TAGGED-STALE** | Image with tag, no running container, project dir gone or compose file references different tag | Tier 1 (review then prune) |
| **STATEFUL-STALE** | Volume not mounted by any container, but name matches a stateful suffix | Tier 2 (per-item approval) |
| **KEEP-LIST** | User-named never-delete | Preserve, never propose |

### Stateful-suffix patterns (default-preserve volumes)

A volume name matching ANY of these defaults to STATEFUL-STALE, never
STATELESS-STALE, even if no container is currently using it:

- `*_pgdata`, `*_postgres_data`, `*_pg_data`
- `*_redisdata`, `*_redis_data`
- `*_db_data`, `*_db`, `*-db`
- `*-data`, `*_data`
- `*_storage_*`, `*supabase*`
- `*_next_cache` (Next.js build cache — large but rebuildable; check before deleting)

### KEEP-LIST (always preserve, never propose)

- Any volume the user explicitly names "keep" (e.g. a live app's data volume).
- Anything flagged as live app state in the project's own CLAUDE.md / README.
- When in doubt about a volume that looks stateful, treat it as KEEP and ask.

## Phase 4 — Tiered proposal

Present the proposal as a single message with three tables (one per tier),
each showing path/name + size + risk. Sum the totals at the bottom. Do NOT
delete anything yet.

| Tier | Contents | Risk | Typical command |
|---|---|---|---|
| **Tier 0a** | Build cache (start here — typically the biggest win) | Near zero | `docker builder prune -af` |
| **Tier 0b** | Dangling images, exited containers >24h | Near zero | `docker container prune -f --filter "until=24h"`, `docker image prune -f` |
| **Tier 1** | Unused tagged images (review each) | Low — image can be rebuilt/repulled | `docker rmi <image>` per item |
| **Tier 2** | Unused volumes (per-item, stateful-suffix highlighted) | Real — data loss if wrong | `docker volume rm <volume>` per item |

**Why build cache is Tier 0a:** in practice, build cache is often the single
biggest reclaimable chunk — frequently larger than dangling images and stopped
containers combined. Always propose it first.

**`docker container prune -f` warning:** this removes ALL stopped containers
across ALL compose projects, not just the one you're focused on. If the host
runs multiple projects, prefer `docker rm <specific-container>` per item, or
scope with `--filter "label=com.docker.compose.project=<project>"`.

**Never propose `docker system prune -a --volumes -f` unprompted.** That one
command can nuke everything. If the user explicitly requests it, still ask to
confirm the volume list first.

## Phase 5 — Execution gates

This is the safety contract.

```
For each tier the user wants to execute:
  1. AskUserQuestion: "Confirm Tier N — delete the following N items
     totaling X GB?" with options [Yes / Skip / Show me each item first].
  2. If "Yes" → run the commands, capture output.
  3. If "Show me each item first" → loop AskUserQuestion per item.
  4. If "Skip" → move to next tier.
  5. After each tier, re-run `docker system df` and report the delta.
```

If the user typed an explicit kill list earlier in the conversation, that
satisfies "express permission" for those specific items only — still run them
one-at-a-time with output capture, but no extra confirmation prompt is needed
for items on the list.

**Never assume permission carries forward** between sessions or tiers.

## Phase 6 — Headroom math

After execution (or if the user declined all tiers), compute:

```
free_host_disk        = `df -h /` Avail column
docker_used           = `du -sh ~/Library/Containers/com.docker.docker`
docker_reclaimable    = `docker system df` Reclaimable column sum
available_for_projects = free_host_disk - 5 GB host buffer
```

Budget per concurrent "server project": ~2-3 GB (typical: backend image
0.5-1.5 GB + frontend image 1-2.5 GB + postgres volume 0.3-1 GB + redis
50-200 MB).

Report whether 2-3 concurrent projects fit:
- `available_for_projects >= 9 GB` → "comfortable for 3 projects"
- `>= 6 GB` → "fits 2 projects, 3rd will be tight"
- `< 6 GB` → "not enough headroom — point at the largest reclaimable resource
  and propose it for next tier review"

## Recovery / anti-patterns

**Never:**
- Run `docker system prune -a --volumes -f` without per-volume user confirmation.
- Delete a volume that any container (running OR stopped) is mounting.
- Retry hung `docker` commands in a sleep loop — the daemon needs to recover first.
- Prune a volume flagged as live app state in the project's CLAUDE.md/README.
- Run `docker volume prune` without `--filter "label!=keep"` if the user uses
  labels — it quietly nukes all unused volumes.

**If a deletion went wrong:**
- Docker doesn't have a trash. Images can be re-pulled or re-built. Volumes are gone.
- Tell the user immediately. If the volume was Postgres, point at any recent
  `pg_dump` they might have. If a compose project uses `restart: unless-stopped`,
  the container may auto-restart with a fresh volume — note this before they
  lose other work.

**If the daemon hung mid-run:**
- Don't issue more commands. Wait for `docker version` to respond.
- If it doesn't recover in 60s, the daemon may have crashed — restart Docker
  Desktop and re-run inventory from scratch before continuing.

## Lessons from prior cleanups

See `references/field-lessons.md` for the field-tested patterns and near-misses
that informed this skill — particularly the daemon-recovery procedure and the
preserve-stateful-volumes rule.
