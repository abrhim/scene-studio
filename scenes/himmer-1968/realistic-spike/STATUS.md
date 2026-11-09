# Realistic Marine spike: status (shelved; the clay figure was chosen)

**What it makes.** `build_marine.py` builds a US Marine (April 1968) headless in about 40 s:
`/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P build_marine.py -- [seed=… height=… skin=…]`.
It writes `marine.glb` (24,000 tris, 2 texture sets at 2048 px, Walk/Stand/TPose clips, blink/brow/jaw shape keys),
`marine-lod.glb` (6,000 tris, 1024 px) and `marine-tpose.fbx`. `index.html` shows it (T/W/F/L/M/C/E keys).

**Works.**
- MPFB2 runs headless: the extension and the CC0 asset pack both install from the command line.
- Mixamo clips in `anim/` retarget onto the MPFB rig at load time. No upload is needed. Retargeted bone directions match the source.
- LOD and the 30-copy vertex-animation platoon (2 draw calls). Known bug: helmets render near-black at distance, from recomputed normals.
- Face keys with procedural blinks.

**Broken now.**
- **Boots:** clean shells, but oversized.
- **Rifle grip:** hands reach the grip and handguard, but the fingers are not closed and the left hand is open.
- **Vest pockets:** smaller than in the mannequin photo.

**Licences.** Built files contain only CC0 MakeHuman/MPFB assets and original kit (`ASSETS.md`). The Mixamo clips
cannot be redistributed and are gitignored. Reference photos are not shipped.
