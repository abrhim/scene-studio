# Mixamo clips on the Marine

## Where it stands

The 33 clips in `anim/` (Mixamo X Bot skeleton, see `anim/ANIM-LIST.md`) already play on the Marine. You do not
need to upload him to Mixamo. The page loads every `anim/*.fbx` with FBXLoader and retargets it onto the Marine's
own rig (MPFB2 `game_engine`, 53 bones) when it loads:

- Bones are matched by name: `mixamorig:Hips` to `pelvis`, `Spine/Spine1/Spine2` to `spine_01/02/03`, `LeftArm` to
  `upperarm_l`, `LeftUpLeg` to `thigh_l`, `LeftToeBase` to `ball_l`, all fingers, and so on (table in `index.html`, `MIX`).
- Each bone's world rotation is taken relative to the X Bot's T-pose (read from the bind matrices in the With Skin
  file, `Rifle Walk.fbx`) and applied to the Marine's T-pose (the `TPose` clip that `build_marine.py` exports in the
  glb). Bone axes and rolls do not need to agree, so no Mixamo upload or rename is needed. Checked: retargeted bone
  directions match the source to two decimals.
- The hips' height is scaled by leg length. Horizontal root motion is stripped, and its speed is kept
  (`clip.userData.speed`): in walk mode (W) the page moves him at that speed, so the feet stay planted.
  Measured: Rifle Walk 1.13 m/s, Injured Walk 1.21, Rifle Run 2.98, Rifle Run To Stop 1.89.
- Foot contact: the X Bot's legs are not his, so for standing and moving clips the page puts the lowest foot bone
  back at its rest height every frame.
- The rifle is its own mesh. For our own Walk and Stand it stays in the right hand. For Mixamo clips with "Rifle" in
  the name it sits in the right hand and points through the left hand. For other clips (phone, pointing, crawl,
  carry, dying) it is slung across the back.
- The face layer (blink, brow, jaw, small head saccades, breathing) runs on top of any clip. E changes the mood.

Keys: C cycles through the clips (Walk, Stand, then the Mixamo files). Or pass `?clip=Rifle%20Walk` and add `&mode=walk`
to walk him (`&follow=1` makes the camera travel with him).

## Adding more clips

1. On mixamo.com (Adobe sign-in), keep the default **X Bot** character so the skeleton matches the files you have.
2. Choose a clip. Leave **In Place** off for locomotion: the page uses the root motion to set his speed.
3. Download: Format **FBX Binary (.fbx)**, Skin **Without Skin**, Frames per second **30**, Keyframe Reduction **none**.
4. Put the file in `realistic-spike/anim/`. The file name, without `.fbx`, becomes the clip name. Reload the page.

Leave `Rifle Walk.fbx` (With Skin) in the folder: it is the T-pose reference for the retarget. If it is missing, the
page uses each file's first pose, and the retarget gets less exact.

## If you ever want the Marine rigged by Mixamo itself

Only needed if you want Mixamo's own skeleton on him (for example to use Mixamo's character preview, or another tool
that expects `mixamorig` names). The clips have to come from the same skeleton they will play on, so the Marine has
to be uploaded for auto-rigging first:

1. Upload `realistic-spike/marine-tpose.fbx` (T-pose, 23,715 tris, mesh and kit without the rifle, no rig,
   1024 px textures embedded, Y up, metres).
2. Place the auto-rig markers: chin, both wrists, both elbows, both knees, groin. Skeleton LOD: **Standard Skeleton (65)**
   with fingers.
3. Download him once **With Skin** as `anim/marine-mixamo.fbx`, then download each clip **Without Skin**, 30 fps,
   onto the Marine instead of X Bot.
4. The page would then need a switch to load `marine-mixamo.fbx` as the figure and play the clips by bone name,
   without retargeting. That switch is not built. With the retarget working, I don't recommend this path.

## Clips for this scene (Mixamo names)

| Need | Clip in `anim/` | Notes |
| --- | --- | --- |
| Relaxed walk with a rifle | `Walk With Rifle` (in place), `Rifle Walk` | `walk.mp4` uses Rifle Walk |
| Cautious crouched walk | `Rifle Crouch Walk` (in place) | Reads well on him. In-place, so the page cannot read a speed from it: drive his position from the scene |
| Rifle idle | `Rifle Idle`, `Rifle Kneel Idle`, `Idle Crouching`, `Crouch Idle 02 Looking Around` | Rifle Idle includes a check of the weapon partway through |
| Kneel, kneel to stand | `Kneeling Down`, `Stand Up`, `Getting Up`, `Rifle Idle To Crouch` | |
| Prone crawl | `Low Crawl`, `Prone Forward` (mirrored on download), `Prone Idle` | Foot clamp is off for these |
| Gentle collapse | **Keep `Dying (1)`** | Previewed all three on the Marine. Dying (1) sinks to the knees and settles, the gentlest. **Discard `Dying`** (staggers back, then pitches face down) and **`Dying (2)`** (staggers, then falls forward full length). Play death clips once with `clampWhenFinished`; the page loops every clip for now |
| Wounded man sitting | `Sitting Idle`, `Laying Breathless`, `Injured Idle` | |
| Pointing | `Pointing`, `Pointing Forward`, `Kneeling Pointing` | |
| Radioman | `Talking On Phone` | Hand to ear. No radio-pack idle exists on Mixamo |
| Looking around | `Looking Around` | |
| Stretcher bearers | `Carrying`, `Being Carried` | Rough match only: a two-man stretcher carry has to be posed by hand |
| Grenades | `Throw Grenade`, `Grenade Throw` | |
| Running | `Rifle Run`, `Rifle Run To Stop` | |

## Licence

Mixamo's terms allow the animations inside a built project, commercial or not, without attribution. They do not
allow the raw files to be redistributed as stand-alone animations. The repo is public, so `anim/*.fbx` is in
`realistic-spike/.gitignore`. The retarget runs in the browser and writes nothing derived from the clips to disk.
Decide before the first commit how the deployed scene will get these files.
