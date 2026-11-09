# Assets and licences: realistic Marine spike

The repo is public. Only CC0 or CC-BY material goes into the built files. Everything below that ends up in
`marine.glb`, `marine-lod.glb` or `marine-tpose.fbx` is CC0 or original work made for this scene.

## In the built figure

| Asset | Source | Licence | Used for |
| --- | --- | --- | --- |
| MPFB 2.0.18 (Blender extension, id `mpfb`) | extensions.blender.org/add-ons/mpfb, installed with `blender --command extension install mpfb` | Code: GPL-3.0-or-later. **Not shipped**: it only runs at build time. | Builds the human, fits clothes, rigs |
| MakeHuman base mesh and targets (inside MPFB, `data/3dobjs/base.obj`, `data/targets/`) | MPFB package | CC0 (released by Data Collection AB / MakeHuman team, Sept 2020) | Body shape |
| `game_engine` rig and weights (MPFB `data/rigs/standard/rig.game_engine.json`, `weights.game_engine.json`) | MPFB package | CC0 (stated in the file) | Skeleton (53 bones) and skin weights |
| MakeHuman system assets pack, `makehuman_system_assets_cc0.zip` (280 MB) | https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip, listed at https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html | CC0 (each file header says "explicitly released as CC0 in September 2020") | See next rows |
| Skin `skins/young_caucasian_male` (diffuse 2048 px) | system assets pack | CC0 | Skin colour (tanned, stubble and grime added procedurally) |
| Eyes `eyes/high-poly`, material `eyes/materials/brown` | system assets pack | CC0 | Eyes |
| `eyebrows/eyebrow001`, `eyelashes/eyelashes01` | system assets pack | CC0 | Brows, lashes (the cropped hair is painted on the scalp by the script) |
| `clothes/male_casualsuit02` (mesh, normal and AO maps) | system assets pack | CC0 | Base of the OG-107 utilities (recoloured; its folds kept) |
| Jungle boots | Modelled by the script on the CC0 body's own foot and shin | CC0 input + original work | Boots |
| Kit: M1955 flak jacket, collar, shoulder ridges, M1 helmet and Mitchell cover, elastic band, insect-repellent bottle, pistol belt, 2 M1956 pouches, 2 canteens, buckle, M16A1, sleeve cuffs | Modelled by `build_marine.py` (procedural geometry; procedural shader textures baked to the atlas) | Original work for this repo | Kit |
| Baked atlases (2 sets x base, ORM, normal, 2048 px; LOD copies at 1024 px) | Baked by `build_marine.py` from the rows above | CC0 inputs + original work | All textures |

No web textures were used.

## Page code

| Asset | Source | Licence |
| --- | --- | --- |
| three.js r128 | cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | MIT |
| GLTFLoader, FBXLoader, fflate (r128 examples) | cdn.jsdelivr.net/npm/three@0.128.0/examples/js/... (cdnjs's r128 has no `examples/`) | MIT |

## Not CC0 / CC-BY: keep out of the public repo

| Asset | Licence | Status |
| --- | --- | --- |
| `anim/*.fbx` (33 Mixamo clips on the X Bot skeleton, downloaded by the coordinator on Abram's Adobe account; see `anim/ANIM-LIST.md`) | Adobe Mixamo terms: use in projects is allowed, redistribution as stand-alone animation files is not. **Not CC0 or CC-BY.** | `realistic-spike/.gitignore` ignores `anim/*.fbx`. The page retargets them at load time, so nothing derived from them is written to disk. Decide before the first commit whether the built scene may depend on files that cannot be in the repo. |

## Reference photographs (looked at, never shipped)

Downloaded to `.scratch/` (gitignored) to model the vest, helmet, boots and rifle against. None of them is in any
built file.

| Photo | Source | Licence | Use |
| --- | --- | --- | --- |
| 1967, 27 February,Company C, 9th Marines, Operation Chinhook.jpg | https://commons.wikimedia.org/wiki/File:1967,_27_February,Company_C,_9th_Marines,_Operation_Chinhook.jpg | Public domain | reference only, not shipped (`.scratch/ref/ref0.jpg`) |
| Company K, 3.4 Marines at a memorial service at Khe Sanh Combat Base.jpg | https://commons.wikimedia.org/wiki/File:Company_K,_3.4_Marines_at_a_memorial_service_at_Khe_Sanh_Combat_Base.jpg | CC BY 2.0 | reference only, not shipped (`.scratch/ref/ref1.jpg`) |
| M16A1 rifle DN-SD-03-16679.jpg | https://commons.wikimedia.org/wiki/File:M16A1_rifle_DN-SD-03-16679.jpg | Public domain | reference only, not shipped (`.scratch/ref/ref2.jpg`) |
| Marines Walk Through Downpour, 30 October 1968 (29050900290).jpg | https://commons.wikimedia.org/wiki/File:Marines_Walk_Through_Downpour,_30_October_1968_(29050900290).jpg | CC BY 2.0 | reference only, not shipped (`.scratch/ref/ref3.jpg`) |
| NMHM IMG 2005 - Jungle boot pierced by spike, Vietnam War (9699429329).jpg | https://commons.wikimedia.org/wiki/File:NMHM_IMG_2005_-_Jungle_boot_pierced_by_spike,_Vietnam_War_(9699429329).jpg | CC BY-SA 2.0 | reference only, not shipped (`.scratch/ref/ref4.jpg`) |
| Stephen Dame Shows Damaged Flak Jacket, 27 January 1968 (29338080695).jpg | https://commons.wikimedia.org/wiki/File:Stephen_Dame_Shows_Damaged_Flak_Jacket,_27_January_1968_(29338080695).jpg | CC BY 2.0 | reference only, not shipped (`.scratch/ref/ref5.jpg`) |
| US Helmet Model M1 with Mitchell Pattern jungle helmet cover, Vietnam War - Fort Devens Museum - DSC07203.JPG | https://commons.wikimedia.org/wiki/File:US_Helmet_Model_M1_with_Mitchell_Pattern_jungle_helmet_cover,_Vietnam_War_-_Fort_Devens_Museum_-_DSC07203.JPG | CC0 | reference only, not shipped (`.scratch/ref/ref6.jpg`) |
| M1955 vest worn, with helmet, towel and rifle at port arms | supplied by Abram (`.scratch/refs-from-abram/m1955-worn-m14-helmet-towel.webp`) | unknown | reference only |
| M1955 vest on a mannequin, ERDL trousers, jungle boots, covered helmet | supplied by Abram (`.scratch/refs-from-abram/m1955-mannequin-erdl-jungle-boots-helmet.webp`) | unknown | reference only |
