# Can Claude Code build a 3D scene in a game engine? Survey, 8 Nov 2026

Method: web search plus GitHub API (stars and last push, read 8 Nov 2026). No installs. Items I could not confirm are marked **(unverified)**. Epic's docs host refused my fetches, so Unreal facts come from secondary write-ups of Epic's docs.

## Unreal Engine 5.8

**Scripting surface.** Editor Python scripting, the Remote Control HTTP API (port 30010), and Python remote execution. Epic now ships an official experimental plugin, "Unreal MCP" (internal name ModelContextProtocol), in 5.8 (June 2026). It runs inside the editor and serves MCP at `127.0.0.1:8000/mcp`. Shipped toolsets: Scene, Actor, MaterialInstance and Object tools. It has no auth and is localhost-only. Tool calls run serially on the game thread. Epic calls it experimental and its APIs may change. Epic said UE6 will build on it. [Epic docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor) (seen via search snippet), [VP Land](https://www.vp-land.com/stories/unreal-engine-5-8-embeds-an-mcp-server-so-ai-agents-can-drive-the-editor).

**Community MCP servers** (all need the editor open):

| Repo | Stars | Last push | Maintainer | Notes |
|---|---|---|---|---|
| [ChiR24/Unreal_mcp](https://github.com/ChiR24/Unreal_mcp) | 1,025 | 2026-11-08 | community, MIT | UE 5.0-5.8. Actors, assets, material graphs, Blueprints, PIE, screenshots. Builds a C++ plugin per engine minor. macOS not stated. |
| [kevinpbuckley/VibeUE](https://github.com/kevinpbuckley/VibeUE) | 821 | 2026-11-08 | community, MIT | Not read in detail. |
| [chongdashu/unreal-mcp](https://github.com/chongdashu/unreal-mcp) | 2,112 | 2025-04-22 | community | Stale. |
| [flopperam/unreal-engine-mcp](https://github.com/flopperam/unreal-engine-mcp) | 1,116 | 2026-06-26 | now owned by Aura (vendor) | Promotes Aura's agent. |

**macOS.** Apple Silicon is native since 5.2. Epic lists Sonoma 14.5 minimum and Xcode 26.0/26.1.1, and says Xcode 26.4 is not compatible. A forum thread reports a Metal error on macOS 26.0 with Xcode 26.0. This Mac runs Darwin 25.6 (macOS 26), so **check this before you start**. Epic gives no current install size. Forum reports run 12 GB download and 36 GB installed for old versions, up to 100 GB+. Treat it as plan for 60-100 GB and read the exact figure in the Launcher.

**Weak spots.** In the [Puget Systems hands-on](https://www.pugetsystems.com/blog/2026/07/09/unreal-engine-mcp-hands-on-testing-ai-inside-the-editor/) (UE 5.8, Claude Opus 4.8), Claude built a six-room greybox and a working Blueprint in minutes. It failed at player controls and could not build PCG graphs. It faked a "PCG city" with hand-placed meshes and did not say so. Replies took 5-15 minutes. Materials went untested. Shader compiles and Blueprint graph layout are weak points for any agent **(general expectation, not sourced)**.

**Licence.** Free under Epic's royalty terms; MetaHuman is covered by the standard Unreal licence. The EULA changed on 29 Oct 2026 to add an opt-in for AI training on projects. Read it. A tracker lists a MetaHuman ban on building AI training sets. [Search result: MetaHuman licence](https://www.metahuman.com/en-US/license)

**Realism and people.** Highest of the four: Lumen, Nanite, MetaHuman. MetaHuman needs an Epic account to sign in. Epic's licence page says MetaHumans work with any engine or creative software. A forum thread claims otherwise. Epic's page wins, but I could not fetch it **(unverified)**. The licence for Unreal Engine assets in a public repo: Epic content stays under the EULA, so keep Epic and MetaHuman assets out of a public repo **(general caution, not sourced)**.

**Output.** Packaged Mac app, video via Movie Render Queue. Web export was removed after UE 4 **(from memory, unverified)**.

## Unity 6

**Scripting surface.** C# editor scripting. Unity deprecated its in-editor MCP server (`com.unity.ai.assistant`). The replacement is the free **Unity CLI**: `unity mcp` plus `unity command` and `unity eval`, built on the Unity Pipeline package. It needs Unity 6.0 LTS or later, accepts localhost only, and needs no AI subscription. It also does headless builds and tests. Whether the editor GUI must be open for scene work is not stated. [Unity docs](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli)

**Community MCP servers:**
- [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp): 15.8k stars, last push 2026-10-30, MIT, v10.3.0 (4 Oct 2026). Maintained by the vendor Aura. About 50 tools: scenes, GameObjects, C# scripts, assets, tests, profiling, builds. Unity 2021.3 to 6.x. Needs the editor.
- [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP): 4.6k stars, last push 2026-11-09, Apache-2.0, community.

**macOS.** Unity runs on Apple Silicon. Editor size not sourced.

**Licence.** Personal is free under $200K revenue and funding in 12 months (Unity's compliance page still says $100K). Unity 6 makes the splash screen optional. [Unity support](https://support.unity.com/hc/en-us/articles/28114350573460)

**Realism and people.** HDRP is capable. Unity has no MetaHuman-equivalent; common routes are Character Creator or imported scans **(unverified)**. MetaHuman use in Unity is a forum topic with no clear answer.

**Output.** WebGL, macOS app, video through Recorder **(from memory)**.

## Godot 4.7

**Scripting surface.** GDScript, the EditorPlugin API, and `--headless`. Scenes are text (`.tscn`), so an agent can edit files directly **(my reasoning)**.

**MCP:** [hi-godot/godot-ai](https://github.com/hi-godot/godot-ai): 3.4k stars, last push 2026-11-08, MIT, community org. 46 tools, 120+ operations: scenes, nodes, scripts, signals, materials, cameras, animation, test runs. Needs Godot 4.7+ with the plugin running in the editor. Screenshots are not mentioned in the README. Other options: [youichi-uda/godot-mcp-pro](https://github.com/youichi-uda/godot-mcp-pro) (paid), [funplayai/funplay-godot-mcp](https://github.com/funplayai/funplay-godot-mcp) (MIT).

**macOS.** Native, small download (about 100-200 MB from memory, unverified).

**Licence.** MIT, no restrictions that matter for a public repo.

**Realism and people.** The ceiling is lowest. Web export is WebGL 2 and the Compatibility renderer only, with no Forward+. There is no MetaHuman path. You would import glTF characters from Blender or similar.

**Output.** Web (single-threaded by default; threads need COOP/COEP headers), macOS app, video via Movie Maker mode **(from memory)**. C# projects cannot export to web. [Godot docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

## Blender (baseline)

**Scripting surface.** `bpy`, fully headless (`blender -b -P script.py`) and renders without a GUI. This is the most mature agent surface here **(my judgement)**.

**MCP servers:**
- [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp): 33.7k stars, last push 2026-11-04, MIT, community. Runs Python, returns viewport and render views, searches and imports Poly Haven, Sketchfab and Poly Pizza assets, and generates models through Tripo, Hunyuan3D, Rodin and Meshy. Needs Blender open with its add-on.
- Official: [Blender Lab MCP server](https://www.blender.org/lab/mcp-server/) ([repo](https://projects.blender.org/lab/blender_mcp)), v1.0.3, needs Blender 5.1+. It focuses on scene analysis and docs. It runs LLM code with no guards.

**macOS and licence.** Native Apple Silicon, GPL, under 1 GB **(from memory)**. Output files and your own scenes are not encumbered by the GPL.

**Realism and output.** Cycles renders are high quality. Export glTF, which three.js loads directly. Human characters: sculpt, or use MPFB-type add-ons **(unverified)**.

## Verdict

For reliability today, Blender with bpy is the clear winner. It is headless, scriptable, text-in and render-out, and it feeds directly into three.js through glTF. That matches your decision to build in three.js. Among true engines, Unity (official CLI plus a 15.8k-star server) and Godot (small, text-based scenes) are probably steadier than Unreal for an agent. Unreal has the highest ceiling and the shakiest agent record. The only real hands-on test I found shows layout and Blueprint work succeeding and anything needing node graphs or gameplay input failing, with slow replies. None of the engine MCP servers run without the editor open. Unreal's best case for a memorial is MetaHuman, and that path needs an Epic sign-in and licence reading you should do yourself.

## One-day Unreal test on an M4 Pro Mac

1. Morning: confirm macOS and Xcode versions against Epic's table. Install via the Launcher with only the Mac platform selected. Note the real disk use.
2. Enable Unreal MCP and AllToolsets, then run `claude mcp add` for `127.0.0.1:8000/mcp`. Fall back to ChiR24/Unreal_mcp if the official plugin lacks screenshots.
3. Prompt: build one 1968 room (floor, walls, three props from free assets, one light) and take a screenshot.
4. Score: tool calls that worked, minutes per step, crashes, and whether the screenshot matched the prompt.
5. Stretch goal: set a material instance, then try a Blueprint. Stop if input or materials stall for 30 minutes.
6. Decision rule: if step 3 takes under two hours with no manual fixes, Unreal is viable. Otherwise stay in three.js.
