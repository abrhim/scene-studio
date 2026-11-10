# Capt Lawrence Himmer, 16–17 April 1968

A living diorama of the relief attack by 1st Battalion, 9th Marines on a grass ridge south-west of Hill 689, west of Khe Sanh, on 16 April 1968, and of the night and morning that followed, in eleven chapters that each hold until Next. It follows Capt Lawrence "Larry" Himmer, commanding Company C, and Cpl Hubert Hunnicutt, who stayed with him. Every word on screen is a quotation from the record or a marked paraphrase; the time and place of Himmer's death are not in the records read, and the scene says so.

Open it: run `npm run serve` from the studio root and visit `http://localhost:8790/scenes/himmer-1968/index.html`. Arrow keys change chapter; drag to orbit; tap a man, place or radio line for its label; the story panel's control switches the side markers (Off · Groups · Each man).

## Live copy

Deployed to Abram's personal Cloudflare account as a static-asset Worker: https://himmer-1968.abramhimmer.workers.dev (noindex; first deployed 2026-11-10 at 9bfad10). To redeploy, copy `index.html`, `dem.js`, `labels.js`, the plug-ins, `kit/*.js`, `clay-v3/*.js`, `sound.js`, `audio/*.mp3`, `narration-script.js`, `realistic-spike/anim/*.fbx` and `realistic-spike/*.glb` into an empty folder with a `_headers` of `/*` → `X-Robots-Tag: noindex`, then from the studio root:

    npx wrangler deploy --assets <folder> --name himmer-1968 --compatibility-date 2026-11-10

(`wrangler whoami` must show the personal account.) The Mixamo clips are served as part of the scene, which Mixamo's terms allow for a project of your own; they are still not committed here.

## What is where

- `DECISIONS.md`: every ruling, dated. Read it first.
- `DESIGN.md` (approved), `research.md` (the sources, cited), `BRIEF.md`.
- `index.html`, `dem.js`, `labels.js` and the plug-ins: `land.js`, `works.js`, `medevac.js`, `fire.js`, `radio.js`, `nva.js`, `marines-a-d.js`, `marines-c.js`, `markers.js`.
- `clay-v3/`: the figures (built in code) and the motion layer; `clay-v3/FIGURES.md` is the API.
- `sources/`: the elevation model, the 1968 and 1971 map sheets, the 1/9 command chronology, the career research.
- Studies kept for the record: `style-study/`, `scale-study/`, `grass-study/`, `motion-study/`, `realistic-spike/` (a realistic figure pipeline, tried and set aside), `references/`.

## Before it animates: the Mixamo clips

The figures are driven by 33 animation clips from Adobe Mixamo, which Mixamo's terms do not allow us to redistribute as files, so they are **not in this repository** (`realistic-spike/anim/*.fbx` is gitignored). Without them the scene loads but the men do not move. To restore them: sign in to mixamo.com with your own Adobe account and download each clip named in `realistic-spike/anim/ANIM-LIST.md` as **FBX Binary, Without Skin, 30 fps, no keyframe reduction** (and `Rifle Walk` With Skin, as the skeleton reference) into `realistic-spike/anim/`. `realistic-spike/MIXAMO.md` has the steps.

## Sound

The sound layer (`sound.js`) plays six loops in `audio/`, cut and loudness-matched from field recordings on Freesound, which play by the scene's clock and gusts. They are the site's 128 kbps previews; the originals can replace them. Credits, as their licences ask:

- `grass-wind`: "Dry grass rustling in the wind, in the desert of Chile" by felix.blume, CC0, https://freesound.org/s/146436/
- `grass-gusts`: "Wind in dry tall grass bulrush type... Arivaca Road desert in Arizona" by felix.blume, CC0, https://freesound.org/s/666175/
- `day-field`: "BR_017_VN_QuietFields" by kevp888 (Kevin Luce), CC BY 4.0, https://freesound.org/s/578503/
- `cicadas`: "BR_016_VN_cicadas" by kevp888 (Kevin Luce), CC BY 4.0, https://freesound.org/s/440521/
- `dusk-cicadas`: "Angkor Wat Jungle cicada 3" by Automatchski, CC0, https://freesound.org/s/333438/
- `night`: "Night Ambience, Cát Tiên, Vietnam (April 19, 2019)" by marc.om, CC0, https://freesound.org/s/806575/

Held for the fighting, radio and helicopter layers (not yet used): "SEA_13 Vietnam, Cu Chi Tunnels Shooting Range" by aUREa, CC BY 4.0, https://freesound.org/s/398650/ (real AK-47, M16 and M60); "Distent gunshot" by CosmicEmbers, CC BY 3.0, https://freesound.org/s/387477/; "Distant Explosion" by isaac_arva, CC BY 4.0, https://freesound.org/s/612729/; "M224 Mortar Impact Distant 03" by Nanashi, CC BY 4.0, https://freesound.org/s/426167/; "UH-1 Huey Iroquois Helicopter" by OroborosNZ, CC BY 4.0, https://freesound.org/s/157722/; "BR_013" by kevp888, CC BY 4.0, https://freesound.org/s/440558/. The downloaded recordings live in `sources/audio/raw/` (not committed).

## Licences

The repository is public. Everything committed here is original work for this scene, a US-government work (USMC and NARA photographs and documents, the AMS map sheets), or CC0 (the MakeHuman base used by the realistic spike; see `realistic-spike/ASSETS.md`). Third-party model previews in `references/` are look-only and are not committed; `references/REFERENCES.md` keeps their links.
