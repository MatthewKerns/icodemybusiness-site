#!/usr/bin/env python3
"""Tests for the ledger and Skool history tools. Run: python3 bin/test_ledger.py  (uses a temp ledger dir).
All data here is synthetic — this repo is public."""
import json, os, sys, tempfile

TMP = tempfile.mkdtemp(prefix="ledger-test-")
os.environ["TRAINING_LEDGER_DIR"] = TMP
os.environ["TRAINING_TZ"] = "America/Los_Angeles"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ledger, ledgerlib, skool  # noqa: E402

n = 0
def t(name, fn):
    global n
    fn(); n += 1; print("ok", name)

def row(i, proj, desc, h=0.5, client="iCodeMyBusiness", day="2026-10-02"):
    return {"id": f"e{i}", "client": client, "project": proj, "description": desc, "duration_hours": h,
            "start": f"{day}T19:41:58-07:00", "end": f"{day}T20:11:58-07:00"}

ROWS = [row(1, "Skool building", "review and revise Writing Clarity trainings"),
        row(2, "Skool building", "landing page build out"),
        row(3, "Planning", "check in with the plan"),
        row(4, "Planning", "talk out the skool clockify training"),
        row(5, "Skool building", "revise Writing Clarity and Plan on Paper trainings"),
        row(6, "Educational Marketing", "set up first Skool Clockify module"),
        row(7, "Educational Marketing", "lesson recording for a client course", client="Another Client"),
        row(8, "Skool building", "build out the skool claude project")]

def test_clockify():
    p = os.path.join(TMP, "ck.json"); json.dump({"entries": ROWS, "window": {"start": "2026-10-01", "end": "2026-10-04"}}, open(p, "w"))
    ev = {e["source_ref"]: e for e in ledger.clockify(p)}
    assert ev["e1"]["training_id"] == "m3" and ev["e1"]["attribution"]["confidence"] == "module"
    assert ev["e2"]["training_id"] is None and ev["e2"]["detail"]["training_work"] is False   # same project, not training
    assert "e3" not in ev                                         # "check in" in another project is not training
    assert ev["e4"]["training_id"] == "m1"                        # names the academy AND a training elsewhere
    assert ev["e5"]["training_id"] == "academy"                   # two modules named → not pinned to one
    assert ev["e6"]["training_id"] == "m1" and ev["e6"]["stage"] == "draft"
    assert "e7" not in ev                                         # another client's same-named project never enters
    assert ev["e8"]["detail"]["claude_project"] is True and ev["e8"]["training_id"] is None
    assert ev["e1"]["stage"] == "rewrite" and ev["e1"]["actor"] == "matthew"
    json.dump([ROWS[0]], open(p, "w")); assert len(ledger.clockify(p)) == 1          # a plain list also loads

def test_replace_removes_deleted_entries():
    p = os.path.join(TMP, "ck2.json")
    json.dump({"entries": ROWS[:2], "window": {"start": "2026-10-01", "end": "2026-10-04"}}, open(p, "w"))
    own = lambda e: e["source"] == "clockify" and "2026-10-01" <= e["local_date"] <= "2026-10-04"
    assert ledgerlib.upsert(ledger.clockify(p), replace=own)[:1] == (2,)
    json.dump({"entries": ROWS[:1], "window": {"start": "2026-10-01", "end": "2026-10-04"}}, open(p, "w"))   # e2 deleted at the source
    assert ledgerlib.upsert(ledger.clockify(p), replace=own) == (0, 0, 1)
    assert [e["source_ref"] for e in ledgerlib.read_events().values() if e["source"] == "clockify"] == ["e1"]

def test_module_of():
    assert ledgerlib.module_of("Clockify") is None                # the tool alone is not Module 1
    assert ledgerlib.module_of("Clockify skool training build out") == "m1"
    assert ledgerlib.module_of("plan on paper lesson planning") == "m2"
    assert ledgerlib.module_of("Claude module ideas") == "m4"

def test_local_date_and_upsert():
    e = ledgerlib.event("clockify", "time", "x1", "2026-10-03T04:15:55Z", 1.0, "hours")
    assert e["local_date"] == "2026-10-02"                        # evening Pacific stays on its own day
    assert ledgerlib.upsert([e]) == (1, 0) and ledgerlib.upsert([e]) == (0, 0)
    assert ledgerlib.upsert([dict(e, qty=2.0)]) == (0, 1)
    assert e["cost_usd"] is None and e["cost_basis"] == "unknown"

def test_claude_code_keeps_last_usage_line():
    fp = os.path.join(TMP, "s.jsonl")
    def line(out, stop=None, content=None):
        return json.dumps({"type": "assistant", "timestamp": "2026-10-02T20:00:00Z", "requestId": "r1",
                           "message": {"id": "m1", "model": "claude-x", "stop_reason": stop, "usage": {"output_tokens": out},
                                       "content": content or []}})
    open(fp, "w").write("\n".join([line(1), line(1), line(445, "tool_use", [{"type": "tool_use", "input": {"p": "content/skool/a.md"}}])]) + "\n")
    import collections
    acc = {"name": None, "usage": {}, "days": collections.defaultdict(lambda: {"ts": [], "paths": 0, "mods": collections.Counter(),
                                                                               "tok": collections.defaultdict(collections.Counter)})}
    ledger.cc_scan(fp, acc)
    assert [u["output_tokens"] for _, _, u in acc["usage"].values()] == [445]      # not 1, and not 447

TABLE_A = """CAPTURED | 2026-10-04T11:31:00Z | icodemybusiness | test
COURSE | Clockify | c1 | C1 | tier=null | privacy=0 | 2026-09-08T14:16:36 | 2026-10-03T21:58:01
LESSON | 0 | First | l1 | L1 | module | chars=100 | words=20 | sha=aaaa | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-03T21:07:35 | res=
LESSON | 1 | Old Title | l2 | L2 | module | chars=100 | words=30 | sha=bbbb | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-03T21:07:35 | res=Worksheet (make a copy) -> https://docs.google.com/document/d/DOCIDDOCIDDOCIDDOCIDDOCID0001/copy
LESSON | 2 | Third | l4 | L4 | module | chars=100 | words=40 | sha=eeee | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-03T21:07:35 | res=
"""
TABLE_B = """CAPTURED | 2026-10-05T09:00:00Z | icodemybusiness | test
COURSE | Clockify Basics | c1 | C1 | tier=null | privacy=0 | 2026-09-08T14:16:36 | 2026-10-05T08:58:01
LESSON | 0 | Brand New | l3 | L3 | module | chars=50 | words=10 | sha=dddd | video=yes | lockFreeTrial=0 | 2026-10-05T08:00:00 | 2026-10-05T08:30:00 | res=
LESSON | 1 | First | l1 | L1 | module | chars=100 | words=20 | sha=aaaa | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-03T21:07:35 | res=
LESSON | 2 | New Title | l2 | L2 | module | chars=300 | words=75 | sha=cccc | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-05T08:40:00 | res=Worksheet (make a copy) -> https://docs.google.com/document/d/DOCIDDOCIDDOCIDDOCIDDOCID0001/copy
LESSON | 3 | Third | l4 | L4 | module | chars=0 | words=0 | sha=ERROR | video=no | lockFreeTrial=0 | 2026-09-08T14:24:50 | 2026-10-03T21:07:35 | res=
"""

def test_skool_diff():
    a, b = skool.parse_table(TABLE_A), skool.parse_table(TABLE_B)
    assert a["courses"][0]["lessons"][1]["docIds"] == ["DOCIDDOCIDDOCIDDOCIDDOCID0001"]
    kinds = sorted((c["kind"], c["lesson"]) for c in skool.changes(a, b))
    # one insert at the top: no "moved" noise for the untouched siblings; the failed read (L4) is not an edit
    assert kinds == [("course_renamed", "C1"), ("lesson_added", "L3"), ("lesson_edited", "L2"), ("lesson_retitled", "L2")], kinds
    assert next(c for c in skool.changes(a, b) if c["kind"] == "lesson_edited")["words_delta"] == 45
    assert skool.changes(a, a) == []
    swapped = skool.parse_table(TABLE_A.replace("LESSON | 0 | First", "LESSON | 9 | First"))
    assert [c["kind"] for c in skool.changes(a, swapped)] == ["lessons_reordered"]

def test_skool_import_order_and_seed():
    pa, pb = os.path.join(TMP, "a.txt"), os.path.join(TMP, "b.txt")
    open(pa, "w").write(TABLE_A); open(pb, "w").write(TABLE_B)
    skool.main(["import", pa])
    seeded = [e for e in ledgerlib.read_events().values() if e["source"] == "skool"]
    assert seeded and all(e["detail"]["seeded"] and e["label"] == "INFERRED" and e["qty"] == 1 for e in seeded)
    skool.main(["import", pb])
    before = len(ledgerlib.read_events())
    skool.main(["import", pa])                                    # re-importing the older capture writes nothing
    assert len(ledgerlib.read_events()) == before
    ed = [e for e in ledgerlib.read_events().values() if e["source"] == "skool" and e["detail"]["change"] == "lesson_edited" and not e["detail"]["seeded"]]
    assert len(ed) == 1 and ed[0]["qty"] == 45 and ed[0]["unit"] == "words_changed"

def test_higgsfield():
    p = os.path.join(TMP, "h.tsv")
    open(p, "w").write("# c\n2026-09-08T14:27:06Z\t8\t4\tModel\tacademy\tcovers\n2026-09-21T03:31:14Z\t72\t36\tModel\t-\tother\n")
    ev = ledger.higgsfield(p)
    assert [e["training_id"] for e in ev] == ["academy", None] and ev[1]["attribution"]["confidence"] == "unassigned"
    tx = [{"display_name": "M", "credits": -2, "action": "spend", "created_at": "2026-09-09T10:00:00Z"},
          {"display_name": "M", "credits": 2, "action": "refund", "created_at": "2026-09-09T09:00:00Z"},
          {"display_name": "M", "credits": -7, "action": "spend", "created_at": "2026-09-08T10:00:00Z"}]
    j = os.path.join(TMP, "tx.json"); json.dump({"items": tx}, open(j, "w"))
    first = {e["event_id"] for e in ledger.higgsfield(j)}
    json.dump([{"display_name": "M", "credits": -3, "action": "spend", "created_at": "2026-09-10T10:00:00Z"}] + tx, open(j, "w"))
    second = ledger.higgsfield(j)
    assert first < {e["event_id"] for e in second} and len(second) == 4                # a newer row on top re-keys nothing
    assert sum(e["qty"] for e in second) == 2 + 7 + 3 - 2                            # the refund is netted

def test_artifacts_skip_personal_and_other_clients():
    p = os.path.join(TMP, "a.txt")
    open(p, "w").write("- (mine) Family care plan — https://claude.ai/artifact/AAA — updated 2026-10-01\n"
                       "- (mine) Other client lesson quiz review — https://claude.ai/artifact/CCC — updated 2026-10-01\n"
                       "- (mine) Skool Promise Audit — https://claude.ai/artifact/BBB — updated 2026-10-03\n")
    ev = ledger.artifacts(p)
    assert [e["detail"]["title"] for e in ev] == ["Skool Promise Audit"]
    assert "AAA" not in json.dumps(ledger.PENDING_STATE) and "CCC" not in json.dumps(ledger.PENDING_STATE)

t("clockify: training by description, own client only", test_clockify)
t("re-collecting removes entries deleted at the source", test_replace_removes_deleted_entries)
t("module detection is strict", test_module_of)
t("local date + upsert", test_local_date_and_upsert)
t("claude code keeps the last usage line of a message", test_claude_code_keeps_last_usage_line)
t("skool diff: no sibling noise, failed reads ignored", test_skool_diff)
t("skool import: ordering and seeded history", test_skool_import_order_and_seed)
t("higgsfield: stable ids, refunds netted", test_higgsfield)
t("artifacts: personal and other clients' skipped", test_artifacts_skip_personal_and_other_clients)
print(f"{n} tests passed")
