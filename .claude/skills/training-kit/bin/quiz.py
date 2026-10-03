#!/usr/bin/env python3
"""Check your knowledge — quiz spec → one private claude.ai Artifact page per member.

  quiz.py lint <spec.json>                 rules below; exit 1 on FAIL
  quiz.py build <spec.json> [-o out.html]  lint, then write the page and print the publish capabilities
  quiz.py --example                        print a starter spec

Matthew's decisions (2026-10-02): quizzes live in claude.ai Artifacts, ONE PRIVATE ARTIFACT PER MEMBER,
shared to that member by email as Editor (outside viewers below Editor cannot write anything — db.d.ts);
closed answers show the score and the correct answer right away; open answers are optional, stored, and
get feedback only after Matthew finalizes it; personal questions use only sources the member opted into.

Answer types: choice (one or several), order (put items in the right order), chart (select elements of a
diagram.py chart — scored by its node ids), open (optional free text with a rubric for later review).

Spec:
  {"id": "m2-one-question", "version": 1, "kicker": "Module 2 · Plan on Paper",
   "title": "The one-question session", "lede": "…",
   "page_title": "Dana's Plan on Paper Check",     # gallery/tab name; one artifact per member, so name it per member
   "items": [
     {"id": "q1", "type": "choice", "prompt": "…", "options": ["…", "…"], "answer": 1, "source": "[P2D] outline P2 #1"},
     {"id": "q2", "type": "order", "prompt": "…", "items": ["first", "second", "third"], "source": "…"},
     {"id": "q3", "type": "chart", "prompt": "…", "diagram": "flow.json", "answer": ["s"], "source": "…"},
     {"id": "q4", "type": "open", "prompt": "…", "rubric": "what a good answer covers", "source": "…"},
     {"id": "p1", "type": "open", "personal": true, "basis": "kickoff call", "prompt": "…", "rubric": "…"}],
   "sources": ["Your kickoff call (you said yes on <date>)"]}     ← required when any item is personal
`answer` is an option index (or a list for "choose all"), or chart node id(s). Order items are listed in
the CORRECT order; the page shuffles them. `explain` (optional) shows under the answer after submit.

Publish (the Artifact tool; Claude does it, Matthew shares it):
  file_path=<out.html>, icon="quiz", capabilities=<printed by build> — then Matthew shares the artifact
  with the member's email as **Editor** (no public link: a link drops outside Editors to view-only).
Review loop (Matthew never needs to open a member's page; an Editor can republish it, and code they
publish would run as him there):
  1. Claude: ArtifactData `list` attempts on the member's artifact → save the rows to a local JSON file.
  2. `node bin/rescore.mjs <built page.html> <attempts.json>` — recomputes every score from `answers`;
     the page never stores a score, so nothing the member could edit is trusted.
  3. Claude drafts feedback for each open answer against the rubric `build` printed, in a local review
     file beside the spec (never in the member's artifact) — Matthew reads and edits it there.
  4. After Matthew's OK, Claude writes `grades/<attemptId>` with ArtifactData (as the owner):
     {status: "final", finalizedAt, items: {<itemId>: {feedback, answer: <the open text reviewed>}}}.
     The page shows feedback only when status is "final".
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import diagram  # noqa: E402  (same kit)

TEMPLATE = os.path.join(os.path.dirname(HERE), "assets", "quiz.html")
TYPES = {"choice", "order", "chart", "open"}
CITE = re.compile(r"\[(BT|WC|P2D|P4D|[A-Z]{1,4}\d+[a-z]?(?::[^\]]*)?|(?:CLK|PPR|WRT|CLD)-\d{3}|tsv \d+\.\d+|Fathom \d+ [\d:]+)\]|\(P[12] \d{1,2}:\d{2}\)|outline P\d #\d+")
PII = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|(?<![\d-])(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\d-])")
# These rules stop ACCIDENTS, not a determined member: an Editor can publish a new version of the page
# (with other rules). So nothing the member's artifact stores is trusted — the review loop recomputes
# scores from `answers` (bin/rescore.mjs) and keeps Claude's drafts and Matthew's record OUTSIDE it.
CAPABILITIES = {
    "db": {"rules": [
        {"path": "", "read": "admin", "write": "admin"},        # the member (Editor) and Matthew
        {"path": "grades", "read": "admin", "write": "owner"},  # final feedback: written by Claude as Matthew, after his OK
    ]},
    "user": {},
}
EXAMPLE = {
    "id": "m2-one-question", "version": 1, "kicker": "Module 2 · Plan on Paper", "title": "Check your knowledge",
    "lede": "Four quick questions on the one-question session. Your written answer is optional.",
    "items": [
        {"id": "q1", "type": "choice", "prompt": "What do you bring to a one-question session?",
         "options": ["A list of everything on your plate", "One good question", "Your full project plan"], "answer": 1,
         "source": "[P2D] academy-outline.md P2 #1"},
        {"id": "q4", "type": "open", "prompt": "What question will you sit down with next?",
         "rubric": "Names one specific question; not a task list.", "source": "[P2D] academy-outline.md P2 #1"}],
}

results = []


def say(level, msg):
    results.append((level, msg))


def lint(spec, base):
    ids = set()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,60}", str(spec.get("id", ""))):
        say("FAIL", "spec id must be lowercase letters, digits and dashes")
    if not isinstance(spec.get("version"), int):
        say("FAIL", "spec version must be an integer (bump it when items change)")
    for k in ("title", "items"):
        if not spec.get(k):
            say("FAIL", f"missing {k}")
    items = spec.get("items", [])
    if len(items) > 12:
        say("WARN", f"{len(items)} items — a check is 3–8 questions a first-week member finishes in one sitting")
    personal = [it for it in items if it.get("personal")]
    if personal and not spec.get("sources"):
        say("FAIL", "personal items need spec.sources: the sources this member opted into, in plain words")
    blob = json.dumps(spec, ensure_ascii=False)
    for m in PII.findall(blob):
        say("FAIL", f"contact detail in the spec ({m[:4]}…) — never put emails or phone numbers in a page")
    for it in items:
        iid, t, where = it.get("id"), it.get("type"), f"item {it.get('id')!r}"
        if not iid or not re.fullmatch(r"[a-z0-9-]{1,32}", str(iid)):
            say("FAIL", f"{where}: id must be short lowercase/digits/dashes"); continue
        if iid in ids:
            say("FAIL", f"{where}: duplicate id")
        ids.add(iid)
        if t not in TYPES:
            say("FAIL", f"{where}: type must be one of {sorted(TYPES)}"); continue
        if not it.get("prompt"):
            say("FAIL", f"{where}: no prompt")
        if it.get("personal"):
            if not it.get("basis"):
                say("FAIL", f"{where}: personal item needs `basis` (which opted-in source it draws on)")
        elif not CITE.search(str(it.get("source", ""))):
            say("FAIL", f"{where}: `source` must cite the outline/transcript/tactic it tests (academy citation forms)")
        if t == "choice":
            opts, ans = it.get("options") or [], it.get("answer")
            keys = ans if isinstance(ans, list) else [ans]
            if len(opts) < 2:
                say("FAIL", f"{where}: needs 2+ options")
            if not keys or any(not isinstance(k, int) or k < 0 or k >= len(opts) for k in keys):
                say("FAIL", f"{where}: answer must be option index(es) in range")
            if len(set(opts)) != len(opts):
                say("FAIL", f"{where}: duplicate options")
        elif t == "order":
            seq = it.get("items") or []
            if len(seq) < 3:
                say("FAIL", f"{where}: order needs 3+ items (2 is a coin flip)")
            if len(set(seq)) != len(seq):
                say("FAIL", f"{where}: duplicate order items")
        elif t == "chart":
            path = os.path.join(base, str(it.get("diagram", "")))
            if not os.path.isfile(path):
                say("FAIL", f"{where}: diagram spec not found: {it.get('diagram')}"); continue
            dspec = json.load(open(path, encoding="utf-8"))
            for level, m in diagram.lint(dspec):
                if level == "FAIL":
                    say("FAIL", f"{where}: diagram: {m}")
            node_ids = {n["id"] for n in dspec.get("nodes", [])}
            keys = it.get("answer") if isinstance(it.get("answer"), list) else [it.get("answer")]
            if not keys or any(k not in node_ids for k in keys):
                say("FAIL", f"{where}: answer must be node id(s) of the diagram ({sorted(node_ids)})")
        elif t == "open":
            if not it.get("rubric"):
                say("FAIL", f"{where}: open item needs a `rubric` — what a good answer covers, for the later review")
    return report()


def report():
    for level, m in sorted(results, key=lambda r: r[0] != "FAIL"):
        print(f"{level:4}  {m}")
    fails = sum(l == "FAIL" for l, _ in results)
    print(f"{fails} FAIL · {sum(l == 'WARN' for l, _ in results)} WARN")
    return 1 if fails else 0


def build(spec_path, out):
    spec = json.load(open(spec_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(spec_path))
    if lint(spec, base):
        print("lint FAILED — nothing built"); return 1
    page = {k: spec.get(k) for k in ("id", "version", "kicker", "title", "lede", "sources")}
    page["items"] = []
    for it in spec["items"]:
        it = dict(it)
        it.pop("rubric", None)                       # rubric is for the reviewer, not the member's page
        it.pop("basis", None)
        if it["type"] == "chart":
            dspec = json.load(open(os.path.join(base, it.pop("diagram")), encoding="utf-8"))
            for n in dspec["nodes"]:
                n.pop("accent", None)                # a gold accent would read as "already selected"
            pos, back = diagram.layout(dspec)
            body, problems = diagram.svg(dspec, pos, back)
            if any(l == "FAIL" for l, _ in problems):
                for l, m in problems:
                    print(f"{l:4}  {it['id']}: {m}")
                return 1
            # crop the slide canvas to the drawing: boxes, plus room below for routed back-edges and labels
            x0 = min(x - w / 2 for x, y, w, h in pos.values()) - 40
            x1 = max(x + w / 2 for x, y, w, h in pos.values()) + 40
            y0 = min(y - h / 2 for x, y, w, h in pos.values()) - 40
            y1 = max(y + h / 2 for x, y, w, h in pos.values()) + (120 if back else 40)
            body = re.sub(r'viewBox="[^"]*" width="\d+" height="\d+"',
                          f'viewBox="{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}"', body, count=1)
            it["svg"] = body
            it["labels"] = {n["id"]: n["label"] for n in dspec["nodes"]}
        page["items"].append(it)
    data = json.dumps(page, ensure_ascii=False).replace("<", "\\u003c")   # nothing in the payload can open a tag
    leaks = PII.findall(data.replace("\\u003c", "<"))
    if leaks:
        for m in leaks:
            print(f"FAIL  contact detail in the built page ({m[:4]}…) — check diagram labels too")
        return 1
    html_out = open(TEMPLATE, encoding="utf-8").read().replace("__TITLE__", html.escape(spec.get("page_title") or spec["title"])).replace("__QUIZ_JSON__", data)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html_out)
    rub = {it["id"]: it["rubric"] for it in spec["items"] if it.get("rubric")}
    print(f"wrote {out} ({os.path.getsize(out)} bytes, {len(page['items'])} items)")
    print("publish with capabilities =", json.dumps(CAPABILITIES))
    if rub:
        print("rubrics (keep beside the review, never in the page):", json.dumps(rub, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); sys.exit(0)
    if a[0] == "--example":
        print(json.dumps(EXAMPLE, indent=1, ensure_ascii=False)); sys.exit(0)
    if a[0] == "lint" and len(a) == 2:
        sys.exit(lint(json.load(open(a[1], encoding="utf-8")), os.path.dirname(os.path.abspath(a[1]))))
    if a[0] == "build" and len(a) >= 2:
        sys.exit(build(a[1], a[a.index("-o") + 1] if "-o" in a else os.path.splitext(a[1])[0] + ".html"))
    sys.exit(__doc__)
