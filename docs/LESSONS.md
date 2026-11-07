# Lessons

What building Hobbiton, Rivendell, the character studies and the temple scene taught us. Each line is a trap someone fell into, and its fix.

## Geometry and the rig (kit/figures.js)

- **Lathes turn inside out** unless the kit is made with `outward: true` and the profile goes **top first** (y decreasing). An inside-out lathe hides anything layered over it (hair, a mantle).
- **Which way is front:** a lathe's phi 0 faces +z (the front). A `SphereGeometry`'s phi π/2 faces +z. To leave a lathe open at the front, `phi0 = a, phiLen = 2π - 2a`.
- **An opening that runs from the pole** (a veil, a hood) leaves the crown bare. Put a full cap on top and the opening only lower down.
- **A sweep's winding** must be `tri(a, b, c); tri(a, c, d)` or it renders inside out.
- **`rig.bake` stores the bind pose.** Build every figure at the origin, don't move or scale a pivot before the bake, keep the bake's parent at the origin, and hide a figure afterwards by scaling its root to about 0. Bake once per batch, with `Blocky.finish` (it also makes every colour linear and bakes the shade).
- **Hats:** build a tall hat as a sweep along a bending spine with a few even facets, so its polygons flow. A brim droops at the edge. A turban over full hair looks like a floating halo; put it over a short crop and make it larger.
- **Beards and long hair over the body** must sit forward of the robe or they poke through.

## Colour and light

- With sRGB output, every colour must go in linear: `ctx.mat(hex)` and `ctx.lin(hex)` do it, and a canvas texture needs `encoding = sRGBEncoding`. Hex straight into a material looks washed out.
- The look the style study found: ACES, a warm key, a warm ground bounce, baked shade in vertex colours, soft blob shadows, sky-matched haze. Lighting does more for these models than detail does; downloaded models that look great were designed for a particular light.
- When merging meshes, vertex colours survive only if every mesh of that material has them.

## Terrain

- Build heights from shapes: a base, `max()` of boxes, bumps and ridges, `min()` to carve channels. **Cap every term**: an uncapped bank rise once made the ground 34 m high at the camera.
- Blend regions with care so one region's formula doesn't push another above its plateau. Check `groundY` at sample points with a quick script before looking at pictures.
- Don't give two things the same name in a config object (`house: 12.2` and `house: { ... }`): the second wins silently and the first becomes NaN everywhere ("computeBoundingSphere: radius is NaN").
- Put every shared measurement (where the gates are, how deep the river is, where the fold is) in the base, so builders working in parallel agree. The base is the source of truth; if the design doc's numbers drift, say the base wins or fix the doc.

## Motion

- Feet planted: each leg spends 60% of its cycle on the ground. The leg swing has to match the stride (`Motion.legSwing(stride, legLength)`) or the feet slide. Steps shorten while a walker eases up to speed (`Motion.strides`).
- Blend from one step to the next (`BLEND` 0.8 s, `TURN` 0.9 s). Follow-through with `Motion.lag`: the head lags most, then the arms, then the torso.
- The walk the family loved: free arm swing with the elbows loosening as they come forward, and a loose head that nods twice a stride, tilts toward the planted foot and looks about now and then. "They're pretty stiff" meant the arms; "a tad thinner" meant the trunk.
- A hand on a staff keeps its grip: a third of the arm swing, the elbow steady, the staff upright.
- Different body shapes move differently. A slender, jointed figure needs a fluid walk with the pelvis turning and dipping and the feet on one line. Blocky figures move like blocks, and that's right for them.
- Every Script must fill the cycle exactly (`holdTo(180)`), and the state at 179.9 s must match 0 s. Check the seam.
- One big moment at a time (`ctx.events`), and nobody frozen: idle figures breathe, shift weight, glance and blink.

## Tapping

- People crowd, so a tap aims at faces (several points down from the head), people win over places, and tapping the same spot again steps to the next one. Labels follow their person and fade after 8 s.
- A tap moment is a short gesture laid over the timeline with a smooth blend in and out. It never moves someone across the scene, adds anyone or changes the story.

## Checking and delivery

- The preview pane pauses when it's hidden, so screenshots taken there can come out black or frozen. Use `tools/shot.mjs` (headless, with the clock stepped).
- Record video frame by frame with the clock faked (`tools/record.mjs`) at 30 fps, and encode with `+faststart` so it plays on phones.
- The Raspberry Pi 5 at 1080p holds about 30 fps at `res=0.75` with shadows off, about 110 draws and 110k triangles.
- Some sites need a login (Sketchfab) or block automated reading (Reddit). Ask the user to download or paste, and never sign in for them. A downloaded model needs its licence and credit shown on the page (most are CC BY 4.0).

## Ready-made models (when the user brings one)

- Many low-poly models have no skeleton. Rig them by region: below the waist only the arm parts follow the arms; whole feet go with the leg; beards follow the chin, then the chest; robes don't follow the legs, only boots do. Scale the reach of each bone to the model's size. For A-pose arms, apply the swing on top of the modelled tilt, about the body's own axes.

## Scripture and history

- Quote exactly, from the source edition the family uses (for Latter-day Saints, the King James Version as in the Church's edition), with the reference. Keep quotations short.
- For scripture scenes, follow the faith's own reading, from its own manuals and lessons. Put teaching lines in its words.
- Say what's from the text, what's from history and archaeology, and what's yours (compressed distances, timelines, invented minor characters) in the design doc.
