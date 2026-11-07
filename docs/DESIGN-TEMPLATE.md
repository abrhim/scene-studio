# <Scene name>: design document

One paragraph: what the scene shows (the source and the exact moment), who it's for, and why it's this moment.

**What it shows.** The main scene, and anything happening beside it.

**The mood.** Two or three sentences. One gentle big moment every minute or so.

**How faithful.** What's exact (the plan of a building, the order of events, the clothing) and what's pulled in to fit a screen.

## How we read it

Built from `research.md`: the source itself, read at first hand and cited (the book over any film; the scripture text, not retellings).

For scripture: the faith's own reading, with its sources (lessons, manuals, leaders' words). For history: the main sources and the historians' consensus. For fantasy: the book, chapter and the author's own descriptions. Decisions about anything sacred or sensitive, as the family made them.

## 1. The look

| | |
| --- | --- |
| **Style** | Blocky low-poly (docs/STYLE.md). |
| **Season and weather** | |
| **Palette** | Named colours with hex values. |
| **Light** | Where the sun is, what dusk and night look like. |
| **Motion** | What's always gently moving; the big moments. |

## 2. The layout

Which way the land runs, where the camera sits (usually south, looking north), units in metres, y up. A sketch in a code block. A table of every place with its position and a note. The base `index.html` turns this into `spots` and shared measurements, and is the source of truth after that.

## 3. The camera

The automatic view (what it circles, how far), what it drifts toward during the big moments, the tour's views (`?tour=1`), and the steering limits.

## 4. Light and time of day

What happens across the 180-second cycle: morning, day, dusk, night, dawn.

## 5. Tapping

Every tappable person and place goes in `labels.js` (kind, name, a short line with its source). List them here. Then list the tap moments: which taps set off a small gesture, and what it is (a few seconds, blending back; never control or spawning).

## 5b. The story panel

The loop's chapters for the panel at the top left (`window.STORY` in labels.js): a title, two plain sentences a child can follow, and the source, each with its window in cycle seconds. Chapters may overlap. Times are checked against the built scene during integration.

## 6. Characters

A table: who, how they look (clothes, colours, the one distinctive shape), their routine through the cycle, their label. Animals too. Each one is approved on the character sheet before it goes in.

## 7. Buildings, land, water

What each is built from and what makes it recognisable.

## 8. Files and builders

| File | What it builds | Draws / triangles | Builder |
| --- | --- | --- | --- |
| index.html | the base | 12 / 25k | main session |
| ... | | | |

The whole scene: about 110 draws and 110k triangles.

## 9. The cycle (180 s)

A table by time: what happens where. Every script fills the cycle exactly and matches at the seam.

## 10. Decisions from the family

Numbered, with dates.

## 11. Still open

Questions for the family.

## 12. What's from the source, from history, and ours

Three short lists.

## Sources

Links.
