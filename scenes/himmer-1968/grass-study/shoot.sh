#!/bin/sh
# Run from grass-study/ with the studio server on :8790 (npm run serve in scene-studio). Writes shots/ and shots/stats.txt.
U="http://127.0.0.1:8790/scenes/himmer-1968/grass-study/index.html"
T=../../../tools
: > shots/stats.txt
for g in A B C; do
  for c in near mid wide; do
    echo "$g $c day: $(node $T/shot.mjs "$U?g=$g&cam=$c&bench=1" shots/$g-$c.png 1 | head -1)" >> shots/stats.txt
  done
  echo "$g mid dusk: $(node $T/shot.mjs "$U?g=$g&cam=mid&time=dusk&bench=1" shots/$g-mid-dusk.png 1 | head -1)" >> shots/stats.txt
  echo "$g mid realtime: $(node $T/realtime.mjs "$U?g=$g&cam=mid" .scratch/rt-$g- 1 5000 | grep fps)" >> shots/stats.txt
done
# wind strip: 6 frames 0.2 s apart, hybrid at 6 m and at 40 m
for i in 0 1 2 3 4 5; do
  s=$(echo "2 + $i * 0.2" | bc)
  node $T/shot.mjs "$U?g=C&cam=near" shots/wind-near-$i.png $s > /dev/null
  node $T/shot.mjs "$U?g=C&cam=mid" shots/wind-mid-$i.png $s > /dev/null
done
cat shots/stats.txt
