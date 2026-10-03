#!/usr/bin/env python3
"""Doc builder — Markdown → Google-Docs-ready HTML (house style), for anything we share as a Google Doc.

  docbuild.py <draft.md> [-o out.html] [--title "N.T Title"]
      writes the HTML (default: next to the draft) and prints the publish options. Never uploads.
  docbuild.py <draft.md> --worksheet --title "N.T Title"
      prints the app-path command for a tsv worksheet (native Doc in Skool Worksheets, owned by
      12kernsmatthew, visible to the app's drive.file token). Running it is a HUMAN GATE.

Why HTML: Drive converts an uploaded text/html file into a native Google Doc, keeping headings, bold,
lists, tables and links. Two publish lanes (SKILL.md § Docs):
  A. Worksheet listed in worksheet-links.tsv → the app path (`xTactics:createDocFromMarkdown`), so the
     app owns it and the tsv URL is the join key. Then file it in its module folder and add the tsv row.
  B. Any other shared Doc (lesson pack, brief, review sheet) → Drive connector `create_file`
     {title, textContent=<the HTML>, contentMimeType:"text/html", parentId:<folder>} — converts to a Doc.
Lint first: academy.py lint <draft.md> must show 0 FAIL.

Markdown supported: # ## ### headings, paragraphs, - / * bullets, 1. numbered, > quotes, **bold**,
*italic*, `code`, [text](url), | tables |, --- rules, and worksheet answer lines ("Answer: ____").
"""
import html, json, os, re, subprocess, sys

GOLD, INK, MUTED, LINE = "#B8932E", "#1A1A1A", "#6B665C", "#D9D4C7"  # print-safe variants of the brand tokens
STYLE = {
    "h1": f"font-family:Arial;font-size:22pt;font-weight:700;color:{INK};margin:0 0 6pt",
    "h2": f"font-family:Arial;font-size:15pt;font-weight:700;color:{INK};margin:16pt 0 4pt;border-bottom:1px solid {LINE}",
    "h3": f"font-family:Arial;font-size:12pt;font-weight:700;color:{GOLD};margin:12pt 0 2pt",
    "p": f"font-family:Arial;font-size:11pt;line-height:1.45;color:{INK};margin:0 0 8pt",
    "li": f"font-family:Arial;font-size:11pt;line-height:1.45;color:{INK}",
    "quote": f"font-family:Arial;font-size:11pt;color:{MUTED};border-left:3px solid {GOLD};padding-left:10pt;margin:0 0 8pt",
    "answer": f"font-family:Arial;font-size:11pt;color:{MUTED};margin:0 0 14pt",
    "th": f"font-family:Arial;font-size:10pt;font-weight:700;background:#F3EEDF;border:1px solid {LINE};padding:4pt",
    "td": f"font-family:Arial;font-size:10pt;border:1px solid {LINE};padding:4pt;vertical-align:top",
}


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r'<span style="font-family:Courier New">\1</span>', s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"<i>\1</i>", s)
    return s


def convert(md):
    out, lines, i = [], md.replace("\r\n", "\n").split("\n"), 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1; continue
        if m := re.match(r"^(#{1,3})\s+(.*)", line):
            tag = f"h{len(m.group(1))}"
            out.append(f'<{tag} style="{STYLE[tag]}">{inline(m.group(2))}</{tag}>'); i += 1; continue
        if re.match(r"^\s*(-{3,}|\*{3,})\s*$", line):
            out.append(f'<hr style="border:0;border-top:1px solid {LINE}">'); i += 1; continue
        if line.lstrip().startswith("|"):
            rows = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            t = ['<table style="border-collapse:collapse;width:100%">']
            for r, cells in enumerate(rows):
                k = "th" if r == 0 else "td"
                t.append("<tr>" + "".join(f'<{k} style="{STYLE[k]}">{inline(c)}</{k}>' for c in cells) + "</tr>")
            out.append("".join(t) + "</table>"); continue
        if re.match(r"^\s*([-*]|\d+\.)\s+", line):
            ordered = bool(re.match(r"^\s*\d+\.", line))
            tag = "ol" if ordered else "ul"
            items = []
            while i < len(lines) and re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]):
                text = re.sub(r"^\s*([-*]|\d+\.)\s+", "", lines[i]); i += 1
                while i < len(lines) and lines[i].startswith(("  ", "\t")) and lines[i].strip() \
                        and not re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]):
                    text += " " + lines[i].strip(); i += 1
                items.append(f'<li style="{STYLE["li"]}">{inline(text)}</li>')
            out.append(f"<{tag}>{''.join(items)}</{tag}>"); continue
        if line.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip("> ").rstrip()); i += 1
            out.append(f'<p style="{STYLE["quote"]}">{inline(" ".join(buf))}</p>'); continue
        if re.match(r"^\s*Answer:", line):
            out.append(f'<p style="{STYLE["answer"]}">{inline(line.strip())}</p>'); i += 1; continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,3}\s|\s*([-*]|\d+\.)\s|>|\||\s*Answer:)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append(f'<p style="{STYLE["p"]}">{inline(" ".join(buf))}</p>')
    return "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>\n" + "\n".join(out) + "\n</body></html>\n"


def main(a):
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    src = a[0]
    title = a[a.index("--title") + 1] if "--title" in a else os.path.splitext(os.path.basename(src))[0]
    md = open(src, encoding="utf-8").read()
    if "--worksheet" in a:
        root = os.path.dirname(subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                                              capture_output=True, text=True).stdout.strip())
        ident = json.dumps({"subject": "cli_seed", "issuer": "https://cli.local", "tokenIdentifier": "https://cli.local|cli_seed",
                            "email": "matthew@icodemybusiness.com", "emailVerified": True})
        args = json.dumps({"title": title, "markdown": md})
        print("# HUMAN GATE — Matthew approves before this runs. Creates a native Doc in Skool Worksheets/ (parent folder).")
        print(f"cd {root} && npx convex run xTactics:createDocFromMarkdown {json.dumps(args)} --identity '{ident}'")
        print("# then: file the Doc in its module folder (move on the Drive mount keeps the id), append the tsv row, academy.py check")
        return
    out = a[a.index("-o") + 1] if "-o" in a else os.path.splitext(src)[0] + ".html"
    open(out, "w", encoding="utf-8").write(convert(md))
    print(f"wrote {out} ({os.path.getsize(out)} bytes) — title: {title!r}")
    print("publish lane B (connector): create_file title=<title> contentMimeType=text/html textContent=<file> parentId=<folder>")
    print("publish lane A (tsv worksheet): docbuild.py <draft.md> --worksheet --title \"N.T Title\"")


if __name__ == "__main__":
    main(sys.argv[1:])
