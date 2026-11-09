// motion.js: Mixamo clips on the clay v3 skeleton, with the natural-motion layer from motion-study/index.html ported to
// it, and the living face. Everything on window.CM.
//
// Retarget. The clay bones have an identity bind rotation and stand at the clay body's joints; the X Bot's bind is a
// T-pose. A clip is mapped bone by bone in world space: clay(t) = src(t) * srcBind^-1 * A, where A turns the clay bind
// onto the X Bot's (identity for the spine, legs and head, which stand the same way in both; the hanging arm onto the
// T-pose arm for the arms, hands and fingers). Only rotations cross over, plus the hips' height and root motion scaled
// by leg length (clay hips 0.775 m, X Bot 1.043 m).
//
// Layers (each can be switched off): 1 rifle (two-hand hold, left hand by IK, rifle sprung; slung on the back for clips
// with no rifle), 2 kit (canteens, pouches, aid bags, helmet on springs; the whip antenna), 3 look (gaze scans, the head
// follows 120 ms behind, a nod on each footfall), 4 load (lean, shoulders, knee bend, trimmed per clip), 5 variation
// (rate, phase, stride, width, arm swing per figure), 6 root (foot-planted root motion, clean stops; the ground contact),
// 7 hip sway (the hips' residual side-to-side motion), 8 face (blinks, saccades, brow and jaw drift, breath, mood).
// Before the mixer runs each frame every bone is put back to the clip's last values (three.js skips writing a bone whose
// clip value has not changed, so layered offsets would otherwise pile up).
(function () {
  'use strict';
  const CM = (window.CM = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const TAU = Math.PI * 2, MX = 'mixamorig';
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const UP = V(0, 1, 0), RIGHT = V(-1, 0, 0), FWD = V(0, 0, 1); // figure space: faces +z, his right is -x
  const mixKey = (n) => n.replace(/^mixamorig\d*[:_]?/i, '');
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  CM.rand = mulberry32;

  // ---------------------------------------------------------------- the clips
  // mode: plant (a walk cycle: root moves with the planted foot), still (a loop in place: drift removed), drift (a loop
  // that travels at the clip's own speed), once (a one-shot: the hips keep the clip's own travel, the root stays).
  // rifle: two (two-hand hold) or sling. load: how much of the load layer applies (1 standing and walking, 0 on the
  // ground); knee: the load layer's knee bend (trimmed on Walk With Rifle, whose knees already bend).
  const CFG = {
    'Rifle Walk': { mode: 'plant', rifle: 'two', load: 1, knee: 1 },
    'Walk With Rifle': { mode: 'plant', rifle: 'two', load: 1, knee: 0.25 },
    'Rifle Run': { mode: 'plant', rifle: 'two', load: 0.6, knee: 0 },
    'Rifle Crouch Walk': { mode: 'plant', rifle: 'two', load: 0.4, knee: 0 },
    'Injured Walk': { mode: 'plant', rifle: 'sling', load: 0.6, knee: 0 },
    'Rifle Idle': { mode: 'still', rifle: 'two', load: 1, knee: 1 },
    'Rifle Kneel Idle': { mode: 'still', rifle: 'two', load: 0.5, knee: 0 },
    'Idle Crouching': { mode: 'still', rifle: 'two', load: 0.4, knee: 0 },
    'Rifle Idle To Crouch': { mode: 'once', rifle: 'two', load: 0.5, knee: 0 },
    'Rifle Run To Stop': { mode: 'once', rifle: 'two', load: 0.6, knee: 0 },
    'Prone Idle': { mode: 'still', rifle: 'two', load: 0, knee: 0 },
    'Prone Forward': { mode: 'drift', rifle: 'two', load: 0, knee: 0 },
    'Low Crawl': { mode: 'still', rifle: 'sling', load: 0, knee: 0 },
    'Dying': { mode: 'once', rifle: 'carry', drop: 1.5, load: 0, knee: 0 },
    'Dying (1)': { mode: 'once', rifle: 'carry', drop: 1.6, load: 0, knee: 0 },
    'Dying (2)': { mode: 'once', rifle: 'carry', drop: 1.3, load: 0, knee: 0 },
    'Getting Up': { mode: 'once', rifle: 'sling', load: 0, knee: 0 },
    'Stand Up': { mode: 'once', rifle: 'sling', load: 0, knee: 0 },
    'Kneeling Down': { mode: 'once', rifle: 'carry', load: 0.3, knee: 0 },
    'Lying Down': { mode: 'once', rifle: 'sling', load: 0, knee: 0 },
    'Being Carried': { mode: 'once', rifle: 'sling', load: 0, knee: 0 },
    'Laying Breathless': { mode: 'still', rifle: 'sling', load: 0, knee: 0 },
    'Sitting Idle': { mode: 'still', rifle: 'sling', load: 0, knee: 0 },
    'Throw Grenade': { mode: 'still', rifle: 'sling', load: 0, knee: 0 },
    'Grenade Throw': { mode: 'still', rifle: 'sling', load: 0.3, knee: 0 },
    'Crouch Idle 02 Looking Around': { mode: 'still', rifle: 'sling', load: 0.3, knee: 0 },
  };
  const DEFAULT_CFG = { mode: 'still', rifle: 'sling', load: 1, knee: 0.5 };
  CM.cfg = (name) => CFG[name] || DEFAULT_CFG;
  CM.ALL = ['Rifle Walk', 'Walk With Rifle', 'Rifle Run', 'Rifle Run To Stop', 'Rifle Crouch Walk', 'Rifle Idle', 'Rifle Idle To Crouch', 'Rifle Kneel Idle', 'Idle Crouching',
    'Crouch Idle 02 Looking Around', 'Looking Around', 'Pointing', 'Pointing Forward', 'Kneeling Pointing', 'Talking On Phone', 'Kneeling Down', 'Stand Up', 'Getting Up', 'Lying Down',
    'Sitting Idle', 'Injured Walk', 'Injured Idle', 'Laying Breathless', 'Low Crawl', 'Prone Forward', 'Prone Idle', 'Throw Grenade', 'Grenade Throw', 'Carrying', 'Being Carried',
    'Dying', 'Dying (1)', 'Dying (2)'];

  // where the Mixamo FBX clips are, relative to the page (a scene page at scenes/himmer-1968/ sets 'realistic-spike/anim/')
  CM.animPath = '../realistic-spike/anim/';
  const fbxLoader = new THREE.FBXLoader();
  const loadFbx = (n) => new Promise((res, rej) => fbxLoader.load(CM.animPath + encodeURIComponent(n) + '.fbx', res, undefined, rej));
  const clips = (CM.clips = {});
  let REF = null, bindRest = null, T = null; // the X Bot reference, its bind, and the clay template's bind
  const A = {}; // per-bone bind alignment (clay bind -> X Bot bind)

  function readBind(obj) {
    let sk = null; obj.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; }); if (!sk) return null;
    const r = {}, q = new THREE.Quaternion(), p = V(0, 0, 0), sc = V(0, 0, 0);
    sk.skeleton.bones.forEach((b, i) => { new THREE.Matrix4().copy(sk.skeleton.boneInverses[i]).invert().decompose(p, q, sc); r[mixKey(b.name)] = { q: q.clone(), p: p.clone() }; });
    return r;
  }
  function relTo(root, bone, q, p) {
    if (q) bone.getWorldQuaternion(q).premultiply(root.getWorldQuaternion(new THREE.Quaternion()).invert());
    if (p) { bone.getWorldPosition(p); p.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert()); }
  }

  // Set up from a clay template figure (any variant: they share the skeleton's joints).
  CM.init = async function (F0) {
    REF = await loadFbx('Rifle Walk');
    bindRest = readBind(REF);
    T = { bind: {}, parent: {}, order: [] };
    for (const [name, par] of F0.boneList) {
      if (!name.startsWith(MX)) continue;
      const k = mixKey(name);
      T.bind[k] = F0.bind[name].clone(); T.parent[k] = par ? mixKey(par) : null; T.order.push(k);
    }
    // the alignment: arms, hands and fingers turn from hanging onto the T-pose; everything else matches as it stands
    for (const k of T.order) A[k] = new THREE.Quaternion();
    for (const S of ['Left', 'Right']) {
      const dir = (src, a, b) => (src ? bindRest[b].p.clone().sub(bindRest[a].p) : T.bind[b].clone().sub(T.bind[a])).normalize();
      A[S + 'Arm'].setFromUnitVectors(dir(false, S + 'Arm', S + 'ForeArm'), dir(true, S + 'Arm', S + 'ForeArm'));
      A[S + 'ForeArm'].setFromUnitVectors(dir(false, S + 'ForeArm', S + 'Hand'), dir(true, S + 'ForeArm', S + 'Hand'));
      for (const k of T.order) if (k.startsWith(S + 'Hand')) A[k].copy(A[S + 'ForeArm']);
    }
    T.hipScale = T.bind.Hips.y / bindRest.Hips.p.y;
    CM.T = T; CM.A = A;
  };

  // M16 frame -> the rifle's aim frame (grip at the origin, barrel along +y of the aim frame), as the motion study's markers
  function aimFrame(o, target, up) { const y = target.clone().sub(o).normalize(), u = (up || UP).clone(); const x = V(0, 0, 0).crossVectors(y, u).normalize(), z = V(0, 0, 0).crossVectors(x, y); return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o); }
  const GRIP_R = V(-0.045, 0.02, 0).multiplyScalar(0.88 * 0.88), GRIP_L = V(0.2, 0.05, 0).multiplyScalar(0.88 * 0.88);
  const RIFLE_C = aimFrame(GRIP_R, GRIP_R.clone().add(V(1, 0, 0)), UP), RIFLE_CINV = RIFLE_C.clone().invert();
  const vestR = (y) => { const P = [[0.205, 0.795], [0.222, 0.84], [0.231, 0.97], [0.24, 1.1], [0.238, 1.15], [0.228, 1.2], [0.205, 1.245], [0.165, 1.28]]; if (y <= P[0][1]) return P[0][0]; for (let i = 0; i < P.length - 1; i++) if (y <= P[i + 1][1]) return P[i][0] + (P[i + 1][0] - P[i][0]) * (y - P[i][1]) / (P[i + 1][1] - P[i][1]); return 0.15; };

  function retarget(src, clip, name) {
    const cfg = CM.cfg(name);
    const bones = {}; src.traverse((o) => { const k = mixKey(o.name); if (T.bind[k] && !bones[k]) bones[k] = o; }); // the outer node: the one the clip animates
    src.updateMatrixWorld(true);
    const keys = T.order.filter((k) => bones[k] && bindRest[k]);
    const m = new THREE.AnimationMixer(src); m.clipAction(clip).play();
    const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1), times = new Float32Array(n);
    const qv = {}; keys.forEach((k) => { qv[k] = new Float32Array(n * 4); });
    const inv = {}; for (const k of keys) inv[k] = bindRest[k].q.clone().invert();
    const qs = new THREE.Quaternion(), world = {}, hw = [];
    const hs = T.hipScale, toClay = (p) => p.sub(bindRest.Hips.p).multiplyScalar(hs).add(T.bind.Hips); // X Bot space -> clay space
    const rifle = cfg.rifle === 'two' ? { p: new Float32Array(n * 3), q: new Float32Array(n * 4), hR: [], hL: [] } : null;
    const pr = V(0, 0, 0), pl = V(0, 0, 0), pc = V(0, 0, 0), tmp = V(0, 0, 0), mid = V(0, 0, 0), W = new THREE.Matrix4(), Tq = new THREE.Quaternion(), Wq = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const t = Math.min(clip.duration, i / fps); times[i] = t; m.setTime(Math.min(t, clip.duration - 1e-4)); // at exactly the duration a repeating source wraps to its first frame src.updateMatrixWorld(true);
      for (const k of keys) {
        relTo(src, bones[k], qs, null);
        world[k] = (world[k] || new THREE.Quaternion()).copy(qs).multiply(inv[k]).multiply(A[k]);
        const par = T.parent[k];
        (par ? world[par].clone().invert().multiply(world[k]) : world[k]).toArray(qv[k], i * 4);
      }
      const hp = V(0, 0, 0); relTo(src, bones.Hips, null, hp); hw.push(toClay(hp));
      if (rifle) {
        // the rifle as the X Bot holds it: grip in the right palm, barrel through the left; carried into clay space,
        // relative to the clay chest (Spine2) as the retarget turns it
        const palm = (S, out) => { relTo(src, bones[S + 'Hand'], null, out); relTo(src, bones[S + 'HandMiddle1'], null, mid); return out.lerp(mid, 0.5); };
        toClay(palm('Right', pr)); toClay(palm('Left', pl)); relTo(src, bones.Spine2, null, pc); toClay(pc);
        const grip = pr.clone().lerp(pl, 0.12);
        W.copy(aimFrame(grip, pl.clone().addScaledVector(tmp.copy(pl).sub(pr).normalize(), 0.3))).multiply(RIFLE_CINV);
        Wq.setFromRotationMatrix(W);
        const chestQ = world.Spine2; Tq.copy(chestQ).invert();
        tmp.setFromMatrixPosition(W).sub(pc).applyQuaternion(Tq).toArray(rifle.p, i * 3);
        Tq.clone().multiply(Wq).toArray(rifle.q, i * 4);
        // each hand's turn in the rifle's frame
        const wi = Wq.clone().invert();
        rifle.hR.push(wi.clone().multiply(world.RightHand)); rifle.hL.push(wi.clone().multiply(world.LeftHand));
      }
    }
    m.stopAllAction(); m.uncacheRoot(src);
    const tracks = keys.map((k) => new THREE.QuaternionKeyframeTrack(MX + k + '.quaternion', times, qv[k]));
    const ud = { name, cfg, fps, n, speed: 0, drift: V(0, 0, 0), sway: null };
    const pv = new Float32Array(n * 3);
    if (cfg.mode === 'once') {
      for (let i = 0; i < n; i++) hw[i].toArray(pv, i * 3);
    } else {
      // residual horizontal hip motion: minus the straight line from first to last frame, minus its mean (motion study)
      const e = hw[n - 1].distanceTo(hw[0]) < hw[n - 2].distanceTo(hw[0]) * 0.5 ? n - 2 : n - 1;
      const dx = (hw[e].x - hw[0].x) / times[e], dz = (hw[e].z - hw[0].z) / times[e], res = [];
      for (let i = 0; i < n; i++) { const j = i > e ? 0 : i; res.push([hw[j].x - hw[0].x - dx * times[j], hw[j].z - hw[0].z - dz * times[j]]); }
      const mx = res.reduce((s, r) => s + r[0], 0) / n, mz = res.reduce((s, r) => s + r[1], 0) / n;
      const sway = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        V(T.bind.Hips.x, hw[i].y, T.bind.Hips.z).toArray(pv, i * 3);
        sway[i * 3] = res[i][0] - mx; sway[i * 3 + 2] = res[i][1] - mz;
      }
      ud.sway = sway; ud.drift.set(dx, 0, dz); ud.speed = Math.hypot(dx, dz);
      // a clip that does not travel keeps its sway in the hips track itself (no root motion to stand in for it)
      if (cfg.mode === 'still') for (let i = 0; i < n; i++) { pv[i * 3] += sway[i * 3]; pv[i * 3 + 2] += sway[i * 3 + 2]; }
      if (cfg.mode === 'still') ud.sway = null;
    }
    tracks.push(new THREE.VectorKeyframeTrack(MX + 'Hips.position', times, pv));
    if (rifle) {
      // mean turn of each hand in the rifle's frame
      const avg = (list) => { const r = new THREE.Quaternion(0, 0, 0, 0), ref = list[0]; for (const q of list) { const s = q.dot(ref) < 0 ? -1 : 1; r.x += q.x * s; r.y += q.y * s; r.z += q.z * s; r.w += q.w * s; } return r.normalize(); };
      rifle.qR = avg(rifle.hR); rifle.qL = avg(rifle.hL); delete rifle.hR; delete rifle.hL;
      // clearance: the clay vest is far deeper than the X Bot's chest, so the rifle moves forward (in chest space) until the
      // receiver, magazine and handguard clear the vest with a hand's thickness to spare
      const pts = [V(0, 0, 0), V(0.04, -0.12, 0), V(0.2, 0.02, 0), V(-0.15, -0.01, 0)].map((p) => p.multiplyScalar(0.88));
      let need = 0; const q = new THREE.Quaternion(), p = V(0, 0, 0);
      for (let i = 0; i < n; i++) {
        q.fromArray(rifle.q, i * 4);
        for (const s of pts) {
          p.copy(s).applyQuaternion(q).add(tmp.fromArray(rifle.p, i * 3));
          const y = p.y + T.bind.Spine2.y, r = vestR(y) * 1.04 + 0.035;
          if (Math.abs(p.x) < r) need = Math.max(need, r * 0.8 * Math.sqrt(1 - (p.x / r) ** 2) - p.z);
        }
      }
      rifle.dz = need;
      for (let i = 0; i < n; i++) rifle.p[i * 3 + 2] += need;
      // reach: the clay's shoulders sit far wider than the X Bot's, so bring the rifle in (sideways and up, not back into the
      // vest) until each grip is within a bent arm's reach of its shoulder (clay arm 0.45 m, the palm 0.07 m past the wrist)
      const shoulder = { R: V(-0.25, 0.13, 0), L: V(0.25, 0.13, 0) }, reach = { R: 0.47, L: 0.49 }, gp = V(0, 0, 0);
      for (let it = 0; it < 4; it++) {
        for (const side of ['R', 'L']) {
          const g = side === 'R' ? GRIP_R : GRIP_L, acc = V(0, 0, 0);
          for (let i = 0; i < n; i++) { q.fromArray(rifle.q, i * 4); gp.copy(g).applyQuaternion(q).add(tmp.fromArray(rifle.p, i * 3)); acc.add(gp); }
          acc.multiplyScalar(1 / n);
          const d = acc.distanceTo(shoulder[side]);
          if (d > reach[side]) {
            const mv = shoulder[side].clone().sub(acc).setZ(0).normalize().multiplyScalar(Math.min(0.12, d - reach[side]));
            for (let i = 0; i < n; i++) { rifle.p[i * 3] += mv.x; rifle.p[i * 3 + 1] += mv.y; }
            rifle['shift' + side] = (rifle['shift' + side] || 0) + mv.length();
          }
        }
      }
      const mp = V(0, 0, 0), mq = []; for (let i = 0; i < n; i++) { mp.add(tmp.fromArray(rifle.p, i * 3)); mq.push(new THREE.Quaternion().fromArray(rifle.q, i * 4)); }
      rifle.meanP = mp.multiplyScalar(1 / n); rifle.meanQ = avg(mq);
      ud.rifle = rifle;
    }
    const out = new THREE.AnimationClip(name, clip.duration, tracks);
    out.userData = ud;
    return out;
  }
  CM.load = async function (names, onEach) {
    for (const nm of names) {
      if (clips[nm]) continue;
      const src = nm === 'Rifle Walk' ? REF : await loadFbx(nm);
      clips[nm] = retarget(src, src.animations[0], nm);
      clips[nm].userData.means = clipMeans(clips[nm]);
      if (onEach) onEach(nm);
    }
  };
  function sampleArr(arr, ud, time, stride, out) {
    const f = clamp(time * ud.fps, 0, ud.n - 1), i = Math.floor(f), j = Math.min(ud.n - 1, i + 1), a = f - i;
    for (let k = 0; k < stride; k++) out[k] = arr[i * stride + k] * (1 - a) + arr[j * stride + k] * a;
    return out;
  }
  // per-bone mean of a clip (the centre the stride and arm-swing scaling pivots on)
  function clipMeans(clip) {
    const out = {};
    for (const tr of clip.tracks) {
      if (!tr.name.endsWith('.quaternion')) continue;
      const v = tr.values, n = v.length / 4, r = new THREE.Quaternion(0, 0, 0, 0), q = new THREE.Quaternion(), ref = new THREE.Quaternion().fromArray(v, 0);
      for (let i = 0; i < n; i++) { q.fromArray(v, i * 4); const s = q.dot(ref) < 0 ? -1 : 1; r.x += q.x * s; r.y += q.y * s; r.z += q.z * s; r.w += q.w * s; }
      out[tr.name.split('.')[0]] = r.normalize();
    }
    return out;
  }

  // ---------------------------------------------------------------- springs (motion study)
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _v1 = V(0, 0, 0), _v2 = V(0, 0, 0), _v3 = V(0, 0, 0), _v4 = V(0, 0, 0), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  function qSpring(st, target, k, c, dt, maxAng) {
    if (!st.init) { st.q.copy(target); st.w.set(0, 0, 0); st.init = true; return st.q; }
    const h = dt / 2;
    for (let s = 0; s < 2; s++) {
      _q1.copy(st.q).invert().premultiply(target); if (_q1.w < 0) { _q1.x = -_q1.x; _q1.y = -_q1.y; _q1.z = -_q1.z; _q1.w = -_q1.w; }
      const sn = Math.sqrt(Math.max(0, 1 - _q1.w * _q1.w)), ang = 2 * Math.acos(Math.min(1, _q1.w));
      if (sn > 1e-7) _v1.set(_q1.x / sn * ang, _q1.y / sn * ang, _q1.z / sn * ang); else _v1.set(0, 0, 0);
      st.w.addScaledVector(_v1, k * h).addScaledVector(st.w, -c * h);
      const wl = st.w.length(); if (wl > 1e-9) { _q2.setFromAxisAngle(_v2.copy(st.w).multiplyScalar(1 / wl), wl * h); st.q.premultiply(_q2).normalize(); }
    }
    const a = st.q.angleTo(target); if (a > maxAng) st.q.rotateTowards(target, a - maxAng);
    return st.q;
  }
  function vSpring(st, rest, k, c, dt) {
    if (!st.init) { st.p.copy(rest); st.v.set(0, 0, 0); st.prev.copy(rest); st.init = true; return st.p; }
    _v3.copy(rest).sub(st.prev).multiplyScalar(1 / Math.max(1e-4, dt)); st.prev.copy(rest);
    const h = dt / 2;
    for (let s = 0; s < 2; s++) { _v1.copy(rest).sub(st.p).multiplyScalar(k); _v2.copy(st.v).sub(_v3).multiplyScalar(c); st.v.addScaledVector(_v1.sub(_v2), h); st.p.addScaledVector(st.v, h); }
    return st.p;
  }
  const qs = () => ({ q: new THREE.Quaternion(), w: V(0, 0, 0), init: false });
  const vs = () => ({ p: V(0, 0, 0), v: V(0, 0, 0), prev: V(0, 0, 0), init: false });

  const wpos = (o, v) => v.setFromMatrixPosition(o.matrixWorld);
  const wquat = (o, q) => { _m2.extractRotation(o.matrixWorld); return q.setFromRotationMatrix(_m2); };
  function setWorldQuat(bone, q) { wquat(bone.parent, _q3).invert(); bone.quaternion.copy(_q3.multiply(q)); }
  function premul(bone, axis, ang) { if (ang) { _q1.setFromAxisAngle(axis, ang); bone.quaternion.premultiply(_q1); } }
  const _a = V(0, 0, 0), _b = V(0, 0, 0), _c = V(0, 0, 0), _d = V(0, 0, 0), _n = V(0, 0, 0), _e = V(0, 0, 0);
  function rotateBoneWorld(bone, from, to) { _q1.setFromUnitVectors(from, to); wquat(bone, _q2); _q2.premultiply(_q1); setWorldQuat(bone, _q2); bone.updateMatrixWorld(true); }
  // two-bone IK; pole: a world point the elbow bends toward
  function twoBoneIK(up, lo, hand, target, pole) {
    wpos(up, _a); wpos(lo, _b); wpos(hand, _c);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
    _d.subVectors(target, _a); const d = clamp(_d.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-4); _d.normalize();
    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    _n.subVectors(pole, _a); _n.addScaledVector(_d, -_n.dot(_d)).normalize();
    _e.copy(_a).addScaledVector(_d, l1 * cosA).addScaledVector(_n, l1 * sinA);
    rotateBoneWorld(up, _v3.subVectors(_b, _a).normalize(), _v4.subVectors(_e, _a).normalize());
    wpos(lo, _b); wpos(hand, _c);
    rotateBoneWorld(lo, _v3.subVectors(_c, _b).normalize(), _v4.subVectors(target, _b).normalize());
  }

  // ---------------------------------------------------------------- the figure
  // Layer switches, shared by every figure (the page toggles them).
  CM.ROOT_W = 0; // the root smoother's natural frequency (rad/s), 0 = off
  CM.CONTACT = 0.012; // how fast a foot stops counting as planted as it lifts (m)
  const L = (CM.L = { rifle: true, kit: true, look: true, load: true, vary: true, root: true, sway: true, face: true });
  CM.KEYS = ['rifle', 'kit', 'look', 'load', 'vary', 'root', 'sway', 'face'];
  // Moods bias the face and the head (they never pose it): lid opening, brow height and tilt, mouth, blink and gaze timing,
  // breathing.
  const MOODS = {
    calm: { lid: 0.36, browUp: 0.008, browTilt: 0.05, browIn: -0.004, mcUp: 0.004, jaw: 0.006, blink: [2.8, 7], fix: [1.2, 3.2], scan: 0.7, breath: 4.4, depth: 0.8, headDown: 0.02 },
    alert: { lid: 0.1, browUp: 0.03, browTilt: -0.01, browIn: 0.008, mcUp: -0.01, jaw: 0.0, blink: [3.5, 7], fix: [0.45, 1.5], scan: 1.25, breath: 3.1, depth: 0.9, headDown: -0.02 },
    strained: { lid: 0.24, browUp: 0.006, browTilt: 0.2, browIn: 0.032, mcUp: -0.03, jaw: 0.02, blink: [2, 4.5], fix: [0.7, 2.2], scan: 0.85, breath: 2.5, depth: 1.35, headDown: 0.06 },
  };
  CM.MOODS = MOODS;
  const MOOD_KEYS = Object.keys(MOODS.calm).filter((k) => typeof MOODS.calm[k] === 'number');

  const FIGS = [];
  CM.figure = function (F, o) {
    o = o || {};
    const b = F.j;
    const r = mulberry32(o.seed || 1);
    const v = o.vary ? { rate: 0.92 + r() * 0.16, phase: r(), stride: 0.92 + r() * 0.14, width: (-1 + r() * 3) * Math.PI / 180, arm: 0.75 + r() * 0.5, load: 0.75 + r() * 0.5, breath: 0.9 + r() * 0.2, lean: r() }
      : { rate: 1, phase: 0, stride: 1, width: 0, arm: 1, load: 1, breath: 1, lean: 0.5 };
    const mixer = new THREE.AnimationMixer(F.mesh);
    const mixBones = F.bones.filter((x) => x.name.startsWith(MX));
    const f = {
      F, b, mixer, v, o, rng: mulberry32((o.seed || 1) * 7 + 3), raw: !!o.raw,
      x: o.x || 0, z: o.z || 0, yaw: o.yaw !== undefined ? o.yaw : Math.PI / 2, scale: (F.height || 1) * (o.scale || 1),
      acts: {}, cur: null, feet: null, speed: 0, t: 0, ground: o.ground || (() => 0),
      mixBones, clipQ: mixBones.map((x) => x.quaternion.clone()), clipP: b[MX + 'Hips'].position.clone(),
      look: { next: 0, ty: 0, tp: 0, gy: 0, gp: 0, buf: [], hy: 0, hp: 0, vy: 0, vp: 0, nod: 0, nodV: 0, neck: vs() },
      blink: { next: 0.6 + r() * 2.5, at: -9, dbl: false },
      mood: o.mood || 'calm', mv: Object.assign({}, MOODS[o.mood || 'calm']),
      face: { seed: r() * 100, ex: {} },
      sp: { rifle: qs(), rifleP: vs(), helmet: qs(), helmetY: vs() }, kitSp: {}, ant: vs(), armSt: { l: 0, r: 0 },
      handset: 0,
    };
    for (const k of F.kit) f.kitSp[k] = vs();
    F.root.scale.setScalar(f.scale);
    // rest directions of the swinging kit, from the pivot to the piece's centre (in the Hips frame, identity at bind)
    f.kitRest = {};
    for (const k of F.kit) f.kitRest[k] = k.startsWith('canteen') ? V(0, -1, -0.15).normalize() : k.startsWith('pouch') ? V(0, -1, 0.25).normalize() : V(0, -1, 0).normalize();
    FIGS.push(f);
    return f;
  };
  CM.setMood = (f, m) => { f.mood = m; };

  // Play a clip (crossfading from the current one). opt: { fade, once, time }
  CM.play = function (f, name, opt) {
    opt = opt || {};
    const clip = clips[name]; if (!clip) return;
    let a = f.acts[name];
    if (!a) { a = f.acts[name] = f.mixer.clipAction(clip); }
    const ud = clip.userData, once = ud.cfg.mode === 'once' || opt.once;
    // a one-shot plays on a repeating loop that this module stops a frame short of its end (three.js's LoopOnce clamp
    // dropped the pose to the bind pose once the action paused)
    a.reset(); a.setLoop(THREE.LoopRepeat); a._once = once; a._held = false;
    a.timeScale = (ud.cfg.mode === 'plant' ? f.v.rate : 1) * (opt.reverse ? -1 : 1);
    a.time = opt.time !== undefined ? opt.time : opt.reverse ? clip.duration : (ud.cfg.mode === 'once' ? 0 : f.v.phase * clip.duration);
    a.setEffectiveWeight(1); a.play();
    const prev = f.cur && f.acts[f.cur];
    if (prev && prev !== a) prev.crossFadeTo(a, opt.fade !== undefined ? opt.fade : 0.45, false);
    f.cur = name;
  };

  const MB = (k) => MX + k;
  // the bones the layers edit (all of the Mixamo tree): put back to the clip's last values before the mixer runs
  function restoreClip(f) { for (let i = 0; i < f.mixBones.length; i++) f.mixBones[i].quaternion.copy(f.clipQ[i]); f.b[MB('Hips')].position.copy(f.clipP); }
  function storeClip(f) { for (let i = 0; i < f.mixBones.length; i++) f.clipQ[i].copy(f.mixBones[i].quaternion); f.clipP.copy(f.b[MB('Hips')].position); }
  function weights(f) {
    // summed weight by property, over the running actions
    const w = { two: 0, plant: 0, load: 0, knee: 0, total: 0, still: 0 };
    for (const k in f.acts) {
      const a = f.acts[k]; if (!a.isRunning() && !(a._held && a.enabled)) continue;
      const ew = a.getEffectiveWeight(); if (ew <= 0) continue;
      const c = a.getClip().userData.cfg; w.total += ew;
      if (c.rifle === 'two') w.two += ew;
      if (c.mode === 'plant') w.plant += ew;
      w.load += ew * c.load; w.knee += ew * c.knee * c.load;
    }
    if (w.total > 0) for (const k of ['two', 'plant', 'load', 'knee']) w[k] /= w.total;
    return w;
  }
  const activeActs = (f) => Object.values(f.acts).filter((a) => a.getEffectiveWeight() > 0 && (a.isRunning() || a._held));

  // ---------------------------------------------------------------- the per-frame stack
  const tmpA = new Float32Array(4), tmpB = new Float32Array(4);
  CM.update = function (f, dt, t) {
    const b = f.b, on = (k) => L[k] && (!f.raw || (k === 'root' && f.o.rawRoot)), root = f.F.root; f.t = t;
    restoreClip(f);
    for (const k in f.acts) {
      const a = f.acts[k]; if (!a._once || a._held || !a.enabled) continue;
      const d = a.getClip().duration, nt = a.time + dt * a.timeScale;
      if ((a.timeScale > 0 && nt >= d - 1e-3) || (a.timeScale < 0 && nt <= 1e-3)) { a.time = a.timeScale < 0 ? 1e-3 : d - 1e-3; a.timeScale = 0; a._held = true; }
    }
    f.mixer.update(dt);
    storeClip(f);
    const w = weights(f);
    const Hips = b[MB('Hips')];

    // 7. hip sway: the residual hip motion the retarget strips from travelling loops, weighted per action
    if (on('sway')) for (const a of activeActs(f)) { const ud = a.getClip().userData; if (!ud.sway) continue; sampleArr(ud.sway, ud, a.time % a.getClip().duration, 3, tmpA); Hips.position.x += tmpA[0] * a.getEffectiveWeight(); Hips.position.z += tmpA[2] * a.getEffectiveWeight(); }

    // 5. variation: stride, width and arm swing scaled about the walk's mean pose
    if (on('vary') && w.plant > 0) {
      for (const a of activeActs(f)) {
        const ud = a.getClip().userData; if (ud.cfg.mode !== 'plant') continue;
        const ww = a.getEffectiveWeight(), M = ud.means, s = 1 + (f.v.stride - 1) * ww, arm = 1 + (f.v.arm - 1) * ww;
        for (const k of ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']) { const n = MB(k); if (M[n]) b[n].quaternion.copy(_q1.copy(M[n]).slerp(b[n].quaternion, s)); }
        for (const k of ['RightShoulder', 'RightArm', 'RightForeArm', 'LeftShoulder', 'LeftArm', 'LeftForeArm']) { const n = MB(k); if (M[n]) b[n].quaternion.copy(_q1.copy(M[n]).slerp(b[n].quaternion, arm)); }
      }
      premul(b[MB('LeftUpLeg')], FWD, f.v.width * w.plant); premul(b[MB('RightUpLeg')], FWD, -f.v.width * w.plant);
      premul(b[MB('LeftFoot')], FWD, -f.v.width * w.plant); premul(b[MB('RightFoot')], FWD, f.v.width * w.plant);
    }
    // the mood eases toward its numbers over a couple of seconds
    { const tgt = MOODS[f.mood], k = 1 - Math.exp(-dt / 1.6); for (const key of MOOD_KEYS) f.mv[key] += (tgt[key] - f.mv[key]) * k; f.mv.blink = tgt.blink; f.mv.fix = tgt.fix; }
    // 4. load and breath: lean from the waist, shoulders rolled under the vest, knees bent (per clip), breathing
    const breathPh = ((t / (f.mv.breath * f.v.breath)) + f.v.phase) % 1, br = breathPh < 0.42 ? smooth(0, 0.42, breathPh) : 1 - smooth(0.42, 1, breathPh);
    f.breath = br;
    if (on('load') && w.load > 0) {
      const k = f.v.load * w.load, lean = (0.05 + 0.03 * f.v.lean) * k;
      premul(b[MB('Spine')], RIGHT, -lean * 0.55); premul(b[MB('Spine1')], RIGHT, -lean * 0.45);
      premul(b[MB('Neck')], RIGHT, lean * 0.6); premul(b[MB('Head')], RIGHT, lean * 0.25);
      const kb = 0.05 * f.v.load * w.knee * (0.4 + 0.6 * w.plant);
      for (const s of ['Left', 'Right']) { premul(b[MB(s + 'UpLeg')], RIGHT, kb); premul(b[MB(s + 'Leg')], RIGHT, -kb * 2); premul(b[MB(s + 'Foot')], RIGHT, kb); }
      premul(b[MB('LeftShoulder')], UP, -0.08 * k); premul(b[MB('RightShoulder')], UP, 0.08 * k);
      premul(b[MB('LeftShoulder')], FWD, -0.03 * k); premul(b[MB('RightShoulder')], FWD, 0.03 * k);
    }
    if (on('face') || on('load')) {
      const d = f.mv.depth;
      premul(b[MB('Spine2')], RIGHT, 0.022 * d * br); premul(b[MB('Neck')], RIGHT, -0.012 * d * br);
      premul(b[MB('LeftShoulder')], FWD, 0.022 * d * br); premul(b[MB('RightShoulder')], FWD, -0.022 * d * br);
    }

    // 6. root: speed from the planted foot (plant), the clip's drift (drift), still or one-shot (none); then the ground
    root.position.set(f.x, f.ground(f.x, f.z), f.z); root.rotation.y = f.yaw; root.updateMatrixWorld(true);
    const sc = f.scale;
    const feet = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].map((nm) => root.worldToLocal(wpos(b[MB(nm)], V(0, 0, 0))));
    let vx = 0;
    if (w.plant > 0) {
      if (on('root')) {
        if (f.feet) {
          const ymin = Math.min(...feet.map((p) => p.y)); let sw = 0, sz = 0, sx = 0;
          for (let i = 0; i < 2; i++) { const yl = Math.min(feet[i].y, feet[i + 2].y), ww = Math.exp(-(yl - ymin) / CM.CONTACT); sw += ww; sz += ww * ((feet[i].z + feet[i + 2].z) - (f.feet[i].z + f.feet[i + 2].z)) / 2; sx += ww * ((feet[i].x + feet[i + 2].x) - (f.feet[i].x + f.feet[i + 2].x)) / 2; }
          f.speed = -sz / Math.max(1e-4, sw) * sc / Math.max(1e-4, dt); vx = -sx / Math.max(1e-4, sw) * sc / Math.max(1e-4, dt);
          f.speed *= w.plant; vx *= w.plant;
        }
      } else { let s = 0; for (const a of activeActs(f)) { const ud = a.getClip().userData; if (ud.cfg.mode === 'plant') s += ud.speed * a.timeScale * a.getEffectiveWeight(); } f.speed = s * sc; }
    } else f.speed = 0;
    for (const a of activeActs(f)) { const ud = a.getClip().userData; if (ud.cfg.mode === 'drift') { f.speed += ud.drift.z * a.getEffectiveWeight() * sc; vx += ud.drift.x * a.getEffectiveWeight() * sc; } }
    f.feet = feet;
    // the root travels at a smoothed speed (the planted-foot speed swings 0..1 m/s inside every step, which jolted the
    // whole body); the feet are then held where they were planted by leg IK, so they do not slide
    if (on('root')) {
      const k = 1 - Math.exp(-dt / 0.35);
      f.sSpeed = f.sSpeed === undefined ? f.speed : f.sSpeed + (f.speed - f.sSpeed) * k; f.sVx = f.sVx === undefined ? vx : f.sVx + (vx - f.sVx) * k;
      f.speed = f.sSpeed; vx = f.sVx;
    }
    if (f.route) steer(f, dt);
    if (!f.o.pinned) { f.x += (Math.sin(f.yaw) * f.speed + Math.cos(f.yaw) * vx) * dt; f.z += (Math.cos(f.yaw) * f.speed - Math.sin(f.yaw) * vx) * dt; }
    // the shown root follows the planted-foot solution through a critically damped smoother: the solve steps a few
    // millimetres from frame to frame (the contact weights shift as a foot lifts), which jolted the whole body
    if (!CM.ROOT_W || f.sx === undefined || f.o.pinned || Math.hypot(f.x - f.sx, f.z - f.sz) > 0.5) { f.sx = f.x; f.sz = f.z; f.svx = 0; f.svz = 0; }
    else {
      const w = CM.ROOT_W, h = dt / 4;
      for (let k = 0; k < 4; k++) { f.svx += (w * w * (f.x - f.sx) - 2 * w * f.svx) * h; f.svz += (w * w * (f.z - f.sz) - 2 * w * f.svz) * h; f.sx += f.svx * h; f.sz += f.svz * h; }
    }
    root.position.set(f.sx, f.ground(f.sx, f.sz), f.sz);
    root.updateMatrixWorld(true);
    // the ground: the lowest contact point (heels, toes, knees, seat, back, helmet, hands) rests on the ground
    if (on('root')) {
      let lift = -Infinity;
      for (const [nm, x, y, z, rr] of PROBES) {
        const bone = b[MB(nm)]; _v1.set(x, y, z).applyMatrix4(bone.matrixWorld);
        lift = Math.max(lift, f.ground(_v1.x, _v1.z) + rr * sc - _v1.y);
      }
      f.lift = f.lift === undefined ? lift : f.lift + (lift - f.lift) * Math.min(1, dt * 12);
      root.position.y += f.lift; root.updateMatrixWorld(true);
      if (w.plant > 0 && !f.o.pinned) footLock(f, w.plant);
    }

    // 3. head and eyes, and 8. the face
    if (on('look')) look(f, dt, t);
    else { f.look.gy = f.look.gp = f.look.hy = f.look.hp = 0; }
    root.updateMatrixWorld(true);

    // 1. the rifle and the hands
    arms(f, dt, w, on);

    // 2. kit
    if (on('kit')) kit(f, dt); else for (const k of f.F.kit) { b[k].quaternion.identity(); f.kitSp[k].init = false; }
    if (!on('kit')) { b.helmet.quaternion.identity(); b.helmet.position.copy(f.F.bind.helmet).sub(f.F.bind[MB('Head')]); f.sp.helmet.init = false; }
    if (f.F.kind === 'radioman') radio(f, dt, t, w, on('kit'));
    if (f.F.kind === 'captain') { const hm = b[MB('LeftHand')]; hm.updateMatrixWorld(true); setProp(f, b.map, _m1.copy(hm.matrixWorld).multiply(MAP_IN_HAND)); }

    // 8. the face (after the head has its turn): expression drift, lids, blinks, eyes
    face(f, dt, t, on('face'));

    // skinning: the forearm's twist goes to the hand, so the elbow blend only ever bends (no candy-wrapper elbows)
    for (const s of ['Left', 'Right']) {
      const fa = b[MB(s + 'ForeArm')], hd = b[MB(s + 'Hand')], ax = f.F.bind[MB(s + 'Hand')].clone().sub(f.F.bind[MB(s + 'ForeArm')]).normalize();
      const q = fa.quaternion, d = q.x * ax.x + q.y * ax.y + q.z * ax.z;
      const tw = _q1.set(ax.x * d, ax.y * d, ax.z * d, q.w); if (tw.lengthSq() < 1e-9) continue; tw.normalize();
      const sw = _q2.copy(q).multiply(_q3.copy(tw).invert());
      fa.quaternion.copy(sw); hd.quaternion.premultiply(tw);
    }
  };
  // Foot lock: a foot that comes down is pinned where it landed (world space) until it lifts; the leg reaches it by
  // two-bone IK, the foot keeping its own turn. Blended by how firmly the foot is down.
  function footLock(f, wPlant) {
    const b = f.b, root = f.F.root;
    f.locks = f.locks || { Left: null, Right: null };
    const yAnk = {}; for (const s of ['Left', 'Right']) yAnk[s] = root.worldToLocal(wpos(b[MB(s + 'Foot')], V(0, 0, 0))).y;
    const ymin = Math.min(yAnk.Left, yAnk.Right);
    for (const s of ['Left', 'Right']) {
      const c = Math.exp(-(yAnk[s] - ymin) / 0.01), ft = b[MB(s + 'Foot')];
      let lk = f.locks[s];
      if (!lk && c > 0.8) lk = f.locks[s] = { p: wpos(ft, V(0, 0, 0)), w: 0, down: true };
      if (!lk) continue;
      if (lk.down && c < 0.3) lk.down = false;
      // full strength while down (eased in over 3 frames), eased out over 5 frames once the foot lifts
      lk.w = lk.down ? Math.min(1, lk.w + 0.34) : lk.w - 0.2;
      if (lk.w <= 0) { f.locks[s] = null; continue; }
      const cur = wpos(ft, V(0, 0, 0));
      if (cur.distanceTo(lk.p) > 0.25) { f.locks[s] = null; continue; } // a jump (view change): let go
      const ww = smooth(0, 1, lk.w) * wPlant, tgt = cur.clone().lerp(lk.p, ww);
      tgt.y = cur.y; // height stays the clip's (and the ground contact's); only the slide is taken out
      const fq = wquat(ft, new THREE.Quaternion());
      const knee = wpos(b[MB(s + 'Leg')], V(0, 0, 0)), pole = knee.clone().add(V(Math.sin(f.yaw), 0, Math.cos(f.yaw)).multiplyScalar(0.4));
      twoBoneIK(b[MB(s + 'UpLeg')], b[MB(s + 'Leg')], ft, tgt, pole);
      setWorldQuat(ft, fq); ft.updateMatrixWorld(true);
    }
  }
  // Routes: CM.route(f, [[x, z], ...], { stop: 'Rifle Idle', turn: 1.2 }) walks the figure (on whatever clip is playing)
  // along the points, turning at most turn rad/s toward the next one, and plays the stop clip at the last.
  CM.route = (f, pts, o) => { f.route = { pts, i: 0, stop: (o && o.stop) || 'Rifle Idle', turn: (o && o.turn) || 1.2 }; };
  function steer(f, dt) {
    const R = f.route; if (R.i >= R.pts.length) return;
    const [tx, tz] = R.pts[R.i], dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
    if (d < 0.6) { R.i++; if (R.i >= R.pts.length) { CM.play(f, R.stop, { fade: 0.45 }); f.route = null; } return; }
    let da = Math.atan2(dx, dz) - f.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
    f.yaw += clamp(da, -R.turn * dt, R.turn * dt);
  }
  // For other plug-ins: where a figure's muzzle is and which way it points (FIRE.burst), and a radioman's handset,
  // antenna tip and pack (radio.js). World space; out vectors are reused.
  CM.muzzle = (f, pos, dir) => { const r = f.b.rifle; if (!f.F.grip) return null; pos.set(0.49, 0.022, 0).applyMatrix4(r.matrixWorld); if (dir) dir.set(1, 0, 0).transformDirection(r.matrixWorld); return pos; };
  CM.radioPoints = (f) => {
    if (f.F.kind !== 'radioman') return null;
    const b = f.b, tip = b['a' + (f.F.antN - 1)];
    return { handset: V(0, 0.08, 0.02).applyMatrix4(b.handset.matrixWorld), antennaTip: V(0, 1, 0).applyMatrix4(tip.matrixWorld), pack: V(0, -0.05, -0.26).applyMatrix4(b[MB('Spine2')].matrixWorld) };
  };
  // contact probes: bone, point in the bone's frame (identity bind, so figure axes), radius
  const PROBES = [
    ['LeftFoot', 0, -0.085, -0.075, 0], ['RightFoot', 0, -0.085, -0.075, 0], ['LeftToeBase', 0, -0.03, 0.065, 0], ['RightToeBase', 0, -0.03, 0.065, 0],
    ['LeftFoot', 0, -0.085, 0.0, 0], ['RightFoot', 0, -0.085, 0.0, 0],
    ['LeftLeg', 0, 0, 0.07, 0.01], ['RightLeg', 0, 0, 0.07, 0.01], ['Hips', 0, -0.13, -0.08, 0.06], ['Hips', 0, -0.05, -0.17, 0.02],
    ['Spine2', 0, 0.02, -0.2, 0.0], ['Spine2', 0, 0.02, 0.2, 0.0], ['Spine2', 0.2, 0.02, 0, 0.0], ['Spine2', -0.2, 0.02, 0, 0.0], ['Head', 0, 0.17, 0, 0.2],
    ['LeftHand', 0, -0.05, 0, 0.02], ['RightHand', 0, -0.05, 0, 0.02], ['LeftForeArm', 0, 0, 0, 0.05], ['RightForeArm', 0, 0, 0, 0.05],
  ];

  // ---------------------------------------------------------------- 1. arms, rifle, sling, free arms
  const SLING = new THREE.Matrix4();
  { // slung across the back, muzzle up over the right shoulder, in chest (Spine2) space
    const x = V(-0.42, 0.9, -0.05).normalize(), y = V(0, 0, -1), z = V(0, 0, 0).crossVectors(x, y).normalize(); y.crossVectors(z, x).normalize();
    SLING.makeBasis(x, y, z).setPosition(0.13, -0.25, -0.26);
  }
  const MAP_IN_HAND = new THREE.Matrix4().compose(V(-0.06, -0.08, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.3, 1.25)), V(1, 1, 1));
  function setProp(f, bone, W) { _m2.copy(f.F.mesh.matrixWorld).invert().multiply(W); _m2.decompose(bone.position, bone.quaternion, _v4); bone.scale.copy(_v4); bone.updateMatrixWorld(true); }
  // palm centres in each hand's frame (bind: fingers down, the palm facing the thigh)
  const PALM = { Left: V(-0.016, -0.066, 0.008), Right: V(0.016, -0.066, 0.008) };
  const R_ = { p: V(0, 0, 0), q: new THREE.Quaternion(), qa: new THREE.Quaternion(), W: new THREE.Matrix4(), Ws: new THREE.Matrix4(), tgt: V(0, 0, 0), pole: V(0, 0, 0), qR: new THREE.Quaternion(), qL: new THREE.Quaternion() };
  const snapArm = (f, s) => [MB(s + 'Arm'), MB(s + 'ForeArm'), MB(s + 'Hand')].map((n) => f.b[n].quaternion.clone());
  function blendArm(f, s, saved, k) { if (k >= 1) return; [MB(s + 'Arm'), MB(s + 'ForeArm'), MB(s + 'Hand')].forEach((n, i) => { _q1.copy(f.b[n].quaternion); f.b[n].quaternion.copy(saved[i]).slerp(_q1, k); }); }
  function curl(f, s, amt, index, thumb) {
    // fingers close toward the palm (about the figure's z axis in bind), blended over the clip's own fingers
    const sg = s === 'Left' ? -1 : 1;
    for (const F4 of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) {
      const bone = f.b[MB(s + 'Hand' + F4 + i)], c = (F4 === 'Index' ? index : 1) * amt.c * (i === 1 ? 0.9 : i === 2 ? 1.1 : 0.7);
      _q2.setFromAxisAngle(FWD, sg * c); bone.quaternion.slerp(_q2, amt.w);
    }
    for (let i = 1; i <= 3; i++) { const bone = f.b[MB(s + 'HandThumb' + i)]; _q2.setFromEuler(new THREE.Euler(0, sg * 0.25 * thumb, sg * 0.45 * thumb)); bone.quaternion.slerp(_q2, amt.w); }
  }
  function arms(f, dt, w, on) {
    const b = f.b, F = f.F, mesh = F.mesh, hasRifle = !!F.grip;
    const chest = b[MB('Spine2')];
    mesh.updateMatrixWorld(true);
    if (hasRifle) {
      // where the rifle is held this frame (blended over the playing two-hand and carrying clips), in world space; a fall
      // lets go of it at the clip's drop time and it settles on the ground
      let wsum = 0; R_.p.set(0, 0, 0); let qi = 0, dropping = null;
      const idle = clips['Rifle Idle'] && clips['Rifle Idle'].userData.rifle;
      for (const a of activeActs(f)) {
        const ud = a.getClip().userData, cfg = ud.cfg, src = ud.rifle || (cfg.rifle === 'carry' ? idle : null);
        if (!src) continue;
        let ww = a.getEffectiveWeight();
        if (cfg.drop !== undefined) {
          if (a.time >= cfg.drop) { dropping = a; ww *= 1 - smooth(cfg.drop, cfg.drop + 0.3, a.time); }
          else if (f.drop && f.drop.act === a) f.drop = null;
        }
        if (ud.rifle) { sampleArr(ud.rifle.p, ud, a.time, 3, tmpA); sampleArr(ud.rifle.q, ud, a.time, 4, tmpB); _q2.fromArray(tmpB).normalize(); }
        else { src.meanP.toArray(tmpA); _q2.copy(src.meanQ); }
        if (ww <= 1e-4) continue;
        R_.p.x += tmpA[0] * ww; R_.p.y += tmpA[1] * ww; R_.p.z += tmpA[2] * ww;
        if (qi === 0) { R_.q.copy(_q2); R_.qR.copy(src.qR); R_.qL.copy(src.qL); } else { const k = ww / (wsum + ww); R_.q.slerp(_q2, k); R_.qR.slerp(src.qR, k); R_.qL.slerp(src.qL, k); }
        wsum += ww; qi++;
      }
      const hold = on('rifle') ? clamp(wsum, 0, 1) : 0;
      if (!on('rifle') && w.two > 0.5) {
        const pr = R_.tgt.copy(PALM.Right).multiplyScalar(f.scale).applyMatrix4(b[MB('RightHand')].matrixWorld), pl = PALM.Left.clone().multiplyScalar(f.scale).applyMatrix4(b[MB('LeftHand')].matrixWorld);
        const Wr = aimFrame(pr.clone().lerp(pl, 0.12), pl.clone().addScaledVector(pl.clone().sub(pr).normalize(), 0.3)).multiply(RIFLE_CINV);
        const p0 = V(0, 0, 0), q0 = new THREE.Quaternion(); Wr.decompose(p0, q0, _v4);
        setProp(f, b.rifle, Wr.compose(p0, q0, _v4.set(1, 1, 1).multiplyScalar(f.scale)));
        return;
      }
      const chestW = chest.matrixWorld;
      if (wsum > 0) { R_.p.multiplyScalar(1 / wsum); R_.W.compose(R_.p, R_.q, _v4.set(1, 1, 1)).premultiply(chestW); }
      R_.Ws.copy(chestW).multiply(SLING);
      // blend held and slung, then spring it (it lags a heavy thing's few hundredths of a second)
      const W = _m1;
      if (hold >= 1) W.copy(R_.W); else if (hold <= 0) W.copy(R_.Ws);
      else { const p1 = V(0, 0, 0), q1 = new THREE.Quaternion(), p2 = V(0, 0, 0), q2 = new THREE.Quaternion(); R_.W.decompose(p1, q1, _v4); R_.Ws.decompose(p2, q2, _v4); W.compose(p1.lerp(p2, 1 - hold), q1.slerp(q2, 1 - hold), _v4.set(1, 1, 1)); }
      const pW = V(0, 0, 0), qW = new THREE.Quaternion(); W.decompose(pW, qW, _v4);
      if (on('rifle')) { const q = qSpring(f.sp.rifle, qW, 355, 17, dt, 0.08); qW.copy(q); } else f.sp.rifle.init = false;
      if (dropping && on('rifle')) {
        if (!f.drop || f.drop.act !== dropping) {
          // where it lets go, and where it comes to rest: flat on the ground on its side, barrel the way it pointed
          const x = V(1, 0, 0).applyQuaternion(qW).setY(0).normalize(), z = V(0, 1, 0), y = V(0, 0, 0).crossVectors(z, x);
          const q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
          f.drop = { act: dropping, t: f.t, p0: pW.clone(), q0: qW.clone(), p1: V(pW.x, f.ground(pW.x, pW.z) + 0.03 * f.scale, pW.z), q1 };
        }
        const D = f.drop, k = clamp((f.t - D.t) / 0.4, 0, 1), kk = k * k;
        pW.copy(D.p0).lerp(D.p1, kk); qW.copy(D.q0).slerp(D.q1, smooth(0, 1, k));
      }
      // between the two-hand hold and the sling the blend would swing the rifle through the body: hide it for the middle
      // of the crossfade (hold 0.2-0.8, about 0.4 s of a 0.45 s fade) and show it again in the new hold (integration)
      const vis = dropping || !on('rifle') ? 1 : Math.max(smooth(0.6, 0.85, hold), 1 - smooth(0.15, 0.4, hold));
      W.compose(pW, qW, _v4.set(1, 1, 1).multiplyScalar(f.scale));
      setProp(f, b.rifle, W);   // full size for the hands' IK below; shrunk after it when hidden
      if (hold > 0) {
        // both hands onto the rifle by IK, the elbows bending toward where the clip has them, splayed out from the vest
        for (const s of ['Right', 'Left']) {
          const saved = snapArm(f, s), ua = b[MB(s + 'Arm')], fa = b[MB(s + 'ForeArm')], hd = b[MB(s + 'Hand')];
          const handQ = new THREE.Quaternion().copy(qW).multiply(s === 'Right' ? R_.qR : R_.qL);
          const grip = (s === 'Right' ? F.grip.R : F.grip.L).clone().applyMatrix4(b.rifle.matrixWorld);
          const tgt = R_.tgt.copy(PALM[s]).multiplyScalar(f.scale).applyQuaternion(handQ).negate().add(grip);
          wpos(fa, R_.pole); const sg = s === 'Left' ? 1 : -1;
          R_.pole.add(_v2.set(sg * 0.25, -0.2, -0.05).multiplyScalar(f.scale).applyQuaternion(wquat(chest, _q2)));
          twoBoneIK(ua, fa, hd, tgt, R_.pole);
          const hq = handQ.clone(); setWorldQuat(hd, hq);
          blendArm(f, s, saved, hold);
          curl(f, s, { c: 1.05, w: hold }, s === 'Right' ? 0.75 : 1, 0.8);
          ua.updateMatrixWorld(true);
        }
      }
      if (vis < 0.999) { W.compose(pW, qW, _v4.set(1, 1, 1).multiplyScalar(f.scale * Math.max(0.001, vis))); setProp(f, b.rifle, W); }
    } else if (w.two > 0 && on('rifle')) freeArms(f, dt, w.two);
  }
  // free arms for a man with no rifle in a clip made for one: hanging pendulums that swing against the opposite leg
  // (the motion study's patrol carry, without the rifle)
  const PC = { fwd: V(0, 0, 0), right: V(0, 0, 0), down: V(0, -1, 0), d1: V(0, 0, 0), d2: V(0, 0, 0), a: V(0, 0, 0), c: V(0, 0, 0) };
  function freeArms(f, dt, k) {
    const b = f.b, st = f.armSt, root = f.F.root;
    PC.fwd.set(Math.sin(f.yaw), 0, Math.cos(f.yaw)); PC.right.crossVectors(PC.fwd, UP);
    const lean = (s) => { wpos(b[MB(s + 'UpLeg')], PC.a); wpos(b[MB(s + 'Leg')], PC.c); return PC.c.sub(PC.a).normalize().dot(PC.fwd); };
    const sl = lean('Left'), sr = lean('Right'), kk = 1 - Math.exp(-dt / 0.07);
    st.l += (sr * 0.7 - st.l) * kk; st.r += (sl * 0.7 - st.r) * kk;
    const arm = (s, sw, out, bend) => {
      const saved = snapArm(f, s), up = b[MB(s + 'Arm')], lo = b[MB(s + 'ForeArm')], hd = b[MB(s + 'Hand')], sgn = s === 'Right' ? 1 : -1;
      PC.d1.copy(PC.down).addScaledVector(PC.fwd, Math.tan(sw) + 0.04).addScaledVector(PC.right, sgn * out).normalize();
      rotateBoneWorld(up, _v3.subVectors(wpos(lo, _b), wpos(up, _a)).normalize(), PC.d1);
      PC.d2.copy(PC.down).addScaledVector(PC.fwd, Math.tan(sw + bend + 0.25 * Math.max(0, sw))).addScaledVector(PC.right, sgn * out * 0.6).normalize();
      rotateBoneWorld(lo, _v3.subVectors(wpos(hd, _c), wpos(lo, _b)).normalize(), PC.d2);
      hd.quaternion.identity();
      blendArm(f, s, saved, k);
      curl(f, s, { c: 0.45, w: k }, 1, 0.4);
    };
    arm('Left', st.l, 0.16, 0.2); arm('Right', st.r, 0.16, 0.22);
  }

  // ---------------------------------------------------------------- 2. kit: pendulums and the helmet
  function kit(f, dt) {
    const b = f.b, sp = f.kitSp, Hips = b[MB('Hips')];
    // Each item is a pendulum hung from its belt loop: a bob point on a critically damped spring round where the item hangs
    // at rest (inertia does the swinging), never more than 20 degrees (pouches 7) from rest, kept off the hip, and re-hung
    // at rest whenever the figure jumps (a new view or clip that moves the root).
    // (The glitch Abram saw: the rest point was passed in a scratch vector the spring itself overwrites mid-step, so the
    // target was garbage on the second sub-step and the items flipped about every frame. Now it gets its own vector.)
    for (const k of f.F.kit) {
      const big = k.startsWith('canteen') || k.startsWith('aid');
      const [kk, max, len] = big ? [70, 0.35, 0.11] : [240, 0.12, 0.07];
      const c = 2 * Math.sqrt(kk);
      const bone = b[k];
      bone.quaternion.identity(); bone.updateMatrixWorld(true);
      const piv = wpos(bone, V(0, 0, 0)), pq = wquat(Hips, new THREE.Quaternion());
      const restW = f.kitRest[k].clone().applyQuaternion(pq);
      // the spring runs in the root's frame: the root's own travel comes from the planted foot and steps a little from frame
      // to frame, which in world space kicked the items once a stride; only the body's motion over the root swings them
      const root = f.F.root, restP = root.worldToLocal(piv.clone().addScaledVector(restW, len * f.scale));
      if (sp[k].init && sp[k].prev.distanceTo(restP) > 0.25) sp[k].init = false;
      const p = root.localToWorld(vSpring(sp[k], restP, kk, c, dt).clone());
      const dir = p.clone().sub(piv).normalize();
      const outW = _v2.set(piv.x - wpos(Hips, _v3).x, 0, piv.z - _v3.z).normalize(), off = dir.clone().sub(restW), inn = off.dot(outW);
      if (inn < 0) dir.addScaledVector(outW, -inn * 0.7).normalize();
      const ang = dir.angleTo(restW); if (ang > max) dir.lerp(restW, 1 - max / ang).normalize();
      bone.quaternion.setFromUnitVectors(f.kitRest[k], dir.applyQuaternion(pq.invert())); bone.updateMatrixWorld(true);
    }
    // the helmet is rigid to the head. (It used to trail the head on an under-damped spring clamped at 2.6 degrees: on
    // every glance it pegged at the clamp and slid against the head, then rang back, 45 reversals in 4 s of walking.
    // Abram saw it as the helmet jostling; a rigid helmet reads right at 6 m and costs nothing.)
    const hb = b.helmet;
    hb.position.copy(f.F.bind.helmet).sub(f.F.bind[MB('Head')]); hb.quaternion.identity(); hb.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- the radio: whip antenna, handset, cord
  const antPts = [], cordPts = []; for (let i = 0; i <= 24; i++) { antPts.push(V(0, 0, 0)); cordPts.push(V(0, 0, 0)); }
  const HANDSET_HOOK = new THREE.Matrix4().compose(V(0.13, 0.055, 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0.2)), V(1, 1, 1));
  const HANDSET_IN_HAND = { Right: new THREE.Matrix4().compose(V(0.02, -0.06, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0)), V(1, 1, 1)), Left: new THREE.Matrix4().compose(V(-0.02, -0.06, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0)), V(1, 1, 1)) };
  function radio(f, dt, t, w, kitOn) {
    const b = f.b, F = f.F, mesh = F.mesh, chest = b[MB('Spine2')];
    mesh.updateMatrixWorld(true);
    const inv = _m2.copy(mesh.matrixWorld).invert();
    const chestM = new THREE.Matrix4().multiplyMatrices(inv, chest.matrixWorld); // chest in figure space
    // handset: in whichever hand is at the head (Talking On Phone), else hooked on the left strap
    const head = wpos(b[MB('Head')], V(0, 0, 0));
    let best = null, bd = 1e9;
    for (const s of ['Right', 'Left']) { const d = wpos(b[MB(s + 'Hand')], V(0, 0, 0)).distanceTo(head) / f.scale; if (d < bd) { bd = d; best = s; } }
    let want = bd < 0.3 && w.two < 0.5 ? 1 : 0;
    // the handset lent to an officer on the net (f.lendTo: an officer figure or a list): when one of them stands within
    // 3 m with a hand at his ear (Talking On Phone), the handset is in that hand and the cord runs back to this radio
    // (integration). Officers further off keep the bare hand-to-ear gesture.
    let lendF = null, lendSide = 'Right';
    if (!want && f.lendTo) {
      for (const o of (Array.isArray(f.lendTo) ? f.lendTo : [f.lendTo])) {
        if (!o || !o.F || !o.F.root.visible || o.F.root.scale.x < 0.05) continue;
        if (Math.hypot(o.F.root.position.x - F.root.position.x, o.F.root.position.z - F.root.position.z) > 3) continue;
        const oh = wpos(o.b[MB('Head')], V(0, 0, 0));
        for (const sd of ['Right', 'Left']) { const d = wpos(o.b[MB(sd + 'Hand')], V(0, 0, 0)).distanceTo(oh) / o.scale; if (d < 0.3) { lendF = o; lendSide = sd; } }
        if (lendF) break;
      }
      if (lendF) want = 1;
    }
    f.handset += (want - f.handset) * Math.min(1, dt * 4);
    if (want && !lendF) { f.handSide = best; f.lendNow = null; }
    if (lendF) { f.lendNow = lendF; f.handSide = lendSide; }
    const holder = f.lendNow || f;
    const hookW = new THREE.Matrix4().multiplyMatrices(chest.matrixWorld, HANDSET_HOOK);
    const handW = new THREE.Matrix4().multiplyMatrices(holder.b[MB((f.handSide || 'Right') + 'Hand')].matrixWorld, HANDSET_IN_HAND[f.handSide || 'Right']);
    if (!want && f.handset < 0.02) f.lendNow = null;
    const p1 = V(0, 0, 0), q1 = new THREE.Quaternion(), p2 = V(0, 0, 0), q2 = new THREE.Quaternion(), s1 = V(0, 0, 0);
    hookW.decompose(p1, q1, s1); handW.decompose(p2, q2, _v4);
    const hk = smooth(0, 1, f.handset);
    if (f.lendNow) {
      // lent across a gap: no flight through the air; it shrinks off the hook and grows in the officer's hand
      const sc = Math.abs(2 * hk - 1);
      setProp(f, b.handset, new THREE.Matrix4().compose(hk < 0.5 ? p1 : p2, hk < 0.5 ? q1 : q2, s1.multiplyScalar(Math.max(0.001, sc))));
    } else setProp(f, b.handset, new THREE.Matrix4().compose(p1.lerp(p2, hk), q1.slerp(q2, hk), s1));
    // the whip: a spring at its tip follows the base's motion, and the whip bends along a curve from base to tip
    const base = F.antBase.clone().sub(F.bind[MB('Spine2')]).applyMatrix4(chestM);
    const upv = V(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(chestM));
    const L = F.antLen, restTip = base.clone().addScaledVector(upv, L).add(V(0.05 * L, 0, -0.12 * L));
    let tip = restTip;
    if (kitOn) { tip = vSpring(f.ant, restTip, 22, 2.2, dt).clone(); tip.x += 0.02 * Math.sin(t * 1.3); }
    else f.ant.init = false;
    // keep the length: the tip lies on the sphere of radius L round the base
    const dirT = tip.clone().sub(base); const lenT = dirT.length(); dirT.multiplyScalar(1 / Math.max(1e-6, lenT));
    const n1 = F.antN;
    for (let i = 0; i <= n1; i++) {
      const u = i / n1;
      // a quadratic from the base, leaving along the chest's up, arriving toward the sprung tip
      const straight = base.clone().addScaledVector(upv, u * L * 0.98), bent = base.clone().addScaledVector(dirT, u * L * 0.98);
      antPts[i].copy(straight).lerp(bent, u * (2 - u) * 0.9 + 0.1 * u);
    }
    for (let i = 0; i < n1; i++) seg(b['a' + i], antPts[i], antPts[i + 1]);
    // the cord sags from the radio's side to the foot of the handset
    const from = F.cordFrom.clone().sub(F.bind[MB('Spine2')]).applyMatrix4(chestM), hs = b.handset;
    const to = V(0, -0.095, 0).applyQuaternion(hs.quaternion).multiply(hs.scale).add(hs.position);
    const nc = F.cordN;
    for (let i = 0; i <= nc; i++) { const u = i / nc; cordPts[i].copy(from).lerp(to, u); cordPts[i].y -= 0.14 * Math.sin(Math.PI * u); cordPts[i].z += 0.06 * Math.sin(Math.PI * u); }
    for (let i = 0; i < nc; i++) seg(b['c' + i], cordPts[i], cordPts[i + 1]);
  }
  const segD = V(0, 0, 0);
  function seg(bone, a, c) { segD.subVectors(c, a); const len = segD.length(); bone.position.copy(a); bone.quaternion.setFromUnitVectors(UP, segD.multiplyScalar(1 / (len || 1))); bone.scale.set(1, len, 1); bone.updateMatrixWorld(true); }

  // ---------------------------------------------------------------- 3. look: gaze, head follow, nod
  function look(f, dt, t) {
    const b = f.b, Lk = f.look, r = f.rng, mv = f.mv;
    const walking = f.speed > 0.3;
    if (t >= Lk.next) { // a new fixation
      const fx = mv.fix, dur = fx[0] + r() * (fx[1] - fx[0]), sc = mv.scan;
      const roll = r();
      if (roll < 0.2) { /* hold where he is looking */ }
      else if (walking && roll < 0.32) { Lk.ty = (r() - 0.5) * 0.2; Lk.tp = -0.4 - r() * 0.15; } // the footing
      else if (walking) { Lk.ty = (r() < 0.7 ? 0.05 + r() * 0.65 : -0.1 - r() * 0.4) * sc; Lk.tp = 0.02 + r() * 0.08; }
      else { Lk.ty = (-0.7 + r() * 1.6) * sc; Lk.tp = -0.06 + r() * 0.16; }
      if (Math.abs(Lk.ty - Lk.gy) > 0.35 && r() < 0.6) f.blink.next = Math.min(f.blink.next, t + 0.03); // a blink rides on a big turn
      Lk.next = t + dur;
      // small corrective saccades inside a fixation
      Lk.micro = t + 0.3 + r() * Math.max(0.2, dur - 0.4);
    }
    if (Lk.micro && t >= Lk.micro) { Lk.ty += (r() - 0.5) * 0.06; Lk.tp += (r() - 0.5) * 0.04; Lk.micro = 0; }
    const sa = 1 - Math.exp(-dt / 0.035); Lk.gy += (Lk.ty - Lk.gy) * sa; Lk.gp += (Lk.tp - Lk.gp) * sa; // saccade
    Lk.buf.push([t, Lk.gy, Lk.gp]); while (Lk.buf.length > 2 && Lk.buf[1][0] <= t - 0.12) Lk.buf.shift();
    const hyT = Lk.buf[0][1] * 0.8, hpT = Lk.buf[0][2] * 0.65 + mv.headDown, ww = 6.5; // the head takes most of the turn, 120 ms behind the eyes
    Lk.vy += (ww * ww * (hyT - Lk.hy) - 2 * ww * Lk.vy) * dt; Lk.hy += Lk.vy * dt;
    Lk.vp += (ww * ww * (hpT - Lk.hp) - 2 * ww * Lk.vp) * dt; Lk.hp += Lk.vp * dt;
    // the nod: the head's pitch springs against the neck's vertical acceleration (follow-through on each footfall)
    // (measured in the root's frame and low-passed: taken in world space, the root's small per-frame steps came through
    // the second derivative as a frame-to-frame alternation that rocked the head and helmet)
    const np = f.F.root.worldToLocal(wpos(b[MB('Neck')], V(0, 0, 0))), st = Lk.neck;
    if (!st.init) { st.p.copy(np); st.v.set(0, 0, 0); st.init = true; Lk.ay = 0; }
    const vy = (np.y - st.p.y) / Math.max(1e-4, dt), ay = (vy - st.v.y) / Math.max(1e-4, dt); st.p.copy(np); st.v.y = vy;
    Lk.ay += (clamp(ay, -12, 12) - Lk.ay) * (1 - Math.exp(-dt / 0.06));
    // the nod spring, critically damped, sub-stepped so it never alternates
    for (let s2 = 0; s2 < 4; s2++) { const h = dt / 4; Lk.nodV += (-247 * Lk.nod - 31.4 * Lk.nodV - Lk.ay * 1.6) * h; Lk.nod = clamp(Lk.nod + Lk.nodV * h, -0.05, 0.05); }
    premul(b[MB('Neck')], UP, Lk.hy * 0.4); premul(b[MB('Head')], UP, Lk.hy * 0.6);
    premul(b[MB("Neck")], RIGHT, Lk.hp * 0.35); premul(b[MB("Head")], RIGHT, Lk.hp * 0.65 + Lk.nod);
  }

  // ---------------------------------------------------------------- 8. the living face
  // Every number drifts on its own slow noise; the mood moves where it drifts around. Blinks come at random (2-7 s by mood,
  // sometimes double, and on big gaze turns); the upper lids follow the eyes' pitch; the jaw drifts and, when strained,
  // opens with the breath.
  const nz = (t, s) => (Math.sin(t * 0.71 + s) * 0.5 + Math.sin(t * 1.37 + s * 1.7) * 0.3 + Math.sin(t * 2.63 + s * 2.9) * 0.2);
  function face(f, dt, t, on) {
    const F = f.F, j = F.j, R = F.R, bd = F.bind, mv = f.mv, s0 = f.face.seed;
    const ex = f.face.ex;
    if (on) {
      ex.browUp = mv.browUp + 0.014 * nz(t * 0.45, s0) + 0.006 * nz(t * 1.9, s0 + 3);
      ex.browTilt = mv.browTilt + 0.05 * nz(t * 0.3, s0 + 5);
      ex.browIn = mv.browIn + 0.008 * nz(t * 0.38, s0 + 7);
      ex.mcUp = mv.mcUp + 0.008 * nz(t * 0.27, s0 + 11);
      ex.mcOut = 0.006 * nz(t * 0.33, s0 + 13);
      ex.jaw = Math.max(0, mv.jaw + 0.008 * nz(t * 0.5, s0 + 17) + (f.mood === 'strained' ? 0.025 * f.breath : 0.004 * f.breath));
      ex.lid = mv.lid + 0.05 * nz(t * 0.6, s0 + 19);
    } else Object.assign(ex, { browUp: 0, browTilt: 0, browIn: 0, mcUp: 0, mcOut: 0, jaw: 0, lid: 0.25 });
    // blinks
    const B = f.blink, r = f.rng;
    if (on && t >= B.next) { B.at = t; const dbl = !B.dbl && r() < 0.16; B.dbl = dbl; B.next = t + (dbl ? 0.3 + r() * 0.1 : mv.blink[0] + r() * (mv.blink[1] - mv.blink[0])); }
    const bt = t - B.at, blink = !on || bt < 0 ? 0 : bt < 0.08 ? Math.pow(bt / 0.08, 1.5) : bt < 0.26 ? 1 - Math.pow((bt - 0.08) / 0.18, 0.8) : 0;
    const gy = f.look.gy - f.look.hy, gp = f.look.gp - f.look.hp;
    const ey = clamp(gy, -0.45, 0.45), ep = clamp(gp, -0.3, 0.3);
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const br = j['brow' + side];
      br.position.copy(bd['brow' + side]).sub(bd[MX + 'Head']);
      br.position.x -= s * ex.browIn * R; br.position.y += ex.browUp * R;
      br.rotation.set(0, 0, -s * ex.browTilt);
      const mc = j['mc' + side];
      mc.position.copy(bd['mc' + side]).sub(bd[MX + 'Head']);
      mc.position.x += s * ex.mcOut * R; mc.position.y += ex.mcUp * R;
      // the upper lid: its resting opening, following the eye's pitch, then the blink
      const lid = -0.5 + 1.1 * ex.lid - ep * 0.6;
      j['lid' + side].rotation.set(lid + (1.5 - lid) * blink, 0, 0);
      j['eye' + side].rotation.set(-ep, ey, 0);
    }
    j.jaw.rotation.set(ex.jaw, 0, 0);
  }
})();
