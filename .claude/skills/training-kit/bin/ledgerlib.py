"""Shared ledger plumbing for skool.py and ledger.py: where the ledger lives, the one event shape,
upsert-by-id, local dates, the training registry and module detection.

Event (one JSON object per line in events.jsonl):
  event_id     sha1(source + source_ref) — re-collecting the same thing replaces it, never duplicates
  ts_start/ts_end  ISO 8601 with offset;  local_date  the day in Matthew's timezone (evening work stays on its day)
  source       clockify | claude_code | claude_project | claude_artifact | higgsfield | paid_tool | free_tool | skool | gdoc
  kind         time | compute | generation | subscription | run | lesson_change | doc_change
  training_id  a registry id (m2-eliminate-distraction) | m1..m4 | academy | null (not training / unknown)
  attribution  {method: doc_id|lesson_id|path|description|prompt|manual|none, confidence: exact|module|heuristic|unassigned}
  stage        source | draft | review | publish | rewrite | cover | other | null
  qty, unit    hours | tokens_out | credits | usd_month | runs | words_changed | changes
  cost_usd, cost_basis   actual | api_equivalent | allocated | unknown   (never a dollar figure without a basis)
  actor        matthew | agent | unknown;  source_ref;  label VERIFIED|REPORTED|INFERRED;  detail {}
Rules: never guess a training_id (use null + "unassigned"); record qty even when the price is unknown.
"""
import datetime as dt, hashlib, json, os, re
from zoneinfo import ZoneInfo

LEDGER = os.path.expanduser(os.environ.get("TRAINING_LEDGER_DIR", "~/.icmb-training/ledger"))
EVENTS = os.path.join(LEDGER, "events.jsonl")
REGISTRY = os.path.join(LEDGER, "trainings.tsv")
TZ = ZoneInfo(os.environ.get("TRAINING_TZ", "America/Los_Angeles"))
DRIVE = os.path.expanduser("~/Library/CloudStorage/GoogleDrive-12kernsmatthew@gmail.com/My Drive/iCodeMyBusiness")
DOC_ID = re.compile(r"docs\.google\.com/document/d/([A-Za-z0-9_-]{20,})")

# Module detection from free text. Deliberately strict: "clockify" alone is the tool, not Module 1.
MODULE_PATTERNS = [
    ("m1", r"clockify (skool )?(module|training|lesson|course|worksheet)|module 1\b|\bm1\b|time (slice|slicing)|time entr(y|ies) (lesson|training)"),
    ("m2", r"plan[- ]on[- ]paper|module 2\b|\bm2\b|thinking time (lesson|training)"),
    ("m3", r"writing[- ]clarity|module 3\b|\bm3\b"),
    ("m4", r"claude (module|training|lesson|course)|module 4\b|\bm4\b"),
]
COURSE_MODULE = {"clockify": "m1", "plan on paper": "m2", "writing clarity": "m3", "claude": "m4"}


def module_of(text):
    hits = [m for m, pat in MODULE_PATTERNS if re.search(pat, text or "", re.I)]
    return hits[0] if len(set(hits)) == 1 else None      # two modules named → not attributable to one


def parse_ts(s):
    if isinstance(s, dt.datetime):
        return s
    s = s.strip().replace("Z", "+00:00")
    d = dt.datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


def local_date(ts):
    return parse_ts(ts).astimezone(TZ).date().isoformat()


def event(source, kind, source_ref, ts_start, qty, unit, *, ts_end=None, training_id=None, method="none",
          confidence="unassigned", stage=None, detail=None, cost_usd=None, cost_basis="unknown", actor="unknown",
          label="VERIFIED"):
    a = parse_ts(ts_start)
    return {
        "event_id": hashlib.sha1(f"{source}|{source_ref}".encode()).hexdigest()[:20],
        "ts_start": a.astimezone(TZ).isoformat(timespec="seconds"),
        "ts_end": parse_ts(ts_end).astimezone(TZ).isoformat(timespec="seconds") if ts_end else None,
        "local_date": a.astimezone(TZ).date().isoformat(),
        "source": source, "kind": kind, "training_id": training_id,
        "attribution": {"method": method, "confidence": confidence}, "stage": stage,
        "qty": round(qty, 4) if isinstance(qty, float) else qty, "unit": unit, "detail": detail or {},
        "cost_usd": cost_usd, "cost_basis": cost_basis if cost_usd is not None else "unknown",
        "actor": actor, "source_ref": str(source_ref), "label": label,
    }


def read_events():
    if not os.path.exists(EVENTS):
        return {}
    out = {}
    for line in open(EVENTS, encoding="utf-8"):
        if line.strip():
            e = json.loads(line)
            out[e["event_id"]] = e
    return out


def upsert(events, replace=None):
    """Insert or replace by event_id. `replace` is a predicate naming the events this collector owns for
    the window it just read: owned events that are not in `events` are removed (an entry deleted at the
    source must not stay counted). Returns (new, changed) — plus removed when `replace` is given."""
    os.makedirs(LEDGER, exist_ok=True)
    cur, new, changed, removed = read_events(), 0, 0, 0
    if replace:
        keep = {e["event_id"] for e in events}
        for k in [k for k, e in cur.items() if replace(e) and k not in keep]:
            del cur[k]; removed += 1
    for e in events:
        old = cur.get(e["event_id"])
        if old is None:
            new += 1
        elif old != e:
            changed += 1
        cur[e["event_id"]] = e
    tmp = EVENTS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for e in sorted(cur.values(), key=lambda x: (x["ts_start"], x["event_id"])):
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    os.replace(tmp, EVENTS)
    return (new, changed, removed) if replace else (new, changed)


def read_registry():
    """trainings.tsv → rows. Columns: training_id module skool_lesson_id skool_course doc_id tactic_ids current_title status"""
    if not os.path.exists(REGISTRY):
        return []
    lines = [l.rstrip("\n") for l in open(REGISTRY, encoding="utf-8") if l.strip() and not l.startswith("#")]
    head = lines[0].split("\t")
    return [dict(zip(head, l.split("\t") + [""] * len(head))) for l in lines[1:]]


def registry_lookup(rows=None):
    rows = read_registry() if rows is None else rows
    return ({r["skool_lesson_id"]: r["training_id"] for r in rows if r.get("skool_lesson_id")},
            {r["doc_id"]: r["training_id"] for r in rows if r.get("doc_id")})


def slug(text):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")[:48]
