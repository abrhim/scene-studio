# Common brief for a builder

(The main session copies this into the scene's folder as `BRIEF.md`, fills in the angle brackets, and points every builder subagent at it. Each builder also gets a short brief of its own: its file, its budget, its sections of DESIGN.md, the labels it registers, and what it must leave room for.)

You're one of several builders of a living diorama: a 3D scene in the blocky low-poly style that loops for a family to watch on a TV and tap. This one is **<scene name>**: <one paragraph of what it shows and the mood>. The audience is a parent and young children. It must be beautiful from across the room, rewarding up close, gentle, and true to its source.

## Read first

- `scenes/<name>/DESIGN.md`: the plan.
- `scenes/<name>/index.html`: the base. Its `spots` and shared measurements are the source of truth for every position.
- `scenes/<name>/labels.js`: every tappable label, by key.
- `scenes/<name>/kit/blocky.js` and `kit/figures.js` (their headers), `kit/motion.js`.
- `docs/STYLE.md` and `docs/LESSONS.md` in the studio.
- The example plug-ins in `template/` show the plug-in shape.

## Rules

- Write only your own file (and scratch files under `scenes/<name>/.scratch/<your file>/`). Don't edit the base, `labels.js`, the kit or another builder's file. If you need a change there, work around it and list it in your report.
- Other builders are working at the same time. Load just yours with `?only=<name>` while building.
- Stay within your budget. Put static geometry in `ctx.world`, instance repeated things, bake figures with `Blocky.finish`, allocate nothing per frame.
- Everything moving is a pure function of `ctx.cycle.t` (plus `t` for idle wobble). Smooth: eased starts and stops, planted feet, no pops, no snapping at the cycle seam.
- Colours through `ctx.mat()` / `ctx.lin()`.
- This is a diorama, never a game: no controls that move anyone, no spawning, no scores, no outcomes that change. Tap moments (`onTap` on a label) are short gestures that blend back.

## Checking

The scene is served at `http://localhost:8790/scenes/<name>/index.html` (start it with `npm run serve` in the studio if it isn't running).

```bash
node tools/shot.mjs "http://localhost:8790/scenes/<name>/index.html?only=<file>&t0=30" .scratch/<file>/a.png 1.5
```

Look at every PNG. Check the automatic camera, close-ups, dusk and night, and strips of shots a few tenths of a second apart for motion. Iterate until it looks good, not just until it runs.

## Report

What you built, draws and triangles for your file alone, the best screenshot paths, what isn't finished or right, and any changes you want in shared files. Under 400 words.
