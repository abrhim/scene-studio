# MIT "one model, many substances": does it belong in our diorama?

Researched 2026-11-09. Sources are linked inline. Gaps are marked as gaps.

## What it is

The model is **WorldParticle** ("Unified World Simulation of Lagrangian Particle Dynamics via Transformer"). Peter Yichen Chen (UBC, formerly MIT), Minghao Guo and Wojciech Matusik (MIT CSAIL) lead a 16-author team. Their paper is headed to SIGGRAPH Asia.

- Sources: [MIT News, 9 Nov 2026](https://news.mit.edu/2026/single-ai-model-simulates-many-substances-behavior-1109), [arXiv 2605.15305](https://arxiv.org/abs/2605.15305), [project page](https://worldparticle.github.io/WorldParticle_Web/).

In plain words: every material becomes a cloud of 3D points. A hand-written step moves the points under known forces such as gravity. A transformer then predicts a small correction to each point's position and velocity. The same network handles cloth, elastic solids, water, non-Newtonian fluids, sand and molecular dynamics. The authors report it generalises to unseen materials, obstacles, initial conditions and forces. They also show interactive control, inverse design and learning from real-world point clouds.

- **Inputs:** particle positions, per-particle properties and external forces.
- **Outputs:** the next frame's particle positions and velocities.
- **Speed:** the only number published is for proteins. Time steps are 100x larger than OpenMM's, and MIT quotes about 100x faster than numerical simulators. I found no frame times, particle counts or GPU details. The paper PDF exceeded my fetch limit, so the numbers may be in it.
- **Training data:** not stated in the news piece or on the project page. This is a gap.
- **Release:** the project page links a GitHub repo. Weights are unclear, because the "Model" link goes to a Hugging Face dataset page. The project page states no code licence. The arXiv listing shows CC0, but that covers the paper, not necessarily the code or weights. Check the repo before reusing anything.

## Good at, and not good at

**Good at:**
- Mixed materials in one model.
- Large time steps.
- Differentiable control and inverse design.
- Cheap what-if exploration once trained.

**Not good at (from what is published):**
- It has no limitations section, and the page has no accuracy or speed benchmarks.
- Rollouts were shown stable for hundreds of frames, not for a scripted 10-minute scene.
- It is a research demo. MIT itself says scaling to millions of particles is computationally demanding.
- A learned solver gives plausible motion. It does not give art direction, a guarantee of stability, or a frame-exact result. A classical solver does.

## Context: this family in production

I did not find evidence that Houdini or Blender ships a learned cloth or fluid solver. I also found no studio (Pixar, Disney) using a learned surrogate in a shipped film. Pixar's 2026 SIGGRAPH session on *Hoppers* is about conventional simulation with artistic direction ([listing via search](https://www.site304.tangram-studio.com/news/nvidia-neural-rendering-world-models-and-simulation-keynote-set-siggraph-2026)). That is a thin search result, not proof of absence.

- Learned simulators are real research: [MeshGraphNets (DeepMind)](https://neurips.cc/virtual/2020/20479) does cloth and structural mechanics, and GNS does particles.
- The industry energy is in robotics. [Newton](https://getcoai.com/news/nvidia-disney-and-google-deepmind-go-beyond-animatronics-partner-on-star-wars-inspired-ai-robots) (NVIDIA, DeepMind, Disney, on NVIDIA Warp) targets robot simulation, not animation.
- Real-time browser cloth does exist, but with a classical solver: [WebGPU mass-spring cloth, arXiv 2507.11794](https://arxiv.org/pdf/2507.11794), reporting real-time collisions on 4K to 100k-node cloth.
- I found no learned simulator running in WebGPU in a browser.

## Three places it could matter for us

| Use | Verdict | Why |
|---|---|---|
| **Smoke and dust** (tracer smoke, rotor dust, napalm plume) | Offline now; research-only for live | WorldParticle's fluid and granular modes are the nearest fit. In practice, bake a plume in Blender/Houdini/EmberGen and play it back as flipbooks or a VDB-to-texture sequence. Cheap GPU particle systems and curl noise cover the browser case. A learned solver adds risk and no visible gain at diorama scale. |
| **Grass under rotor wash** | Practical now, without ML | This needs a vertex-shader bend driven by a wind or downwash field: the elephant grass reads as a swaying mass, not as simulated particles. Particles are the wrong representation for blades. A learned particle model has no advantage here. Research-only for anything physical. |
| **Cloth and kit on 150 figures; crater deformation** | Cloth: offline bake. Craters: practical now with a heightmap decal | At 150 figures, run cloth in Blender per animation cycle and play it back as vertex-animation textures or bones. A learned cloth model (the cloth mode in WorldParticle, or MeshGraphNets) could someday replace that bake step. It is not practical today, because there is no browser runtime and no production tooling. Craters are authored geometry or heightmap edits, driven by the script of the battle. Nobody needs a learned soil model for that. |

## Verdict for a three.js engineer

Skip it for this build. WorldParticle is a credible research result: one transformer for many particle materials. It is not a tool you can drop into a pipeline. The licence is unconfirmed, the benchmarks are missing, there is no browser runtime, and your scene is a scripted one-pass playback where determinism and art direction matter more than generality.

Spend the effort on the proven stack instead:
- shader-driven grass sway;
- GPU particles for smoke and dust;
- baked cloth (Blender, played back via vertex animation textures);
- authored crater geometry.

Revisit in about a year. The signal to watch is whether the repo ships weights and a permissive licence, and whether anyone ports it to WebGPU. The likely future use is as an offline bake accelerator (smoke, dust, cloth drape), not as a live browser solver.
