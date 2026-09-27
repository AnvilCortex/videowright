#!/usr/bin/env bash
# Generates the blooper-reel voiceover. Run from the REPO ROOT (loads repo-root .env).
#
#   bash examples/videowright_demo/videos/blooper_reel/audio/originals/voiceovers/v1/generate.sh
#
# Each segment's flubbed line is generated as a separate ElevenLabs clip, then placed
# at the start of a per-segment window (= the segment's visual beat length) and padded
# with trailing silence. Concatenating the windows yields a track that stays synced to
# the video at every segment boundary — no per-beat waitForNext wiring required.
set -euo pipefail

VOICE_ID="tMvyQtpCVQ0DkixuYm6J"   # Asher
MODEL_ID="eleven_multilingual_v2"
TAIL=0.35                          # min trailing silence after a line, if it's shorter than the window

BASE="examples/videowright_demo/videos/blooper_reel/audio"
VO_DIR="$BASE/originals/voiceovers/v1"
LINES_DIR="$VO_DIR/lines"
PAD_DIR="$VO_DIR/padded"
TRACK_DIR="$BASE/tracks/v1"
mkdir -p "$LINES_DIR" "$PAD_DIR" "$TRACK_DIR"

if [ ! -f .env ]; then echo "ERROR: run from repo root — .env not found in $(pwd)" >&2; exit 1; fi
set -a; . ./.env; set +a
: "${ELEVENLABS_API_KEY:?ELEVENLABS_API_KEY not set in .env}"

# Segment ids, window targets (seconds, = each segment's `advances`), and flubbed lines.
SEG_IDS=(bl-cold-open bl-title-card bl-web-tech-gallery bl-interactive-dev bl-pixel-perfect-export bl-voiceover-sync bl-any-coding-agent bl-install-cta bl-gag-reel-outro)
D=(10.4 9.8 11.6 9.6 9.8 7.2 7.4 10.2 8.4)
TEXTS=(
"The video you're watching, and this voice, were gener— ...ah— sorry. Sorry. Can we take it from the top?"
"Video-right? ...Video-rite? Vid... okay. Slowly. Video-wright. ...nailed it. Take twelve."
"That includes animated S-V-G, any charting library, advanced three-D, like Three-J-S or Lot— ...wait. Why is the rocket going down?"
"Request changes in your coding agent, and the preview hot relo— ...what did it do to it?"
"One command exports your video. It's deterministic, pixel-perfect— ...it was at ninety-nine percent."
"Your script generates an A-I narration. The pace of the narr— the na-rra— the pace of the nar-ray-tion drives the— ...is that even a word anymore?"
"And Video-wright works in every major coding agent— ...wait. Whose logo is that?"
"Install Video-wright, and you'll have a video before your coffee is— ...it's on the keyboard. It's on the keyboard."
"That's a wrap! The good take actually shipped — see examples, slash, video-wright demo. No narrators were harmed... a few were mildly embarrassed."
)

WIN_TSV="$VO_DIR/windows.tsv"; : > "$WIN_TSV"
CONCAT="$PAD_DIR/concat.txt"; : > "$CONCAT"

for i in "${!SEG_IDS[@]}"; do
  id="${SEG_IDS[$i]}"; dtarget="${D[$i]}"; text="${TEXTS[$i]}"
  echo "→ [$((i+1))/${#SEG_IDS[@]}] $id — generating…"
  code=$(curl -sS -w "%{http_code}" -o "$LINES_DIR/$id.mp3" \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" -H "Content-Type: application/json" -H "Accept: audio/mpeg" \
    --data "$(jq -n --arg t "$text" --arg m "$MODEL_ID" \
      '{text:$t, model_id:$m, voice_settings:{stability:0.4, similarity_boost:0.75, style:0.3, use_speaker_boost:true}}')")
  if [ "$code" != "200" ]; then
    echo "ERROR: $id returned HTTP $code" >&2; head -c 600 "$LINES_DIR/$id.mp3" >&2; echo >&2; exit 1
  fi
  L=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$LINES_DIR/$id.mp3")
  W=$(python3 -c "L=float('$L');D=float('$dtarget');print(round(max(D,L+$TAIL),3))")
  ffmpeg -y -v error -i "$LINES_DIR/$id.mp3" -af apad -t "$W" -ar 44100 -ac 1 -c:a libmp3lame -b:a 192k "$PAD_DIR/$id.mp3"
  echo "file '$id.mp3'" >> "$CONCAT"
  printf "%s\t%s\t%s\n" "$id" "$L" "$W" >> "$WIN_TSV"
  echo "   line=${L}s  window=${W}s"
done

ffmpeg -y -v error -f concat -safe 0 -i "$CONCAT" -ar 44100 -ac 1 -c:a libmp3lame -b:a 192k "$TRACK_DIR/track.mp3"
cp "$TRACK_DIR/track.mp3" "$VO_DIR/audio.mp3"
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TRACK_DIR/track.mp3")

echo
echo "✓ done. track: $TRACK_DIR/track.mp3 (${TOTAL}s)"
echo "=== windows (segid / line / window) ==="
cat "$WIN_TSV"
echo "TOTAL=${TOTAL}"
