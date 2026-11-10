// marines-c.js (plug-in "marines-c"): Company C, 1/9, on 16-17 April 1968 (DESIGN.md 2, 5, 5b, 6, 9; DECISIONS.md "The
// fighting", "Command and radio", "Motion"; research.md 2, 3, 10).
//
// Two platoons of Charlie shown as 42 men, with Capt Himmer, his radioman, 1stLt Connelly, a corpsman, and LtCol Cahill
// and his radioman (Cahill is this file's from chapter 4; in chapters 1-3 he is marines-a-d's at the CP unless that file
// has not placed him). Clay v3 figures (clay-v3/FIGURES.md): Mixamo clips with the motion layer, one skinned mesh and
// one draw per figure, hero mesh for the named men, far mesh for the rest.
//
// Everything is a pure function of ctx.chapter.id and ctx.cycle.t. Each figure has, per chapter, a list of segments
// (hold a clip at a place, or move along a path with eased starts and stops); a segment's clip time is computed from the
// loop time (for a walk, from the distance walked, so the feet stay with the ground), so `?ch=6&t0=40` shows any moment.
// A jump in time (a chapter change, a seek) rebuilds each figure's state at once; at a loop's seam a figure whose start
// and end differ fades out and back in (1.2 s).
//
// Nothing graphic (research.md 10): men fall gently (Dying (1)); no blood, no injury. The wounded lie breathing (Laying
// Breathless). Abram's ruling, 2026-11-09: a man the record says was killed (here PFC Brown, KIA, research.md 3) lies
// still after his fall, the fall's last frame held with the motion layer's life off, where he fell, in every later
// chapter; the dead are never carried. Larry is never shown dying. No man sits on nothing: a seated man sits on a
// hole's rear lip with his legs in the hole or on an ammunition box (WORKS.seat), the segment's floor under his soles.
//
// Timeline as built (loop seconds):
//   1  0600   on the 689 perimeter's W-SW arc: men in holes, some on hole lips and ammo boxes, three walking; Himmer, his radioman and Connelly at
//             the company's spot; the radioman on the handset 20-32; Himmer points 40-43
//   2-3       in reserve on 689; four men stand watching the far ridge; the handset at the messages (ch 3: 30-56)
//   4  1200   the noon request (handset 2-10); Himmer points 8; the men form on the slope outside the wire 12-50; Cahill
//             and his radioman come from the CP 12-66; they move off down the Charlie route from 60
//   5  1230   time-lapse climb from the saddle, two files; crouched walk in the last 15 m; halt 50 yards below the top,
//             all down by about 95; men drink; heads turn back to 689 during the rockets (61-78); Cahill points up the
//             slope 110-114 (the P1 arc at 113.7 leaves his radioman)
//   6  1435   on line, one platoon up, one in trace; the line moves up and kneels at fire.js's firing points (3-9) and
//             fires; the leaders rush on the left (12.5-19.5); fire from the left at 20: Himmer falls 21.0 at SITE's fall
//             point, a platoon commander 21.6, a squad leader 22.0, the other platoon commander 22.4, the platoon sergeant
//             23.1, a squad leader 24.3; six men into the crater ahead (21.5-28); Connelly moves up 26-36, points 38,
//             on the handset 44-51 (the cease-fire arc at 46); Hunnicutt to his platoon commander 24, kneels 26-41,
//             points the squad into his crater 41, all in by 57; the salvo 50-54: everyone on the left ducks; PFC Brown
//             falls 35 and is still (killed)
//   7  1500   pinned in craters and grass; Cahill walks to the LZ 8-80, hit at 22, 38 and 56 (Injured Walk from 40); the
//             withdrawal order from his radioman 95-110 (arc at 97.3); Sgt Rider round the west flank 12-45; Panykaninec at
//             the big crater's rim, hit 50.5; Hatcher down 31.3; Hunnicutt rises at 69.5 and is hit at 71.2, lies;
//             two poncho litters (two bearers at the ends, two relief men; sl3 and pc2) toward the LZ, from 87 and 98;
//             Brown still where he fell (also in 8-10)
//   8  1900   dusk: a file of 30 with four poncho litters and a walking wounded, about 3 m apart, goes down the withdrawal lane, fading out past
//             the LZ by 87; Hunnicutt leaves his crater, Low Crawl 9-50 to Himmer, kneels 50.5 and stays
//   9  0100   Himmer still, breathing; Hunnicutt beside him low; prone at 12.3 and 35.3 facing the slit; his shots (fire.js)
//             at 14.5, 15.3, 36.6, 37.2, 80.5 (his own rifle, fix pass); the grenade leaves his hand at 40.8 (burst 42.0); crouched again from 90
//   10 0530   Hunnicutt kneels at his captain's head 5-8, moves him a metre at a time to the crater cover 8.5-58 (each
//             metre 2.4 s moving and 1.6 s still), then crawls east toward the gully 62-76 and is gone into the grass;
//             Himmer in cover, alone, breathing, to the end
//   11        only Himmer, in cover
//
// Exposes window.MARINES_C = { figures, radios: { himmer, cahill, connelly } } (radio points are each radioman's
// antenna tip, world space, or null when not shown) and merges the same into window.marines.radios for radio.js.
(function () {
  'use strict';
  const NAME = 'marines-c';

  // ---------- the clay scripts: loaded once, shared with the other marines files ----------
  const CLAY = [
    ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js', () => window.fflate],
    ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js', () => THREE.FBXLoader],
    ['clay-v3/figkit.js', () => window.FK],
    ['clay-v3/clay-v3.js', () => window.V3],
    ['clay-v3/motion.js', () => window.CM],
  ];
  function loadScript(src, test) {
    return new Promise((res, rej) => {
      if (test()) return res();
      const ex = Array.from(document.scripts).find((s) => s.getAttribute('src') === src);
      if (ex) { const iv = setInterval(() => { if (test()) { clearInterval(iv); res(); } }, 30); return; }
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = () => res(); s.onerror = () => rej(new Error('could not load ' + src));
      document.head.appendChild(s);
    });
  }
  function ensureClay() {
    if (CLAY.every(([, t]) => t())) return Promise.resolve();
    if (!window.__clayLoading) window.__clayLoading = (async () => { for (const [src, t] of CLAY) await loadScript(src, t); })();
    return window.__clayLoading;
  }
  // tools/shot.mjs waits on window.__ready; several plug-ins may hold it
  function holdReady() { window.__readyHolds = (window.__readyHolds || 0) + 1; window.__ready = false; }
  function releaseReady() { window.__readyHolds = Math.max(0, (window.__readyHolds || 1) - 1); if (!window.__readyHolds) window.__ready = (!(window.__readyHolds > 0) && !(window.__readyWait > 0) && !((window.CLAY || {}).waits > 0)); }

  window.Scene.register({
    name: NAME,
    init(ctx) {
      window.MARINES_C_TRAMPLE = trample(ctx.SITE);
      holdReady();
      const st = this.st = { run: null };
      ensureClay().then(() => build(ctx, st)).catch((e) => { console.error(NAME + ': failed to start', e); releaseReady(); });
    },
    update(t, dt) { if (this.st && this.st.run) this.st.run(t, dt); },
  });

  // Where Charlie's men knelt, lay and crawled, as clearings in works.js's shape ({ x, z, r, kind: 'lz' = grass flattened,
  // from: chapter }): for land.js to flatten the grass there, so the men can be seen (the record calls the place Himmer
  // lay "an open area", NC). Not applied by this file: the integrator adds them to WORKS.clearings (see the report).
  function trample(S) {
    const p = S.charliePause, s = S.battleSummit, l = Math.hypot(s.x - p.x, s.z - p.z), ux = (s.x - p.x) / l, uz = (s.z - p.z) / l;
    const AS = (a, d) => [p.x + ux * a + uz * d, p.z + uz * a - ux * d];
    const out = [];
    const put = (pt, r, from) => out.push({ x: pt[0], z: pt[1], r, kind: 'lz', from, by: 'marines-c' });
    for (const q of [[-8, -10], [-8, 0], [-8, 10], [-16, -8], [-16, 4], [-17, 14]]) put(AS(q[0], q[1]), 4.2, 5);   // radii trimmed at integration so the slope stays a grass slope
    for (const q of [[-11, -20], [-10, -10], [-9.5, 0], [-10, 10], [-11, 20], [-19, -12], [-19, 0], [-19, 12], [-19, 22], [-3, 6], [-2, 16]]) put(AS(q[0], q[1]), 3.9, 6);
    put([S.himmerFall.x, S.himmerFall.z], 5.5, 6);   // "an open area" (NC)
    for (const q of [[-10, 31], [-2, 34], [-6, 26]]) put(AS(q[0], q[1]), 4, 7);
    return out;
  }

  async function build(ctx, st) {
    const { THREE, SITE } = ctx;
    const V3 = window.V3, CM = window.CM;
    const TAU = Math.PI * 2, DEG = Math.PI / 180;
    const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
    const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const lerpA = (a, b, k) => a + wrapA(b - a) * k;
    const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    const H = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const gy = ctx.groundY;
    const ground = (x, z) => ctx.surfaceY(x, z);

    CM.animPath = 'realistic-spike/anim/';
    const mat = V3.material();
    mat.userData.extraKey = 'clay2';
    ctx.addSkyFog(mat);
    if (!CM.T) await CM.init(V3.build({ kind: 'rifleman', mat }));
    const CLIPS = ['Walk With Rifle', 'Rifle Idle', 'Rifle Kneel Idle', 'Kneeling Down', 'Idle Crouching', 'Crouch Idle 02 Looking Around',
      'Looking Around', 'Pointing', 'Kneeling Pointing', 'Talking On Phone', 'Sitting Idle', 'Rifle Crouch Walk', 'Injured Walk',
      'Injured Idle', 'Laying Breathless', 'Low Crawl', 'Prone Idle', 'Grenade Throw', 'Carrying', 'Dying (1)', 'Rifle Run'];
    await CM.load(CLIPS);
    // Carry Walk: Walk With Rifle's legs and hips under Carrying's arms and back (a stretcher bearer; no such clip exists)
    const LOWER = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'].map((k) => 'mixamorig' + k);
    if (!CM.clips['C:Carry Walk']) {
      const lo = CM.clips['Walk With Rifle'], up = CM.clips['Carrying'];
      const isLow = (tr) => LOWER.includes(tr.name.split('.')[0]);
      const tracks = lo.tracks.filter(isLow).concat(up.tracks.filter((tr) => !isLow(tr)));
      const clip = new THREE.AnimationClip('C:Carry Walk', lo.duration, tracks);
      const means = Object.assign({}, lo.userData.means);
      for (const k in up.userData.means) if (!LOWER.includes(k)) means[k] = up.userData.means[k];
      clip.userData = Object.assign({}, lo.userData, { name: 'C:Carry Walk', cfg: { mode: 'plant', rifle: 'sling', load: 0.5, knee: 0 }, rifle: undefined, means });
      CM.clips['C:Carry Walk'] = clip;
    }
    const CW = 'C:Carry Walk';
    // a poncho litter's bearers: Walk With Rifle with the rifle slung; the near hand is laid on the poncho by IK
    // (clay-v3/motion.js CM.grip), so no carrying clip is needed (fix pass, carries)
    const LW = 'C:Litter Walk'; CM.slung('Walk With Rifle', LW);
    const LI = 'C:Litter Idle'; CM.slung('Rifle Idle', LI);
    const DUR = (n) => CM.clips[n].duration;

    // ---------- calibration on a probe figure (not in the scene) ----------
    const VNAT = {};
    const LBF = 'Laying Breathless (after fall)';
    let RELEASE = 1.0, HEAD_LAY = { x: 0, z: -1 };
    {
      const F = V3.make(1, 'rifleman', 0, mat);
      const f = CM.figure(F, { seed: 1, vary: false, ground: () => 0 });
      for (const n of ['Walk With Rifle', 'Injured Walk', CW, 'Rifle Run']) {
        f.mixer.stopAllAction(); f.cur = null; f.x = 0; f.z = 0; f.feet = null; f.locks = null; f.sSpeed = undefined;
        CM.play(f, n, { fade: 0, time: 0 });
        let acc = 0, k = 0;
        for (let i = 0; i < 140; i++) { CM.update(f, 1 / 30, i / 30); if (i >= 50) { acc += f.speed; k++; } }
        VNAT[n] = acc / k / f.scale;
      }
      // in-place clips whose planted feet the root solve reads poorly: the foot's travel on the ground over its stance
      for (const n of ['Rifle Crouch Walk', 'Low Crawl']) {
        f.mixer.stopAllAction(); f.cur = null; f.x = 0; f.z = 0; f.yaw = 0;
        CM.play(f, n, { fade: 0, time: 0 });
        const d = DUR(n), p = new THREE.Vector3(); let mn = 9, mx = -9;
        for (let i = 0; i < d * 30; i++) { CM.update(f, 1 / 30, i / 30); f.x = 0; f.z = 0; f.b.mixamorigLeftFoot.getWorldPosition(p); mn = Math.min(mn, p.z); mx = Math.max(mx, p.z); }
        VNAT[n] = 1.1 * (mx - mn) / (0.6 * d) / f.scale;
      }
      for (const n in VNAT) if (!(VNAT[n] > 0.15)) VNAT[n] = n === 'Low Crawl' ? 0.35 : 1.1;
      VNAT[LW] = VNAT['Walk With Rifle'];
      // the grenade leaves the hand where the right hand moves fastest
      f.mixer.stopAllAction(); f.cur = null; f.x = 0; f.z = 0; f.yaw = 0;
      CM.play(f, 'Grenade Throw', { fade: 0, time: 0 });
      const hand = f.b['mixamorigRightHand'], p = new THREE.Vector3(), q = new THREE.Vector3();
      let best = 0, prev = null;
      const d = DUR('Grenade Throw');
      for (let i = 0; i < d * 30; i++) {
        CM.update(f, 1 / 30, i / 30); hand.getWorldPosition(p);
        if (prev) { const s = p.distanceTo(prev); if (s > best) { best = s; RELEASE = (i - 0.5) / 30; } }
        prev = (prev || q).copy(p);
      }
      // Laying Breathless: which way the head lies from the root (figure space, yaw 0)
      f.mixer.stopAllAction(); f.cur = null; f.x = 0; f.z = 0; f.yaw = 0;
      CM.play(f, 'Laying Breathless', { fade: 0, time: 0.5 });
      for (let i = 0; i < 4; i++) CM.update(f, 1 / 30, i / 30);
      f.b['mixamorigHead'].getWorldPosition(p); f.b['mixamorigHips'].getWorldPosition(q);
      const hx = p.x - q.x, hz = p.z - q.z, hl = Math.hypot(hx, hz) || 1;
      HEAD_LAY = { x: hx / hl, z: hz / hl, len: hl, hipX: q.x, hipZ: q.z };
      // after a fall (Dying (1) ends face down, head ahead) the wounded roll onto their backs where they fell: Laying
      // Breathless turned half round onto the fall's hips (clay-v3/motion.js CM.turned; the plain crossfade stood them up)
      (CM.turned && CM.turned(f, 'Laying Breathless', LBF, 'Dying (1)', DUR('Dying (1)'))) || (CM.clips[LBF] = CM.clips['Laying Breathless']);
      F.mesh.geometry.dispose();
    }
    const headYaw = Math.atan2(HEAD_LAY.x, HEAD_LAY.z);   // the head's bearing from the hips in figure space

    // ---------- places ----------
    const S = SITE, cp = S.cp, pause = S.charliePause;
    const up = { x: S.battleSummit.x - pause.x, z: S.battleSummit.z - pause.z };
    { const l = Math.hypot(up.x, up.z); up.x /= l; up.z /= l; }
    // along (up the slope toward the summit) and side (positive = left, west, as fire.js's off()) from the pause
    const AS = (along, side) => [pause.x + up.x * along + up.z * side, pause.z + up.z * along - up.x * side];
    const polar = (b, r) => [cp.x + Math.sin(b * DEG) * r, cp.z - Math.cos(b * DEG) * r];
    const bearing = (x, z) => ((Math.atan2(x - cp.x, -(z - cp.z)) / DEG) + 360) % 360;
    const rIn = (b, d) => polar(b, S.perimeter.rAt(b) - d);
    const xz = (p) => [p.x, p.z];
    const toward = (a, b, d) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [a[0] + dx / l * d, a[1] + dz / l * d]; };

    // a polyline with lengths
    function Poly(pts) {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, cum, D: cum[cum.length - 1] };
    }
    function polyAt(P, s, out) {
      const { pts, cum } = P;
      s = clamp(s, 0, P.D);
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const L = cum[i] - cum[i - 1] || 1, k = (s - cum[i - 1]) / L;
      out[0] = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k; out[1] = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k;
      return out;
    }
    // a stretch of a polyline from s0 to s1, offset sideways (positive = left of the direction of travel)
    function slice(P, s0, s1, off) {
      const out = [], n = Math.max(1, Math.ceil(Math.abs(s1 - s0) / 2.5)), a = [0, 0], b = [0, 0];
      for (let i = 0; i <= n; i++) {
        const s = s0 + (s1 - s0) * i / n;
        polyAt(P, s, a); polyAt(P, Math.min(P.D, s + 1), b);
        let dx = b[0] - a[0], dz = b[1] - a[1];
        if (Math.hypot(dx, dz) < 1e-3) { polyAt(P, Math.max(0, s - 1), b); dx = a[0] - b[0]; dz = a[1] - b[1]; }
        const l = Math.hypot(dx, dz) || 1;
        out.push([a[0] + (dz / l) * off, a[1] - (dx / l) * off]);
      }
      return out;
    }
    // the Charlie route: land.js's trampled lane when present (it meanders round SITE.routes.C), else the route itself
    const laneOf = (i, fallback) => {
      const L = window.__landDbg && window.__landDbg.LANES && window.__landDbg.LANES[i];
      return L && L.path && L.path.length > 3 ? L.path.map((p) => [p[0], p[1]]) : fallback.map(xz);
    };
    const RC = Poly(laneOf(1, S.routes.C));
    const RW = Poly(laneOf(5, S.routes.withdraw || [S.czlz, S.saddle, S.crossing.from, S.perimSW]));
    // the slit that fires at the crater area in chapter 9, chosen as fire.js chooses it
    const W = window.WORKS || ctx.works || null;
    let slit9 = xz(S.secondPosition);
    if (W && W.slits && W.slits.length) {
      const c = W.slits.map((s) => s.pos).filter((p) => { const d = Math.hypot(p.x - S.himmerFall.x, p.z - S.himmerFall.z); return d >= 15 && d <= 60; })
        .sort((a, b) => Math.hypot(a.x - S.himmerFall.x, a.z - S.himmerFall.z) - Math.hypot(b.x - S.himmerFall.x, b.z - S.himmerFall.z));
      if (c[0]) slit9 = xz(c[0]);
      const f9 = window.FIRE && window.FIRE.s9 ? window.FIRE.s9() : null;   // fire.js's own choice (the one its camera frames)
      if (f9) slit9 = [f9.x, f9.z];
    }
    const nearSlits = (W && W.slits && W.slits.length ? W.slits.map((s) => s.pos) : S.bunkerArc).slice()
      .sort((a, b) => Math.hypot(a.x - pause.x, a.z - pause.z) - Math.hypot(b.x - pause.x, b.z - pause.z)).slice(0, 4).map((p) => [p.x, p.y + 0.4, p.z]);
    const second = [S.secondPosition.x, S.secondPosition.y + 0.4, S.secondPosition.z];

    // ---------- the cast ----------
    // roles: named (hero mesh) and the men; platoon 1 up, platoon 2 in trace (ComdC p. 11); Hatcher is 1st Platoon,
    // Hunnicutt, Rider and Panykaninec 2d (HN)
    const CAST = [];
    const add = (key, kind, hero, label, seed) => { const c = { key, kind, hero, label, seed }; CAST.push(c); return c; };
    add('himmer', 'captain', true, 'himmer', 31);
    add('rtoH', 'radioman', true, null, 47);
    add('connelly', 'rifleman', true, 'connelly', 53);
    add('cahill', 'captain', true, 'cahill', 61);
    add('rtoC', 'radioman', true, null, 67);
    add('corpsman', 'corpsman', true, null, 71);
    add('hunnicutt', 'rifleman', true, 'hunnicutt', 79);
    add('hatcher', 'rifleman', true, 'hatcher', 83);
    add('rider', 'rifleman', true, 'rider', 89);
    add('panykaninec', 'rifleman', true, 'panykaninec', 97);
    add('brown', 'rifleman', true, 'brown', 101);
    for (const k of ['pc1', 'pc2', 'psgt', 'sl1', 'sl2', 'sl3']) add(k, 'rifleman', true, null, 110 + CAST.length * 3);
    for (let i = 0; i <= 32; i++) add('r' + i, 'rifleman', false, null, 200 + i * 7);
    const P1 = ['pc1', 'psgt', 'sl1', 'sl2', 'hatcher'].concat(Array.from({ length: 16 }, (_, i) => 'r' + i));
    const P2 = ['pc2', 'sl3', 'hunnicutt', 'rider', 'panykaninec', 'brown'].concat(Array.from({ length: 15 }, (_, i) => 'r' + (16 + i)));
    const HQ = ['himmer', 'rtoH', 'connelly', 'corpsman', 'cahill', 'rtoC', 'r31', 'r32'];
    const COLUMN = P1.slice(0, 11).concat(HQ, P1.slice(11), P2);   // file order on the march: HQ behind the lead squads
    const RANK_P2 = Math.floor(COLUMN.indexOf(P2[0]) / 2);   // the first rank of the second platoon
    const fig = {};
    const figs = [];
    const fadeMats = [];
    for (const c of CAST) {
      const F = V3.make(c.seed, c.kind, c.hero ? 1 : 0, mat);
      F.mesh.frustumCulled = true;
      const g = F.mesh.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); g.boundingSphere.radius += 0.9;
      ctx.scene.add(F.root);
      F.root.visible = false;
      const f = CM.figure(F, { seed: c.seed, x: cp.x, z: cp.z, yaw: 0, vary: true, mood: 'calm', ground });
      const fm = V3.material(); fm.transparent = true; fm.userData.extraKey = 'clay2'; ctx.addSkyFog(fm); fadeMats.push(fm);
      const o = { key: c.key, c, F, f, mesh: F.mesh, fade: fm, blob: ctx.blob(0.42), seg: -1, plan: null, last: -1, skip: 0, acc: 0,
        head: new THREE.Vector3(), ant: new THREE.Vector3(), antOk: false, rifleG: null, alpha: 1 };
      fig[c.key] = o; figs.push(o);
      // the floor under him: the ground, or this segment's floor (E.floor, set each frame); a still man (seg.still: the
      // dead) has the motion layer's life switched off (f.raw: no breath, no face, no glances, no kit sway; the ground
      // contact stays on through rawRoot)
      f.ground = (x, z) => (o.floor !== undefined ? o.floor : ground(x, z));
      f.o.rawRoot = true;
    }
    // officers on the net take the handset when their radioman is within 3 m (clay-v3/motion.js f.lendTo)
    if (fig.rtoH) fig.rtoH.f.lendTo = [fig.himmer && fig.himmer.f, fig.connelly && fig.connelly.f].filter(Boolean);
    if (fig.rtoC) fig.rtoC.f.lendTo = [fig.cahill && fig.cahill.f].filter(Boolean);
    const vnat = (o, clip) => (VNAT[clip] || 1.1) * o.f.scale * (o.f.v.stride || 1);

    // ---------- plans ----------
    // A plan is a list of segments covering the loop. hold: a clip at a place; move: a clip along a path, eased in and
    // out. Options: fade (crossfade s), time (clip start), down (rifle on the ground), carried (rifle hidden), lift
    // (metres up, or { a, b, t0, t1 }), lie (lying: no glances), face (a yaw or [x, z] to face).
    function Plan(at, yaw) { this.segs = []; this.t = 0; this.x = at[0]; this.z = at[1]; this.yaw = yaw || 0; this.glances = []; this.flinch = []; this.fires = []; this.seam = true; }
    const faceOf = (face, x, z, dflt) => (face === undefined ? dflt : Array.isArray(face) ? yawTo(x, z, face[0], face[1]) : face);
    Plan.prototype.hold = function (t1, clip, o) {
      o = o || {};
      const yaw = faceOf(o.face, this.x, this.z, this.yaw);
      if (t1 > this.t) this.segs.push(Object.assign({ k: 'hold', t0: this.t, t1, clip, x: this.x, z: this.z, yaw0: this.yaw, yaw }, o));
      this.t = Math.max(this.t, t1); this.yaw = yaw; return this;
    };
    // move through pts at speed v (m/s), or to finish at o.until; returns the plan
    Plan.prototype.go = function (clip, pts, v, o) {
      o = o || {};
      const P = Poly([[this.x, this.z]].concat(pts));
      if (P.D < 0.05) return this;
      const ramp = o.ramp !== undefined ? o.ramp : 0.7;
      const t1 = o.until !== undefined ? o.until : this.t + P.D / v + ramp;
      const seg = Object.assign({ k: 'move', t0: this.t, t1, clip, P, ramp, yaw0: this.yaw }, o);
      this.segs.push(seg);
      const e = P.pts[P.pts.length - 1];
      this.x = e[0]; this.z = e[1]; this.t = t1;
      if (o.face !== undefined) this.yaw = faceOf(o.face, this.x, this.z, this.yaw);
      else { const a = P.pts[Math.max(0, P.pts.length - 2)]; this.yaw = Math.atan2(e[0] - a[0], e[1] - a[1]); }
      return this;
    };
    Plan.prototype.end = function (L) {
      const last = this.segs[this.segs.length - 1];
      if (!last) this.hold(L, 'Rifle Idle');
      else if (this.t < L) { if (last.k === 'hold') last.t1 = L; else this.hold(L, holdAfter(last.clip)); }
      this.L = L; return this;
    };
    const holdAfter = (clip) => (clip === 'Low Crawl' ? 'Prone Idle' : clip === 'Injured Walk' ? 'Injured Idle' : clip === CW ? 'Carrying' : clip === LW ? LI : 'Rifle Idle');
    const NOPE = { hidden: true };

    // idle clips by kind: who has a rifle
    const rifle = (key) => fig[key].c.kind === 'rifleman';
    const STAND = (key) => (rifle(key) ? 'Rifle Idle' : 'Looking Around');
    const KNEEL = (key) => (rifle(key) ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around');
    const CROUCH = (key) => (rifle(key) ? 'Idle Crouching' : 'Crouch Idle 02 Looking Around');

    // ---- chapters 1-3: in reserve on the W-SW arc of 689's perimeter ----
    // (fix pass, seats) no man sits on nothing: Sitting Idle's seat is WORKS.SEAT_H (0.40 m) above his soles, so a man
    // who sits sits on a hole's rear lip with his legs in the hole (his floor 0.40 below the lip) or on an ammunition
    // box (WORKS.seat 'box'); the man in a hole stands in it, sunk 0.5 as marines-a-d's sentries are
    const holes = (W && W.holes && W.holes.length ? W.holes.map((h) => ({ i: h.i, x: h.pos.x, z: h.pos.z, ox: h.out.x, oz: h.out.z, seat: h.seat ? [h.seat.x, h.seat.z] : null, seatYaw: h.seatYaw })) : Array.from({ length: 36 }, (_, i) => { const p = S.perimeter.at(i * 10); return { x: p.x, z: p.z, ox: Math.sin(i * 10 * DEG), oz: -Math.cos(i * 10 * DEG) }; }))
      .map((h) => Object.assign(h, { b: bearing(h.x, h.z) }));
    // the holes marines-a-d's sentries take (its pickHole, in its order), so no two men stand in one hole
    const adHoles = new Set();
    for (const b of [165, 190, 212, 236, 262, 300, 130, 25]) {
      let best = -1, bd = 1e9;
      holes.forEach((h, j) => { if (adHoles.has(j)) return; const hb = ((Math.atan2(h.x, -h.z) / DEG) + 360) % 360, d = Math.abs(wrapA((hb - b) * DEG)); if (d < bd) { bd = d; best = j; } });
      adHoles.add(best);
    }
    const arc = holes.filter((h, j) => !adHoles.has(j) && h.b >= 228 && h.b <= 300).sort((a, b) => a.b - b.b);
    const RES = {};   // key -> { at, yaw, act, floor }
    const SEAT_H = (W && W.SEAT_H) || 0.4, HOLE_SINK = 0.5;
    const usedHoles = [];
    // a box is 0.40 high for every man; his seat is 0.40 x his scale: only a man of scale 0.99 or more sits on one, his
    // soles sunk the difference (at most about 2 cm) into the dirt so his hips meet the lid
    const boxOk = (key) => fig[key].f.scale >= 0.99;
    const boxSeat = (p, yaw, key) => {
      try { if (W && W.seat) W.seat(p[0], p[1], yaw, 'box'); } catch (e) { console.warn(NAME + ': WORKS.seat', e.message); }
      return gy(p[0], p[1]) - SEAT_H * (fig[key].f.scale - 1);
    };   // his soles on the ground beside the box
    {
      const ridge = xz(S.battleSummit);
      let k = 0;
      const men = CAST.map((c) => c.key).filter((k2) => !['himmer', 'rtoH', 'connelly', 'corpsman', 'cahill', 'rtoC'].includes(k2));
      const take = () => men[k++];
      // a man standing in each hole facing out (sunk 0.5); at every third hole his mate sits on the rear lip, legs in
      // the hole, half a metre along it so the two do not share a place
      arc.forEach((h, j) => {
        const a = take(); if (!a) return;
        const sx = -h.oz, sz = h.ox;   // along the hole
        const pa = [h.x + sx * 0.45 + h.ox * 0.1, h.z + sz * 0.45 + h.oz * 0.1];
        RES[a] = { at: pa, yaw: Math.atan2(h.ox, h.oz) + (H(j, 2) - 0.5) * 0.5, act: 'hole', floor: gy(pa[0], pa[1]) - HOLE_SINK };
        if (h.i !== undefined) usedHoles.push(h.i);
        if (j % 3 !== 1 || !h.seat) return;
        const b = take(); if (!b) return;
        const pb = [h.seat[0] - sx * 0.35, h.seat[1] - sz * 0.35];
        const lip = W && W.seat ? W.seat(pb[0], pb[1], h.seatYaw, 'lip') : { sink: SEAT_H };
        RES[b] = { at: pb, yaw: h.seatYaw, act: 'sit', floor: gy(pb[0], pb[1]) - lip.sink * fig[b].f.scale };   // the seat scales with the man (measured: hips - 0.03 = 0.40 x scale)
      });
      // the company's spot: Himmer, his radioman, Connelly; the corpsman sitting behind
      const hb = 256, hp = rIn(hb, 13);
      RES.himmer = { at: hp, yaw: yawTo(hp[0], hp[1], ridge[0], ridge[1]), act: 'cpt' };
      RES.rtoH = { at: [hp[0] + 1.3, hp[1] + 0.6], yaw: yawTo(hp[0] + 1.3, hp[1] + 0.6, hp[0], hp[1]) + 0.6, act: 'rto' };
      RES.connelly = { at: [hp[0] - 1.1, hp[1] + 1.2], yaw: yawTo(hp[0] - 1.1, hp[1] + 1.2, hp[0], hp[1]), act: 'stand' };
      { const pc = rIn(hb + 6, 17), yc = yawTo(pc[0], pc[1], hp[0], hp[1]); RES.corpsman = boxOk('corpsman') ? { at: pc, yaw: yc, act: 'sit', floor: boxSeat(pc, yc, 'corpsman') } : { at: pc, yaw: yc, act: 'kneel' }; }
      // lookers: watching the far ridge from just inside the line
      for (const b of [234, 247, 262, 279]) { const m = take(); if (!m) break; const p = rIn(b, 3.2); RES[m] = { at: p, yaw: yawTo(p[0], p[1], ridge[0], ridge[1]), act: 'look' }; }
      // three walking inside the line, back and forth on a 30 s beat
      for (const [b0, b1, d] of [[236, 252, 9], [258, 276, 11], [270, 288, 7]]) { const m = take(); if (!m) break; RES[m] = { at: rIn(b0, d), to: rIn(b1, d), act: 'walk' }; }
      // the rest further in, in twos and threes: on ammunition boxes (facing along the slope, so the feet are level
      // with the seat's ground), kneeling or crouched; nobody sits on the bare ground
      let i = 0;
      const boxes = [];
      while (k < men.length) {
        const m = take(), b = 232 + (i * 11.3) % 62, d = 8 + (i % 3) * 3.4 + H(i, 3) * 2, p = rIn(b, d);
        let act = i % 4 === 3 ? 'crouch' : i % 5 === 2 ? 'stand' : i % 3 === 1 ? 'kneel' : 'sit';
        if (act === 'sit' && !boxOk(m)) act = i % 2 ? 'kneel' : 'crouch';
        let yaw = H(i, 7) * TAU, at = p;
        if (act === 'sit') {
          // the box where the ground is level enough that both feet (heels and toes, 0.34-0.44 x scale ahead, 0.16 to
          // each side) are within a few centimetres of his soles' floor, facing roughly along the ring. The arc's slope
          // is 40-65 % from 15 m out (measured), so the boxes stand on the gentler crown, 9-17 m from the CP, on his
          // bearing (+-8 degrees), a box's length from any other; where none fits, he kneels instead
          const sc = fig[m].f.scale, y0 = (180 - b + (i % 2 ? 90 : -90)) * DEG;
          let best = 1e9;
          for (let rr = 9; rr <= 17; rr += 1) for (let db = -8; db <= 8; db += 2) {
            const c = [cp.x + Math.sin((b + db) * DEG) * rr, cp.z - Math.cos((b + db) * DEG) * rr], fl = gy(c[0], c[1]) - SEAT_H * (sc - 1);
            if (boxes.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 1.6)) continue;
            for (let da = -1.4; da <= 1.4; da += 0.1) {
              const yy = y0 + da, fx = Math.sin(yy), fz = Math.cos(yy);
              let e = 0;
              for (const [fw, sd] of [[0.34, 0.16], [0.34, -0.16], [0.44, 0.16], [0.44, -0.16]]) {
                const g = gy(c[0] + (fx * fw + fz * sd) * sc, c[1] + (fz * fw - fx * sd) * sc) - fl;
                e = Math.max(e, g < 0 ? -g * 2 : g);   // a hanging foot costs double a foot in the grass
              }
              const cost = e + Math.abs(da) * 0.002 + Math.abs(db) * 0.0005;
              if (cost < best) { best = cost; yaw = yy; at = c; }
            }
          }
          if (best > 0.04) act = 'kneel'; else boxes.push(at);
        }
        RES[m] = { at, yaw, act };
        if (act === 'sit') RES[m].floor = boxSeat(at, yaw, m);
        i++;
      }
      if (W && W.vacate && usedHoles.length) W.vacate(usedHoles);
      // Cahill and his radioman at the CP (only shown here if marines-a-d has not placed him)
      RES.cahill = { at: [cp.x + 1.0, cp.z + 2.2], yaw: Math.PI, act: 'cpt' };
      RES.rtoC = { at: [cp.x + 2.3, cp.z + 2.8], yaw: Math.PI + 0.5, act: 'rto' };
    }
    function reservePlan(key, L, ch) {
      const R = RES[key]; if (!R) return NOPE;
      const p = new Plan(R.at, R.yaw);
      p.seam = false;
      switch (R.act) {
        case 'kneel': p.hold(L, KNEEL(key)); break;
        case 'hole': p.hold(L, STAND(key), { floor: R.floor }); break;
        case 'sit': p.hold(L, 'Sitting Idle', { floor: R.floor }); break;
        case 'crouch': p.hold(L, CROUCH(key)); break;
        case 'stand': p.hold(L, STAND(key)); break;
        case 'look': p.hold(L, ch === 1 ? STAND(key) : 'Looking Around'); break;
        case 'walk': {
          for (let t0 = 0; t0 < L - 1; t0 += 30) {
            p.hold(t0 + 1.5, STAND(key)).go('Walk With Rifle', [R.to], 1.15, { until: t0 + 14.5 }).hold(t0 + 16.5, STAND(key)).go('Walk With Rifle', [R.at], 1.15, { until: t0 + 29.5 });
          }
          p.end(L); break;
        }
        case 'cpt': {
          if (ch === 1) p.hold(40, 'Looking Around').hold(43.2, 'Pointing', { face: xz(S.battleSummit) }).hold(L, 'Looking Around');
          else p.hold(L, 'Looking Around');
          break;
        }
        case 'rto': {
          const calls = key === 'rtoC' ? (ch === 3 ? [[32, 40], [42, 49], [50, 58]] : ch === 1 ? [[7, 14]] : [[20, 28]]) : (ch === 1 ? [[20, 32]] : ch === 3 ? [[30, 56]] : [[44, 52]]);
          for (const [a, b] of calls) p.hold(a, 'Looking Around').hold(b, 'Talking On Phone', { fade: 0.6 });
          p.hold(L, 'Looking Around');
          break;
        }
      }
      return p.end(L);
    }

    // ---- chapter 4: noon; form on the slope outside the wire; move off down the Charlie route at 60 ----
    const gate = toward(xz(S.perimSW), xz(cp), 6);
    function ch4Plan(key) {
      const L = 90, R = RES[key];
      const i = COLUMN.indexOf(key), rank = Math.floor(i / 2), file = i % 2 ? 1.25 : -1.25;
      // fix pass, spacing: two files, 2.8 m man to man in each (+-0.6; was 1.35), 10 m between the platoons
      const sF = 4 + (24 - rank) * 2.8 + (rank < RANK_P2 ? 10 : 0) + (H(i, 7) - 0.5) * 1.2;   // the lead rank furthest down the slope
      const formPts = slice(RC, 0, sF, file);
      const start = R.at;
      const p = new Plan(start, R.yaw);
      // the word comes: the radioman on the handset, Himmer points
      if (key === 'rtoH') p.hold(2, 'Looking Around').hold(10, 'Talking On Phone', { fade: 0.6 });
      if (key === 'himmer') p.hold(8, 'Looking Around').hold(11.2, 'Pointing', { face: xz(S.perimSW) });
      if (key === 'cahill') { p.hold(12, 'Looking Around'); }
      if (key === 'rtoC') p.hold(1, 'Looking Around').hold(7, 'Talking On Phone', { fade: 0.6 }).hold(12.6, 'Looking Around');
      const d0 = Math.hypot(start[0] - gate[0], start[1] - gate[1]);
      const leave = key === 'cahill' || key === 'rtoC' ? p.t : Math.max(p.t, 8 + (d0 / 30) * 3 + H(i, 5) * 5);
      const idle = R.act === 'sit' ? 'Sitting Idle' : R.act === 'kneel' ? KNEEL(key) : R.act === 'crouch' ? CROUCH(key) : STAND(key);
      // a seated man or a man in a hole keeps his floor (seg.floor) until he walks; the walk eases him up from it (evalSeg)
      if (R.act === 'walk') p.hold(leave, STAND(key)); else p.hold(leave, idle, { floor: R.floor });
      if (R.act === 'sit' || R.act === 'kneel') p.hold(leave + 1.4, STAND(key), { fade: 1.0, floor: R.act === 'sit' && R.floor < gy(R.at[0], R.at[1]) - 0.05 ? R.floor : undefined });
      const pts = [gate, xz(S.perimSW)].concat(formPts.slice(1));
      p.go('Walk With Rifle', pts, key === 'cahill' || key === 'rtoC' ? 1.0 : 1.15);
      const down = xz(S.crossing.from);
      p.hold(60 + rank * 0.5, STAND(key), { face: down });
      // move off: the column walks on down the route
      p.go('Walk With Rifle', slice(RC, sF, sF + 60, file).slice(1), 1.0);
      return p.end(L);
    }

    // ---- chapter 5: the climb, two files from the saddle; the halt 50 yards below the top ----
    // halt spots: platoon 1 across the slope below the pause, HQ near the centre, platoon 2 below
    const HALT = {};
    {
      P1.forEach((k, i) => { HALT[k] = AS(-7 - (i % 3) * 1.6 - H(i, 1) * 1.5, -17 + i * 1.7); });
      P2.forEach((k, i) => { HALT[k] = AS(-15.5 - (i % 3) * 1.7 - H(i, 2) * 1.5, -15 + i * 1.75); });
      Object.assign(HALT, { himmer: AS(-5, 3), rtoH: AS(-5.6, 4.4), connelly: AS(-11, 1), corpsman: AS(-12.5, 4), cahill: AS(-2.2, -3.5), rtoC: AS(-3.2, -5), r31: AS(-4, -8), r32: AS(-5, -10) });
    }
    const sJoin = RC.D - 17;
    const DRINK = ['r3', 'r9', 'r18', 'r24'];
    function ch5Plan(key) {
      const L = 120, i = COLUMN.indexOf(key), rank = Math.floor(i / 2), file = i % 2 ? 1.1 : -1.1;
      // fix pass, spacing: two files, 3.0 m man to man in each (+-0.6; was 1.5), 10 m between the platoons; the lead
      // rank leaves the lane at t 15 (was 50) so the last, 82 m back, is off it by about 83 and down by about 98
      const v = 1.2, gap = 3.0;
      const sC = sJoin;
      const s0 = sC - 15 * v - rank * gap - (rank >= RANK_P2 ? 10 : 0) - (H(i, 8) - 0.5) * 1.2;
      const spot = HALT[key];
      const p = new Plan(polyAt(RC, s0, [0, 0]), 0);
      p.yaw = Math.atan2(...(() => { const a = polyAt(RC, s0, [0, 0]), b = polyAt(RC, s0 + 1, [0, 0]); return [b[0] - a[0], b[1] - a[1]]; })());
      const walk = slice(RC, s0, sC, file).slice(1);
      p.go('Walk With Rifle', walk, v, { ramp: 0.01 });
      p.go('Rifle Crouch Walk', [spot], 0.62);
      const face = xz(S.battleSummit);
      if (key === 'cahill') {
        p.hold(Math.max(p.t + 2, 105), 'Looking Around', { face }).hold(110, 'Looking Around', { face }).hold(114.2, 'Pointing', { face, fade: 0.5 }).hold(L, 'Looking Around');
      } else if (key === 'rtoC') {
        p.hold(Math.max(p.t + 1, 111.5), 'Crouch Idle 02 Looking Around', { face }).hold(116.5, 'Talking On Phone', { fade: 0.6 }).hold(L, 'Looking Around');
      } else if (DRINK.includes(key)) {
        const t = p.t;
        p.hold(t + 1.5, STAND(key), { face }).hold(t + 6.5, 'Talking On Phone', { fade: 0.7 }).hold(t + 9, 'Kneeling Down', { fade: 0.5 }).hold(L, KNEEL(key));
      } else {
        p.hold(L, KNEEL(key), { face, fade: 0.6 });
      }
      // heads turn back toward 689 while the rockets fall (fire.js 60-80)
      const g = 61 + H(i, 9) * 13;
      p.glances.push({ t0: g, t1: g + 2.6 + H(i, 4) * 1.5, x: cp.x, z: cp.z });
      return p.end(L);
    }

    // ---- chapter 6: the attack ----
    // fire.js's firing points for Charlie (its P.C): along -9 - |side| * 0.12, side -22 + 5.5 i
    const PC = (i) => { const sd = -22 + 5.5 * i; return AS(-9 - Math.abs(sd) * 0.12, sd); };
    const L6 = {};   // end states of chapter 6 (for chapter 7)
    // Himmer lies with his head away from where Hunnicutt will be beside him in the night (fire.js's P.hun, 1.0 m west
    // and 0.8 m south of the fall point), so the corporal is at his shoulder, not on his legs
    const HIM_YAW = (Math.atan2(-1.0, 0.8) - 1.05) - headYaw;
    const FALL = { himmer: 21.0, pc1: 21.6, sl1: 22.0, pc2: 22.4, psgt: 23.1, sl3: 24.3, brown: 35.0 };
    // Abram's ruling (2026-11-09): men the record says were killed lie still; men it calls wounded breathe. Of these falls
    // only PFC Brown is recorded killed (research.md 3: KIA 16 Apr, DU); Himmer, both platoon commanders, the platoon
    // sergeant and the squad leaders "fell with wounds" (DY p. 315, Q7). The dead are left where they fell, never carried.
    const KILLED = { brown: true };
    const DEAD = { still: true, lie: true, down: true, time: DUR('Dying (1)') };   // clipTime clamps a one-shot to its last frame
    const deadPlan = (key, L) => { const e = L6[key]; const p = new Plan(e.at, e.yaw).hold(L, 'Dying (1)', DEAD).end(L); p.seam = false; return p; };
    // (works.js's horseshoe reaches down to the pause: bunkers at about along 0.5 side 2.5 and along 2.6 side 10.7, so the
    // rush stops just short of them; the six go on into the crater beside the next bunker up)
    const RUSH = { himmer: xz(S.himmerFall), pc1: AS(-3.6, 4.8), sl1: AS(-3.0, 15.8), psgt: AS(-4.6, 12.6), sl2: AS(-1.0, 16.5), r0: AS(0.4, 19), r1: AS(-2.2, 18.4), r2: AS(1.0, 21), r3: AS(-1.6, 14.0), r4: AS(-0.2, 17.4) };
    const SIX = ['sl2', 'r0', 'r1', 'r2', 'r3', 'r4'];
    const sixC = xz(S.craterSix), hunC = xz(S.hunnicuttCrater);
    const inCrater = (c, i, n, r) => { const a = i / n * TAU + 0.4; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; };
    const LINE = ['r5', 'r6', 'r7', 'hatcher', 'r8', 'r9', 'r10', 'r11', 'r12'];
    const LINEX = { r13: -19.25, r14: -8.25, r15: 2.75 };
    const HSQ = ['r16', 'r17', 'r18', 'r19'];
    const SALVO = [50.0, 50.9, 52.3, 53.8];
    const fireAt = (p, key, t0, t1, every, to) => { for (let t = t0 + H(key.length, t0) * every; t < t1; t += every * (0.8 + 0.4 * H(t, key.length))) p.fires.push({ t, n: 3, to }); };
    function ch6Plan(key) {
      const L = 90;
      const up6 = xz(S.battleSummit);
      const p1i = P1.indexOf(key), p2i = P2.indexOf(key);
      let p;
      if (key === 'himmer' || key === 'rtoH') {
        const a0 = key === 'himmer' ? AS(-18, 8) : AS(-19, 6.6);
        p = new Plan(a0, 0); p.yaw = yawTo(a0[0], a0[1], up6[0], up6[1]);
        p.hold(3, CROUCH(key)).go('Rifle Crouch Walk', [key === 'himmer' ? AS(-12, 8) : AS(-13, 6.8)], 1.1, { until: 13.6 }).hold(14.4, CROUCH(key), { face: up6 });
        if (key === 'himmer') {
          p.go('Rifle Run', [RUSH.himmer], 1.6, { until: 19.3 }).hold(FALL.himmer, 'Idle Crouching', { face: HIM_YAW, turn: 1.5 })
            .hold(FALL.himmer + 3.2, 'Dying (1)', { fade: 0.35 }).hold(L, LBF, { fade: 1.4, lie: true });
        } else {
          const nearH = AS(-2.6, 8.6), con = AS(-10.8, 2.8);
          p.go('Rifle Run', [nearH], 1.6, { until: 19.7 }).hold(20.6, 'Crouch Idle 02 Looking Around', { face: xz(S.secondPosition) })
            .hold(29, 'Crouch Idle 02 Looking Around', { face: xz(S.himmerFall) }).go('Rifle Crouch Walk', [con], 1.3, { until: 41 }).hold(L, 'Crouch Idle 02 Looking Around', { face: up6 });
          p.flinch.push(20.3);
        }
      } else if (LINE.includes(key) || LINEX[key] !== undefined) {
        const sd = LINE.includes(key) ? -22 + 5.5 * LINE.indexOf(key) : LINEX[key];
        const a0 = AS(-16, sd + 0.4), pc = LINE.includes(key) ? PC(LINE.indexOf(key)) : AS(-9 - Math.abs(sd) * 0.12, sd);
        p = new Plan(a0, yawTo(a0[0], a0[1], up6[0], up6[1]));
        const tgt = nearSlits[(LINE.indexOf(key) + 4) % nearSlits.length] || second;
        p.hold(2 + H(sd, 1), KNEEL(key)).go('Rifle Crouch Walk', [pc], 1.0, { until: 13.5 + H(sd, 2) }).hold(L, 'Rifle Kneel Idle', { face: [tgt[0], tgt[2]], fade: 0.5 });
        fireAt(p, key, 10, 88, 11, tgt);
        if (sd > 4) p.flinch.push(20.6 + H(sd, 3));
      } else if (p1i >= 0 || SIX.includes(key)) {
        // the rushers on the left: the platoon commander, platoon sergeant, a squad leader and the squad that ends in the
        // crater ahead
        const sd = 4 + p1i * 1.9 % 17, a0 = AS(-16, sd), mid = AS(-11, sd);
        p = new Plan(a0, yawTo(a0[0], a0[1], up6[0], up6[1]));
        p.hold(2.5, KNEEL(key)).go('Rifle Crouch Walk', [mid], 1.0, { until: 13.2 }).hold(14.2 + H(p1i, 3) * 0.6, KNEEL(key), { face: up6 });
        p.go('Rifle Run', [RUSH[key] || AS(1, sd)], 1.7, { until: 19.6 }).hold(FALL[key] || 21.4 + H(p1i, 5), CROUCH(key), { face: xz(S.secondPosition) });
        if (FALL[key]) p.hold(FALL[key] + 3.2, 'Dying (1)', { fade: 0.35 }).hold(L, LBF, { fade: 1.4, lie: true });
        else {
          const j = SIX.indexOf(key), c = inCrater(sixC, j, 6, 2.1);
          p.go('Rifle Run', [c], 2.0).hold(L, j % 2 ? 'Crouch Idle 02 Looking Around' : 'Idle Crouching', { face: xz(S.secondPosition), fade: 0.6 });
          p.flinch.push(...SALVO);
          if (j === 1) fireAt(p, key, 34, 88, 9, second);
        }
      } else if (p2i >= 0) {
        // platoon 2 in trace, weighted to the left
        const SIDES = { brown: -6, sl3: 8, panykaninec: 10, r16: 12, r17: 14, hunnicutt: 16, pc2: 18, r18: 20, r19: 22, rider: 24 };
        let sd = SIDES[key];
        if (sd === undefined) { const rest = P2.filter((k) => SIDES[k] === undefined); sd = -16 + rest.indexOf(key) * 2.1; if (sd > -7) sd += 2; }
        const a0 = AS(-26, sd), mid = AS(-19, sd);
        p = new Plan(a0, yawTo(a0[0], a0[1], up6[0], up6[1]));
        p.hold(3 + H(sd, 4), KNEEL(key)).go('Rifle Crouch Walk', [mid], 0.9, { until: 14.5 + H(sd, 5) }).hold(Math.min(FALL[key] || 99, 20.2 + H(sd, 6) * 2.5), 'Rifle Kneel Idle', { face: up6 });
        if (KILLED[key]) {
          // PFC Brown, killed (DU): a gentle fall, then still: the fall's last frame held, no breath (seg.still)
          p.hold(FALL[key] + DUR('Dying (1)') - 0.05, 'Dying (1)', { fade: 0.35 }).hold(L, 'Dying (1)', DEAD);
        } else if (FALL[key]) {
          p.hold(FALL[key] + 3.2, 'Dying (1)', { fade: 0.35 }).hold(L, LBF, { fade: 1.4, lie: true });
        } else if (key === 'hunnicutt') {
          const pc2 = AS(-19, 18), by = AS(-18.0, 17.0);
          p.hold(24, 'Prone Idle', { face: xz(S.secondPosition), fade: 0.7 }).go('Rifle Crouch Walk', [by], 1.0, { until: 26.2 }).hold(28.6, 'Kneeling Down', { face: pc2, fade: 0.4 })
            .hold(41, 'Rifle Kneel Idle', { face: pc2, fade: 0.5 }).hold(43.6, 'Kneeling Pointing', { face: hunC, fade: 0.5 }).hold(45, 'Rifle Kneel Idle', { face: hunC })
            .go('Rifle Run', [inCrater(hunC, 4, 5, 1.6)], 2.1).hold(L, 'Crouch Idle 02 Looking Around', { face: xz(S.secondPosition), fade: 0.6 });
          p.flinch.push(...SALVO);
        } else if (HSQ.includes(key)) {
          const j = HSQ.indexOf(key);
          p.hold(42.6 + j * 0.5, 'Prone Idle', { face: xz(S.secondPosition), fade: 0.7 }).go('Rifle Run', [inCrater(hunC, j, 5, 2.6)], 2.1).hold(L, j % 2 ? 'Idle Crouching' : 'Crouch Idle 02 Looking Around', { face: xz(S.secondPosition), fade: 0.6 });
          p.flinch.push(...SALVO);
        } else if (sd > 6) {
          p.hold(L, 'Prone Idle', { face: xz(S.secondPosition), fade: 0.8 });
          fireAt(p, key, 26, 88, 13, second);
          p.flinch.push(...SALVO);
        } else {
          p.hold(L, 'Rifle Kneel Idle', { face: up6 });
          if (sd > -2) p.flinch.push(...SALVO);
        }
      } else if (key === 'connelly') {
        const a0 = AS(-26, 2), c = AS(-10, 1.5);
        p = new Plan(a0, yawTo(a0[0], a0[1], up6[0], up6[1]));
        p.hold(3, KNEEL(key)).go('Rifle Crouch Walk', [AS(-19, 2)], 0.9, { until: 14.5 }).hold(26, 'Rifle Kneel Idle', { face: up6 })
          .go('Rifle Crouch Walk', [c], 1.55, { until: 37.6 }).hold(38.6, 'Rifle Kneel Idle', { face: up6 }).hold(42.2, 'Kneeling Pointing', { face: xz(S.secondPosition), fade: 0.5 })
          .hold(44, 'Rifle Kneel Idle', { face: up6 }).hold(50.3, 'Talking On Phone', { face: up6, fade: 0.6 }).hold(52, 'Kneeling Down', { fade: 0.35 }).hold(70, 'Rifle Kneel Idle', { face: up6 })
          .hold(73.5, 'Kneeling Pointing', { face: xz(S.secondPosition), fade: 0.5 }).hold(L, 'Rifle Kneel Idle', { face: up6 });
        p.flinch.push(...SALVO.slice(1));
      } else if (key === 'corpsman') {
        const a0 = AS(-27, 6);
        p = new Plan(a0, yawTo(a0[0], a0[1], up6[0], up6[1]));
        p.hold(3, 'Crouch Idle 02 Looking Around').go('Rifle Crouch Walk', [AS(-20, 6)], 0.9, { until: 14.5 }).hold(24.6, 'Crouch Idle 02 Looking Around', { face: up6 })
          .go('Rifle Run', [AS(-19.4, 9.4)], 1.4).hold(60, 'Kneeling Down', { face: AS(-19, 8), fade: 0.4 })
          .go('Rifle Run', [AS(-4.4, 14.2)], 2.0).hold(L, 'Kneeling Down', { face: RUSH.psgt, fade: 0.4 });
        p.flinch.push(...SALVO);
      } else if (key === 'cahill' || key === 'rtoC' || key === 'r31' || key === 'r32') {
        const at = { cahill: AS(-22, -10), rtoC: AS(-22.8, -11.5), r31: AS(-20.5, -13), r32: AS(-23.5, -7.5) }[key];
        p = new Plan(at, yawTo(at[0], at[1], up6[0], up6[1]));
        if (key === 'cahill') p.hold(30, 'Crouch Idle 02 Looking Around').hold(33, 'Kneeling Pointing', { face: up6, fade: 0.5 }).hold(L, 'Crouch Idle 02 Looking Around');
        else if (key === 'rtoC') p.hold(65.5, 'Crouch Idle 02 Looking Around').hold(71.5, 'Talking On Phone', { fade: 0.6 }).hold(75, 'Crouch Idle 02 Looking Around').hold(80.5, 'Talking On Phone', { fade: 0.6 }).hold(L, 'Crouch Idle 02 Looking Around');
        else p.hold(L, 'Rifle Kneel Idle', { face: up6 });
      } else return NOPE;
      p.end(L);
      const last = p.segs[p.segs.length - 1];
      L6[key] = { at: [p.x, p.z], yaw: p.yaw, clip: last.clip, lie: last.lie, still: last.still };
      return p;
    }

    // ---- chapter 7: pinned; Cahill to the LZ; the withdrawal order; carrying out the wounded ----
    const czlz = xz(S.czlz);
    // (the second litter carried PFC Brown until Abram's ruling of 2026-11-09: he was killed, and the dead were left; it
    // now carries the 2d Platoon's commander, wounded)
    const STRETCH7 = [{ a: 'r13', b: 'r14', w: 'sl3', t: 99.5 }, { a: 'r15', b: 'r22', w: 'pc2', t: 101.5 }];
    // A poncho litter (fix pass, carries): two bearers at the ends, the front man with his hands behind him on the
    // front corners, the rear man with his in front of him on the rear corners, at hip height (CM.grip), rifles slung;
    // two relief bearers walk ahead and behind. Side-by-side bearers were tried first: on the lane's steep cross-slopes
    // (up to 1.2 m over a metre) the poncho stood on edge. The wounded man lies in the sag (Laying Breathless, rifle gone).
    // All five ride one base path: each frame the bearers stand at fixed offsets from the litter's centre (litterPlace),
    // so the poncho never stretches; the bearers walk in step (one phase, one stride) at 0.8 of the file's pace.
    // spec: { base (Poly), s0, s1 (the litter's centre along base), tLift (< 0: already carried at t 0), until, L, v,
    //   w: { key, at, yaw }, bearers: [{ key, at, yaw, clip }] (front, relief, rear, relief) }
    const SLOTS = [[1.2, 0], [3.4, 0.15], [-1.2, 0], [-3.4, -0.15]];   // [along, right of the line]: front, relief, rear, relief
    const LITTERS = {};
    function stretcher(spec, plans, ch) {
      const { base, s0, s1, tLift, until, v } = spec;
      const dirAt = (s) => { const a = polyAt(base, s, [0, 0]), b = polyAt(base, s + 1, [0, 0]); return Math.atan2(b[0] - a[0], b[1] - a[1]); };
      const d0 = dirAt(s0), yawOff = Math.PI - headYaw;   // head to the rear
      const off = (s, al, lt) => { const p = polyAt(base, s + al, [0, 0]), y = dirAt(s + al); return [p[0] - Math.cos(y) * lt, p[1] + Math.sin(y) * lt]; };
      const lit = { base, s0, s1, tLift, w: spec.w.key, bearers: [], yawOff, ch };
      const pw = new Plan(tLift >= 0 ? spec.w.at : polyAt(base, s0, [0, 0]), tLift >= 0 ? spec.w.yaw : d0 + yawOff);
      if (tLift >= 0) {
        pw.hold(tLift, 'Laying Breathless', { lie: true, down: true });
        pw.go('Laying Breathless', [polyAt(base, s0, [0, 0])], 1, { until: tLift + 2.2, face: d0 + yawOff, lie: true, carried: true, turn: 1.4 });
      }
      pw.go('Laying Breathless', slice(base, s0, s1, 0).slice(1), v, { lie: true, carried: true, yawOff, ramp: tLift >= 0 ? 1.2 : 0.01, until });
      lit.carry = pw.segs[pw.segs.length - 1];
      plans[spec.w.key] = pw.end(spec.L);
      plans[spec.w.key].lit = lit;
      const ph = H(s0 * 7, 3), vn = VNAT['Walk With Rifle'] * 1.0;
      spec.bearers.forEach((B, j) => {
        const [al, lt] = SLOTS[j];
        const pb = new Plan(tLift >= 0 ? B.at : off(s0, al, lt), tLift >= 0 ? B.yaw : d0);
        if (tLift >= 0) {
          pb.hold(tLift - 7, B.clip || 'Prone Idle');
          pb.go('Rifle Crouch Walk', [off(s0, al, lt)], 1.2, { until: tLift - 0.6 });
          pb.hold(tLift + 0.4, 'Idle Crouching', { face: d0, fade: 0.5 }).hold(tLift + 2.2, LI, { face: d0, fade: 0.8 });
        }
        pb.go(LW, slice(base, s0 + al, s1 + al, lt).slice(1), v, { ramp: tLift >= 0 ? 1.2 : 0.01, until, ph, vn });
        plans[B.key] = pb.end(spec.L);
        plans[B.key].lit = lit;
        lit.bearers.push({ key: B.key, al, lt });
      });
      (LITTERS[ch] = LITTERS[ch] || []).push(lit);
    }
    // where a litter's centre is at t (along its base path), and each of its men stands: overrides E for that man
    const _lc = [0, 0], _ld = [0, 0];
    function litterS(lit, t) { const c = lit.carry; if (t <= c.t0) return lit.s0; return lit.s0 + trap(c, Math.min(t, c.t1) - c.t0); }
    function litterPlace(lit, key, t, seg) {
      const s = litterS(lit, t);
      polyAt(lit.base, s, _lc); polyAt(lit.base, Math.min(lit.base.D, s + 0.9), _ld);
      const y = Math.atan2(_ld[0] - _lc[0], _ld[1] - _lc[1]);
      const fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y);   // forward; left of the line = -(lx, lz)
      if (key === lit.w) {
        if (t < lit.tLift) return;
        // his hips a little forward of the centre: the poncho's middle is under his trunk
        const k = lit.tLift >= 0 ? sm((t - lit.tLift) / 1.6) : 1;
        E.x += (_lc[0] + fx * 0.12 - E.x) * k; E.z += (_lc[1] + fz * 0.12 - E.z) * k; E.yaw = lerpA(E.yaw, y + lit.yawOff, k);
        return;
      }
      if (seg.clip !== LW && seg.clip !== LI) return;
      const B = lit.bearers.find((q) => q.key === key);
      E.x = _lc[0] + fx * B.al - lx * B.lt; E.z = _lc[1] + fz * B.al - lz * B.lt; E.yaw = y;
    }
    function ch7Plans() {
      const L = 120, plans = {};
      const E = (k) => L6[k] || { at: AS(-20, 0), yaw: 0, clip: 'Rifle Kneel Idle' };
      const up6 = xz(S.battleSummit), sec = xz(S.secondPosition);
      for (const c of CAST) {
        const k = c.key, e = E(k);
        if (!L6[k]) continue;
        if (KILLED[k]) { plans[k] = deadPlan(k, L); continue; }
        const p = new Plan(e.at, e.yaw);
        if (k === 'cahill') {
          const route = [AS(-14, -16), AS(-30, -18), toward(czlz, AS(-30, -18), 6)];
          p.hold(8, 'Crouch Idle 02 Looking Around').go('Walk With Rifle', route.slice(0, 2), 1.0, { until: 40.5 }).go('Injured Walk', route.slice(2), 0.6, { until: 80 })
            .hold(92, 'Injured Idle', { face: czlz }).hold(95.5, 'Pointing', { face: [S.czlz.x + 10, S.czlz.z], fade: 0.5 }).hold(L, 'Injured Idle');
          p.flinch.push(22, 38, 56);
        } else if (k === 'rtoC') {
          const route = [AS(-15, -17.5), AS(-31, -19.5), toward(czlz, AS(-31, -19.5), 7.5)];
          p.hold(9.2, 'Crouch Idle 02 Looking Around').go('Walk With Rifle', route.slice(0, 2), 1.0, { until: 41.5 }).go('Walk With Rifle', route.slice(2), 0.62, { until: 81 })
            .hold(95, 'Looking Around', { face: czlz }).hold(110.5, 'Talking On Phone', { fade: 0.6 }).hold(L, 'Looking Around');
        } else if (k === 'hunnicutt') {
          const rim = toward(e.at, sec, 1.3);
          p.hold(69.5, e.clip).hold(70.2, 'Rifle Idle', { fade: 0.6, face: sec }).go('Walk With Rifle', [rim], 1.0, { until: 71.4 }).hold(L, 'Laying Breathless', { fade: 0.9, face: hunC, lie: true });
          p.flinch.push(71.2);
        } else if (k === 'rider' || k === 'r20' || k === 'r21') {
          const j = ['rider', 'r20', 'r21'].indexOf(k), dst = AS(-2 + j * 1.5, 33 + j * 1.8);
          p.hold(12 + j * 0.8, e.clip).go('Rifle Crouch Walk', [AS(-14, 31 + j), dst], 0.85, { until: 64 + j }).hold(69, 'Rifle Kneel Idle', { face: up6 });
          if (k === 'rider') p.hold(73, 'Kneeling Pointing', { face: up6, fade: 0.5 }).hold(L, 'Rifle Kneel Idle', { face: up6 });
          else p.hold(L, 'Rifle Kneel Idle', { face: up6 });
        } else if (k === 'panykaninec') {
          const rim = [hunC[0] - up.x * 7.2, hunC[1] - up.z * 7.2];
          p.hold(6, e.clip).go('Rifle Crouch Walk', [AS(-9, 22), rim], 0.9, { until: 37 }).hold(50.5, 'Prone Idle', { face: up6, fade: 0.7 }).hold(L, 'Laying Breathless', { fade: 1.6, lie: true });
          p.flinch.push(50.5);
          fireAt(p, k, 40, 49, 4, nearSlits[0] || second);
        } else if (k === 'hatcher') {
          p.hold(31.3, 'Rifle Kneel Idle').hold(34.5, 'Dying (1)', { fade: 0.35 }).hold(L, LBF, { fade: 1.4, lie: true });
          p.flinch.push(31.2);
          fireAt(p, k, 4, 30, 10, nearSlits[1] || second);
        } else if (k === 'corpsman') {
          p.hold(20, 'Kneeling Down').go('Rifle Run', [toward(RUSH.pc1, xz(pause), -1.0)], 1.2, { until: 32 }).hold(60, 'Kneeling Down', { face: RUSH.pc1, fade: 0.4 })
            .go('Rifle Run', [toward(RUSH.sl1, RUSH.pc1, 1.1)], 1.2, { until: 74 }).hold(L, 'Kneeling Down', { face: RUSH.sl1, fade: 0.4 });
        } else if (k === 'connelly') {
          p.hold(18, 'Rifle Kneel Idle', { face: up6 }).hold(21.5, 'Kneeling Pointing', { face: sec, fade: 0.5 }).hold(64, 'Rifle Kneel Idle', { face: up6 }).hold(L, 'Rifle Kneel Idle', { face: czlz });
        } else if (SIX.includes(k)) {
          p.hold(L, e.clip);
          if (k === 'r0') fireAt(p, k, 58, 66, 2.6, second);          // Kasminoff's covering fire for Hunnicutt (HN)
          else if (k === 'r2') fireAt(p, k, 10, 110, 14, second);
        } else if (e.lie) {
          p.hold(L, e.clip, { lie: true, down: true });
        } else if (LINE.includes(k) || LINEX[k] !== undefined) {
          const j = LINE.indexOf(k) + 1;
          if (j % 3 === 0) p.hold(L, 'Prone Idle', { face: e.yaw, fade: 0.8 });
          else p.hold(L, e.clip);
          fireAt(p, k, 5 + j, 115, 15, nearSlits[j % nearSlits.length] || second);
        } else {
          p.hold(L, e.clip);
          if (e.clip === 'Prone Idle') fireAt(p, k, 7, 115, 17, second);
        }
        if (FALL[k] || k === 'himmer') { p.segs.forEach((s) => { s.down = true; }); }
        plans[k] = p.end(L);
      }
      // the stretchers from about 99, as the medevacs come in (medevac.js 86-120)
      // four bearers each (fix pass, carries): the two named, and the two nearest riflemen still up who have no other
      // part in the chapter; the litter walks at the bearers' pace (0.72 m/s) and starts early enough to reach the LZ
      const busy = new Set(SIX.concat(['rider', 'r20', 'r21', 'r0', 'r2'], STRETCH7.flatMap((q) => [q.a, q.b, q.w])));
      for (const S7 of STRETCH7) {
        const w = E(S7.w), back = toward(w.at, AS(-30, -7), -3);
        const base = Poly([back, w.at, AS(-30, -7), toward(czlz, AS(-30, -7), 10)]);
        const bear = (k) => { const e = E(k); return { key: k, at: e.at, yaw: e.yaw, clip: e.clip }; };
        const pool = CAST.map((c) => c.key).filter((k) => /^r\d+$/.test(k) && L6[k] && !L6[k].lie && !FALL[k] && !busy.has(k))
          .sort((p, q) => Math.hypot(L6[p].at[0] - w.at[0], L6[p].at[1] - w.at[1]) - Math.hypot(L6[q].at[0] - w.at[0], L6[q].at[1] - w.at[1]));
        const extra = pool.slice(0, 2); extra.forEach((k) => busy.add(k));
        const v = 0.72, tLift = Math.min(S7.t, L - 2.2 - 1.2 - (base.D - 4) / v - 1);
        S7.tLift = tLift; S7.D = base.D;
        stretcher({ base, s0: 3, s1: base.D - 1, tLift, until: tLift + 2.2 + 1.2 + (base.D - 4) / v, v, L, w: { key: S7.w, at: w.at, yaw: w.yaw }, bearers: [S7.a, extra[0], S7.b, extra[1]].filter(Boolean).map(bear) }, plans, 7);
      }
      return plans;
    }

    // ---- chapter 8: dusk; the file goes down the withdrawal lane; Hunnicutt crawls to his captain ----
    // Panykaninec in chapters 8-10: lying at the rim of Hunnicutt's crater where he was hit, breathing
    function panyPlan(L) {
      const rim = [hunC[0] - up.x * 7.2, hunC[1] - up.z * 7.2];
      // placed lying (a new chapter, not his fall): head uphill (clay-v3/motion.js CM.uphillYaw), else toward the summit
      const yU = CM.uphillYaw ? CM.uphillYaw(ground, rim[0], rim[1], headYaw) : null;
      const pl = new Plan(rim, yU !== null ? yU : yawTo(rim[0], rim[1], S.battleSummit.x, S.battleSummit.z)).hold(L, 'Laying Breathless', { lie: true, down: true }).end(L);
      pl.seam = false; return pl;
    }
    function ch8Plans() {
      const L = 90, plans = {};
      const lead = [AS(-12, 1), AS(-28, -6)];
      const RWp = Poly(lead.concat([czlz]).concat(RW.pts.slice(1)));
      const czS = Poly(lead.concat([czlz])).D;
      // the file (fix pass, spacing and carries): about 3 m man to man (2.4-3.6), a litter and its two relief men taking 6.8 m with
      // a man's gap before and after; four bearers to a litter (the two of chapter 7 and two more); the whole file at
      // the litters' pace, 0.78 m/s; started far enough down the lane that its tail fades out past the LZ by about 88
      const FILE = ['r5', ['r13', 'sl3', 'r14', 'r6', 'r7'], 'hatcher', 'r8', ['r15', 'pc2', 'r22', 'r9', 'r10'], 'connelly', 'rtoH',
        ['r23', 'psgt', 'r24', 'r11', 'r12'], 'corpsman', 'r0', ['r25', 'pc1', 'r26', 'r1', 'r2'], 'sl2', 'r3', 'r4'];
      const v = 0.78, fadeAt = czS + 44;
      const fadeOut = (o, t, s) => 1 - sm((s - fadeAt) / 6);
      const hr = (k) => H(k * 13 + 5, 9);
      const slots = []; let sAcc = 0;
      FILE.forEach((item, u) => {
        if (u > 0) sAcc += Array.isArray(item) || Array.isArray(FILE[u - 1]) ? 3.4 + 2.8 : 2.4 + hr(u) * 1.2;   // a litter with its relief men is 6.8 m long
        slots.push(sAcc);
      });
      const sHead = fadeAt + 6 - v * 88 + sAcc;   // the last slot reaches the end of the fade at t 88
      let u = 0;
      const stretchers = [];
      for (const item of FILE) {
        const s0 = sHead - slots[u]; u++;
        if (Array.isArray(item)) { stretchers.push({ w: item[1], by: [item[0], item[3], item[2], item[4]], s0 }); continue; }
        const k = item, p = new Plan(polyAt(RWp, s0, [0, 0]), 0);
        const pts = slice(RWp, s0, s0 + v * L + 4, (u % 2 ? 0.25 : -0.25));
        p.x = pts[0][0]; p.z = pts[0][1];
        { const b = pts[1]; p.yaw = Math.atan2(b[0] - p.x, b[1] - p.z); }
        const clip = k === 'hatcher' ? 'Injured Walk' : 'Walk With Rifle';
        p.go(clip, pts.slice(1), v, { until: L, ramp: 0.01 });
        p.sFade = { P: RWp, s0, v };
        plans[k] = p.end(L);
      }
      for (const s of stretchers) {
        stretcher({ base: RWp, s0: s.s0, s1: s.s0 + v * L + 4, tLift: -1, until: L, v, L, w: { key: s.w }, bearers: s.by.map((k) => ({ key: k })) }, plans, 8);
        for (const k of s.by.concat([s.w])) plans[k].sFade = { P: RWp, s0: s.s0, v };
      }
      for (const k in plans) if (plans[k].sFade) plans[k].alphaFn = (t) => fadeOut(null, t, plans[k].sFade.s0 + plans[k].sFade.v * t);
      // Hunnicutt: from his crater, a low crawl across the slope to Himmer; he kneels and stays (NC)
      {
        const e = L6.hunnicutt ? L6.hunnicutt.at : inCrater(hunC, 4, 5, 1.6), fall = xz(S.himmerFall);
        const beside = [fall[0] - 0.9, fall[1] + 0.75];
        const p = new Plan(e, yawTo(e[0], e[1], fall[0], fall[1]));
        p.hold(8, 'Laying Breathless', { lie: true }).hold(9.2, 'Prone Idle', { face: fall, fade: 1.0 }).go('Low Crawl', [toward(beside, e, 1.2)], 0.45, { until: 49, ramp: 1.2 })
          .hold(50.5, 'Prone Idle', { fade: 0.8 }).hold(53.6, 'Kneeling Down', { face: fall, fade: 0.8 }).hold(L, 'Rifle Kneel Idle', { face: fall, fade: 0.6 });
        plans.hunnicutt = p.end(L);
      }
      // Himmer in the open, wounded, breathing. His squad's crater is empty in chapter 8: no fallen man but Himmer,
      // Hunnicutt beside him and Panykaninec at his crater's rim (left for dead, rescued alive the next evening: DY
      // p. 315, HN) is left on the field at the withdrawal (Abram's rulings, 2026-11-09)
      plans.himmer = new Plan(xz(S.himmerFall), L6.himmer ? L6.himmer.yaw : 0).hold(L, 'Laying Breathless', { lie: true }).end(L);
      plans.himmer.seam = false;
      plans.panykaninec = panyPlan(L);
      for (const k in KILLED) plans[k] = deadPlan(k, L);   // the dead stay where they fell
      return plans;
    }

    // ---- chapters 9-11: the two men ----
    const fallP = xz(S.himmerFall), hunP = [S.himmerFall.x - 1.0, S.himmerFall.z + 0.8];   // fire.js's P.hun
    function ch9Plans() {
      const L = 120, plans = {};
      const hy = L6.himmer ? L6.himmer.yaw : 0;
      plans.himmer = new Plan(fallP, hy).hold(L, 'Laying Breathless', { lie: true }).end(L); plans.himmer.seam = false;
      const p = new Plan(hunP, yawTo(hunP[0], hunP[1], fallP[0], fallP[1]));
      const slit = slit9, gt0 = 40.8 - RELEASE;
      p.hold(12.3, 'Idle Crouching', { face: fallP }).hold(30, 'Prone Idle', { face: slit, fade: 0.6 }).hold(35.3, 'Idle Crouching', { face: slit, fade: 1.0 })
        .hold(gt0, 'Prone Idle', { face: slit, fade: 0.6 }).hold(gt0 + DUR('Grenade Throw') - 0.1, 'Grenade Throw', { face: slit, fade: 0.25, time: 0 })
        .hold(90, 'Prone Idle', { face: slit, fade: 1.0 }).hold(L, 'Idle Crouching', { face: fallP, fade: 1.4 });
      p.glances.push({ t0: 50, t1: 56, x: fallP[0], z: fallP[1] }, { t0: 100, t1: 108, x: fallP[0], z: fallP[1] });
      // his single shots back at the slit, from his own rifle while prone (fire.js used to fire them from a fixed point)
      for (const t of [14.5, 15.3, 36.6, 37.2, 80.5]) p.fires.push({ t, n: 1, to: [slit[0], ground(slit[0], slit[1]) + 0.55, slit[1]] });
      p.seam = false;
      plans.hunnicutt = p.end(L);
      plans.panykaninec = panyPlan(L);
      for (const k in KILLED) plans[k] = deadPlan(k, L);
      return plans;
    }
    const coverP = toward(fallP, xz(S.dawnCover), 12.4);
    function ch10Plans() {
      const L = 90, plans = {};
      const hy = L6.himmer ? L6.himmer.yaw : 0;
      // which way the drag goes: Himmer's head leads toward the cover (Hunnicutt has him under the arms)
      const dragYaw = yawTo(fallP[0], fallP[1], coverP[0], coverP[1]);
      const himYaw = dragYaw - headYaw;
      // fix pass (review: his head passed through Himmer's): Hunnicutt kneels at Himmer's side, 0.7 m off the line
      // of the body on the side he came from and 0.3 m past the head, facing the shoulders; both move together
      const sdx = Math.cos(dragYaw), sdz = -Math.sin(dragYaw);
      const sgn = (hunP[0] - fallP[0]) * sdx + (hunP[1] - fallP[1]) * sdz >= 0 ? 1 : -1;
      const headAt = (b) => [b[0] + Math.sin(dragYaw) * (HEAD_LAY.len + 0.3) + sdx * 0.7 * sgn, b[1] + Math.cos(dragYaw) * (HEAD_LAY.len + 0.3) + sdz * 0.7 * sgn];
      const shoulders = (b) => [b[0] + Math.sin(dragYaw) * (HEAD_LAY.len - 0.35), b[1] + Math.cos(dragYaw) * (HEAD_LAY.len - 0.35)];
      const pH = new Plan(fallP, hy).hold(5, 'Laying Breathless', { lie: true });
      pH.hold(8.5, 'Laying Breathless', { lie: true, face: himYaw, turn: 3.0 });
      const pU = new Plan(hunP, yawTo(hunP[0], hunP[1], fallP[0], fallP[1]));
      pU.hold(4, 'Idle Crouching', { face: fallP }).go('Rifle Crouch Walk', [headAt(fallP)], 0.8, { until: 6.2 }).hold(8.5, 'Kneeling Down', { face: shoulders(fallP), fade: 0.5 });
      // a metre at a time: 2.4 s moving, 1.6 s still
      const n = Math.round(Math.hypot(coverP[0] - fallP[0], coverP[1] - fallP[1]));
      let t = 8.5;
      for (let i = 1; i <= n; i++) {
        const b = toward(fallP, coverP, i * Math.hypot(coverP[0] - fallP[0], coverP[1] - fallP[1]) / n);
        pH.go('Laying Breathless', [b], 1, { until: t + 2.4, face: himYaw, lie: true, ramp: 1.1 }).hold(t + 4, 'Laying Breathless', { lie: true });
        pU.go('Rifle Kneel Idle', [headAt(b)], 1, { until: t + 2.4, face: shoulders(b), ramp: 1.1, fade: i === 1 ? 0.7 : undefined }).hold(t + 4, 'Rifle Kneel Idle');
        t += 4;
      }
      pH.hold(L, 'Laying Breathless', { lie: true });
      const gE = xz(S.gullyEdge);
      pU.hold(t + 3.5, 'Crouch Idle 02 Looking Around').hold(t + 5.0, 'Prone Idle', { face: gE, fade: 1.0 })
        .go('Low Crawl', [toward([pU.x, pU.z], gE, 8)], 0.55, { until: 76, ramp: 1.2 });
      pU.end(L);
      pU.alphaFn = (tt) => 1 - sm((tt - 72.5) / 3.2);
      pU.glances.push({ t0: t + 0.5, t1: t + 3.4, x: coverP[0], z: coverP[1] });
      // (crawl-fix pass) one drag: the crowd separation does not push Hunnicutt off the man he is moving
      pH.group = pU.group = 'drag10';
      plans.himmer = pH.end(L); plans.hunnicutt = pU; plans.panykaninec = panyPlan(L);
      for (const k in KILLED) plans[k] = deadPlan(k, L);
      return plans;
    }
    function ch11Plans() {
      const plans = {};
      const dragYaw = yawTo(fallP[0], fallP[1], coverP[0], coverP[1]);
      plans.himmer = new Plan(coverP, dragYaw - headYaw).hold(120, 'Laying Breathless', { lie: true }).end(120); plans.himmer.seam = false;
      return plans;
    }

    // ---------- the plans by chapter (built on first entry) ----------
    const adHasCahill = () => {
      const ad = window.MARINES_AD; if (!ad) return false;
      const fg = ad.figures;
      return !!(ad.cahill || (ad.radios && ad.radios.cahill) || (fg && (fg.cahill || (Array.isArray(fg) && fg.some((x) => x && (x.key === 'cahill' || x.name === 'cahill'))))));
    };
    const PLANS = {};
    function plansFor(ch) {
      if (PLANS[ch]) return PLANS[ch];
      const out = {};
      const L = (ctx.CHAPTERS.find((c) => c.id === ch) || { loop: 60 }).loop;
      if (ch <= 3) {
        const mine = !adHasCahill();
        for (const c of CAST) out[c.key] = (c.key === 'cahill' || c.key === 'rtoC') && !mine ? NOPE : reservePlan(c.key, L, ch);
      } else if (ch === 4) for (const c of CAST) out[c.key] = ch4Plan(c.key);
      else if (ch === 5) for (const c of CAST) out[c.key] = ch5Plan(c.key);
      else if (ch === 6) for (const c of CAST) out[c.key] = ch6Plan(c.key);
      else {
        if (!L6.himmer) for (const c of CAST) ch6Plan(c.key);
        const sub = ch === 7 ? ch7Plans() : ch === 8 ? ch8Plans() : ch === 9 ? ch9Plans() : ch === 10 ? ch10Plans() : ch11Plans();
        for (const c of CAST) out[c.key] = sub[c.key] || NOPE;
      }
      for (const k in out) { const p = out[k]; if (p.segs) { for (let i = 1; i < p.segs.length; i++) p.segs[i].prev = p.segs[i - 1]; } }
      PLANS[ch] = out;
      return out;
    }

    // ---------- evaluating a plan ----------
    const E = { x: 0, z: 0, yaw: 0, s: 0, lift: 0 };
    const tmp2 = [0, 0], tmp3 = [0, 0];
    function trap(seg, tau) {
      const T = seg.t1 - seg.t0, D = seg.P.D, r = Math.min(seg.ramp, T / 2) || 1e-4, v = D / (T - r);
      if (tau <= 0) return 0;
      if (tau >= T) return D;
      if (tau < r) return v * tau * tau / (2 * r);
      if (tau < T - r) return v * (tau - r / 2);
      const q = T - tau; return D - v * q * q / (2 * r);
    }
    function evalSeg(seg, t) {
      const tau = t - seg.t0;
      if (seg.k === 'hold') { E.x = seg.x; E.z = seg.z; E.yaw = lerpA(seg.yaw0, seg.yaw, sm(tau / (seg.turn || 0.9))); E.s = 0; }
      else {
        const s = trap(seg, tau);
        polyAt(seg.P, s, tmp2); E.x = tmp2[0]; E.z = tmp2[1]; E.s = s;
        if (seg.face !== undefined) E.yaw = lerpA(seg.yaw0, faceOf(seg.face, E.x, E.z, seg.yaw0), sm(tau / 0.6));
        else {
          polyAt(seg.P, Math.min(seg.P.D, s + 0.9), tmp3); polyAt(seg.P, Math.max(0, s - 0.9), tmp2);
          const dx = tmp3[0] - tmp2[0], dz = tmp3[1] - tmp2[1];
          const y = (dx * dx + dz * dz > 1e-6 ? Math.atan2(dx, dz) : seg.yaw0 - (seg.yawOff || 0)) + (seg.yawOff || 0);
          E.yaw = lerpA(seg.yaw0, y, sm(tau / 0.6));
        }
      }
      // his floor (fix pass, seats): a seated man's soles go to seg.floor (a hole's lip less WORKS.SEAT_H, or the ground
      // by his box), a man in a hole stands on its floor; the segment after eases him up to the ground over 1.2 s
      const pf = seg.prev && seg.prev.floor;
      E.floor = seg.floor !== undefined ? seg.floor : pf !== undefined && tau < 1.2 ? pf + (ground(E.x, E.z) - pf) * sm(tau / 1.2) : undefined;
      const lf = seg.lift;
      E.lift = !lf ? 0 : typeof lf === 'number' ? lf : lf.a + (lf.b - lf.a) * sm((t - lf.t0) / (lf.t1 - lf.t0));
    }
    function findSeg(p, t) { const s = p.segs; for (let i = 0; i < s.length; i++) if (t < s[i].t1) return i; return s.length - 1; }
    function clipTime(o, seg, t) {
      const clip = CM.clips[seg.clip], d = clip.duration, ud = clip.userData;
      if (seg.k === 'move' && (ud.cfg.mode === 'plant' || seg.clip === 'Low Crawl')) return ((seg.ph !== undefined ? seg.ph : o.f.v.phase) * d + E.s / (seg.vn || vnat(o, seg.clip))) % d;
      if (seg.k === 'move') return (o.f.v.phase * d + (t - seg.t0)) % d;
      if (ud.cfg.mode === 'once') return Math.min(t - seg.t0 + (seg.time || 0), d - 0.02);
      return ((seg.time !== undefined ? seg.time : o.f.v.phase * d) + (t - seg.t0)) % d;
    }
    function hardReset(o, seg, t) {
      const f = o.f;
      f.mixer.stopAllAction();
      f.cur = null;
      CM.play(f, seg.clip, { fade: 0, time: clipTime(o, seg, t) });
      f.feet = null; f.locks = null; f.lift = undefined; f.sSpeed = undefined; f.sVx = undefined; f.drop = null;
      if (f.sp && f.sp.rifle) f.sp.rifle.init = false;
      o.fresh = true;
    }

    // ---------- gestures laid over the clips (after CM.update) ----------
    const UPV = new THREE.Vector3(0, 1, 0), RGT = new THREE.Vector3(-1, 0, 0), _q = new THREE.Quaternion();
    const premul = (bone, axis, a) => { if (a) { _q.setFromAxisAngle(axis, a); bone.quaternion.premultiply(_q); } };
    const bump = (x) => (x < 0 ? 0 : x < 0.12 ? x / 0.12 : Math.exp(-(x - 0.12) / 0.55));
    const camV = new THREE.Vector3();
    function gestures(o, p, seg, t) {
      const f = o.f, b = f.b;
      let gw = 0, rel = 0;
      if (!seg.lie) {
        for (const g of p.glances) {
          if (t < g.t0 || t > g.t1) continue;
          const w = sm((t - g.t0) / 0.7) * sm((g.t1 - t) / 0.7);
          if (w > gw) { gw = w; rel = clamp(wrapA(yawTo(f.x, f.z, g.x, g.z) - f.yaw), -1.5, 1.5); }
        }
        // a tap: he looks up toward the viewer for a few seconds
        if (o.tapAt !== undefined) {
          const k = ctx.clock.elapsed - o.tapAt;
          if (k >= 0 && k < 3.6) { const w = sm(k / 0.6) * sm((3.6 - k) / 0.8); if (w > gw) { gw = w; rel = clamp(wrapA(yawTo(f.x, f.z, ctx.camera.position.x, ctx.camera.position.z) - f.yaw), -1.4, 1.4); } }
        }
        if (gw > 0) { premul(b.mixamorigSpine2, UPV, rel * gw * 0.25); premul(b.mixamorigNeck, UPV, rel * gw * 0.4); premul(b.mixamorigHead, UPV, rel * gw * 0.3); }
      }
      let fw = 0;
      for (const ft of p.flinch) fw = Math.max(fw, bump(t - ft));
      if (fw > 0.001) { premul(b.mixamorigSpine1, RGT, -0.28 * fw); premul(b.mixamorigNeck, RGT, -0.3 * fw); premul(b.mixamorigHead, RGT, -0.12 * fw); }
    }
    // the rifle lies on the ground beside a fallen man (deterministic), or is hidden while he is carried
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(0, 1, 0), _rq = new THREE.Quaternion();
    function rifleGround(o, seg) {
      const f = o.f; if (!f.F.grip) return;
      const r = f.b.rifle;
      if (seg.carried) { _m.makeScale(1e-4, 1e-4, 1e-4).premultiply(_m.clone().makeTranslation(f.x, ground(f.x, f.z), f.z)); }
      else {
        if (!o.rifleG) {
          const a = f.yaw + 1.1, px = f.x + Math.sin(f.yaw - 1.2) * 0.55, pz = f.z + Math.cos(f.yaw - 1.2) * 0.55;
          // on its side on the slope (clay-v3/motion.js CM.groundRest), not flat in the air over a downhill side
          const q = new THREE.Quaternion(), pp = CM.groundRest(f, _p.set(px, 0, pz), _bx.set(Math.sin(a), 0, Math.cos(a)), true, new THREE.Vector3(), q);
          o.rifleG = { p: pp, q };
        }
        if (f.drop && !f.drop.patched) { f.drop.p1.copy(o.rifleG.p); f.drop.q1.copy(o.rifleG.q); f.drop.patched = true; }
        if (seg.clip === 'Dying (1)' && !seg.still) return;   // the fall lets go and settles it there itself; once he is still it stays where it settled
        _m.compose(o.rifleG.p, o.rifleG.q, _s.set(1, 1, 1).multiplyScalar(f.scale));
      }
      const inv = _m.clone(); void inv;
      f.F.mesh.updateMatrixWorld(true);
      const loc = new THREE.Matrix4().copy(f.F.mesh.matrixWorld).invert().multiply(_m);
      loc.decompose(r.position, r.quaternion, r.scale);
      r.updateMatrixWorld(true);
    }

    // ---------- labels ----------
    const SHOWN = (key) => (ch) => { const p = plansFor(ch.id)[key]; return !!(p && !p.hidden); };
    for (const o of figs) {
      if (!o.c.label) continue;
      ctx.tag(o.c.label, () => o.head, { when: SHOWN(o.key), onTap: () => { o.tapAt = ctx.clock.elapsed; } });
    }
    const sixCentre = new THREE.Vector3(S.craterSix.x, S.craterSix.y + 1.2, S.craterSix.z);
    ctx.tag('crater6', () => sixCentre, { r: 5, when: (ch) => ch.id === 6 || ch.id === 7 });

    // ---------- radios for radio.js ----------
    const antOf = (o) => (o.F.root.visible && o.antOk ? o.ant : null);
    let theirCahill = null;
    const RADIOS = {
      himmer: () => antOf(fig.rtoH),
      connelly: () => antOf(fig.rtoH),
      cahill: () => { const mine = antOf(fig.rtoC); if (mine) return mine; const th = theirCahill; return typeof th === 'function' ? th() : th || null; },
    };
    function installRadios() {
      const m = window.marines = window.marines || {};
      m.radios = m.radios || {};
      if (m.radios.cahill && m.radios.cahill !== RADIOS.cahill) theirCahill = m.radios.cahill;
      for (const k in RADIOS) if (m.radios[k] !== RADIOS[k]) m.radios[k] = RADIOS[k];
    }
    installRadios();
    window.MARINES_C = { figures: fig, radios: RADIOS, plansFor, litters: LITTERS, ground, RC, calib: { VNAT, RELEASE, HEAD_LAY } };

    // ---------- litters (fix pass, carries): a sagging poncho between the four bearers' near hands ----------
    const PONS = []; for (let i = 0; i < 6; i++) PONS.push(CM.poncho(ctx.scene, ctx.lin(0x4a5536)));
    const _h = new THREE.Vector3(), _sh = new THREE.Vector3(), _t = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const _c = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], _fw = new THREE.Vector3();
    function litterFrame(lit, t, k) {
      const W = fig[lit.w];
      if (!W || !W.F.root.visible || lit.bearers.length < 3) return false;
      const Fr = fig[lit.bearers[0].key], Rr = fig[lit.bearers[2].key];
      if (!Fr.F.root.visible || !Rr.F.root.visible) return false;
      const lifted = lit.tLift < 0 ? 1 : sm((t - lit.tLift - 0.4) / 1.6);
      const s = litterS(lit, t); polyAt(lit.base, s, tmp2); polyAt(lit.base, Math.min(lit.base.D, s + 0.9), tmp3);
      const yaw = Math.atan2(tmp3[0] - tmp2[0], tmp3[1] - tmp2[1]); _fw.set(Math.sin(yaw), 0, Math.cos(yaw));
      const rx = -Math.cos(yaw), rz = Math.sin(yaw);   // his right
      const bob = 0.012 * Math.sin(t * 2 * Math.PI * 1.7);
      // each end man's two grips: behind him (front man) or before him (rear man), a shoulder-width apart, at the
      // height his hanging arm reaches (on the ground before the lift)
      [[Fr, -0.3, 0], [Rr, 0.34, 2]].forEach(([o, fwd, j]) => {
        const f = o.f; let arm = 0, sy = 0;
        for (const sd of ['Left', 'Right']) {
          f.b['mixamorig' + sd + 'Arm'].getWorldPosition(_sh); sy += _sh.y / 2;
          arm += (_sh.distanceTo(f.b['mixamorig' + sd + 'ForeArm'].getWorldPosition(_h)) + _h.distanceTo(f.b['mixamorig' + sd + 'Hand'].getWorldPosition(_c[3])) + 0.07 * f.scale) / 2;
        }
        const r0 = o.F.root.position, gy0 = ground(r0.x, r0.z);
        const y = (gy0 + 0.1) + ((sy - arm * 0.88) - (gy0 + 0.1)) * lifted + bob;
        for (const [sd, sg] of [['Left', 1], ['Right', -1]]) {
          const v = _t[j + (sd === 'Left' ? 0 : 1)];
          v.set(r0.x + _fw.x * fwd + rx * sg * 0.24 * -1, Math.max(y, sy - arm * 0.97), r0.z + _fw.z * fwd + rz * sg * 0.24 * -1);
        }
        CM.grip(f, _t[j], _t[j + 1], { lean: (fwd > 0 ? 0.14 : 0.06) * lifted });
      });
      // corners: front-left, front-right (the front man's hands), rear-right, rear-left (the rear man's)
      _c[0].copy(_t[0]); _c[1].copy(_t[1]); _c[2].copy(_t[3]); _c[3].copy(_t[2]);
      const sag = 0.2 + 0.08 * lifted;
      const P = PONS[k]; P.set(_c[0], _c[1], _c[2], _c[3], sag);
      const al = W.mesh.material === W.fade ? W.fade.opacity : 1, pm = P.mesh.material;
      if ((al < 0.997) !== pm.transparent) { pm.transparent = al < 0.997; pm.needsUpdate = true; } pm.opacity = al;
      // the man lies in the sag: his hips just above the poncho's lowest point; pitched with the poncho's slope
      const want = (_c[0].y + _c[1].y + _c[2].y + _c[3].y) / 4 - sag * 0.95 + 0.05;
      W.f.b.mixamorigHips.getWorldPosition(_h);
      W.F.root.position.y += want - _h.y;
      W.F.root.updateMatrixWorld(true);
      return true;
    }

    // ---------- the frame ----------
    // a man fires only when he holds still in a firing position: standing, kneeling, crouched or prone, rifle up;
    // never walking, running, crawling, carrying, hit or lying hurt
    const FIRING = /^(Rifle Idle|Rifle Kneel Idle|Idle Crouching|Crouch Idle 02 Looking Around|Prone Idle)$/;
    const canFire = (seg) => seg && seg.k === 'hold' && FIRING.test(seg.clip) && !seg.down && !seg.carried && !seg.lie;
    const FSTAT = { fired: 0, pose: 0, aim: 0 };   // his shots this session: fired, held back (not in a firing position), held back (rifle not on the target)
    if (window.MARINES_C) window.MARINES_C.fireStats = FSTAT;
    let curCh = -1, lastT = -1, frame = 0;
    const firePos = new THREE.Vector3(), fireDir = new THREE.Vector3(), fireTo = new THREE.Vector3();
    st.run = function (tAbs, dt) {
      frame++;
      const ch = ctx.chapter.id, t = ctx.cycle.t, L = ctx.cycle.length;
      const changed = ch !== curCh;
      const wrapped = !changed && t < lastT - 1;
      const jumped = changed || (!wrapped && Math.abs(t - lastT - dt) > 0.35);
      curCh = ch;
      const plans = plansFor(ch);
      if (frame < 90 || frame % 30 === 0) installRadios();   // final pass: marines-a-d.js loads after and takes Cahill's key; win it back on the first frames, so radio.js never draws from its fallback point
      camV.copy(ctx.camera.position);
      // the base fades a one-way chapter to black at its seam (index.html LOOP SEAM), so no figure fades of its own then
      const seamA = ctx.chapter.def && ctx.chapter.def.seam !== 'cut' ? 1 : sm(t / 1.2) * sm((L - t) / 1.2);
      for (const o of figs) {
        const p = plans[o.key], F = o.F, f = o.f;
        if (!p || p.hidden) { if (F.root.visible) { F.root.visible = false; o.blob.hide(); } o.antOk = false; o.seg = -1; continue; }
        const i = findSeg(p, t), seg = p.segs[i];
        evalSeg(seg, t);
        if (p.lit) litterPlace(p.lit, o.key, t, seg);
        // alpha: the seam, and any fade of the plan's own
        let a = p.seam ? seamA : 1;
        if (p.alphaFn) a *= p.alphaFn(t);
        if (a <= 0.003) { if (F.root.visible) { F.root.visible = false; o.blob.hide(); } o.antOk = false; o.seg = -1; o.needReset = true; continue; }
        const show = !F.root.visible;
        F.root.visible = true;
        if (a < 0.997) { if (o.mesh.material !== o.fade) o.mesh.material = o.fade; o.fade.opacity = a; }
        else if (o.mesh.material !== mat) o.mesh.material = mat;
        // crowd separation (clay-v3/motion.js CM.crowd*, fix pass hill689): a moving man steps round the others; a litter
        // party (bearers, relief men and the man on it) does not push itself apart
        {
          const st = o.crowd || (o.crowd = { ox: 0, oz: 0 });
          if (jumped) st.ox = st.oz = 0;
          const mov = seg.k === 'move' && !seg.carried, grp = p.lit || p.group || null, vx = Math.sin(E.yaw), vz = Math.cos(E.yaw);
          if (mov && CM.crowdOffset) CM.crowdOffset(tAbs, dt, 'c' + o.key, E.x, E.z, vx, vz, grp, st);
          if (CM.crowdAdd) CM.crowdAdd(tAbs, 'c' + o.key, E.x + st.ox, E.z + st.oz, seg.lie || seg.down || seg.carried ? 0.9 : 0.4, mov, mov ? vx : 0, mov ? vz : 0, grp);
          E.x += st.ox; E.z += st.oz;
        }
        f.x = E.x; f.z = E.z; f.yaw = E.yaw; o.floor = E.floor; f.raw = !!seg.still;
        // the clip
        const seamJump = wrapped && (p.seam || (o.seg !== i && seg.clip !== f.cur));
        if (jumped || seamJump || show || o.needReset) { hardReset(o, seg, t); o.rifleG = null; o.needReset = false; }
        else if (o.seg !== i) {
          if (seg.clip !== f.cur) CM.play(f, seg.clip, { fade: seg.fade !== undefined ? seg.fade : 0.45, time: clipTime(o, seg, t) });
        }
        o.seg = i;
        const act = f.acts[seg.clip];
        if (seg.k === 'move' && act && (CM.clips[seg.clip].userData.cfg.mode === 'plant' || seg.clip === 'Low Crawl')) { act.timeScale = 0; act.time = clipTime(o, seg, t); }
        if (seg.down === undefined && !seg.carried && o.rifleG && seg.clip !== 'Dying (1)' && !(seg.prev && seg.prev.clip === 'Dying (1)')) o.rifleG = null;
        // update: every frame near, every 2nd past 40 m, every 3rd past 90 m (CLAUDE.md budget)
        const d = Math.hypot(f.x - camV.x, f.z - camV.z);
        const every = o.fresh || p.lit ? 1 : d > 90 ? 3 : d > 40 ? 2 : 1;
        o.acc += dt;
        // before his own burst he brings the rifle up onto what he fires at (f.aimAt, CM), and holds it there until the
        // burst is done; the kick of each round climbs the muzzle a little (fix pass)
        f.aimK = 0;
        if (p.fires.length && canFire(seg)) for (const fr of p.fires) {
          const a = t - (fr.t - 0.45), b = t - (fr.t + fr.n / 9 + 0.25);
          if (a < 0 || b > 0.35) continue;
          f.aimAt = o.aimV || (o.aimV = new THREE.Vector3()); o.aimV.set(fr.to[0], fr.to[1], fr.to[2]);
          f.aimK = sm(a / 0.3) * (1 - sm(b / 0.35)); break;
        }
        f.kick = 0;
        if (o.kickT0 !== undefined && t >= o.kickT0 && t < o.kickT0 + o.kickN / 9 + 0.35) for (let k = 0; k < o.kickN; k++) { const a = t - (o.kickT0 + k / 9); if (a >= 0) f.kick += Math.exp(-a * 22); }
        if ((frame + o.c.seed) % every === 0 || o.fresh || f.kick > 0.01 || f.aimK > 0.01) {
          CM.update(f, o.fresh ? 1 / 60 : Math.min(0.1, o.acc), t);
          o.acc = 0; o.fresh = false;
          gestures(o, p, seg, t);
          CM.settle(f);   // the rifle rides with the chest the glance or flinch turned
          const down = seg.down || seg.carried || (seg.prev && seg.prev.clip === 'Dying (1)') || seg.clip === 'Dying (1)';
          if (down) rifleGround(o, seg);
          if (E.lift) { F.root.position.y += E.lift; F.root.updateMatrixWorld(true); }
          if (o.c.kind === 'radioman') { const r = CM.radioPoints(f); if (r) { o.ant.copy(r.antennaTip); o.antOk = true; } }
        } else {
          CM.place(f, E.lift || 0);   // tilted to the slope as the last update left him (clay-v3/motion.js ground layer)
        }
        f.b.mixamorigHead.getWorldPosition(o.head);
        o.blob.set(f.x, gy(f.x, f.z), f.z, seg.lie ? 1.7 : E.lift ? 0.6 : 1);
        // his own shots: the muzzle flash and rounds from where his rifle points (fire.js draws them)
        if (!jumped && !wrapped && p.fires.length && window.FIRE && window.FIRE.burst) {
          for (const fr of p.fires) {
            if (fr.t > lastT && fr.t <= t && f.F.grip && CM.muzzle(f, firePos, fireDir)) {
              if (!canFire(seg)) { FSTAT.pose++; FSTAT.last = o.key + ' ' + seg.clip + ' ' + seg.k; continue; }
              fireTo.set(fr.to[0], fr.to[1], fr.to[2]);
              // only a man whose rifle points at what he fires at (within 35 degrees)
              if (fireDir.angleTo(fireTo.clone().sub(firePos)) > 0.61) { FSTAT.aim++; FSTAT.lastAim = o.key + ' ' + seg.clip + ' ' + Math.round(fireDir.angleTo(fireTo.clone().sub(firePos)) * 57.3); continue; }
              FSTAT.fired++;
              window.FIRE.burst(firePos, fireDir, fr.n, { side: 'us', to: fireTo, rate: 9, src: 'C:' + o.key });
              o.kickT0 = t; o.kickN = fr.n;
            }
          }
        }
      }
      let nl = 0;
      for (const lit of LITTERS[ch] || []) if (nl < PONS.length && litterFrame(lit, t, nl)) nl++;
      for (let i = nl; i < PONS.length; i++) PONS[i].hide();
      lastT = t;
    };
    releaseReady();
  }
})();
