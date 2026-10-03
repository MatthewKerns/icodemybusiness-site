#!/usr/bin/env python3
"""Clip builder — cut spec → captioned 16:9 MP4 (ffmpeg + whisper-cli; no Docker, no VPS).

  clip.py frames <video> <m:ss> [<m:ss>…]   grab frames to check the layout / host-tile crop per call
  clip.py words <video> <start> <end>        word-level timings for a window (find exact cut points)
  clip.py build <cut.json>                   render the cut
  clip.py qa <out.mp4>                       re-transcribe (small.en) + dead-air report — run on EVERY build
  clip.py --example                          print a starter cut spec

Generalized from value-delivery's Skool intro v10 build (2026-10-02, reference/intro-v10/build.py).
Lessons baked in: Fathom timestamps only mark speaker-turn starts → always cut on whisper word timings;
the host tile sits at a fixed crop per call → check `frames` first; screen shares → layout "audio"
(voice over a card); caption fixups for Claude/cloud, ClickUp, URLs; loudness −14 LUFS.

Cut spec:
  {"source": "~/Downloads/call.mp4", "output": "out/clip-2.1.mp4",
   "host_crop": "396:470:446:152",          # w:h:x:y of Matthew's tile in the source (layout "face")
   "open": {"image": "open.png", "seconds": 4}, "end": {"image": "end.png", "seconds": 6},
   "segments": [{"start": "11:39.3", "end": "12:10.2", "layout": "face", "bg": "bg-m1.png", "image": "m1.png"},
                {"start": "39:35.1", "end": "40:11.0", "layout": "audio", "bg": "bg-m2.png", "image": "m2.png"},
                {"start": "0:12", "end": "1:40", "layout": "full"}],
   "fixups": {"cloud": "Claude", "quad": "Claude", "clickup": "ClickUp"},
   "source_note": "Fathom 845881975 — Matthew's segments only"}
Layouts: full = the source frame (his own recordings); face = his tile cropped, card image beside it;
audio = his voice over bg+image (screen shares, or any frame showing someone else).
Paths in the spec resolve relative to the spec file. Card images: render HTML with render.py.
GUARDRAILS (SKILL.md § Video): Matthew's segments only; no guest voice or face; no client names, rates,
money figures or third parties; Fathom only from calls with clients Mango classifies as unpaid.
"""
import json, os, re, subprocess, sys, tempfile

MODELS = [os.path.expanduser("~/.cache/hyperframes/whisper/models/ggml-small.en.bin"),
          os.path.expanduser("~/whisper-models/ggml-base.en.bin")]
FIX = {"cloud": "Claude", "quad": "Claude", "clickup": "ClickUp", "click up": "ClickUp"}
STYLE = ("Fontname=Helvetica Neue,Fontsize=17,Bold=1,PrimaryColour=&H00F2EEE3,OutlineColour=&H00000000,"
         "BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=40")
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
EXAMPLE = json.loads(re.search(r"Cut spec:\n(.*?)\nLayouts:", __doc__, re.S).group(1)
                     .replace('"host_crop": "396:470:446:152",          # w:h:x:y of Matthew\'s tile in the source (layout "face")',
                              '"host_crop": "396:470:446:152",'))


def secs(t):
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).split(":")]
    return sum(p * 60 ** i for i, p in enumerate(reversed(parts)))


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"command failed: {' '.join(cmd[:4])}…\n{r.stderr[-2000:]}")
    return r


def model():
    for m in MODELS:
        if os.path.exists(m):
            return m
    sys.exit("no whisper model — expected one of:\n  " + "\n  ".join(MODELS))


def words(src, a, b, fixups=FIX, pad=1.0):
    """Word timings (seconds, relative to `a`) for [a, b] of src, via whisper-cli -ml 1."""
    with tempfile.TemporaryDirectory() as td:
        wav, base = os.path.join(td, "w.wav"), os.path.join(td, "w")
        start = max(0.0, a - pad)
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{start:.2f}", "-to", f"{b + pad:.2f}", "-i", src,
             "-ar", "16000", "-ac", "1", wav])
        run(["whisper-cli", "-m", model(), "-f", wav, "-ml", "1", "-oj", "-of", base, "-np"])
        segs = json.load(open(base + ".json"))["transcription"]
    out = []
    for s in segs:
        raw = s["text"]
        t0, t1, w = s["offsets"]["from"] / 1000 + start, s["offsets"]["to"] / 1000 + start, raw.strip()
        if not w or t0 < a - 0.05 or t0 > b:
            continue
        if out and not raw.startswith(" "):                    # whisper token without a leading space
            out[-1][1], out[-1][2] = min(t1, b) - a, out[-1][2] + w  # continues the word ("soft"+"ware", "you"+"'re")
            continue
        if re.fullmatch(r"[.,?!]+", w) and not out:
            continue
        out.append([t0 - a, min(t1, b) - a, w])
    for o in out:
        key = o[2].lower().strip(".,?!")
        for wrong, right in fixups.items():
            if key == wrong:
                o[2] = re.sub(re.escape(wrong), right, o[2], flags=re.I)
    return out


def ts(s):
    s = max(s, 0)
    return f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round((s % 1) * 1000)) % 1000:03d}"


def srt(ws, path):
    lines, cur, start = [], [], None
    for t0, t1, w in ws:
        start = t0 if start is None else start
        cur.append(w)
        if len(cur) >= 6 or t1 - start > 2.6 or (w.endswith((".", "?", ",")) and len(cur) >= 3):
            lines.append((start, t1, " ".join(cur))); cur, start = [], None
    if cur:
        lines.append((start, ws[-1][1], " ".join(cur)))
    with open(path, "w") as f:
        for i, (a, b, txt) in enumerate(lines, 1):
            f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{re.sub(r' +([,.?!])', r'\1', txt)}\n\n")


def card(img, dur, out):
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", str(dur), "-i", img,
         "-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"scale=1920:1080,fade=t=in:st=0:d=0.4,fade=t=out:st={dur - 0.4}:d=0.4", *ENC, "-shortest", out])


def build(spec_path):
    spec = json.load(open(spec_path))
    here = os.path.dirname(os.path.abspath(spec_path))
    P = lambda p: os.path.join(here, os.path.expanduser(p))
    src, out = P(spec["source"]), P(spec["output"])
    work = os.path.splitext(out)[0] + ".parts"
    os.makedirs(work, exist_ok=True)
    fix = {**FIX, **{k.lower(): v for k, v in spec.get("fixups", {}).items()}}
    parts = []
    if spec.get("open"):
        parts.append(os.path.join(work, "p_open.mp4")); card(P(spec["open"]["image"]), spec["open"].get("seconds", 4), parts[-1])
    for k, sg in enumerate(spec["segments"], 1):
        a, b = secs(sg["start"]), secs(sg["end"])
        d, layout = b - a, sg.get("layout", "full")
        sub = os.path.join(work, f"s{k}.srt")
        srt(words(src, a, b, fix), sub)
        subf = sub.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        tail = f"subtitles='{subf}':force_style='{STYLE}',fade=t=in:st=0:d=0.25,fade=t=out:st={d - 0.25:.2f}:d=0.25"
        inputs = ["-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", src]
        if layout == "full":
            fc = f"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,{tail}[v]"
        elif layout == "face":
            inputs += ["-loop", "1", "-i", P(sg["bg"]), "-loop", "1", "-i", P(sg["image"])]
            fc = (f"[0:v]crop={spec['host_crop']},scale=-1:860,setsar=1[face];[1:v]scale=1920:1080[bg];[2:v]scale=980:-1[img];"
                  f"[bg][face]overlay=x=110:y=(H-h)/2+10[t];[t][img]overlay=x=840:y=(H-h)/2+10,{tail}[v]")
        elif layout == "audio":
            inputs += ["-loop", "1", "-i", P(sg["bg"]), "-loop", "1", "-i", P(sg["image"])]
            fc = f"[1:v]scale=1920:1080[bg];[2:v]scale=1500:-1[img];[bg][img]overlay=x=(W-w)/2:y=(H-h)/2+10,{tail}[v]"
        else:
            sys.exit(f"segment {k}: unknown layout {layout!r} (full | face | audio)")
        parts.append(os.path.join(work, f"s{k}.mp4"))
        run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
             "-af", f"afade=t=in:st=0:d=0.15,afade=t=out:st={d - 0.2:.2f}:d=0.2", "-t", f"{d:.2f}", *ENC, parts[-1]])
        print(f"segment {k}: {sg['start']}–{sg['end']} ({d:.1f}s, {layout})")
    if spec.get("end"):
        parts.append(os.path.join(work, "p_end.mp4")); card(P(spec["end"]["image"]), spec["end"].get("seconds", 6), parts[-1])
    lst = os.path.join(work, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:v", "copy",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", out])
    print(f"built {out} — now run: clip.py qa {out}")


def qa(path):
    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout)
    print(f"# {path}: {dur:.1f}s")
    print("## transcript (small.en) — read it for guest voices, names, money, third parties")
    ws = words(path, 0, dur, pad=0)
    line, t = [], 0.0
    for t0, _, w in ws:
        if not line:
            t = t0
        line.append(w)
        if w.endswith((".", "?", "!")) or len(line) > 14:
            print(f"[{int(t // 60)}:{t % 60:04.1f}] {' '.join(line)}"); line = []
    if line:
        print(f"[{int(t // 60)}:{t % 60:04.1f}] {' '.join(line)}")
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af", "silencedetect=noise=-35dB:d=0.8", "-f", "null", "-"],
                       capture_output=True, text=True)
    gaps = re.findall(r"silence_start: ([\d.]+).*?silence_duration: ([\d.]+)", r.stderr, re.S)
    print("## dead air ≥0.8s (open/end cards are silent by design — ignore gaps that fall inside them)")
    print(f"   {len(gaps)} gap(s)" + "".join(f"\n- at {float(s):.1f}s for {float(d):.1f}s" for s, d in gaps))
    print("## still yours to check by eye: every frame is Matthew or a card (no guest face, no internal screen share)")


def frames(src, times):
    out = os.path.splitext(src)[0] + ".frames"
    os.makedirs(out, exist_ok=True)
    for t in times:
        p = os.path.join(out, f"f-{t.replace(':', '')}.jpg")
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{secs(t):.2f}", "-i", src, "-frames:v", "1", "-q:v", "3", p])
        print(p)
    print("Read each frame; set host_crop=w:h:x:y to Matthew's tile, or use layout 'audio'/'full'.")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
    elif a[0] == "--example":
        print(json.dumps(EXAMPLE, indent=1))
    elif a[0] == "frames" and len(a) > 2:
        frames(os.path.expanduser(a[1]), a[2:])
    elif a[0] == "words" and len(a) == 4:
        for t0, t1, w in words(os.path.expanduser(a[1]), secs(a[2]), secs(a[3])):
            print(f"{secs(a[2]) + t0:9.2f} {secs(a[2]) + t1:9.2f}  {w}")
    elif a[0] == "build" and len(a) == 2:
        build(a[1])
    elif a[0] == "qa" and len(a) == 2:
        qa(a[1])
    else:
        sys.exit(__doc__)
