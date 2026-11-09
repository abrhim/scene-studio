#!/bin/sh
# run from scale-study/ with `npm run serve` going in scene-studio
U="http://127.0.0.1:8790/scenes/himmer-1968/scale-study/index.html"
for v in home mid charlie; do for s in 1 3 5 10; do
  SHOT_EVAL="window.__stats" node ../../../tools/shot.mjs "$U?s=$s&view=$v" shots/$v-s$s.png 0.2 | grep -E "eval:|rror"
done; done
for vx in 1.0 1.6; do SHOT_EVAL="window.__stats" node ../../../tools/shot.mjs "$U?s=3&vx=$vx&view=mid" shots/mid-s3-vx$vx.png 0.2 | grep -E "eval:|rror"; done
