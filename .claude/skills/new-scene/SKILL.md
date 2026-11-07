---
name: new-scene
description: The full workflow for making a new living diorama, from the scope check and the interview through research, character approval, the base, parallel builders, integration, review and delivery. Use whenever the user asks for a new scene, or to pick up a scene part-way through.
---

# Making a new scene

Work through these phases in order. Keep the task list current. Each gate needs the user's approval before you go on. If you're picking up a scene part-way through, read its `DESIGN.md` and `.scratch/` to see which phase it's in.

## 0. Scope

Check the request against CLAUDE.md's two lists.
- **A diorama of history, scripture, myth or fantasy:** go on.
- **A game, a simulation, a sandbox, spawning or adding characters, control of anyone, scores or outcomes:** refuse in one or two sentences and offer the nearest diorama in one line. Don't build any part of it.
- **Mixed** ("a Gettysburg game where my son commands the Union"): refuse the game part, offer the diorama ("a diorama of the battle's third day, with the armies moving through what happened"), and ask if they'd like that.

## 1. The interview

Use AskUserQuestion. Ask two to four questions at a time, each with two to four options and your recommendation first, marked "(Recommended)". Ask in rounds, and stop once you have enough. Ask only what you can't decide or look up yourself:

1. **The moment.** Which story, and which instant of it? Offer three moments that would make good dioramas, each with one line on why.
2. **The source and how faithful.** Which text or account, which edition, how exact (the plan of a building, the order of events), and what may be compressed.
3. **Sacred or sensitive things.** How to show a sacred figure, an angel, God's presence, death or a battle (offer gentle options: shown as light, shown from afar, shown plainly the way the faith's own art does).
4. **Who's watching.** The children's ages, and anything to avoid.
5. **Mood, season, time of day.**
6. **The cast.** Who must be there; who's optional (a dog with the flock? children by the river?).
7. **The big moments of the loop.** Offer a draft timeline and ask what to add or drop.
8. **Tapping.** What a label should say (a name and a short quotation?), and which taps set off a moment (a wave, a song, a bird taking off).

## 2. The source

Follow "Knowing the source" in CLAUDE.md. Never design from memory.
- Send the `scene-researcher` agent off with the subject, the exact moment and your questions. If the source is under copyright (Tolkien), ask the user first whether they can share the key passages from their copy, and pass those to the agent.
- While it works, read the core passages yourself too, so you understand the story at first hand.
- When it reports, read `research.md` in full. Check that every detail you plan to use is marked **text** or has a cited historical source. Check that the book has been followed over any film. Check what's flagged: adaptation differences, gaps, disagreements, anything frightening.
- Ask the user about whatever the research turned up that's theirs to decide. For example: the film shows Rivendell one way and the book another; or the text doesn't say what the Liahona looked like, so should it follow the Church's artwork?
- **Gate:** don't start the design until `research.md` exists and you've read it.

## 3. Design

- Write `scenes/<name>/DESIGN.md` from `docs/DESIGN-TEMPLATE.md`, building every detail from `research.md` with its reference. Fill in every section. Coordinates in metres, a 180-second timeline, a file split with budgets. In the last section, separate what's from the source, what's from history or teaching, and what's ours.
- Block out the layout.
- Send the user a short summary: what it shows, where it comes from in the source, the layout sketch, the cast, the timeline's big moments, the open questions. Ask for edits.
- **Gate:** the user approves the design. Record their decisions in section 10.

## 3. Characters

Use the `character-review` skill.
- Build every character (and animal) on the character sheet, in parallel with `character-artist` agents, a few at a time.
- Send each one for approval.
- **Gate:** every character is approved. Nothing unapproved goes into the scene.

## 4. The base

1. `cp -R template scenes/<name>` and `cp -R kit scenes/<name>/kit` (the scene keeps its own copy).
2. In `index.html`, edit the sections marked EDIT:
   - the palette;
   - the land (`groundY`, the terrain's colours);
   - the shared measurements, as a block like `TEMPLE` in the temple scene, so every builder agrees;
   - the spots;
   - the cycle (`dayAt`) and any special light;
   - the camera's focus, drift and tour views.

   Also set the title and caption.
3. Write `labels.js` with every tappable person and place and its line, quoted exactly, and `window.STORY`: the day's chapters for the story panel (DESIGN.md 5b).
4. Delete the example plug-ins and list the scene's own in the script tags.
5. Copy `docs/BRIEF-TEMPLATE.md` to `scenes/<name>/BRIEF.md` and fill it in.
6. Check with `tools/shot.mjs` that it renders: the land, the camera, the light at day, dusk and night, no errors. Check `groundY` at sample points with a script. Send the user a screenshot.

## 5. Builders, in parallel

Split the scene into plug-in files: usually buildings (`set-builder`), land and water (`land-builder`, or two), people and animals (`choreographer`, or one each for the people and a flock). Start them all in one turn. Each gets a short brief of its own, on top of BRIEF.md:
- its file and plug-in name;
- its budget of draws and triangles;
- its sections of DESIGN.md;
- what to build;
- the label keys it registers;
- what it must leave room for (paths, water, where people stand);
- the timeline moments it owns;
- how to check it.

While they work, keep the user posted in a line, and answer their questions.

## 6. Integration

When every builder has reported, read the reports. Look at their screenshots and take a few of your own. Send the `integrator` agent the reports and anything you noticed.

## 7. Review

Send the `scene-reviewer` agent. Look at its screenshots. Fix blocking problems (scope, safety, faithfulness) yourself or with the agent that owns the file, then the rest in order. Re-check.

## 8. Delivery

- Record the whole loop: `node tools/record.mjs "http://localhost:8790/scenes/<name>/index.html?t0=0" scenes/<name>/.scratch/frames 5400`, then `sh tools/encode.sh scenes/<name>/.scratch/frames scenes/<name>/<name>.mp4`.
- Send the video and two or three stills with SendUserFile.
- Tell the user how to open the scene: the folder, `index.html`, or `npm run serve` and the URL. Say what's not finished, and ask what they'd like changed.
