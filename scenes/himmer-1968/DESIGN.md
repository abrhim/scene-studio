# Capt Lawrence Himmer, 16 April 1968: design document

Draft 1, 2026-11-08. Built from `research.md` (cited as **R §n**) and `DECISIONS.md`. Every fact carries its layer: **text** (a primary record), **official** (the USMC official history), **veteran** (a first-hand account), **map**, **calc** (worked from the elevation model), or **ours** (a choice we made because the record is silent).

This scene shows the relief attack of 16 April 1968 on a grass ridge about a mile southwest of Hill 689, west of Khe Sanh, by Companies A, C and D of 1st Battalion, 9th Marines, at the start of Operation Scotland II. It follows Capt Lawrence "Larry" Himmer, commanding Company C, from the morning on Hill 689 through the attack in which he falls wounded, the dusk when Cpl Hubert Hunnicutt finds him in the open, the night Hunnicutt stays with him, and the morning of 17 April when Hunnicutt moves him to cover and down the ridge until a gorge separates them. It is for Larry's descendants, adults and teens, to watch on a computer. It is these two days because they are the last the record can place him in, and because he was not alone.

**What it shows.** Two hills and the valley between them, from the real elevation data. The 1/9 perimeter and command post on Hill 689. Company A's patrol, its contact with hidden bunkers on the north end of the ridge, and its pinning there. The battalion commander's decisions at the CP and on the hill, and each radio message as a visible thing that travels, arrives late, or never arrives. Charlie Company's climb up the south slope, the order to attack from the south, the attack, and the fire from a second hidden bunker position on its left that drops Larry and his platoon leaders. Delta's attack from the northwest, stopped by snipers. The order to withdraw with the wounded and leave the dead. Dusk, and Hunnicutt crawling to his company commander. Then the night: the ridge dark and quiet except for Hunnicutt, wounded himself, holding the enemy off his captain with a rifle and grenades under a bright moon. Dawn on the 17th: Hunnicutt drags him to cover and starts down toward the perimeter; the gorge; the two men parted. And the battalion on 689 trying to reach them: a voice across the valley, two squads shouting back, a helicopter that lands in the wrong place under fire.

**The mood.** Hot, hazy, late dry season. Grass taller than a man, bomb craters, a far ridge that gives nothing away. The fighting is seen as men moving, falling, and taking cover, as muzzle flashes and tracers, never as wounds. After dusk the scene turns quiet and close: two men in the open, a moon, the rest of the battalion a mile away. The last shown chapter is the morning after, and it ends with Larry alive and out of sight, as the record leaves him.

**How faithful.** The ground is real (elevation model checked against the 1968 map). The order of events, the times, and every word on screen come from the record, with paraphrase marked. Compressed to fit a screen: the companies are shown at about half strength in figures; routes are schematic where the sources give none; the enemy is shown only where the sources put fire.

## How we read it

From `research.md`: the 1/9 Command Chronology for April 1968 (**text**), *The Defining Year, 1968* pp. 312–316 with its footnotes (**official**), Cpl Hunnicutt's Navy Cross citation (**text**), John McGuire's "Rescuing the Walking Dead" (**veteran**, through a magazine), the 1968 map sheet 6342-III Edition 5 (**map**), and the Copernicus elevation model (**calc**). The memorial sheet of August 2026 is a guide to where to look, not a source; R §11 lists where it is wrong.

The family's decisions (DECISIONS.md): the mission in chapters that each hold until Next; tracers and muzzle flashes; men fall, no blood; leaders and radio made visible; words record-only with a marked reconstructed layer possible later; named men where sourced; real elevation; the 1968 maps for the land; Larry's end shown as the record shows it, wounded with Hunnicutt beside him.

## 1. The look

| | |
| --- | --- |
| **Style** | Land, plants and buildings in the studio's low-poly style (docs/STYLE.md), with the plants of the Khe Sanh hills. **Figures: soft clay, second pass** (`style-study/clay-v2.html`; Abram's final ruling 2026-11-08 night, after a realistic spike was tried and set aside: "communicate the story without being distracting in the attempt at realism but falling short"). Rounded forms, head about 1/4.5 to 1/5, matte clay with a warm rim, sculpted faces in four variants, never cute. Driven by Mixamo clips on a Mixamo-compatible skeleton with the natural-motion layer from `motion-study/`, variants by script, a living face (blink, eye and head life), 15–20k triangles with a 6k LOD. The realistic figure (`realistic-spike/`) is kept as the pipeline reference only. |
| **Season and weather** | Mid-April, end of the dry season. No source states the weather that day (R §8). The day was clear enough to see the ridge and to fly medevacs. **Ours:** a hazy clear day, hot, no rain; a thin morning haze in the valley that burns off by the patrol's contact. |
| **Palette** | Elephant grass, dry-season: `#b9a95c` tops, `#8d8a46` body, `#6f7a3a` in the draws. Forest canopy `#3f6a3a`, shade `#2c4a2c`, bamboo `#8fa85a`. Bare laterite in craters and trails `#a8552f`, lighter dust `#c98b5c`. Marine utilities `#4a5a3a`, helmet covers `#6b7a4a` with `#3d4a2e` leaf, flak jackets `#5a6446`. NVA (where seen) `#6e6a4a`. Sky day `#cfd9d8` low haze to `#6f9ec6` zenith; dusk `#e2a35a` to `#4a4f7a`. Tracers `#ffe9a8`, muzzle flash `#fff3c4` core, mortar burst `#bfae9a` smoke. |
| **Light** | Warm key from the sun's real position for the hour (R §8 table), hazy bounce from the grass. The log time zone is not stated (R §8); we light on **UTC+8** (sunset 19:08, civil twilight ends 19:31) and note it as open. Dusk chapter: sun at about 5° to 10° above the western ridges, long shadows down the east slopes. |
| **Motion** | Grass always moving in a light wind. Haze drifting. Men breathe, glance, shift weight; radiomen lift and lower handsets. One big movement per chapter: the patrol crossing the valley, the assault on the north end, Charlie's climb, the attack, Cahill's walk to the LZ, the withdrawal, Hunnicutt's grenade in the night, the move to cover at dawn, the helicopter at noon. The night chapter is mostly stillness: breathing, the grass, the moon's light on helmets. |

## 2. The layout

Real ground, compressed **1/3** (Abram, 2026-11-08, from the scale study): every horizontal and vertical ground distance is the real metres divided by 3, then relief exaggerated 1.3; the figures, grass, craters, bunkers, fire and radio arcs stay at **true human scale**. So the two summits are 471 scene-metres apart (1,412 real), the battle hill's south slope is 137 scene-metres to the 100 m-lower contour, and Charlie's 60 m line has 112 m of ground. One constant in the base, `LAND.scale = 1/3`, so it can move to 1/4 later. y up, **north = −z**, east = +x. Origin at the summit of Hill 689. Heights from `sources/dem-grid.json`, 30 m posts (10 scene-metres), bicubic between posts. The land tile covers 3.0 × 2.6 km real (1,000 × 870 scene-metres) around the two hills; the rest is a low-detail skirt to the haze.

Positions below are **real metres from the 689 summit** (divide by 3 for the scene), from the elevation model and the 1968 sheet (R §7, TERRAIN-INDEX.md). Grid XD, Indian 1960 datum. "**derived**" means the sources give no grid and we placed it from their descriptions. A note on fit: at 1/3 a 40-man line at 1.5 m spacing is about half the width of the ground at its position, so formations keep real spacing; routes keep real shape and take a third of the real time at figure walking speed.

```
                      N
   (−z)  ───────────────────────────────────────
         Lang Ta Tuc ·            · 600 contour on 689's SE flank
                                                               Hill 552 (XD 823 403) →  → Khe Sanh base, 3.8 km E (off tile)
                 HILL 689 ▲ 691 m  (XD 803 409)  origin
                 1/9 perimeter, CP, LZ
                  \
                   \ valley / saddle 466 m (calc), ~950 m out
                    \  (the patrol's and Charlie's crossing)
                     \
            "HILL 600" ▲ 610 m  derived  (≈ XD 792 398)
            north end: A Co pinned        1.42 km from 689 at 217°
            crest + reverse slope: bunker horseshoe
            south slope: C Co's climb and attack
            east side: D Co; the gully
         ───────────────────────────────────────
                      S   (+z)   ← camera home side
```

| Place | x, z (m from 689 summit) | Note, source |
| --- | --- | --- |
| Hill 689 summit, 1/9 CP | 0, 0 | XD 803 409 (R §3, **text**). Ops centre: Donnelly, Hartzell, Engel (**veteran**, R §4). |
| 1/9 perimeter | ring, radius 120–180 m, following the 650 m contour | Fighting holes, sandbags, a radio antenna cluster at the CP. Size **ours**. |
| 689 LZ | 60, 40 | **Ours**: a flat shoulder on the south-east side; the 17 Apr CH-46 landed hard on 689 (R §3), so there was somewhere to land. |
| The valley crossing | about 300 to 700 m out along the 217° line | Low point 466 m at 950 m out (**calc**, R §7). The 1968 sheet shows forest in the draw with a stream line (**map**). |
| Battle hill summit, "Hill 600" | −857, +1137 | 610 m summit, **derived**; agrees with "about a mile southwest," "nearly 2,000 ft," "3 miles west of base" (R §7). The name "Hill 600" is from one account; the official history calls it "a small adjoining hill" and "the ridge." |
| North end of the ridge | about −760, +1000 | Where A Co was pinned (**official**, R §3). |
| Bunker horseshoe, reverse (south-west) slope and crest | arc from −900, +1080 round to −820, +1180 | "Reverse slope horseshoe shaped NVA bunker complex" (**official** fn, R §5). Exact plan **ours**. |
| Second hidden position, on C Co's left | about −940, +1230 | "Another hidden fortified position on their left flank" as C advanced from the south (**official**, R §3). Placed **derived**: left of a company facing north from the south slope is west. |
| Charlie's pause, "50 yards from the top" | about −810, +1180 | **Veteran** (R §3); 1,800 ft line is consistent with the DEM (R §7). |
| Charlie's LZ and Cahill's LZ | −700, +1250 (derived) | "Downslope" (**veteran**); position **silent** (R §7). |
| A Co's LZ | −700, +950 (derived) | "An LZ for the evacuation of casualties" (**text**); position silent. |
| Delta's approach | from the east side, −600, +1050, attacking north-west to south-east along the ridge | **Official** and **text** (R §3). Stopped after about 300 m. |
| The gully, east side | −640, +1150 | Hunnicutt "fell into a gorge" (**official**), "ravine on the east side of the hill" (**veteran**, R §7). Only named in the story panel; not visited. |
| B-52 craters | 40 to 60 across the crest and upper slopes, 8–20 m across | "Huge," "from crater to crater," one "the size of a swimming pool" (**veteran**, R §7). Count **ours**. |
| Hill 552 | +2000, +600 | XD 823 403 (**text**); 552 m in the DEM (**calc**). On the tile's edge as a landmark, with a label. |
| Khe Sanh Combat Base, Col Meyers | off the tile, 3.8 km east | A radio mast at the east edge stands for it, with a label. 26th Marines CP (**official**, R §4). |

## 3. The camera

- **Home view:** from the south-south-east, 320 scene-metres out and 150 up, looking down the 217° line so both hills are in frame, 689 on the right, the battle hill on the left. The valley reads as a bowl between them.
- **Each chapter has a view** (section 9): the camera eases to it when the chapter starts, then drifts slowly. Chapter views sit 40 to 120 scene-metres from the action so figures are readable. The viewer can steer at any time; a tap on a chapter brings the camera back.
- **Radio messages:** the camera does not chase them. They are drawn as arcs above the land and are legible from any chapter view; a tap on a message's label pulls the camera to the sender.
- **Tour (`?tour=1`):** 689 CP, the valley crossing, the north end from A Co's side, the bunker crest from above, Charlie's south slope, the LZ, Hunnicutt's crater at dusk, then home.
- **Limits:** no lower than 2 m above the ground, no further than 900 scene-metres out, no closer than 6 m to a figure. **No face close-ups** (Abram, 2026-11-08): faces are built to read at 6 m and beyond, with blink and small head and eye life, not a full expression rig.

## 4. Light and time of day

The scene is not a 180-second day. Each chapter holds a fixed clock and loops its motion until Next. The light is set by the chapter's clock (sun table, R §8, UTC+8):

| Chapter | Clock | Light |
| --- | --- | --- |
| 1 | 0600 | Sun just up, 4–5°, east-north-east. Long cool shadows west. Valley haze. |
| 2 | 0800 | Sun 20° up in the east. Haze thinning. |
| 3 | 1030 | Sun 55° up. Hard light, short shadows. Dust and smoke on the north end. |
| 4 | 1230 | Sun nearly overhead. White haze. |
| 5 | 1400 | Sun 70° up, swinging west. |
| 6 | 1445 | Sun 65°, west. Smoke drifting east off the crest. |
| 7 | 1730 | Sun 20° up in the west. Gold. Long shadows east. |
| 8 | 1900 | Sun on the western ridges, 2°. Orange to violet. Tracers brighter. First stars at the end of the loop. |
| 9 | 0100, 17 Apr | Night. Moon 18 days old, waning gibbous, about 87% lit, risen late and high by now (R §8, **calc**): cool blue-grey light, hard moon shadows, grass silver on top. Flashes and tracers are the brightest things. Hill 689's perimeter a faint glow of flares, a mile off (**ours**; flares are not in the sources, keep them rare or drop them). |
| 10 | 0600, 17 Apr | First light, before sunrise (06:37). Grey to pale gold from the east-north-east; haze in the valley; dew on the grass. |
| 11 | 0630 → 1200, 17 Apr | Morning into noon. Sun climbing in the east; by noon nearly overhead, white haze. |

## 5. Tapping

Every label is `kind, name, line, source`. Lines are **exact quotations** (R §14, by ID) or **marked paraphrase** (`[paraphrase]`). No invented words. The data keeps a `layer` field so a second, marked `reconstructed` layer can be added later without touching these.

**People (named where sourced, R §2):**

| Key | Name | Line | Source |
| --- | --- | --- | --- |
| himmer | Capt Lawrence Himmer, CO Company C | Q6 "He ordered Himmer to attack from the south." Then Q7. In chapter 8: Q21. | DY pp. 313–315; NC |
| cahill | LtCol John J. H. Cahill, CO 1/9 | Q13; in chapter 7 also Q32 "We will get them later." | DY p. 315; HN |
| banks | Capt Henry D. Banks, CO Company A | Q8; then Q5. | DY p. 313 |
| hayden | 1stLt Michael P. Hayden, 2d Platoon, A | Q4 | DY p. 313 |
| connelly | 1stLt William C. Connelly, acting XO, C | [paraphrase] Took command of Company C when Himmer and the platoon commanders fell; stopped the artillery mission when rounds fell within 50 metres. | DY pp. 314–315 |
| hunnicutt | Cpl Hubert H. Hunnicutt III, squad leader, C | Q19 in chapter 6; Q20 and Q21 in chapter 8. | NC |
| cargile | Capt John W. Cargile, CO Company D | [paraphrase] Attacked across the ridge from north-west to south-east along Company A's right; the assault was stopped by sniper fire after about 300 metres. | DY p. 315; ComdC p. 11 |
| lovely | 2ndLt Francis B. Lovely Jr. | [paraphrase] Took command of Company A when Banks was wounded, about 1730. | DY p. 315 |
| hartzell, donnelly, engel | Capt Charles B. Hartzell (S-3), Maj Joseph A. Donnelly (XO), Capt Donald F. Engel (air) | [paraphrase] The battalion operations centre on Hill 689. | HN; ComdC p. 3 |
| hatcher | Cpl Tommy "Hatch" Hatcher, M60 gunner, 1st Platoon, C | [paraphrase] About 50 yards below the top when the order came to move out; knocked down by a grenade from a spider hole, then wounded by a mortar round. | HN |
| rider | Sgt William Rider, 2d Platoon, C | [paraphrase] Moved round the western flank and saw many NVA running up the hill: a reinforced company at least. | HN |
| panykaninec | PFC Panykaninec, 2d Platoon, C | [paraphrase] Hit at the edge of a big crater and left for dead; rescued by an Army helicopter crew the next evening. | DY p. 315; HN |
| crater6 | Six Marines in a crater (Kasminoff, Castaneda) | P2 | HN |
| brown | PFC David Dee Brown Jr., C | [paraphrase] Joined Company C on 12 April; killed on 16 April. The records read do not say where. | DU (secondary); DY silent |
| meyers | Col Bruce F. Meyers, CO 26th Marines, at the base | Q9; Q10 | DY fn p. 314 |

**Places:** hill689 (Q1), ridge (Q2), bunkers (Q3, Q24), grass (Q12), craters ([paraphrase] HN), czlz ([paraphrase] ComdC p. 11), hill552 ([paraphrase] ComdC p. 3), base (Q9), gully ([paraphrase] DY p. 316), hill600name ([paraphrase] the name is one veteran's; the official history leaves the ridge unnamed).

**Radio messages** (section 9 lists when each appears). Each is a label too, with sender, receiver, time sent and received, and its source. The Army sighting carries the line *[paraphrase] One account says Army air-cavalry scouts reported the 66th Regiment back near Route 9 and Lang Vei that day, and that it never reached the Marines. No time is given, and no Marine record read mentions it.* (R §4, **veteran**).

**Tap moments** (gestures only, a few seconds, blending back): a radioman lifts his handset; an officer points up the ridge; a Marine in a crater looks over the rim; grass parts in the wind; Hunnicutt turns his head toward his commander. No tap moves anyone across the ground, adds anyone, or changes what happens.

## 5b. The story panel

Chapters hold until **Next**. Each has a title, two plain sentences, the clock, and its source. The panel also carries an **epilogue** of text only (no scene): the evening of 17 April (Panykaninec, left for dead, rescued from his crater by the Army crew of Blue Max 48), 18 April (Hunnicutt heard again at 0630, rescued about noon by an Army helicopter crew; his words Q15; Cahill's astonishment that he had cared for Larry since the 16th), 22 April (the dead recovered, all but three), 9 May (Larry buried at Fort Rosecrans), 31 May (Jennifer born), and the lines Q16, Q17 and Q31. It says plainly that the time and place of Larry's death are not in the records read.

| # | Title | Clock held | Two sentences (draft) | Source |
| --- | --- | --- | --- | --- |
| 1 | Hill 689 | 0600 | 1/9 has held this hill for eight days, after the siege of Khe Sanh. Company A gets ready to patrol the ridge to the south-west. | ComdC p. 3, 10; DY p. 313 |
| 2 | The patrol | 0700–1000 | Captain Banks leads two reinforced platoons of Company A down into the valley and up toward the grass ridge. They are approaching where Company A fought a squad three days ago. | DY p. 313 (Q1); ComdC p. 10 (Q23) |
| 3 | Contact | 1000–1200 | Two squads push up into grass higher than a man and hidden bunkers open fire. Lieutenant Hayden's platoon assaults the north end; he is killed, then his platoon sergeant. | DY p. 313 (Q2, Q4) |
| 4 | A squad, he says | 1030–1320 | Banks tells Cahill he faces a squad in heavy fortifications and turns down help; at noon he asks for it. Cahill goes forward with two platoons of Charlie Company and tells the regiment at 1320 that he is committing them; the message takes until 1543 to arrive. | DY p. 313 (Q8, Q5); fn p. 314 (Q9) |
| 5 | The climb | 1200–1435 | Captain Himmer's two platoons cross the valley and climb the south slope to about fifty yards from the top. Cahill orders him to attack from the south, and at 1435 rockets hit Hill 689 behind them. | DY p. 313–314 (Q6); HN (P1); ComdC p. 10 (Q26, Q27) |
| 6 | The attack | 1435–1500 | Charlie Company advances up the ridge on line against the enemy's right. Fire opens from a second hidden position on their left, and within moments Himmer, both platoon commanders, a platoon sergeant and several squad leaders fall wounded. | DY p. 314–315 (Q7); NC (Q19) |
| 7 | Desperate straits | 1500–1805 | Lieutenant Connelly takes the company; Delta attacks along the ridge and is stopped by snipers; Cahill is wounded three times walking to the landing zone. About 1730 he orders the companies to carry out their wounded and leave their dead. | DY p. 315 (Q11, Q12, Q13); HN (Q32) |
| 8 | Dusk | 1900–2115 | Corporal Hunnicutt crawls out of his crater to find help and finds his company commander lying in the open, severely wounded. He stays. At 2115 the companies begin the walk back to Hill 689. | NC (Q20, Q21); ComdC p. 11 (Q28) |
| 9 | The night | 2115–0500, 17 Apr | The battalion is gone back to Hill 689, and the ridge belongs to the enemy, except for one wounded corporal beside his wounded captain. Hunnicutt is hit again helping him, and fires and throws grenades until the enemy's fire stops. | NC (Q21 and the sentence after it: wounded again, "able to fire at the enemy positions and to hurl hand grenades, eventually silencing their fire"); ComdC p. 11 (companies back 0230–0310) |
| 10 | First light | 0530–0630, 17 Apr | At the first rays of dawn Hunnicutt moves his company commander to a covered position, then starts down the ridge toward the battalion's lines, bringing him. Weak from loss of blood, he falls into a gully, and the two men are parted. | NC (Q22 and the sentence after it: "fell into a gully where he lay for several hours"); DY p. 316 ("moving him down the ridge toward the battalion perimeter until they became separated when Hunnicutt fell into a gorge") |
| 11 | The valley | 0630–1200, 17 Apr | At 0630 a voice is heard across the valley from the ridge; two squads go out and shout back, and after two shots it stops. At noon two helicopters bring a squad to the hill; the first lands in the wrong place beside enemy spider holes, is hit about twenty times, and flies the thousand metres back to Hill 689 and lands hard. | DY p. 315; ComdC pp. 11–12 |

The last line of the scene, in the panel after chapter 11: *Hunnicutt told Cahill that Captain Himmer had still been alive as late as the afternoon of the 17th. Himmer was never seen alive again.* (Q16, Q17.) Then the epilogue.

## 6. Characters

All figures share one rig in the picked style. Companies are shown at about half strength in figures (A: 2 reinforced platoons shown as 45; C: 2 platoons as 40; D: about 50; CP: 8; **ours**). Faces simple, no caricature.

| Who | Look (sourced where it can be) | Routine | Label |
| --- | --- | --- | --- |
| Marine rifleman | Green utilities, cloth camouflage helmet cover, flak jacket, M16 (R §6: HN, DY fn p. 50). Boots, packs and canteens: silent; filled from period photographs and said so. | Walks, kneels, crawls, fires, falls, carries. | by company |
| M60 gunner (Hatcher) | As above with the M60 and a belt (R §6, HN). | 1st Platoon C. | hatcher |
| Radioman | A backpack radio and whip antenna. **Set not named in any source** (R §4); the label says "radio," never a model. | With each company commander, with Cahill, at the CP. Lifts the handset when a message is sent. | by owner |
| Corpsman | As a rifleman, with an aid bag; three corpsmen were killed (R §2). | Moves to the fallen. | unnamed |
| Officers: Himmer, Cahill, Banks, Connelly, Cargile, Lovely, Hayden | As riflemen; distinguished by a radioman at their side, a map case, and by pointing. No rank insignia detail (silent). | Per the cycle. | named |
| Hunnicutt | Rifleman, squad leader. | Chapter 6 with his squad in a crater; chapter 8 crawling, then kneeling by Himmer. | hunnicutt |
| CP staff | Hartzell, Donnelly, Engel: at a map table under a poncho, radios around. | At the CP all day. | hartzell etc. |
| NVA soldier | Utilities "almost the identical color to ours," Russian-style steel helmet, often with a net (DY fn p. 50, **official**, about January; 16 April silent). AK-47 (R §5). | **Mostly unseen** (R §10 item 6): a few figures at bunker mouths and spider holes, seen briefly; fire comes from positions, not from rows of men. | nva (place) |
| Medevac helicopters | Arrive about 1805 (R §3). Type **silent**. Shown as a generic Marine helicopter at the LZ, labelled "medevac, type not recorded." | Chapter 7's end. | medevac |

## 7. Buildings, land, water

- **Land:** the DEM mesh with vertex colours by slope and class from the 1968 sheet: grass stipple on crests and upper slopes, forest in the draws and low ground (**map**). Grass is **treatment C of `grass-study/`** (Abram, 2026-11-08): 3D arching blade clumps within 25 m of the camera, painted crossed cards beyond, trampled lanes and bare crater bowls; 1.4–2.2 m tall ("four-to-six-foot," R §7; about 7 ft, TERRAIN-INDEX), straw tops over green bases. First improvements owed by the land builder: stiff culms with leaves at every height, a dark interior to the stand, soft plume heads, lanes with standing walls and grass flattened along the line of travel (`grass-study/REFERENCES.md`). Forest as the studio's low-poly trees recoloured to broadleaf canopy, with bamboo clumps mixed in, and a "tree line" below the bunker crest on the west (HN, placement **ours**).
- **Craters:** displaced bowls in the mesh with bare laterite, rims of thrown earth, some with standing water left from the wet season (**ours**; "swimming pool" is a size, not a statement of water).
- **Water:** thin intermittent streams in the valley draw and the gully, as a glint (**map**). No pond, no river.
- **Hill 689 perimeter:** fighting holes, sandbag parapets, a few bunkers roofed with timber and sandbags, a map table under a poncho at the CP, antennas, a cleared LZ. Scale **ours**.
- **Bunkers and spider holes on the ridge:** low timber-and-earth bunkers under the grass in a horseshoe on the reverse slope and crest, with firing slits; spider holes as lidded pits (**official**, **veteran**). Hidden from the home view until chapter 3 reveals them with fire.
- **Fire and smoke:** tracers as short bright streaks along a line from a firing position to its target area, pale yellow for all sides (**ours**; tracer colours are stated in no source, R §5). Muzzle flashes at bunker slits and at Marine positions. Mortar bursts as dust and smoke. The 15 rockets on Hill 689 at 1435 (**text**) as impacts on the perimeter. The artillery mission that fell within 50 m of Charlie (**official**) as a short, close salvo, then silence.
- **Radio messages:** a glowing arc that leaves a radioman's antenna, climbs, and lands at the receiver, with a small clock. A relayed message hops: 689 to a relay mast at the tile's east edge to the base, with the clock running from 1320 to 1543. The Army sighting leaves an Army mast on a far hill and fades out before it lands.

## 8. Files and builders

Computer budget, not the Pi (DECISIONS.md). The target machine is Abram's Apple M4 Pro (20 GPU cores, 48 GB, 3456 × 2234 display). Aim under 600 draws and about 6 M triangles with all plug-ins loaded, at 60 fps at native resolution. Figures up to 20k triangles each (heroes 25k), with a 6k level of detail beyond 80 m; the real limit is skinning cost and fill rate at Retina resolution, not the triangle count, so figures are baked into few skinned meshes and the grass is instanced.

| File | What it builds | Budget | Builder |
| --- | --- | --- | --- |
| index.html | base: land mesh from the DEM, sky, haze, light per chapter clock, camera, chapter engine (hold and Next), shared measurements, spots | 20 draws / 400k | main session |
| labels.js | every label, the message data, `window.STORY` with the epilogue | | main session |
| land.js | grass, forest and bamboo, craters, streams, dust | 60 / 1.2M (instanced) | land-builder |
| works.js | 689 perimeter and CP, bunkers, spider holes, LZs, antennas, relay and base masts | 40 / 300k | set-builder |
| marines.js | Companies A, C, D and the CP staff: figures, choreography per chapter, tap gestures | 150 / 3M (baked, instanced, with LOD) | choreographer (two agents: A and D in one file is too much, so `marines-a-d.js` and `marines-c.js`) |
| nva.js | the few seen NVA, the fire positions' timing | 20 / 150k | choreographer |
| fire.js | tracers, flashes, mortar and rocket bursts, smoke, the artillery salvo | 20 / 150k | effects builder (a land-builder brief) |
| radio.js | message arcs, clocks, relays, the fading Army message | 10 / 20k | effects builder |
| medevac.js | the helicopters at 1805 | 6 / 60k | set-builder |

## 9. The cycle: chapters that hold

Each chapter is a loop of 60 to 120 seconds that returns to its own start without a jump. "Clock" is the hour the scene shows. Times are the sources' (R §3); where they conflict, the choice is marked.

| # | Clock held | Loop | Where the camera goes | What moves | Radio |
| --- | --- | --- | --- | --- | --- |
| 1 | 0600 | 60 s | 689 CP, then a slow drift round the perimeter | Marines in holes, a few walking, the CP staff at the table. A Co forming on the south-west side: Banks, his radioman, two platoons. | SitRep #1 out to 26th Marines, 0600 (ComdC p. 36), an arc east. |
| 2 | 0700 → 1000 | 90 s, time-lapse | Follows A Co from above and behind | A Co files down into the valley and up toward the ridge, crossing the draw in the forest. | none |
| 3 | 1000 → 1200 | 120 s | North end of the ridge, from A Co's side, low | Two squads into the tall grass; flashes from hidden bunkers; two men fall. Hayden's platoon assaults; Hayden falls, then his sergeant. The platoon halts at the fringe. Mortar bursts. The company pulls back a little; dead and wounded lie near the bunkers. | Banks to Cahill: *a squad in heavily fortified positions* (Q8 paraphrase in the label); Cahill's offer; Banks declines. Times silent: arcs shown without clocks. SpotReps east (0959, 1020, 1145 DTGs). |
| 4 | 1200 → 1320 | 90 s | 689 CP, then the south-west slope of 689 | At noon Banks's arc arrives asking for help. Cahill at the table, then up with his radioman; Himmer's two platoons form; Cahill joins them; they move off down the slope (DY "at noon"; ComdC 1435 for the deployment, marked). | Banks to Cahill, noon (Q5). Cahill to Meyers, **sent 1320**, the arc hopping relay to relay, clock running; it lands in chapter 6 at 1543 (Q9). |
| 5 | 1230 → 1435 | 120 s, time-lapse | Alongside C Co, low in the grass, then from the pause point looking up | C Co crosses the valley and climbs the south slope. Hot work: men pause, drink. They stop about 50 yards below the top. Cahill points; the order to attack from the south (Q6). At 1435, 15 rockets strike 689 behind them (Q27). The Army sighting arc, somewhere in this chapter, fading (no time: it appears once per loop, labelled). | P1 at 1430 (HN); Q26 at 1435. |
| 6 | 1435 → 1500 | 90 s | South slope, from behind C Co looking up and left | C on line, one platoon up and one in trace (ComdC); they advance against the enemy's right. Flashes open from the second hidden position on their left; within moments Himmer, both platoon leaders, a platoon sergeant and squad leaders fall (Q7). Connelly moves up. Hunnicutt treats his platoon commander and sends his squad into a crater (Q19). A short artillery salvo lands within 50 m; it stops. D Co appears on the east side. | Connelly to the guns: cease fire [paraphrase]. Cahill's 1320 message lands at the base at 1543, out of frame; Meyers' query within two minutes; Cahill declines help (DY fn p. 314). |
| 7 | 1500 → 1805 | 120 s, time-lapse | Pulls back to see the whole ridge, then follows Cahill to the LZ, then the LZ | Both companies pinned in the grass. D attacks north-west to south-east along the ridge; four men fall to single shots; the attack stops after about 300 m. Cahill walks toward the LZ and is hit three times, keeps moving. Banks falls; Lovely takes A. About 1730 the order: carry out the wounded, leave the dead (Q13). Hunnicutt tries to leave his crater and is hit (about 5 PM, HN). Medevacs land at 1805; wounded carried in. | Withdraw order to the companies and to Hartzell and Donnelly (Q32 at the LZ, 1745 HN). |
| 8 | 1900 → 2115 | 90 s | Low, at dusk, near Hunnicutt's crater; ends wide on the ridge with 689 lit by the last sun | Dusk. Hunnicutt leaves the crater and crawls across the slope (Q20). He finds his company commander in the open (Q21), kneels, and stays. Files of Marines with stretchers move down toward 689. At the end of the loop the first stars, and the clock reads 2115: the companies begin withdrawing (Q28). The loop returns to dusk. | none |
| 9 | 0100, 17 Apr | 120 s | Close and low: the two men in the grass under the moon, 689 a faint shape a mile off; one slow orbit | Night. Larry lies still in the open, breathing; Hunnicutt beside him, wounded himself, low. A flash from a bunker slit; he fires back; he throws a grenade, a burst of light and dust, then quiet (NC: wounded again helping the officer, then fired and threw grenades "eventually silencing their fire"). Far off, the last Marines reach the 689 perimeter (ComdC: back 0230–0310). Long still passages between: the grass moving, the moon, the breathing. Place: where Larry fell on the south slope, **derived**. | none |
| 10 | 0530 → 0630, 17 Apr | 90 s, slow | Behind Hunnicutt, then from the gully's edge | First light (Q22). Hunnicutt gets his arms under his captain and moves him into cover (a crater or a fold of ground, **ours**), then begins moving him down the ridge toward the perimeter, a few metres at a time (DY p. 316). On the east side the ground drops to a gully (R §7, **veteran**: the ravine on the east side); Hunnicutt goes into it and does not come out (NC: "fell into a gully where he lay for several hours"). The last shot of the loop is Larry, in cover, alone, alive. The loop restarts at first light. | none |
| 11 | 0630 → 1200, 17 Apr | 120 s, time-lapse | 689's south edge looking across the valley, then the LZ on the battle hill, then 689's LZ | 0630: a voice across the valley (DY p. 315; Hunnicutt, R §2); two squads go out from 689 to the edge and shout back; two shots, then silence. Later an observation plane circles the ridge (ComdC 0900; HN midday). Noon: two CH-46s; the first lowers its ramp on the battle hill, flashes from spider holes within 10 m, it lifts, flies the 1,000 m back and lands hard on 689 (ComdC pp. 11–12; DY p. 315). The scene ends on Hill 689, the helicopter down, the ridge quiet. | Air observer to 1/9: one live Marine seen (ComdC 0900); shown as an arc from the plane to the CP. |

**Not shown, by decision or by the record:** Larry's death (no record shows it); the evening rescue of Panykaninec and the 18 April rescue of Hunnicutt (epilogue text; they would pull the scene away from Larry); the recovery of 22 April; any wound; the dead on the ridge in any detail (R §10 item 2 is never depicted or quoted); Delta overrunning the ridge (R §0 item 5); NVA in numbers; the CH-46's ramp incident in detail (R §10 item 5: a flash and a lift-off only).

## 10. Decisions from the family

All 2026-11-08, Abram:
1. The whole mission in chapters that each hold until Next; no length limit.
2. Audience adults and teens; watched on a computer.
3. Muzzle flashes and tracers; men fall; no blood. Sound later, visual first.
4. Leaders' decisions and radio messages made visible.
5. Words on screen record-only; a marked reconstructed layer may be added later.
6. Named men where a source names and places them.
7. Real elevation data, slightly exaggerated.
8. Studio land and tree style, with the real plants; the 1968 maps are the authority.
9. Figures cartoonish and higher quality than the blocky kit: **soft clay toy**, direction A of the style study, improved before approval.
10. Larry's end shown as the record shows it: wounded, with Hunnicutt beside him at dusk. **Revised later the same day:** the story goes on through the night and the morning of the 17th, to the moment the gorge parts them (chapters 9–11). Larry is never shown dying.
11. The land at **1/3** scale in both axes, figures at true scale.
12. Figures realistic (Blender + MPFB2 pipeline, spike first); clay v2 the fallback. Abram supplies Mixamo animation clips from his own Adobe login.
13. **Design approved by Abram, 2026-11-08 evening**, as it stands (11 chapters, 1/3 land scale, realistic figures), with section 11's open items to be settled during the build.

## 11. Still open

1. ~~The figure style~~: decided, soft clay (section 1). The land scale is decided, 1/3 (section 2).
2. **Light clock**: UTC+8 or UTC+7 for the logs (R §8). We light on UTC+8 unless a source says otherwise.
3. **Tracers**: pale yellow for all sides (our neutral choice), or the common convention of red for US and green for NVA, labelled as convention?
4. **Company C's commander**: the April roster names Capt Flagler for the month and the Pegasus report gives him C Company through 15 April; the official history and the citation name Himmer on the 16th. The career research (`sources/larry-service-history.md`) finds no record of Larry in any 1/9 chronology from January to May, and nothing placing him in Vietnam before 1968. The likely reading is that he took Charlie Company on or about 15–16 April, perhaps his first day in command. The story panel should say this as what the record shows, with the gap named, until a document dates it.
5. **Chapter 4's start time**: DY says Charlie moved "at noon"; ComdC says the deployment was "approximately 1435"; HN has the order to the 1st Platoon at 1430. The draft follows DY for the move and HN/ComdC for the attack. Say if you want the chronology's time instead.
6. **VVMF Wall of Faces** (photos, remembrances, family details): blocked to the agent. Paste the page text if you want its lines on labels.
7. **PFC Brown's place**: the only source puts him "on the southern side of Hill 689" and is unreliable. The draft labels him without a place.

## 12. What's from the source, from history, and ours

**From the records (text and official):** every time in the table; the two hills' grids; the patrol's strength and route in outline; the contact in tall grass; Hayden's death; Banks's report of a squad and his refusal; the noon request; Cahill going forward with two platoons of C; the 1320 message received at 1543 by relays; the order to attack from the south; the attack against the right flank and the fire from the left; who fell with wounds; Connelly taking command; the artillery within 50 m; Delta's attack and the snipers; Cahill's three wounds; the withdrawal order and "leaving their dead"; the rockets on 689; medevacs at 1805; the withdrawal at 2115; Hunnicutt's night, in his citation; the casualty totals.

**From veterans and historians (veteran, map, calc):** "Hill 600" and "about a mile southwest"; the 50-yards pause; "We will get them later"; the crater life of Charlie's squads; the Army sighting; the land cover classes; the heights and the saddle; the sun's position; NVA dress from January.

**Ours:** the tile size and 1.3 vertical exaggeration; the battle hill's exact grid; the bunker horseshoe's plan; the second position's place; the LZs; routes between known points; the figure counts; the clear hazy weather; the morning valley haze; tracer colour; the look of the radios, packs and boots; the helicopter type; crater count; the tree line's place; every camera view.

## Sources

See `research.md` §15. Key: 1/9 Command Chronology April 1968 (Texas Tech 1201056016); *The Defining Year, 1968* pp. 312–316; Hunnicutt Navy Cross citation; McGuire, "Rescuing the Walking Dead" (HistoryNet, 2020); sheet 6342-III Edition 5-AMS 1968 (`sources/maps-1968/`); Copernicus GLO-30 (`sources/dem-meta.json`).
