#!/bin/sh
# Lays a music bed under the film and repeats the picture to match it.
#
#   sh tools/add-music.sh <music file> [outfile]
#
# The film is one lap, about 40 seconds. Putting 40 seconds of music under it
# would mean the same 40 seconds roughly ninety times an hour, which no one
# should have to stand behind a counter and listen to. So the picture is
# repeated as many whole laps as fit inside the track, and the music runs its
# whole length before it comes round again. Every lap is identical, so the
# picture still loops without a seam.
#
# The music is faded in and out at the ends so the joint is a dip rather than a
# click, and set to about -20 LUFS: present, and quiet enough to talk over.
#
# Give it a bed that is already cut to length and levelled (an .m4a or .aac out
# of an earlier run) and it is used as it is, so rebuilding the picture does not
# mean rebuilding the sound.
set -e
cd "$(dirname "$0")/.."

MUSIC=$1
OUT=${2:-dist/bizda-baraka-next-nout-musiqali.mp4}
FILM=dist/bizda-baraka-next-nout.mp4
TARGET=-20                                  # LUFS, background level
FADE_IN=1.5
FADE_OUT=2.5

[ -n "$MUSIC" ] && [ -f "$MUSIC" ] || { echo "usage: sh tools/add-music.sh <music file>"; exit 1; }
[ -f "$FILM" ] || { echo "$FILM is missing — run tools/make-video.sh first"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed: brew install ffmpeg"; exit 1; }

dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }
LAP=$(dur "$FILM")
TRACK=$(dur "$MUSIC")

# how many whole laps fit inside the track, and how long that makes the film
LAPS=$(python3 -c "print(max(1, int($TRACK // $LAP)))")
TOTAL=$(python3 -c "print(round($LAPS * $LAP, 6))")
OUTFADE=$(python3 -c "print(round($TOTAL - $FADE_OUT, 6))")

# a bed already cut to the film's length is taken as finished: levelled, faded
# and trimmed by an earlier run, so it is copied in rather than worked over
READY=no
case "$MUSIC" in *.m4a|*.aac|*.M4A|*.AAC) READY=yes ;; esac
python3 -c "import sys; sys.exit(0 if abs($TRACK - $LAPS * $LAP) < 1 else 1)" || READY=no

if [ "$READY" = yes ]; then
  echo "film $LAP s x $LAPS laps = $TOTAL s; bed $TRACK s, already levelled — copying it in"
else
  # the track's own loudness, so it can be set to the target with one flat gain
  # rather than a compressor that would breathe on a bed this steady
  IN_I=$(ffmpeg -hide_banner -i "$MUSIC" -af loudnorm=print_format=summary -f null - 2>&1 |
         awk '/Input Integrated/ {print $3}')
  GAIN=$(python3 -c "print(round($TARGET - ($IN_I), 2))")
  echo "film $LAP s x $LAPS laps = $TOTAL s; track $TRACK s at $IN_I LUFS, gain ${GAIN} dB"
fi

LIST=$(mktemp)
i=0; while [ $i -lt "$LAPS" ]; do echo "file '$PWD/$FILM'" >> "$LIST"; i=$((i+1)); done
trap 'rm -f "$LIST"' EXIT

mkdir -p "$(dirname "$OUT")"
if [ "$READY" = yes ]; then
  ffmpeg -y -loglevel error -stats \
    -f concat -safe 0 -i "$LIST" -i "$MUSIC" \
    -map 0:v -map 1:a -c:v copy -c:a copy \
    -movflags +faststart -t "$TOTAL" "$OUT"
else
  ffmpeg -y -loglevel error -stats \
    -f concat -safe 0 -i "$LIST" \
    -i "$MUSIC" \
    -filter_complex "[1:a]atrim=0:$TOTAL,asetpts=N/SR/TB,volume=${GAIN}dB,\
afade=t=in:st=0:d=$FADE_IN,afade=t=out:st=$OUTFADE:d=$FADE_OUT[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 \
    -movflags +faststart -t "$TOTAL" "$OUT"
fi

echo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name \
  -of default=noprint_wrappers=1 "$OUT"
ffmpeg -hide_banner -i "$OUT" -af loudnorm=print_format=summary -f null - 2>&1 |
  grep 'Input Integrated' | sed 's/Input/Final/'
echo "wrote $OUT"
