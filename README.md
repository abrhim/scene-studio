# Scene Studio

A Claude Code studio for **living dioramas**: blocky low-poly 3D scenes of moments from history, scripture, myth and fantasy that loop on a TV for a family to watch and tap. It is not for games or simulations; [CLAUDE.md](CLAUDE.md) says exactly what it builds and what it refuses.

## Using it

```bash
cd ~/code/scene-studio
npm install        # once: the screenshot and video tools
claude             # then ask for a scene, e.g. "a diorama of Gettysburg on the third day"
```

The session interviews you, writes a design you approve, shows you each character for approval, builds the scene with parallel subagents, integrates and reviews it, and sends you a video.

To look at a finished scene, open `scenes/<name>/index.html`, or run `npm run serve` and visit `http://localhost:8790/scenes/<name>/index.html`. Add `?res=0.75` on a Raspberry Pi.

## What's here

- `CLAUDE.md`: the studio's rules and workflow.
- `docs/`: the style, the lessons, and templates for the design and for builders' briefs.
- `kit/`: the figure kit, the blocky figures and the shared motion.
- `template/`: the base scene, example plug-ins and the character sheet.
- `tools/`: headless screenshots (stepped and real time) and frame-by-frame video.
- `.claude/agents/`: researcher, character artist, set builder, land builder, choreographer, integrator, reviewer.
- `.claude/skills/`: new-scene, character-review, scene-check.

The kit comes from family-hub's Rivendell and temple scenes. Scenes made here are standalone folders and don't touch family-hub.
