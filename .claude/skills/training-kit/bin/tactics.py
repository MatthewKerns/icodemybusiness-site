#!/usr/bin/env python3
"""Tactics knowledge base — quick, read-only lookup over Convex `xTactics`.

  tactics.py sync                 pull all four pillars from the LIVE deployment into the cache
  tactics.py find <words…>        rows whose id / text / source contain every word (case-insensitive)
  tactics.py show <ID> [<ID>…]    full rows, e.g. CLD-010 PPR-003
  tactics.py pillar <name>        clockify | paper | writing | claude
  tactics.py stats                counts by pillar × status, and how many carry a worksheet

Source of record: Convex `xTactics` on neat-hamster-414 (the LIVE deployment despite its `dev:`
name — never trust a `--prod` read). `content/x/seed/tactics.tsv` is the stale 36-row seed; do
not cite it. Reads only: `sync` calls the owner-gated `xTactics:listByPillar` query with a CLI
identity, from the main checkout (it needs its node_modules + .env.local, which worktrees lack).
Cache: ~/.cache/icmb-training/tactics.json — re-sync before citing; `find`/`show` print its age.
"""
import json, os, subprocess, sys, time

CACHE = os.path.expanduser("~/.cache/icmb-training/tactics.json")
PILLARS = ["clockify", "paper", "writing", "claude"]
IDENTITY = json.dumps({"subject": "cli_seed", "issuer": "https://cli.local",
                       "tokenIdentifier": "https://cli.local|cli_seed",
                       "email": "matthew@icodemybusiness.com", "emailVerified": True})


def main_checkout():
    common = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                            capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
    if common.returncode:
        sys.exit("not inside the icodemybusiness-site repo")
    return os.path.dirname(common.stdout.strip())


def sync():
    root, rows = main_checkout(), []
    for p in PILLARS:
        r = subprocess.run(["npx", "convex", "run", "xTactics:listByPillar", json.dumps({"pillar": p}),
                            "--identity", IDENTITY], capture_output=True, text=True, cwd=root, timeout=180)
        if r.returncode:
            sys.exit(f"sync failed on pillar {p}:\n{r.stderr[-1500:]}\n"
                     "401/MissingAccessToken = the Convex CLI is logged out machine-wide; Matthew runs `npx convex dev`.")
        rows += json.loads(r.stdout)
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({"syncedAt": time.time(), "deployment": "neat-hamster-414", "rows": rows}, open(CACHE, "w"), indent=1)
    print(f"synced {len(rows)} tactics → {CACHE}")
    stats(rows)


def load():
    if not os.path.exists(CACHE):
        sys.exit("no cache yet — run: tactics.py sync")
    d = json.load(open(CACHE))
    age = (time.time() - d["syncedAt"]) / 3600
    print(f"# cache {age:.1f}h old ({len(d['rows'])} rows){'  — STALE, re-sync before citing' if age > 24 else ''}",
          file=sys.stderr)
    return d["rows"]


def line(r):
    ws = "  [worksheet]" if r.get("worksheetUrl") else ""
    return f"{r['tacticId']:8} {r['status']:8} {r['text']}{ws}\n         source: {r['source']}"


def stats(rows):
    for p in PILLARS:
        sub = [r for r in rows if r["pillar"] == p]
        by = {s: sum(r["status"] == s for r in sub) for s in ("approved", "pending", "retired")}
        print(f"{p:9} {len(sub):3}  approved {by['approved']:3}  pending {by['pending']:3}  "
              f"retired {by['retired']:3}  with worksheet {sum(bool(r.get('worksheetUrl')) for r in sub):3}")


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    cmd, args = argv[0], argv[1:]
    if cmd == "sync":
        return sync()
    rows = load()
    if cmd == "stats":
        stats(rows)
    elif cmd == "pillar":
        for r in sorted((r for r in rows if r["pillar"] == args[0]), key=lambda r: r["tacticId"]):
            print(line(r))
    elif cmd == "show":
        want = {a.upper() for a in args}
        for r in rows:
            if r["tacticId"] in want:
                print(json.dumps({k: v for k, v in r.items() if not k.startswith("_")}, indent=1))
                want.discard(r["tacticId"])
        if want:
            sys.exit(f"not found: {' '.join(sorted(want))}")
    elif cmd == "find":
        words = [a.lower() for a in args]
        for r in sorted(rows, key=lambda r: r["tacticId"]):
            hay = f"{r['tacticId']} {r['text']} {r['source']}".lower()
            if all(w in hay for w in words):
                print(line(r))
    else:
        sys.exit(f"unknown command {cmd!r}\n{__doc__}")


if __name__ == "__main__":
    main(sys.argv[1:])
