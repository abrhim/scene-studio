# Motion sources: which moves the clay Marine best

`motion-sources.html` (keys 1–4) shows the same clay rifleman (face 1, sleeves rolled) three ways, side by side, with the same camera and ground:

- **A. Studio procedural:** the clay v2 figure on its own rig, posed by `style-study/clay-v2.js` (`V2.animate`: idle with breathing, glances and blinks; the loose walk; kneel; the slump). This is how clay v2 moves today. It is not `kit/motion.js` plus `FigureKit.Script`: the clay figure has never run on that kit, and porting it was more than this study could fairly do. V2's walk is made in place, so I move A's root with the same planted-foot rule as B. Without that it would slide.
- **B. Mixamo with motion layers:** the clay v3 rig (Mixamo names) playing the clip, with all eight layers on: two-hand rifle by IK, kit springs, look, load, variation, foot-planted root, hip sway, living face.
- **C. Mixamo raw:** the same rig and clip with no layers. The root still follows the planted foot, because an in-place clip cannot travel without it. The rifle is placed by the realistic spike's rule (grip in the right palm, barrel through the left).

Videos: `motion-sources-walk.mp4`, `-idle.mp4`, `-kneel.mp4`, `-fall.mp4` (10 s each, three panels), with `*-small.mp4` copies. Strips are in `shots/strip-sources-*.jpg`.

## Behaviour by behaviour

**Walk (10 s, straight line). B wins.** Walk With Rifle has weight. The knees give under the load, the pelvis rolls, the stride shortens, and the rifle is held across the body in two hands. The head scans and nods on each footfall. A reads as a toy marching: legs swing like pendulums from the hip with no knee load, and the rifle hangs in one hand like a briefcase. Its loose arm swing is charming, but it reads as a stroll, not a man carrying 30 kg in heat. C has the same legs as B, but the rifle see-saws as the hands bob against each other, and the head and face are dead. At 40 m all three read as "walking". Only B reads as "tired Marine on patrol", and A reads as cute, which the brief rules out.

**Idle with the rifle. B wins narrowly; A is close.** Rifle Idle has a real weight shift. B adds breath, gaze and blinks with the head following the eyes, and holds the rifle in two hands at the low ready. A's idle is alive (breath, glances, blinks) but symmetrical and on the spot, and its rifle stands upright in one hand. C is a mannequin: the body breathes, but the face is frozen. From across a room, A's idle and B's idle are nearly equal. What separates them is the hold, and the hold can be fixed in A.

**Kneel and rise. B wins on the way down; the rise is a compromise.** Kneeling Down has a real weight transfer: a step, a drop onto the knee, the torso counterbalancing. A blends between two poses in 0.7 s, so nothing steps and the knee sinks straight down. There is no kneel-to-stand clip on Mixamo. Stand Up and Getting Up both start lying down. So B and C rise by playing Kneeling Down backwards. That reads acceptably at distance, but the weight moves the wrong way. A Mixamo "Kneel to Stand" (or Standing Up from a kneel) should be downloaded.

**The gentle fall. B wins, clearly.** Dying (1) carries real momentum. He folds at the knees, turns and goes down face first. Rather than snapping to his back, B lets go of the rifle at 1.6 s, and it settles flat on the ground beside him. Its face goes from strained to calm with slow blinks. A's slump (sit back onto the hip, head down) is gentler and arguably more family-safe, but it is a pose blend with no fall in it, and it looks like sitting down. C falls the same way as B, but the rifle stays glued to the back, and the face is frozen.

## CPU cost (animation only, measured)

With 30 figures each, real clock, headless Chrome on the M4 Pro (`motion-sources.html?bench=1`):

| | per figure | 150 figures |
|---|---|---|
| A procedural (V2.animate) | 0.012 ms | ~1.9 ms |
| B Mixamo + 8 layers (CM.update, LOD figures) | 0.056 ms | ~8.4 ms |

Skinning and draw cost are the same for both (one skinned mesh each). B is about 4.5 times A, but 8 ms for 150 figures still fits a 33 ms frame on the M4 Pro. On a Raspberry Pi 5, expect about 8 to 10 times slower: B at 150 figures would not fit. There, far figures would need B at a lower rate (every 2nd or 3rd frame, as a crowd system would) or baked vertex animation. The springs and IK are most of B's cost. The mixer alone is cheap.

## Authoring a new gesture ("Hunnicutt drags his captain to cover")

- **A, procedural:** hand-write a pose function per figure, with keyed angles over time for the dragger (crouch, grip under the arms, backward steps with planted feet) and the dragged (limp, heels trailing). Two-person contact means writing the hand-on-shoulder constraint and the step timing yourself. That is a day or more per gesture, and the result looks like everything else A does: posed.
- **B, Mixamo:** Mixamo has no drag (ANIM-LIST.md says so). The options are a Mixamo clip that is close ("Dragging", "Pulling" if they exist, "Carrying" for the upper body) retargeted at load with no code; a mocap or Blender-keyed clip exported as FBX on the X Bot skeleton, which then plays on every clay figure by name; or a procedural layer on top (hands IK'd to the captain's harness, the captain's body dragged by a root-attached spring). The rig is Mixamo-compatible, so any clip from any Mixamo or X Bot source costs nothing to bring in. The authoring work moves from code to finding or keying a clip.

## Recommendation

**A hybrid, which is what B already is: Mixamo for anything with weight (locomotion, kneels, falls, crawls, throws), and procedural code for everything that makes a figure alive and specific.** That covers the face, gaze and head, breath, kit swing, the two-hand rifle, per-figure variation, foot planting and the props (map, handset, whip). Keep A's strengths where they beat clips: its idle life is cheap and good, so use procedural idles for distant background figures, and B's clip idles for the figures the camera visits. Small story gestures (a wave, a point, looking up, a nod to the radioman) are cheaper written procedurally as additive layers over a clip than hunted on Mixamo. The two-person beats (the drag, the carry, the stretcher) need hand-keyed or mocap clips on this skeleton either way.

What is still owed for that plan: a kneel-to-stand clip, a plain patrol carry (Mixamo "Walking"), a drag clip, and a lower update rate for distant figures before the Pi target.
