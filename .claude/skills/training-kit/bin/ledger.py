#!/usr/bin/env python3
"""Training usage ledger — what building trainings actually costs, in time, compute, credits and tools.

Collectors (re-running one replaces its events for that window, including entries deleted at the source):
  ledger.py claude-code <start> <end>        Claude Code sessions that touched training files (tokens, active minutes)
  ledger.py clockify <entries.json>          time entries saved from Mango get_time_entries (see SKILL.md for the call)
  ledger.py higgsfield <tx.json> [gens.json] credit spends saved from the Higgsfield connector (transactions [+ show_generations])
  ledger.py artifacts <list.txt>             claude.ai artifact list (Artifact action:list output) → new/updated artifacts
  ledger.py gdocs                            worksheet Docs changed on the Drive mount since the last run
  ledger.py subscriptions <YYYY-MM>          one row per paid tool for the month, from tools.tsv (price or "unknown")
  ledger.py log --source claude_project --qty 0.5 --unit hours [--training m2] --note "…"   the 10-second manual line
  ledger.py run [--training ID] -- <cmd…>    run a kit tool and log it as a free_tool run (bin/kit does this for you)
Registry and reports:
  ledger.py registry                         (re)build trainings.tsv from the latest Skool snapshot + worksheet-links.tsv
  ledger.py tools                            the paid/free tool list and what is still unknown
  ledger.py drift                            per live lesson: worksheet linked? lesson edited after its Doc? (read-only)
  ledger.py report [<start> <end>]           totals by source, by module/training, by day; what is unassigned or unpriced

Dates are YYYY-MM-DD in Matthew's timezone (TRAINING_TZ, default America/Los_Angeles).
Ledger: $TRAINING_LEDGER_DIR (default ~/.icmb-training/ledger). Event shape: bin/ledgerlib.py.
Honesty rules: session-level Claude Code attribution is a heuristic and says so; a Clockify entry counts as
training only if its DESCRIPTION says so (the "Skool building" project also holds offer and landing-page work);
Claude is on subscription plans, so no dollar figure is written for tokens; unknown prices stay "unknown".
"""
import collections, datetime as dt, glob, json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledgerlib import (COURSE_MODULE, DOC_ID, DRIVE, LEDGER, REGISTRY, TZ, event, local_date, module_of,  # noqa: E402
                       parse_ts, read_events, read_registry, registry_lookup, slug, upsert)

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(LEDGER, "tools.tsv")
STATE = os.path.join(LEDGER, "state.json")
SNAPS = os.path.join(LEDGER, "skool", "snapshots")

# ---- Claude Code -----------------------------------------------------------------------------
PATH_MARKERS = ["content/skool", "skills/training-kit", "skills/training-", "Skool Academy", "worksheet-links",
                "academy-outline", "skool-worksheet", "Youtube Content Plan", ".icmb-training"]
MODULE_PATHS = [("m1", r"module-1|Module 1 ·|clockify-training"), ("m2", r"module-2|Module 2 ·|Plan on Paper Review"),
                ("m3", r"module-3|Module 3 ·|writing-training"), ("m4", r"module-4|Module 4 ·|Claude Training Review")]
TOK = ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")
IDLE = 300          # a gap of 5+ minutes between transcript lines is idle (understates long agent turns)


def cc_scan(fp, acc):
    with open(fp, errors="replace") as f:
        for line in f:
            try:
                d = json.loads(line)
            except Exception:
                continue
            t = d.get("type")
            if t == "custom-title" and d.get("customTitle"):
                acc["name"] = d["customTitle"]
            elif t == "agent-name" and not acc["name"]:
                acc["name"] = d.get("agentName")
            if t not in ("assistant", "user") or "timestamp" not in d:
                continue
            T = parse_ts(d["timestamp"])
            day = acc["days"][T.astimezone(TZ).date().isoformat()]
            day["ts"].append(T)
            m = d.get("message") or {}
            if t != "assistant":
                continue
            u, key = m.get("usage"), (m.get("id"), d.get("requestId"))
            if u and m.get("model") != "<synthetic>":
                # a message is written once per content block; only its LAST line carries the real counts
                first = acc["usage"].get(key)
                acc["usage"][key] = (first[0] if first else T.astimezone(TZ).date().isoformat(), m.get("model", "?"), u)
            for b in m.get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    s = json.dumps(b.get("input") or {})
                    if any(p in s for p in PATH_MARKERS):
                        day["paths"] += 1
                        for mod, pat in MODULE_PATHS:
                            if re.search(pat, s):
                                day["mods"][mod] += 1


def claude_code(start, end, all_projects=False):
    lo = dt.datetime.fromisoformat(start).replace(tzinfo=TZ)
    roots = glob.glob(os.path.expanduser("~/.claude/projects/*icodemybusiness-site*"))
    if all_projects:
        roots = glob.glob(os.path.expanduser("~/.claude/projects/*")) + glob.glob(os.path.expanduser("~/.claude-*/projects/*"))
    out = []
    for root in roots:
        for fp in glob.glob(os.path.join(root, "*.jsonl")):
            if dt.datetime.fromtimestamp(os.path.getmtime(fp), TZ) < lo:
                continue
            sid = os.path.basename(fp)[:-6]
            acc = {"name": None, "usage": {}, "days": collections.defaultdict(lambda: {
                "ts": [], "paths": 0, "mods": collections.Counter(), "tok": collections.defaultdict(collections.Counter)})}
            cc_scan(fp, acc)
            for dp, _, files in os.walk(os.path.join(root, sid)):          # subagents AND nested workflow agents
                for f in files:
                    if f.endswith(".jsonl") and f != "journal.jsonl":
                        cc_scan(os.path.join(dp, f), acc)
            for uday, model, u in acc["usage"].values():
                for k in TOK:
                    acc["days"][uday]["tok"][model][k] += u.get(k, 0) or 0
            for day, d in acc["days"].items():
                if not d["ts"]:
                    continue
                if not (start <= day <= end) or d["paths"] < 3:      # 1–2 stray path mentions are not training work
                    continue
                xs = sorted(d["ts"])
                active = sum((b - a).total_seconds() for a, b in zip(xs, xs[1:]) if (b - a).total_seconds() < IDLE) / 60
                out_tok = sum(c["output_tokens"] for c in d["tok"].values())
                top = d["mods"].most_common(1)
                mod = top[0][0] if top and top[0][1] >= 3 and top[0][1] >= 0.6 * sum(d["mods"].values()) else None
                out.append(event("claude_code", "compute", f"{sid}@{day}", xs[0], out_tok, "tokens_out", ts_end=xs[-1],
                                 training_id=mod or "academy", method="path", confidence="heuristic", actor="agent",
                                 detail={"session": acc["name"] or sid[:8], "session_id": sid, "active_minutes": round(active, 1),
                                         "path_hits": d["paths"], "module_hits": dict(d["mods"]),
                                         "tokens": {m: dict(c) for m, c in d["tok"].items()},
                                         "note": "whole session-day; mixed-purpose sessions overstate the training share"},
                                 label="INFERRED"))
    return out


# ---- Clockify (via a saved Mango get_time_entries result) -------------------------------------
CLIENT = "iCodeMyBusiness"
CLAUDE_PROJECT = re.compile(r"claude (project|chat)", re.I)
TRAINING_PROJECTS = ("Skool building", "Educational Marketing")     # confirmed training buckets under the iCodeMyBusiness client
TRAINING_DESC = re.compile(r"training|lesson|module|worksheet|classroom|academy|curriculum|quiz|workbook|transcri|"
                           r"skool (video|content)|training builder", re.I)
# outside those projects a description must name the academy AND a training thing ("check in" alone is not training)
TRAINING_ELSEWHERE = re.compile(r"(skool|academy).*(training|lesson|module|worksheet)|(training|lesson|module|worksheet).*(skool|academy)|"
                                r"record(ing)? trainings", re.I)
STAGES = [("source", r"record|transcri|dictat|ingest|outline|film"), ("rewrite", r"revis|rewrite|updat|polish"),
          ("review", r"review|approv|verify|fact|audit"), ("publish", r"paste|publish|classroom|upload|post "),
          ("cover", r"cover|thumbnail|graphic|higgsfield"), ("draft", r"draft|worksheet|write|build|create|set up|plan")]


def stage_of(text):
    for s, pat in STAGES:
        if re.search(pat, text or "", re.I):
            return s
    return "other"


def clockify(path):
    d = json.load(open(path, encoding="utf-8"))
    rows = d if isinstance(d, list) else d.get("entries", [])
    out = []
    for r in rows:
        if (r.get("client") or CLIENT) != CLIENT:
            continue                                   # other clients' time never enters the ledger
        desc = r.get("description") or ""
        in_bucket = r.get("project") in TRAINING_PROJECTS
        is_training = bool((TRAINING_DESC if in_bucket else TRAINING_ELSEWHERE).search(desc))
        if not in_bucket and not is_training:
            continue                                   # unrelated work: never enters the ledger
        mod = module_of(desc) if is_training else None
        hours = r.get("duration_hours") or (r.get("duration_seconds") or 0) / 3600
        out.append(event("clockify", "time", r["id"], r["start"], float(hours), "hours", ts_end=r.get("end"),
                         training_id=mod or ("academy" if is_training else None), method="description",
                         confidence="module" if mod else ("heuristic" if is_training else "unassigned"),
                         stage=stage_of(desc) if is_training else None, actor="matthew",
                         detail={"project": r.get("project"), "description": desc, "training_work": is_training,
                                 "claude_project": bool(CLAUDE_PROJECT.search(desc))}))
    w = d.get("window") if isinstance(d, dict) else None
    clockify.window = (w["start"], w["end"]) if w else None      # main() uses it to drop entries deleted at the source
    return out


# ---- Higgsfield (saved connector results) -----------------------------------------------------
HEADLINES = [("m1", r"\bCLOCKIFY\b"), ("m2", r"PLAN ON PAPER"), ("m3", r"WRITING CLARITY"), ("m4", r"\bCLAUDE\b"),
             ("academy", r"skool|academy|community cover|human in the loop|icodemybusiness|worksheet")]


def higgsfield(tx_path, gens_path=None):
    if tx_path.endswith(".tsv"):
        # compact form Claude writes after reading the connector in-session (the result is not a file):
        #   created_at <TAB> credits <TAB> n <TAB> model <TAB> training_id or - <TAB> note      (n = generations in the row)
        out = []
        for line in open(tx_path, encoding="utf-8"):
            if not line.strip() or line.startswith("#"):
                continue
            at, credits, n, model, tid, note = (line.rstrip("\n").split("\t") + [""] * 6)[:6]
            tid = None if tid in ("-", "") else tid
            out.append(event("higgsfield", "generation", f"{at}#{model}#{n}", at, float(credits), "credits", training_id=tid,
                             method="prompt" if tid else "none", confidence=("module" if re.fullmatch(r"m\d", tid or "") else "heuristic") if tid else "unassigned",
                             stage="cover" if tid else None, actor="agent", detail={"model": model, "generations": int(n or 1), "note": note},
                             label="REPORTED"))
        return out
    tx = json.load(open(tx_path, encoding="utf-8")); tx = tx if isinstance(tx, list) else tx.get("items", [])
    gens = []
    if gens_path:
        g = json.load(open(gens_path, encoding="utf-8")); gens = g if isinstance(g, list) else g.get("items", [])
    gts = [(parse_ts(g.get("createdAt") or g.get("created_at")), g) for g in gens if g.get("createdAt") or g.get("created_at")]
    out, seen = [], collections.Counter()
    for t in tx:
        if t.get("action") not in ("spend", "refund"):
            continue
        # id from the row's own fields (never its list position: the list is newest-first and shifts)
        base = f"{t['created_at']}#{t.get('display_name')}#{t.get('credits')}"
        seen[base] += 1
        ref = f"{base}#{seen[base]}"
        T, tid, conf, det = parse_ts(t["created_at"]), None, "unassigned", {"model": t.get("display_name"), "action": t["action"]}
        if t["action"] == "refund":
            out.append(event("higgsfield", "generation", ref, T, -abs(float(t.get("credits") or 0)), "credits", actor="agent", detail=det))
            continue
        near = min(gts, key=lambda x: abs((x[0] - T).total_seconds()), default=None)
        if near and abs((near[0] - T).total_seconds()) <= 2:
            prompt = (near[1].get("params") or {}).get("prompt") or ""
            det.update(generation_id=near[1].get("id"), prompt_head=prompt[:140], type=near[1].get("type"))
            for mid, pat in HEADLINES:
                if re.search(pat, prompt, re.I if mid == "academy" else 0):     # module headlines are quoted CAPS in the prompt
                    tid, conf = mid, "module" if mid != "academy" else "heuristic"
                    break
        out.append(event("higgsfield", "generation", ref,
                         T, abs(float(t.get("credits") or 0)), "credits", training_id=tid, method="prompt" if tid else "none",
                         confidence=conf, stage="cover" if tid else None, actor="agent", detail=det))
    return out


# ---- claude.ai artifacts ----------------------------------------------------------------------
ART = re.compile(r"- \((mine|shared)\) (.+?) — (https://claude\.ai/artifact/\S+?)(?: — updated (\d{4}-\d\d-\d\d))?$")
ART_ANCHOR = re.compile(r"skool|academy|icodemybusiness|plan on paper|writing clarity", re.I)          # ours, not another client's
ART_TRAINING = re.compile(r"training|lesson|worksheet|quiz|check\b|academy|classroom|curriculum|promise audit|module", re.I)


def load_state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {}


PENDING_STATE = None        # collectors set this; main() saves it only after the events are safely written


def save_state(s):
    os.makedirs(LEDGER, exist_ok=True)
    json.dump(s, open(STATE, "w"), indent=1)


def artifacts(path):
    st = load_state(); seen = st.setdefault("artifacts", {})
    out = []
    for line in open(path, encoding="utf-8"):
        m = ART.match(line.strip())
        if not m:
            continue
        _, title, url, updated = m.groups()
        if not (ART_ANCHOR.search(title) and ART_TRAINING.search(title)):
            continue                                   # personal and unrelated artifacts never enter the ledger
        updated = updated or dt.date.today().isoformat()
        if seen.get(url, {}).get("updated") == updated and seen[url].get("title") == title:
            continue
        first = url not in seen
        seen[url] = {"title": title, "updated": updated}
        rel = True
        out.append(event("claude_artifact", "run", f"{url}@{updated}", dt.datetime.fromisoformat(updated + "T12:00:00").replace(tzinfo=TZ), 1, "changes",
                         training_id=(module_of(title) or "academy") if rel else None, method="description" if rel else "none",
                         confidence="heuristic" if rel else "unassigned", actor="agent",
                         detail={"title": title, "url": url, "change": "first seen" if first else "updated"}, label="REPORTED"))
    global PENDING_STATE
    PENDING_STATE = st
    return out


# ---- worksheet Docs on the Drive mount --------------------------------------------------------
def gdocs():
    root = os.path.join(DRIVE, "Skool Academy", "Skool Worksheets")
    if not os.path.isdir(root):
        sys.exit(f"Drive mount not found: {root}")
    st = load_state(); seen = st.setdefault("gdocs", {})
    _, by_doc = registry_lookup()
    out, first_run = [], not seen
    for dp, _, files in os.walk(root):
        for f in files:
            if not f.endswith(".gdoc"):
                continue
            p = os.path.join(dp, f)
            try:
                doc = json.load(open(p))["doc_id"]
            except Exception:
                continue
            mt = dt.datetime.fromtimestamp(os.path.getmtime(p), TZ).isoformat(timespec="seconds")
            if seen.get(doc) == mt:
                continue
            was = seen.get(doc); seen[doc] = mt
            folder = os.path.basename(dp)
            mod = module_of(folder.replace("·", "")) or next((v for k, v in COURSE_MODULE.items() if k in folder.lower()), None)
            out.append(event("gdoc", "doc_change", f"{doc}@{mt}", mt, 1, "changes",
                             training_id=by_doc.get(doc) or mod, method="doc_id" if doc in by_doc else "path",
                             confidence="exact" if doc in by_doc else ("module" if mod else "unassigned"),
                             detail={"title": f[:-5], "folder": folder, "doc_id": doc,
                                     "change": "modified" if was else "new Doc"}))
    global PENDING_STATE
    PENDING_STATE = st
    if first_run:                                   # the first scan only records where things stand; it is not a change
        print(f"gdocs: baselined {len(seen)} Docs (no events) — changes are reported from the next run on")
        return []
    return out


# ---- tools registry and subscriptions ---------------------------------------------------------
def read_tools():
    if not os.path.exists(TOOLS):
        os.makedirs(LEDGER, exist_ok=True)
        open(TOOLS, "w").write(open(os.path.join(KIT, "reference", "tools.tsv")).read())
    lines = [l.rstrip("\n") for l in open(TOOLS, encoding="utf-8") if l.strip() and not l.startswith("#")]
    head = lines[0].split("\t")
    return [dict(zip(head, l.split("\t") + [""] * len(head))) for l in lines[1:]]


def subscriptions(month):
    out = []
    for t in read_tools():
        if t["paid"] == "free":
            continue
        price = float(t["usd_month"]) if re.fullmatch(r"\d+(\.\d+)?", t["usd_month"] or "") else None
        out.append(event("paid_tool", "subscription", f"{t['tool']}@{month}", dt.datetime.fromisoformat(month + "-01T12:00:00").replace(tzinfo=TZ),
                         price if price is not None else 0, "usd_month", training_id="academy" if t["training_use"] == "yes" else None,
                         method="manual", confidence="heuristic" if t["training_use"] == "yes" else "unassigned",
                         cost_usd=price, cost_basis="actual", actor="matthew",
                         detail={"tool": t["tool"], "plan": t["plan"], "paid_status": t["paid"], "price_known": price is not None, "usage_unit": t["unit"],
                                 "read_path": t["read_path"], "training_use": t["training_use"],
                                 "note": "whole subscription for the month, not the training share"},
                         label="REPORTED"))
    return out


# ---- registry ---------------------------------------------------------------------------------
def registry():
    files = sorted(glob.glob(os.path.join(SNAPS, "*.json")))
    if not files:
        sys.exit("no Skool snapshot yet — run skool.py capture + import first")
    snap = json.load(open(files[-1]))
    old = read_registry()
    by_lesson = {r["skool_lesson_id"]: r for r in old if r.get("skool_lesson_id")}
    by_doc = {r["doc_id"]: r for r in old if r.get("doc_id")}
    tsv_titles = {}
    tsv = os.path.join(DRIVE, "Skool Academy", "worksheet-links.tsv")
    if os.path.exists(tsv):
        for l in open(tsv, encoding="utf-8"):
            p = l.rstrip("\n").split("\t")
            m = DOC_ID.search(p[1]) if len(p) > 1 else None
            if m:
                tsv_titles[m.group(1)] = p[0]
    rows, used, in_skool = [], set(), set()
    for c in snap["courses"]:
        mod = COURSE_MODULE.get(c["title"].lower(), "academy")
        for l in c["lessons"]:
            doc = l["docIds"][0] if l["docIds"] else ""
            prev = by_lesson.get(l["id"]) or (by_doc.get(doc) if doc else None)
            tid = prev["training_id"] if prev else f"{mod}-{slug(l['title'])}"
            while tid in used:
                tid += "-2"
            used.add(tid); in_skool.add(doc)
            rows.append({"training_id": tid, "module": mod, "skool_lesson_id": l["id"], "skool_course": c["title"], "doc_id": doc,
                         "tactic_ids": (prev or {}).get("tactic_ids", ""), "current_title": l["title"],
                         "status": "live" + ("" if doc else " · no worksheet linked")})
    for doc, label in tsv_titles.items():                       # worksheets that exist but are not in the Classroom
        if doc in in_skool:
            continue
        prev = by_doc.get(doc)
        num = re.match(r"(\d)\.", label)
        mod = f"m{num.group(1)}" if num else "academy"
        tid = prev["training_id"] if prev else f"{mod}-{slug(re.sub(r'^[0-9.]+ ', '', label))}"
        while tid in used:
            tid += "-2"
        used.add(tid)
        rows.append({"training_id": tid, "module": mod, "skool_lesson_id": "", "skool_course": "", "doc_id": doc,
                     "tactic_ids": (prev or {}).get("tactic_ids", ""), "current_title": label, "status": "worksheet only · not in Classroom"})
    head = ["training_id", "module", "skool_lesson_id", "skool_course", "doc_id", "tactic_ids", "current_title", "status"]
    os.makedirs(LEDGER, exist_ok=True)
    with open(REGISTRY, "w", encoding="utf-8") as f:
        f.write("# training registry — ids are permanent; titles and numbers are not. Rebuilt by `ledger.py registry`.\n")
        f.write("\t".join(head) + "\n")
        for r in rows:
            f.write("\t".join(r[h] for h in head) + "\n")
    # re-key earlier skool/gdoc events to registry ids
    L, D = registry_lookup(rows)
    retired = {r["training_id"]: D[r["doc_id"]] for r in old if r.get("doc_id") and D.get(r["doc_id"]) and D[r["doc_id"]] != r["training_id"]}
    retired.update({r["training_id"]: L[r["skool_lesson_id"]] for r in old
                    if r.get("skool_lesson_id") and L.get(r["skool_lesson_id"]) and L[r["skool_lesson_id"]] != r["training_id"]})
    ev = read_events(); fixed = []
    for e in ev.values():
        new = None
        if e["source"] == "skool":
            new = L.get((e["detail"].get("lesson_id") or ""))
        elif e["source"] == "gdoc":
            new = D.get(e["detail"].get("doc_id") or "")
        if new and e["training_id"] != new:
            e["training_id"] = new; e["attribution"] = {"method": "lesson_id" if e["source"] == "skool" else "doc_id", "confidence": "exact"}
            fixed.append(e)
        elif e["training_id"] in retired:            # an id that was merged into another training: carry its events along
            e["training_id"] = retired[e["training_id"]]
            fixed.append(e)
    upsert(fixed)
    live = sum(1 for r in rows if r["skool_lesson_id"])
    print(f"registry: {len(rows)} trainings ({live} live in Skool, {len(rows) - live} worksheet-only) → {REGISTRY}; re-keyed {len(fixed)} event(s)")


# ---- worksheet drift (read-only) ----------------------------------------------------------------
def drift():
    files = sorted(glob.glob(os.path.join(SNAPS, "*.json")))
    if not files:
        sys.exit("no Skool snapshot yet")
    snap, docs = json.load(open(files[-1])), load_state().get("gdocs", {})
    if not docs:
        print("(no Doc baseline yet — run `ledger.py gdocs` once; Doc dates below are blank until then)")
    L, _ = registry_lookup()
    print(f"# lesson vs worksheet, snapshot {os.path.basename(files[-1])}  (times local)\n")
    for c in snap["courses"]:
        for l in c["lessons"]:
            up = parse_ts(l["updatedAt"] + ("" if l["updatedAt"].endswith("Z") else "Z")).astimezone(TZ)
            doc = l["docIds"][0] if l["docIds"] else None
            dm = parse_ts(docs[doc]) if doc and doc in docs else None
            state = ("NO worksheet linked" if not doc else "Doc date unknown" if not dm else
                     "lesson edited AFTER its worksheet" if up > dm else "worksheet is newer or same")
            print(f"{c['title'][:16]:16} {l['title'][:42]:42} lesson {up:%m-%d %H:%M}  doc {dm.astimezone(TZ).strftime('%m-%d %H:%M') if dm else '—':11}  {state}  [{L.get(l['id'], '?')}]")


# ---- report -----------------------------------------------------------------------------------
def report(start=None, end=None):
    ev = [e for e in read_events().values() if (not start or start <= e["local_date"] <= end)]
    if not ev:
        print("no events in the window"); return
    print(f"# Training usage {start or min(e['local_date'] for e in ev)} → {end or max(e['local_date'] for e in ev)}  ({len(ev)} events, {LEDGER})\n")
    S = collections.defaultdict(list)
    for e in ev:
        S[e["source"]].append(e)
    ck = S.get("clockify", [])
    tr = [e for e in ck if e["training_id"]]
    print("## By signal")
    if ck:
        print(f"- Clockify: {sum(e['qty'] for e in tr):.2f} h on training by description ({len(tr)} entries); "
              f"{sum(e['qty'] for e in ck if not e['training_id']):.2f} h other work in the same projects ({len(ck) - len(tr)} entries, not counted)")
        cp = [e for e in ck if e["detail"].get("claude_project")]
        if cp:
            print(f"  of all those entries, {sum(e['qty'] for e in cp):.2f} h name a Claude project or chat in the description ({len(cp)} entries)")
    cc = S.get("claude_code", [])
    if cc:
        models = collections.Counter()
        for e in cc:
            for m, c in e["detail"]["tokens"].items():
                models[m] += c.get("output_tokens", 0)
        print(f"- Claude Code: {sum(e['qty'] for e in cc):,} output tokens, {sum(e['detail']['active_minutes'] for e in cc) / 60:.1f} active hours, "
              f"{len({e['detail']['session_id'] for e in cc})} sessions (session-level heuristic; by model: "
              + ", ".join(f"{m} {v:,}" for m, v in models.most_common()) + ")")
    hg = S.get("higgsfield", [])
    if hg:
        print(f"- Higgsfield: {sum(e['qty'] for e in hg if e['training_id']):.2f} credits on academy work "
              f"({sum(e['detail'].get('generations', 1) for e in hg if e['training_id'])} generations); "
              f"{sum(e['qty'] for e in hg if not e['training_id']):.2f} credits on other or unidentified work")
    sk = S.get("skool", [])
    if sk:
        seen_changes = [e for e in sk if not e["detail"].get("seeded")]
        seeded = [e for e in sk if e["detail"].get("seeded")]
        kinds = collections.Counter(e["detail"].get("change", e["kind"]) for e in seen_changes)
        print("- Skool changes seen between snapshots: " + (", ".join(f"{v} {k}" for k, v in kinds.most_common()) or "none yet"))
        if seeded:
            print(f"  (plus, from Skool's own dates at the first snapshot: {sum(1 for e in seeded if e['detail'].get('change') == 'lesson_added')} lessons created, "
                  f"{sum(1 for e in seeded if e['detail'].get('change') == 'lesson_edited')} with a later last-edit date)")
    for src, label in (("gdoc", "Worksheet Doc changes"), ("claude_artifact", "claude.ai artifacts new/updated"),
                       ("claude_project", "Claude project/chat (manual lines)"), ("free_tool", "Free tool runs")):
        if S.get(src):
            extra = ""
            if src == "free_tool":
                ok_runs = [e for e in S[src] if e["detail"].get("exit", 0) == 0]
                extra = (": " + ", ".join(f"{t} ×{n}" for t, n in collections.Counter(e["detail"].get("tool") for e in ok_runs).most_common())
                         + (f" ({len(S[src]) - len(ok_runs)} failed runs not counted)" if len(ok_runs) != len(S[src]) else ""))
            if src == "claude_project":
                extra = f": {sum(e['qty'] for e in S[src] if e['unit'] == 'hours'):.2f} h (time not in Clockify; do not log the same sitting twice)"
            print(f"- {label}: {len(S[src])}{extra}")
    pt = S.get("paid_tool", [])
    if pt:
        known = [e for e in pt if e["cost_usd"] is not None]
        paid = [e for e in pt if e["detail"].get("paid_status", "paid") == "paid"]
        print(f"- Paid tools: {len(paid)} subscription-months; known ${sum(e['cost_usd'] for e in known):,.2f} "
              f"({', '.join(sorted({e['detail']['tool'] for e in known})) or 'none'}); price unknown for: "
              + (", ".join(sorted({e['detail']['tool'] for e in paid if e['cost_usd'] is None})) or "none"))
        unk = sorted({e["detail"]["tool"] for e in pt if e["detail"].get("paid_status") == "unknown"})
        if unk:
            print(f"  paid or free not yet known for: {', '.join(unk)}")
    print("\n## By module (training hours · Claude Code output tokens · credits · Skool changes · Doc changes)")
    T = collections.defaultdict(lambda: collections.Counter())
    for e in ev:
        if not e["training_id"] or e["source"] == "paid_tool":
            continue
        m = re.match(r"m\d", e["training_id"])
        key = m.group(0) if m else "academy (not tied to one module)"
        col = {"hours": "h", "tokens_out": "tok", "credits": "cr"}.get(e["unit"], e["source"])
        if e["unit"] == "hours" and e["source"] != "clockify":
            col = "proj"                               # hand-logged hours stay out of the Clockify column
        if e["source"] == "skool" and e["detail"].get("seeded"):
            continue
        if e["source"] == "free_tool" and e["detail"].get("exit", 0) != 0:
            continue
        T[key][col] += e["qty"] if e["unit"] in ("hours", "tokens_out", "credits") else 1
    names = {"m1": "m1 Clockify", "m2": "m2 Plan on Paper", "m3": "m3 Writing Clarity", "m4": "m4 Claude"}
    for key in sorted(T):
        c = T[key]
        print(f"- {names.get(key, key):34} {c['h']:6.2f} h  {int(c['tok']):>10,} tok  {c['cr']:6.2f} cr  {int(c['skool']):3} skool  {int(c['gdoc']):3} doc"
              + (f"  +{c['proj']:.2f} h logged by hand" if c["proj"] else ""))
    L = collections.defaultdict(lambda: {"n": 0, "words": 0, "title": "", "last": ""})
    for e in S.get("skool", []):
        if e["detail"].get("change") in ("lesson_edited", "lesson_retitled", "resources_changed", "lesson_moved", "video_added"):
            x = L[e["training_id"] or e["detail"].get("lesson_id")]
            x["n"] += 1; x["words"] = e["detail"].get("words", x["words"]); x["title"] = e["detail"].get("title", ""); x["last"] = max(x["last"], e["ts_start"])
    if L:
        print("\n## Last edit per lesson (Skool's own dates until a second snapshot exists; local time)")
        for tid, x in sorted(L.items(), key=lambda kv: kv[1]["last"], reverse=True)[:25]:
            print(f"- {x['last'][:16].replace('T', ' ')}  {x['title'][:46]:46} {x['words']:5} words  {tid}")
    print("\n## By day (training hours · Claude Code active hours · Skool lessons created or edited)")
    D = collections.defaultdict(lambda: collections.Counter())
    for e in ev:
        if e["source"] == "clockify" and e["training_id"]:
            D[e["local_date"]]["h"] += e["qty"]
        elif e["source"] == "claude_code":
            D[e["local_date"]]["cc"] += e["detail"]["active_minutes"] / 60
        elif e["source"] == "skool":
            D[e["local_date"]]["sk"] += 1
    for day in sorted(D):
        print(f"- {day}  {D[day]['h']:5.2f} h  {D[day]['cc']:5.1f} h  {int(D[day]['sk']):3}")
    un = [e for e in ev if e["attribution"]["confidence"] == "unassigned" and e["source"] in ("higgsfield", "gdoc", "claude_artifact")]
    print(f"\n## Honest gaps\n- unassigned (not counted as training): {len(un)} events"
          f"\n- Claude tokens carry no dollar figure (subscription plans); attribution there is per session-day, heuristic"
          f"\n- Claude Project / claude.ai chat time appears only if logged by hand (`ledger.py log`) or named in a Clockify description")


def main(a):
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    cmd = a[0]
    if cmd == "claude-code" and len(a) >= 3:
        evs = claude_code(a[1], a[2], "--all-projects" in a)
    elif cmd == "clockify" and len(a) == 2:
        evs = clockify(a[1])
    elif cmd == "higgsfield" and len(a) >= 2:
        evs = higgsfield(a[1], a[2] if len(a) > 2 else None)
    elif cmd == "artifacts" and len(a) == 2:
        evs = artifacts(a[1])
    elif cmd == "gdocs":
        evs = gdocs()
    elif cmd == "subscriptions" and len(a) == 2:
        evs = subscriptions(a[1])
    elif cmd == "log":
        opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
        src, qty, unit, note = opt("--source", "claude_project"), float(opt("--qty", "1")), opt("--unit", "hours"), opt("--note", "")
        when = opt("--date") or dt.datetime.now(TZ).isoformat(timespec="seconds")
        if len(when) == 10:
            when += "T12:00:00" + dt.datetime.now(TZ).strftime("%z")
        tid = opt("--training") or module_of(note)
        evs = [event(src, "time" if unit == "hours" else "run", f"manual@{when}@{dt.datetime.now(TZ).isoformat()}@{note[:40]}", when, qty, unit, training_id=tid,
                     method="manual", confidence="exact" if opt("--training") else ("module" if tid else "unassigned"),
                     actor="matthew", detail={"note": note, "tool": opt("--tool", "")}, label="REPORTED")]
    elif cmd == "run" and "--" in a:
        i = a.index("--"); cmdline = a[i + 1:]
        tid = a[a.index("--training") + 1] if "--training" in a[:i] else os.environ.get("TRAINING_ID")
        t0 = time.time(); start = dt.datetime.now(TZ)
        try:
            rc = subprocess.call(cmdline)
        except FileNotFoundError:
            print(f"kit: no such tool: {cmdline[0]}", file=sys.stderr); sys.exit(127)
        tool = os.path.basename(cmdline[1] if cmdline[0].startswith("python") and len(cmdline) > 1 else cmdline[0])
        upsert([event("free_tool", "run", f"{tool}@{start.isoformat()}", start, 1, "runs", ts_end=dt.datetime.now(TZ), training_id=tid,
                      method="manual" if tid else "none", confidence="exact" if tid else "unassigned", actor="agent",
                      detail={"tool": tool, "args": " ".join(cmdline[1:])[:200], "seconds": round(time.time() - t0, 1), "exit": rc})])
        sys.exit(rc)
    elif cmd == "registry":
        return registry()
    elif cmd == "drift":
        return drift()
    elif cmd == "tools":
        rows = read_tools()
        for t in rows:
            price = ("$" + t["usd_month"] + "/mo") if re.fullmatch(r"\d+(\.\d+)?", t["usd_month"] or "") else (t["usd_month"] or "—")
            print(f"{t['paid']:5} {t['tool']:28} {price:18} training use: {t['training_use']:8} usage: {t['unit']:22} read: {t['read_path']}")
        unk = [t["tool"] for t in rows if t["paid"] != "free" and not re.fullmatch(r"\d+(\.\d+)?", t["usd_month"] or "")]
        print(f"\n{len(rows)} tools · prices still unknown: {', '.join(unk) or 'none'}\nedit {TOOLS} to fill prices; they are Matthew's to state")
        return
    elif cmd == "report":
        if len(a) == 2:
            sys.exit("report takes no dates, or both: ledger.py report <start> <end>")
        return report(*(a[1:3] if len(a) >= 3 else (None, None)))
    else:
        sys.exit(__doc__)
    owned = None
    if cmd == "claude-code":
        owned = lambda e: e["source"] == "claude_code" and a[1] <= e["local_date"] <= a[2]
    elif cmd == "clockify" and getattr(clockify, "window", None):
        lo, hi = clockify.window
        owned = lambda e: e["source"] == "clockify" and lo <= e["local_date"] <= hi
    res = upsert(evs, replace=owned)
    if PENDING_STATE is not None:
        save_state(PENDING_STATE)                      # only after the events are safely on disk
    print(f"{cmd}: {len(evs)} event(s) read · {res[0]} new · {res[1]} updated"
          + (f" · {res[2]} removed (no longer at the source)" if owned else "") + f" → {os.path.join(LEDGER, 'events.jsonl')}")


if __name__ == "__main__":
    main(sys.argv[1:])
