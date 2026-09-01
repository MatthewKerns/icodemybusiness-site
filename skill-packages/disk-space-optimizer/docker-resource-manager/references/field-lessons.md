# Field lessons from real Docker cleanups

Field-tested patterns and near-misses from working through Docker disk pressure
on a busy multi-project developer Mac. Use these to skip the trial-and-error and
propose the right thing first.

## Headline takeaways

1. **Build cache is the biggest hidden cost.** `docker builder prune -af` alone
   has repeatedly freed the large majority of reclaimable space — often more
   than dangling images and stopped containers combined. **Always propose
   builder prune first.**
2. **The daemon dies under disk pressure.** When host free disk drops near zero,
   the Docker daemon wedges and `docker` commands hang. Recovery is: free host
   disk first → `open -a Docker` → wait ~15 s → re-run inventory.
3. **`*_data` and `*_postgres_data` volumes are sacred.** Default to "preserve"
   if the name suggests state, even when the owning project is gone.
4. **`docker container prune -f` is a multi-project blast radius.** It removes
   stopped containers across ALL compose projects, not just the one in focus.
   Prefer per-name `docker rm` or scope with
   `--filter "label=com.docker.compose.project=<project>"`.

## The verified safe one-liner

This sequence is the workhorse for a quick, low-risk reclaim:

```bash
docker builder prune -af && \
docker image prune -f
```

- `-af` on builder = aggressive (force + all). Safe because build cache is
  always regenerable.
- `-f` on image = dangling only (untagged layers). Tagged images are preserved
  — they can be re-pulled, but the user may have specific versions pinned.
- **Note on `docker container prune`:** it removes ALL stopped containers
  regardless of `-f`. Read the multi-project caveat below before adding it.

## Selective volume cleanup pattern (preserve state)

When a single project's frontend volumes need a reset (lockfile drift,
corrupted build cache) but the database must survive:

```bash
# 1. Enumerate volumes for this project
docker volume ls | grep <project>

# 2. Drop ONLY the ephemeral caches
docker volume rm $(docker volume ls -q | grep -E '<project>_(frontend_node_modules|frontend_next_cache)$')

# 3. Rebuild and start
docker-compose build <service> && docker-compose up -d <service>
```

Always preserve: `<project>_postgres_data`, `<project>_redis_data`,
`<project>_localstack_data`.
Safe to drop: `<project>_frontend_node_modules`, `<project>_frontend_next_cache`,
anything ending `_cache` or `_build`.

## Daemon recovery procedure

Symptom: `docker version`, `docker ps`, or `docker system df` hangs
indefinitely; new `docker exec` calls fail with socket errors.

Likely cause: host disk pressure has wedged the daemon. Recovery:

```bash
# 1. Confirm low disk
df -h /                   # if Avail < 1 GB, this is the cause

# 2. Free at least 5 GB host disk (Docker won't restart cleanly otherwise)
#    - pip cache purge, npm cache clean --force, brew cleanup -s
#    - clear large ~/Library/Caches/* subdirs
#    - use disk_maintenance_safe.sh --dry-run to find more

# 3. Restart Docker Desktop
open -a Docker
sleep 15

# 4. Verify daemon is back
docker version | head -5  # should respond in <2s
docker system df          # should return cleanly

# 5. Resume inventory + tiered cleanup
```

**Anti-pattern:** Do NOT retry hung `docker` commands in a sleep loop. Each
retry blocks the daemon further and burns more host resources.

## Multi-project blast-radius warnings

On a host running many concurrent compose projects, commands that operate
across all projects need explicit per-project framing:

| Command | Blast radius | Safe alternative |
|---|---|---|
| `docker container prune -f` | ALL stopped containers, ALL projects | `docker rm <name>` per item, or `--filter "label=com.docker.compose.project=<p>"` |
| `docker volume prune` | ALL unused volumes, including stateful unless filtered | `docker volume rm <name>` per item |
| `docker system prune -a --volumes` | EVERYTHING unused — images, containers, volumes, networks | NEVER unprompted; per-item approval if requested |
| `docker rmi $(docker images -q)` | Every image including running ones | `docker rmi <specific:tag>` per item |

## Preserve-list discovery

Discover never-delete volumes from the project's own docs:

- A volume named in a project's `CLAUDE.md`/`README` as "live app state" → KEEP.
- A running container's mounted volumes → KEEP.
- Worktree-derived ephemeral projects (e.g. `pr11_pgdata`): if the worktree dir
  still exists at the path encoded in the volume name → preserve; if the
  worktree was deleted but the volume remains → still ask before removing (the
  user may want to resurrect it).

## What goes wrong (averted near-misses)

1. **`docker image prune -af` (with -a) on a multi-stack host** can remove
   tagged images other stacks still want. Downgrade to `-f` (dangling-only);
   builder cache + dangling alone usually hits the target.
2. **`docker container prune -f` for a few KB of stopped containers** isn't
   worth the all-projects blast radius. The reclaim must justify the risk.
3. **Volume removal during a database recovery** — the instinct to nuke a
   project's volumes is wrong; the correct move is `docker volume rm` of only
   `_frontend_node_modules` and `_frontend_next_cache`, leaving `_postgres_data`
   intact. **Surgical > bulk.**

## Headroom budgeting

Empirical per-project Docker footprint:

| Project type | Image total | Volume state | Typical idle |
|---|---|---|---|
| Python web (Flask/nginx) | ~2.4 GB | ~50-200 MB | ~2.6 GB |
| Node frontend + Node backend + postgres + redis + localstack | ~5 GB | ~1.5-2 GB (postgres dominates) | ~6.5 GB |
| Lightweight MCP server | <30 MB | none | <30 MB |

Multiple variants of the same project share base image layers — total disk for
3 variants is closer to 1.4× a single variant, not 3×.

For "2-3 concurrent server projects": budget ~9 GB of Docker storage (3
heavier stacks) or ~6 GB (2 heavier + 1 light). After cleanup, verify headroom
with `docker system df` and host `df -h /`.
