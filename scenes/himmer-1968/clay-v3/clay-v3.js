// clay-v3.js: the clay v2 Marine (style-study/clay-v2.js) on a Mixamo-compatible skeleton. The geometry is v2's, forked;
// what changed is the rig: the bones carry the Mixamo X Bot names and parent order (mixamorigHips ... mixamorigLeftToe_End,
// as three.js names them after FBXLoader drops the colon), placed at the clay body's own joints with an identity bind
// rotation, so retargeted clips map rotations, not positions. Extra bones hang off that tree for the face (jaw, lids,
// eyes, brows, mouth corners), the helmet, canteens, pouches and aid bags (so the motion layer can swing them), and the
// props (rifle, map, handset, whip antenna, handset cord) sit at the top level. Weights: rigid everywhere except the
// torso (spread up the spine), shoulders, elbows, hips, knees, ankles, toes and neck. One mesh, one material per figure.
// V3.build(spec) builds one figure; V3.make(seed, role) picks a spec from a seed. Everything on window.V3.
(function () {
  'use strict';
  const FK = window.FK, G = FK.G, M = FK.M, V = FK.V, TAU = Math.PI * 2, smooth = FK.smooth, clamp = FK.clamp;
  const V2 = (window.V3 = {});
  const sm = (a, b, x) => smooth((x - a) / (b - a));
  const gs = (u, v) => Math.exp(-(u * u + v * v));
  let Q = 1; // quality: 1 = hero, about 0.36 = the 6k level of detail
  let BW = 1; // build: girth of the vest, trousers and sleeves (0.94 slight .. 1.08 heavy)
  const n = (k, min) => Math.max(min || 3, Math.round(k * Q));
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const rgb = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const noise = FK.noise;

  // ---------------------------------------------------------------- palette (sRGB, picked by eye against the refs)
  const C = {
    util: 0x6c7045, utilDark: 0x565a36, utilLight: 0x7c8050, utilCapt: 0x667045,
    flak: 0x5a5f3a, flakDark: 0x474b2d, flakLight: 0x686e44,
    web: 0x77744d, webDark: 0x5e5b3c, canteen: 0x6c6a46, metal: 0x3b3d38, black: 0x2b2a27,
    cover: 0x7e8c4c, coverDark: 0x4e5f2f, coverBrown: 0x6f5b38, coverLight: 0x9ea464, band: 0x3c3b2a, bottle: 0xa9a785,
    leather: 0x2f2a26, canvas: 0x5d6240, sole: 0x262320, rifle: 0x30312d, rifleMetal: 0x3d3f3a,
    radio: 0x56603b, radioDark: 0x434b2e, handset: 0x2c2c29, map: 0xe6dab6, mapInk: 0x8a9a5e, mapCase: 0x9aa070,
    holster: 0x5a3d27, eyeWhite: 0xe6dfd2, pupil: 0x120c08, mouth: 0x2e1712, teeth: 0xd3c9b6, watch: 0x2a2826,
    nvaUtil: 0x6f7048, nvaDark: 0x5a5b39, nvaRig: 0x8b8258, nvaRigDark: 0x6e6644, nvaHelm: 0x56603f, net: 0x38352a,
    nvaCanvas: 0x8a8660, wood: 0x7a4a2a, woodDark: 0x5e3820,
  };

  // ---------------------------------------------------------------- the faces: one head rig, five sets of numbers
  // Units are head radii. jawW: jaw width at the chin (0.7 narrow .. 0.95 square). faceLen: extra length below the
  // eyes. cheek, brow, chin, jawAngle: how far those planes stand out. nose*: width, length, projection, bridge bump.
  // temple: how low the hair at the temples comes (higher = shorter). stubble: 0..1.
  const FACES = [
    { name: 'Face 1', note: 'fair, sunburnt, straight nose', skin: 0xe6b28c, blush: 0xdc8a70, lipCol: 0xbf7564, hair: 0x6a492d, browCol: 0x5b3d26, iris: 0x46627e,
      jawW: 0.87, jawAngle: 0.05, chin: 0.06, faceLen: 0.03, cheek: 0.03, brow: 0.06, socket: 0.07, eyeX: 0.32, eyeY: 0.09, noseW: 0.21, noseLen: 1.0, noseProj: 0.24, bump: 0.0,
      earS: 1.0, lip: 0.8, mouthW: 0.2, stubble: 0.25, temple: 0.0, browThick: 1.0, freckles: 0 },
    { name: 'Face 2', note: 'square jaw, olive skin, broad nose', skin: 0xc58c66, blush: 0xb8735a, lipCol: 0x9c5e4c, hair: 0x241911, browCol: 0x231811, iris: 0x3b2616,
      jawW: 0.97, jawAngle: 0.08, chin: 0.075, faceLen: 0.0, cheek: 0.04, brow: 0.09, socket: 0.08, eyeX: 0.315, eyeY: 0.08, noseW: 0.28, noseLen: 0.92, noseProj: 0.21, bump: 0.0,
      earS: 0.95, lip: 0.9, mouthW: 0.22, stubble: 0.6, temple: -0.12, browThick: 1.3, freckles: 0 },
    { name: 'Face 3', note: 'long face, freckled, red hair', skin: 0xebbb96, blush: 0xdc8c72, lipCol: 0xc98270, hair: 0x9a4f2a, browCol: 0x8a4a28, iris: 0x5d7a5a,
      jawW: 0.78, jawAngle: 0.03, chin: 0.09, faceLen: 0.13, cheek: 0.03, brow: 0.055, socket: 0.075, eyeX: 0.305, eyeY: 0.10, noseW: 0.19, noseLen: 1.14, noseProj: 0.27, bump: 0.03,
      earS: 1.16, lip: 0.6, mouthW: 0.19, stubble: 0.1, temple: 0.08, browThick: 0.85, freckles: 1 },
    { name: 'Face 4', note: 'deep brown skin, round jaw, full lips', skin: 0x7c4c33, blush: 0x7a4430, lipCol: 0x5e3227, hair: 0x18110d, browCol: 0x150f0b, iris: 0x2a1a10,
      jawW: 0.9, jawAngle: 0.05, chin: 0.065, faceLen: 0.04, cheek: 0.05, brow: 0.065, socket: 0.07, eyeX: 0.325, eyeY: 0.09, noseW: 0.31, noseLen: 0.95, noseProj: 0.2, bump: 0.0,
      earS: 1.0, lip: 1.35, mouthW: 0.22, stubble: 0.15, temple: -0.05, browThick: 1.1, freckles: 0 },
    { name: 'NVA', note: 'the NVA soldier', skin: 0xcb9b72, blush: 0xc4846a, lipCol: 0xa8705c, hair: 0x15110e, browCol: 0x16110d, iris: 0x24160e,
      jawW: 0.88, jawAngle: 0.04, chin: 0.05, faceLen: 0.01, cheek: 0.065, brow: 0.035, socket: 0.05, eyeX: 0.325, eyeY: 0.085, noseW: 0.25, noseLen: 0.9, noseProj: 0.17, bump: 0.0,
      earS: 0.95, lip: 0.85, mouthW: 0.2, stubble: 0.0, temple: -0.08, browThick: 0.95, freckles: 0 },
  ];
  V2.FACES = FACES;
  // expressions, in head radii and radians: brows up, inner ends up (worry), drawn in; upper lid closed 0..1;
  // mouth corners up and out; jaw open
  const EXPR = {
    steady: { browUp: -0.012, browTilt: 0.02, browIn: 0.012, lid: 0.34, mcUp: -0.014, mcOut: 0.0, jaw: 0.0 },
    strained: { browUp: 0.006, browTilt: 0.22, browIn: 0.035, lid: 0.22, mcUp: -0.034, mcOut: 0.028, jaw: 0.012 },
    calm: { browUp: 0.012, browTilt: 0.05, browIn: -0.006, lid: 0.4, mcUp: 0.008, mcOut: -0.004, jaw: 0.0 },
    alert: { browUp: 0.04, browTilt: -0.01, browIn: 0.006, lid: 0.08, mcUp: -0.008, mcOut: -0.012, jaw: 0.022 },
  };
  V2.EXPR = EXPR;
  // skin tones for the variants: skin, blush, lips (a face's shape and its tone are picked separately)
  V2.SKINS = [
    [0xe6b28c, 0xdc8a70, 0xbf7564], [0xebbb96, 0xdc8c72, 0xc98270], [0xd9a17a, 0xcf8164, 0xb06c58], [0xc58c66, 0xb8735a, 0x9c5e4c],
    [0xa8704e, 0x9c5e44, 0x7e4a3a], [0x7c4c33, 0x7a4430, 0x5e3227], [0x5e3a28, 0x5c3426, 0x472820],
  ];
  V2.HAIR = [0x6a492d, 0x241911, 0x9a4f2a, 0x18110d, 0x4a3420, 0x8a6a40];

  // ---------------------------------------------------------------- geometry helpers
  // A ring body: profile [[r, y], ...] bottom to top, turned round Y (a = 0 faces +z). o.sx/o.sz squash the section,
  // o.disp(a, y, i, k) adds to the radius, o.color(a, y, x, z, d) gives a colour. Ends with r = 0 are single poles.
  function ring(profile, seg, o) {
    o = o || {};
    const sx = o.sx || 1, sz = o.sz || 1, pos = [], col = [], idx = [], rows = [];
    for (let i = 0; i < profile.length; i++) {
      const [r, y] = profile[i], row = [];
      if (r < 1e-4) {
        row.pole = true; row.push(pos.length / 3); pos.push(0, y, 0);
        if (o.color) col.push(...o.color(0, y, 0, 0, 0, i));
      } else for (let k = 0; k < seg; k++) {
        const a = (k / seg) * TAU + (o.a0 || 0);
        const d = o.disp ? o.disp(a, y, i, k) : 0, rr = r + d;
        const x = Math.sin(a) * rr * sx, z = Math.cos(a) * rr * sz;
        row.push(pos.length / 3); pos.push(x, y, z);
        if (o.color) col.push(...o.color(a, y, x, z, d, i));
      }
      rows.push(row);
    }
    for (let i = 0; i < rows.length - 1; i++) {
      const A = rows[i], B = rows[i + 1];
      for (let k = 0; k < seg; k++) {
        const k2 = (k + 1) % seg;
        if (A.pole) idx.push(A[0], B[k2], B[k]);
        else if (B.pole) idx.push(A[k], A[k2], B[0]);
        else idx.push(A[k], A[k2], B[k2], A[k], B[k2], B[k]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (o.color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // keep the winding outward whichever way the profile ran
    const p = g.attributes.position, nn = g.attributes.normal;
    let s = 0;
    for (let i = 0; i < p.count; i++) s += p.getX(i) * nn.getX(i) + p.getZ(i) * nn.getZ(i);
    if (s < 0) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.computeVertexNormals(); }
    return g;
  }
  V2.ring = ring;
  // A tube along points: sec(t) -> [rw, rh] (rh along the up hint), sides round. up(t, p) -> Vector3 hint.
  function tube(pts, sec, sides, up, color) {
    const pos = [], col = [], idx = [], T = V(0, 0, 0), U = V(0, 0, 0), W = V(0, 0, 0);
    const last = pts.length - 1;
    for (let i = 0; i <= last; i++) {
      T.subVectors(pts[Math.min(i + 1, last)], pts[Math.max(i - 1, 0)]).normalize();
      const t = i / last, h = up ? up(t, pts[i]) : V(0, 1, 0);
      U.copy(h).addScaledVector(T, -h.dot(T)).normalize();
      W.crossVectors(T, U).normalize();
      const [rw, rh] = sec(t);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * TAU;
        const p = pts[i].clone().addScaledVector(W, Math.cos(a) * rw).addScaledVector(U, Math.sin(a) * rh);
        pos.push(p.x, p.y, p.z);
        if (color) col.push(...color(t, a, p));
      }
    }
    for (let i = 0; i < last; i++) for (let k = 0; k < sides; k++) {
      const a = i * sides + k, b = i * sides + ((k + 1) % sides), c = a + sides, d = b + sides;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  V2.tube = tube;
  const rb = (w, h, d, r, seg) => G.rbox(w, h, d, r, seg === undefined ? (Q > 0.6 && Math.max(w, h, d) > 0.13 ? 2 : 1) : seg);
  const along = FK.along;
  const capA = (a, b, r1, r2, seg) => along((L) => G.capsule(r1, r2, L + r1 + r2, seg || n(10), Q > 0.6 && r1 > 0.02 ? 3 : 2).translate(0, -r1, 0), V(...a), V(...b));

  // ---------------------------------------------------------------- the builder: pieces in bind space, one per joint
  function Bld() { this.pieces = []; }
  // color: hex, fn(x, y, z, i) -> hex | [r, g, b] (sRGB), or null to use the geometry's own colour attribute.
  // opt: { j: joint, blend: [jointA, jointB, yTop, yBot] (A above yTop, B below yBot), soft: true (face weights),
  //        occ: occluder for ambient occlusion (default: by size), ao: false, shade: false, tag: per-vertex tags }
  Bld.prototype.add = function (joint, geo, color, matrix, opt) {
    opt = opt || {};
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, cnt = p.count, col = new Float32Array(cnt * 3);
    const own = g.attributes.color;
    for (let i = 0; i < cnt; i++) {
      let c;
      if (color === null || color === undefined) c = [own.getX(i), own.getY(i), own.getZ(i)];
      else if (typeof color === 'number') c = rgb(color);
      else if (Array.isArray(color)) c = color;
      else { c = color(p.getX(i), p.getY(i), p.getZ(i), i); if (typeof c === 'number') c = rgb(c); }
      col[i * 3] = s2l(c[0]); col[i * 3 + 1] = s2l(c[1]); col[i * 3 + 2] = s2l(c[2]);
    }
    g.computeBoundingBox();
    const bb = g.boundingBox, sz = V(0, 0, 0); bb.getSize(sz);
    let occ = opt.occ;
    if (occ === undefined) occ = sz.x * sz.y * sz.z > 0.0006 ? { p: 2.4 } : null;
    if (occ) { occ.c = occ.c || bb.getCenter(V(0, 0, 0)); occ.h = occ.h || sz.clone().multiplyScalar(0.5); occ.p = occ.p || 2.4; }
    V2.stats && V2.stats.push([joint, (opt.label || '') , cnt / 3, new Error().stack.split('\n')[2].trim().slice(3, 60)]);
    this.pieces.push({ joint, pos: p.array, nor: g.attributes.normal.array, col, opt, occ });
    return this;
  };

  // ambient occlusion from nearby pieces: a few probes off each vertex, tested against the other pieces' volumes
  function bakeAO(pieces, strength) {
    const occs = pieces.map((pc, i) => (pc.occ ? { i, c: pc.occ.c, h: pc.occ.h, p: pc.occ.p } : null)).filter(Boolean);
    const probes = [[0, 0.025], [0, 0.06], [1, 0.04], [2, 0.04]];
    for (let pi = 0; pi < pieces.length; pi++) {
      const pc = pieces[pi];
      if (pc.opt.ao === false) continue;
      const P = pc.pos, N = pc.nor, Cc = pc.col, cnt = P.length / 3;
      const near = occs.filter((o) => o.i !== pi);
      for (let v = 0; v < cnt; v++) {
        const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
        const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
        let occ = 0;
        for (const [kind, d] of probes) {
          let dx = nx, dy = ny, dz = nz;
          if (kind === 1) { dy += 0.9; } else if (kind === 2) { dy -= 0.6; }
          const l = Math.hypot(dx, dy, dz) || 1;
          const sx = x + (dx / l) * d, sy = y + (dy / l) * d, sz = z + (dz / l) * d;
          let o = 0;
          for (const q of near) {
            const ux = Math.abs(sx - q.c.x) / q.h.x, uy = Math.abs(sy - q.c.y) / q.h.y, uz = Math.abs(sz - q.c.z) / q.h.z;
            if (ux > 1 || uy > 1 || uz > 1) continue;
            const s = Math.pow(ux, q.p) + Math.pow(uy, q.p) + Math.pow(uz, q.p);
            if (s < 1) { o = Math.max(o, Math.min(1, (1 - s) * 2.5)); if (o >= 1) break; }
          }
          occ += o * (kind === 0 && d < 0.03 ? 1.2 : 1);
        }
        const k = 1 - strength * Math.min(1, occ / 3.2);
        Cc[v * 3] *= k; Cc[v * 3 + 1] *= k; Cc[v * 3 + 2] *= k;
      }
    }
  }

  // ---------------------------------------------------------------- the skeleton
  // Builder joint names (short, as v2 used them) -> the Mixamo bone each one skins to.
  const MX = 'mixamorig';
  const NM = { chest: MX + 'Spine2', pelvis: MX + 'Hips', head: MX + 'Head', neck: MX + 'Neck', sp0: MX + 'Spine', sp1: MX + 'Spine1', sp2: MX + 'Spine2' };
  for (const [s, S] of [['L', 'Left'], ['R', 'Right']]) Object.assign(NM, {
    ['cl' + s]: MX + S + 'Shoulder', ['ua' + s]: MX + S + 'Arm', ['fa' + s]: MX + S + 'ForeArm', ['hd' + s]: MX + S + 'Hand',
    ['th' + s]: MX + S + 'UpLeg', ['sh' + s]: MX + S + 'Leg', ['ft' + s]: MX + S + 'Foot', ['toe' + s]: MX + S + 'ToeBase',
  });
  const nm = (j) => NM[j] || j;
  V2.NM = NM;
  // Torso weights: the vest and everything on it bend up the spine, joint heights as in the bone list below.
  const SPINE_Y = [['pelvis', 0.775], ['sp0', 0.86], ['sp1', 0.96], ['sp2', 1.075]];
  function torsoW(x, y, z) {
    const out = [];
    for (let i = 0; i < SPINE_Y.length; i++) {
      const [j, c] = SPINE_Y[i], lo = i ? SPINE_Y[i - 1][1] : -9, hi = i < SPINE_Y.length - 1 ? SPINE_Y[i + 1][1] : 9;
      const w = y <= c ? (i ? sm(lo, c, y) : 1) : (i < SPINE_Y.length - 1 ? 1 - sm(c, hi, y) : 1);
      if (w > 1e-3) out.push(j, w);
    }
    // the armholes ride a little on the shoulder (clavicle) bones
    const ax = Math.abs(x), wc = 0.55 * sm(0.13, 0.22, ax) * sm(1.1, 1.22, y);
    if (wc > 1e-3) { for (let k = 1; k < out.length; k += 2) out[k] *= 1 - wc; out.push(x > 0 ? 'clL' : 'clR', wc); }
    return out;
  }
  V2.torsoW = torsoW;

  // Bake every piece into one skinned mesh. bones: [{ name, parent, pos (bind, figure space) }]
  // Weights per piece: opt.w(x, y, z, v) -> [joint, w, ...]; opt.blend [a, b, yTop, yBot]; opt.soft (the face);
  // pc.weights (three-way legs); joint 'chest' = torso weights unless opt.rigid; otherwise rigid to the joint.
  function assemble(bld, bones, mat, weightFns) {
    const index = {};
    bones.forEach((b, i) => (index[b.name] = i));
    const id = (j) => { const k = index[nm(j)]; if (k === undefined) throw new Error('no bone for joint ' + j); return k; };
    bakeAO(bld.pieces, 0.5);
    let total = 0;
    for (const pc of bld.pieces) total += pc.pos.length / 3;
    const P = new Float32Array(total * 3), N = new Float32Array(total * 3), Cc = new Float32Array(total * 3);
    const SI = new Uint16Array(total * 4), SW = new Float32Array(total * 4);
    let o = 0;
    const put = (w, list) => {
      // keep the four largest, normalised
      const pairs = []; for (let k = 0; k < list.length; k += 2) if (list[k + 1] > 1e-4) pairs.push([list[k], list[k + 1]]);
      pairs.sort((a, b) => b[1] - a[1]); pairs.length = Math.min(4, pairs.length);
      let sum = 0; for (const p of pairs) sum += p[1];
      for (let k = 0; k < 4; k++) { if (k < pairs.length) { SI[w + k] = id(pairs[k][0]); SW[w + k] = pairs[k][1] / sum; } else { SI[w + k] = 0; SW[w + k] = 0; } }
    };
    for (const pc of bld.pieces) {
      const cnt = pc.pos.length / 3, opt = pc.opt;
      // a soft darkening toward the feet (the ground bounce is weaker low down)
      if (opt.shade !== false) for (let v = 0; v < cnt; v++) { const k = 0.8 + 0.2 * smooth(pc.pos[v * 3 + 1] / 0.9); pc.col[v * 3] *= k; pc.col[v * 3 + 1] *= k; pc.col[v * 3 + 2] *= k; }
      P.set(pc.pos, o * 3); N.set(pc.nor, o * 3); Cc.set(pc.col, o * 3);
      for (let v = 0; v < cnt; v++) {
        const w = (o + v) * 4;
        const x = pc.pos[v * 3], y = pc.pos[v * 3 + 1], z = pc.pos[v * 3 + 2];
        if (pc.weights) put(w, [pc.wjoints[0], pc.weights[v * 4], pc.wjoints[1], pc.weights[v * 4 + 1], pc.wjoints[2], pc.weights[v * 4 + 2]]);
        else if (opt.w) put(w, opt.w(x, y, z, v));
        else if (opt.blend) { const [a, b, y0, y1] = opt.blend, wb = sm(y0, y1, y); put(w, [a, 1 - wb, b, wb]); }
        else if (opt.soft && weightFns.face) put(w, weightFns.face(x, y, z, opt.tag ? opt.tag[v] : 0));
        else if (pc.joint === 'chest' && !opt.rigid) put(w, torsoW(x, y, z));
        else put(w, [pc.joint === 'chest' ? 'sp2' : pc.joint, 1]);
      }
      o += cnt;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    g.computeBoundingSphere();
    const bs = [], j = {};
    for (const b of bones) {
      const bone = new THREE.Bone();
      bone.name = b.name;
      bone.position.copy(b.pos);
      if (b.parent) bone.position.sub(bones[index[b.parent]].pos);
      bs.push(bone); j[b.name] = bone;
    }
    const mesh = new THREE.SkinnedMesh(g, mat);
    for (const b of bones) if (b.parent) j[b.parent].add(j[b.name]); else mesh.add(j[b.name]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bs));
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    const rest = bs.map((b) => ({ p: b.position.clone(), q: b.quaternion.clone() }));
    return { mesh, j, bones: bs, rest, tris: Math.round(total / 3) };
  }

  // ---------------------------------------------------------------- the head
  // Direction coordinates: a unit sphere facing +z; (dx, dy) is where on the face. sculpt() turns a direction into
  // the head's surface, in head radii. Everything on the face (eyes, brows, mouth, nose) is placed through it.
  const DYM = -0.5; // the mouth line
  function sculpt(P, dx, dy, dz) {
    const s = dx < 0 ? -1 : 1, ax = Math.abs(dx);
    const front = sm(0.1, 0.62, dz), back = Math.max(0, -dz), lower = sm(-0.02, -0.95, dy);
    let x = dx * 0.86, y = dy * 1.02, z = dz * 0.93;
    // the underside of the jaw is a plane, so the jaw line reads as an edge
    if (dy < -0.62) y = -0.62 * 1.02 + (dy + 0.62) * 0.55;
    // the forehead slopes back above the brow
    z -= 0.08 * front * sm(0.36, 0.85, dy);
    // a fuller, higher cranium at the back
    z -= 0.12 * back * sm(-0.55, 0.15, dy);
    y += 0.05 * back * sm(0.0, 0.6, dy);
    // the jaw narrows toward the chin; its back tucks in to the neck
    x *= 1 - (1 - P.jawW) * lower * (0.6 + 0.4 * front);
    z *= 1 - 0.32 * back * lower;
    y += dy * P.faceLen * lower;
    // a flatter face plane
    z -= 0.07 * sm(0.55, 1.0, dz);
    const mw = P.mouthW;
    // nasolabial fold: a soft groove from the nose wing to just past the mouth corner
    const t0 = clamp((dy + 0.2) / -0.36, 0, 1), fx = 0.15 + 0.11 * t0, fy = -0.2 - 0.36 * t0;
    const fold = gs((ax - fx) / 0.03, (dy - fy) / 0.08) * sm(-0.16, -0.24, dy);
    z += front * (
      -P.socket * 1.2 * gs((ax - P.eyeX) / 0.15, (dy - P.eyeY) / 0.11)
      + P.brow * gs((ax - 0.3) / 0.26, (dy - 0.27) / 0.075) + P.brow * 0.5 * gs((ax - 0.3) / 0.3, (dy - 0.34) / 0.1)
      + 0.03 * gs(dx / 0.12, (dy - 0.22) / 0.09)
      + 0.012 * gs((ax - P.eyeX) / 0.12, (dy - P.eyeY + 0.15) / 0.04)
      + P.cheek * 1.4 * gs((ax - 0.47) / 0.16, (dy + 0.08) / 0.11) - 0.025 * gs((ax - 0.5) / 0.14, (dy + 0.36) / 0.12)
      + 0.06 * gs(dx / 0.3, (dy + 0.42) / 0.2)
      + 0.032 * gs(dx / (mw * 0.85), (dy - DYM - 0.04) / 0.035)
      + P.lip * 0.034 * gs(dx / (mw * 0.75), (dy - DYM + 0.055) / 0.04)
      - 0.03 * gs(dx / (mw * 1.05), (dy - DYM) / 0.014)
      - 0.012 * gs(dx / 0.035, (dy - DYM - 0.12) / 0.05)
      - 0.022 * gs(dx / 0.2, (dy - DYM + 0.16) / 0.04)
      + P.chin * 1.3 * gs(dx / 0.24, (dy + 0.8) / 0.12) - 0.02 * gs(dx / 0.25, (dy + 0.66) / 0.05)
      - 0.016 * fold
    );
    x += s * (P.cheek * 0.8 * gs((ax - 0.55) / 0.18, (dy + 0.1) / 0.14) * front + (P.jawAngle + 0.03) * gs((ax - 0.68) / 0.18, (dy + 0.6) / 0.14) - 0.035 * gs((ax - 0.78) / 0.22, (dy - 0.32) / 0.22));
    return [x, y, z];
  }
  const dirAt = (dx, dy) => [dx, dy, Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))];
  const surf = (P, dx, dy, lift) => { const d = dirAt(dx, dy), p = sculpt(P, d[0], d[1], d[2]); if (lift) { p[0] += d[0] * lift; p[1] += d[1] * lift; p[2] += d[2] * lift; } return p; };

  function hairMask(P, dx, dy, dz) {
    const ax = Math.abs(dx);
    const burn = sm(0.78, 0.86, ax) * sm(-0.2 + P.temple * 0.4, -0.12 + P.temple * 0.4, dy) * sm(0.36, 0.24, dz) * sm(-0.3, -0.1, dz + 0.5);
    const side = Math.max(burn, sm(0.62, 0.72, ax) * sm(0.12, 0.2, dy) * sm(0.36, 0.2, dz), sm(0.7, 0.8, ax) * sm(-0.1, 0.05, dy) * sm(0.0, -0.15, dz));
    const nape = sm(-0.1, -0.35, dz) * sm(-0.62, -0.45, dy);
    const top = sm(0.4 + P.temple * 0.15, 0.48 + P.temple * 0.15, dy + 0.12 * (1 - Math.abs(dz)) - 0.06 * ax);
    return Math.max(side, nape, top);
  }

  function headGeo(P) {
    const N = n(48, 16) & ~1, Mr = n(36, 14);
    // azimuth: denser at the front
    const az = []; for (let i = 0; i < N; i++) { const s = -1 + (2 * i) / N; az.push(Math.PI * s * (0.32 + 0.68 * s * s)); }
    // elevation: denser at the mouth and eyes
    const eM = Math.asin(DYM), eE = Math.asin(P.eyeY);
    const dens = (e) => 0.5 + 2.4 * gs((e - eM) / 0.1, 0) + 1.3 * gs((e - eE) / 0.16, 0) + 0.7 * sm(-1.25, -0.95, e) * (1 - sm(0.45, 0.75, e));
    const cdf = [0], K = 600;
    for (let i = 1; i <= K; i++) { const e = -Math.PI / 2 + (Math.PI * (i - 0.5)) / K; cdf.push(cdf[i - 1] + dens(e)); }
    const els = [];
    for (let j = 1; j < Mr; j++) {
      const target = (cdf[K] * j) / Mr; let i = 1; while (cdf[i] < target) i++;
      els.push(-Math.PI / 2 + (Math.PI * (i - 1 + (target - cdf[i - 1]) / (cdf[i] - cdf[i - 1]))) / K);
    }
    let jm = 0; for (let j = 1; j < els.length; j++) if (Math.abs(els[j] - eM) < Math.abs(els[jm] - eM)) jm = j;
    els[jm] = eM;
    const aM = Math.asin(P.mouthW / Math.cos(eM));
    const pos = [], col = [], tags = [], dirs = [], rows = [];
    const skin = rgb(P.skin), hair = rgb(P.hair), lipc = rgb(P.lipCol), blush = rgb(P.blush);
    const stubC = mix(mul(skin, 0.78), hair, 0.35), hairC = mix(mul(hair, 0.85), mul(skin, 0.6), 0.25);
    const vert = (dx, dy, dz, tag, mouthRow) => {
      let [x, y, z] = sculpt(P, dx, dy, dz);
      const hm = hairMask(P, dx, dy, dz);
      x += dx * 0.022 * hm; y += dy * 0.022 * hm; z += dz * 0.022 * hm;
      const idx = pos.length / 3;
      pos.push(x, y, z); tags.push(tag); dirs.push(dx, dy, dz);
      // colour
      const ax = Math.abs(dx), front = sm(0.1, 0.6, dz);
      let c = skin.slice();
      c = mix(c, blush, 0.32 * gs((ax - 0.43) / 0.18, (dy + 0.1) / 0.15) * front + 0.22 * gs(dx / 0.12, (dy + 0.08) / 0.12) * front + 0.12 * sm(0.6, 0.9, ax) * sm(-0.3, 0.1, dy));
      const lipU = 0.5 * gs(dx / (P.mouthW * 0.85), (dy - DYM - 0.032) / 0.024), lipL = 0.62 * gs(dx / (P.mouthW * 0.72), (dy - DYM + 0.045) / 0.032);
      const stub = P.stubble * 0.55 * sm(-0.3, -0.42, dy) * (1 - Math.min(1, (lipU + lipL) * 2.2)) * (front * sm(-1.0, -0.75, dy) + sm(0.55, 0.7, ax) * sm(0.15, -0.2, dy) * (1 - front * 0.4));
      c = mix(c, stubC, stub);
      c = mix(c, lipc, Math.min(0.85, (lipU + lipL) * front));
      if (mouthRow) c = mix(c, rgb(0x3a1d17), 0.7 * sm(P.mouthW + 0.03, P.mouthW - 0.02, ax));
      if (P.freckles) { const h = FK.hash(Math.round(dx * 70), Math.round(dy * 70), 7); if (h > 0.7 && front > 0.5 && dy > -0.3 && dy < 0.12 && Math.abs(dx) < 0.55) c = mix(c, rgb(0xc98a64), 0.16); }
      c = mul(c, 1 - 0.07 * gs((ax - P.eyeX) / 0.17, (dy - P.eyeY) / 0.14) * front);
      c = mix(c, hairC, hm * 0.8);
      c = mul(c, 1 - 0.22 * sm(0.1, 0.42, dy) * (0.6 + 0.4 * front));
      c = mul(c, 0.97 + 0.06 * noise(dx * 9 + 3, dy * 9, dz * 9));
      col.push(...c);
      return idx;
    };
    const bottom = vert(0, -1, 0, 1, false);
    for (let j = 0; j < els.length; j++) {
      const e = els[j], ce = Math.cos(e), se = Math.sin(e), row = [], dup = [];
      for (let i = 0; i < N; i++) {
        const a = az[i];
        row.push(vert(ce * Math.sin(a), se, ce * Math.cos(a), se < DYM ? 1 : 0, j === jm));
        if (j === jm && Math.abs(a) < aM - 1e-4) dup.push(vert(ce * Math.sin(a), se, ce * Math.cos(a), 1, true)); else dup.push(row[i]);
      }
      rows.push({ row, dup });
    }
    const top = vert(0, 1, 0, 0, false);
    const idx = [];
    for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; idx.push(bottom, rows[0].row[i2], rows[0].row[i]); }
    for (let j = 0; j < rows.length - 1; j++) {
      const A = j + 1 === jm ? rows[j].row : rows[j].row, B = j + 1 === jm ? rows[j + 1].dup : rows[j + 1].row;
      for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; idx.push(A[i], A[i2], B[i2], A[i], B[i2], B[i]); }
    }
    const L = rows[rows.length - 1].row;
    for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; idx.push(L[i], L[i2], top); }
    // the lips roll in a little along the slit
    for (let i = 0; i < N; i++) for (const v of [rows[jm].row[i], rows[jm].dup[i]]) {
      const dx = dirs[v * 3], k = sm(P.mouthW + 0.03, P.mouthW - 0.03, Math.abs(dx));
      pos[v * 3 + 2] -= 0.012 * k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const ni = g.toNonIndexed(), tg = new Float32Array(idx.length);
    for (let k = 0; k < idx.length; k++) tg[k] = tags[idx[k]];
    return { geo: ni, tags: tg };
  }

  function noseGeo(P) {
    const g = G.sph(1, 1, 1, n(18, 8), n(14, 6)), p = g.attributes.position, col = [];
    const skin = rgb(P.skin), blush = rgb(P.blush), dark = mix(mul(skin, 0.45), rgb(0x3a1d17), 0.4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (1 - y) / 2; // t: 0 at the bridge, 1 under the tip
      const wing = gs((t - 0.82) / 0.12, 0) * Math.max(0, 1 - Math.abs(z) * 0.4);
      const hw = P.noseW * (0.3 + 0.55 * Math.pow(t, 1.4)) * (1 + 0.35 * wing * Math.abs(x));
      const pr = P.noseProj * (0.3 + 0.7 * Math.pow(Math.min(1, t / 0.85), 1.1)) + P.bump * gs((t - 0.35) / 0.1, 0);
      let ny = y * 0.22 * P.noseLen, nz = z > 0 ? z * pr : z * 0.04;
      if (t > 0.85) { ny = Math.max(ny, -0.22 * P.noseLen * 0.86); nz *= 0.85; }
      p.setXYZ(i, x * hw, ny, nz);
      const nost = gs((Math.abs(x) - 0.45) / 0.22, (t - 0.95) / 0.06) * (z > 0 ? 1 : 0);
      let c = mix(skin, blush, 0.35 * gs((t - 0.8) / 0.2, 0) * Math.max(0, z));
      c = mix(c, dark, Math.min(1, nost * 1.4));
      col.push(...c);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }

  function earGeo(P, s) {
    const e = P.earS, out = [];
    const base = G.sph(0.07, 0.21 * e, 0.13 * e, n(12, 6), n(10, 5)), p = base.attributes.position, col = [];
    const skin = rgb(P.skin), inner = mix(mul(skin, 0.7), rgb(P.blush), 0.4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const cup = x > 0 ? 0.05 * gs(y / (0.13 * e), (z + 0.01) / (0.075 * e)) : 0;
      p.setX(i, x - cup);
      col.push(...mix(skin, inner, Math.min(1, cup * 16)));
    }
    base.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    base.computeVertexNormals();
    out.push(base);
    const pts = [];
    for (let k = 0; k <= n(12, 6); k++) { const th = 0.15 + (k / n(12, 6)) * (Math.PI * 1.35); pts.push(V(0.035, 0.19 * e * Math.sin(th), 0.115 * e * Math.cos(th))); }
    out.push(tube(pts, (t) => [0.028 * (1 - 0.3 * t), 0.028 * (1 - 0.3 * t)], n(6, 4), () => V(1, 0, 0), () => mix(skin, rgb(P.blush), 0.15)));
    return out.map((g) => { if (s < 0) { g.scale(-1, 1, 1); const a = g.index ? g.index.array : null; if (a) for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.computeVertexNormals(); } return g; });
  }

  // M1 helmet with a Mitchell-pattern cover: folds in the cloth, the edge tucked under the rim, an elastic band
  function camo(x, y, z) {
    const a = noise(x * 7 + 3, y * 7, z * 7), b = noise(x * 5 - 7, y * 5 + 2, z * 5 + 5), c = noise(x * 13 + 1, y * 13 - 4, z * 13);
    if (a > 0.63) return C.coverDark;
    if (b > 0.68) return C.coverBrown;
    if (c < 0.3 || a < 0.24) return C.coverLight;
    return C.cover;
  }
  function helmetUS(bld, HM, band) {
    const prof = [[0, 1.37], [0.32, 1.33], [0.6, 1.23], [0.84, 1.05], [0.99, 0.82], [1.07, 0.6], [1.11, 0.42], [1.13, 0.28], [1.17, 0.18], [1.23, 0.12], [1.25, 0.085], [1.21, 0.06], [1.12, 0.09], [1.03, 0.17]];
    const rows = [];
    for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1], m = i < 3 ? n(2, 1) : 1; for (let k = 0; k < m; k++) rows.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]); }
    rows.push(prof[prof.length - 1]);
    const fold = (a, y) => (0.018 * Math.sin(a * 6 + 2.2 * noise(a * 1.3, y * 2, 1)) + 0.012 * Math.sin(a * 11 + 1 + 3 * noise(a, y * 3, 4))) * sm(1.2, 0.45, y) * sm(0.1, 0.3, y) + 0.012 * (noise(Math.cos(a) * 4, y * 5, Math.sin(a) * 4) - 0.5) + (y < 0.2 && y > 0.07 ? 0.012 * Math.sin(a * 17) : 0);
    const g = ring(rows, n(36, 14), { sz: 1.1, disp: (a, y) => fold(a, y), color: (a, y, x, z, d) => {
      let c = rgb(camo(x, y, z));
      c = mul(c, 0.86 + 4.5 * d);
      if (y < 0.13) c = mul(c, 0.8);
      return c;
    } });
    bld.add('helmet', g, null, HM, { occ: { p: 4 } });
    const bandG = ring([[1.13, 0.43], [1.15, 0.445], [1.15, 0.53], [1.13, 0.545]], n(36, 14), { sz: 1.1, disp: (a) => 0.004 * Math.sin(a * 23), color: () => rgb(C.band) });
    bld.add('helmet', bandG, null, HM, { occ: false });
    // what is tucked under the band: the insect repellent bottle, a cigarette pack, a plastic spoon, a toothbrush
    // (a list of [item, angle round the helmet]; angle 0 is the front, + toward his left)
    for (const [item, a] of band || []) {
      const ca = Math.cos(a), sa = Math.sin(a), at = (r, y, rx, ry, rz) => HM.clone().multiply(M(sa * r, y, ca * r * 1.1, rx, a, rz));
      if (item === 'bottle') {
        bld.add('helmet', G.capsule(0.075, 0.075, 0.34, n(10, 6), 2), C.bottle, at(1.16, 0.36, -0.08, 0, 0.15), { occ: false });
        bld.add('helmet', G.cyl(0.05, 0.05, 0.06, n(10, 6)), C.black, at(1.165, 0.73, -0.08, 0, 0.15), { occ: false });
      } else if (item === 'pack') bld.add('helmet', rb(0.36, 0.5, 0.1, 0.03, 1), 0xd8d0b4, at(1.18, 0.5, -0.06, 0, -0.1), { occ: false });
      else if (item === 'spoon') bld.add('helmet', rb(0.08, 0.55, 0.035, 0.015, 1), 0xe8e2d0, at(1.17, 0.55, -0.05, 0, 0.3), { occ: false });
      else if (item === 'brush') bld.add('helmet', rb(0.07, 0.62, 0.05, 0.02, 1), 0xb8463a, at(1.17, 0.55, -0.05, 0, -0.25), { occ: false });
    }
  }
  function helmetNVA(bld, HM) {
    const prof = [[0, 1.33], [0.36, 1.29], [0.66, 1.17], [0.88, 0.98], [1.02, 0.74], [1.09, 0.5], [1.11, 0.34], [1.13, 0.24], [1.18, 0.15], [1.22, 0.1], [1.21, 0.075], [1.12, 0.1], [1.05, 0.16]];
    const g = ring(prof, n(40, 14), { sz: 1.08, disp: (a, y) => 0.006 * (noise(Math.cos(a) * 3, y * 3, Math.sin(a) * 3) - 0.5), color: (a, y, x, z) => mul(rgb(C.nvaHelm), 0.92 + 0.12 * noise(x * 4, y * 4, z * 4)) });
    bld.add('helmet', g, null, HM, { occ: { p: 4 } });
    // the net: two families of helices over the dome, and a cord round the rim
    const R = (y) => { for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1]; if (y <= a[1] && y >= b[1]) return a[0] + ((b[0] - a[0]) * (a[1] - y)) / (a[1] - b[1]); } return 1.1; };
    const K = n(12, 6), segs = n(10, 5);
    for (let k = 0; k < K; k++) for (const dir of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, y = 0.2 + t * 1.08, a = (k / K) * TAU + dir * 1.25 * t, r = R(y) + 0.028;
        pts.push(V(Math.sin(a) * r, y, Math.cos(a) * r * 1.08));
      }
      bld.add('helmet', tube(pts, () => [0.016, 0.016], 3, (t, p) => p.clone().normalize(), () => rgb(C.net)), null, HM, { occ: false, ao: false });
    }
    const rim = [];
    for (let i = 0; i <= n(30, 12); i++) { const a = (i / n(30, 12)) * TAU; rim.push(V(Math.sin(a) * 1.16, 0.2, Math.cos(a) * 1.16 * 1.08)); }
    bld.add('helmet', tube(rim, () => [0.022, 0.022], 4, () => V(0, 1, 0), () => rgb(C.net)), null, HM, { occ: false, ao: false });
  }

  // Build the head into bld; returns the bind positions of the face bones and the face weight function.
  function buildHead(bld, P, HC, R, kind, band) {
    const HM = M(HC.x, HC.y, HC.z, 0, 0, 0, R, R, R);
    const toB = (p) => V(HC.x + p[0] * R, HC.y + p[1] * R, HC.z + p[2] * R);
    const hd = headGeo(P);
    bld.add('head', hd.geo, null, HM, { soft: true, tag: hd.tags, occ: { p: 2 } });
    // nose
    const nb = surf(P, 0, -0.04);
    bld.add('head', noseGeo(P), null, HM.clone().multiply(M(0, -0.03, nb[2] - 0.035)), { occ: false });
    // ears
    for (const s of [-1, 1]) { const ed = [s * 0.995, -0.03, -0.1], ep = sculpt(P, ed[0], ed[1], ed[2]); for (const g of earGeo(P, s)) bld.add('head', g, null, HM.clone().multiply(M(ep[0] - s * 0.02, ep[1], ep[2], 0.05, s * -0.22, s * -0.08)), { occ: false }); }
    // eyes: a ball with an iris cap, set in the socket
    const eyeR = 0.14, bones = {};
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const sp = surf(P, s * P.eyeX, P.eyeY), ec = [sp[0], sp[1], sp[2] - eyeR * 0.62];
      const EM = HM.clone().multiply(M(ec[0], ec[1], ec[2]));
      bones['eye' + side] = toB(ec); bones['lid' + side] = toB(ec);
      bld.add('eye' + side, G.sph(eyeR, eyeR, eyeR, n(14, 8), n(8, 5), 0, TAU, 0, Math.PI * 0.6).rotateX(Math.PI / 2), C.eyeWhite, EM, { occ: false, ao: false, shade: false });
      const iris = rgb(P.iris), irisDk = mul(iris, 0.55);
      const cap = G.sph(eyeR * 1.012, eyeR * 1.012, eyeR * 1.012, n(14, 8), n(4, 3), 0, TAU, 0, 0.52).rotateX(Math.PI / 2);
      bld.add('eye' + side, cap, (x, y, z) => {
        const lx = (x - HC.x) / R - ec[0], ly = (y - HC.y) / R - ec[1], r = Math.hypot(lx, ly) / eyeR;
        return r < 0.19 ? rgb(C.pupil) : r < 0.38 ? mul(iris, 1.1) : r < 0.46 ? iris : irisDk;
      }, EM, { occ: false, ao: false, shade: false });
      bld.add('eye' + side, G.sph(eyeR * 0.13, eyeR * 0.13, eyeR * 0.06, 6, 4), 0xfbf6ea, EM.clone().multiply(M(-eyeR * 0.22, eyeR * 0.26, eyeR * 0.99)), { occ: false, ao: false, shade: false });
      // upper lid: a shell over the top of the ball, its edge darker (the lash line)
      const lid = G.sph(eyeR * 1.13, eyeR * 1.13, eyeR * 1.13, n(14, 8), n(6, 4), -0.35, Math.PI + 0.7, 0, Math.PI / 2);
      const skin = rgb(P.skin), lidC = mix(mul(skin, 0.94), rgb(P.blush), 0.12);
      bld.add('lid' + side, lid, (x, y, z) => {
        const ly = ((y - HC.y) / R - ec[1]) / eyeR, lz = ((z - HC.z) / R - ec[2]) / eyeR;
        return ly < 0.2 && lz > 0.1 ? rgb(0x2a1c14) : ly < 0.42 && lz > 0.3 ? mul(lidC, 0.88) : lidC;
      }, EM, { occ: false, ao: false });
      // lower lid: a little roll of skin under the ball
      const low = G.torus(eyeR * 0.98, eyeR * 0.15, n(5, 3), n(10, 5), Math.PI * 0.85).rotateZ(-Math.PI / 2 - Math.PI * 0.425).rotateX(-0.75);
      bld.add('head', low, mix(skin, rgb(P.blush), 0.1), EM, { occ: false });
    }
    // brows: tapered strips lying on the brow ridge, soft-skinned so they move with the skin
    const browCol = rgb(P.browCol);
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= n(8, 4); k++) {
        const t = k / n(8, 4), dx = 0.1 + 0.4 * t, dy = P.eyeY + 0.17 + 0.035 * Math.sin(Math.PI * Math.pow(t, 0.8)) - 0.035 * t;
        pts.push(V(...surf(P, s * dx, dy, 0.012)));
      }
      const g = tube(pts, (t) => [0.042 * P.browThick * (1 - 0.5 * t) + 0.008, 0.016 * (1 - 0.3 * t)], n(6, 4), (t, p) => p.clone().normalize(), (t) => mul(browCol, 0.95 + 0.1 * t));
      bld.add('head', g, null, HM, { soft: true, occ: false, ao: false });
    }
    // inside the mouth: a dark pocket and the upper teeth, seen only when the jaw drops
    const mp = surf(P, 0, DYM);
    bld.add('head', G.sph(P.mouthW * 1.05, 0.11, 0.1, n(12, 6), n(8, 4)), C.mouth, HM.clone().multiply(M(0, DYM - 0.03, mp[2] - 0.115)), { occ: false, ao: false, shade: false });
    bld.add('head', rb(P.mouthW * 1.5, 0.05, 0.05, 0.02, 1), C.teeth, HM.clone().multiply(M(0, DYM + 0.012, mp[2] - 0.07)), { occ: false, ao: false, shade: false });
    // helmet
    const HH = HM.clone().multiply(M(0, 0.25, -0.03, kind === 'nva' ? -0.06 : -0.1, 0, 0, 0.93, 0.97, 0.93));
    if (kind === 'nva') helmetNVA(bld, HH); else helmetUS(bld, HH, band);
    bones.helmet = toB([0, 1.05, -0.03]); // the helmet's pivot: the crown of the head, where it rests
    // face bones
    const mc = (s) => toB(surf(P, s * P.mouthW, DYM));
    Object.assign(bones, {
      jaw: toB([0, -0.12, -0.2]),
      browL: toB(surf(P, 0.3, P.eyeY + 0.19, 0.01)), browR: toB(surf(P, -0.3, P.eyeY + 0.19, 0.01)),
      mcL: mc(1), mcR: mc(-1),
    });
    // soft weights for the skin and the brows: jaw below the mouth, the corners round the mouth, the brows above
    const face = (x, y, z, tag) => {
      const u = (x - HC.x) / R, v = (y - HC.y) / R, w = (z - HC.z) / R;
      const s = u < 0 ? 'R' : 'L', au = Math.abs(u), fr = sm(0.15, 0.55, w);
      const isLow = tag > 0.5 ? 1 : sm(DYM - 0.004, DYM - 0.06, v);
      let wj = isLow * (1 - sm(0.32, 0.72, au)) * sm(-0.3, 0.3, w) * sm(-1.25, -0.9, v - 0.1 * 0);
      let wc = 0.95 * gs((au - P.mouthW) / 0.11, (v - DYM) / 0.12) * fr;
      let wb = 0.95 * gs((au - 0.3) / 0.2, (v - P.eyeY - 0.2) / 0.09) * fr;
      const sum = wj + wc + wb;
      if (sum > 1) { wj /= sum; wc /= sum; wb /= sum; }
      return ['head', 1 - wj - wc - wb, 'jaw', wj, 'mc' + s, wc, 'brow' + s, wb];
    };
    return { bones, face };
  }

  // ---------------------------------------------------------------- hands with fingers
  // In bind pose the arm hangs; the palm faces the thigh (inward), fingers point down, the thumb in front. Each finger
  // is a Mixamo chain (Index1..4, Middle, Ring, Pinky, Thumb), three short rounded segments, built a little curled.
  // Returns the joint positions, by bone name.
  const FINGERS = [['Index', 0.064, 0], ['Middle', 0.068, 1], ['Ring', 0.064, 2], ['Pinky', 0.054, 3]];
  function buildHand(bld, side, W, skin) {
    const s = side === 'L' ? 1 : -1, S = side === 'L' ? 'Left' : 'Right', hd = 'hd' + side, J = {};
    const palmY = W.y - 0.045;
    bld.add(hd, rb(0.036, 0.07, 0.072, 0.016), skin, M(W.x, palmY, W.z + 0.004), { occ: false });
    const kY = W.y - 0.078, kx = W.x - s * 0.002;
    const seg = (a, b, r1, r2, bone) => bld.add(bone, capA([a.x, a.y, a.z], [b.x, b.y, b.z], r1, r2, n(6, 4)), skin, null, { occ: false });
    for (const [F, len, k] of FINGERS) {
      const a = V(kx, kY, W.z + 0.028 - k * 0.019), r = 0.0105 - k * 0.0007;
      // three phalanges curling toward the palm (-s x), shorter toward the tip
      const b = a.clone().add(V(-s * 0.004, -len * 0.45, 0)), c = b.clone().add(V(-s * len * 0.12, -len * 0.3, 0)), d = c.clone().add(V(-s * len * 0.16, -len * 0.2, 0));
      const nmF = (i) => MX + S + 'Hand' + F + i;
      seg(a, b, r, r * 0.96, nmF(1)); seg(b, c, r * 0.96, r * 0.9, nmF(2)); seg(c, d, r * 0.9, r * 0.82, nmF(3));
      J[nmF(1)] = a; J[nmF(2)] = b; J[nmF(3)] = c; J[nmF(4)] = d;
    }
    const t0 = V(W.x - s * 0.012, W.y - 0.02, W.z + 0.036), t1 = t0.clone().add(V(-s * 0.014, -0.026, 0.013)), t2 = t1.clone().add(V(-s * 0.012, -0.02, 0.004)), t3 = t2.clone().add(V(-s * 0.01, -0.016, 0));
    const nmT = (i) => MX + S + 'HandThumb' + i;
    seg(t0, t1, 0.014, 0.0125, nmT(1)); seg(t1, t2, 0.0125, 0.011, nmT(2)); seg(t2, t3, 0.011, 0.0095, nmT(3));
    J[nmT(1)] = t0; J[nmT(2)] = t1; J[nmT(3)] = t2; J[nmT(4)] = t3;
    return J;
  }

  // ---------------------------------------------------------------- props
  // M16A1 in its own frame: origin at the pistol grip's top, x toward the muzzle, y up. Real length about 0.99 m;
  // built at 0.85 like the figure's other kit. Returns grip points (for the wrists) in the same frame.
  function m16(bld, joint, m) {
    const add = (g, c, mm) => bld.add(joint, g, c, mm ? m.clone().multiply(mm) : m, { occ: false, ao: false, shade: false });
    const stock = rb(0.27, 0.07, 0.042, 0.016), p = stock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (0.135 - p.getX(i)) / 0.27; p.setY(i, p.getY(i) * (0.8 + 0.7 * k) - 0.014 * k); }
    stock.computeVertexNormals();
    add(stock, C.rifle, M(-0.23, -0.004, 0));
    add(rb(0.15, 0.058, 0.04, 0.012), C.rifle, M(-0.02, 0, 0));
    add(rb(0.21, 0.038, 0.034, 0.01), C.rifleMetal, M(0.0, 0.046, 0));
    add(rb(0.13, 0.02, 0.02, 0.007, 1), C.rifle, M(-0.01, 0.1, 0));
    add(G.box(0.02, 0.045, 0.016), C.rifle, M(-0.07, 0.074, 0));
    add(G.box(0.02, 0.04, 0.016), C.rifle, M(0.05, 0.074, 0));
    add(rb(0.034, 0.095, 0.03, 0.012), C.rifle, M(-0.055, -0.058, 0, 0, 0, 0.36));
    add(rb(0.052, 0.12, 0.026, 0.009), C.rifleMetal, M(0.04, -0.082, 0, 0, 0, -0.1));
    add(G.cyl(0.03, 0.03, 0.26, 6).rotateZ(-Math.PI / 2), C.rifle, M(0.21, 0.025, 0));
    add(G.cyl(0.034, 0.034, 0.02, 10).rotateZ(-Math.PI / 2), C.rifleMetal, M(0.085, 0.025, 0));
    add(G.box(0.022, 0.07, 0.016), C.rifle, M(0.36, 0.05, 0, 0, 0, 0.18));
    add(G.cyl(0.009, 0.009, 0.17, 8).rotateZ(-Math.PI / 2), C.rifleMetal, M(0.43, 0.025, 0));
    add(G.cyl(0.013, 0.013, 0.05, 8).rotateZ(-Math.PI / 2), C.rifleMetal, M(0.535, 0.025, 0));
    return { R: V(-0.045, 0.02, 0), L: V(0.2, 0.05, 0), handle: V(-0.01, 0.1, 0) };
  }
  function ak47(bld, joint, m) {
    const add = (g, c, mm) => bld.add(joint, g, c, mm ? m.clone().multiply(mm) : m, { occ: false, ao: false, shade: false });
    const stock = rb(0.25, 0.062, 0.036, 0.014), p = stock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (0.125 - p.getX(i)) / 0.25; p.setY(i, p.getY(i) * (0.75 + 0.75 * k) - 0.03 * k); }
    stock.computeVertexNormals();
    add(stock, C.wood, M(-0.21, -0.02, 0));
    add(rb(0.21, 0.05, 0.036, 0.01), C.rifleMetal, M(0.0, 0.015, 0));
    add(rb(0.03, 0.08, 0.028, 0.011), C.wood, M(-0.05, -0.05, 0, 0, 0, 0.3));
    // the curved magazine
    for (let k = 0; k < 3; k++) add(rb(0.05, 0.055, 0.026, 0.008, 1), C.rifleMetal, M(0.05 + k * 0.016, -0.04 - k * 0.048, 0, 0, 0, 0.18 + k * 0.17));
    add(rb(0.15, 0.045, 0.04, 0.014), C.wood, M(0.18, 0.012, 0));
    add(G.cyl(0.012, 0.012, 0.16, 8).rotateZ(-Math.PI / 2), C.rifleMetal, M(0.18, 0.05, 0));
    add(G.cyl(0.009, 0.009, 0.2, 8).rotateZ(-Math.PI / 2), C.rifleMetal, M(0.36, 0.016, 0));
    add(G.box(0.016, 0.045, 0.014), C.rifleMetal, M(0.43, 0.04, 0));
    return { R: V(-0.04, 0.0, 0), L: V(0.17, 0.03, 0), handle: V(0.0, 0.05, 0) };
  }

  // ---------------------------------------------------------------- the body
  // Proportions: about 1.72 to the helmet top, head (chin to crown) 0.36, so 1/4.8.
  const SK = { ankle: 0.085, knee: 0.39, hip: 0.71, hipW: 0.105, waist: 0.86, shY: 1.205, shW: 0.27, elbowX: 0.3, elbow: 0.975, wristX: 0.318, wrist: 0.755, neck: 1.31, headY: 1.492, R: 0.165 };

  // the flak jacket surface: radius of the vest at height y, angle a (0 = front)
  const VEST = [[0.205, 0.795], [0.218, 0.81], [0.222, 0.84], [0.226, 0.9], [0.231, 0.97], [0.236, 1.04], [0.24, 1.1], [0.238, 1.15], [0.228, 1.2], [0.205, 1.245], [0.165, 1.28], [0.11, 1.302], [0.0, 1.308]];
  const vestR0 = (y) => { for (let i = 0; i < VEST.length - 1; i++) { const a = VEST[i], b = VEST[i + 1]; if (y >= a[1] && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]); } return 0.2; };
  const vestR = (y) => vestR0(y) * (1 + (BW - 1) * sm(1.3, 1.12, y));
  const VZ = 0.8;
  // a point on the vest front or back at x (lifted off it by lift)
  const onVest = (x, y, back, lift) => { const r = vestR(y) + (lift || 0); const zz = Math.sqrt(Math.max(0.0001, r * r - x * x)) * VZ; return V(x, y, back ? -zz : zz); };

  function flakJacket(bld) {
    const rows = [];
    const ys = []; for (let i = 0; i <= n(31, 12); i++) ys.push(0.795 + (i / n(31, 12)) * (1.302 - 0.795));
    for (const y of ys) rows.push([vestR(y), y]);
    rows.push([0, 1.308]);
    const rib = (y) => (y > 0.83 && y < 1.13 ? Math.pow(0.5 + 0.5 * Math.cos((TAU * (y - 0.835)) / 0.06), 2) : 0);
    const disp = (a, y) => {
      const fa = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      return 0.008 * rib(y) - 0.009 * gs(fa / 0.05, 0) * sm(1.27, 1.2, y) + 0.005 * (noise(Math.cos(a) * 5, y * 9, Math.sin(a) * 5) - 0.5) + 0.006 * Math.sin(a * 9 + y * 20) * sm(1.13, 1.2, y) * sm(1.28, 1.22, y) + 0.008 * sm(0.83, 0.8, y);
    };
    const g = ring(rows, n(32, 12), { sz: VZ, disp, color: (a, y, x, z, d) => {
      const fa = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      let c = mix(rgb(C.flakDark), rgb(C.flakLight), clamp(0.45 + d * 40, 0, 1));
      if (fa < 0.07 && y < 1.27) c = mul(c, 0.82);
      return c;
    } });
    bld.add('chest', g, null, null, { occ: { p: 2.6 } });
    // the rolled collar, open at the front
    const cp = [];
    for (let k = 0; k <= n(20, 8); k++) { const t = k / n(20, 8), a = -2.5 + 5.0 * t; cp.push(V(Math.sin(a) * 0.125, 1.305 + 0.02 * (1 - Math.abs(Math.cos(a / 2))) - 0.005, Math.cos(a) * 0.11 - 0.01)); }
    bld.add('chest', tube(cp, (t) => { const e = Math.min(t, 1 - t); return [0.036 * sm(0, 0.12, e) + 0.004, 0.03 * sm(0, 0.12, e) + 0.004]; }, n(10, 5), (t, p) => V(p.x, 0, p.z).normalize().add(V(0, 0.4, 0)), (t, a) => mul(rgb(C.flak), 0.9 + 0.12 * Math.sin(a))), null, null, { occ: { p: 2 } });
    // shoulder yokes: padded, standing a little proud
    for (const s of [-1, 1]) bld.add('chest', rb(0.13, 0.04, 0.17, 0.018), C.flakLight, M(s * 0.17, 1.258, -0.005, 0, 0, s * -0.42), { occ: false });
    // two lower pockets with flaps, and the zip flap
    for (const s of [-1, 1]) {
      const p = onVest(s * 0.105, 0.885, false, 0.004);
      bld.add('chest', rb(0.11, 0.085, 0.026, 0.01), C.flak, M(p.x, p.y, p.z - 0.004, 0, s * 0.45, 0), { occ: false });
      bld.add('chest', rb(0.118, 0.03, 0.03, 0.01), C.flakDark, M(p.x, p.y + 0.042, p.z, -0.15, s * 0.45, 0), { occ: false });
    }
    const zp = []; for (let k = 0; k <= 6; k++) { const y = 0.82 + (k / 6) * 0.43; zp.push(onVest(0.012, y, false, 0.002)); }
    bld.add('chest', tube(zp, () => [0.016, 0.004], 4, (t, p) => V(0, 0, 1), () => rgb(C.flakDark)), null, null, { occ: false });
  }

  function webGear(bld, kind) {
    const radio = kind === 'radioman';
    // suspenders: up the front from the pouches, over the shoulder yoke, down the back to the belt
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= n(10, 5); k++) { const t = k / n(10, 5), y = 0.84 + t * 0.4; pts.push(onVest(s * (0.115 + 0.01 * t), y, false, 0.012)); }
      pts.push(V(s * 0.135, 1.29, 0.03)); pts.push(V(s * 0.14, 1.295, -0.03));
      for (let k = 0; k <= n(8, 4); k++) { const t = k / n(8, 4), y = 1.24 - t * 0.4; pts.push(onVest(s * (0.12 - 0.01 * t), y, true, 0.012)); }
      bld.add('chest', tube(pts, () => [0.022, 0.006], 4, (t, p) => p.clone().setY(0).normalize().add(V(0, t > 0.45 && t < 0.55 ? 1 : 0, 0)), () => rgb(radio ? C.webDark : C.web)), null, null, { occ: false });
    }
    // first-aid pouch on the left suspender
    if (!radio) { const p = onVest(0.12, 1.08, false, 0.03); bld.add('chest', rb(0.065, 0.08, 0.04, 0.014), C.web, M(p.x, p.y, p.z, -0.12, 0.35, 0), { occ: false }); }
    // the belt
    const belt = ring([[0.214 * BW, 0.785], [0.222 * BW, 0.795], [0.222 * BW, 0.84], [0.214 * BW, 0.85]], n(36, 12), { sz: 0.8, color: (a) => mul(rgb(C.web), 0.95 + 0.08 * Math.sin(a * 22)) });
    bld.add('pelvis', belt, null, null, { occ: false });
    bld.add('pelvis', rb(0.055, 0.05, 0.02, 0.008, 1), C.metal, M(0, 0.815, 0.18 * BW), { occ: false });
    bld.add('pelvis', ring([[0.226 * BW, 0.79], [0.231 * BW, 0.784], [0.224 * BW, 0.778]], n(36, 12), { sz: 0.8, color: () => mul(rgb(C.webDark), 0.95) }), null, null, { occ: false });
    // two ammunition pouches in front, two canteens behind, a butt pack in the middle of the back; the pouches and
    // canteens hang from their own bones (pivots returned for the bone list) so the kit layer can swing them
    const piv = {};
    const pistol = kind === 'captain' || kind === 'corpsman';
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      if (!pistol || s > 0) {
        bld.add('pouch' + side, rb(0.088, 0.1, 0.06, 0.02), C.web, M(s * 0.125 * BW, 0.765, 0.175 * BW, 0.05, s * 0.48, 0), { occ: { p: 3 } });
        bld.add('pouch' + side, rb(0.094, 0.032, 0.066, 0.012), C.webDark, M(s * 0.125 * BW, 0.82, 0.177 * BW, 0.05, s * 0.48, 0), { occ: false });
        piv['pouch' + side] = V(s * 0.118 * BW, 0.828, 0.158 * BW);
      }
      bld.add('canteen' + side, rb(0.1, 0.15, 0.06, 0.028), C.canteen, M(s * 0.175 * BW, 0.72, -0.11 * BW, 0.04, s * -0.9, s * 0.04), { occ: { p: 2.5 } });
      bld.add('canteen' + side, G.cyl(0.02, 0.02, 0.022, 8), C.black, M(s * 0.18 * BW, 0.805, -0.11 * BW));
      piv['canteen' + side] = V(s * 0.165 * BW, 0.79, -0.098 * BW);
    }
    if (!radio) bld.add('pelvis', rb(0.2, 0.12, 0.09, 0.035), C.webDark, M(0, 0.74, -0.2 * BW, 0.08, 0, 0), { occ: { p: 3 } });
    if (pistol) {
      bld.add('pelvis', rb(0.07, 0.16, 0.05, 0.022), C.holster, M(-0.215 * BW, 0.69, 0.04, 0, 0, -0.08));
      bld.add('pelvis', rb(0.045, 0.05, 0.035, 0.012), C.rifle, M(-0.215 * BW, 0.785, 0.028, 0.2, 0, 0));
    }
    if (kind === 'captain') bld.add('pelvis', rb(0.1, 0.12, 0.035, 0.012), C.mapCase, M(0.2 * BW, 0.7, 0.05, 0, 1.2, 0), { occ: false });
    if (kind === 'corpsman') {
      // two Unit One aid bags on their straps, riding the hips behind the pouches; a strap over each shoulder
      for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
        const x = s * 0.235 * BW, z = s > 0 ? 0.0 : -0.02;
        bld.add('aid' + side, rb(0.085, 0.16, 0.2, 0.035), C.canvas, M(x, 0.66, z, 0, 0, s * 0.06), { occ: { p: 3 } });
        bld.add('aid' + side, rb(0.09, 0.05, 0.205, 0.02), C.webDark, M(x, 0.735, z, 0, 0, s * 0.06), { occ: false });
        bld.add('aid' + side, rb(0.014, 0.06, 0.03, 0.006, 1), C.metal, M(x + s * 0.045, 0.705, z + 0.05), { occ: false });
        piv['aid' + side] = V(s * 0.22 * BW, 0.78, z);
        const pts = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6, y = 0.86 + t * 0.4; pts.push(onVest(s * (0.2 - 0.06 * t), y, false, 0.016)); }
        pts.push(V(s * 0.15, 1.3, 0.02)); pts.push(V(s * 0.16, 1.3, -0.04));
        bld.add('chest', tube(pts, () => [0.02, 0.006], 4, (t, p) => p.clone().setY(0).normalize().add(V(0, t > 0.8 ? 1 : 0, 0)), () => rgb(C.webDark)), null, null, { occ: false });
      }
    }
    return piv;
  }

  function trousers(bld, util, kind) {
    const nva = kind === 'nva';
    // the seat of the trousers: flat at the front (the cloth hangs nearly straight from the belt, sloping forward a
    // little), rounded at the back; the centre seam only behind, a short fly in front
    const seat = ring([[0, 0.585], [0.13 * BW, 0.595], [0.178 * BW, 0.65], [0.19 * BW, 0.72], [0.19 * BW, 0.79], [0.185 * BW, 0.85], [0, 0.86]], n(28, 10), { sz: 0.84,
      disp: (a, y) => 0.004 * (noise(Math.cos(a) * 4, y * 8, Math.sin(a) * 4) - 0.5) + 0.014 * Math.max(0, -Math.cos(a)) * gs((y - 0.68) / 0.07, 0),
      color: (a, y, x, z) => ((Math.abs(x) < 0.006 && z < 0) || (Math.abs(x - 0.012) < 0.005 && z > 0 && y > 0.69 && y < 0.785) ? mul(rgb(util), 0.74) : mul(rgb(util), 0.88 + 0.06 * noise(x * 20, y * 20, z * 20))) });
    {
      const p = seat.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), z = p.getZ(i); if (z <= 0) continue;
        // a front plane: z <= 0.118 at the crotch rising to 0.15 at the belt; soft so the corners stay round
        const plane = (0.118 + 0.17 * (y - 0.6)) * BW, k = 0.015;
        const zz = z > plane - k ? plane - k + k * Math.tanh((z - plane + k) / k) : z;
        p.setZ(i, zz);
        // the lower edge in front follows the crotch (an inverted V into the legs), not a round bottom
        const x = p.getX(i), edge = 0.615 + 0.75 * Math.abs(x) * sm(0.02, 0.1, zz);
        if (y < edge) p.setY(i, edge);
      }
      seat.computeVertexNormals();
    }
    bld.add('pelvis', seat, null, null, { occ: { p: 2.2 } });
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const prof = nva
        ? [[0.104, 0.8], [0.104, 0.7], [0.097, 0.6], [0.092, 0.5], [0.087, 0.42], [0.085, 0.36], [0.083, 0.3], [0.08, 0.24], [0.077, 0.18], [0.074, 0.14]]
        : [[0.104, 0.8], [0.103, 0.7], [0.097, 0.6], [0.091, 0.5], [0.084, 0.42], [0.082, 0.38], [0.085, 0.33], [0.082, 0.29], [0.08, 0.265], [0.092, 0.245], [0.094, 0.225], [0.082, 0.205], [0.068, 0.19]];
      const rows = [];
      for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1], m = Math.max(1, Math.round(((a[1] - b[1]) / 0.025) * Q)); for (let k = 0; k < m; k++) rows.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]); }
      rows.push(prof[prof.length - 1]);
      const disp = (a, y) => 0.006 * Math.sin(a * 3 + y * 30) * gs((y - 0.4) / 0.05, 0) + 0.004 * (noise(Math.cos(a) * 3 + s * 9, y * 12, Math.sin(a) * 3) - 0.5) + (nva ? 0.005 * Math.sin(a * 5 + y * 14) * sm(0.35, 0.2, y) : 0.008 * Math.sin(a * 9) * gs((y - 0.235) / 0.025, 0));
      for (const r of rows) r[0] *= 1 + (BW - 1) * 0.8 * sm(0.3, 0.6, r[1]);
      const g = ring(rows, n(16, 8), { disp, color: (a, y, x, z, d) => mul(rgb(util), 0.9 + d * 10 + 0.06 * noise(x * 20, y * 20, z * 20)) });
      g.translate(s * SK.hipW, 0, 0.005);
      bld.add('th' + side, g, null, null, { blend: ['pelvis', 'th' + side, 0.8, 0.64], occ: { p: 2 } });
      // the shin half reuses the same ring, weighted across the knee (one piece, blended)
      const last = bld.pieces.pop();
      last.opt = { blend: null, occ: last.occ };
      // three-way: pelvis -> thigh above, thigh -> shin across the knee
      const pos = last.pos, cnt = pos.length / 3;
      last.weights = new Float32Array(cnt * 4); last.wjoints = ['pelvis', 'th' + side, 'sh' + side];
      for (let v = 0; v < cnt; v++) {
        const y = pos[v * 3 + 1], wp = sm(0.66, 0.8, y), ws = sm(0.45, 0.33, y);
        last.weights[v * 4] = wp; last.weights[v * 4 + 1] = (1 - wp) * (1 - ws); last.weights[v * 4 + 2] = (1 - wp) * ws;
      }
      bld.pieces.push(last);
      if (!nva) {
        // the cargo pocket on the outside of the thigh, with its flap
        bld.add('th' + side, rb(0.03, 0.12, 0.11, 0.012), util, M(s * (SK.hipW + 0.088), 0.56, 0.02, 0, 0, s * 0.06), { occ: false });
        bld.add('th' + side, rb(0.036, 0.035, 0.118, 0.012), C.utilDark, M(s * (SK.hipW + 0.09), 0.625, 0.02, 0, 0, s * 0.06), { occ: false });
      }
    }
  }

  const TOE_Z = 0.1; // the ball of the foot, where the toe bends
  const toeW = (side) => (x, y, z) => { const t = sm(TOE_Z - 0.035, TOE_Z + 0.025, z); return ['ft' + side, 1 - t, 'toe' + side, t]; };
  function boots(bld, kind) {
    const nva = kind === 'nva';
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const x = s * SK.hipW;
      if (nva) {
        const g = ring([[0.068, 0.05], [0.074, 0.1], [0.075, 0.16], [0.071, 0.2]], n(14, 8), { color: (a) => (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.25 ? rgb(0x6e6a4c) : rgb(C.nvaCanvas)) });
        g.translate(x, 0, 0.005);
        bld.add('sh' + side, g, null, null, { blend: ['sh' + side, 'ft' + side, 0.12, 0.07], occ: false });
        bld.add('ft' + side, rb(0.12, 0.08, 0.23, 0.035), C.nvaCanvas, M(x, 0.05, 0.035), { w: toeW(side) });
        bld.add('ft' + side, rb(0.125, 0.025, 0.235, 0.01), 0x4a4536, M(x, 0.013, 0.035), { w: toeW(side) });
      } else {
        const g = ring([[0.068, 0.06], [0.072, 0.1], [0.072, 0.16], [0.068, 0.205]], n(14, 8), { color: (a, y) => (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.32 ? (Math.sin(y * 160) > 0.3 ? rgb(0x2e2c27) : rgb(C.canvas)) : rgb(C.canvas)) });
        g.translate(x, 0, 0.005);
        bld.add('sh' + side, g, null, null, { blend: ['sh' + side, 'ft' + side, 0.12, 0.07], occ: false });
        const toe = rb(0.125, 0.1, 0.245, 0.04), p = toe.attributes.position;
        for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0.04) p.setY(i, p.getY(i) * (1 - (z - 0.04) * 1.6)); }
        toe.computeVertexNormals();
        bld.add('ft' + side, toe, C.leather, M(x, 0.058, 0.04), { w: toeW(side) });
        bld.add('ft' + side, rb(0.132, 0.03, 0.255, 0.01), C.sole, M(x, 0.016, 0.04), { w: toeW(side) });
      }
    }
  }

  function arms(bld, kind, skin, sleeveCol, rolled) {
    const hands = {};
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const S = V(s * SK.shW, SK.shY, 0), E = V(s * SK.elbowX, SK.elbow, -0.012), W = V(s * SK.wristX, SK.wrist, 0.005);
      const ua = 'ua' + side, fa = 'fa' + side;
      const Lu = S.distanceTo(E);
      // the sleeve: shoulder to just above the elbow (rolled) or to the wrist
      const sleeveEnd = rolled ? 0.06 : -0.0;
      const up = ring([[0.0, 0.06], [0.05, 0.05], [0.072 * BW, 0.02], [0.074 * BW, -0.03], [0.072 * BW, -0.09], [0.068 * BW, -0.15], [0.064 * BW, -Lu + sleeveEnd + 0.01], [0.061 * BW, -Lu + sleeveEnd]], n(16, 8), {
        disp: (a, y) => 0.004 * Math.sin(a * 4 + y * 40) * sm(-0.05, -0.15, y) + 0.003 * (noise(Math.cos(a) * 3 + s * 5, y * 14, Math.sin(a) * 3) - 0.5),
        color: (a, y, x, z, d) => mul(rgb(sleeveCol), 0.92 + d * 12),
      });
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), E.clone().sub(S).normalize());
      up.applyMatrix4(new THREE.Matrix4().compose(S, q, V(1, 1, 1)));
      bld.add(ua, up, null, null, { blend: ['cl' + side, ua, SK.shY + 0.06, SK.shY - 0.05], occ: { p: 2 } });
      const Lf = E.distanceTo(W), qf = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), W.clone().sub(E).normalize());
      if (rolled) {
        // the rolled cuff, a little lighter where the inside of the cloth shows
        const roll = ring([[0.062, 0.03], [0.074, 0.022], [0.078, 0.0], [0.074, -0.022], [0.062, -0.03]], n(16, 8), { disp: (a) => 0.004 * Math.sin(a * 5), color: (a, y) => mul(rgb(C.utilLight), y > 0 ? 0.9 : 1.0) });
        roll.applyMatrix4(new THREE.Matrix4().compose(S.clone().lerp(E, (Lu - 0.06) / Lu), q, V(1, 1, 1)));
        bld.add(ua, roll, null, null, { occ: false });
        // the forearm: bare, a muscle near the elbow tapering to the wrist
        const fp = [[0.0, 0.07], [0.04, 0.065], [0.052, 0.04], [0.06, -0.02], [0.058, -0.06], [0.05, -0.12], [0.042, -0.17], [0.038, -Lf + 0.01], [0.036, -Lf - 0.005]];
        const fg = ring(fp, n(14, 8), { sx: 1.0, sz: 0.88, color: (a, y) => mul(rgb(skin), 0.95 + 0.05 * Math.cos(a)) });
        fg.applyMatrix4(new THREE.Matrix4().compose(E, qf, V(1, 1, 1)));
        bld.add(fa, fg, null, null, { blend: [ua, fa, SK.elbow + 0.04, SK.elbow - 0.03], occ: false });
        if (side === 'L') {
          // a wristwatch
          const wr = ring([[0.04, 0.012], [0.042, 0.0], [0.04, -0.012]], n(12, 6), { color: () => rgb(C.watch) });
          wr.applyMatrix4(new THREE.Matrix4().compose(E.clone().lerp(W, 0.86), qf, V(1, 1, 1)));
          bld.add(fa, wr, null, null, { occ: false });
          bld.add(fa, rb(0.012, 0.03, 0.03, 0.006, 1), 0x9a9688, M(W.x + 0.035, W.y + 0.035, W.z, 0, 0, 0.1), { occ: false });
        }
      } else {
        const fp = [[0.0, 0.06], [0.06, 0.05], [0.064, 0.0], [0.062, -0.06], [0.056, -0.14], [0.052, -Lf + 0.03], [0.054, -Lf + 0.012], [0.046, -Lf + 0.004]];
        const fg = ring(fp, n(14, 8), { disp: (a, y) => 0.004 * Math.sin(a * 4 + y * 50), color: (a, y, x, z, d) => mul(rgb(sleeveCol), (y < -Lf + 0.035 ? 0.85 : 0.94) + d * 10) });
        fg.applyMatrix4(new THREE.Matrix4().compose(E, qf, V(1, 1, 1)));
        bld.add(fa, fg, null, null, { blend: [ua, fa, SK.elbow + 0.04, SK.elbow - 0.03], occ: false });
        const wg = ring([[0.0, 0.0], [0.036, -0.004], [0.036, -0.03], [0.0, -0.034]], n(10, 6), { color: () => rgb(skin) });
        wg.applyMatrix4(new THREE.Matrix4().compose(W.clone().add(V(0, 0.012, 0)), qf, V(1, 1, 1)));
        bld.add(fa, wg, null, null, { occ: false });
      }
      Object.assign(hands, buildHand(bld, side, W, skin));
    }
    return hands;
  }

  function nvaKit(bld) {
    // the shirt shows here instead of a vest: a softer torso with two breast pockets and a collar
    const rows = [];
    const prof = [[0.18, 0.79], [0.19, 0.84], [0.198, 0.95], [0.205, 1.05], [0.21, 1.12], [0.205, 1.17], [0.19, 1.22], [0.16, 1.26], [0.11, 1.29], [0.0, 1.3]];
    for (let i = 0; i < prof.length - 1; i++) { const a = prof[i], b = prof[i + 1], m = n(3, 1); for (let k = 0; k < m; k++) rows.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]); }
    rows.push(prof[prof.length - 1]);
    const g = ring(rows, n(30, 10), { sz: 0.78, disp: (a, y) => 0.005 * Math.sin(a * 5 + y * 17) * sm(1.1, 0.85, y) + 0.004 * (noise(Math.cos(a) * 4, y * 9, Math.sin(a) * 4) - 0.5), color: (a, y, x, z, d) => mul(rgb(C.nvaUtil), 0.92 + d * 10) });
    bld.add('chest', g, null, null, { occ: { p: 2.6 } });
    const cp = [];
    for (let k = 0; k <= n(14, 6); k++) { const t = k / n(14, 6), a = -2.2 + 4.4 * t; cp.push(V(Math.sin(a) * 0.1, 1.29, Math.cos(a) * 0.085)); }
    bld.add('chest', tube(cp, () => [0.03, 0.01], 4, (t, p) => V(p.x, 0.6, p.z).normalize(), () => rgb(C.nvaDark)), null, null, { occ: false });
    // the chest rig: three magazine pockets across the front, a smaller one either side, straps over the shoulders
    for (let k = -1; k <= 1; k++) bld.add('chest', rb(0.062, 0.13, 0.05, 0.016), C.nvaRig, M(k * 0.064, 0.98, 0.17 - Math.abs(k) * 0.012, -0.06, k * 0.22, 0));
    for (const s of [-1, 1]) {
      bld.add('chest', rb(0.05, 0.08, 0.045, 0.014), C.nvaRigDark, M(s * 0.145, 0.97, 0.13, -0.05, s * 0.75, 0), { occ: false });
      const pts = [V(s * 0.08, 1.04, 0.17), V(s * 0.11, 1.18, 0.14), V(s * 0.13, 1.28, 0.05), V(s * 0.13, 1.28, -0.06), V(s * 0.1, 1.15, -0.16), V(s * 0.05, 1.0, -0.17)];
      bld.add('chest', tube(pts, () => [0.016, 0.005], 4, (t, p) => p.clone().setY(0).normalize(), () => rgb(C.nvaRigDark)), null, null, { occ: false });
    }
    const belt = ring([[0.2, 0.785], [0.206, 0.795], [0.206, 0.835], [0.2, 0.845]], n(30, 10), { sz: 0.8, color: () => rgb(0x6a6446) });
    bld.add('pelvis', belt, null, null, { occ: false });
    bld.add('pelvis', rb(0.05, 0.045, 0.02, 0.008, 1), 0x8a8468, M(0, 0.815, 0.165), { occ: false });
    bld.add('pelvis', rb(0.09, 0.14, 0.06, 0.03), 0x5d6a4a, M(0.18, 0.72, -0.08, 0.04, -0.8, 0));
  }

  function radioPack(bld) {
    bld.add('chest', rb(0.28, 0.3, 0.13, 0.03), C.radio, M(0, 1.02, -0.26), { rigid: true, occ: { p: 4 } });
    bld.add('chest', rb(0.27, 0.13, 0.125, 0.03), C.radioDark, M(0, 0.82, -0.255), { rigid: true, occ: { p: 4 } });
    bld.add('chest', rb(0.29, 0.02, 0.135, 0.008, 1), C.black, M(0, 0.885, -0.26), { rigid: true, occ: false });
    for (const [x, r] of [[-0.07, 0.022], [0.0, 0.018], [0.06, 0.014]]) bld.add('chest', G.cyl(r, r, 0.03, n(10, 6)), C.black, M(x, 1.18, -0.24), { rigid: true, occ: false });
    bld.add('chest', G.cyl(0.016, 0.02, 0.05, n(10, 6)), C.black, M(0.11, 1.19, -0.24), { rigid: true, occ: false });
    // the pack frame and shoulder straps
    for (const s of [-1, 1]) {
      const pts = [V(s * 0.1, 1.16, -0.2), V(s * 0.13, 1.27, -0.07), V(s * 0.135, 1.29, 0.03), onVest(s * 0.125, 1.18, false, 0.014), onVest(s * 0.12, 1.0, false, 0.014), onVest(s * 0.12, 0.86, false, 0.012)];
      bld.add('chest', tube(pts, () => [0.024, 0.007], 4, (t, p) => p.clone().setY(0).normalize(), () => rgb(C.webDark)), null, null, { occ: false });
    }
  }

  // ---------------------------------------------------------------- build a figure
  // kind: rifleman | captain | radioman | nva. o: { face (index or object), lod (0 = far), mat }
  // ---------------------------------------------------------------- build a figure
  // spec: { kind: rifleman | captain | radioman | corpsman | nva, face (0..4 or an object), skin ([skin, blush, lips]),
  //         hair, stubble (0..1), rolled (sleeves), towel, band ([[item, angle], ...]), build (girth), lod (0 = far), mat }
  function towel(bld) {
    // an olive drab towel round the neck, its two ends lying on the chest
    const col = (t, a) => mul(rgb(0x737149), 0.9 + 0.1 * Math.sin(a * 2 + t * 9));
    const pts = [];
    for (let k = 0; k <= n(18, 8); k++) { const t = k / n(18, 8), a = -2.6 + 5.2 * t; pts.push(V(Math.sin(a) * 0.15, 1.315 + 0.015 * Math.cos(a), Math.cos(a) * 0.135 - 0.01)); }
    const nw = (x, y) => { const t = sm(1.29, 1.35, y); return ['chest', 1 - t, 'neck', t]; };
    bld.add('chest', tube(pts, () => [0.05, 0.036], n(8, 5), (t, p) => V(p.x, 0.5, p.z).normalize(), col), null, null, { w: nw, occ: { p: 2 } });
    for (const s of [-1, 1]) {
      // the ends hang down the front over the vest, each a soft flat band
      const end = [];
      for (let k = 0; k <= 5; k++) { const t = k / 5; end.push(onVest(s * (0.085 + 0.015 * t), 1.29 - t * 0.2, false, 0.04)); }
      bld.add('chest', tube(end, () => [0.05, 0.02], 6, (t, p) => V(p.x * 0.3, 0, p.z).normalize(), col), null, null, { occ: false });
    }
  }
  const BONE_Y = { hips: 0.775, sp0: 0.86, sp1: 0.96, sp2: 1.075, neck: 1.295, head: 1.37, top: 1.66 };
  V2.BONE_Y = BONE_Y;
  V2.build = function (spec) {
    const o = spec || {}, kind = o.kind || 'rifleman';
    Q = o.lod === 0 ? 0.31 : 1;
    BW = o.build || 1;
    const base = typeof o.face === 'object' ? o.face : FACES[o.face !== undefined ? o.face : ({ rifleman: 0, captain: 2, radioman: 3, corpsman: 1, nva: 4 })[kind]];
    const P = Object.assign({}, base);
    if (o.skin) { P.skin = o.skin[0]; P.blush = o.skin[1]; P.lipCol = o.skin[2]; }
    if (o.hair !== undefined) { P.hair = o.hair; P.browCol = mul(rgb(o.hair), 0.9).reduce((h, c, i) => h + (Math.round(c * 255) << (16 - 8 * i)), 0); }
    if (o.stubble !== undefined) P.stubble = o.stubble;
    const bld = new Bld();
    const HC = V(0, SK.headY, 0.012), R = SK.R;
    const skin = P.skin;
    const util = kind === 'nva' ? C.nvaUtil : kind === 'captain' ? C.utilCapt : C.util;
    const rolled = o.rolled !== undefined ? o.rolled : kind !== 'captain' && kind !== 'nva';
    // neck: the upper spine, then the neck bone, then the head
    const neckW = (x, y) => { const a = sm(1.265, 1.315, y), b = sm(1.345, 1.4, y); return ['chest', 1 - a, 'neck', a * (1 - b), 'head', b]; };
    bld.add('chest', ring([[0.0, 1.2], [0.074, 1.21], [0.076, 1.3], [0.07, 1.4], [0.0, 1.44]], n(14, 8), { sz: 0.95, color: () => mul(rgb(skin), 0.9) }), null, null, { w: neckW, occ: false });
    const head = buildHead(bld, P, HC, R, kind, o.band === undefined ? [['bottle', -0.42]] : o.band);
    let piv = {};
    if (kind === 'nva') nvaKit(bld); else { flakJacket(bld); piv = webGear(bld, kind); }
    if (kind === 'radioman') radioPack(bld);
    if (o.towel && kind !== 'nva') towel(bld);
    trousers(bld, util, kind);
    boots(bld, kind);
    const hands = arms(bld, kind, skin, util, rolled);
    const F = { kind, spec: o, face: P, lod: o.lod === 0 ? 0 : 1, R, HC };
    // props, each on its own bone, built at the origin in its own frame
    if (kind === 'rifleman') F.grip = m16(bld, 'rifle', new THREE.Matrix4().makeScale(0.88, 0.88, 0.88));
    if (kind === 'nva') F.grip = ak47(bld, 'rifle', new THREE.Matrix4().makeScale(0.88, 0.88, 0.88));
    if (F.grip) for (const k in F.grip) F.grip[k].multiplyScalar(0.88);
    if (kind === 'captain') {
      bld.add('map', rb(0.21, 0.006, 0.16, 0.003, 1), (x, y, z) => (noise(x * 30, 0, z * 30) > 0.56 ? C.mapInk : Math.abs(x * 40 % 1) < 0.06 ? 0xb9ae8e : C.map), null, { occ: false, ao: false, shade: false });
      bld.add('map', rb(0.21, 0.004, 0.16, 0.002, 1), 0xd8cba5, M(0.004, -0.004, 0.003, 0, 0.04, 0), { occ: false, ao: false, shade: false });
    }
    if (kind === 'radioman') {
      bld.add('handset', rb(0.045, 0.19, 0.04, 0.018), C.handset, null, { occ: false, ao: false, shade: false });
      bld.add('handset', G.sph(0.033, 0.024, 0.033, n(12, 6), n(8, 4)), C.handset, M(0, 0.085, 0.022), { occ: false, ao: false, shade: false });
      bld.add('handset', G.sph(0.03, 0.022, 0.03, n(12, 6), n(8, 4)), C.handset, M(0, -0.08, 0.022), { occ: false, ao: false, shade: false });
      F.antN = n(12, 6); F.cordN = n(14, 6);
      for (let i = 0; i < F.antN; i++) bld.add('a' + i, G.cyl(0.0075 - i * 0.0003, 0.0078 - i * 0.0003, 1, 5).translate(0, 0.5, 0), 0x2e2f2a, null, { occ: false, ao: false, shade: false });
      for (let i = 0; i < F.cordN; i++) bld.add('c' + i, G.cyl(0.0065, 0.0065, 1, 4).translate(0, 0.5, 0), 0x2a2a27, null, { occ: false, ao: false, shade: false });
      F.antBase = V(0.11, 1.21, -0.24); F.antLen = 1.05;
      F.cordFrom = V(-0.14, 0.86, -0.2);
    }
    // the bones: the Mixamo X Bot tree (names and parent order) at the clay body's joints, then the extras
    const B = (name, parent, pos) => ({ name: nm(name), parent: parent && nm(parent), pos: pos.clone ? pos.clone() : V(...pos) });
    const Y = BONE_Y;
    const bones = [
      B('pelvis', null, [0, Y.hips, 0]), B('sp0', 'pelvis', [0, Y.sp0, 0]), B('sp1', 'sp0', [0, Y.sp1, 0]), B('sp2', 'sp1', [0, Y.sp2, 0]),
      B('neck', 'sp2', [0, Y.neck, 0]), B('head', 'neck', [0, Y.head, 0]), B(MX + 'HeadTop_End', 'head', [0, Y.top, 0.012]),
      B('jaw', 'head', head.bones.jaw), B('eyeL', 'head', head.bones.eyeL), B('eyeR', 'head', head.bones.eyeR), B('lidL', 'head', head.bones.lidL), B('lidR', 'head', head.bones.lidR),
      B('browL', 'head', head.bones.browL), B('browR', 'head', head.bones.browR), B('mcL', 'head', head.bones.mcL), B('mcR', 'head', head.bones.mcR), B('helmet', 'head', head.bones.helmet),
    ];
    for (const [s, side, S] of [[-1, 'R', 'Right'], [1, 'L', 'Left']]) {
      bones.push(B('cl' + side, 'sp2', [s * 0.05, 1.215, -0.005]), B('ua' + side, 'cl' + side, [s * SK.shW, SK.shY, 0]), B('fa' + side, 'ua' + side, [s * SK.elbowX, SK.elbow, -0.012]), B('hd' + side, 'fa' + side, [s * SK.wristX, SK.wrist, 0.005]));
      for (const F4 of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 4; i++) { const b = MX + S + 'Hand' + F4 + i; bones.push(B(b, i === 1 ? 'hd' + side : MX + S + 'Hand' + F4 + (i - 1), hands[b])); }
    }
    for (const [s, side, S] of [[-1, 'R', 'Right'], [1, 'L', 'Left']]) {
      bones.push(B('th' + side, 'pelvis', [s * SK.hipW, SK.hip, 0]), B('sh' + side, 'th' + side, [s * SK.hipW, SK.knee, 0.01]), B('ft' + side, 'sh' + side, [s * SK.hipW, SK.ankle, 0.005]));
      bones.push(B('toe' + side, 'ft' + side, [s * SK.hipW, 0.03, TOE_Z]), B(MX + S + 'Toe_End', 'toe' + side, [s * SK.hipW, 0.03, 0.17]));
    }
    for (const k in piv) bones.push(B(k, 'pelvis', piv[k]));
    bones.push(B('rifle', null, [0, 0, 0]), B('map', null, [0, 0, 0]), B('handset', null, [0, 0, 0]));
    for (let i = 0; i < (F.antN || 0); i++) bones.push(B('a' + i, null, [0, 0, 0]));
    for (let i = 0; i < (F.cordN || 0); i++) bones.push(B('c' + i, null, [0, 0, 0]));
    const asm = assemble(bld, bones, o.mat, { face: head.face });
    Object.assign(F, asm);
    F.root = new THREE.Group();
    F.root.add(asm.mesh);
    F.bind = {}; for (const b of bones) F.bind[b.name] = b.pos.clone();
    F.boneList = bones.map((b) => [b.name, b.parent]);
    F.kit = Object.keys(piv);
    F.SK = SK;
    return F;
  };

  // ---------------------------------------------------------------- variants from a seed
  // role: rifleman | captain | radioman | corpsman | nva. Returns a spec for V3.build plus the figure's height scale.
  const BAND_ITEMS = ['bottle', 'pack', 'spoon', 'brush'];
  V2.spec = function (seed, role, lod) {
    const r = FK.rand(seed * 7919 + 13);
    role = role || 'rifleman';
    if (role === 'nva') return { kind: 'nva', face: 4, height: 0.95 + r() * 0.06, build: 0.94 + r() * 0.06, lod, seed };
    const face = Math.floor(r() * 4);
    // skin: near the face's own tone most of the time, any tone sometimes
    const tone = Math.floor(r() * V2.SKINS.length); // any tone with any face, spread evenly across the seven
    const hair = tone >= 4 ? V2.HAIR[r() < 0.5 ? 1 : 3] : V2.HAIR[Math.floor(r() * V2.HAIR.length)];
    const band = [];
    const nb = r() < 0.15 ? 0 : r() < 0.7 ? 1 : 2;
    let a0 = (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.5);
    for (let k = 0; k < nb; k++) { band.push([BAND_ITEMS[Math.floor(r() * BAND_ITEMS.length)], a0]); a0 += (a0 > 0 ? -1 : 1) * (0.55 + r() * 0.3); }
    return {
      kind: role, face, skin: V2.SKINS[tone], hair, stubble: r() * 0.7, rolled: role === 'captain' ? r() < 0.3 : r() < 0.62,
      towel: role !== 'captain' && r() < 0.28, band, build: 0.94 + r() * 0.14, height: 0.95 + r() * 0.1, lod, seed,
    };
  };
  V2.make = function (seed, role, lod, mat) { const sp = V2.spec(seed, role, lod); sp.mat = mat; const F = V2.build(sp); F.height = sp.height; return F; };


  // ---------------------------------------------------------------- the material: matte clay, a warm rim, a faint
  // fingerprint-like mottle in the colour (object-space noise, so it stays on the figure)
  V2.material = function (opt) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, skinning: !(opt && opt.static), roughness: 0.9, metalness: 0 });
    const rim = { value: new THREE.Color(0xffe2bc).convertSRGBToLinear() };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = rim;
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = 'uniform vec3 uRim;\nvarying vec3 vObj;\n' +
        'float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
        'float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
        '  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),\n' +
        '             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }\n' +
        sh.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\n  float clayN = (vn(vObj * 90.0) - 0.5) * 0.045 + (vn(vObj * 23.0) - 0.5) * 0.04;\n  diffuseColor.rgb *= 1.0 + clayN;')
          .replace('#include <output_fragment>',
            'float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);\n' +
            'outgoingLight += uRim * pow(rimF, 3.0) * 0.26 * (0.45 + diffuseColor.rgb);\n#include <output_fragment>');
    };
    m.customProgramCacheKey = () => 'clay2' + (opt && opt.static ? 's' : '');
    return m;
  };

})();
