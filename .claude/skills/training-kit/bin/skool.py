#!/usr/bin/env python3
"""Skool Classroom history — dated snapshots of every lesson, and what changed between them.

  skool.py capture-js              print the two read-only snippets to run in Matthew's own Skool tab
  skool.py import <table.txt>      store a captured table as a snapshot; diff it against the previous one
  skool.py status                  list snapshots
  skool.py diff [<from> [<to>]]    changes between two snapshots (default: the last two; one name = that one → latest)
  skool.py history [<words>]       per-lesson timeline across all snapshots (title, edits, size)
  skool.py lessons                 the latest snapshot as a table (module, title, words, worksheet, updated)

Skool has no API. The only compliant read is Matthew's own logged-in Chrome tab through the Claude
browser extension (he approved that on 2026-10-04; he declined signing in to Skool in an automated
browser, and never scrape it logged-out). A capture is read-only: it fetches the Classroom pages the tab
could open anyway, about three per second, and changes nothing. Matthew edits mostly in Skool itself,
so run a capture whenever he says he edited — or at the start of a training session.

Capture (any session with the extension connected):
  1. open https://www.skool.com/icodemybusiness/classroom in a NEW tab of the session's tab group
  2. run snippet 1 from `capture-js` (javascript_tool) — it returns lesson counts
  3. run snippet 2 — it renders one line per course/lesson into the page; read it with get_page_text
  4. save those lines to a file, `skool.py import <file>`, close the tab
What a snapshot keeps per lesson: Skool ids, title, order, word/char count, a fingerprint of the text,
video yes/no, resources (worksheet link), tier fields, Skool's own createdAt/updatedAt. NOT the lesson
text (moving page data to disk in bulk was refused by the safety check on 2026-10-04; read a lesson in
the tab when its words matter). A changed fingerprint + Skool's updatedAt is the change record.

Ledger: $TRAINING_LEDGER_DIR (default ~/.icmb-training/ledger) — skool/snapshots/*.json, and one
`skool` event per change appended to events.jsonl (same file the usage collectors write).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledgerlib import COURSE_MODULE, DOC_ID, EVENTS, LEDGER, event, registry_lookup, upsert  # noqa: E402

SNAPS = os.path.join(LEDGER, "skool", "snapshots")

SNIPPET_1 = r"""
// 1/2 — capture (read-only). Returns [[course, lessons, text chars, lessons with no text], …]
const getND = async (url) => { const h = await fetch(url, {credentials:'include'}).then(r=>r.text()); const m = h.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); return JSON.parse(m[1]).props.pageProps; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const top = JSON.parse(document.getElementById('__NEXT_DATA__').textContent).props.pageProps;
const slug = location.pathname.split('/')[1];
const snap = {capturedAt: new Date().toISOString(), group: slug, courses: []};
for (const c of top.allCourses) {
  const pp = await getND('/' + slug + '/classroom/' + c.name);
  const course = {id: c.id, name: c.name, title: c.metadata?.title, privacy: c.metadata?.privacy ?? null, minTier: c.metadata?.minTier ?? null, createdAt: c.createdAt, updatedAt: c.updatedAt, lessons: []};
  const flat = []; const walk = (n, parent) => { (n.children||[]).forEach((ch) => { const u = ch.course || ch; flat.push({u, parent, order: flat.length}); walk(ch, u.id); }); }; walk(pp.course, null);
  for (const {u, parent, order} of flat) {
    await sleep(350); let desc = '', videoLink = null, res = u.metadata?.resources ?? null;
    try { const lp = await getND('/' + slug + '/classroom/' + c.name + '?md=' + u.id);   // ?md= takes the 32-hex id
      const sm = (function find(n){ const x = n.course || n; if (x.id === u.id) return x; for (const ch of (n.children||[])) { const f = find(ch); if (f) return f; } return null; })(lp.course);
      if (sm) { desc = sm.metadata?.desc || ''; videoLink = sm.metadata?.videoLink || null; res = sm.metadata?.resources ?? res; } } catch (e) { desc = 'ERROR ' + e.message; }
    course.lessons.push({id: u.id, name: u.name, unitType: u.unitType, parent, order, title: u.metadata?.title || '', desc, videoLink, resources: res, lockFreeTrial: u.metadata?.lockFreeTrial ?? null, createdAt: u.createdAt, updatedAt: u.updatedAt});
  }
  snap.courses.push(course);
}
window.__snap = snap;
JSON.stringify(snap.courses.map(c => [c.title, c.lessons.length, c.lessons.reduce((a,l)=>a+l.desc.length,0), c.lessons.filter(l=>!l.desc).length]))
"""

SNIPPET_2 = r"""
// 2/2 — render one line per course/lesson into THIS tab only (nothing is saved to Skool), then get_page_text
const flat = (desc) => { if (!desc) return ''; let t = desc.replace(/^\[v2\]/, ''); try { const out = []; const walk = (n) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { if (typeof n.text === 'string') out.push(n.text); if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listItem') out.push('\n'); Object.values(n).forEach(v => { if (v && typeof v === 'object') walk(v); }); } }; walk(JSON.parse(t)); return out.join('').replace(/\n{2,}/g, '\n').trim(); } catch (e) { return t; } };
const sha = async (s) => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16); };
const rows = ['CAPTURED | ' + window.__snap.capturedAt + ' | ' + window.__snap.group + ' | via Claude in Chrome, read-only'];
for (const c of window.__snap.courses) {
  rows.push(['COURSE', String(c.title).replace(/\|/g, '/'), c.name, c.id, 'tier=' + c.minTier, 'privacy=' + c.privacy, c.createdAt.slice(0,19), c.updatedAt.slice(0,19)].join(' | '));
  for (const l of c.lessons) { const failed = String(l.desc).startsWith('ERROR '); const text = failed ? '' : flat(l.desc); let res = [];
    try { res = (typeof l.resources === 'string' ? JSON.parse(l.resources) : (l.resources || [])).map(r => String(r.title || '').replace(/\|/g, '/') + ' -> ' + (r.link || '')); } catch (e) { res = [String(l.resources).slice(0, 120)]; }
    rows.push(['LESSON', l.order, l.title.replace(/\|/g, '/'), l.name, l.id, l.unitType, 'chars=' + text.length, 'words=' + text.split(/\s+/).filter(Boolean).length, 'sha=' + (failed ? 'ERROR' : await sha(text)), 'video=' + (l.videoLink ? 'yes' : 'no'), 'lockFreeTrial=' + l.lockFreeTrial, l.createdAt.slice(0,19), l.updatedAt.slice(0,19), 'res=' + res.join(' ; ')].join(' | ')); } }
document.body.innerHTML = '<article><h1>snapshot table</h1><div id="snap"></div></article>';
const host = document.getElementById('snap'); rows.forEach(r => { const p = document.createElement('p'); p.textContent = r; host.appendChild(p); }); rows.length
"""


def parse_table(text):
    snap, course = {"capturedAt": None, "group": None, "note": "", "courses": []}, None
    for raw in text.splitlines():
        p = [x.strip() for x in raw.split(" | ")]
        if p[0] == "CAPTURED":
            snap["capturedAt"], snap["group"], snap["note"] = p[1], p[2], p[3] if len(p) > 3 else ""
        elif p[0] == "COURSE" and len(p) >= 8:
            course = {"title": p[1], "name": p[2], "id": p[3], "minTier": p[4].split("=", 1)[1], "privacy": p[5].split("=", 1)[1],
                      "createdAt": p[6], "updatedAt": p[7], "lessons": []}
            snap["courses"].append(course)
        elif p[0] == "LESSON" and len(p) >= 13 and course is not None:
            kv = {x.split("=", 1)[0]: x.split("=", 1)[1] for x in p[6:11]}
            res = raw.split("| res=", 1)[1].strip() if "| res=" in raw else ""
            course["lessons"].append({
                "order": int(p[1]), "title": p[2], "name": p[3], "id": p[4], "unitType": p[5],
                "chars": int(kv["chars"]), "words": int(kv["words"]), "sha": kv["sha"], "video": kv["video"] == "yes",
                "lockFreeTrial": kv["lockFreeTrial"], "createdAt": p[11], "updatedAt": p[12],
                "resources": [r.strip() for r in res.split(" ; ") if r.strip()],
                "docIds": DOC_ID.findall(res)})
    if not snap["capturedAt"] or not snap["courses"]:
        sys.exit("not a capture table: need a CAPTURED line and at least one COURSE line")
    return snap


def snap_files():
    return sorted(f for f in os.listdir(SNAPS) if f.endswith(".json")) if os.path.isdir(SNAPS) else []


def load(name):
    return json.load(open(os.path.join(SNAPS, name if name.endswith(".json") else name + ".json")))


def index(snap):
    return {l["id"]: dict(l, course=c["title"], course_id=c["id"]) for c in snap["courses"] for l in c["lessons"]}


def changes(a, b):
    """What differs between two snapshots. Lessons whose text could not be read in either capture
    (sha ERROR) are compared on title/resources only — a failed read is not an edit."""
    A, B, out = index(a), index(b), []
    at_b = b["capturedAt"][:19]
    ca, cb = {c["id"]: c["title"] for c in a["courses"]}, {c["id"]: c["title"] for c in b["courses"]}
    for cid, title in cb.items():
        if cid in ca and ca[cid] != title:
            out.append({"kind": "course_renamed", "lesson": cid, "course": title, "title": title, "was": ca[cid], "at": at_b})
    for i, l in B.items():
        if i not in A:
            out.append({"kind": "lesson_added", "lesson": i, "course": l["course"], "title": l["title"], "words": l["words"], "at": l["createdAt"]})
            continue
        o = A[i]
        when = l["updatedAt"] if l["updatedAt"] > o["updatedAt"] else at_b      # Skool's date if it moved, else when we saw it
        if o["title"] != l["title"]:
            out.append({"kind": "lesson_retitled", "lesson": i, "course": l["course"], "title": l["title"], "was": o["title"], "at": when})
        if "ERROR" not in (o["sha"], l["sha"]) and o["sha"] != l["sha"]:
            out.append({"kind": "lesson_edited", "lesson": i, "course": l["course"], "title": l["title"],
                        "words": l["words"], "words_delta": l["words"] - o["words"], "at": when})
        if sorted(o["resources"]) != sorted(l["resources"]):
            out.append({"kind": "resources_changed", "lesson": i, "course": l["course"], "title": l["title"],
                        "resources": l["resources"], "was": o["resources"], "at": when})
        if o["video"] != l["video"]:
            out.append({"kind": "video_added" if l["video"] else "video_removed", "lesson": i, "course": l["course"], "title": l["title"], "at": when})
        if o["course_id"] != l["course_id"]:
            out.append({"kind": "lesson_moved", "lesson": i, "course": l["course"], "title": l["title"],
                        "was": o["course"], "now": l["course"], "at": at_b})
    for c in b["courses"]:                       # reorder inside a course: only lessons whose RELATIVE order changed
        old = next((x for x in a["courses"] if x["id"] == c["id"]), None)
        if not old:
            continue
        both = {l["id"] for l in c["lessons"]} & {l["id"] for l in old["lessons"]}
        was = [l["id"] for l in sorted(old["lessons"], key=lambda x: x["order"]) if l["id"] in both]
        now = [l["id"] for l in sorted(c["lessons"], key=lambda x: x["order"]) if l["id"] in both]
        if was != now:
            out.append({"kind": "lessons_reordered", "lesson": c["id"], "course": c["title"], "title": c["title"],
                        "was": " > ".join(A[i]["title"] for i in was), "now": " > ".join(B[i]["title"] for i in now), "at": at_b})
    for i, o in A.items():
        if i not in B:
            out.append({"kind": "lesson_removed", "lesson": i, "course": o["course"], "title": o["title"], "at": at_b})
    return out


def show(chs):
    if not chs:
        print("no changes"); return
    for c in chs:
        extra = {"lesson_retitled": lambda: f"(was: {c['was']})", "lesson_edited": lambda: f"{c['words']} words ({c['words_delta']:+d})",
                 "lesson_added": lambda: f"{c['words']} words", "lesson_moved": lambda: f"{c['was']} → {c['now']}",
                 "course_renamed": lambda: f"(was: {c['was']})", "lessons_reordered": lambda: f"{c['was']}  →  {c['now']}",
                 "resources_changed": lambda: f"{len(c['was'])} → {len(c['resources'])} resources"}.get(c["kind"], lambda: "")()
        print(f"{c['at'][:16]}  {c['kind']:18} {c['course']} / {c['title']}  {extra}")


def emit(chs, snap_name, seeded=False):
    lessons, _ = registry_lookup()
    evs = []
    for c in chs:
        tid = lessons.get(c["lesson"]) or COURSE_MODULE.get(c["course"].lower())
        delta = abs(c.get("words_delta", 0))
        qty, unit = (delta, "words_changed") if c["kind"] == "lesson_edited" and not seeded else (1, "changes")
        evs.append(event("skool", "lesson_change", f"{c['kind']}:{c['lesson']}:{c['at']}:{'seed' if seeded else snap_name}",
                         c["at"] if c["at"][-1] == "Z" or "+" in c["at"] else c["at"] + "Z", qty, unit,
                         training_id=tid, method="lesson_id" if tid else "none",
                         confidence="exact" if c["lesson"] in lessons else ("module" if tid else "unassigned"),
                         stage="rewrite" if c["kind"] in ("lesson_edited", "lesson_retitled") else "publish",
                         actor="unknown",      # Skool records no author: a paste by an agent and an edit by Matthew look the same
                         detail={"change": c["kind"], "lesson_id": c["lesson"], "snapshot": snap_name, "seeded": seeded,
                                 **{k: v for k, v in c.items() if k not in ("kind", "lesson", "at")}},
                         label="INFERRED" if seeded else "VERIFIED"))
    new, changed = upsert(evs)
    return new + changed


def main(a):
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    cmd = a[0]
    if cmd == "capture-js":
        print(SNIPPET_1.strip(), "\n\n" + "=" * 100 + "\n\n" + SNIPPET_2.strip()); return
    if cmd == "import" and len(a) == 2:
        snap = parse_table(open(a[1], encoding="utf-8").read())
        bad = [f"{c['title']} / {l['title']}" for c in snap["courses"] for l in c["lessons"] if l["sha"] == "ERROR"]
        os.makedirs(SNAPS, exist_ok=True)
        name = re.sub(r"[^0-9T]", "", snap["capturedAt"][:19]) + ".json"
        existed = os.path.exists(os.path.join(SNAPS, name))
        older = [p for p in snap_files() if p < name]
        newest = not [p for p in snap_files() if p > name]
        json.dump(snap, open(os.path.join(SNAPS, name), "w"), indent=1, ensure_ascii=False)
        n = sum(len(c["lessons"]) for c in snap["courses"])
        print(f"snapshot {name}: {len(snap['courses'])} courses, {n} lessons → {SNAPS}")
        if bad:
            print(f"WARNING: the text of {len(bad)} lesson(s) could not be read in this capture (not treated as edits): " + "; ".join(bad))
        if existed or not newest:
            print("stored; no events written (this capture was already imported, or a newer snapshot exists)")
        elif older:
            chs = changes(load(older[-1]), snap)
            print(f"changes since {older[-1]}:"); show(chs)
            print(f"{emit(chs, name)} event(s) → {EVENTS}")
        else:
            # first snapshot: Skool's own dates are the only history there is — recorded as INFERRED, not as observed changes
            chs = [{"kind": "lesson_added", "lesson": l["id"], "course": c["title"], "title": l["title"], "words": l["words"], "at": l["createdAt"]}
                   for c in snap["courses"] for l in c["lessons"]]
            chs += [{"kind": "lesson_edited", "lesson": l["id"], "course": c["title"], "title": l["title"], "words": l["words"], "words_delta": 0, "at": l["updatedAt"]}
                    for c in snap["courses"] for l in c["lessons"] if l["updatedAt"] != l["createdAt"]]
            print(f"first snapshot — history seeded from Skool's created/last-edited dates: {emit(chs, name, seeded=True)} event(s) → {EVENTS}")
        return
    files = snap_files()
    if not files:
        sys.exit(f"no snapshots in {SNAPS} — run a capture (skool.py capture-js) and import it")
    known = lambda x: x if x.endswith(".json") else x + ".json"
    for x in a[1:3] if cmd == "diff" else []:
        if known(x) not in files:
            sys.exit(f"no snapshot named {x}; have: {', '.join(f[:-5] for f in files)}")
    if cmd == "status":
        for f in files:
            s = load(f); print(f, s["capturedAt"], sum(len(c["lessons"]) for c in s["courses"]), "lessons")
    elif cmd == "diff":
        if len(files) < 2:
            sys.exit("only one snapshot so far — nothing to compare yet")
        fa, fb = (a[1], a[2]) if len(a) >= 3 else ((a[1], files[-1]) if len(a) == 2 else (files[-2], files[-1]))
        print(f"# {known(fa)[:-5]} → {known(fb)[:-5]}")
        show(changes(load(fa), load(fb)))
    elif cmd == "lessons":
        s = load(files[-1])
        print(f"# {files[-1]} captured {s['capturedAt']}")
        for c in s["courses"]:
            print(f"\n{c['title']}  (tier {c['minTier']}, privacy {c['privacy']}, updated {c['updatedAt'][:16]})")
            for l in c["lessons"]:
                ws = "worksheet" if l["docIds"] else "NO worksheet"
                print(f"  {l['order']}  {l['title'][:44]:44} {l['words']:5} words  {l['chars']:6} chars  {'video' if l['video'] else '     '}  {ws:12}  created {l['createdAt'][:10]}  updated {l['updatedAt'][:16]}")
    elif cmd == "history":
        words = [w.lower() for w in a[1:]]
        seen = {}
        for f in files:
            for i, l in index(load(f)).items():
                seen.setdefault(i, []).append((f, l))
        for i, rows in seen.items():
            if words and not all(w in (rows[-1][1]["title"] + " " + rows[-1][1]["course"]).lower() for w in words):
                continue
            last = rows[-1][1]
            print(f"\n{last['course']} / {last['title']}   (skool:{i[:8]}…, created {last['createdAt'][:16]})")
            prev = None
            for f, l in rows:
                mark = "first seen" if prev is None else ("unchanged" if (prev["sha"], prev["title"]) == (l["sha"], l["title"]) else
                                                          "EDITED" + (f" · retitled from {prev['title']!r}" if prev["title"] != l["title"] else ""))
                print(f"  {f[:-5]}  {mark:12} {l['words']:5} words  skool-updated {l['updatedAt'][:16]}")
                prev = l
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
