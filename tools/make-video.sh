#!/bin/sh
# Films the board and writes a looping MP4 for a television.
#
#   sh tools/make-video.sh [outfile] [fps]
#
# Needs node and ffmpeg. Serves the folder, drives a headless Chrome, films one
# lap, then encodes it for the widest set of televisions: H.264 High, yuv420p,
# a silent AAC track (some sets refuse a file with no audio) and faststart.
set -e
cd "$(dirname "$0")/.."

OUT=${1:-dist/bizda-baraka-next-nout.mp4}
FPS=${2:-30}
WORK=$(mktemp -d)
PORT=8799
trap 'kill $SRV $BROWSER 2>/dev/null; rm -rf "$WORK"' EXIT

command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed: brew install ffmpeg"; exit 1; }

python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME=$(command -v google-chrome || command -v chromium)
"$CHROME" --headless=new --remote-debugging-port=9333 \
  --user-data-dir="$WORK/profile" --no-first-run --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1920,1080 about:blank >/dev/null 2>&1 &
BROWSER=$!

i=0; while [ $i -lt 60 ] && ! curl -s -m 1 http://127.0.0.1:9333/json/list >/dev/null; do sleep 0.5; i=$((i+1)); done

node tools/render.js "http://127.0.0.1:$PORT/index.html" "$WORK/raw" "$FPS"
LAP=$(cat "$WORK/raw/lap.txt")

mkdir -p "$(dirname "$OUT")"
ffmpeg -y -loglevel error -stats \
  -f concat -safe 0 -i "$WORK/raw/list.txt" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -t "$LAP" \
  -vf "fps=$FPS,format=yuv420p" \
  -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 19 \
  -x264-params "keyint=$((FPS*2)):min-keyint=$FPS:scenecut=0" \
  -c:a aac -b:a 64k -shortest -movflags +faststart \
  "$OUT"

echo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 "$OUT"
echo "wrote $OUT"
