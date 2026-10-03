#!/usr/bin/env python3
"""Render an HTML card/graphic to PNG with headless Chrome (house style: link ../assets/base.css).

  render.py <page.html> [out.png] [--size 1400x790] [--scale 2]
Defaults: 1400×790 at 2× (Skool media, 2800×1580). Video cards: --size 1920x1080 --scale 1.
Templates: reference/graphics/*.html (1400×790 Skool graphics) and reference/intro-v10/*.html (1920×1080 video cards).
LOOK at the PNG before it ships.
"""
import os, shutil, subprocess, sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def render(src, out, size="1400x790", scale="2"):
    chrome = CHROME if os.path.exists(CHROME) else shutil.which("google-chrome") or shutil.which("chromium")
    if not chrome:
        sys.exit("no Chrome found")
    w, h = size.split("x")
    if os.path.exists(out):
        os.remove(out)
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                    f"--force-device-scale-factor={scale}", "--virtual-time-budget=4000", f"--screenshot={out}",
                    "file://" + os.path.abspath(src)], capture_output=True, text=True, timeout=120)
    if not os.path.exists(out):
        sys.exit("Chrome wrote no PNG")
    print(f"wrote {out} ({int(w) * float(scale):.0f}×{int(h) * float(scale):.0f})")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        sys.exit(__doc__)
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    pos = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or not a[i - 1].startswith("--"))]
    render(pos[0], pos[1] if len(pos) > 1 else os.path.splitext(pos[0])[0] + ".png", opt("--size", "1400x790"), opt("--scale", "2"))
