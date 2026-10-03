import json, os, re, subprocess

V = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.expanduser("~/Downloads/<fathom-call>.mp4")  # source filename redacted (it named the guest)
FIX = {"quad": "Claude", "cloud": "Claude", "rep": "re", "os": "pos", "soft": "soft", "w": "w", "ares": "ares",
       "phones": "owns"}

# (name, word-json, json offset s, start s, end s, layout, bg, right image)
SEGS = [
    ("s1", "c8", 34*60+10, 34*60+25.5, 34*60+31.6, "face", "bg-intro.png", "community.png"),
    ("s2", "c2", 11*60+15, 11*60+39.3, 12*60+10.2, "face", "bg-m1.png", "m1.png"),
    ("s3", "c1", 39*60+20, 39*60+35.1, 40*60+11.0, "audio", "bg-m2.png", "m2.png"),
    ("s4", "c5", 4*60+40, 4*60+54.1, 4*60+57.0, "face", "bg-m4.png", "m4.png"),
    ("s5a", "c3", 5*60+45, 5*60+49.0, 5*60+58.3, "face", "bg-m4.png", "m4.png"),
    ("s5b", "c3", 5*60+45, 6*60+5.7, 6*60+9.2, "face", "bg-m4.png", "m4.png"),
    ("s5c", "c3", 5*60+45, 6*60+10.95, 6*60+41.6, "face", "bg-m4.png", "m4.png"),
]

def words(js, off, a, b):
    out = []
    for seg in json.load(open(f"{V}/{js}.json"))["transcription"]:
        t0 = seg["offsets"]["from"]/1000 + off
        t1 = seg["offsets"]["to"]/1000 + off
        w = seg["text"].strip()
        if not w or t0 < a - 0.05 or t0 > b:
            continue
        if not out and re.fullmatch(r"[.,?!]+", w):
            continue
        out.append([t0 - a, min(t1, b) - a, w])
    # merge sub-word tokens that whisper split (e.g. "'s", "soft","w","ares")
    merged = []
    for t0, t1, w in out:
        if merged and (re.match(r"^['.,?!-]", w) or (merged[-1][2] in ("soft", "softw") and w in ("w", "ares"))
                       or (merged[-1][2] == "rep" and w == "os") or (merged[-1][2] == "share" and w == "able") or w == "@" or merged[-1][2].endswith("@") or (merged[-1][2].lower() == "click" and w.lower().startswith("up"))):
            merged[-1][1] = t1
            merged[-1][2] += w
        else:
            merged.append([t0, t1, w])
    j = []
    for m in merged:
        if j and (m[2] in (".", ".com") or re.fullmatch(r"com[,.]?", m[2]) and j[-1][2].endswith(".")):
            j[-1][1] = m[1]; j[-1][2] += m[2]; continue
        if j and j[-1][2].lower().endswith(("@client", "client")) and m[2].lower().startswith(("name", "platform")):
            j[-1][1] = m[1]; j[-1][2] += m[2]; continue
        j.append(m)
    merged = j
    for m in merged:
        k = m[2].lower().strip(".,?!")
        if k in ("quad", "cloud"):
            m[2] = m[2].lower().replace(k, "Claude")
        m[2] = m[2].replace("phones", "owns").replace("repos", "repos").replace("softwares", "software").replace("clickup", "ClickUp").replace("Clickup", "ClickUp")
    return merged

def ts(s):
    s = max(s, 0)
    return f"{int(s//3600):02d}:{int(s%3600//60):02d}:{int(s%60):02d},{int(round((s%1)*1000)):03d}"

def srt(ws, path):
    lines, cur, start = [], [], None
    for t0, t1, w in ws:
        if start is None:
            start = t0
        cur.append(w)
        if len(cur) >= 6 or t1 - start > 2.6 or w.endswith((".", "?", ",")) and len(cur) >= 3:
            lines.append((start, t1, " ".join(cur)))
            cur, start = [], None
    if cur:
        lines.append((start, ws[-1][1], " ".join(cur)))
    with open(path, "w") as f:
        for i, (a, b, txt) in enumerate(lines, 1):
            txt = re.sub(r"\s+([,.?!])", r"\1", txt)
            f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt}\n\n")

STYLE = ("Fontname=Helvetica Neue,Fontsize=17,Bold=1,PrimaryColour=&H00F2EEE3,OutlineColour=&H00000000,"
         "BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=40")
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])

parts = []
def card(name, img, dur):
    out = f"{V}/{name}.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", str(dur), "-i", f"{V}/{img}",
         "-f", "lavfi", "-t", str(dur), "-i", "anullsrc=r=48000:cl=stereo",
         "-vf", f"scale=1920:1080,fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.4}:d=0.4", *ENC, "-shortest", out])
    parts.append(out)

card("p0_open", "open.png", 4)
for name, js, off, a, b, layout, bg, img in SEGS:
    d = b - a
    sub = f"{V}/{name}.srt"
    srt(words(js, off, a, b), sub)
    out = f"{V}/{name}.mp4"
    fade = f"fade=t=in:st=0:d=0.25,fade=t=out:st={d-0.25:.2f}:d=0.25"
    if layout == "face":
        fc = (f"[0:v]crop=396:470:446:152,scale=-1:860,setsar=1[face];[1:v]scale=1920:1080[bg];"
              f"[2:v]scale=980:-1[img];[bg][face]overlay=x=110:y=(H-h)/2+10[t];"
              f"[t][img]overlay=x=840:y=(H-h)/2+10,subtitles={sub}:force_style='{STYLE}',{fade}[v]")
    else:
        fc = (f"[1:v]scale=1920:1080[bg];[2:v]scale=1500:-1[img];[bg][img]overlay=x=(W-w)/2:y=(H-h)/2+10,"
              f"subtitles={sub}:force_style='{STYLE}',{fade}[v]")
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.2f}", "-to", f"{b:.2f}", "-i", SRC,
         "-loop", "1", "-i", f"{V}/{bg}", "-loop", "1", "-i", f"{V}/{img}",
         "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
         "-af", f"afade=t=in:st=0:d=0.15,afade=t=out:st={d-0.2:.2f}:d=0.2", "-t", f"{d:.2f}", *ENC, out])
    parts.append(out)
card("p9_end", "end.png", 6)

with open(f"{V}/list.txt", "w") as f:
    for p in parts:
        f.write(f"file '{p}'\n")
run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{V}/list.txt",
     "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k",
     f"{V}/skool-intro-v1.mp4"])
print("built", f"{V}/skool-intro-v1.mp4")
