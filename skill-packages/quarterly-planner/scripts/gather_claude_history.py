#!/usr/bin/env python3
"""Mine your local Claude Code history for quarterly-planning signal.

READ-ONLY. Scans ~/.claude/projects/**/*.jsonl (session transcripts) and
~/.claude/history.jsonl for: explicit /goal commands, goal-shaped statements
("I want to", "we should", "need to"...), and recurring themes (word frequency).
Writes a markdown digest you can hand to the planner. Never writes to ~/.claude.

Usage:
    python3 gather_claude_history.py --days 120 --out context/claude-history.md
"""
from __future__ import annotations
import argparse, json, os, re, sys, time
from collections import Counter
from pathlib import Path

CLAUDE_DIR = Path(os.path.expanduser("~/.claude"))
GOAL_CMD = re.compile(r"/goal\b[ \t]+(.+)", re.IGNORECASE)
GOAL_PHRASE = re.compile(
    r"\b(i want to|we should|we need to|i need to|planning to|plan to|"
    r"my goal|our goal|the goal is|let's build|i'd like to|going to ship|"
    r"this quarter|next quarter|by end of)\b",
    re.IGNORECASE,
)
STOP = set("""the a an and or but to of in on for with at by from as is are was were be been
being this that these those it its it's i you we they he she them our your their my me us
do does did done will would can could should may might must have has had not no yes if then
than so just like get got make made want need new use using used one two get add set run
file files code page user data app run com http https www claude please thanks ok okay
about into out up down over more most some any all can't don't i'm we're it's that's""".split())
WORD = re.compile(r"[A-Za-z][A-Za-z0-9'-]{2,}")


def iter_texts(path: Path):
    """Yield (epoch_or_None, role, text) from a .jsonl file, defensively."""
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = obj.get("timestamp") or obj.get("time") or obj.get("created_at")
                epoch = None
                if isinstance(ts, (int, float)):
                    epoch = float(ts if ts < 1e12 else ts / 1000.0)
                elif isinstance(ts, str):
                    try:
                        from datetime import datetime
                        epoch = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                    except ValueError:
                        epoch = None
                msg = obj.get("message", obj)
                role = (msg.get("role") or obj.get("type") or "").lower()
                content = msg.get("content", obj.get("display", obj.get("text", "")))
                for text in _flatten(content):
                    yield epoch, role, text
    except OSError:
        return


def _flatten(content):
    if isinstance(content, str):
        if content.strip():
            yield content
    elif isinstance(content, list):
        for part in content:
            if isinstance(part, str):
                yield part
            elif isinstance(part, dict) and part.get("type") == "text" and part.get("text"):
                yield part["text"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=120, help="look-back window")
    ap.add_argument("--out", default="context/claude-history.md")
    args = ap.parse_args()

    if not CLAUDE_DIR.exists():
        print(f"No Claude history at {CLAUDE_DIR}", file=sys.stderr)
        return 1

    cutoff = time.time() - args.days * 86400
    files = list((CLAUDE_DIR / "projects").rglob("*.jsonl"))
    hist = CLAUDE_DIR / "history.jsonl"
    if hist.exists():
        files.append(hist)

    goals, phrases, words = [], [], Counter()
    for f in files:
        # Cheap pre-filter: skip files untouched in the window.
        try:
            if f.stat().st_mtime < cutoff:
                continue
        except OSError:
            continue
        for epoch, role, text in iter_texts(f):
            if epoch is not None and epoch < cutoff:
                continue
            if role and role not in ("user", "human", "command"):
                continue
            m = GOAL_CMD.search(text)
            if m:
                goals.append(m.group(1).strip()[:300])
            elif GOAL_PHRASE.search(text) and len(text) < 400:
                phrases.append(text.strip())
            for w in WORD.findall(text.lower()):
                if w not in STOP:
                    words[w] += 1

    # De-dup while preserving order.
    def dedup(seq, n):
        seen, out = set(), []
        for s in seq:
            k = s.lower()
            if k not in seen:
                seen.add(k); out.append(s)
            if len(out) >= n:
                break
        return out

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as o:
        o.write(f"# Claude history signal (last {args.days} days)\n\n")
        o.write(f"_Scanned {len(files)} session files. Read-only._\n\n")
        o.write("## Explicit goals (`/goal`)\n\n")
        gs = dedup(goals, 40)
        o.write("\n".join(f"- {g}" for g in gs) + "\n\n" if gs else "_None found._\n\n")
        o.write("## Goal-shaped statements\n\n")
        ps = dedup(phrases, 40)
        o.write("\n".join(f"- {p}" for p in ps) + "\n\n" if ps else "_None found._\n\n")
        o.write("## Recurring themes (top terms)\n\n")
        top = [f"{w} ({c})" for w, c in words.most_common(30)]
        o.write(", ".join(top) + "\n" if top else "_None found._\n")

    print(f"Wrote {out_path} — {len(gs)} goals, {len(ps)} statements, {len(words)} terms.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
