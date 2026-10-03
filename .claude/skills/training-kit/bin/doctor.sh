#!/usr/bin/env bash
# training-kit preflight — what's ready, what isn't, in one screen. Read-only; installs nothing.
K="$(cd "$(dirname "$0")/.." && pwd)"
DRIVE="$HOME/Library/CloudStorage/GoogleDrive-12kernsmatthew@gmail.com/My Drive/iCodeMyBusiness"
ok(){ printf '  ok    %s\n' "$1"; }; no(){ printf '  MISS  %s — %s\n' "$1" "$2"; FAIL=1; }
echo "training-kit doctor ($(date '+%F %T'))"
echo "video"
command -v ffmpeg >/dev/null && ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')" || no ffmpeg "brew install ffmpeg (ask Matthew)"
command -v whisper-cli >/dev/null && ok "whisper-cli" || no whisper-cli "brew install whisper-cpp (ask Matthew)"
[ -f "$HOME/.cache/hyperframes/whisper/models/ggml-small.en.bin" ] && ok "whisper small.en (cut timings + QA)" || no "whisper small.en" "falls back to ~/whisper-models/ggml-base.en.bin"
[ -f "$HOME/whisper-models/ggml-base.en.bin" ] && ok "whisper base.en (raw-video-transcript)" || no "whisper base.en" "raw-video-transcript skill needs it"
[ -x "$HOME/.claude/skills/raw-video-transcript/transcribe.sh" ] && ok "raw-video-transcript skill (Raw Videos → Transcripts)" || no transcribe.sh "global skill missing"
echo "graphics / diagrams"
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] && ok "headless Chrome (render.py, diagram.py)" || no Chrome "needed for PNG renders"
[ -f "$K/assets/base.css" ] && ok "house tokens assets/base.css" || no base.css "kit incomplete"
[ -d "$HOME/.claude/plugins/cache/cc-plugins/diagrams" ] && ok "diagrams@cc-plugins (editable .drawio/Mermaid source)" || echo "  info  diagrams plugin not installed — diagram.py does not need it"
echo "docs / workbooks"
python3 -c "import openpyxl" 2>/dev/null && ok "openpyxl (workbook.py)" || no openpyxl "pip install openpyxl (ask Matthew)"
echo "  info  Google Drive connector: verify in-session with get_file_metadata 1WKhqGsmqXMjErL_9MWceGlfoTrHwpyKz (Skool Academy)"
echo "sources of record"
[ -f "$DRIVE/Skool Academy/academy-outline.md" ] && ok "Drive mount: academy-outline.md" || no "Drive mount" "open -a 'Google Drive' and wait for the mount"
[ -f "$DRIVE/Skool Academy/worksheet-links.tsv" ] && ok "Drive mount: worksheet-links.tsv ($(grep -c . "$DRIVE/Skool Academy/worksheet-links.tsv") rows)" || no tsv "Drive mount"
[ -d "$DRIVE/Youtube Content Plan/Transcripts" ] && ok "Transcripts folder ($(ls "$DRIVE/Youtube Content Plan/Transcripts" | grep -c '\.txt$') .txt)" || no Transcripts "Drive mount"
C="$HOME/.cache/icmb-training/tactics.json"
if [ -f "$C" ]; then ok "tactics cache ($(python3 -c "import json,time;d=json.load(open('$C'));print(len(d['rows']),'rows,',round((time.time()-d['syncedAt'])/3600,1),'h old')"))"; else no "tactics cache" "run bin/tactics.py sync"; fi
echo "machine"
[ -x "$HOME/bin/ramstat" ] && "$HOME/bin/ramstat" | head -1 | sed 's/^/  /'
exit ${FAIL:-0}
