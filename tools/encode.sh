#!/bin/sh
# Turns a folder of frames from record.mjs into an mp4 that plays on phones (H.264, yuv420p, moov atom first).
# Usage: sh tools/encode.sh <frames dir> <out.mp4> [audio file to lay under it]
set -e
FR="$1"; OUT="$2"; AUDIO="$3"
if [ -n "$AUDIO" ]; then
  ffmpeg -y -framerate 30 -i "$FR/f%05d.jpg" -i "$AUDIO" -shortest -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -c:a aac -b:a 160k -movflags +faststart "$OUT"
else
  ffmpeg -y -framerate 30 -i "$FR/f%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart "$OUT"
fi
