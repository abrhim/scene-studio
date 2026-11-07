---
name: scene-check
description: How to check a diorama yourself: headless screenshots at exact moments, motion strips, close-ups, day, dusk and night, performance, and recording video. Use whenever you or an agent needs to see what a scene actually looks like.
---

# Checking a scene

Never ask the user to check what you can check. Never say something works until you've seen it.

## Serving

`npm run serve` in the studio serves it on port 8790 (or start the `studio` preview server in `.claude/launch.json`). Scenes are at `http://localhost:8790/scenes/<name>/index.html`. If puppeteer-core is missing, run `npm install` first.

## Screenshots

```bash
node tools/shot.mjs "<url>" out.png [seconds to run] [width] [height]
```

- The page's clock is taken over, so `?t0=` gives the exact moment. The last number is how long to run first (motion blends need a second or so to settle).
- It prints the stats line (draws, triangles, the cycle time) and every error, warning and failed request. Fix every error.
- `SHOT_EVAL="js"` runs a snippet in the page after it loads and prints the result. Use it to check `ctx.groundY(x, z)`, positions, or counts.
- Look at every PNG with your image reader. Describe to yourself what's wrong before deciding it's right.

## What to look at

- **The automatic camera** at 0, 30, 60, 90, 120, 150 and 170 s. Is the heart of the scene framed? Is something gently moving everywhere?
- **Close-ups** of each character, building and place: `?cam=x,y,z,tx,ty,tz`. Is anything poking through, floating or sunk?
- **The light:** `?time=day`, `?time=dusk`, `?time=night`.
- **The tour:** `?tour=1&t0=0`, then every view.
- **Motion:** a strip of shots a few tenths of a second apart (`t0=60`, `60.3`, `60.6` and so on), stitched side by side with ffmpeg (`ffmpeg -i a.png -i b.png -i c.png -filter_complex hstack strip.png`). Look for sliding feet, pops and freezes. Check the seam: `t0=179.6` against `t0=0.2`.
- **Taps:** `SHOT_EVAL="window.__tapAt(x, y); ..."` with screen coordinates, then a screenshot. Is the label right and well placed?
- **One file alone:** `?only=<plug-in>`.
- **Performance:** the stats line. Budget about 110 draws and 110k triangles. The Pi runs `?res=0.75`.

## Video

```bash
node tools/record.mjs "<url>" <frames dir> <frames>   # 30 fps; 5400 frames is the whole 3-minute loop (not ?capture)
sh tools/encode.sh <frames dir> <out.mp4> [music.mp3]
```

Send videos and stills to the user with SendUserFile.
