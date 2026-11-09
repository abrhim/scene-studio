# Terrain sources: Hill 689, Khe Sanh, 16 April 1968

Collected 2026-11-08. Nothing committed. Scratch (raw 47 MB DEM tile, venv): /private/tmp/claude-501/himmer-terrain-scratch/

## Files in this folder
| Path | What | Origin | Size |
|---|---|---|---|
| himmer-memorial-sheet.html | Memorial sheet (already recovered) | claude.ai cache 2d0db18bdee5436c_0 | 61 KB |
| dem-grid.json | Heights, int16 metres, row-major, north row first, 720x611 | derived from Copernicus GLO-30 | 1.8 MB |
| dem-16bit.png | 16-bit heightmap, h = min + v/65535*(max-min) | same | 674 KB |
| dem-meta.json | Bounds, resolution, min/max, pixel positions, summits, corrections | same | 5 KB |
| map-6342-III-huong-hoa-AMS-L7014.pdf | 1:50,000 sheet 6342 III Huong Hoa, Edition 6 USARPAC, GeoPDF (datum ING-A = Indian 1960, TM CM 105E), contour interval 20 m | https://maps.lib.utexas.edu/maps/topo/vietnam/huong_hoa-6342-3.pdf (public, last-modified 2013-02-18, NGA scan 2007) | 10.5 MB |
| map-6342-III-preview-40dpi.png | Whole-sheet preview | rendered from the PDF | 2.2 MB |
| map-6342-III-crop-hill689-khe-sanh-150dpi.png | Crop: Hill 689 (spot height, Dong Dang), Route 9, airstrip, Lang Vei | rendered from the PDF | 3.3 MB |
| chat-cache-extracts/wf-975d78e0-status.json, wf-b7d2c286-status.json | Decompressed (zstd) workflow status responses | Claude cache 14103a22d1a4bba1_0, ec1a25bbc977ab74_0 | 190 KB each |
| chat-cache-extracts/artifact-versions.json + himmer-memorial-sheet.cache-v0/v1/v2.html | Artifact versions list and its 3 HTML versions (2026-08-08 04:38, 05:01, 15:19 UTC) | cache 7a43b2ef0a51e4c5_0 | 170 KB + 3 files |

DEM source: Copernicus GLO-30, https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N16_00_E106_00_DEM/Copernicus_DSM_COG_10_N16_00_E106_00_DEM.tif (public, no login). Crop 16.5503-16.7197 N, 106.6000-106.7997 E, 30 m (1 arc-second; about 29.6 m E-W, 30.7 m N-S per pixel). Heights 28.0 to 1003.4 m (EGM2008). No nodata.

## DEM sanity check (real numbers)
- Stated lat/lon for Hill 689 (16-38-35N 106-41-20E, from the memorial sheet): DEM 546 m. Wrong spot: the coordinate sits on a flank.
- Real summit: 691 m at 16.64694 N, 106.68694 E, 477 m NNW of that point (px 313,262).
- Grid XD 803 409 converted from the map's own datum (Indian 1960 to WGS84, shift 198,881,317) = 16.64663 N, 106.68659 E, which lands within about 40 m of that summit (DEM 685 m there). The grid is right; the lat/lon in the register is about 480 m off. I read the map's 689 triangle at about XD 804 409.
- "Hill 600": DEM summit 610 m at 16.6368 N, 106.6789 E, 1.41 km SW (bearing 217 deg) of the 689 summit. The derived XD 792 398 falls on a 539 m slope about 290 m west of it. Use the 610 m summit (px 284,298).
- Khe Sanh base: XD 841 421 gives 16.6572 N, 106.7223 E, DEM 507 m (px 440,225). Today's ground, not 1968.
- Other summits: 595 m (px 265,274), 532 m (333,316), 559 m (382,241), 758 m (247,216).
- Modern DEM: current ground (reforestation, roads, base site, post-war change), not 1968.

## What the cache said the chat produced
- The two workflows (2026-08-08, 02:53 and 03:11 UTC) were genealogy and history research, not terrain: 3 agents each (researcher, circumstances or roster researcher, enricher), 365 and 343 sources. They fetched VVMF Wall of Faces, virtualwall.org, Find a Grave, honorstates, rjsmith.com Hill 689 page and topo_map.html, the USMC Defining Year 1968 PDFs (marines.mil, hqco9thmarines.com, khesanhvets.org), HistoryNet, Wikipedia Operation Scotland II, Texas Tech 1/9 command chronology. No DEM tile, no raster, no coordinates data.
- The only map source named is the UT Perry-Castaneda page (no download in the cache). A search also returned an eBay listing for sheet 6342 III.
- Only output file: /outputs/himmer-memorial-sheet.html (three versions). No other /mnt/user-data/outputs names appear in the cache or Session Storage (000718.ldb only holds the conversation id).
- The maps in the sheet were drawn schematically ("drawn, not surveyed"; the sheet says the real 6342-III contours would true them). So no raw terrain data ever existed in the chat.
- Date: cache timestamps say 2026-08-08, not 08-10.
- The other cache files (0e3194d9..., d415b3fd...) are empty artifact storage/tools responses; ec428144... and 66c58f1c... are tracking gifs.

## Local disk search
No terrain data anywhere (Downloads, Documents, Desktop, ~/code excluding soar, iCloud Drive). Only name hits for "Himmer" (unrelated) and fuzzy mdfind noise. Nothing copied.

## Ground cover, April 1968 (pointers only)
- HistoryNet, Rescuing the Walking Dead: https://www.historynet.com/rescuing-the-walking-dead-army-aerial-rocketeer-crews-saved-marines-from-certain-death/ . Grass on the crest, steep slope (1,800 of nearly 2,000 ft), B-52 craters used as cover (one pool-sized), movement crater to crater, hot work in flak gear, fight ran into twilight. No fog or height detail.
- Elephant grass about 7 ft, razor sharp (Navy officer, via secondary summary); plateau of tall grass broken by forest. Sources: USMC "The Battle for Khe Sanh" https://www.usmcu.edu/Portals/218/The%20Battle%20for%20KHE%20SANH%20PCN%2019000411000.pdf and "Khe Sanh: Ringed by Fire" https://www.usmcu.edu/Portals/218/KheSahn_RingedByFire_Web.pdf
- Weather: fog and low cloud in the mornings, burn-off late morning, worst Jan-Mar (same USMC and USAF accounts; Air Force: https://www.altus.af.mil/News/Article/620007/part-one-the-road-to-khe-sanh ). I found no mid-April readings; verify in the 1/9 April 1968 command chronology (Texas Tech item 1201056016).
- Defining Year 1968 (Shulimson), pp. 312-316: http://www.hqco9thmarines.com/History/US_Marines_In_Vietnam_The_Defining_Year_1968.pdf
- Jungle and bamboo on the ridges: not confirmed by any source found. The 6342-III sheet shows vegetation classes (forest vs grass/cleared) in the crop: use it.
- B-52 craters: Arc Light, 2,548 to 2,700 sorties during the siege (sources disagree); crater positions unknown.
- Aerial photos: none confirmed public domain for the hills. Leads: National Archives RG 127 Marine Corps photos (search catalog.archives.gov "Khe Sanh"); HMM-364 album https://hmm-364.org/1968/album-68/album1968-index.html (check rights).

## Could not get
- 1968 aerial photography of Hills 689/600; Hill 600's true position (only a derived grid); mid-April 1968 weather data; any terrain raster from the chat; a pre-war elevation model (the sheet's contours are the only 1960s elevation source, and are not digitised here).
