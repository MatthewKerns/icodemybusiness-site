#!/usr/bin/env python3
"""Diagram builder (retrofit) — the diagrams@cc-plugins JSON schema → house-style SVG + PNG, linted.

  diagram.py <spec.json> [-o out-basename] [--no-png]   lint, then write <out>.svg, <out>.html, <out>.png
  diagram.py --lint <spec.json>                         lint only (exit 1 on FAIL)
  diagram.py --example [flowchart|swimlane|loop|hub]    print a starter spec

Same input as the installed `diagrams` plugin (`/diagrams:drawio`, `/diagrams:mermaid`), so a spec
written for either works here — that plugin stays the way to get an editable .drawio/Mermaid source;
this is the way to get a finished image in our style:
  {"type": "flowchart|swimlane|loop|hub", "title": "...", "kicker": "Module 2 · Plan on Paper",
   "direction": "LR|TD",
   "nodes": [{"id": "a", "label": "Pick one question", "shape": "rectangle|diamond|ellipse",
              "group": "g1", "accent": true}],
   "connections": [{"from": "a", "to": "b", "label": "yes", "style": "solid|dashed"}],
   "groups": [{"id": "g1", "label": "BEFORE"}],
   "source": "[P2D] / academy-outline.md P2 #3 / CLK-002"}       ← required: where the content came from

Rules it enforces (SKILL.md § Diagrams has the why for each):
  FAIL  missing `source` · edge to an unknown node · a diamond with an unlabeled branch · any text
        smaller than 18px at 1400 wide · boxes overlapping or leaving the canvas · >12 nodes
  WARN  >9 nodes (split it — beginners read one idea per picture) · label >40 chars · a node with no
        edge (except hub/loop centres) · a digit in a label (numbers are Matthew's: cite it in `source`)
Output: 1400×790 canvas (Skool media), rendered at 2× → 2800×1580 PNG; tokens from assets/base.css.
LOOK at the PNG (Read tool) before it ships — the linter measures geometry, not meaning.
"""
import html, json, math, os, re, shutil, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, TOP, PAD = 1400, 790, 190, 64          # canvas, title band height, side padding
BG, PANEL, LINE, GOLD, GOLD_LT, INK, MUTED = "#0A0A0A", "#141414", "#2A2A2A", "#D4AF37", "#E8C84A", "#F2EEE3", "#A39E92"
MIN_FONT, CHAR_W = 18, 0.56                  # px; average glyph width / font size for IBM Plex Sans 600
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

EXAMPLES = {
    "flowchart": {"type": "flowchart", "title": "One question, one page", "kicker": "Module 2 · Plan on Paper",
                  "direction": "LR", "source": "[P2D] academy-outline.md P2 #1",
                  "nodes": [{"id": "q", "label": "Bank the question during work"},
                            {"id": "s", "label": "45-minute paper session", "accent": True},
                            {"id": "d", "label": "Answered?", "shape": "diamond"},
                            {"id": "p", "label": "Turn it into the plan"}],
                  "connections": [{"from": "q", "to": "s"}, {"from": "s", "to": "d"},
                                  {"from": "d", "to": "p", "label": "yes"},
                                  {"from": "d", "to": "q", "label": "not yet", "style": "dashed"}]},
    "swimlane": {"type": "swimlane", "title": "Where the hour goes", "kicker": "Module 1 · Clockify",
                 "source": "[BT] academy-outline.md P1 #4", "groups": [{"id": "a", "label": "Settle in"},
                 {"id": "b", "label": "Deep work"}, {"id": "c", "label": "Wrap up"}],
                 "nodes": [{"id": "1", "label": "Check in, pick the objective", "group": "a"},
                           {"id": "2", "label": "Timer on, one objective", "group": "b", "accent": True},
                           {"id": "3", "label": "Log what got done", "group": "c"}],
                 "connections": [{"from": "1", "to": "2"}, {"from": "2", "to": "3"}]},
    "loop": {"type": "loop", "title": "The four-pillar loop", "kicker": "iCodeMyBusiness Academy",
             "source": "academy-outline.md 'What the academy is' (P2 3:07)",
             "nodes": [{"id": "c", "label": "Clockify"}, {"id": "p", "label": "Plan on Paper"},
                       {"id": "w", "label": "Writing Clarity"}, {"id": "a", "label": "Claude", "accent": True}],
             "connections": [{"from": "c", "to": "p"}, {"from": "p", "to": "w"}, {"from": "w", "to": "a"},
                             {"from": "a", "to": "c"}]},
    "hub": {"type": "hub", "title": "Diagram the whole system", "kicker": "Module 2 · Plan on Paper",
            "source": "academy-outline.md P2 #3", "nodes": [{"id": "c", "label": "The central idea", "accent": True},
            {"id": "1", "label": "Component"}, {"id": "2", "label": "Component"}, {"id": "3", "label": "Component"},
            {"id": "4", "label": "Component"}, {"id": "5", "label": "Component"}],
            "connections": [{"from": n, "to": "c"} for n in "12345"]},
}


def wrap(text, width_px, font):
    per = max(4, int(width_px / (font * CHAR_W)))
    lines, cur = [], ""
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > per:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    return lines + ([cur] if cur else [])


def fit(label, w, h, font=26):
    """Largest font ≥ MIN_FONT whose wrapped label fits the box; None if nothing fits."""
    while font >= MIN_FONT:
        lines = wrap(label, w - 28, font)
        if len(lines) * font * 1.2 <= h - 16 and all(len(l) * font * CHAR_W <= w - 20 for l in lines):
            return font, lines
        font -= 1
    return None


def ranks(nodes, edges):
    ids, out = [n["id"] for n in nodes], {n["id"]: [] for n in nodes}
    for e in edges:
        out[e["from"]].append(e["to"])
    back, seen, stack = set(), set(), set()

    def dfs(u):
        seen.add(u); stack.add(u)
        for v in out[u]:
            if v in stack:
                back.add((u, v))
            elif v not in seen:
                dfs(v)
        stack.discard(u)
    for i in ids:
        if i not in seen:
            dfs(i)
    rank = {i: 0 for i in ids}
    for _ in ids:
        for e in edges:
            if (e["from"], e["to"]) not in back:
                rank[e["to"]] = max(rank[e["to"]], rank[e["from"]] + 1)
    return rank, back


def layout(spec):
    nodes, kind = spec["nodes"], spec.get("type", "flowchart")
    area_w, area_h, x0, y0 = W - 2 * PAD, H - TOP - 48, PAD, TOP
    pos, back = {}, set()
    if kind in ("loop", "hub"):
        ring = nodes[1:] if kind == "hub" else nodes
        cx, cy, rx, ry = x0 + area_w / 2, y0 + area_h / 2, area_w * 0.36, area_h * 0.36
        bw, bh = min(300, area_w / max(3, len(ring)) * 1.2), 96
        for k, n in enumerate(ring):
            a = -math.pi / 2 + 2 * math.pi * k / len(ring)
            pos[n["id"]] = (cx + rx * math.cos(a), cy + ry * math.sin(a), bw, bh)
        if kind == "hub":
            pos[nodes[0]["id"]] = (cx, cy, 320, 112)
        return pos, back
    if kind == "swimlane":
        groups = spec.get("groups", [])
        gw = area_w / max(1, len(groups))
        for gi, g in enumerate(groups):
            members = [n for n in nodes if n.get("group") == g["id"]]
            for k, n in enumerate(members):
                cy = y0 + 70 + (area_h - 70) * (k + 0.5) / len(members)
                pos[n["id"]] = (x0 + gw * (gi + 0.5), cy, min(gw * 0.82, 320), min(110, (area_h - 70) / len(members) * 0.7))
        return pos, back
    rank, back = ranks(nodes, spec.get("connections", []))
    cols = max(rank.values()) + 1
    by = {}
    for n in nodes:
        by.setdefault(rank[n["id"]], []).append(n["id"])
    lr = spec.get("direction", "LR") != "TD"
    for r, ids in by.items():
        for k, i in enumerate(ids):
            if lr:
                cw = area_w / cols
                pos[i] = (x0 + cw * (r + 0.5), y0 + area_h * (k + 0.5) / len(ids),
                          min(cw * 0.74, 300), min(120, area_h / len(ids) * 0.6))
            else:
                rh = area_h / cols
                pos[i] = (x0 + area_w * (k + 0.5) / len(ids), y0 + rh * (r + 0.5),
                          min(area_w / len(ids) * 0.7, 320), min(rh * 0.62, 110))
    return pos, back


def border(p, q, shape):
    (cx, cy, w, h), (tx, ty, _, _) = p, q
    dx, dy = tx - cx, ty - cy
    if dx == dy == 0:
        return cx, cy
    if shape == "diamond":
        t = 1 / (abs(dx) / (w / 2) + abs(dy) / (h / 2))
    elif shape == "ellipse":
        t = 1 / math.hypot(dx / (w / 2), dy / (h / 2))
    else:
        t = min((w / 2) / abs(dx) if dx else 1e9, (h / 2) / abs(dy) if dy else 1e9)
    return cx + dx * t, cy + dy * t


def lint(spec, pos=None):
    msgs, nodes, edges = [], spec.get("nodes", []), spec.get("connections", [])
    ids = {n["id"] for n in nodes}
    if not spec.get("source"):
        msgs.append(("FAIL", "no `source` — every diagram cites the outline item / transcript tag / tactic it draws"))
    if len(nodes) > 12:
        msgs.append(("FAIL", f"{len(nodes)} nodes — split into two diagrams"))
    elif len(nodes) > 9:
        msgs.append(("WARN", f"{len(nodes)} nodes — beginners read one idea per picture; consider splitting"))
    for e in edges:
        for end in ("from", "to"):
            if e.get(end) not in ids:
                msgs.append(("FAIL", f"connection {e.get('from')}→{e.get('to')}: unknown node {e.get(end)!r}"))
    linked = {e.get("from") for e in edges} | {e.get("to") for e in edges}
    for n in nodes:
        if n["id"] not in linked and spec.get("type") not in ("hub", "loop"):
            msgs.append(("WARN", f"node {n['id']!r} has no connection"))
        if len(n["label"]) > 40:
            msgs.append(("WARN", f"label {n['label']!r} is {len(n['label'])} chars — say it in fewer words"))
        if re.search(r"\d", n["label"]):
            msgs.append(("WARN", f"label {n['label']!r} carries a number — numbers are Matthew's; make sure `source` covers it"))
        if n.get("shape") == "diamond":
            for e in edges:
                if e.get("from") == n["id"] and not e.get("label"):
                    msgs.append(("FAIL", f"decision {n['id']!r} has an unlabeled branch → {e.get('to')}"))
    if spec.get("type") == "swimlane":
        gids = {g["id"] for g in spec.get("groups", [])}
        for n in nodes:
            if n.get("group") not in gids:
                msgs.append(("FAIL", f"swimlane node {n['id']!r} has no valid group"))
    if pos:
        boxes = {i: (x - w / 2, y - h / 2, x + w / 2, y + h / 2) for i, (x, y, w, h) in pos.items()}
        for i, (a, b, c, d) in boxes.items():
            if a < 0 or b < TOP - 10 or c > W or d > H:
                msgs.append(("FAIL", f"node {i!r} leaves the canvas"))
        keys = list(boxes)
        for m, i in enumerate(keys):
            for j in keys[m + 1:]:
                A, B = boxes[i], boxes[j]
                if A[0] < B[2] and B[0] < A[2] and A[1] < B[3] and B[1] < A[3]:
                    msgs.append(("FAIL", f"nodes {i!r} and {j!r} overlap"))
        for n in nodes:
            if n["id"] in pos and fit(n["label"], pos[n["id"]][2], pos[n["id"]][3]) is None:
                msgs.append(("FAIL", f"label {n['label']!r} cannot fit its box at ≥{MIN_FONT}px — shorten it"))
    return msgs


def svg(spec, pos, back):
    """Returns (svg_text, problems) — problems are geometry the layout produced (label collisions)."""
    nodes, edges, out, problems = {n["id"]: n for n in spec["nodes"]}, spec.get("connections", []), [], []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    out.append(f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" '
               f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{GOLD}"/></marker></defs>')
    if spec.get("type") == "swimlane":
        groups = spec.get("groups", [])
        gw = (W - 2 * PAD) / max(1, len(groups))
        for gi, g in enumerate(groups):
            gx = PAD + gw * gi
            out.append(f'<rect x="{gx + 6:.0f}" y="{TOP:.0f}" width="{gw - 12:.0f}" height="{H - TOP - 48:.0f}" rx="14" '
                       f'fill="{PANEL}" stroke="{LINE}"/>')
            out.append(f'<text x="{gx + gw / 2:.0f}" y="{TOP + 42:.0f}" text-anchor="middle" font-family="IBM Plex Mono" '
                       f'font-size="20" letter-spacing="3" fill="{GOLD}">{html.escape(g["label"].upper())}</text>')
    for e in edges:
        a, b = pos[e["from"]], pos[e["to"]]
        sa, sb = nodes[e["from"]].get("shape", "rectangle"), nodes[e["to"]].get("shape", "rectangle")
        x1, y1 = border(a, b, sa)
        x2, y2 = border(b, a, sb)
        dash = ' stroke-dasharray="8 7"' if e.get("style") == "dashed" else ""
        is_back = (e["from"], e["to"]) in back
        if is_back and spec.get("type", "flowchart") == "flowchart":
            # route under (LR) / beside (TD) every box so the return path never crosses a node
            lr = spec.get("direction", "LR") != "TD"
            if lr:
                sx, sy, tx, ty = a[0], a[1] + a[3] / 2, b[0], b[1] + b[3] / 2
                yr = max(y + h / 2 for (_, y, _, h) in pos.values()) + 70
                d = f"M{sx:.1f},{sy:.1f} C{sx:.1f},{yr:.1f} {tx:.1f},{yr:.1f} {tx:.1f},{ty:.1f}"
                lx, ly = (sx + tx) / 2, 0.125 * sy + 0.75 * yr + 0.125 * ty
            else:
                sx, sy, tx, ty = a[0] + a[2] / 2, a[1], b[0] + b[2] / 2, b[1]
                xr = max(x + w / 2 for (x, _, w, _) in pos.values()) + 70
                d = f"M{sx:.1f},{sy:.1f} C{xr:.1f},{sy:.1f} {xr:.1f},{ty:.1f} {tx:.1f},{ty:.1f}"
                lx, ly = 0.125 * sx + 0.75 * xr + 0.125 * tx, (sy + ty) / 2
            out.append(f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="3"{dash} marker-end="url(#ah)"/>')
        elif is_back or spec.get("type") == "loop":
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            nx, ny = -(y2 - y1), (x2 - x1)
            k = 0.18 if spec.get("type") == "loop" else -0.35
            if spec.get("type") == "loop":   # bow away from the centre
                cx, cy = W / 2, TOP + (H - TOP - 48) / 2
                if (mx + nx * k - cx) ** 2 + (my + ny * k - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2:
                    k = -k
            qx, qy = mx + nx * k, my + ny * k
            out.append(f'<path d="M{x1:.1f},{y1:.1f} Q{qx:.1f},{qy:.1f} {x2:.1f},{y2:.1f}" fill="none" stroke="{GOLD}" '
                       f'stroke-width="3"{dash} marker-end="url(#ah)"/>')
            lx, ly = (x1 + 2 * qx + x2) / 4, (y1 + 2 * qy + y2) / 4
        else:
            out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GOLD}" stroke-width="3"'
                       f'{dash} marker-end="url(#ah)"/>')
            lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
        if e.get("label"):
            t = html.escape(e["label"])
            tw = len(e["label"]) * 20 * CHAR_W + 22
            pill = (lx - tw / 2, ly - 17, lx + tw / 2, ly + 17)
            for i, (x, y, w, h) in pos.items():
                if pill[0] < x + w / 2 and x - w / 2 < pill[2] and pill[1] < y + h / 2 and y - h / 2 < pill[3]:
                    problems.append(("FAIL", f"edge label {e['label']!r} collides with node {i!r} — shorten the label or reorder nodes"))
            if pill[3] > H or pill[2] > W or pill[0] < 0:
                problems.append(("FAIL", f"edge label {e['label']!r} leaves the canvas"))
            out.append(f'<rect x="{lx - tw / 2:.1f}" y="{ly - 17:.1f}" width="{tw:.1f}" height="34" rx="17" fill="{BG}" '
                       f'stroke="{LINE}"/><text x="{lx:.1f}" y="{ly + 7:.1f}" text-anchor="middle" font-family="IBM Plex Sans" '
                       f'font-weight="500" font-size="20" fill="{MUTED}">{t}</text>')
    for i, (x, y, w, h) in pos.items():
        n = nodes[i]
        stroke, fill, ink = (GOLD, "#1C1708", GOLD_LT) if n.get("accent") else (LINE, PANEL, INK)
        shape = n.get("shape", "rectangle")
        # one group per node, keyed by its spec id — quizzes score a chart-element answer by data-el
        out.append(f'<g data-el="{html.escape(str(i), quote=True)}" class="node">')
        if shape == "diamond":
            out.append(f'<polygon points="{x},{y - h / 2} {x + w / 2},{y} {x},{y + h / 2} {x - w / 2},{y}" fill="{fill}" '
                       f'stroke="{stroke}" stroke-width="2.5"/>')
            fw, fh = w * 0.62, h * 0.62
        elif shape == "ellipse":
            out.append(f'<ellipse cx="{x}" cy="{y}" rx="{w / 2}" ry="{h / 2}" fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>')
            fw, fh = w * 0.75, h * 0.75
        else:
            out.append(f'<rect x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="14" fill="{fill}" '
                       f'stroke="{stroke}" stroke-width="2.5"/>')
            fw, fh = w, h
        f = fit(n["label"], fw, fh) or (MIN_FONT, wrap(n["label"], fw, MIN_FONT))
        size, lines = f
        y0 = y - (len(lines) - 1) * size * 1.2 / 2 + size * 0.36
        for k, l in enumerate(lines):
            out.append(f'<text x="{x:.1f}" y="{y0 + k * size * 1.2:.1f}" text-anchor="middle" font-family="IBM Plex Sans" '
                       f'font-weight="600" font-size="{size}" fill="{ink}">{html.escape(l)}</text>')
        out.append("</g>")
    out.append("</svg>")
    return "\n".join(out), problems


def page(spec, body):
    css = open(os.path.join(KIT, "assets", "base.css")).read()
    title = html.escape(spec.get("title", ""))
    title = re.sub(r"\*(.+?)\*", r"<em>\1</em>", title)  # *word* → gold emphasis
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{css}\n'
            f'.dg{{position:absolute;left:0;top:0}}</style></head><body>'
            f'<div class="kicker">{html.escape(spec.get("kicker", ""))}</div><h1>{title}</h1>'
            f'<div class="brand">skool.com/<b>icodemybusiness</b></div><div class="dg">{body}</div></body></html>')


def render_png(html_path, png_path):
    chrome = CHROME if os.path.exists(CHROME) else shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome:
        return "no Chrome found — open the .html and screenshot it, or install Google Chrome"
    r = subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={W},{H}",
                        "--force-device-scale-factor=2", "--virtual-time-budget=4000",
                        f"--screenshot={png_path}", "file://" + os.path.abspath(html_path)],
                       capture_output=True, text=True, timeout=120)
    return None if os.path.exists(png_path) else (r.stderr[-800:] or "Chrome wrote no PNG")


def main(a):
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return 0
    if a[0] == "--example":
        print(json.dumps(EXAMPLES[a[1] if len(a) > 1 else "flowchart"], indent=1, ensure_ascii=False)); return 0
    only_lint = a[0] == "--lint"
    path = a[1] if only_lint else a[0]
    spec = json.load(open(path, encoding="utf-8"))
    pre = lint(spec)
    pos, back = ({}, set()) if any(l == "FAIL" for l, _ in pre) else layout(spec)
    msgs = pre + ([m for m in lint(spec, pos) if m not in pre] if pos else [])
    for level, m in sorted(msgs, key=lambda x: x[0] != "FAIL"):
        print(f"{level:4}  {m}")
    if any(l == "FAIL" for l, _ in msgs):
        print("lint FAILED — nothing rendered"); return 1
    body, problems = svg(spec, pos, back)
    for level, m in problems:
        print(f"{level:4}  {m}")
    if any(l == "FAIL" for l, _ in problems):
        print("lint FAILED — nothing rendered"); return 1
    if only_lint:
        print("lint ok"); return 0
    base = a[a.index("-o") + 1] if "-o" in a else os.path.splitext(path)[0]
    open(base + ".svg", "w").write(body)
    open(base + ".html", "w").write(page(spec, body))
    print(f"wrote {base}.svg, {base}.html")
    if "--no-png" not in a:
        err = render_png(base + ".html", base + ".png")
        print(f"PNG failed: {err}" if err else f"wrote {base}.png (2800×1580) — now LOOK at it")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
