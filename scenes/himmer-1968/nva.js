// nva.js (plug-in "nva"): the few NVA a viewer glimpses (DESIGN.md 6, the NVA row; R §5, R §10 item 6).
//
// The NVA stay mostly unseen, as they were. Their fire comes from positions (fire.js); this file shows only what the
// sources put in view, and only for a second or two at a time:
//   ch 1-2   nothing (the bunkers are camouflaged mounds)
//   ch 3     a man at a north-end slit as it fires (rise, burst, duck), ten times a loop; a spider-hole lid near A's
//            squads lifts and a helmet shows, twice; never more than 3 men at once
//   ch 5     Sgt Rider's sighting (HN): a file of 9 running up the far (west) slope through the string of craters west
//            of the horseshoe's north end, t 70.5-86, out of the grass and back into it. The one moment they are seen
//            in numbers. The chapter camera (south-east, 230 m) cannot see it: the crest and the grass hide the far
//            slope, as they hid it from Charlie. Seen from the west, e.g. ?cam=-398,62,368,-350,55,353.
//   ch 6-7   glimpses at the horseshoe slits nearest Charlie and at the second position as they fire; a lid lifts
//   ch 8,10  nothing
//   ch 9     one man at the slit that fires at the crater (fire.js's s9) at t 12, 35, 78, by the flash only
//   ch 11    t 92-99.2: four lids round the battle-hill LZ lift, four men rise and fire up at the CH-46 (fire.js draws
//            the rounds from these holes), duck as it lifts, the lids close. No one is shown hit.
//
// Figures: clay v3 kind 'nva' (utilities nearly the Marines' colour, net-covered steel helmet, AK-47), LOD 0 except
// the chapter-9 man (LOD 1; the camera is close). 17 figures in all; each is one skinned draw only while it shows, so
// at most 9 draws (ch 5) plus 2 for the lids and holes. Hidden men are not updated.
//
// Pure: every pose, height and lid angle is a function of ctx.chapter.id and ctx.cycle.t; clip times are set, not
// accumulated. The base does not load the clay scripts, so this file loads them once (window.CLAY.ready, shared with
// any other plug-in that wants them) and holds window.__ready false until the figures are built.
//
// The man's own bursts at the slits in chapters 3, 6 and 7 go through FIRE.burst({ at, ch }) from his measured
// muzzle, so his rise and the flash agree; fire.js's own slit streams keep firing between them (a man inside a bunker
// is not seen). Chapters 9 and 11 follow fire.js's own times and places.
(function () {
  'use strict';

  const CLAY_SRC = [
    ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js', () => window.fflate],
    ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js', () => window.THREE && THREE.FBXLoader],
    ['clay-v3/figkit.js', () => window.FK],
    ['clay-v3/clay-v3.js', () => window.V3],
    ['clay-v3/motion.js', () => window.CM],
  ];
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('failed ' + src)); document.head.appendChild(s); });
  const CLAY = (window.CLAY = window.CLAY || {});
  function clayReady() {
    if (!CLAY.ready) CLAY.ready = (async () => {
      for (const [src, has] of CLAY_SRC) if (!has()) await loadScript(src);
      CM.animPath = 'realistic-spike/anim/';
      if (!CM.T) await CM.init(V3.build({ mat: V3.material() }));
    })();
    return CLAY.ready;
  }
  const CLIPS = ['Rifle Idle', 'Idle Crouching', 'Rifle Run'];

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const sm = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

  // ---------------------------------------------------------------- the timing table (also window.NVA.timing)
  // slit events: [chapter, slit id, rise start]. The man rises 0.45 s, fires from rise + 0.6 for n rounds, ducks.
  const SLIT_EV = [
    [3, 'north2', 12.5], [3, 'north3', 19.0], [3, 'north1', 28.0], [3, 'north2', 40.0], [3, 'north3', 51.0],
    [3, 'north1', 63.0], [3, 'north2', 75.0], [3, 'north3', 89.0], [3, 'north1', 101.0], [3, 'north2', 109.5],
    [3, 'north5', 16.0], [3, 'north6', 23.5], [3, 'north4', 34.5], [3, 'north7', 46.0], [3, 'north5', 58.0], [3, 'north6', 70.0], [3, 'north4', 83.0], [3, 'north7', 95.0], [3, 'north5', 106.0],
    [6, 'arc8', 7.0], [6, 'arc9', 15.0], [6, 'second2', 23.0], [6, 'arc7', 28.6], [6, 'second1', 31.5], [6, 'arc6', 38.0],
    [6, 'second3', 45.0], [6, 'arc9', 52.0], [6, 'second2', 60.0], [6, 'arc8', 67.0], [6, 'arc7', 76.0], [6, 'second1', 82.0],
    [7, 'arc7', 10.0], [7, 'north2', 26.0], [7, 'arc2', 44.0], [7, 'arc7', 61.0], [7, 'north2', 79.0], [7, 'arc2', 97.0],
  ];
  const RISE = 0.45, DUCK = 0.4, FIRE_AT = 0.6, RATE = 7;
  // a helmet at a spider hole: [chapter, near (spot name), which (0 nearest, 1 next), start, length]
  const PEEK_EV = [[3, 'northEnd', 0, 33.0, 2.6], [3, 'northEnd', 1, 86.0, 2.2], [6, 'charliePause', 0, 34.5, 2.4], [6, 'charliePause', 1, 71.0, 2.0], [7, 'charliePause', 0, 52.0, 2.4]];
  // chapter 9: fire.js's slit bursts (3-5 rounds 0.32 s apart from t0)
  const NIGHT_T = [12, 35, 78];
  // chapter 11: fire.js fires from its holes 92.8 (+0.4 each) to 98
  const H11 = { lidOpen: 92.0, rise: 92.25, duck: 98.05, lidShut: 98.7 };
  // chapter 5: Rider's file
  const FILE = { n: 9, t0: 69.5, gap: 0.75, from: [-362, 354.6], to: [-339, 352.3], lead: 1.6, rate: 1.35, clip: 'Rifle Run' };

  window.Scene.register({
    name: 'nva',
    init(ctx) {
      const me = this;
      const { THREE } = ctx;
      const S = ctx.SITE;
      const G = (x, z) => ctx.surfaceY(x, z);
      me.ready = false;
      me.timing = [
        [3, '12.5-112', 'a man at a north-end slit, 10 glimpses of ~2.4 s, each with his own burst'],
        [3, '33, 86', 'a spider-hole lid near A lifts, a helmet shows ~2.4 s'],
        [5, '70.5-86', 'Rider\'s sighting: a file of 9 runs up the far west slope through the crater string, then into the grass'],
        [6, '7-84', '12 slit glimpses (horseshoe nearest Charlie, second position from 23); lids at 34.5, 71'],
        [7, '10-99', '6 slit glimpses, a lid at 52'],
        [9, '12, 35, 78', 'one man at fire.js\'s s9 slit while it fires'],
        [11, '92.0-99.2', '4 lids lift, 4 men rise and fire up at the CH-46, duck, lids close'],
      ];
      window.NVA = { timing: me.timing, me };

      // ---------- lids and the holes under them (instanced: 2 draws) ----------
      const MAXL = 6;
      const lidGeo = (() => {
        const parts = [new THREE.CylinderGeometry(0.44, 0.47, 0.07, 8).toNonIndexed()];
        const cols = [];
        for (let i = 0; i < 5; i++) { const c = new THREE.ConeGeometry(0.05, 0.42 + 0.12 * (i % 3), 3).toNonIndexed(); const a = i * 1.3; c.rotateZ(0.25 * Math.sin(a * 3)); c.translate(Math.cos(a) * 0.2, 0.24, Math.sin(a) * 0.2); parts.push(c); }
        const pos = [], nor = [];
        parts.forEach((g, k) => { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); const col = ctx.lin(k ? 0x8d8a4a : 0x7d7442); const top = ctx.lin(0x949150); for (let i = 0; i < g.attributes.position.count; i++) { const c = k === 0 && g.attributes.normal.array[i * 3 + 1] > 0.5 ? top : col; cols.push(c.r, c.g, c.b); } });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        g.translate(0.44, 0.035, 0);   // the hinge on the lid's edge at the origin; the lid lies along +x
        return g;
      })();
      const lids = new THREE.InstancedMesh(lidGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), MAXL);
      const holeGeo = new THREE.CircleGeometry(0.4, 9).rotateX(-Math.PI / 2);
      const holes = new THREE.InstancedMesh(holeGeo, new THREE.MeshBasicMaterial({ color: ctx.lin(0x1c1712) }), 4);
      for (const m of [lids, holes]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.visible = false; ctx.scene.add(m); }
      me.lids = lids; me.holes = holes; me.m4 = new THREE.Matrix4();
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), P3 = new THREE.Vector3(), S3 = new THREE.Vector3(1, 1, 1);
      // a lid on hole (x, z) hinged on the side facing away from (ax, az) (the man faces the target; the lid opens
      // behind him), open by k (0 shut, 1 at 78°)
      function setLid(i, x, z, ax, az, k) {
        const yaw = Math.atan2(ax, az) + Math.PI;      // the hinge side, behind him
        const hx = x + Math.sin(yaw) * 0.44, hz = z + Math.cos(yaw) * 0.44;
        // lid along local +x from the hinge; turn so +x points from the hinge across the hole
        E.set(0, yaw + Math.PI / 2, k * 1.36);
        lids.setMatrixAt(i, M4.compose(P3.set(hx, G(x, z) + 0.035, hz), Q.setFromEuler(E), S3));
      }

      // ---------- places ----------
      let PL = null;
      function places() {
        const W = ctx.works || window.WORKS;
        const slit = {};
        for (const s of (W && W.slits) || []) slit[s.id] = s;
        const holesBy = (spot) => ((W && W.spiderHoles) || []).filter((h) => h.group === 'crest')
          .filter((h) => !W.slits.some((s) => Math.hypot(s.pos.x - h.pos.x, s.pos.z - h.pos.z) < 5))
          .sort((a, b) => Math.hypot(a.pos.x - S[spot].x, a.pos.z - S[spot].z) - Math.hypot(b.pos.x - S[spot].x, b.pos.z - S[spot].z));
        const near = { northEnd: holesBy('northEnd'), charliePause: holesBy('charliePause') };
        // fire.js's chapter-11 holes (its own points round the CH-46's landing point; see "changes wanted")
        const lz = S.routes.ch46[1];
        // chapter 11: works.js's four LZ spider holes nearest the CH-46's point (works skips its static lids on them;
        // fire.js fires from the same holes)
        const wl = W && W.nvaHoles ? W.nvaHoles('lz') : [];
        const h11 = wl.length === 4 ? wl.map((h) => ({ x: h.pos.x, z: h.pos.z })) : [0, 1, 2, 3].map((i) => { const a = 0.6 + i * 1.7, r = 4 + (i % 2) * 4.5; return { x: lz.x + Math.cos(a) * r, z: lz.z + Math.sin(a) * r }; });
        const fs = window.FIRE && FIRE.schedule ? FIRE.schedule() : null;
        const s9 = (fs && fs.positions && slit[fs.positions.s9]) || slit.arc6;
        PL = { slit, near, h11, lz, s9 };
      }

      // ---------- figures ----------
      const POOL = { slit: [], night: null, hole: [], file: [] };
      const figs = [];
      function mk(seed, lod) {
        const F = V3.make(seed, 'nva', lod, me.mat);
        ctx.scene.add(F.root);
        const f = CM.figure(F, { seed, x: 0, z: -9999, yaw: 0, vary: true, mood: 'alert', ground: G });
        F.root.rotation.order = 'YXZ';
        f.o.pinned = true; f.o.noGround = true;   // placed by hand: by the head in slits and holes, the file pitched itself (clay-v3/motion.js ground layer off)
        for (const n of CLIPS) { const a = (f.acts[n] = f.mixer.clipAction(CM.clips[n])); a.setLoop(THREE.LoopRepeat); a.play(); a.timeScale = 0; a._once = false; a._held = true; a.setEffectiveWeight(0); }
        f.cur = CLIPS[0];
        f.nva = { sink: 0, pitch: 0, wasOn: false, blob: null, head: new THREE.Vector3(), aim: new THREE.Vector3(0, 0, 1), aimK: 0, useHead: false };
        F.root.visible = false;
        figs.push(f);
        return f;
      }
      // pose: clip a at time ta, blended toward clip b (time tb) by wb
      function pose(f, a, ta, b, tb, wb) {
        for (const n of CLIPS) { const ac = f.acts[n]; ac.enabled = true; ac.setEffectiveWeight(0); }
        const A = f.acts[a]; A.setEffectiveWeight(b ? 1 - wb : 1); A.time = ta % CM.clips[a].duration;
        if (b && wb > 0) { const B = f.acts[b]; B.setEffectiveWeight(wb); B.time = tb % CM.clips[b].duration; }
        f.cur = b && wb > 0.5 ? b : a;
      }

      // ground speed of a cycle at scale 1: the mean backward speed of whichever foot is lower
      function footSpeed(f, clip) {
        const c = CM.clips[clip], N = 48, dtc = c.duration / N, L = f.b.mixamorigLeftFoot, R = f.b.mixamorigRightFoot, v = new THREE.Vector3();
        f.x = 0; f.z = 0; f.yaw = 0; const g0 = f.ground; f.ground = () => 0; f.nva.useHead = false; f.nva.sink = 0; f.nva.aimK = 0; f.nva.pitch = 0;
        const smp = [];
        for (let k = 0; k <= N; k++) { pose(f, clip, k * dtc); step(f, 1 / 30, k / 30); L.getWorldPosition(v); const l = [v.z, v.y]; R.getWorldPosition(v); smp.push([l[0], l[1], v.z, v.y]); }
        let sum = 0;
        for (let k = 0; k < N; k++) { const a = smp[k], b = smp[k + 1], left = a[1] < a[3]; sum += Math.abs(left ? b[0] - a[0] : b[2] - a[2]); }
        f.ground = g0;
        return sum / c.duration / f.scale;
      }
      async function setup() {
        window.__ready = false;
        CLAY.waits = (CLAY.waits || 0) + 1;
        try {
          await clayReady();
          await CM.load(CLIPS);
          me.mat = V3.material();
          for (let i = 0; i < 3; i++) POOL.slit.push(mk(6801 + i, 0));
          POOL.night = mk(6811, 1);
          for (let i = 0; i < 4; i++) POOL.hole.push(mk(6821 + i, 0));
          for (let i = 0; i < FILE.n; i++) { const f = mk(6831 + i, 0); f.nva.blob = ctx.blob(0.42); f.nva.blob.hide(); POOL.file.push(f); }
          // the run's own ground speed (the clip plays in place): how fast the planted foot moves back
          me.runSpeed = footSpeed(POOL.file[0], FILE.clip);
          me.ready = true;
        } catch (e) { console.error('nva: clay figures failed to load', e); }
        CLAY.waits--;
        if (!CLAY.waits) window.__ready = (!(window.__readyHolds > 0) && !(window.__readyWait > 0) && !((window.CLAY || {}).waits > 0));   // only when every plug-in's hold is off (integration)
      }
      setup();

      // the bursts: registered once fire.js has started and the figures exist, from each man's measured muzzle
      me.armed = false;
      const mz = new THREE.Vector3(), md = new THREE.Vector3();
      me.arm = function () {
        if (me.armed || !me.ready) return;
        const fireOn = !!(window.FIRE && FIRE.schedule);   // ?only= may leave fire.js out: then no bursts
        me.armed = true;
        places();
        me.slitEv = [];
        const f = POOL.slit[0];
        { // which way Rifle Idle points the rifle, relative to his facing
          const s = PL.slit.north2 || Object.values(PL.slit)[0];
          me.rifleYaw = 0; placeSlitMan(f, s, 0, 0); pose(f, 'Rifle Idle', 1.0);
          for (let k = 0; k < 4; k++) step(f, 1 / 30, k / 30);
          CM.muzzle(f, mz, md); me.rifleYaw = Math.atan2(md.x, md.z) - f.yaw;
        }
        SLIT_EV.forEach(([ch, id, t0], i) => {
          const s = PL.slit[id]; if (!s) return;
          const n = 5 + (i % 3);
          const ev = { ch, s, t0, fire: t0 + FIRE_AT, end: t0 + FIRE_AT + (n - 1) / RATE + 0.35, n, who: 0 };
          me.slitEv.push(ev);
          // measure his muzzle in the firing pose, then the burst joins fire.js's timeline for that chapter
          placeSlitMan(f, s, 0, 1); pose(f, 'Rifle Idle', 1.0); for (let k = 0; k < 4; k++) step(f, 1 / 30, k / 30);
          CM.muzzle(f, mz, md);
          const to = { x: s.pos.x + s.dir.x * 16 + ((i * 7) % 5 - 2), y: G(s.pos.x + s.dir.x * 16, s.pos.z + s.dir.z * 16) + 0.9, z: s.pos.z + s.dir.z * 16 + ((i * 3) % 5 - 2) };
          if (fireOn) FIRE.burst({ x: mz.x, y: mz.y, z: mz.z }, null, n, { at: ev.fire, ch, side: 'nva', to, rate: RATE, sc: 3, src: 'nvaslit:' + id });
        });
        // up to three men at once: give each event a man not busy then
        me.slitEv.sort((a, b) => a.ch - b.ch || a.t0 - b.t0);
        for (const ev of me.slitEv) {
          const busy = me.slitEv.filter((o) => o !== ev && o.ch === ev.ch && o.who !== undefined && o.t0 < ev.end + DUCK + 1 && ev.t0 < o.end + DUCK + 1 && o.t0 < ev.t0).map((o) => o.who);
          ev.who = [0, 1, 2].find((w) => !busy.includes(w)) || 0;
        }
        me.peekEv = PEEK_EV.map(([ch, spot, k, t0, len]) => ({ ch, h: PL.near[spot][k], t0, len, spot })).filter((e) => e.h);
        me.s9 = PL.s9;
        me.h11 = PL.h11; me.up11 = [0, 0, 0, 0]; me.mz11 = [0, 1, 2, 3].map(() => new THREE.Vector3());
        // fire.js asks where man i's muzzle is in chapter 11 (null while he is not up in his hole with the lid open)
        window.NVA.muzzle11 = (i) => {
          const f = POOL.hole[i];
          if (ctx.chapter.id !== 11 || !f || !f.F.root.visible || !(me.up11[i] > 0.6)) return null;
          return CM.muzzle(f, me.mz11[i]);
        };
        f.F.root.visible = false;
      };

      // ---------- placing a man ----------
      // Every placement says where his head goes (f.nva.head) and, for a man firing, which way his rifle should point
      // (f.nva.aim, blended by aimK). After the clip pose, the whole figure turns about his head so the muzzle points
      // that way, then moves so the head is where it should be; what is below the ground is hidden by the ground.
      const V3_ = () => new THREE.Vector3();
      const qd = new THREE.Quaternion(), qI = new THREE.Quaternion(), hp = V3_(), tv = V3_();
      // at a slit: his head just behind the slit mouth, under the lintel; drop lowers him out of sight
      function placeSlitMan(f, s, drop, k) {
        f.x = s.pos.x - s.dir.x * 0.3; f.z = s.pos.z - s.dir.z * 0.3; f.yaw = Math.atan2(s.dir.x, s.dir.z) - (me.rifleYaw || 0);
        // on the walking surface where a crater rim stands higher than the slit (as fire.js's muzzle; fix pass)
        const sy = Math.max(s.pos.y, G(s.pos.x + s.dir.x * 0.45, s.pos.z + s.dir.z * 0.45) + 0.2);
        f.nva.head.set(s.pos.x - s.dir.x * 0.3, sy + 0.22 - drop, s.pos.z - s.dir.z * 0.3);
        f.nva.aim.set(s.dir.x, -0.06, s.dir.z).normalize(); f.nva.aimK = k; f.nva.useHead = true; f.nva.pitch = 0;
      }
      function after(f) {
        const r = f.F.root, n = f.nva;
        if (!n.useHead) r.position.y += n.sink;
        if (n.pitch) r.rotateX(n.pitch);
        r.updateMatrixWorld(true);
        if (n.aimK > 0.001 && CM.muzzle(f, mz, md)) {
          md.normalize(); const ang = md.angleTo(n.aim) || 1e-6; qd.setFromUnitVectors(md, n.aim); qI.identity().slerp(qd, Math.min(n.aimK, (n.maxTurn || 0.5) / ang));
          f.b.mixamorigHead.getWorldPosition(hp);
          r.quaternion.premultiply(qI); r.position.sub(hp).applyQuaternion(qI).add(hp);
          r.updateMatrixWorld(true);
        }
        if (n.useHead) { f.b.mixamorigHead.getWorldPosition(hp); r.position.add(tv.copy(n.head).sub(hp)); r.updateMatrixWorld(true); }
      }
      function step(f, dt, t) { f.F.root.quaternion.identity(); CM.update(f, dt, t); after(f); }
      function show(f, on, dt, t) {
        if (on) {
          if (!f.nva.wasOn) { f.F.root.visible = true; for (let k = 0; k < 3; k++) step(f, 1 / 30, t); }
          else step(f, Math.min(dt, 0.1), t);
        } else if (f.nva.wasOn) f.F.root.visible = false;
        f.nva.wasOn = on;
      }
      me.place = { placeSlitMan, after, show, step, pose, setLid, POOL, figs };
      me.H11 = H11; me.FILE = FILE; me.NIGHT_T = NIGHT_T;

      // ---------- labels: the enemy positions (the horseshoe also carries works.js's 'bunkers') ----------
      const mid = (ids) => { const W = ctx.works || window.WORKS, ss = ((W && W.slits) || []).filter((s) => ids.test(s.id)); if (!ss.length) return null; const v = new THREE.Vector3(); ss.forEach((s) => v.add(s.pos)); return v.multiplyScalar(1 / ss.length); };
      let nPos = null, sPos = null, hPos = null;
      ctx.tag('nva', () => nPos || (nPos = mid(/^north/) || S.northEnd), { r: 10, when: (ch) => ch.id >= 3 });
      ctx.tag('nva', () => sPos || (sPos = mid(/^second/) || S.secondPosition), { r: 9, when: (ch) => ch.id >= 6 });
      ctx.tag('nva', () => hPos || (hPos = mid(/^arc[1-3]$/) || S.bunkerArc[1]), { r: 10, when: (ch) => ch.id >= 3 });
    },

    update(t, dt, ctx) {
      const me = this;
      if (!me.ready) return;
      me.arm();
      if (!me.armed) return;
      const id = ctx.chapter.id, T = ctx.cycle.t;
      const { placeSlitMan, show, pose, setLid, POOL } = me.place;
      const G = (x, z) => ctx.surfaceY(x, z);
      const want = me.want || (me.want = new Set()); want.clear();   // the figures that show this frame
      let nl = 0, nh = 0;

      // the slits (ch 3, 6, 7)
      for (const ev of me.slitEv) {
        if (ev.ch !== id || T < ev.t0 - 0.3 || T > ev.end + DUCK + 0.2) continue;
        const f = POOL.slit[ev.who];
        const up = sm((T - ev.t0) / RISE) * (1 - sm((T - ev.end) / DUCK));
        placeSlitMan(f, ev.s, 1.15 * (1 - up), up);
        pose(f, 'Rifle Idle', 1.0 + (T - ev.t0) * 0.6);
        want.add(f);
      }
      // a helmet at a spider hole (ch 3, 6, 7): the lid lifts, he looks out, it shuts over him
      for (const ev of me.peekEv) {
        if (ev.ch !== id || T < ev.t0 - 0.6 || T > ev.t0 + ev.len + 1.2) continue;
        const f = POOL.hole[0], h = ev.h.pos, tgt = ev.spot === 'northEnd' ? ctx.SITE.alz : ctx.SITE.charliePause;
        const open = sm((T - ev.t0) / 0.5) * (1 - sm((T - ev.t0 - ev.len) / 0.55));
        const up = sm((T - ev.t0 - 0.25) / 0.5) * (1 - sm((T - ev.t0 - ev.len + 0.35) / 0.4));
        f.x = h.x; f.z = h.z; f.yaw = Math.atan2(tgt.x - h.x, tgt.z - h.z) + 0.3 * Math.sin((T - ev.t0) * 1.3);
        f.nva.useHead = true; f.nva.aimK = 0; f.nva.pitch = 0;
        f.nva.head.set(h.x, G(h.x, h.z) - 0.5 + 0.62 * up, h.z);
        pose(f, 'Idle Crouching', 2 + (T - ev.t0));
        want.add(f);
        setLid(nl++, h.x, h.z, tgt.x - h.x, tgt.z - h.z, 0.55 * open);
      }
      // ch 9: the man at the s9 slit, only while it fires
      if (id === 9) for (const t0 of me.NIGHT_T) {
        if (T < t0 - 0.9 || T > t0 + 2.3) continue;
        const f = POOL.night, up = sm((T - t0 + 0.55) / RISE) * (1 - sm((T - t0 - 1.55) / DUCK));
        placeSlitMan(f, me.s9, 1.15 * (1 - up), up);
        pose(f, 'Rifle Idle', 1.0 + (T - t0) * 0.6);
        want.add(f);
      }
      // ch 11: four men in holes round the LZ fire up at the CH-46
      if (me.up11) me.up11.fill(0);
      if (id === 11 && T > me.H11.lidOpen - 0.8 && T < me.H11.lidShut + 1.2) {
        const lz = ctx.SITE.routes.ch46[1];
        const heli = (window.FIRE && FIRE.ch46At) ? FIRE.ch46At(T) : { x: lz.x, y: lz.y + 3, z: lz.z };
        [0, 1, 2, 3].forEach((i) => {
          // the same four holes fire.js fires from (works.js's nvaHoles('lz')), so the flash is at this man's rifle
          const x = me.h11[i].x, z = me.h11[i].z;
          const f = POOL.hole[i], d0 = i * 0.4;
          const open = sm((T - me.H11.lidOpen - d0 * 0.5) / 0.45) * (1 - sm((T - me.H11.lidShut - d0 * 0.3) / 0.5));
          const up = sm((T - me.H11.rise - d0) / 0.5) * (1 - sm((T - me.H11.duck - d0 * 0.25) / 0.45));
          const hx = heli.x - x, hz = heli.z - z, hy = heli.y - G(x, z) - 1.2, hd = Math.hypot(hx, hz);
          f.x = x - (hx / (hd || 1)) * 0.25; f.z = z - (hz / (hd || 1)) * 0.25; f.yaw = Math.atan2(hx, hz);
          // crouched low in the hole, rising into a standing hold that leans back to aim up at the helicopter
          f.nva.useHead = true; f.nva.pitch = 0;
          f.nva.head.set(f.x, G(x, z) - 0.65 + 1.1 * up, f.z);
          f.nva.aim.set(hx, Math.max(0, hy), hz).normalize(); f.nva.aimK = up; f.nva.maxTurn = 0.42;
          pose(f, 'Idle Crouching', 3 + T * 0.5, 'Rifle Idle', 1 + T * 0.6, up);
          want.add(f);
          setLid(nl++, x, z, hx, hz, open);
          me.holes.setMatrixAt(nh++, me.m4.makeTranslation(x, G(x, z) + 0.035, z));
          me.up11[i] = up;
        });
      }
      // ch 5: Rider's file running low up the far slope, out of the grass and back into it
      if (id === 5) {
        const F = me.FILE, ax = F.from[0], az = F.from[1], bx = F.to[0], bz = F.to[1], L = Math.hypot(bx - ax, bz - az);
        const ux = (bx - ax) / L, uz = (bz - az) / L;
        POOL.file.forEach((f, i) => {
          const sp = me.runSpeed * F.rate * f.scale;
          const t0 = F.t0 + i * F.gap + 0.25 * Math.sin(i * 2.3);
          const s = (T - t0) * sp - F.lead;     // metres past the entry; the man is out of the grass for 0 < s < L
          const vis = s > -2 && s < L + 2.5;
          if (!vis) { f.nva.blob.hide(); return; }
          const wob = 0.35 * Math.sin(i * 1.7 + s * 0.15);
          f.x = ax + ux * s - uz * wob; f.z = az + uz * s + ux * wob; f.yaw = Math.atan2(ux, uz);
          const out = sm((s + 0.2) / 1.2) * (1 - sm((s - L + 0.6) / 1.2));
          f.nva.useHead = false; f.nva.aimK = 0; f.nva.sink = -1.5 * (1 - out); f.nva.pitch = 0.16;
          pose(f, F.clip, (T - t0) * F.rate + i * 0.37);
          want.add(f);
          if (out > 0.05) f.nva.blob.set(f.x, G(f.x, f.z), f.z, out); else f.nva.blob.hide();
        });
      } else if (me.fileShown) POOL.file.forEach((f) => f.nva.blob.hide());
      me.fileShown = id === 5;

      for (const f of me.place.figs) show(f, want.has(f), dt, t);
      me.lids.count = nl; me.lids.visible = nl > 0; me.lids.instanceMatrix.needsUpdate = true;
      me.holes.count = nh; me.holes.visible = nh > 0; me.holes.instanceMatrix.needsUpdate = true;
    },
  });
})();
