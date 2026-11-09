# Common brief for a builder: Hill 689, 16 April 1968

You're one of several builders of a living diorama: a 3D scene that a family watches on a computer and taps. This one is **Hill 689, 16 April 1968** (`scenes/himmer-1968`): the relief attack of 16 April 1968 on a grass ridge about a mile south-west of Hill 689, west of Khe Sanh, by Companies A, C and D of 1st Battalion, 9th Marines, following Capt Lawrence "Larry" Himmer, commanding Company C, from the morning on Hill 689 through the attack in which he falls wounded, the dusk when Cpl Hubert Hunnicutt finds him in the open, the night Hunnicutt stays with him, and the morning of the 17th when the gorge parts them. The ground is real (the Copernicus elevation model, checked against the 1968 map sheet), at a third of real size with figures at true size. The mood is hot, hazy, late dry season: grass taller than a man, bomb craters, a far ridge that gives nothing away. The fighting is men moving, falling and taking cover, muzzle flashes and tracers, never wounds or blood. After dusk it turns quiet and close: two men in the open under a moon. The audience is Larry's descendants, adults and teens. It must be clear from a wide view, rewarding up close, restrained, and true to the record.

## Read first

- `scenes/himmer-1968/DESIGN.md`: the plan (approved). Your own brief names your sections.
- `scenes/himmer-1968/index.html`: the base. Its `SITE` block and `spots` are the source of truth for every position; where DESIGN.md's numbers differ, the base wins.
- `scenes/himmer-1968/labels.js`: every tappable label, by key, and the story panel. Words are record-only: never write a line of your own; tag the key.
- `scenes/himmer-1968/kit/` (the template kit, for props and tests; the figures are the clay figures from `clay-v3/`, not `kit/blocky.js`).
- `docs/STYLE.md` and `docs/LESSONS.md` in the studio. The land, plants and works follow the studio's low-poly style with the plants of the Khe Sanh hills.
- The example plug-ins in `template/` show the plug-in shape.

## The base's API (what is different from the template)

- **Chapters, not a 180 s day.** The scene holds one of 11 chapters at a time (DESIGN.md 9), each looping its own `ctx.cycle.t` from 0 to `ctx.cycle.length` (60 to 120 s) with no seam, until the viewer presses Next. `ctx.chapter` = `{ id (1-11), key, title, date, clock ('HHMM' shown now), minutes, loop, light, def }`. `ctx.CHAPTERS` lists them; `ctx.onChapter(fn(chapter, prevId))` is called on every change (and once at start): reset or hide your things there; `ctx.inChapter(6)` or `ctx.inChapter([8, 9])` tests. Everything moving is a pure function of `ctx.chapter.id` and `ctx.cycle.t`, so `?ch=6&t0=40` shows any moment.
- `ctx.cycle` keeps `t`, `n`, `length`, `dayAt()`; `ctx.light.day` is 1 by day, 0 at night (per chapter, blended on a change); `ctx.light.sun` gives `{ az, el }` in degrees.
- **The land:** `ctx.groundY(x, z)` is the drawn surface exactly (cheap; call it freely). `ctx.land.cls(x, z)` is the land class the ground is coloured by (1 = elephant grass / brushwood, 0 = forest): place grass and trees by it. `ctx.land.LAND.scale` (1/3) and `vx` (1.3); `ctx.land.yOf(realMetres)`; `ctx.land.realH(x, z)`. x = east, z = south (north = −z), y up, origin at the Hill 689 summit (y 104.4).
- **Scale:** the ground is a third of real size; figures, grass (1.4–2.2 m), craters (8–20 m across), bunkers, fire and radio arcs stay at **true human size**. Routes take a third of the real time at walking speed.
- **Positions:** `ctx.SITE` (also `window.SITE`) holds every shared place as a Vector3 on the ground: `summit689`, `cp`, `perimeter` (`rAt(bearing)`, `at(bearing)`, rMin 40, rMax 60), `perimSW`, `lz689`, `crossing.from/.to`, `saddle`, `battleSummit`, `northEnd`, `bunkerArc` (9 points), `secondPosition`, `charliePause`, `czlz`, `alz`, `deltaStart`, `deltaAxis`, `deltaStop`, `gully`, `himmerFall`, `hunnicuttCrater`, `craterSix`, `dawnCover`, `gullyEdge`, `craters` (zone, count, diameters), `hill552`, `base`, `armyMast`, `relayMast`, `routes.{A, C, D, cahillToLZ, hunnicuttCrawl, dawn, ch46}`, `tile`. `ctx.spots` has the same points flat by name. `?marks=1` draws a pole at each.
- **Labels:** `ctx.tag(key, getPos, { r, onTap, when })`. The base shows the line for the current chapter (`byCh`), marks paraphrase, and shows radio messages only in their `ch`. The base already tags `hill689`, `hill600name`, `ridge`, `hill552`, `gully`; tag everything you build.
- `ctx.blurb(text, ref, from, to, chapterId)`, `ctx.addCamFloor`, `ctx.addSurface`, `ctx.blob`, `ctx.addLantern` (flares), `ctx.addWind` as in the template.

## Rules

- Write only your own file (and scratch files under `scenes/himmer-1968/.scratch/<your file>/`). Don't edit the base, `labels.js`, the kit, `clay-v3/` or another builder's file. If you need a change there, work around it and list it in your report.
- Other builders are working at the same time. Load just yours with `?only=<name>` while building.
- **Budget (DESIGN.md 8):** the target is Abram's Apple M4 Pro at native resolution, 60 fps: under 600 draws and about 6 M triangles for the whole scene. The base uses 3 draws and 274k triangles. Per file: land.js 60 / 1.2M, works.js 40 / 300k, marines (each file) 75 / 1.5M, nva.js 20 / 150k, fire.js 20 / 150k, radio.js 10 / 20k, medevac.js 6 / 60k. Put static geometry in `ctx.world`, instance repeated things, bake figures into few skinned meshes, allocate nothing per frame.
- Everything moving is a pure function of `ctx.chapter.id` and `ctx.cycle.t` (plus `t` for idle wobble). Smooth: eased starts and stops, planted feet, no pops, no snapping at the loop's seam.
- Colours through `ctx.mat()` / `ctx.lin()`; the palette is `ctx.C`.
- No blood, no wounds, no dead shown in detail (DESIGN.md 9, "Not shown"). Larry is never shown dying.
- This is a diorama, never a game: no controls that move anyone, no spawning, no scores, no outcomes that change. Tap moments (`onTap`) are short gestures that blend back.

## Checking

The scene is served at `http://localhost:8790/scenes/himmer-1968/index.html` (start it with `npm run serve` in the studio if it isn't running).

```bash
node tools/shot.mjs "http://localhost:8790/scenes/himmer-1968/index.html?only=<file>&ch=6&t0=30" scenes/himmer-1968/.scratch/<file>/a.png 1.5
```

Look at every PNG. Check each chapter you appear in at its own light (`?ch=`), the automatic camera, close-ups, and strips of shots a few tenths of a second apart for motion, including across the loop's seam. Check once in real time with `tools/realtime.mjs`. Iterate until it looks right, not just until it runs.

## Report

What you built, draws and triangles for your file alone, the best screenshot paths, what isn't finished or right, and any changes you want in shared files. Under 400 words.
