---
name: character-review
description: How to build a diorama's characters and animals on the character sheet and present each one to the user for approval, iterating until they're happy. Use in phase 3 of a new scene, or whenever the user wants to see or change a character.
---

# Character review

Every character and animal is shown to the family, and approved, before it goes into a scene. They care about this. Their notes have been specific ("his feet look stretched", "the hat's polygons don't flow", "make the hair fill out so he doesn't look bald"), and acting on each note is how the style got good.

## Building

1. List the cast from DESIGN.md section 6, grouped so similar characters share work (four priests are one character with variations).
2. For each, start a `character-artist` agent (several at once) with:
   - the scene folder and the character key;
   - who they are and what they do in the scene (so their props and poses are right);
   - their look from DESIGN.md: clothes, colours, the distinctive shape;
   - the family's decisions about them;
   - the poses the scene will need (kneel, sit, carry, point, sing).
3. When an agent reports, open its screenshots yourself. If something's plainly off (hair poking through, a bald look, a prop floating, a sacred figure looking comic), send it back before the user sees it.

## Presenting

- Send each character's sheet with SendUserFile: the turnaround (`character.html?char=<key>&view=turn`), the face (`&view=face`) and either a short walk video or three walk frames (`&view=walk`). Group a few related characters in one message. Caption each with its name and one line on the choices made.
- For a video of the walk: `node tools/record.mjs "<sheet url>&view=walk" <frames dir> 240`, then `sh tools/encode.sh <frames dir> <out.mp4>`.
- Then ask with AskUserQuestion, one question per character (up to four at once), with these options:
  - "Approve";
  - "Change something", where the user's note goes in Other or the follow-up;
  - for a character where you see a real choice, an alternative you built (two hair styles, two mantle colours). Show alternatives side by side on one sheet rather than describing them.
- For a sacred figure, make the decision explicitly the user's. Show it the way the faith's own art does, and ask.

## Changes

- Pass the user's words to the same `character-artist` agent (continue it with SendMessage, so it keeps its context), quoting them exactly.
- Show the result next to the previous version.
- Keep going until it's approved. Record every approval, with the date, in DESIGN.md section 10.
