// marines-a-d.js (plug-in "marines-a-d"): Companies A and D of 1/9, the battalion CP on Hill 689 and the 689 perimeter
// sentries, on the clay v3 figures (clay-v3/FIGURES.md) with Mixamo clips and the natural-motion layer (CM).
// DESIGN.md 2, 5, 6, 9; DECISIONS.md "The fighting", "Command and radio", "Motion"; research.md 2, 3, 10.
//
// Cast (106 figures, one skinned draw each when in view): Company A 45 (Banks, his radioman, Lovely, Hayden and his
// platoon sergeant, two corpsmen, 38 riflemen), Company D 45 (Cargile, his radioman, a corpsman, 42 riflemen), the CP
// 6 (Hartzell, Donnelly, Engel, the CP radioman; LtCol Cahill and his radioman in chapters 1-4 only: marines-c owns
// Cahill from chapter 5), 10 sentries on the perimeter. Hero meshes (lod 1) for the named men, the radiomen and the two
// squads that push into the grass in chapter 3; the far mesh (lod 0) for everyone else.
//
// Everything is a pure function of ctx.chapter.id and ctx.cycle.t: each figure has, per chapter, a list of steps
// (hold a clip, walk a path, play a one-shot, hide) compiled once. Each frame the step at cycle.t is evaluated, clip
// times and weights are set directly on the figure's actions (no mixer time accumulates), the root is placed, and CM
// runs its layers (rifle, kit, look, load, face). Crossfades between steps; the loop's seam blends when the state at
// the end matches the start, and cuts where the score itself resets (a fall, a walk out). Figures out of view are not
// updated; past 40 m they update every 2nd frame, past 120 m every 3rd.
//
// Timing, as built (chapter, loop t):
//   1  0-60   sentries in holes, two walk the ring; the CP at the table; CP radioman on the handset 7-15 (SitRep, 9);
//             Company A forming on the south-west side, checking gear; Banks with his radioman
//   2  0-90   A walks the A route as one closed-up file (3.2 m in grass, 2.5 m crouched in the forest crossing, 12 m
//             between platoons), the point from about 250 m to 325 m down the route; the chapter fades at its seam
//   3  0-11   two squads push crouched from the base line into the grass; 11.2, 12.6 two men fall (wounded, breathing)
//      16-   the base line answers in bursts (FIRE.burst from each man's muzzle); mortar flinches 38, 58, 81, 103
//      30-50 Hayden's platoon assaults in short rushes (run, kneel, fire); falls 36.5, 41, 45 (Hayden), 48 (his
//             sergeant), 52; the platoon halts at the fringe, prone; Banks on the handset 33-39.5, 43.5-49, 51.5-57
//      50-   two pairs go out (50, 57) and drag the two wounded back to A's LZ in short pulls; from 60 the fringe crawls back
//   4  0-90   A pinned as chapter 3 ends; Banks on the handset 0.5-7.5 (the noon request, 1.2); a few bursts;
//             Cahill and his radioman leave the CP at 28 and walk to the Charlie forming point (MARINES_AD.cahillEnd),
//             arriving about 88; the 1320 message leaves his radioman at 83.5
//   5  0-120  A pinned; D lined up on 689's east and south side, moving out at 40; rockets 60-80: D and the CP drop,
//             sentries duck low; D gets up and moves on at 80; Hartzell and Donnelly back at the table by 90
//   6  0-90   A pinned; D crouches in east of the ridge (0-30); three of A's wounded low-crawl east (4-50); three D pairs
//             run out (30-51) and drag them back toward D (54-88)
//   7  0-120  D attacks north-west to south-east in alternating rushes 10-65; four men fall to single sniper shots at
//             22, 31, 43, 55 (the shot is scheduled on FIRE 0.6 s before each fall); Banks hit at 80 (Injured Idle);
//             Lovely moves up and points (84-92); withdraw order 97: A drags its wounded to its LZ, D starts back with
//             two pairs dragging; the CP radioman on the handset with Hartzell and Donnelly beside him 105-115 (1745, 107)
//   8  0-90   dusk: two files (A and D) rise out of the grass at A's LZ and walk down the withdrawal lane, sinking into
//             the draw 40 m on; the last man gone by 88; the CP lantern (ctx.addLantern) glows
//   9  0-120  night: sentries low in holes; the CP awake; six stragglers come up from the valley, reaching the
//             perimeter 90-110
//   10 0-90   first light: sentries and the CP
//   11 0-120  two squads walk out to the valley edge (1-10), look and point (10-12.4), go to ground at the two shots
//             (12, 14), lie up, crawl back in (40-62); four men at the CH-46's ramp while it is down (about 92.8-99),
//             not getting off; eight men run to it after the hard landing on 689 (113.4-)
//
// API: window.MARINES_AD = { figures, actors, radios: { banks, cp, cargile, lovely, cahill }, cahillEnd, ready }.
    if (window.FIRE && window.FIRE.rebuild) window.FIRE.rebuild();   // fire.js reads A's line from posAt
// radios.<key>() returns the radioman's antenna tip (a reused Vector3) or null when he is not in this chapter; they are
// also merged into window.marines.radios, where radio.js looks.
(function () {
  'use strict';
  const NAME = 'marines-a-d';
  window.__readyWait = (window.__readyWait || 0) + 1;
  window.__ready = false;
  let readyDone = false;
  const markReady = () => { if (readyDone) return; readyDone = true; window.__readyWait = Math.max(0, (window.__readyWait || 1) - 1); if (window.__readyWait === 0) window.__ready = (!(window.__readyHolds > 0) && !(window.__readyWait > 0) && !((window.CLAY || {}).waits > 0)); };

  // ---------- the clay figure scripts, loaded once for every marines plug-in ----------
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); });
  function clay() {
    if (!window.__clayReady) window.__clayReady = (async () => {
      if (!THREE.FBXLoader) { if (!window.fflate) await loadScript(CDN + 'libs/fflate.min.js'); await loadScript(CDN + 'loaders/FBXLoader.js'); }
      if (!window.FK) await loadScript('clay-v3/figkit.js');
      if (!window.V3) await loadScript('clay-v3/clay-v3.js');
      if (!window.CM) await loadScript('clay-v3/motion.js');
      CM.animPath = 'realistic-spike/anim/';
      const mat = V3.material();
      mat.userData.extraKey = 'clay2';    // keeps the base's sky-haze cache key apart from other skinned materials
      await CM.init(V3.build({ mat }));
      return { mat };
    })();
    return window.__clayReady;
  }
  clay().catch((e) => console.error(NAME + ': ' + e.message));

  const CLIPS = ['Walk With Rifle', 'Rifle Crouch Walk', 'Rifle Run', 'Rifle Idle', 'Rifle Kneel Idle', 'Idle Crouching', 'Crouch Idle 02 Looking Around',
    'Looking Around', 'Pointing', 'Kneeling Pointing', 'Talking On Phone', 'Sitting Idle', 'Injured Idle', 'Injured Walk', 'Laying Breathless', 'Low Crawl',
    'Prone Idle', 'Dying', 'Dying (1)', 'Dying (2)'];
  // ground speed of each travelling clip at rate 1 on a clay figure of scale 1 (stance-foot sweep, measured)
  const V0 = { 'Walk With Rifle': 0.82, 'Rifle Crouch Walk': 0.41, 'Rifle Run': 1.88, 'Injured Walk': 0.76, 'Low Crawl': 0.3 };
  const VDEF = { 'Walk With Rifle': 0.88, 'Rifle Crouch Walk': 0.46, 'Rifle Run': 1.95, 'Injured Walk': 0.74, 'Low Crawl': 0.3 };
  const UPRIGHT = new Set(['Rifle Idle', 'Looking Around', 'Pointing', 'Talking On Phone', 'Rifle Kneel Idle', 'Idle Crouching', 'Crouch Idle 02 Looking Around', 'Kneeling Pointing', 'Injured Idle', 'Walk With Rifle', 'Rifle Crouch Walk']);
  const KNEELING = new Set(['Rifle Kneel Idle', 'Idle Crouching', 'Crouch Idle 02 Looking Around', 'Kneeling Pointing']);
  const FADE = 0.45, TURN = 0.9, SEAM = 1.2;
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const sm = (x) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const turnTo = (from, to, tau, dur) => from + wrapA(to - from) * sm(tau / (dur || TURN));
  const yawOf = (dx, dz) => Math.atan2(dx, dz);
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- paths ----------
  function mkPath(pts) {
    const P = { pts: pts.map((p) => [p[0], p[1]]), cum: [0] };
    for (let i = 1; i < P.pts.length; i++) P.cum.push(P.cum[i - 1] + Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]));
    P.len = P.cum[P.cum.length - 1];
    return P;
  }
  const _pa = { x: 0, z: 0 }, _pb = { x: 0, z: 0 };
  function pathAt(P, d, out) {
    const pts = P.pts, cum = P.cum, n = pts.length;
    if (n === 1 || d <= 0) { out.x = pts[0][0]; out.z = pts[0][1]; return out; }
    if (d >= P.len) { out.x = pts[n - 1][0]; out.z = pts[n - 1][1]; return out; }
    let i = 1; while (i < n - 1 && cum[i] < d) i++;
    const L = cum[i] - cum[i - 1], k = L > 0 ? (d - cum[i - 1]) / L : 0;
    out.x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k; out.z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k;
    return out;
  }
  function pathYaw(P, d) {
    pathAt(P, Math.max(0, Math.min(d, P.len - 1.6) - 0.4), _pa); pathAt(P, Math.min(P.len, Math.max(d, 1.6) + 1.2), _pb);
    return yawOf(_pb.x - _pa.x, _pb.z - _pa.z);
  }

  window.Scene.register({
    name: NAME,
    init(ctx) {
      const plug = this;
      plug.frame = null;
      build(ctx, plug).catch((e) => { console.error(NAME + ' failed to build', e); markReady(); });
    },
    update(t, dt) { if (this.frame) this.frame(t, dt); },
  });

  async function build(ctx, plug) {
    const t0Build = performance.now();
    const { THREE, SITE } = ctx;
    const G = ctx.groundY;
    const { mat } = await clay();
    await CM.load(CLIPS);
    // the drag (fix pass, carries): the crouched walk with the rifle slung, both hands on the wounded man's harness
    const DRAGC = 'C:Drag Crouch'; CM.slung('Rifle Crouch Walk', DRAGC); CLIPS.push(DRAGC);
    V0[DRAGC] = V0['Rifle Crouch Walk']; VDEF[DRAGC] = VDEF['Rifle Crouch Walk'];
    const CL = CM.clips;
    const DUR = {}; for (const n of CLIPS) DUR[n] = CL[n].duration;
    // a second copy of each clip, so one figure can blend two times of the same clip (a seam, a crossfade)
    const CLB = {}; for (const n of CLIPS) { CLB[n] = CL[n].clone(); CLB[n].userData = CL[n].userData; }
    // where each fall leaves the hips (figure space): a man who falls and then lies breathing is moved there as the
    // clips cross, so his body does not slide back to where he stood
    const HIPEND = {};
    for (const n of CLIPS) {
      if (!/^Dying/.test(n)) continue;
      const tr = CL[n].tracks.find((k) => /Hips\.position$/.test(k.name)), b = CM.T.bind.Hips, v = tr.values, e = v.length - 3;
      HIPEND[n] = [v[e] - b.x, v[e + 2] - b.z];
    }
    const W = window.WORKS || ctx.works || {};
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

    // ---------- actors ----------
    const actors = [];
    const byKey = {};
    let nTris = 0;
    function actor(key, kind, seed, lod, group) {
      const F = V3.make(seed, kind, lod, mat);
      F.mesh.castShadow = false;
      ctx.scene.add(F.root);
      const A = { key, kind, seed, group, idx: actors.length, F, plans: {}, L: {}, seam: {}, ghosts: {}, over: {}, fire: [], vis: false, sink: 0, acc: 0, head: v3(0, 0, 0), tip: v3(0, 0, 0) };
      A.f = CM.figure(F, { seed, x: 0, z: 0, yaw: 0, vary: true, mood: 'alert', ground: (x, z) => G(x, z) - A.sink });
      A.f.o.pinned = true;
      A.scale = A.f.scale; A.stride = A.f.v.stride; A.phase = A.f.v.phase;
      A.slotA = {}; A.slotB = {};
      A.blob = ctx.blob(0.55 * A.scale);
      F.root.visible = false;
      nTris += F.tris || 0;
      actors.push(A);
      if (key) byKey[key] = A;
      return A;
    }
    // Company A
    const A = [];
    for (let i = 0; i < 45; i++) {
      const kind = i === 0 || i === 4 || i === 24 ? 'captain' : i === 1 ? 'radioman' : i === 2 || i === 3 ? 'corpsman' : 'rifleman';
      const key = ({ 0: 'banks', 1: 'banksRTO', 4: 'lovely', 24: 'hayden', 25: 'haydenSgt' })[i] || null;
      const hero = key || (i >= 5 && i <= 14);
      A.push(actor(key, kind, 1101 + i * 7, hero ? 1 : 0, 'A'));
    }
    // Company D
    const D = [];
    for (let i = 0; i < 45; i++) {
      const kind = i === 0 ? 'captain' : i === 1 ? 'radioman' : i === 2 ? 'corpsman' : 'rifleman';
      const key = ({ 0: 'cargile', 1: 'cargileRTO' })[i] || null;
      D.push(actor(key, kind, 2203 + i * 7, key ? 1 : 0, 'D'));
    }
    // the CP
    const CP = [['hartzell', 'captain'], ['donnelly', 'captain'], ['engel', 'captain'], ['cpRTO', 'radioman'], ['cahill', 'captain'], ['cahillRTO', 'radioman']].map(([k, kind], i) => actor(k, kind, 3307 + i * 11, 1, 'CP'));
    const [HZ, DN, EN, CPR, CAH, CAHR] = CP;
    // officers on the net take their radioman's handset when he is within 3 m (clay-v3/motion.js f.lendTo)
    CAHR.f.lendTo = [CAH.f]; CPR.f.lendTo = [HZ.f, DN.f, EN.f];
    // the sentries
    const SEN = []; for (let i = 0; i < 10; i++) SEN.push(actor(null, 'rifleman', 4409 + i * 7, 0, 'S'));

    // ---------- step builder ----------
    // A plan is a list of steps, each lasting until the next: H hold a clip, W walk a path, O a one-shot, X hidden,
    // C a conveyor lane (chapter 2). Positions continue from step to step: a step starts where the last one is at its t0.
    const cur = { x: 0, z: 0, yaw: 0, sink: 0 };
    function stepPos(Ac, s, t, out) {
      const tau = t - s.t0;
      if (s.type === 'W') {
        const d = s.d0 + pulseD(s, tau);
        pathAt(s.path, d, out);
        const py = s.yawFixed !== undefined ? s.yawFixed : pathYaw(s.path, d) + (s.rev ? Math.PI : 0);
        out.yaw = tau < s.dur ? turnTo(s.yawFrom, py, tau, s.turn) : turnTo(s.endYaw, s.stopYaw !== undefined ? s.stopYaw : s.endYaw, tau - s.dur);
        out.sink = s.sink + (s.sinkIn ? 1.9 * (1 - sm((d - s.d0) / 3)) : 0) + (s.sinkOut ? 1.9 * sm((d - (s.d1 - 3)) / 3) : 0);
        out.d = d;
      } else if (s.type === 'C') {
        conveyorPos(s, t, out);
      } else {
        out.x = s.x; out.z = s.z; out.yaw = turnTo(s.yawFrom, s.yaw, tau, s.turn); out.sink = s.sink;
        if (s.type === 'O' && s.then && HIPEND[s.clip] && t > s.thenAt) {
          const k = sm((t - s.thenAt) / s.thenFade), h = HIPEND[s.clip], c = Math.cos(s.yaw), n = Math.sin(s.yaw), sc = Ac.scale;
          out.x += k * (h[0] * c + h[1] * n) * sc; out.z += k * (-h[0] * n + h[1] * c) * sc;
        }
      }
      return out;
    }
    // a drag goes in short pulls (fix pass, carries): the speed surges and nearly stops on a 1.6 s beat, in phase for
    // every man of one drag (the beat runs on the loop clock), averaging the step's speed
    const PW = TAU / 1.6, PA = 0.8;
    function pulseD(s, tau) {
      const tt = clamp(tau, 0, s.dur);
      if (!s.pulse) return tt * s.v;
      return s.v * (tt - PA * (Math.sin(PW * (s.t0 + tt)) - Math.sin(PW * s.t0)) / PW);
    }
    function Plan(Ac, ch, L, x, z, yaw, clip, o) {
      o = o || {};
      const steps = [{ type: 'H', t0: 0, clip, x, z, yaw, yawFrom: yaw, sink: o.sink || 0, ct0: (o.ct0 !== undefined ? o.ct0 : Ac.phase * DUR[clip]), rate: 1, fade: FADE }];
      Ac.plans[ch] = steps; Ac.L[ch] = L;
      const P = {
        steps,
        at(t) { const s = steps[steps.length - 1]; stepPos(Ac, s, t, cur); return cur; },
        hold(t0, clip2, o2) {
          o2 = o2 || {}; const p = P.at(t0);
          steps.push({ type: 'H', t0, clip: clip2, x: o2.x !== undefined ? o2.x : p.x, z: o2.z !== undefined ? o2.z : p.z, yaw: o2.yaw !== undefined ? o2.yaw : p.yaw, yawFrom: p.yaw,
            sink: o2.sink !== undefined ? o2.sink : (p.sink > 1.5 ? 0 : p.sink), ct0: o2.ct0 !== undefined ? o2.ct0 : Ac.phase * DUR[clip2], rate: o2.rate || 1, fade: o2.fade || FADE, turn: o2.turn });
          return P;
        },
        once(t0, clip2, o2) {
          o2 = o2 || {}; const p = P.at(t0);
          steps.push({ type: 'O', t0, clip: clip2, x: p.x, z: p.z, yaw: o2.yaw !== undefined ? o2.yaw : p.yaw, yawFrom: p.yaw, sink: p.sink > 1.5 ? 0 : p.sink, rate: o2.rate || 1, fade: o2.fade || 0.3,
            then: o2.then, thenAt: t0 + (o2.thenAfter !== undefined ? o2.thenAfter : DUR[clip2] - 0.6), thenFade: o2.thenFade || 1.0, thenCt0: Ac.phase * (o2.then ? DUR[o2.then] : 1) });
          if (o2.ghost !== false && /^Dying/.test(clip2)) (Ac.ghosts[ch] = Ac.ghosts[ch] || []).push({ t: t0, clip: clip2 });
          return P;
        },
        // walk from where he is through pts (or along a shared path from d0 to d1)
        walk(t0, clip2, pts, o2) {
          o2 = o2 || {}; const p = P.at(t0);
          let path, d0, d1;
          if (o2.path) { path = o2.path; d0 = o2.d0 || 0; d1 = o2.d1 !== undefined ? o2.d1 : path.len; }
          else { path = mkPath([[p.x, p.z]].concat(pts)); d0 = 0; d1 = path.len; }
          const v = o2.v || VDEF[clip2];
          const rate = o2.rate || (V0[clip2] ? v / (V0[clip2] * Ac.scale * (clip2 === 'Low Crawl' ? 1 : Ac.stride)) : 1);
          const dur = Math.max(0.01, (d1 - d0) / v);
          const s = { type: 'W', t0, clip: clip2, path, d0, d1, v, rate, dur, rev: !!o2.rev, yawFixed: o2.yawFixed, yawFrom: p.yaw, turn: o2.turn || 0.6, sink: o2.sink !== undefined ? o2.sink : (p.sink > 1.5 ? 0 : p.sink),
            sinkIn: !!o2.sinkIn, sinkOut: !!o2.sinkOut, stop: o2.stop || (clip2 === 'Low Crawl' ? 'Prone Idle' : 'Rifle Idle'), stopYaw: o2.stopYaw, fade: o2.fade || FADE, ct0: Ac.phase * DUR[clip2] };
          const end = pathAt(path, d1, { x: 0, z: 0 });
          s.endYaw = s.yawFixed !== undefined ? s.yawFixed : pathYaw(path, d1) + (s.rev ? Math.PI : 0);
          s.stopCt0 = Ac.phase * DUR[s.stop];
          void end;
          steps.push(s);
          P.endsAt = t0 + dur;
          return P;
        },
        hide(t0) { const p = P.at(t0); steps.push({ type: 'X', t0, x: p.x, z: p.z, yaw: p.yaw, yawFrom: p.yaw, sink: 0, clip: 'Rifle Idle', ct0: 0, fade: 0 }); return P; },
        flinch(t0, dur) { (Ac.over[ch] = Ac.over[ch] || []).push({ t0, dur: dur || 1.7, clip: Ac.kind === 'rifleman' ? 'Idle Crouching' : 'Crouch Idle 02 Looking Around', flinch: true }); return P; },
        gesture(t0, dur, clip2) { (Ac.over[ch] = Ac.over[ch] || []).push({ t0, dur, clip: clip2 }); return P; },
        fire(t, n, target) { Ac.fire.push({ ch, t, n: n || 4, target }); return P; },
      };
      return P;
    }
    const hidden = (Ac, ch, L) => { Ac.plans[ch] = [{ type: 'X', t0: 0, x: 0, z: 0, yaw: 0, yawFrom: 0, sink: 0, clip: 'Rifle Idle', ct0: 0 }]; Ac.L[ch] = L; };

    // ---------- evaluation (allocation-free) ----------
    function mkState() { return { x: 0, z: 0, yaw: 0, sink: 0, hidden: false, n: 0, clips: ['', '', '', '', '', '', '', ''], cts: new Float32Array(8), ws: new Float32Array(8), ghost: null, d: 0 }; }
    const S1 = mkState(), S2 = mkState(), SP = { x: 0, z: 0, yaw: 0, sink: 0, d: 0 };
    const loopT = (clip, ct) => { const d = DUR[clip]; return ((ct % d) + d) % d; };
    const onceT = (clip, ct) => clamp(ct, 0, DUR[clip] - 0.034);
    function addLayer(S, clip, ct, w) {
      if (w <= 0.002) return;
      for (let i = 0; i < S.n; i++) if (S.clips[i] === clip && Math.abs(S.cts[i] - ct) < 0.04) { S.ws[i] += w; return; }
      if (S.n >= 8) return;
      S.clips[S.n] = clip; S.cts[S.n] = ct; S.ws[S.n] = w; S.n++;
    }
    function layers(Ac, s, t, S, w) {
      const tau = t - s.t0;
      switch (s.type) {
        case 'H': addLayer(S, s.clip, /^Dying/.test(s.clip) ? DUR[s.clip] - 0.034 : loopT(s.clip, tau * s.rate + s.ct0), w); break;
        case 'O': {
          const ct = onceT(s.clip, tau * s.rate);
          if (s.then && t > s.thenAt) { const k = sm((t - s.thenAt) / s.thenFade); addLayer(S, s.clip, ct, w * (1 - k)); addLayer(S, s.then, loopT(s.then, t - s.thenAt + s.thenCt0), w * k); }
          else addLayer(S, s.clip, ct, w);
          break;
        }
        case 'W': {
          const ct = loopT(s.clip, (s.rev ? -1 : 1) * (s.pulse ? pulseD(s, tau) / s.v : Math.max(0, tau)) * s.rate + s.ct0);
          if (tau < s.dur) addLayer(S, s.clip, ct, w);
          else { const k = sm((tau - s.dur) / FADE); addLayer(S, s.clip, ct, w * (1 - k)); addLayer(S, s.stop, loopT(s.stop, tau - s.dur + s.stopCt0), w * k); }
          break;
        }
        case 'C': conveyorLayers(Ac, s, t, S, w); break;
      }
    }
    function stateAt(Ac, ch, t, S) {
      S.n = 0; S.hidden = false; S.ghost = null;
      const steps = Ac.plans[ch];
      if (!steps) { S.hidden = true; return S; }
      let i = 0; while (i + 1 < steps.length && steps[i + 1].t0 <= t) i++;
      const s = steps[i];
      if (s.type === 'X') { S.hidden = true; S.x = s.x; S.z = s.z; return S; }
      stepPos(Ac, s, t, SP); S.x = SP.x; S.z = SP.z; S.yaw = SP.yaw; S.sink = SP.sink; S.d = SP.d;
      const tau = t - s.t0, fade = s.fade || FADE;
      if (i > 0 && tau < fade && steps[i - 1].type !== 'X') { const k = sm(tau / fade); layers(Ac, s, t, S, k); layers(Ac, steps[i - 1], t, S, 1 - k); }
      else layers(Ac, s, t, S, 1);
      if (S.sink > 1.85) S.hidden = true;
      const gh = Ac.ghosts[ch]; if (gh) for (const g of gh) if (t >= g.t) S.ghost = g.clip;
      const ov = Ac.over[ch];
      if (ov) for (const o of ov) {
        if (t < o.t0 || t > o.t0 + o.dur) continue;
        if (o.flinch) { let main = '', mw = 0; for (let j = 0; j < S.n; j++) if (S.ws[j] > mw) { mw = S.ws[j]; main = S.clips[j]; } if (!UPRIGHT.has(main) || /Walk/.test(main)) continue; }
        const env = sm((t - o.t0) / (o.flinch ? 0.15 : 0.4)) * (1 - sm((t - (o.t0 + o.dur - 0.6)) / 0.6));
        for (let j = 0; j < S.n; j++) S.ws[j] *= 1 - env;
        addLayer(S, o.clip, loopT(o.clip, t - o.t0 + (o.flinch ? 0.3 : 0)), env);
      }
      return S;
    }
    function poseAt(Ac, ch, t, S) {
      stateAt(Ac, ch, t, S);
      const L = Ac.L[ch];
      if (Ac.seam[ch] && t > L - SEAM) {
        stateAt(Ac, ch, t - L, S2);
        const k = sm((t - (L - SEAM)) / SEAM);
        S.x += (S2.x - S.x) * k; S.z += (S2.z - S.z) * k; S.yaw += wrapA(S2.yaw - S.yaw) * k; S.sink += (S2.sink - S.sink) * k;
        for (let j = 0; j < S.n; j++) S.ws[j] *= 1 - k;
        for (let j = 0; j < S2.n; j++) addLayer(S, S2.clips[j], S2.cts[j], S2.ws[j] * k);
        if (k > 0.5) S.ghost = S2.ghost;
        S.hidden = S.hidden && S2.hidden;
      }
      return S;
    }
    // the seam blends only where the end of the loop matches its start (an idle's phase); elsewhere it cuts
    function decideSeams() {
      for (const Ac of actors) for (const ch in Ac.plans) {
        const L = Ac.L[ch], a = stateAt(Ac, +ch, L - 1e-3, S1);
        const ax = a.x, az = a.z, ah = a.hidden; let am = '', aw = 0; for (let j = 0; j < a.n; j++) if (a.ws[j] > aw) { aw = a.ws[j]; am = a.clips[j]; }
        const b = stateAt(Ac, +ch, 0, S2); let bm = '', bw = 0; for (let j = 0; j < b.n; j++) if (b.ws[j] > bw) { bw = b.ws[j]; bm = b.clips[j]; }
        Ac.seam[ch] = !ah && !b.hidden && Math.hypot(ax - b.x, az - b.z) < 1.5 && am === bm;
      }
    }

    // ---------- driving a figure ----------
    const _q = new THREE.Quaternion();
    function apply(Ac, S) {
      const f = Ac.f;
      f.x = S.x; f.z = S.z; f.yaw = S.yaw; Ac.sink = S.sink;
      // weights: the strongest four layers, normalised
      let tot = 0;
      for (let j = 0; j < S.n; j++) tot += S.ws[j];
      const used = Ac.used || (Ac.used = new Set());
      used.clear();
      const takenA = Ac.takenA || (Ac.takenA = new Set()); takenA.clear();
      for (let j = 0; j < S.n; j++) {
        const clip = S.clips[j], w = S.ws[j] / (tot || 1);
        if (w < 0.004) continue;
        let a;
        if (!takenA.has(clip)) { takenA.add(clip); a = Ac.slotA[clip] || (Ac.slotA[clip] = f.mixer.clipAction(CL[clip])); }
        else a = Ac.slotB[clip] || (Ac.slotB[clip] = f.mixer.clipAction(CLB[clip]));
        setAction(f, a, S.cts[j], w);
        used.add(a);
      }
      // a fallen man's rifle stays where it dropped: his fall clip stays on, faintly, at its last frame
      if (S.ghost && !takenA.has(S.ghost)) {
        const a = Ac.slotA[S.ghost] || (Ac.slotA[S.ghost] = f.mixer.clipAction(CL[S.ghost]));
        setAction(f, a, DUR[S.ghost] - 0.034, 0.002); used.add(a);
      }
      for (const k in Ac.slotA) { const a = Ac.slotA[k]; if (!used.has(a) && a._on) { a.stop(); a._on = false; } }
      for (const k in Ac.slotB) { const a = Ac.slotB[k]; if (!used.has(a) && a._on) { a.stop(); a._on = false; } }
      f.cur = S.clips[0];
    }
    function setAction(f, a, ct, w) {
      if (!a._on) { a.reset(); a.setLoop(THREE.LoopRepeat); a.play(); a._on = true; }
      a.enabled = true; a.timeScale = 0; a._once = false; a._held = true;
      a.time = ct; a.setEffectiveWeight(w);
    }

    // ---------- the land and the places ----------
    const S6 = SITE;
    const NE = S6.northEnd, ALZ = (W.lz && W.lz.alz) || S6.alz;
    const uA = (() => { const dx = NE.x - ALZ.x, dz = NE.z - ALZ.z, l = Math.hypot(dx, dz); return { x: dx / l, z: dz / l }; })();   // toward the bunkers
    const rA = { x: -uA.z, z: uA.x };
    const pA = (b, s) => [NE.x - uA.x * b + rA.x * s, NE.z - uA.z * b + rA.z * s];      // b metres back from the north end toward A's LZ, s across
    const yawBunk = yawOf(uA.x, uA.z), yawBack = yawOf(-uA.x, -uA.z);
    const slits = (W.slits || []).filter((s) => s.group === 'north').map((s) => s.pos);
    const bunkTarget = (i) => (slits.length ? slits[i % slits.length] : v3(NE.x, NE.y, NE.z)).clone().setY((slits.length ? slits[i % slits.length].y : NE.y) + 0.35);
    const DS = S6.deltaStart, DAX = S6.deltaAxis, DR = { x: -DAX.z, z: DAX.x };
    const pD = (a, s) => [DS.x + DAX.x * a + DR.x * s, DS.z + DAX.z * a + DR.z * s];
    const yawD = yawOf(DAX.x, DAX.z);
    const snipers = [[DS.x + DAX.x * S6.deltaStop * 1.25 + DAX.z * 12, DS.z + DAX.z * S6.deltaStop * 1.25 - DAX.x * 12], [DS.x + DAX.x * S6.deltaStop * 1.15 - DAX.z * 14, DS.z + DAX.z * S6.deltaStop * 1.15 + DAX.x * 14]];
    const holes = (W.holes || []).map((h) => ({ x: h.pos.x, z: h.pos.z, yaw: yawOf(h.out.x, h.out.z), b: ((Math.atan2(h.pos.x, -h.pos.z) * 180 / Math.PI) + 360) % 360 }));
    const perim = S6.perimeter;
    const onRing = (b, dr) => { const r = perim.rAt(b) + (dr || 0), a = b * Math.PI / 180; return [Math.sin(a) * r, -Math.cos(a) * r]; };
    const T = W.cpTable || { pos: S6.cp, rotY: 0.35 };
    const tc = Math.cos(T.rotY), ts = Math.sin(T.rotY);
    const tL = (u, w) => [T.pos.x + tc * u + ts * w, T.pos.z - ts * u + tc * w];   // the CP table's frame (works.js)
    const faceTo = (from, to) => yawOf(to[0] - from[0], to[1] - from[1]);
    const LOOPS = {}; for (const c of ctx.CHAPTERS) LOOPS[c.id] = c.loop;
    // the trampled lanes land.js draws (its own meandering paths), so the files walk on the flattened grass
    const landLanes = (window.__landDbg && window.__landDbg.LANES) || null;
    const lanePts = (i, fallback) => (landLanes && landLanes[i] && landLanes[i].path && landLanes[i].path.length > 1 ? landLanes[i].path.map((p) => [p[0], p[1]]) : fallback);
    const nearestD = (P, x, z) => { let best = 0, bd = 1e9; for (let d = 0; d <= P.len; d += 0.5) { pathAt(P, d, _pa); const e = Math.hypot(_pa.x - x, _pa.z - z); if (e < bd) { bd = e; best = d; } } return best; };
    const at = (ch, hhmm) => { if (ctx.clockT) return ctx.clockT(ch, hhmm); const C = ctx.CHAPTERS.find((c) => c.id === ch); const m = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2)); return (m - C.m0) / (C.m1 - C.m0) * C.loop; };

    // idle variety: a man changes between a few idles at random times, back to the first before the loop ends
    function idles(P, Ac, L, set, r, o) {
      o = o || {};
      const t0 = o.from || 0, t1 = (o.to !== undefined ? o.to : L) - 6;
      let t = t0 + 6 + r() * 14, k = 0;
      const first = P.steps[P.steps.length - 1].clip;
      while (t < t1 - 8) { const c = set[Math.floor(r() * set.length)]; P.hold(t, c, { fade: KNEELING.has(c) !== KNEELING.has(first) ? 0.9 : 0.6, sink: o.sink }); t += 9 + r() * 16; k++; }
      if (k) P.hold(Math.min(t, t1), first, { fade: 0.8, sink: o.sink });
    }
    const IDLE = {
      rifleman: ['Rifle Idle', 'Looking Around', 'Rifle Kneel Idle', 'Rifle Idle'],
      captain: ['Looking Around', 'Crouch Idle 02 Looking Around', 'Looking Around'],
      radioman: ['Looking Around', 'Crouch Idle 02 Looking Around'],
      corpsman: ['Looking Around', 'Crouch Idle 02 Looking Around'],
    };
    const stand = (Ac) => (Ac.kind === 'rifleman' ? 'Rifle Idle' : 'Looking Around');
    const kneel = (Ac) => (Ac.kind === 'rifleman' ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around');
    const crouchWalk = 'Rifle Crouch Walk';

    // =================================================================== the sentries (every chapter)
    const usedHoles = new Set();
    const pickHole = (b) => { let best = -1, bd = 1e9; holes.forEach((h, i) => { if (usedHoles.has(i)) return; const d = Math.abs(wrapA((h.b - b) * Math.PI / 180)); if (d < bd) { bd = d; best = i; } }); usedHoles.add(best); return holes[best]; };
    const sentryHoles = [165, 190, 212, 236, 262, 300, 130, 25].map(pickHole);
    for (let ch = 1; ch <= 11; ch++) {
      const L = LOOPS[ch];
      sentryHoles.forEach((h, i) => {
        const Ac = SEN[i], r = rng(ch * 131 + i * 17);
        if (!h) { hidden(Ac, ch, L); return; }
        const night = ch === 9 || ch === 10;
        const low = night ? 0.62 : 0.5;
        const c0 = night ? 'Idle Crouching' : ['Rifle Idle', 'Looking Around', 'Idle Crouching'][i % 3];
        const P = Plan(Ac, ch, L, h.x, h.z, h.yaw + (r() - 0.5) * 0.5, c0, { sink: c0 === 'Idle Crouching' ? 0.25 : low });
        if (ch === 5) {
          // rockets 60-80: down into the hole, up again after
          P.hold(4 + r() * 10, i % 2 ? 'Looking Around' : 'Rifle Idle', { sink: low, fade: 0.7 });
          P.hold(60.3 + r() * 0.8, 'Idle Crouching', { sink: 0.95, fade: 0.35 });
          P.hold(82 + r() * 4, c0, { sink: c0 === 'Idle Crouching' ? 0.25 : low, fade: 0.9 });
        } else if (!night) {
          // shift between standing watch and crouching, turning a little now and then
          let t = 5 + r() * 12;
          while (t < L - 14) { const c = ['Rifle Idle', 'Looking Around', 'Idle Crouching'][Math.floor(r() * 3)]; P.hold(t, c, { sink: c === 'Idle Crouching' ? 0.25 : low, yaw: h.yaw + (r() - 0.5) * 0.9, fade: 0.8 }); t += 10 + r() * 14; }
          P.hold(L - 7, c0, { sink: c0 === 'Idle Crouching' ? 0.25 : low, yaw: P.steps[0].yaw, fade: 0.9 });
        } else {
          let t = 8 + r() * 20;
          while (t < L - 20) { P.hold(t, 'Idle Crouching', { sink: 0.62, yaw: h.yaw + (r() - 0.5) * 0.8, fade: 0.9 }); t += 18 + r() * 20; }
          P.hold(L - 10, 'Idle Crouching', { sink: 0.62, yaw: P.steps[0].yaw, fade: 0.9 });
        }
      });
      // two walk the ring, inside the line, out and back once a loop
      [[150, 8], [228, 9]].forEach(([b0, i]) => {
        const Ac = SEN[i], night = ch === 9 || ch === 10, v = night ? 0.7 : 0.82;
        const pause = 8, len = Math.max(8, (L - 2 * pause - 2) * v / 2);
        const pts = []; const r0 = 5;
        for (let k = 0; k <= 12; k++) { const a = b0 + k * 4; pts.push(onRing(a, -r0)); }
        const path = mkPath(pts), d1 = Math.min(path.len, len);
        const p0 = pathAt(path, 0, { x: 0, z: 0 });
        const P = Plan(Ac, ch, L, p0.x, p0.z, pathYaw(path, 0) + Math.PI * 0.5, 'Looking Around');
        if (ch === 5) {
          P.walk(3, 'Walk With Rifle', null, { path, d0: 0, d1: Math.min(d1, 40), v, stop: 'Looking Around' });
          P.hold(60.4, 'Idle Crouching', { fade: 0.35 });
          const pp = P.at(84);
          P.walk(84, 'Walk With Rifle', null, { path: mkPath([[pp.x, pp.z], [p0.x, p0.z]]), v, stop: 'Looking Around', stopYaw: pathYaw(path, 0) + Math.PI * 0.5 });
        } else {
          P.walk(pause * 0.5, 'Walk With Rifle', null, { path, d0: 0, d1, v, stop: 'Looking Around', stopYaw: pathYaw(path, d1) - Math.PI * 0.5 });
          const back = mkPath(pts.slice().reverse()), e = back.len - d1;
          P.walk(pause * 1.5 + d1 / v, 'Walk With Rifle', null, { path: back, d0: e, d1: back.len, v, stop: 'Looking Around', stopYaw: pathYaw(path, 0) + Math.PI * 0.5 });
        }
      });
    }

    // =================================================================== the CP (every chapter)
    const crateSeat = tL(-2.6, -1.4), radioCrate = tL(-1.1, 1.9);
    const tableMid = tL(0, 0);
    const spot = {
      hartzell: crateSeat, donnelly: tL(0.4, -0.95), engel: tL(-1.15, 1.25), cpRTO: tL(1.5, 0.9), cahill: tL(1.25, -1.05), cahillRTO: tL(2.0, -1.5),
      watchC: tL(-3.5, 3.4), watchD: tL(-1.9, 3.8),   // the south-west edge of the CP, looking toward the ridge
    };
    const toTable = (p) => faceTo(p, tableMid);
    const towardRidge = faceTo([T.pos.x, T.pos.z], [S6.battleSummit.x, S6.battleSummit.z]);
    const cahillEnd = (() => { const p = S6.perimSW, dx = T.pos.x - p.x, dz = T.pos.z - p.z, l = Math.hypot(dx, dz); return [p.x + dx / l * 7, p.z + dz / l * 7]; })();
    for (let ch = 1; ch <= 11; ch++) {
      const L = LOOPS[ch], r = rng(ch * 977);
      // Hartzell on the crate, Donnelly at the table, Engel at the crate radio, the CP radioman beside the table
      const hz = Plan(HZ, ch, L, spot.hartzell[0], spot.hartzell[1], toTable(spot.hartzell), 'Sitting Idle');
      const dn = Plan(DN, ch, L, spot.donnelly[0], spot.donnelly[1], toTable(spot.donnelly), 'Looking Around');
      const en = Plan(EN, ch, L, spot.engel[0], spot.engel[1], faceTo(spot.engel, radioCrate), ch % 2 ? 'Talking On Phone' : 'Looking Around');
      const rt = Plan(CPR, ch, L, spot.cpRTO[0], spot.cpRTO[1], toTable(spot.cpRTO), 'Looking Around');
      // the CP radioman lifts his handset whenever the CP sends or receives (radio.js times)
      const talk = { 1: [[7, 15]], 3: [[at(3, '1020') - 1, at(3, '1020') + 5], [33.5, 39], [43, 49], [51.5, 57], [at(3, '1145') - 1, at(3, '1145') + 5]], 4: [[0.5, 7.5], [82, 89]], 7: [[105, 115]], 11: [[at(11, '0900') - 1, at(11, '0900') + 6]] }[ch] || [];
      for (const [a, b] of talk) { rt.hold(a, 'Talking On Phone', { ct0: 2 }); rt.hold(b, 'Looking Around'); }
      if (ch === 2) {
        // the CP watches the patrol go
        dn.walk(4, 'Walk With Rifle', [spot.watchD], { stop: 'Looking Around', stopYaw: towardRidge, v: 0.7 });
        dn.walk(80, 'Walk With Rifle', [spot.donnelly], { stop: 'Looking Around', stopYaw: toTable(spot.donnelly), v: 0.7 });
      }
      if (ch === 5) {
        // the rockets: everyone down (60-80), up again, Hartzell and Donnelly back at the table by 90
        for (const [P, Ac, p] of [[hz, HZ, spot.hartzell], [dn, DN, spot.donnelly], [en, EN, spot.engel], [rt, CPR, spot.cpRTO]]) {
          const dive = 60.2 + r() * 0.6;
          const out = yawOf(p[0] - tableMid[0], p[1] - tableMid[1]) + (r() - 0.5) * 0.6;
          P.hold(dive, 'Prone Idle', { fade: 0.5, x: p[0] + Math.sin(out) * 0.5, z: p[1] + Math.cos(out) * 0.5, yaw: out, turn: 0.4 });
          P.hold(80.5 + r() * 2, 'Crouch Idle 02 Looking Around', { fade: 1.0, x: p[0], z: p[1] });
          P.hold(85 + r() * 2, Ac === HZ ? 'Sitting Idle' : 'Looking Around', { fade: 1.0, yaw: Ac === EN ? faceTo(p, radioCrate) : toTable(p) });
        }
      }
      if (ch === 7) {
        // 1745: Hartzell and Donnelly at the radio for Cahill's call
        hz.hold(101, 'Looking Around', { fade: 1.0 });
        hz.walk(101.5, 'Walk With Rifle', [tL(1.6, 0.0)], { stop: 'Looking Around', stopYaw: faceTo(tL(1.6, 0.0), spot.cpRTO), v: 0.6 });
        dn.walk(102, 'Walk With Rifle', [tL(2.1, 1.5)], { stop: 'Looking Around', stopYaw: faceTo(tL(2.1, 1.5), spot.cpRTO), v: 0.6 });
        hz.walk(114, 'Walk With Rifle', [spot.hartzell], { stop: 'Sitting Idle', stopYaw: toTable(spot.hartzell), v: 0.6 });
        dn.walk(114.5, 'Walk With Rifle', [spot.donnelly], { stop: 'Looking Around', stopYaw: toTable(spot.donnelly), v: 0.6 });
      }
      if (ch === 9 || ch === 10) { en.hold(3, 'Looking Around', { fade: 0.8 }); }
      idles(dn, DN, L, ['Looking Around', 'Pointing', 'Looking Around'], r, { from: ch === 2 ? 1e9 : ch === 5 ? 90 : ch === 7 ? 1e9 : 0 });
      // Cahill and his radioman: chapters 1-4
      if (ch <= 4) {
        const ca = Plan(CAH, ch, L, spot.cahill[0], spot.cahill[1], toTable(spot.cahill), 'Looking Around');
        const cr = Plan(CAHR, ch, L, spot.cahillRTO[0], spot.cahillRTO[1], toTable(spot.cahillRTO), 'Looking Around');
        if (ch === 2) { ca.walk(6, 'Walk With Rifle', [spot.watchC], { stop: 'Looking Around', stopYaw: towardRidge, v: 0.7 }); ca.hold(30, 'Pointing'); ca.hold(34, 'Looking Around'); ca.walk(78, 'Walk With Rifle', [spot.cahill], { stop: 'Looking Around', stopYaw: toTable(spot.cahill), v: 0.7 }); }
        if (ch === 3) { ca.walk(40, 'Walk With Rifle', [tL(1.9, 0.6)], { stop: 'Looking Around', stopYaw: faceTo(tL(1.9, 0.6), spot.cpRTO), v: 0.6 }); ca.walk(60, 'Walk With Rifle', [spot.cahill], { stop: 'Looking Around', stopYaw: toTable(spot.cahill), v: 0.6 }); }
        if (ch === 4) {
          // the noon request lands; Cahill decides, and goes forward with his radioman to Charlie's forming point
          ca.hold(10, 'Pointing'); ca.hold(14, 'Looking Around');
          const pts = [tL(3.4, -3.2), [lerp(T.pos.x, cahillEnd[0], 0.5), lerp(T.pos.z, cahillEnd[1], 0.5)], cahillEnd];
          ca.walk(28, 'Walk With Rifle', pts, { stop: 'Looking Around', v: 0.95, stopYaw: towardRidge });
          cr.walk(29.2, 'Walk With Rifle', [tL(3.9, -3.6)].concat(pts.slice(1, 2), [[cahillEnd[0] + 1.6, cahillEnd[1] + 1.0]]), { stop: 'Looking Around', v: 0.95, stopYaw: towardRidge });
          cr.gesture(82.5, 7, 'Talking On Phone');
        }
        if (ch === 1) cr.gesture(16, 7, 'Talking On Phone');
      } else { hidden(CAH, ch, L); hidden(CAHR, ch, L); }
      void en;
    }
    function lerp(a, b, k) { return a + (b - a) * k; }

    // =================================================================== Company A
    // A's roster: 0 Banks, 1 his radioman, 2-3 corpsmen, 4 Lovely, 5-23 1st Platoon (5-9 and 10-14 the two squads that
    // push in first), 24 Hayden, 25 his platoon sergeant, 26-44 2nd Platoon.
    const r0 = rng(77);
    // ---- chapter 1: forming on the south-west side of 689, checking gear
    {
      const L = LOOPS[1];
      const cluster = (bear, rad) => onRing(bear, -perim.rAt(bear) + rad);
      const groups = { hq: cluster(222, 36), p1: cluster(238, 29), p2: cluster(205, 31) };
      const placed = [];
      const near = (c, rad, r) => { for (let k = 0; k < 40; k++) { const a = r() * TAU, d = rad * Math.sqrt(r()); const p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; if (placed.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1.7)) { placed.push(p); return p; } } const p = [c[0] + r() * 2, c[1] + r() * 2]; placed.push(p); return p; };
      A.forEach((Ac, i) => {
        const r = rng(500 + i);
        const g = i <= 3 ? 'hq' : i <= 23 ? 'p1' : 'p2';
        const p = i === 0 ? groups.hq : i === 1 ? [groups.hq[0] + 1.2, groups.hq[1] + 0.6] : near(groups[g], g === 'hq' ? 3 : 6.5, r);
        if (i <= 1) placed.push(p);
        const face = i === 24 ? faceTo(p, groups.p2) + Math.PI : faceTo(p, groups[g]) + (r() - 0.5) * 1.6 + (r() < 0.5 ? Math.PI : 0);
        const set = IDLE[Ac.kind];
        const c0 = Ac.kind === 'rifleman' ? ['Rifle Idle', 'Rifle Kneel Idle', 'Looking Around', 'Idle Crouching'][Math.floor(r() * 4)] : i === 0 || i === 24 ? 'Looking Around' : set[0];
        const P = Plan(Ac, 1, L, p[0], p[1], face, c0);
        if (i === 0) { P.hold(18, 'Pointing'); P.hold(22, 'Looking Around'); P.hold(38, 'Talking On Phone', { ct0: 3 }); P.hold(45, 'Looking Around'); }
        else if (i === 24) { P.hold(26, 'Pointing'); P.hold(30, 'Looking Around'); }
        else idles(P, Ac, L, set, r);
      });
    }
    // ---- chapter 2: the patrol as one moving column (fix pass, spacing: 2.5-3.5 m in grass and forest, platoons
    // 12 m apart). Every man walks the same distance-time profile along the A route (walking in grass, crouched in the
    // forest crossing), lagged behind the point man by his own time; so the file closes up where the going is slower,
    // and a man who checks his pace opens a gap ahead and the man behind closes on him. The chapter fades at its seam
    // (index.html LOOP SEAM), so the column only has to walk one stretch of the route a loop: the head from about 250 m
    // down the route (the forest crossing) to about 320 m (the far tongue), the tail from about 90 m to 175 m.
    const CH2 = (() => {
      const L = LOOPS[2], route = lanePts(0, S6.routes.A.map((p) => [p.x, p.z]));
      const full = mkPath(route), pieces = [];
      const vw = 0.92, vc = 0.7;
      for (let d = 0; d < full.len - 0.01; d += 4) {
        const e = Math.min(full.len, d + 4), m = pathAt(full, (d + e) / 2, { x: 0, z: 0 });
        const forest = ctx.land && ctx.land.cls ? ctx.land.cls(m.x, m.z) === 0 : false;
        pieces.push({ d0: d, d1: e, clip: forest ? crouchWalk : 'Walk With Rifle', v: forest ? vc : vw });
      }
      for (let i = 1; i < pieces.length - 1; i++) if (pieces[i - 1].clip === pieces[i + 1].clip && pieces[i].clip !== pieces[i - 1].clip) { pieces[i].clip = pieces[i - 1].clip; pieces[i].v = pieces[i - 1].v; }
      let tt = 0; for (const p of pieces) { p.t0 = tt; tt += (p.d1 - p.d0) / p.v; p.t1 = tt; }
      const tOf = (d) => { for (const p of pieces) if (d <= p.d1) return p.t0 + (d - p.d0) / p.v; return tt; };
      return { L, full, pieces, total: tt, T0: tOf(Math.min(250, full.len - 90)), tOf };
    })();
    // the man's place on the profile: tg = T0 + t - lag(t); a check (he slows to look, then makes it up) bumps the lag
    function ch2Lag(s, t) {
      let lag = s.lag;
      for (const c of s.checks) { const u = t - c.t; if (u > 0) lag += u < 4 ? c.a * sm(u / 4) : u < 13 ? c.a * (1 - sm((u - 4) / 9)) : 0; }
      return lag;
    }
    function conveyorPos(s, t, out) {
      const C = CH2, P = C.pieces;
      const tg = clamp(C.T0 + t - ch2Lag(s, t), 0, C.total);
      let i = s.hint || 0;
      while (i > 0 && P[i].t0 > tg) i--; while (i < P.length - 1 && P[i].t1 < tg) i++;
      s.hint = i;
      const p = P[i], d = Math.min(p.d1, p.d0 + (tg - p.t0) * p.v);
      pathAt(C.full, d, out);
      const y = pathYaw(C.full, d), side = s.side + 0.18 * Math.sin(d * 0.21 + s.ph);
      out.x += Math.cos(y) * side; out.z -= Math.sin(y) * side;
      out.yaw = y; out.d = d; out.sink = 0; out.piece = i; out.tg = tg;
      return out;
    }
    const _cp = { x: 0, z: 0, yaw: 0, sink: 0, d: 0, piece: 0, tg: 0 };
    function conveyorLayers(Ac, s, t, S, w) {
      conveyorPos(s, t, _cp);
      const P = CH2.pieces, p = P[_cp.piece], tg = _cp.tg;
      // the clip runs with the profile time, so the feet keep to the ground through a check
      const ct = (clip) => loopT(clip, tg * s.rates[clip] + s.ph);
      const prev = _cp.piece > 0 ? P[_cp.piece - 1] : null;
      if (prev && prev.clip !== p.clip && tg - p.t0 < 0.6) { const k = sm((tg - p.t0) / 0.6); addLayer(S, p.clip, ct(p.clip), w * k); addLayer(S, prev.clip, ct(prev.clip), w * (1 - k)); }
      else addLayer(S, p.clip, ct(p.clip), w);
    }
    {
      const C = CH2, L = C.L;
      // file order from the point: Hayden's platoon (two men on point, Hayden, the corpsman mid-file, the platoon
      // sergeant at its tail); 12 m; Banks and his radioman; 12 m; 1st Platoon, Lovely second from its head
      const P2 = A.map((_, i) => i).filter((i) => i >= 26);
      const plt2 = [P2[0], P2[1], 24].concat(P2.slice(2, 9), [2], P2.slice(9), [25]);
      const hq = [0, 1];
      const P1 = A.map((_, i) => i).filter((i) => i >= 5 && i <= 23);
      const plt1 = [P1[0], 4].concat(P1.slice(1, 9), [3], P1.slice(9));
      const blocks = [plt2, hq, plt1];
      const rr = rng(902), DT = 3.5;   // 3.5 s: 3.2 m walking in grass, 2.45 m crouched in the forest
      let lag = 0;
      blocks.forEach((blk, bi) => {
        if (bi > 0) lag += 12 / 0.92;
        blk.forEach((ai, j) => {
          if (j > 0) {
            const u = rr();
            lag += u < 0.1 ? 2.1 + rr() * 0.4 : u < 0.18 ? 5.2 + rr() * 1.0 : DT + (rr() - 0.5) * 1.3;   // bunched, a gap, else 3.5 s +- 0.65
          }
          const Ac = A[ai];
          const rates = {};
          for (const clip of ['Walk With Rifle', crouchWalk]) { const v = clip === crouchWalk ? 0.7 : 0.92; rates[clip] = v / (V0[clip] * Ac.scale * Ac.stride); }
          const checks = [];
          for (let tc = 6 + rr() * 30; tc < L - 14; tc += 25 + rr() * 40) if (rr() < 0.45) checks.push({ t: tc, a: 1.4 + rr() * 1.2 });
          Ac.plans[2] = [{ type: 'C', t0: 0, lag, checks, side: (rr() - 0.5) * 0.7, rates, ph: Ac.phase * 7, clip: 'Walk With Rifle', x: 0, z: 0, yaw: 0, yawFrom: 0, sink: 0, fade: FADE }];
          Ac.L[2] = L;
        });
      });
      C.tailLag = lag;
    }
    // ---- chapter 3: contact
    const restA = {};   // each man's pose as chapter 3 ends: chapters 4-7 start from it
    {
      const L = LOOPS[3];
      const fallW = { 7: 11.2, 12: 12.6 };                 // the two men of the first squads
      const deadAt = { 24: 45, 25: 48 };                     // Hayden, then his platoon sergeant
      const woundAt = { 30: 36.5, 38: 41, 41: 52 };          // in the assault
      const mortarHit = { 16: 58.3, 33: 81.3, 9: 103.2 };    // hit near the mortar bursts
      const MORTARS = [38, 58, 81, 103];
      const dragged = { 7: { pair: [18, 19], t: 50 }, 12: { pair: [21, 22], t: 57 } };   // fix pass: earlier, so the first drag is under way by 70
      const pairOf = {}; for (const w in dragged) dragged[w].pair.forEach((p, j) => { pairOf[p] = { w: +w, j, t: dragged[w].t }; });
      const plans = {};
      const order3 = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 4].concat(A.map((_, i) => i).filter((i) => i >= 24), [0, 1, 2, 3]);
      order3.forEach((i) => {
        const Ac = A[i];
        const r = rng(3000 + i);
        let P;
        if (i >= 5 && i <= 14) {
          // the two squads: from the base line, crouched, into the grass; fire opens at 11
          const lane = i - 5, s0 = -10 + lane * 2.2 + (r() - 0.5) * 0.8, b0 = 23 + r() * 2, b1 = 14.5 + r() * 2.5;
          const p0 = pA(b0, s0), p1 = pA(b1, s0 + (r() - 0.5) * 1.5);
          P = Plan(Ac, 3, L, p0[0], p0[1], yawBunk, 'Rifle Kneel Idle');
          P.walk(0.6 + r() * 0.8, crouchWalk, [p1], { v: 0.9, stop: 'Rifle Kneel Idle' });
          if (fallW[i]) {
            P.once(fallW[i], 'Dying (1)', { then: 'Laying Breathless', thenAfter: 3.9 });
          } else if (mortarHit[i]) {
            P.hold(11.4 + r() * 1.4, 'Prone Idle', { fade: 0.55 });
            P.hold(mortarHit[i], 'Laying Breathless', { fade: 1.2 });
          } else {
            P.hold(11.4 + r() * 1.4, 'Prone Idle', { fade: 0.55 });
            // after 60 the fringe crawls back a few metres
            const p = P.at(62), back = [p.x - uA.x * 5.5, p.z - uA.z * 5.5];
            P.walk(62 + r() * 12, 'Low Crawl', [back], { rev: true, v: 0.25, stop: 'Prone Idle' });
            for (const t of [24, 47, 70, 96]) if (r() < 0.35) P.fire(t + r() * 6, 3 + Math.floor(r() * 3), bunkTarget(i));
          }
        } else if ((i >= 15 && i <= 23) || i === 4) {
          // the base of fire: kneeling on the base line, answering from 16
          const lane = i === 4 ? 4.5 : i - 15, s0 = -12 + lane * 2.8 + (r() - 0.5), b0 = 25 + r() * 3;
          const p0 = pA(b0, s0);
          P = Plan(Ac, 3, L, p0[0], p0[1], yawBunk + (r() - 0.5) * 0.3, i === 4 ? 'Crouch Idle 02 Looking Around' : 'Rifle Kneel Idle');
          if (i === 4) { P.hold(29, 'Kneeling Pointing', { fade: 0.6 }); P.hold(33.5, 'Crouch Idle 02 Looking Around', { fade: 0.6 }); }
          if (pairOf[i]) {
            // a drag pair: forward to the wounded man, then back to A's LZ with him
            const D0 = pairOf[i], wp = plans[D0.w] ? plans[D0.w].at(D0.t + 8) : null;
            const wpos = wp ? [wp.x, wp.z] : pA(16, 0);
            const side = D0.j ? 0.55 : -0.55;
            const reach = [wpos[0] - uA.x * 0.9 + rA.x * side, wpos[1] - uA.z * 0.9 + rA.z * side];
            P.walk(D0.t, crouchWalk, [reach], { v: 0.75, stop: 'Rifle Kneel Idle', stopYaw: yawBunk });
            const tArr = P.endsAt + 1.6;
            const lz = [ALZ.x + rA.x * (side * 2 + (D0.w === 12 ? 2.5 : -2.5)), ALZ.z + rA.z * (side * 2 + (D0.w === 12 ? 2.5 : -2.5))];
            const path = mkPath([reach, [lerp(reach[0], lz[0], 0.5) + rA.x * side, lerp(reach[1], lz[1], 0.5) + rA.z * side], lz]);
            P.walk(tArr, crouchWalk, null, { path, rev: true, v: 0.42, stop: 'Rifle Kneel Idle', stopYaw: yawBunk });
            Ac.drag = { path, t: tArr, v: 0.42, side };
            dragged[D0.w].path = path; dragged[D0.w].t2 = tArr;
          } else {
            for (let t = 16 + r() * 8; t < 112; t += 15 + r() * 18) P.fire(t, 3 + Math.floor(r() * 4), bunkTarget(i));
            if (mortarHit[i]) P.once(mortarHit[i], 'Dying (2)', { then: 'Laying Breathless', thenAfter: DUR['Dying (2)'] - 0.8 });
          }
        } else if (i >= 24) {
          // Hayden's platoon: in reserve behind the base line, then the assault in short rushes (30-50)
          const lane = i - 24, s0 = -14 + lane * 1.45 + (r() - 0.5) * 0.8, b0 = 31 + r() * 4;
          const p0 = pA(b0, s0);
          P = Plan(Ac, 3, L, p0[0], p0[1], yawBunk + (r() - 0.5) * 0.4, i === 24 ? 'Crouch Idle 02 Looking Around' : 'Rifle Kneel Idle');
          if (i === 24) { P.hold(27.5, 'Kneeling Pointing', { fade: 0.5 }); }
          let t = 30 + r() * 2.5, b = b0;
          const bEnd = 10.5 + r() * 3, rushes = 4, step = (b0 - bEnd) / rushes;
          for (let k = 0; k < rushes; k++) {
            const nb = b - step, p = pA(nb, s0 + (r() - 0.5) * 1.2);
            P.walk(t, 'Rifle Run', [p], { v: 1.95, stop: i === 24 ? 'Crouch Idle 02 Looking Around' : 'Rifle Kneel Idle', stopYaw: yawBunk });
            const tk = P.endsAt;
            if (i !== 24 && r() < 0.4) P.fire(tk + 0.5 + r() * 0.6, 3 + Math.floor(r() * 3), bunkTarget(i));
            t = tk + 1.6 + r() * 0.8; b = nb;
          }
          const tHalt = Math.max(t, 49 + r() * 2);
          if (deadAt[i]) {
            // killed (DY p. 313), but on screen every fallen man breathes as wounded (Abram's ruling, 2026-11-09): the
            // deaths are in the panel and the labels, not in the poses
            P.once(deadAt[i], i === 24 ? 'Dying' : 'Dying (1)', { then: 'Laying Breathless', thenAfter: i === 24 ? DUR['Dying'] - 0.8 : 3.9 });
          } else if (woundAt[i]) {
            P.once(woundAt[i], 'Dying (1)', { then: 'Laying Breathless', thenAfter: 3.9 });
          } else {
            P.hold(tHalt, i % 3 === 0 ? 'Idle Crouching' : 'Prone Idle', { fade: 0.6 });
            if (mortarHit[i]) P.hold(mortarHit[i], 'Laying Breathless', { fade: 1.2 });
            else {
              const p = P.at(64), back = [p.x - uA.x * 5, p.z - uA.z * 5];
              if (i % 3 === 0) P.hold(63 + r() * 4, 'Prone Idle', { fade: 0.7 });
              P.walk(66 + r() * 14, 'Low Crawl', [back], { rev: true, v: 0.24, stop: 'Prone Idle' });
              for (const t2 of [72, 99]) if (r() < 0.3) P.fire(t2 + r() * 8, 3, bunkTarget(i));
            }
          }
        } else {
          // HQ: Banks and his radioman behind the base line; the corpsmen go to the wounded
          const p0 = i === 0 ? pA(28, 7) : i === 1 ? pA(28.6, 8.3) : i === 2 ? pA(29.5, 4) : pA(32, -6);
          P = Plan(Ac, 3, L, p0[0], p0[1], yawBunk, 'Crouch Idle 02 Looking Around');
          if (i === 0) for (const [a, b] of [[33, 39.5], [43.5, 49], [51.5, 57]]) { P.hold(a, 'Talking On Phone', { fade: 0.8, ct0: 1 }); P.hold(b, 'Crouch Idle 02 Looking Around', { fade: 0.8 }); }
          if (i === 2) {
            // to the first wounded man, beside him until the pair comes, then back with them
            const wp = plans[7] ? plans[7].at(30) : null, w = wp ? [wp.x + rA.x * 1.1 - uA.x * 0.3, wp.z + rA.z * 1.1 - uA.z * 0.3] : pA(16, 1);
            P.walk(17, crouchWalk, [w], { v: 0.75, stop: 'Crouch Idle 02 Looking Around', stopYaw: faceTo(w, wp ? [wp.x, wp.z] : w) });
            const back = pA(29.5, 4);
            P.walk(dragged[7].t2 ? dragged[7].t2 + 2 : 80, crouchWalk, [back], { v: 0.45, stop: 'Crouch Idle 02 Looking Around', stopYaw: yawBunk });
          }
          if (i === 3) {
            const wp = plans[30] ? null : null; void wp;
            const w = pA(15, -6.5);
            P.walk(56, crouchWalk, [w], { v: 0.75, stop: 'Crouch Idle 02 Looking Around', stopYaw: yawBunk });
          }
        }
        plans[i] = P;
        for (const t of MORTARS) if (!(deadAt[i] && t > deadAt[i]) && !(woundAt[i] && t > woundAt[i]) && !(fallW[i] && t > fallW[i])) P.flinch(t + 0.05 + r() * 0.2);
      });
      // the dragged men slide along with their pairs, lying on their backs, head toward the pair
      for (const w in dragged) {
        const Dg = dragged[w], P = plans[w];
        if (!Dg.path) continue;
        const path = Dg.path;
        // lead him a body length ahead of the pair (toward the bunkers), on the same path
        const lead = mkPath([[path.pts[0][0] + uA.x * 1.0, path.pts[0][1] + uA.z * 1.0]].concat(path.pts));
        P.walk(Dg.t2, 'Laying Breathless', null, { path: lead, d0: 0, d1: lead.len - 1.0, v: 0.42, yawFixed: yawBunk, turn: 2.0, stop: 'Laying Breathless', stopYaw: yawBunk });
        (A[w].pon = A[w].pon || {})[3] = Dg.t2 - 1.2;   // dragged on a poncho (integration)
      }
      A.forEach((Ac) => { const s = stateAt(Ac, 3, L - 0.01, S1); let m = '', mw = 0; for (let j = 0; j < s.n; j++) if (s.ws[j] > mw) { mw = s.ws[j]; m = s.clips[j]; } restA[Ac.idx] = { x: s.x, z: s.z, yaw: s.yaw, clip: m, ghost: s.ghost }; });
    }
    // A pinned (chapters 4-7) begins from chapter 3's end
    const downA = (Ac) => { const r = restA[Ac.idx]; return /Dying|Laying/.test(r.clip) || !!r.ghost; };
    function pinnedA(Ac, ch, L, o) {
      o = o || {};
      const rs = o.rest || restA[Ac.idx], r = rng(ch * 401 + Ac.idx);
      const P = Plan(Ac, ch, L, rs.x, rs.z, rs.yaw, rs.clip);
      if (rs.ghost) (Ac.ghosts[ch] = Ac.ghosts[ch] || []).push({ t: -1e9, clip: rs.ghost });
      if (!downA(Ac) && !o.still) {
        if (KNEELING.has(rs.clip)) idles(P, Ac, L, Ac.kind === 'rifleman' ? ['Rifle Kneel Idle', 'Idle Crouching', 'Rifle Kneel Idle'] : ['Crouch Idle 02 Looking Around'], r, { to: o.to });
        if (o.fire !== false && Ac.kind === 'rifleman' && (KNEELING.has(rs.clip) || rs.clip === 'Prone Idle')) for (const t of o.fireAt || []) if (r() < 0.16) P.fire(t + r() * 5, 3 + Math.floor(r() * 3), bunkTarget(Ac.idx));
      }
      return P;
    }
    // ---- chapter 4: pinned; Banks asks for help at noon
    A.forEach((Ac, i) => {
      const P = pinnedA(Ac, 4, LOOPS[4], { fireAt: [6, 18, 31, 44, 57, 70] });
      if (i === 0) { P.hold(0.4, 'Talking On Phone', { ct0: 4, fade: 0.6 }); P.hold(7.5, 'Crouch Idle 02 Looking Around', { fade: 0.8 }); P.hold(84, 'Crouch Idle 02 Looking Around'); }
    });
    // ---- chapter 5: pinned
    A.forEach((Ac) => pinnedA(Ac, 5, LOOPS[5], { fireAt: [9, 33, 52, 77, 101] }));
    // ---- chapter 6: pinned; three wounded low-crawl east toward D, D pairs come for them
    const crawlers = [30, 38, 41].filter((i) => downA(A[i]));
    const crawlPlan = {};
    A.forEach((Ac, i) => {
      if (!crawlers.includes(i)) { pinnedA(Ac, 6, LOOPS[6], { fireAt: [12, 40, 66] }); return; }
      const rs = restA[Ac.idx], k = crawlers.indexOf(i);
      const P = Plan(Ac, 6, LOOPS[6], rs.x, rs.z, rs.yaw, 'Laying Breathless');
      const toD = yawOf(DS.x - rs.x, DS.z - rs.z), dir = { x: Math.sin(toD), z: Math.cos(toD) };
      const end = [rs.x + dir.x * 13, rs.z + dir.z * 13];
      P.hold(3 + k * 2, 'Prone Idle', { fade: 1.2, yaw: toD });
      P.walk(5.5 + k * 2, 'Low Crawl', [end], { v: 0.28, stop: 'Prone Idle' });
      crawlPlan[i] = { P, end, toD };
    });
    // ---- chapter 7: pinned; Banks hit at 80, Lovely takes A; the withdrawal at 97
    // (the three who crawled to D in chapter 6 lie where chapter 6 left them)
    const rest6 = {};
    for (const i of crawlers) { const C = crawlPlan[i], ux = Math.sin(C.toD), uz = Math.cos(C.toD); rest6[i] = { x: C.end[0] + ux * 15, z: C.end[1] + uz * 15, yaw: C.toD + Math.PI, clip: 'Laying Breathless', ghost: restA[A[i].idx].ghost }; }
    {
      const L = LOOPS[7], tW = at(7, '1730');
      A.forEach((Ac, i) => {
        const rs = restA[Ac.idx], r = rng(7100 + i);
        const P = pinnedA(Ac, 7, L, { fireAt: [8, 30, 55, 76], to: 92, rest: rest6[i] });
        if (i === 0) {
          P.hold(62, 'Looking Around', { fade: 1.0 });
          P.hold(80, 'Injured Idle', { fade: 0.35 });
          P.walk(100, 'Injured Walk', [[ALZ.x - rA.x * 3, ALZ.z - rA.z * 3]], { v: 0.55, stop: 'Injured Idle' });
        } else if (i === 4) {
          const p = [restA[0].x + rA.x * 1.6 - uA.x * 0.5, restA[0].z + rA.z * 1.6 - uA.z * 0.5];
          P.walk(81, crouchWalk, [p], { v: 0.8, stop: 'Crouch Idle 02 Looking Around', stopYaw: yawBunk });
          P.hold(Math.max(84, P.endsAt + 0.5), 'Pointing', { fade: 0.6, yaw: yawBunk + 0.3 });
          P.hold(92, 'Crouch Idle 02 Looking Around', { fade: 0.7 });
          P.hold(tW + 0.5, 'Pointing', { fade: 0.5, yaw: yawBack });
          P.hold(tW + 4, 'Crouch Idle 02 Looking Around', { fade: 0.7 });
        } else if (!downA(Ac) && i >= 5) {
          // after the order: the line pulls back toward the LZ, crouched; the pairs drag the wounded
          const p = [rs.x - uA.x * (4 + r() * 4), rs.z - uA.z * (4 + r() * 4)];
          if (rs.clip === 'Prone Idle') P.hold(tW + 1 + r() * 3, 'Rifle Kneel Idle', { fade: 0.9 });
          P.walk(tW + 4 + r() * 5, crouchWalk, [p], { v: 0.45, stop: 'Rifle Kneel Idle', stopYaw: yawBunk });
        }
      });
      // two wounded still at the fringe go back to the LZ with pairs (rev crouch walk, the man sliding)
      const pairs = [[33, 26, 27], [9, 28, 29]];
      for (const [w, a, b] of pairs) {
        const Wm = A[w], ra = restA[Wm.idx];
        if (!downA(Wm) || downA(A[a]) || downA(A[b])) continue;
        const lz = [ALZ.x + rA.x * (w === 30 ? -4 : 4), ALZ.z + rA.z * (w === 30 ? -4 : 4)];
        const path = mkPath([[ra.x - uA.x * 0.9, ra.z - uA.z * 0.9], lz]);
        [a, b].forEach((ai, j) => {
          const Ac = A[ai], rs = restA[Ac.idx], side = j ? 0.55 : -0.55;
          const P = Plan(Ac, 7, L, rs.x, rs.z, rs.yaw, rs.clip);
          const reach = [path.pts[0][0] + rA.x * side, path.pts[0][1] + rA.z * side];
          P.walk(tW + 1 + j * 0.4, crouchWalk, [reach], { v: 0.8, stop: 'Rifle Kneel Idle', stopYaw: yawBunk });
          const t2 = tW + 1 + Math.hypot(reach[0] - rs.x, reach[1] - rs.z) / 0.8 + 2.2;
          const pth = mkPath(path.pts.map((p) => [p[0] + rA.x * side, p[1] + rA.z * side]));
          P.walk(Math.max(t2, P.endsAt + 1.4), crouchWalk, null, { path: pth, rev: true, v: 0.42, stop: 'Rifle Kneel Idle', stopYaw: yawBunk });
          Wm._t2 = Math.max(Wm._t2 || 0, Math.max(t2, P.endsAt));
        });
        const P = Plan(Wm, 7, L, ra.x, ra.z, ra.yaw, ra.clip);
        if (ra.ghost) (Wm.ghosts[7] = []).push({ t: -1e9, clip: ra.ghost });
        const lead = mkPath([[ra.x, ra.z]].concat(path.pts.slice(1).map((p) => [p[0] + uA.x * 1.0, p[1] + uA.z * 1.0])));
        P.hold(Wm._t2 - 0.6, 'Laying Breathless', { fade: 0.8, yaw: yawBunk });
        P.walk(Wm._t2 + 0.5, 'Laying Breathless', null, { path: lead, v: 0.42, yawFixed: yawBunk, turn: 2.0, stop: 'Laying Breathless', stopYaw: yawBunk });
      }
    }
    // ---- chapter 7, after the order: every other fallen man of A is dragged toward A's LZ by the two nearest men
    // still up (Abram's ruling, 2026-11-09: nobody left lying on the field at the withdrawal); poncho drags as above
    {
      const L = LOOPS[7], tW = at(7, '1730');
      const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
      const busy = new Set([0, 1, 2, 3, 4, 26, 27, 28, 29, 33, 9]);
      const toDrag = A.map((Ac, i) => i).filter((i) => !busy.has(i) && downA(A[i]));
      const free = A.map((Ac, i) => i).filter((i) => !busy.has(i) && !downA(A[i]));
      toDrag.forEach((w, k) => {
        const Wm = A[w];
        const s0 = stateAt(Wm, 7, tW + 6, S1), ws = { x: s0.x, z: s0.z }, wp = [ws.x, ws.z];
        const dAt = {}; for (const i of free) { const st = stateAt(A[i], 7, tW, S1); dAt[i] = dist(st, ws); }
        free.sort((p, q) => dAt[p] - dAt[q]);
        const pair = free.splice(0, 2); if (pair.length < 2) return;
        const lz = [ALZ.x + rA.x * (((k % 5) - 2) * 2.4), ALZ.z + rA.z * (((k % 5) - 2) * 2.4)];
        const dx = lz[0] - wp[0], dz = lz[1] - wp[1], dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, run = Math.min(14, Math.max(4, dl - 2));
        const yawW = yawOf(-ux, -uz), t1 = tW + 1.5 + (k % 4) * 1.1;
        pair.forEach((ai, j) => {
          const Ac = A[ai], side = j ? 0.55 : -0.55, steps = Ac.plans[7];
          const keep = steps.findIndex((st) => st.t0 >= tW + 0.5); if (keep > 0) steps.length = keep;
          const pl = Plan(Ac, 7, L, 0, 0, 0, 'Rifle Idle'); pl.steps.length = 0; for (const st of steps) pl.steps.push(st); Ac.plans[7] = pl.steps;
          const reach = [wp[0] + ux * 0.95 - uz * side, wp[1] + uz * 0.95 + ux * side];
          const far = (() => { const st = pl.at(t1); return Math.hypot(st.x - reach[0], st.z - reach[1]) > 8; })();
          pl.walk(t1 + j * 0.4, far ? 'Rifle Run' : crouchWalk, [reach], { v: far ? 1.9 : 0.9, stop: 'Rifle Kneel Idle', stopYaw: yawW });
          const t2 = Math.max(t1 + 4, pl.endsAt + 1.4);
          pl.walk(t2, crouchWalk, [[reach[0] + ux * run, reach[1] + uz * run]], { rev: true, v: 0.42, yawFixed: yawW, stop: 'Rifle Kneel Idle', stopYaw: yawW });
          Wm._t2 = Math.max(Wm._t2 || 0, t2);
        });
        const steps = Wm.plans[7], pl = Plan(Wm, 7, L, 0, 0, 0, 'Rifle Idle'); pl.steps.length = 0; for (const st of steps) pl.steps.push(st); Wm.plans[7] = pl.steps;
        pl.hold(Wm._t2 - 1.0, 'Laying Breathless', { fade: 0.9, yaw: yawW });
        (Wm.pon = Wm.pon || {})[7] = Wm._t2 - 1.2;
        pl.walk(Wm._t2 + 0.2, 'Laying Breathless', null, { path: mkPath([wp, [wp[0] + ux * run, wp[1] + uz * run]]), v: 0.42, yawFixed: yawW, turn: 2.0, stop: 'Laying Breathless', stopYaw: yawW });
      });
    }
    // Delta's four sniper casualties (chapter 7) and the times they fall; declared here for chapter 8's files
    const deltaDown = { 5: 22, 12: 31, 9: 43, 16: 55 };
    // ---- chapter 8: dusk; the files down the withdrawal lane
    const wLane = mkPath(lanePts(5, (S6.routes.withdraw || [S6.czlz, S6.saddle, S6.crossing.from, S6.perimSW]).map((p) => [p.x, p.z])));
    const lanePath = (() => { const d0 = nearestD(wLane, ALZ.x, ALZ.z), pts = []; for (let d = d0; d <= Math.min(wLane.len, d0 + 60); d += 2) { pathAt(wLane, d, _pa); pts.push([_pa.x, _pa.z]); } return mkPath(pts); })();
    function files(ch, members, side, t0, gap, o) {
      const L = LOOPS[ch];
      const lp = mkPath(lanePath.pts.map((p, k) => { const y = pathYaw(lanePath, lanePath.cum[k]); return [p[0] + Math.cos(y) * side, p[1] - Math.sin(y) * side]; }));
      // fix pass, spacing: a man every 3.3 s (3.0 m at 0.92 m/s), +-0.65 s, so the file keeps touch in the grass
      const rg = rng(8800 + Math.round(side * 100)); let e = t0;
      members.forEach((Ac, j) => {
        if (j > 0) e = Math.min(e + gap + (rg() - 0.5) * 1.3, 87.5 - o.len / 0.92);
        const clip = o.injured && o.injured.includes(Ac.idx) ? 'Injured Walk' : 'Walk With Rifle';
        const P = Plan(Ac, ch, L, lp.pts[0][0], lp.pts[0][1], pathYaw(lp, 0), clip);
        P.steps[0].type = 'X';
        P.walk(e, clip, null, { path: lp, d0: 0, d1: o.len, v: 0.92, sinkIn: true, sinkOut: true });
        P.hide(P.endsAt + 0.05);
      });
    }
    {
      const alive = (Ac) => !downA(Ac);
      // 14 a file (fix pass, spacing): at 3 m apart that many clear the 40 m of lane by about 87
      const aFile = A.filter((Ac) => alive(Ac)).slice(0, 14);
      if (!aFile.includes(A[0])) aFile.splice(4, 1, A[0]);
      const dFile = D.filter((Ac, i) => deltaDown[i] === undefined).slice(0, 14);   // the four wounded went out from the LZ, not walking (fix pass)
      files(8, aFile, -0.35, 0.4, 3.3, { len: 40, injured: [0] });
      files(8, dFile, 0.45, 1.9, 3.3, { len: 40 });
      for (const Ac of A) if (!Ac.plans[8]) hidden(Ac, 8, LOOPS[8]);
      for (const Ac of D) if (!Ac.plans[8]) hidden(Ac, 8, LOOPS[8]);
    }
    // ---- chapter 9: the last stragglers come up to the perimeter (90-110)
    {
      const L = LOOPS[9], fr = S6.crossing.from, pw = S6.perimSW;
      const inside = [pw.x + (T.pos.x - pw.x) * 0.15, pw.z + (T.pos.z - pw.z) * 0.15];
      const ids = [5, 6, 8, 10, 11, 13];
      A.forEach((Ac, i) => {
        const k = ids.indexOf(i);
        if (k < 0) { hidden(Ac, 9, L); return; }
        const dA = nearestD(wLane, fr.x, fr.z), dB = nearestD(wLane, pw.x, pw.z), pts = [];
        for (let d = dA; d <= dB; d += 2) { pathAt(wLane, d, _pa); pts.push([_pa.x, _pa.z]); }
        pts.push([inside[0] + (k - 2.5) * 1.6, inside[1] + (k % 2) * 1.4]);
        const path = mkPath(pts);
        const P = Plan(Ac, 9, L, path.pts[0][0], path.pts[0][1], pathYaw(path, 0), 'Walk With Rifle');
        P.steps[0].type = 'X';
        const tStart = 40 + k * 3.5 + (k === 3 ? 1.6 : 0);   // fix pass: 3.0 m apart, one gap where a man stops to look
        P.walk(tStart, 'Walk With Rifle', null, { path, v: 0.86, sinkIn: true, stop: k % 2 ? 'Rifle Kneel Idle' : 'Rifle Idle' });
      });
    }
    // ---- chapter 10: nothing of A ----
    A.forEach((Ac) => hidden(Ac, 10, LOOPS[10]));
    // ---- chapter 11: two squads to the valley edge at 0630; four men at the CH-46's ramp
    {
      const L = LOOPS[11], pw = S6.perimSW, fr = S6.crossing.from;
      const dirV = { x: fr.x - pw.x, z: fr.z - pw.z }, dl = Math.hypot(dirV.x, dirV.z); dirV.x /= dl; dirV.z /= dl;
      const latV = { x: -dirV.z, z: dirV.x }, yawV = yawOf(dirV.x, dirV.z);
      A.forEach((Ac, i) => {
        const r = rng(1100 + i);
        if (i >= 5 && i <= 14) {
          // fix pass, spacing: each squad in its own file, 3 m man to man (+-0.5), the files 10 m apart (was a line
          // 2.4 m apart)
          const lane = i - 5, sq = lane < 5 ? -1 : 1, rank = lane % 5, sd = sq * 5 + (r() - 0.5) * 0.8;
          const p0 = [pw.x - dirV.x * (4 + rank * 3) + latV.x * sd, pw.z - dirV.z * (4 + rank * 3) + latV.z * sd];
          const a1 = 14 - rank * 3 + (r() - 0.5);
          const p1 = [pw.x + dirV.x * a1 + latV.x * sd * 1.1, pw.z + dirV.z * a1 + latV.z * sd * 1.1];
          const P = Plan(Ac, 11, L, p0[0], p0[1], yawV, 'Rifle Kneel Idle');
          P.walk(1 + rank * 0.4 + r() * 0.5, 'Walk With Rifle', [p1], { stop: rank === 0 ? 'Pointing' : 'Looking Around', stopYaw: yawV, v: 0.95 });
          P.hold(12.25 + r() * 0.9, 'Prone Idle', { fade: 0.5, yaw: yawV });
          P.walk(40 + r() * 8, 'Low Crawl', [[p1[0] - dirV.x * 6, p1[1] - dirV.z * 6]], { rev: true, v: 0.26, stop: 'Prone Idle' });
          P.hold(70 + r() * 6, 'Rifle Kneel Idle', { fade: 1.0, yaw: yawV });
          P.walk(74 + r() * 6, 'Walk With Rifle', [p0], { stop: 'Rifle Kneel Idle', stopYaw: yawV, v: 0.8 });
          if (rank === 0) P.gesture(9.8, 2.6, 'Pointing');
        } else if (i >= 15 && i <= 18) {
          // the ramp party: shown only while the ramp is down (see the frame update), crouched, facing out
          const P = Plan(Ac, 11, L, 0, 0, 0, 'Idle Crouching');
          Ac.ramp = i - 15;
          void P;
        } else hidden(Ac, 11, L);
      });
    }
    // ---- chapters 1-11 bookkeeping for A
    for (let ch = 1; ch <= 11; ch++) for (const Ac of A) if (!Ac.plans[ch]) hidden(Ac, ch, LOOPS[ch]);

    // =================================================================== Company D
    // chapter 5: lined up in file round the inside of 689's east and south side, moving out at 40; down 60-80
    const colPath = (() => {
      const pts = []; for (let b = 35; b <= 210; b += 7) pts.push(onRing(b, -perim.rAt(b) + 26 + 6 * Math.sin(b * 0.05)));
      pts.push([S6.perimSW.x, S6.perimSW.z], [S6.crossing.from.x, S6.crossing.from.z], [S6.saddle.x, S6.saddle.z], [DS.x, DS.z]);
      return mkPath(pts);
    })();
    {
      // fix pass, spacing: waiting, the file stands closed up round the inside of the perimeter (about 2.3 m: the ring
      // is not long enough for more); moving, each man steps off when the man ahead is 4.5 m on (an accordion), so on
      // 689's bare top they walk 4.5 m apart; outside the wire, in the grass, the file slows to 0.6 m/s and closes to
      // about 3 m (each man keeps the same time behind the man ahead). Whoever has not stepped off by the rockets (60)
      // goes on after them.
      const L = LOOPS[5], dB = colPath.cum[Math.max(0, colPath.pts.length - 4)], dHead = dB - 2;   // the head waits at the gap
      const vT = 0.86, vG = 0.6, gapT = Math.min(4.5, (dHead - 1) / 46);
      // where a man who sets off from d at t0 is at t1, and the walk steps that take him there
      const reach = (d, t0, t1) => { const tIn = d < dB ? (dB - d) / vT : 0; const T = t1 - t0; return T <= tIn ? d + T * vT : Math.max(d, dB) + (T - tIn) * vG; };
      const walkTo = (P, lp, d0, t0, t1) => {
        const d1 = reach(d0, t0, t1);
        if (d0 < dB && d1 > dB) { P.walk(t0, 'Walk With Rifle', null, { path: lp, d0, d1: dB, v: vT }); P.walk(P.endsAt, 'Walk With Rifle', null, { path: lp, d0: dB, d1: d1 + 0.01, v: vG }); }
        else P.walk(t0, 'Walk With Rifle', null, { path: lp, d0, d1: d1 + 0.01, v: d1 > dB ? vG : vT });
        return d1;
      };
      // places in the file: Cargile 4th, his radioman 5th, the corpsman 11th, the rest in turn (fix pass: the old map
      // gave two men the same place)
      const ORD = {}; { const fixed = { 0: 3, 1: 4, 2: 10 }, taken = new Set(Object.values(fixed)); let n = 0; D.forEach((_, i) => { if (fixed[i] !== undefined) { ORD[i] = fixed[i]; return; } while (taken.has(n)) n++; ORD[i] = n++; }); }
      D.forEach((Ac, i) => {
        const r = rng(5200 + i);
        const order = ORD[i];
        const d = dHead - order * gapT - (r() - 0.5) * 1.2;
        const p = pathAt(colPath, Math.max(0, d), { x: 0, z: 0 });
        const yaw = pathYaw(colPath, Math.max(0, d));
        const side = (r() - 0.5) * 1.0;
        const x = p.x + Math.cos(yaw) * side, z = p.z - Math.sin(yaw) * side;
        const c0 = Ac.kind === 'rifleman' ? (r() < 0.5 ? 'Rifle Kneel Idle' : 'Rifle Idle') : 'Looking Around';
        const P = Plan(Ac, 5, L, x, z, yaw + (r() - 0.5) * 0.6, c0);
        const lp = mkPath(colPath.pts.map((q, k) => { const y = pathYaw(colPath, colPath.cum[k]); return [q[0] + Math.cos(y) * side, q[1] - Math.sin(y) * side]; }));
        const dd = Math.max(0, d);
        const tGo = 40 + order * Math.max(0.25, (4.5 - gapT) / vT) + (r() - 0.5) * 0.6;
        P.hold(Math.min(tGo, 60) - 3 - r() * 2, 'Rifle Idle', { fade: 0.9, yaw });
        const dMid = tGo < 59.5 ? walkTo(P, lp, dd, tGo, 60.3) : dd;
        P.hold(60.3 + r() * 0.7, 'Prone Idle', { fade: 0.4 });
        P.hold(79.5 + r() * 1.5, 'Rifle Kneel Idle', { fade: 1.0 });
        const tGo2 = 81.5 + Math.max(0, tGo - 60.3) + order * 0.08;
        if (tGo2 < 118) walkTo(P, lp, dMid, tGo2, 119.5);
      });
    }
    // chapter 6: arriving east of the ridge, crouched; pairs go out for A's crawling wounded
    {
      const L = LOOPS[6];
      const pairsFor = Object.keys(crawlPlan).map(Number);
      D.forEach((Ac, i) => {
        const r = rng(6200 + i);
        const lane = i % 15, row = Math.floor(i / 15);
        const a1 = -4 - row * 4 + (r() - 0.5) * 2, s1 = -20 + lane * 2.9 + (r() - 0.5);
        const p1 = pD(a1, s1), p0 = pD(a1 - 14 - r() * 4, s1 - 6);
        const face = yawOf(NE.x - p1[0], NE.z - p1[1]) * 0.5 + yawD * 0.5;
        const P = Plan(Ac, 6, L, p0[0], p0[1], face, Ac.kind === 'rifleman' ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around');
        P.walk(1 + r() * 8, crouchWalk, [p1], { v: 0.62, stop: Ac.kind === 'rifleman' ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around', stopYaw: face });
        const pi = i - 3;
        if (pi >= 0 && pi < pairsFor.length * 2) {
          const w = pairsFor[Math.floor(pi / 2)], j = pi % 2, C = crawlPlan[w];
          const wp = C.P.at(50);
          const side = j ? 0.55 : -0.55, ux = Math.sin(C.toD), uz = Math.cos(C.toD);
          const reach = [wp.x + ux * 0.95 - uz * side, wp.z + uz * 0.95 + ux * side];
          P.walk(30 + Math.floor(pi / 2) * 2 + j * 0.3, 'Rifle Run', [reach], { v: 1.9, stop: 'Rifle Kneel Idle', stopYaw: C.toD + Math.PI });
          const t2 = Math.max(53, P.endsAt + 1.5);
          const back = [reach[0] + ux * 15, reach[1] + uz * 15];
          P.walk(t2, crouchWalk, [back], { rev: true, v: 0.42, stop: 'Rifle Kneel Idle', stopYaw: C.toD + Math.PI, yawFixed: C.toD + Math.PI });
          if (j === 0) {
            C.P.hold(t2 - 1.2, 'Laying Breathless', { fade: 1.0, yaw: C.toD + Math.PI });
            const lead = mkPath([[wp.x, wp.z], [wp.x + ux * 15, wp.z + uz * 15]]);
            C.P.walk(t2, 'Laying Breathless', null, { path: lead, v: 0.42, yawFixed: C.toD + Math.PI, turn: 2.0, stop: 'Laying Breathless', stopYaw: C.toD + Math.PI });
          }
        }
      });
    }
    // chapter 7: the attack north-west to south-east along the ridge (10-65), the snipers; the withdrawal at 97
    {
      const L = LOOPS[7], tW = at(7, '1730');
      D.forEach((Ac, i) => {
        const r = rng(7200 + i);
        const isRif = Ac.kind === 'rifleman';
        const wave = i < 3 ? 2 : (i - 3) % 2, lane = i < 3 ? i : Math.floor((i - 3) / 2);
        const s0 = i < 3 ? -2 + i * 2 : -26 + lane * 2.5 + (r() - 0.5);
        const a0 = (i < 3 ? -9 : wave ? -4 : 0) + (r() - 0.5);
        const p0 = pD(a0, s0);
        const P = Plan(Ac, 7, L, p0[0], p0[1], yawD, isRif ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around');
        const stopC = isRif ? 'Rifle Kneel Idle' : 'Crouch Idle 02 Looking Around';
        let t = 10 + wave * 3.7 + r() * 1.2, a = a0;
        const aEnd = 66 + (i < 3 ? -9 : wave ? -4 : 0) + (r() - 0.5) * 3;
        while (t < 62 && a < aEnd - 1) {
          const na = Math.min(aEnd, a + 8.5 + r() * 2), p = pD(na, s0 + (r() - 0.5) * 1.2);
          P.walk(t, i < 3 ? crouchWalk : 'Rifle Run', [p], { v: i < 3 ? 0.9 : 1.9, stop: stopC, stopYaw: yawD });
          if (isRif && r() < 0.3) P.fire(P.endsAt + 0.6 + r() * 0.5, 3 + Math.floor(r() * 3), v3(snipers[lane % 2][0], G(snipers[lane % 2][0], snipers[lane % 2][1]) + 1.4, snipers[lane % 2][1]));
          t = P.endsAt + 2.6 + r() * 1.4; a = na;
        }
        if (deltaDown[i] !== undefined) {
          const tf = deltaDown[i];
          P.once(tf, ['Dying (1)', 'Dying (2)', 'Dying (1)', 'Dying'][Object.keys(deltaDown).indexOf(String(i))], { then: 'Laying Breathless', thenAfter: 4.2 });
          Ac.sniped = tf;
        } else {
          P.hold(Math.max(66, t) + r() * 2, isRif ? (r() < 0.55 ? 'Prone Idle' : 'Rifle Kneel Idle') : stopC, { fade: 0.7 });
          // after the order, back toward A's LZ
          const pp = P.at(tW + 2), dx = ALZ.x - pp.x, dz = ALZ.z - pp.z, dl = Math.hypot(dx, dz);
          P.hold(tW + 1 + r() * 3, stopC, { fade: 0.9, yaw: yawOf(dx, dz) });
          P.walk(tW + 4 + r() * 6, i < 3 ? 'Walk With Rifle' : crouchWalk, [[pp.x + dx / dl * 16, pp.z + dz / dl * 16]], { v: i < 3 ? 0.8 : 0.55, stop: stopC });
        }
      });
      // pairs drag all four back toward A's LZ: no fallen man is left on the field on screen (Abram's ruling,
      // 2026-11-09; Q13's "leaving their dead" stays in the label)
      // the two nearest men still up go for each (fix pass: fixed pairs were 40 m off and never reached them in time)
      const dPairs = (() => {
        const freeD = D.map((Ac, i) => i).filter((i) => i >= 3 && deltaDown[i] === undefined), out = [];
        for (const w of Object.keys(deltaDown).map(Number)) {
          const s0 = stateAt(D[w], 7, deltaDown[w] + 6, S1), wx = s0.x, wz = s0.z, dd = {};
          for (const i of freeD) { const st = stateAt(D[i], 7, tW, S1); dd[i] = Math.hypot(st.x - wx, st.z - wz); }
          freeD.sort((p, q) => dd[p] - dd[q]);
          out.push([w, ...freeD.splice(0, 2)]);
        }
        return out;
      })();
      dPairs.forEach(([w, a, b]) => {
        const Wm = D[w], tf = deltaDown[w];
        const wp = (() => { const s = stateAt(Wm, 7, tf + 6, S1); return [s.x, s.z]; })();
        const dx = ALZ.x - wp[0], dz = ALZ.z - wp[1], dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
        const yawW = yawOf(-ux, -uz);
        [a, b].forEach((ai, j) => {
          const Ac = D[ai], side = j ? 0.55 : -0.55;
          const steps = Ac.plans[7];
          const keep = steps.findIndex((s) => s.t0 >= tW + 0.5);
          if (keep > 0) steps.length = keep;
          const P = { steps };
          const reach = [wp[0] + ux * 0.95 - uz * side, wp[1] + uz * 0.95 + ux * side];
          const pl = Plan(Ac, 7, L, 0, 0, 0, 'Rifle Idle'); pl.steps.length = 0; for (const s of P.steps) pl.steps.push(s); Ac.plans[7] = pl.steps;
          const far = (() => { const st = pl.at(tW + 1.5); return Math.hypot(st.x - reach[0], st.z - reach[1]) > 8; })();
          pl.walk(tW + 1.5 + j * 0.4, far ? 'Rifle Run' : crouchWalk, [reach], { v: far ? 1.9 : 0.9, stop: 'Rifle Kneel Idle', stopYaw: yawW });
          const t2 = Math.max(tW + 6, pl.endsAt + 1.6);
          pl.walk(t2, crouchWalk, [[reach[0] + ux * 9, reach[1] + uz * 9]], { rev: true, v: 0.42, yawFixed: yawW, stop: 'Rifle Kneel Idle', stopYaw: yawW });
          Wm._t2 = Math.max(Wm._t2 || 0, t2);
        });
        const steps = Wm.plans[7], pl = Plan(Wm, 7, L, 0, 0, 0, 'Rifle Idle'); pl.steps.length = 0; for (const s of steps) pl.steps.push(s); Wm.plans[7] = pl.steps;
        pl.hold(Wm._t2 - 1.0, 'Laying Breathless', { fade: 0.9, yaw: yawW });
        (Wm.pon = Wm.pon || {})[7] = Wm._t2 - 1.2;   // dragged on a poncho (integration)
        pl.walk(Wm._t2 + 0.2, 'Laying Breathless', null, { path: mkPath([wp, [wp[0] + ux * 9, wp[1] + uz * 9]]), v: 0.42, yawFixed: yawW, turn: 2.0, stop: 'Laying Breathless', stopYaw: yawW });
      });
    }
    // chapter 11: eight men run to the CH-46 after it lands hard on 689 (113.2)
    {
      const L = LOOPS[11], lz = (W.lz && W.lz.lz689) || S6.lz689;
      D.forEach((Ac, i) => {
        if (i < 3 || i > 10) { hidden(Ac, 11, L); return; }
        const k = i - 3, r = rng(1110 + i);
        const a = Math.PI * (0.95 + k * 0.11), wait = [lz.x + Math.cos(a) * (14 + r() * 3), lz.z + Math.sin(a) * (14 + r() * 3)];
        const go = [lz.x + Math.cos(a) * (5.5 + r()), lz.z + Math.sin(a) * (5.5 + r())];
        const P = Plan(Ac, 11, L, wait[0], wait[1], faceTo(wait, [lz.x, lz.z]) + (r() - 0.5) * 2, k % 3 ? 'Rifle Kneel Idle' : 'Rifle Idle');
        idles(P, Ac, L, IDLE.rifleman, r, { to: 100 });
        P.hold(100 + r() * 4, 'Rifle Idle', { fade: 0.8, yaw: faceTo(wait, [lz.x, lz.z]) });
        P.walk(113.5 + k * 0.25 + r() * 0.3, 'Rifle Run', [go], { v: 1.95, stop: 'Idle Crouching', stopYaw: faceTo(go, [lz.x, lz.z]) });
      });
    }
    for (let ch = 1; ch <= 11; ch++) for (const Ac of D) if (!Ac.plans[ch]) hidden(Ac, ch, LOOPS[ch]);
    // D in chapter 1-4: not shown (the brief places them from chapter 5)

    A[1].f.lendTo = [A[0].f, A[4].f]; D[1].f.lendTo = [D[0].f];   // Banks, Lovely; Cargile
    // ---------- drags (fix pass, carries) ----------
    // Every drag in the plans (a wounded man's Laying Breathless walk, and the two men crouch-walking backward beside him
    // at the same time): the pair go to the slung crouch, all three move in short pulls, and each frame the pair kneel
    // at his shoulders with both hands on his harness (CM.grip) while his chest is lifted off the ground (CM.chestLift).
    const DRAGS = {};
    for (const ch of [3, 6, 7]) {
      for (const Wm of actors) {
        const steps = Wm.plans[ch]; if (!steps) continue;
        for (const ws of steps) {
          if (ws.type !== 'W' || ws.clip !== 'Laying Breathless' || ws.dur < 2) continue;
          const tm = ws.t0 + ws.dur * 0.5, wp = stepPos(Wm, ws, tm, { x: 0, z: 0, yaw: 0, sink: 0, d: 0 });
          const cand = [];
          for (const Ac of actors) {
            if (Ac === Wm || !Ac.plans[ch]) continue;
            for (const st of Ac.plans[ch]) {
              if (st.type !== 'W' || !st.rev || st.clip !== crouchWalk) continue;
              const ov = Math.min(st.t0 + st.dur, ws.t0 + ws.dur) - Math.max(st.t0, ws.t0);
              if (ov < 0.6 * ws.dur) continue;
              const p = stepPos(Ac, st, tm, { x: 0, z: 0, yaw: 0, sink: 0, d: 0 }), dd = Math.hypot(p.x - wp.x, p.z - wp.z);
              if (dd < 4.0) cand.push({ Ac, st, dd });
            }
          }
          cand.sort((a, b) => a.dd - b.dd);
          const by = cand.slice(0, 2);
          if (!by.length) continue;
          ws.pulse = true;
          for (const c of by) { c.st.clip = DRAGC; c.st.pulse = true; c.st.rate = c.st.v / (V0[DRAGC] * c.Ac.scale * c.Ac.stride); c.st.ct0 = c.Ac.phase * DUR[DRAGC]; }
          (DRAGS[ch] = DRAGS[ch] || []).push({ w: Wm, ws, by: by.map((c, j) => ({ Ac: c.Ac, st: c.st, j })) });
        }
      }
    }
    for (const ch in DRAGS) for (const D0 of DRAGS[ch]) for (const b of D0.by) b.Ac.dragOf = b.Ac.dragOf || {}, b.Ac.dragOf[ch] = { D0, b };
    decideSeams();

    // ---------- the grass trodden flat where the men kneel and lie (into works.clearings, which land.js reads) ----------
    const clearings = [];
    {
      const cells = new Map();
      for (const Ac of actors) for (const ch of [3, 6, 7]) {
        if (!Ac.plans[ch]) continue;
        const L = Ac.L[ch];
        for (const t of [L * 0.3, L * 0.62, L - 1]) {
          const st = stateAt(Ac, ch, t, S1);
          if (st.hidden || Math.hypot(st.x, st.z) < 75) continue;
          let m = '', mw = 0; for (let j = 0; j < st.n; j++) if (st.ws[j] > mw) { mw = st.ws[j]; m = st.clips[j]; }
          if (!/Kneel|Crouch|Prone|Laying|Dying|Crawl|Pointing|Injured/.test(m)) continue;
          const k = Math.floor(st.x / 3) + ',' + Math.floor(st.z / 3), c = cells.get(k);
          if (!c) cells.set(k, { x: st.x, z: st.z, n: 1, from: ch });
          else { c.x += st.x; c.z += st.z; c.n++; c.from = Math.min(c.from, ch); }
        }
      }
      for (const c of cells.values()) clearings.push({ x: c.x / c.n, z: c.z / c.n, r: 1.55, kind: 'slit', from: c.from, by: NAME });
      // the column's trodden path (chapter 2's patrol, chapter 8's files): flattened, so men walking upright in grass
      // taller than they are can be seen from the chapter camera (integration)
      const path = new Map();
      for (const Ac of actors) for (const ch of [2, 8]) {
        if (!Ac.plans[ch]) continue;
        const L = Ac.L[ch];
        for (let t = 0; t < L; t += 1.5) {
          const st = stateAt(Ac, ch, t, S1);
          if (st.hidden || st.sink > 0.5 || Math.hypot(st.x, st.z) < 75) continue;
          const k = Math.floor(st.x / 2.5) + ',' + Math.floor(st.z / 2.5);
          if (!path.has(k)) path.set(k, { x: st.x, z: st.z, from: ch }); else path.get(k).from = Math.min(path.get(k).from, ch);
        }
      }
      for (const c of path.values()) clearings.push({ x: c.x, z: c.z, r: 1.5, kind: 'lz', from: c.from, by: NAME });
      if (W.clearings && Array.isArray(W.clearings)) for (const c of clearings) W.clearings.push(c);
      dispatchEvent(new Event('landClearingsChanged'));
    }

    // ---------- fire: each scheduled burst leaves the man's own muzzle (posed once, here) ----------
    const FIRE = window.FIRE;
    const mpos = v3(0, 0, 0), mdir = v3(0, 0, 0);
    let nBursts = 0;
    // a man fires only holding still in a firing position (standing, kneeling, crouched or prone with the rifle up),
    // never walking, running, crawling, dragging, hit or lying hurt, and only with his rifle pointed within 35 degrees
    // of what he fires at (fix pass: "gun shots come from nowhere")
    const FIRING = /^(Rifle Idle|Rifle Kneel Idle|Idle Crouching|Crouch Idle 02 Looking Around|Prone Idle)$/;
    let nSkip = 0;
    if (FIRE && FIRE.burst) {
      for (const Ac of actors) for (const e of Ac.fire) {
        poseAt(Ac, e.ch, e.t, S1);
        if (S1.hidden) continue;
        let main = '', mw = 0, tot = 0; for (let j = 0; j < S1.n; j++) { tot += S1.ws[j]; if (S1.ws[j] > mw) { mw = S1.ws[j]; main = S1.clips[j]; } }
        if (!FIRING.test(main) || mw < 0.85 * tot || S1.ghost || (Ac.dragged && Ac.dragged[e.ch]) || (Ac.dragOf && Ac.dragOf[e.ch])) { nSkip++; continue; }
        apply(Ac, S1); Ac.f.F.root.visible = true;
        // measured with the rifle up on the target, as he will hold it for the burst (aimAt below)
        Ac.f.aimAt = e.target; Ac.f.aimK = 1; Ac.f.kick = 0;
        CM.update(Ac.f, 1 / 30, e.t); CM.update(Ac.f, 1 / 30, e.t);
        Ac.f.aimK = 0;
        if (!CM.muzzle(Ac.f, mpos, mdir)) continue;
        if (mdir.angleTo(e.target.clone().sub(mpos)) > 0.61) { nSkip++; continue; }
        FIRE.burst(mpos.clone(), mdir.clone(), e.n, { at: e.t, ch: e.ch, side: 'us', to: e.target, sc: 2.2, src: 'AD:' + Ac.idx });
        e.ok = true; nBursts++;
      }
      // the snipers' single shots that drop four of Delta's men (DY p. 315), 0.6 s before each fall
      for (const i in deltaDown) {
        const Ac = D[i], tf = deltaDown[i];
        poseAt(Ac, 7, tf - 0.1, S1);
        // from a slit the chapter camera sees at that moment (FIRE.sniperFrom), else a glint on the ridge in frame,
        // so the flash comes before he falls; the old fixed sniper points stay only as the last resort
        const to = v3(S1.x, G(S1.x, S1.z) + 1.35, S1.z);
        const sp = snipers[i % 2], src = FIRE.sniperFrom ? FIRE.sniperFrom(to, 7, tf - 0.8) : null;
        const from = src ? v3(src.pos.x, src.pos.y, src.pos.z) : v3(sp[0], G(sp[0], sp[1]) + 1.4, sp[1]);
        const tt = from.distanceTo(to) / (FIRE.speed || 170);
        FIRE.burst(from, null, 1, { at: tf - 0.15 - (src && src.glint ? 0.45 : tt), ch: 7, side: 'nva', to, fs: 0.9, sc: 0.3, tracer: !(src && src.glint), src: 'sniperAD:' + (src ? (src.glint ? 'glint:' : 'slit:') + src.id : 'fixed') });
      }
      for (const Ac of actors) Ac.f.F.root.visible = false;
    }

    // ---------- labels and tap moments ----------
    const headOf = (Ac) => { const h = Ac.f.b.mixamorigHead; if (h) h.getWorldPosition(Ac.head); Ac.head.y += 0.2; return Ac.head; };
    function tapGesture(Ac) {
      // a short gesture laid over the timeline: an officer points (or points from a kneel); it blends back
      if (!Ac.vis) return;
      const m = Ac.mainClip || '';
      const clip = KNEELING.has(m) ? 'Kneeling Pointing' : (m === 'Looking Around' || m === 'Rifle Idle' || m === 'Talking On Phone') ? 'Pointing' : null;
      if (!clip) return;
      Ac.tapAt = ctx.clock.elapsed; Ac.tapClip = clip;
    }
    const tagPerson = (key, Ac) => ctx.tag(key, () => headOf(Ac), { when: () => Ac.vis, onTap: () => tapGesture(Ac), scale: Ac.scale });
    tagPerson('banks', A[0]); tagPerson('hayden', A[24]); tagPerson('lovely', A[4]); tagPerson('cargile', D[0]);
    tagPerson('hartzell', HZ); tagPerson('donnelly', DN); tagPerson('engel', EN);
    ctx.tag('cahill', () => headOf(CAH), { when: (ch) => ch.id <= 4 && CAH.vis, onTap: () => tapGesture(CAH), scale: CAH.scale });
    if (W.masts && W.masts.base) ctx.tag('meyers', () => W.masts.base, { r: 12 });
    // (hill689 is tagged by the base, alz by works.js: not tagged again here)

    // ---------- the CP lantern (dusk, night and first light: the base lights it when the day goes) ----------
    if (ctx.addLantern) ctx.addLantern(v3(T.pos.x + 0.3, G(T.pos.x, T.pos.z) + 1.45, T.pos.z + 0.1));

    // ---------- radios for radio.js ----------
    const tipOf = (Ac) => {
      if (!Ac || !Ac.vis) return null;
      const n = Ac.F.antN, b = n && Ac.f.b['a' + (n - 1)];
      if (!b) return null;
      return Ac.tip.set(0, 1, 0).applyMatrix4(b.matrixWorld);
    };
    const radios = {
      banks: () => tipOf(A[1]),
      cp: () => tipOf(CPR),
      cargile: () => tipOf(D[1]),
      lovely: () => tipOf(A[1]),
      // chapters 1-4 only: from chapter 4 marines-c.js owns Cahill's radioman and falls back to this one (calling back
      // into it would recurse)
      cahill: () => (ctx.chapter.id <= 4 ? tipOf(CAHR) : null),
    };
    window.marines = window.marines || {};
    window.marines.radios = Object.assign(window.marines.radios || {}, radios);
    window.MARINES_AD = { figures: actors.map((a) => a.f), actors, byKey, radios, ch2: CH2, drags: DRAGS, posAt: (Ac, ch, t) => { const st = stateAt(Ac, ch, t, S2); return { x: st.x, z: st.z, hidden: st.hidden }; }, cahillEnd: v3(cahillEnd[0], G(cahillEnd[0], cahillEnd[1]), cahillEnd[1]), clearings, ready: true, tris: nTris };

    // ---------- the CH-46 (chapter 11): the ramp party rides inside, seen only while the ramp is down ----------
    let heli = null;
    const findHeli = () => {
      const M = window.MEDEVAC || ctx.medevac; if (!M || !M.ch46 || !M.ch46.visible) return null;
      let best = null;
      ctx.scene.traverse((o) => { if (!best && o.isGroup && o.children.length >= 3 && o.position.distanceToSquared(M.ch46.pos) < 0.01) best = o; });
      return best;
    };
    const rampLocal = [[-0.5, -3.08, 0.68], [0.52, -3.1, 0.68], [-0.4, -3.55, 0.16], [0.42, -3.6, 0.13]];   // in the opening, in front of works' cabin panel (z -2.9), two on the ramp's top
    const _rv = v3(0, 0, 0), _rq = new THREE.Quaternion(), _re = new THREE.Euler();
    function rampState(Ac, t, S) {
      const M = window.MEDEVAC || ctx.medevac;
      S.n = 0; S.ghost = null; S.hidden = true;
      if (!M || !M.ch46 || !M.ch46.visible || M.ch46.ramp < 0.25) return S;
      if (!heli || !heli.parent) heli = findHeli();
      if (!heli) return S;
      heli.updateMatrixWorld();
      const [lx, lz, ly] = rampLocal[Ac.ramp];
      _rv.set(lx, ly, lz).applyMatrix4(heli.matrixWorld);
      heli.getWorldQuaternion(_rq); _re.setFromQuaternion(_rq, 'YXZ');
      S.x = _rv.x; S.z = _rv.z; S.yaw = _re.y + Math.PI + (Ac.ramp % 2 ? -0.25 : 0.25); S.sink = G(_rv.x, _rv.z) - _rv.y;
      S.hidden = false;
      addLayer(S, Ac.ramp === 1 ? 'Rifle Kneel Idle' : 'Idle Crouching', loopT('Idle Crouching', t + Ac.phase * 2), 1);
      return S;
    }

    // ---------- ponchos (integration): the wounded are dragged on a poncho, not over the bare ground ----------
    const PON = (() => {
      const g = new THREE.BoxGeometry(0.95, 0.03, 2.05); g.translate(0, 0.02, 0);
      const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: ctx.lin(0x4f5a3c), flatShading: true, roughness: 0.95 }), 16);
      m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ctx.scene.add(m);
      return { m, M: new THREE.Matrix4(), q: new THREE.Quaternion(), p: v3(0, 0, 0), s: v3(1, 1, 1), h: v3(0, 0, 0), d: v3(0, 0, 0), e: new THREE.Euler() };
    })();
    // ---------- drags, per frame ----------
    for (const ch in DRAGS) for (const D0 of DRAGS[ch]) { (D0.w.dragged = D0.w.dragged || {})[ch] = true; D0.sh = [v3(0, 0, 0), v3(0, 0, 0)]; D0.hp = v3(0, 0, 0); D0.ok = false; }
    const dragK = (st, t) => sm((t - st.t0 + 0.2) / 0.8) * (1 - sm((t - (st.t0 + st.dur + 0.2)) / 0.8));
    // the pair: each kneels just off one of the man's shoulders, facing it, from where his hands reach the harness
    function dragPlace(R, t, S) {
      const { D0, b } = R, k = dragK(b.st, t);
      if (k <= 0 || !D0.ok) return;
      const sh = D0.sh[b.side !== undefined ? b.side : (b.side = b.j)], so = D0.sh[1 - b.side], hp = D0.hp;
      // up the body (hips to the shoulders' middle) and out from it (the middle to his shoulder): he kneels beyond the
      // shoulder, a little outboard, so the two never stand on the man
      const mx = (sh.x + so.x) / 2, mz = (sh.z + so.z) / 2;
      let ux = mx - hp.x, uz = mz - hp.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
      let ox = sh.x - mx, oz = sh.z - mz; const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
      const tx = sh.x + ux * 0.3 + ox * 0.26, tz = sh.z + uz * 0.3 + oz * 0.26;
      S.x += (tx - S.x) * k; S.z += (tz - S.z) * k;
      S.yaw += wrapA(yawOf(sh.x - tx, sh.z - tz) - S.yaw) * k;
    }
    const _dl = v3(0, 0, 0), _dr = v3(0, 0, 0), _dd = v3(0, 0, 0);
    function dragFrame(D0, t) {
      const Wm = D0.w, k = dragK(D0.ws, t);
      if (!Wm.F.root.visible || k <= 0) { D0.ok = false; return; }
      if (Wm.updN === frameN) CM.chestLift(Wm.f, 0.5 * k);
      const b = Wm.f.b;
      b.mixamorigLeftArm.getWorldPosition(D0.sh[0]); b.mixamorigRightArm.getWorldPosition(D0.sh[1]); b.mixamorigHips.getWorldPosition(D0.hp);
      if (!D0.ok) {
        // which shoulder each man takes: the nearer one
        const p0 = D0.by[0].Ac.F.root.position;
        const near0 = Math.hypot(p0.x - D0.sh[0].x, p0.z - D0.sh[0].z) < Math.hypot(p0.x - D0.sh[1].x, p0.z - D0.sh[1].z) ? 0 : 1;
        D0.by[0].side = near0; if (D0.by[1]) D0.by[1].side = 1 - near0;
      }
      D0.ok = true;
      for (const B of D0.by) {
        const Ac = B.Ac, kb = dragK(B.st, t);
        if (!Ac.F.root.visible || kb < 0.5 || Ac.updN !== frameN) continue;
        const sh = D0.sh[B.side];
        // both hands in the harness at the armpit: a hand's width either side of the shoulder joint along the body
        _dd.subVectors(sh, D0.hp).setY(0).normalize();
        _dl.copy(sh).addScaledVector(_dd, 0.07); _dl.y -= 0.04;
        _dr.copy(sh).addScaledVector(_dd, -0.07); _dr.y -= 0.04;
        CM.grip(Ac.f, _dl, _dr, { lean: 0.45 });
      }
    }
    // the kick of a man's own burst (rate 9): the rifle climbs and comes back a little with each round
    function kickAt(Ac, ch, t) {
      let k = 0;
      for (const e of Ac.fire) { if (!e.ok || e.ch !== ch || t < e.t || t > e.t + e.n / 9 + 0.35) continue; for (let i = 0; i < e.n; i++) { const a = t - (e.t + i / 9); if (a >= 0) k += Math.exp(-a * 22); } }
      return k;
    }
    // before a burst he brings the rifle up onto the target and holds it there to the end (CM's f.aimAt / f.aimK)
    function aimFor(Ac, ch, t) {
      Ac.f.aimK = 0;
      for (const e of Ac.fire) {
        if (!e.ok || e.ch !== ch) continue;
        const a = t - (e.t - 0.45), b = t - (e.t + e.n / 9 + 0.25);
        if (a < 0 || b > 0.35) continue;
        Ac.f.aimAt = e.target; Ac.f.aimK = sm(a / 0.3) * (1 - sm(b / 0.35)); break;
      }
      return Ac.f.aimK;
    }
    // ---------- per frame ----------
    const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(v3(0, 0, 0), 2.2);
    let frameN = 0, lastCh = -1;
    const camPos = v3(0, 0, 0);
    plug.stats = { updated: 0, visible: 0, ms: 0 };
    window.MARINES_AD.stats = plug.stats;
    plug.frame = function (tAbs, dt) {
      const ch = ctx.chapter.id, t = ctx.cycle.t, tm0 = performance.now();
      frameN++;
      const cam = ctx.camera; cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
      camPos.copy(cam.position);
      const jump = ch !== lastCh; lastCh = ch;
      let nu = 0, nv = 0, np = 0;
      for (const Ac of actors) {
        const S = Ac.ramp !== undefined && ch === 11 ? rampState(Ac, t, S1) : poseAt(Ac, ch, t, S1);
        // a tap moment: the gesture blends in and out over 3.5 s
        if (Ac.tapAt !== undefined) {
          const g = ctx.clock.elapsed - Ac.tapAt;
          if (g > 3.5 || g < 0) Ac.tapAt = undefined;
          else { const env = sm(g / 0.45) * (1 - sm((g - 2.8) / 0.7)); for (let j = 0; j < S.n; j++) S.ws[j] *= 1 - env; addLayer(S, Ac.tapClip, loopT(Ac.tapClip, g + 0.2), env); }
        }
        const root = Ac.F.root;
        if (S.hidden) { if (Ac.vis) { root.visible = false; Ac.blob.hide(); Ac.vis = false; } continue; }
        const gy = G(S.x, S.z);
        Ac.vis = true; nv++;
        let mw = 0; for (let j = 0; j < S.n; j++) if (S.ws[j] > mw) { mw = S.ws[j]; Ac.mainClip = S.clips[j]; }
        sph.center.set(S.x, gy + 0.8 - S.sink, S.z);
        const dist = camPos.distanceTo(sph.center);
        const inView = dist < 380 && frustum.intersectsSphere(sph);      // past 380 m a man is under 4 px tall: not drawn
        Ac.acc += dt;
        if (!inView && !jump) { if (root.visible) root.visible = false; continue; }
        const inDrag = (Ac.dragOf && Ac.dragOf[ch]) || (Ac.dragged && Ac.dragged[ch]);
        const every = inDrag || aimFor(Ac, ch, t) > 0.01 ? 1 : dist < 40 ? 1 : dist < 120 ? 2 : 3;
        if (!jump && root.visible && (frameN + Ac.idx) % every) continue;
        if (Ac.dragOf && Ac.dragOf[ch]) dragPlace(Ac.dragOf[ch], t, S);
        apply(Ac, S);
        Ac.f.kick = kickAt(Ac, ch, t); aimFor(Ac, ch, t);
        CM.update(Ac.f, Math.min(0.25, Ac.acc), tAbs);
        Ac.acc = 0; nu++; Ac.updN = frameN;
        root.visible = true;
        if (S.sink < 0.9) Ac.blob.set(S.x, gy, S.z, /Prone|Laying|Crawl|Dying/.test(Ac.mainClip) ? 1.5 : 1); else Ac.blob.hide();
      }
      for (const D0 of DRAGS[ch] || []) dragFrame(D0, t);
      for (const Ac of actors) {
        const pt = Ac.pon && Ac.pon[ch];
        if (pt === undefined || t < pt || !Ac.F.root.visible || np >= 16) continue;
        Ac.f.b.mixamorigHips.getWorldPosition(PON.h); headOf(Ac); PON.d.copy(Ac.head).sub(PON.h); PON.d.y = 0;
        PON.p.set(PON.h.x + PON.d.x * 0.3, G(PON.h.x, PON.h.z), PON.h.z + PON.d.z * 0.3);
        PON.m.setMatrixAt(np++, PON.M.compose(PON.p, PON.q.setFromEuler(PON.e.set(0, Math.atan2(PON.d.x, PON.d.z), 0)), PON.s));
      }
      PON.m.count = np; PON.m.instanceMatrix.needsUpdate = true;
      plug.stats.updated = nu; plug.stats.visible = nv; plug.stats.ms += (performance.now() - tm0 - plug.stats.ms) * 0.05;
    };
    console.log(NAME + ': ' + actors.length + ' figures, ' + Math.round(nTris / 1000) + 'k triangles built, ' + nBursts + ' bursts on FIRE (' + nSkip + ' skipped: not in a firing position or not aimed), built in ' + Math.round(performance.now() - t0Build) + ' ms');
    markReady();
  }
})();
