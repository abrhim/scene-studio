# The blocky style

The family picked this style from a study of seven (current kit figures, blocky, storybook chibi, elegant, soft bean, soft storybook, carved storybook). Blocky won because it reads at a glance across a room, it's charming without being babyish, and it's cheap enough to fill a scene with people on a Raspberry Pi. Tunic and A Short Hike are references, not targets. Don't switch to another style unless the user asks.

## Shapes

- **Big planes, few facets.** Six sides for a robe or a tower, a faceted ball for a head, a box with a bevel for a building. If a shape needs more than about 8 segments round, it's probably too detailed.
- **Silhouette first.** Every character and building should be recognisable as a flat black shape. Change the outline (a hat, a staff, a mantle, a crook, a spear, a tower) before you change surface detail.
- **Chunky over thin.** Thin things (rope, a reed, a sword) get thicker than real so they read; tiny things are left out.
- **No noise.** No textures, no bump, no outlines. Detail is colour on faces of the geometry (vertex colours) and one or two extra blocks.

## Figures (kit/blocky.js)

- About 2.9 heads tall (a child 2.5), hips at 0.3 of the height, shoulders about a head wide, a trunk that narrows a little (the family asked for thinner trunks than the first try).
- **Face:** a faceted ball, two dark dot eyes, no mouth, no nose. Expression comes from the head's tilt and the body. Eyes blink.
- **Hair:** a cap that comes down low round the sides and back, side locks and a mass behind. Too little hair reads as bald (the family called the first Shepherd "a cancer patient"); fill it out. A turban or headcloth sits over a short crop, never over full hair.
- **Beards:** one or two clean blocks on the jaw. A long beard is a tapered block lying forward over the chest, never strands.
- **Clothes:** a six-sided robe flaring to the hem, a mantle round the back and over one shoulder with a sash across the chest, a belt. Short tunics show bare legs. The robe sways with the legs.
- **Hands:** mittens with a thumb. Props hang from a hand pivot and stay upright (a staff, a crook, a reed).
- **Telling people apart:** colour and silhouette. Give every character one distinctive colour and one distinctive shape (a turban, a gold band, a crook, a veil). Keep the palette harmonious: undyed wool and linen, madder red, saffron, indigo, olive.
- **Sacred figures** are plainly who they are, shown reverently, the way the faith's own art shows them (the Savior in white with a red mantle, as in the Church's paintings). They never do anything comic. The user approves how they look.

## Animals

Same language: a chunky faceted body, a block head, short legs on pivots so they walk with a real four-legged gait (diagonal pairs), ears and a tail that flick, a head that dips to graze. 150 to 250 triangles. Fat-tailed sheep, black goats with long ears, a donkey, horses, ibex: what's right for the place and time.

## Buildings and places

- Massive and simple: thick walls, deep doorways and windows (dark recesses do the work), flat roofs or chunky pitched ones, steps as real blocks.
- Stone gets drafted edges and courses as vertex-colour bands, not geometry. Shade baked darker toward the ground and inside openings.
- People are life-size; buildings may be compressed (a third of real size is fine) so the whole place fits the screen. Keep the proportions that make a place recognisable.
- Historical accuracy where it shows: the right plan, materials, roofs, gates and clothing for the place and time. It's fine to pull things closer together.

## Nature

- Trees: a trunk and one to three faceted crowns, jittered a little; fruit as small coloured blocks; palms as a trunk and a fan of flat fronds. Instanced. They sway in the wind.
- Grass as a coloured ground with a few tufts and flowers, rocks as jittered faceted blobs, water as flat-shaded turquoise with a pale edge, ripples and a little sparkle.

## Colour and light

- Warm and bright by day: cream, honey, sage, terracotta, turquoise. Avoid pure black and pure white in surfaces (eyes are the darkest thing).
- Within one character: three value bands (light, mid, dark) and at most one strong accent colour.
- The template's light is part of the style; keep it:
  - ACES tone mapping, exposure about 1.1;
  - sRGB output;
  - a warm key light `#fff1d6` from the south-west at about 1.35;
  - a hemisphere light from `#dfe9ff` to `#c9b07a` at about 0.7, which is the warm bounce from the ground;
  - a low front fill;
  - shade baked into vertex colours (darker toward the hem, under the chin and hair, inside doorways);
  - a soft round shadow under every figure and animal;
  - haze matched to the sky, warm toward the sun.
- The day runs 180 s: full day, a warm sunset, a short blue night with stars and lamps, then dawn. Dusk is gold on stone, night is blue with warm lamplight.

## What to avoid

Smooth shading on figures, mouths and noses, realistic proportions, thin limbs, many-segment curves, texture maps, black outlines, neon colours, anything scary, and detail that's only visible up close at the cost of reading from across the room.
