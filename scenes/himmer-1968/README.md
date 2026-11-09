# Capt Lawrence Himmer, 16–17 April 1968

A living diorama of the relief attack by 1st Battalion, 9th Marines on a grass ridge south-west of Hill 689, west of Khe Sanh, on 16 April 1968, and of the night and morning that followed, in eleven chapters that each hold until Next. It follows Capt Lawrence "Larry" Himmer, commanding Company C, and Cpl Hubert Hunnicutt, who stayed with him. Every word on screen is a quotation from the record or a marked paraphrase; the time and place of Himmer's death are not in the records read, and the scene says so.

Open it: run `npm run serve` from the studio root and visit `http://localhost:8790/scenes/himmer-1968/index.html`. Arrow keys change chapter; drag to orbit; tap a man, place or radio line for its label; the story panel's control switches the side markers (Off · Groups · Each man).

## What is where

- `DECISIONS.md`: every ruling, dated. Read it first.
- `DESIGN.md` (approved), `research.md` (the sources, cited), `BRIEF.md`.
- `index.html`, `dem.js`, `labels.js` and the plug-ins: `land.js`, `works.js`, `medevac.js`, `fire.js`, `radio.js`, `nva.js`, `marines-a-d.js`, `marines-c.js`, `markers.js`.
- `clay-v3/`: the figures (built in code) and the motion layer; `clay-v3/FIGURES.md` is the API.
- `sources/`: the elevation model, the 1968 and 1971 map sheets, the 1/9 command chronology, the career research.
- Studies kept for the record: `style-study/`, `scale-study/`, `grass-study/`, `motion-study/`, `realistic-spike/` (a realistic figure pipeline, tried and set aside), `references/`.

## Before it animates: the Mixamo clips

The figures are driven by 33 animation clips from Adobe Mixamo, which Mixamo's terms do not allow us to redistribute as files, so they are **not in this repository** (`realistic-spike/anim/*.fbx` is gitignored). Without them the scene loads but the men do not move. To restore them: sign in to mixamo.com with your own Adobe account and download each clip named in `realistic-spike/anim/ANIM-LIST.md` as **FBX Binary, Without Skin, 30 fps, no keyframe reduction** (and `Rifle Walk` With Skin, as the skeleton reference) into `realistic-spike/anim/`. `realistic-spike/MIXAMO.md` has the steps.

## Licences

The repository is public. Everything committed here is original work for this scene, a US-government work (USMC and NARA photographs and documents, the AMS map sheets), or CC0 (the MakeHuman base used by the realistic spike; see `realistic-spike/ASSETS.md`). Third-party model previews in `references/` are look-only and are not committed; `references/REFERENCES.md` keeps their links.
