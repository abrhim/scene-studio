# Clay figures: the API for scene plug-ins

**Loading.** Script tags, after three r128, paths from `scenes/himmer-1968/` (figures are built in code; no glbs):

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js"></script>
<script src="clay-v3/figkit.js"></script>
<script src="clay-v3/clay-v3.js"></script>  <!-- window.V3 -->
<script src="clay-v3/motion.js"></script>   <!-- window.CM -->
```

Set `CM.animPath = 'realistic-spike/anim/'`, `await CM.init(V3.build({ mat }))` once, then `await CM.load([...names])` (names in `CM.ALL`; each retargets in 50–150 ms, so load only what plays).

**Building.** Use one shared material: `const mat = V3.material()`.
- `V3.make(seed, kind, lod, mat)` returns a figure `F`; add `F.root` to the scene.
- Kinds are `rifleman`, `captain`, `radioman`, `corpsman` and `nva`.
- `lod` 1 is the hero mesh (17.7–19.9k triangles); 0 is far (5.7–6.8k).
- The seed picks face, skin, height, build, stubble, sleeves, towel, band items. Exact look: `V3.build({ kind, face, skin, hair, stubble, rolled, towel, band, build, lod, mat })`.

**Motion.**
- `const f = CM.figure(F, { seed, x, z, yaw, vary: true, mood: 'calm', ground })` sets it up. `ground(x, z)` gives the terrain height.
- `CM.play(f, name, { fade: 0.45, time, reverse })` crossfades to a clip.
- One-shots (falls, kneels) hold their last frame.
- `CM.setMood(f, 'calm' | 'alert' | 'strained')` biases face and gaze.
- `CM.route(f, [[x, z], ...], { stop: 'Rifle Idle' })` walks the playing clip along the points.; the root follows the planted foot and the feet are pinned.
- To hold a figure in place (kneel, fall): `f.o.pinned = true; f.route = null`.
- `CM.L.rifle` (and `kit`, `look`, `load`, `vary`, `root`, `sway`, `face`) switch layers for all figures.

**Per frame.** Call `CM.update(f, dt, t)` for each figure. About 0.056 ms each on the M4 Pro (8 ms for 150); past 40 m, update every second or third frame.

**LOD.** No runtime swap yet: build `lod: 0` for anyone beyond about 25 m. Both levels share skeleton and clips, so a swap would be a visibility toggle.

**Crowds.** One skinned mesh, one draw per figure; no instanced or vertex-animation path exists for clay yet. Budget about 40 hero plus 110 far figures. The Pi needs a baked crowd path (open).

**Other plug-ins.**
- `marines.radios`: expose `CM.radioPoints(f)` for each radioman. → `{ handset, antennaTip, pack }`, world space, after `CM.update`.
- `FIRE.burst`: call `CM.muzzle(f, pos, dir)` then `FIRE.burst(pos, dir)`. No firing clip; the hold stays steady.

**Known limits.**
- No two-man drag or carry clip.
- No kneel-to-stand clip: rise with Kneeling Down `reverse: true` (weight moves the wrong way).
- Two-hand clip to a no-rifle clip: the rifle snaps to the back through the body during the fade (falls drop it instead).
- Low Crawl plays in place.
- The hands are mittens with peg fingers.

**Example: a 10-man file marching a route, one man kneeling at t = 30**

```js
CM.animPath = 'realistic-spike/anim/';
const mat = V3.material();
await CM.init(V3.build({ mat }));
await CM.load(['Walk With Rifle', 'Rifle Idle', 'Kneeling Down', 'Rifle Kneel Idle']);
const men = [];
for (let i = 0; i < 10; i++) {
  const F = V3.make(100 + i, i === 2 ? 'radioman' : 'rifleman', i < 3 ? 1 : 0, mat);
  scene.add(F.root);
  const f = CM.figure(F, { seed: i, x: -i * 3, z: 0, yaw: Math.PI / 2, vary: true, ground: ctx.groundY });
  CM.play(f, 'Walk With Rifle');
  CM.route(f, [[20, 0], [30, 10]], { stop: 'Rifle Idle' });
  men.push(f);
}
// in the plug-in's frame callback
function update(t, dt) {
  const k = men[3];
  if (t >= 30 && !k.knelt) {
    k.knelt = true; k.route = null; k.o.pinned = true;
    CM.play(k, 'Kneeling Down', { fade: 0.4 });
  }
  if (k.knelt && k.cur === 'Kneeling Down' && k.acts['Kneeling Down']._held) CM.play(k, 'Rifle Kneel Idle', { fade: 0.45 });
  for (const f of men) CM.update(f, dt, t);
}
```

Tested headless: the file follows the route and man 4 kneels and stays.
