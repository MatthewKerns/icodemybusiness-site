#!/usr/bin/env python3
"""Academy links & citations — read-only checks over the Skool Academy sources of record.

  academy.py check                 integrity of outline ↔ worksheet-links.tsv ↔ Drive Docs ↔ tactics
  academy.py brief <N.T | words>   everything known about one training: Doc row, outline item, tactics,
                                   citations — read this BEFORE drafting (the "check your knowledge" step)
  academy.py lint <draft.md>…      citation lint for a lesson / worksheet draft (exit 1 on any FAIL)

Sources (Drive desktop mount, 12kernsmatthew — the reliable path; never move these files):
  Skool Academy/academy-outline.md   Matthew's words, cited — the citation of record
  Skool Academy/worksheet-links.tsv  "N.T Title<TAB>Doc URL", no header; the Doc URL is the join key
  Skool Academy/Skool Worksheets/    the Docs (.gdoc stubs carry doc_id)
  Youtube Content Plan/Transcripts/  the transcripts the outline's tags point at
Tactics come from the tactics.py cache (run `tactics.py sync` first; checks skip them if absent).

Citation forms a draft line may carry (see SKILL.md § Citations):
  [BT] [WC] [P2D] [P4D] …  a tag defined in the outline header        (P1 4:32) / (P2 0:52)  outline video
  [CLK-003]                a tactic id that exists in the bank         [Fathom <call-id> m:ss] unpaid-client call, his segment
  [tsv 2.1]                a worksheet row                             [Matthew: …] open — he has to say it
"""
import json, os, re, sys, time
from collections import Counter, defaultdict

DRIVE = os.path.expanduser("~/Library/CloudStorage/GoogleDrive-12kernsmatthew@gmail.com/My Drive/iCodeMyBusiness")
ACAD = os.path.join(DRIVE, "Skool Academy")
OUTLINE = os.path.join(ACAD, "academy-outline.md")
TSV = os.path.join(ACAD, "worksheet-links.tsv")
SHEETS = os.path.join(ACAD, "Skool Worksheets")
TRANSCRIPTS = os.path.join(DRIVE, "Youtube Content Plan", "Transcripts")
TACTICS = os.path.expanduser("~/.cache/icmb-training/tactics.json")

DOC_ID = re.compile(r"docs\.google\.com/document/d/([A-Za-z0-9_-]{20,})")
TAG_DEF = re.compile(r"cited (?:below )?as `\[([A-Z0-9]+)\]`|—\s*cited as `\[([A-Z0-9]+)\]`")
TACTIC_ID = re.compile(r"\b(CLK|PPR|WRT|CLD)-\d{3}\b")
VIDEO_TS = re.compile(r"\bP[12] \d{1,2}:\d{2}\b")
FATHOM = re.compile(r"\[Fathom \d+ \d{1,2}:\d{2}(?::\d{2})?\]")
MATTHEW = re.compile(r"\[Matthew:")
CLAIM = re.compile(r"\b(\d+(?:\.\d+)?\s?(?:%|percent|minutes?|min|hours?|hrs?|days?|weeks?|months?|x)|every|always|never fails|guarantee\w*|\$\s?\d)", re.I)

results = []  # (level, msg)


def say(level, msg):
    results.append((level, msg))


def need(path):
    if not os.path.exists(path):
        sys.exit(f"missing: {path}\nIs the Google Drive desktop mount (12kernsmatthew) running?")


def read_tsv():
    need(TSV)
    rows = []
    for n, raw in enumerate(open(TSV, encoding="utf-8"), 1):
        raw = raw.rstrip("\n")
        if not raw.strip():
            continue
        parts = raw.split("\t")
        m = re.match(r"^(\d+\.\d+)\s+(.*)$", parts[0].strip())
        doc = DOC_ID.search(parts[1]) if len(parts) > 1 else None
        rows.append({"line": n, "label": parts[0].strip(), "num": m.group(1) if m else None,
                     "title": m.group(2) if m else parts[0].strip(),
                     "url": parts[1].strip() if len(parts) > 1 else "", "doc": doc.group(1) if doc else None})
    return rows


def read_gdocs():
    need(SHEETS)
    out = {}
    for root, _, files in os.walk(SHEETS):
        for f in files:
            if f.endswith(".gdoc"):
                p = os.path.join(root, f)
                try:
                    out[json.load(open(p))["doc_id"]] = os.path.relpath(p, SHEETS)
                except Exception as e:  # unreadable stub → report, don't crash
                    say("WARN", f"unreadable .gdoc stub {os.path.relpath(p, SHEETS)}: {e}")
    return out


def read_outline():
    need(OUTLINE)
    text = open(OUTLINE, encoding="utf-8").read()
    header = text.split("\n## ", 1)[0]
    tags = {}
    for line_tag in re.finditer(r"`([^`]+\.txt)`[^`]*?cited (?:below )?as `\[([A-Z0-9]+)\]`", header, re.S):
        tags[line_tag.group(2)] = line_tag.group(1)
    # trainings: "## Pillar N — Name" sections, numbered "k. **Title**" items
    items, pillar = [], None
    lines = text.split("\n")
    for i, line in enumerate(lines):
        h = re.match(r"^## Pillar (\d) — (.+)$", line)
        if h:
            pillar = int(h.group(1)); continue
        if line.startswith("## "):
            pillar = None; continue
        it = re.match(r"^(\d+)\. \*\*(.+?)\*\*", line)
        if pillar and it:
            body = [line]
            for nxt in lines[i + 1:]:
                if re.match(r"^(\d+)\. \*\*|^## ", nxt):
                    break
                body.append(nxt)
            items.append({"pillar": pillar, "k": int(it.group(1)), "title": it.group(2), "line": i + 1,
                          "body": "\n".join(body).rstrip()})
    return text, tags, items


def load_tactics():
    if not os.path.exists(TACTICS):
        return None
    d = json.load(open(TACTICS))
    age = (time.time() - d["syncedAt"]) / 3600
    if age > 24:
        say("WARN", f"tactics cache is {age:.0f}h old — run tactics.py sync")
    return d["rows"]


def check():
    rows, gdocs = read_tsv(), read_gdocs()
    text, tags, items = read_outline()
    tactics = load_tactics()

    # tsv shape + joins
    for r in rows:
        if not r["doc"]:
            say("FAIL", f"tsv line {r['line']} '{r['label']}': no Google Doc URL")
    docs = Counter(r["doc"] for r in rows if r["doc"])
    for d, c in docs.items():
        if c > 1:
            say("FAIL", f"tsv: Doc {d} listed {c}× — the Doc URL is the join key and must be unique")
    nums = defaultdict(list)
    for r in rows:
        if r["num"]:
            nums[r["num"]].append(r["title"])
    for n, titles in sorted(nums.items()):
        if len(titles) > 1:
            say("WARN", f"tsv: training number {n} used {len(titles)}×: {' | '.join(titles)} — key on Doc URL; pending Matthew")
    tsv_docs = set(docs)
    for r in rows:
        if r["doc"] and r["doc"] not in gdocs:
            say("FAIL", f"tsv '{r['label']}': Doc not found under Skool Worksheets/ (moved out, trashed, or mount stale)")
    for d, rel in sorted(gdocs.items(), key=lambda x: x[1]):
        if d not in tsv_docs:
            say("WARN", f"orphan Doc (not in tsv): {rel}")
        elif os.sep not in rel:
            say("WARN", f"Doc filed in the parent folder, not a module folder: {rel}")

    # outline citations
    for tag, path in tags.items():
        full = os.path.join(DRIVE, path)
        if not os.path.exists(full):
            say("FAIL", f"outline tag [{tag}] points at a missing transcript: {path}")
    used = Counter(re.findall(r"`\[([A-Z0-9]+)(?:[\] —])", text))
    for tag in used:
        if tag not in tags:
            say("FAIL", f"outline uses tag [{tag}] that its header never defines")
    uncited = [it for it in items if not (re.search(r"`\[[A-Z0-9]+", it["body"]) or VIDEO_TS.search(it["body"]))]
    for it in uncited:
        say("WARN", f"outline P{it['pillar']} item {it['k']} '{it['title']}' (line {it['line']}): no item-level [tag] or P1/P2 timestamp (only the section's) — find the transcript line before citing it")
    open_marks = len(MATTHEW.findall(text))

    # tactics ↔ worksheets
    if tactics is not None:
        tac_docs = {}
        for t in tactics:
            m = DOC_ID.search(t.get("worksheetUrl") or "")
            if m:
                tac_docs.setdefault(m.group(1), []).append(t)
        for d, ts in tac_docs.items():
            if d not in tsv_docs:
                say("WARN", f"tactic {','.join(t['tacticId'] for t in ts)} links a worksheet that is not in the tsv")
            for t in ts:
                if t["status"] == "retired":
                    say("WARN", f"retired tactic {t['tacticId']} still carries a worksheet")
        no_tac = [r for r in rows if r["doc"] and r["doc"] not in tac_docs]
        say("INFO", f"{len(no_tac)} of {len(rows)} tsv Docs have no tactic pointing at them (Start-here pages and lesson packs are expected)")
        approved = sum(t["status"] == "approved" for t in tactics)
        say("INFO", f"tactics: {len(tactics)} in bank, {approved} approved — a pending tactic is a lead, not a citation of record")

    by_mod = Counter((r["num"] or "packs").split(".")[0] for r in rows)
    say("INFO", f"tsv {len(rows)} rows ({', '.join(f'M{k} {v}' if k.isdigit() else f'{k} {v}' for k, v in sorted(by_mod.items()))}); "
                f"{len(gdocs)} Docs on the mount; outline {len(items)} trainings, tags {sorted(tags)}, {open_marks} open [Matthew: …] markers")
    return report()


def brief(query):
    rows, (text, tags, items), tactics = read_tsv(), read_outline(), load_tactics() or []
    q = " ".join(query)
    num = re.fullmatch(r"\d+\.\d+", q)
    hit_rows = [r for r in rows if (num and r["num"] == q) or (not num and q.lower() in r["label"].lower())]
    print(f"# brief: {q}\n")
    print("## Worksheet Docs (tsv)")
    for r in hit_rows or []:
        print(f"- {r['label']} — {r['url']}")
    if not hit_rows:
        print("- none in worksheet-links.tsv")
    docs = {r["doc"] for r in hit_rows}
    print("\n## Tactics pointing at those Docs (hard join on Doc URL)")
    linked = [t for t in tactics if (m := DOC_ID.search(t.get("worksheetUrl") or "")) and m.group(1) in docs]
    for t in linked:
        print(f"- [{t['tacticId']}] ({t['status']}) {t['text']}  — source: {t['source']}")
    if not linked:
        print("- none" if tactics else "- (no tactics cache — run tactics.py sync)")
    print("\n## Outline item(s) — Matthew's words, the citation of record")
    if num:
        p, k = (int(x) for x in q.split("."))
        cand = [it for it in items if it["pillar"] == p and it["k"] == k]
        print("_Outline numbers and Doc numbers are NOT reliably aligned (Docs have N.0 Start here, M3 has duplicates). "
              "Confirm by title before citing._\n")
    else:
        cand = [it for it in items if q.lower() in it["title"].lower() or q.lower() in it["body"].lower()]
    titles = " ".join(r["title"].lower() for r in hit_rows)
    cand += [it for it in items if it not in cand and hit_rows and
             len(set(re.findall(r"[a-z]{4,}", it["title"].lower())) & set(re.findall(r"[a-z]{4,}", titles))) >= 2]
    for it in cand:
        print(f"### P{it['pillar']} #{it['k']} {it['title']}  (academy-outline.md line {it['line']})\n{it['body']}\n")
    if not cand:
        print("- no matching outline item")
    print("## Related tactics (keyword match — leads, verify before citing)")
    words = set(re.findall(r"[a-z]{5,}", (titles + " " + " ".join(it["title"].lower() for it in cand))))
    rel = [t for t in tactics if t not in linked and len(words & set(re.findall(r"[a-z]{5,}", t["text"].lower()))) >= 1]
    for t in rel[:12]:
        print(f"- [{t['tacticId']}] ({t['status']}) {t['text']}")
    print(f"\n## Citation tags available\n" + "\n".join(f"- [{k}] → {v}" for k, v in sorted(tags.items())))


def lint(paths):
    rows = read_tsv()
    _, tags, _ = read_outline()
    tactics = load_tactics()
    tsv_docs = {r["doc"] for r in rows if r["doc"]}
    tsv_nums = {r["num"] for r in rows if r["num"]}
    known = {t["tacticId"] for t in tactics} if tactics is not None else None
    for path in paths:
        in_fence = False
        for n, line in enumerate(open(path, encoding="utf-8"), 1):
            if line.strip().startswith("```"):
                in_fence = not in_fence
            if in_fence or not line.strip() or line.lstrip().startswith("#"):
                continue
            where = f"{os.path.basename(path)}:{n}"
            for d in DOC_ID.findall(line):
                if d not in tsv_docs:
                    say("FAIL", f"{where}: links a Google Doc that is not in worksheet-links.tsv ({d[:12]}…)")
            for t in re.findall(r"\[(?:BT|WC|P2D|P4D|[A-Z][A-Z0-9]{1,4})\]", line):
                tag = t.strip("[]")
                if not TACTIC_ID.fullmatch(tag) and tag not in tags:
                    say("FAIL", f"{where}: citation tag {t} is not defined in the outline header")
            for tid in set(m.group(0) for m in TACTIC_ID.finditer(line)):
                if known is not None and tid not in known:
                    say("FAIL", f"{where}: tactic {tid} is not in the bank")
            for n2 in re.findall(r"\[tsv (\d+\.\d+)\]", line):
                if n2 not in tsv_nums:
                    say("FAIL", f"{where}: [tsv {n2}] has no row")
            cited = (re.search(r"\[(?:%s)\]" % "|".join(map(re.escape, tags)), line) or VIDEO_TS.search(line)
                     or FATHOM.search(line) or TACTIC_ID.search(line) or re.search(r"\[tsv \d+\.\d+\]", line))
            open_q = MATTHEW.search(line)
            if re.search(r"[\"“][^\"”]{12,}[\"”]", line) and not (cited or open_q):
                say("FAIL", f"{where}: quotation with no citation — trace it or cut it")
            elif CLAIM.search(line) and not (cited or open_q):
                say("WARN", f"{where}: number/duration/absolute with no citation — copy-principles §2 claim scan: "
                            f"{CLAIM.search(line).group(0)!r}")
            if open_q:
                say("INFO", f"{where}: open [Matthew: …] marker — list it for his sign-off")
    return report()


def report():
    order = {"FAIL": 0, "WARN": 1, "INFO": 2}
    for level, msg in sorted(results, key=lambda r: order[r[0]]):
        print(f"{level:4}  {msg}")
    c = Counter(l for l, _ in results)
    print(f"\n{c['FAIL']} FAIL · {c['WARN']} WARN · {c['INFO']} INFO")
    return 1 if c["FAIL"] else 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); sys.exit(0)
    if a[0] == "check":
        sys.exit(check())
    if a[0] == "brief" and a[1:]:
        brief(a[1:]); sys.exit(0)
    if a[0] == "lint" and a[1:]:
        sys.exit(lint(a[1:]))
    sys.exit(__doc__)
