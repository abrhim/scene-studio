// grass.js: the elephant grass of grass-study/index.html, treatment C (3D arching blade tussocks within about 25 m,
// painted crossed cards beyond with a dithered crossfade at 21-29 m, plume stems, dark bases and straw tops, wind),
// copied from that study into a module and cut down: a square patch (60 x 60 m by default, thinner past it), one
// trample function instead of the study's lanes and craters. The blade geometry, the card atlas, the shader and the
// distance buckets are the study's code unchanged.
// TallGrass.create({ scene, ground(x, z), half: 30, skirt: 18, spacing: 0.75, trample(x, z) -> 0..1 (1 = trodden flat),
//   clear(x, z) -> true where nothing grows, sunDir, sunCol }) -> { update(camera, t), U }
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash2(ix, iz) { let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, z) { return vnoise(x, z) * 0.55 + vnoise(x * 2.07 + 5.2, z * 2.07 - 1.3) * 0.3 + vnoise(x * 4.3 - 2.7, z * 4.3 + 7.1) * 0.15; }
  window.TallGrass = { create };
  function create(o) {
    const scene = o.scene, groundY = o.ground, HALF = o.half || 30, SK = o.skirt === undefined ? 18 : o.skirt, FIELD = HALF + SK;
    const trample = o.trample || (() => 0), clear = o.clear || (() => false);
    const U = { // uniforms shared by every grass material
      uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uLanes: { value: 1 }, uSunDir: { value: (o.sunDir || new THREE.Vector3(-0.5, 0.8, 0.4)).clone().normalize() }, uSunCol: { value: (o.sunCol || new THREE.Color(1, 0.9, 0.75)).clone() },
      uCBase: { value: lin('#56622e') }, uCBody: { value: lin('#8d8a46') }, uCTop: { value: lin('#b9a95c') }, uCTip: { value: lin('#d2c38a') },
      uCDead0: { value: lin('#857a5c') }, uCDead1: { value: lin('#b3a682') }, uCPlume: { value: lin('#d4cbb2') },
    };
    const CH = 6, NCH = Math.ceil((2 * FIELD) / CH);
    function cover(x, z) { return clamp(0.72 + 0.4 * fbm(x * 0.06 + 3, z * 0.06 - 2), 0, 1); }
    // each clump: x y z rot | spread hScale lean leanDir | dry tint seed trample | laneDir skipMode chunk 0
    function makeList(spacing, seed) {
      const r = mulberry32(seed), raw = [];
      const n = Math.floor((2 * FIELD) / spacing);
      for (let gx = 0; gx < n; gx++) for (let gz = 0; gz < n; gz++) {
        const x = -FIELD + (gx + 0.5 + (r() - 0.5) * 0.92) * spacing, z = -FIELD + (gz + 0.5 + (r() - 0.5) * 0.92) * spacing;
        const edge = Math.max(Math.abs(x), Math.abs(z));
        let dens = cover(x, z) * (1 - 0.6 * smooth(HALF, FIELD, edge));
        if (clear(x, z)) dens = 0;
        if (r() > dens) { r(); r(); r(); r(); r(); r(); r(); continue; }
        const y = groundY(x, z);
        let h = 0.86 + 0.26 * (fbm(x * 0.045 + 9, z * 0.045 + 4) - 0.5) * 2 + (r() - 0.5) * 0.26;
        const hScale = clamp(h, 0.72, 1.16) * (o.height || 1);
        const spread = 0.82 + r() * 0.4;
        const lean = 0.04 + r() * 0.18, leanDir = r() < 0.35 ? 0.3 + (r() - 0.5) * 0.8 : r() * TAU;
        const dry = clamp(0.5 + (fbm(x * 0.035 - 4, z * 0.035 + 8) - 0.5) * 1.1 + (r() - 0.5) * 0.35, 0, 1);
        const tint = clamp(0.45 * r() + 0.55 * (fbm(x * 0.03 + 17, z * 0.03 - 5) * 1.6 - 0.3), 0, 1), sd = r();
        const tr = clamp(trample(x, z), 0, 1);
        const skip = tr > 0.85 && r() < 0.45 ? 1 : 0;
        const laneDir = r() * TAU;
        const cx = clamp(Math.floor((x + FIELD) / CH), 0, NCH - 1), cz = clamp(Math.floor((z + FIELD) / CH), 0, NCH - 1);
        raw.push([x, y, z, r() * TAU, spread, hScale, lean, leanDir, dry, tint, sd, tr, laneDir, skip, cz * NCH + cx, 0]);
      }
      raw.sort((a, b) => a[14] - b[14]);
      const N = raw.length, data = new Float32Array(N * 16), start = new Int32Array(NCH * NCH).fill(-1), end = new Int32Array(NCH * NCH).fill(-1);
      const ymin = new Float32Array(NCH * NCH).fill(1e9), ymax = new Float32Array(NCH * NCH).fill(-1e9);
      raw.forEach((c, i) => { data.set(c, i * 16); const k = c[14]; if (start[k] < 0) start[k] = i; end[k] = i + 1; ymin[k] = Math.min(ymin[k], c[1]); ymax[k] = Math.max(ymax[k], c[1] + 2.6); });
      return { N, data, start, end, ymin, ymax };
    }
    const sp = o.spacing || 0.75;
    const listA = makeList(sp, 11), listB = makeList(sp * 0.9, 23);
    const listP = (() => {
      const keep = []; for (let i = 0; i < listB.N; i++) { const sd = listB.data[i * 16 + 10]; if (((sd * 5.13) % 1) < 0.2 && ((sd * 17.7) % 1) < 0.5) keep.push(i); }
      const N = keep.length, data = new Float32Array(N * 16), start = new Int32Array(NCH * NCH).fill(-1), end = new Int32Array(NCH * NCH).fill(-1);
      keep.forEach((src, i) => { data.set(listB.data.subarray(src * 16, src * 16 + 16), i * 16); const k = listB.data[src * 16 + 14]; if (start[k] < 0) start[k] = i; end[k] = i + 1; });
      return { N, data, start, end, ymin: listB.ymin, ymax: listB.ymax };
    })();
  // ---------- the blade clump (A): 20 blades, ranked; culms; plumes ----------
  const BR = mulberry32(1968);
  const BLADES = [];
  for (let k = 0; k < 20; k++) {
    const a = k * 2.39996 + (BR() - 0.5) * 0.5;
    const onCulm = k >= 6 && BR() < 0.35;
    BLADES.push({
      a, r0: 0.02 + BR() * 0.11, h0: onCulm ? 0.25 + BR() * 0.7 : BR() * 0.05,
      th: a + (BR() - 0.5) * 0.8, ph0: 0.04 + BR() * 0.24 + (onCulm ? 0.3 : 0), arch: 0.3 + BR() * 1.3,
      L: k < 7 ? 1.75 + BR() * 0.5 : 1.0 + BR() * 0.9, W: 0.017 + BR() * 0.014, tw: (BR() - 0.5) * 2.6,
      dead: BR() < 0.24, kink: BR() < 0.45 ? 0.35 + BR() * 0.4 : 9, rnd: BR(),
    });
  }
  const CULMS = [];
  for (let k = 0; k < 4; k++) CULMS.push({ a: k * 2.1 + BR(), r0: BR() * 0.06, H: 1.85 + BR() * 0.45, lean: 0.03 + BR() * 0.12, rnd: BR(), plumeSeed: BR() });
  function buildClumpGeo({ nb, segs, culms, culmSegs, strands, strandSegs, leaves = true }) {
    const pos = [], cen = [], bl = [], idx = [];
    const V = THREE.Vector3;
    function strip(points, rank, flag, rnd) {
      const base = pos.length / 3;
      points.forEach(({ p, side, w, t }) => {
        pos.push(p.x - side.x * w / 2, p.y - side.y * w / 2, p.z - side.z * w / 2, p.x + side.x * w / 2, p.y + side.y * w / 2, p.z + side.z * w / 2);
        cen.push(p.x, p.y, p.z, p.x, p.y, p.z);
        bl.push(t, rank, flag, rnd, t, rank, flag, rnd);
      });
      for (let i = 0; i < points.length - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
    function curve(root, th, ph0, arch, L, W, tw, kink, S, profile) {
      const pts = [], p = root.clone(), side0 = new V(-Math.sin(th), 0, Math.cos(th));
      const phAt = (t) => ph0 + arch * Math.pow(t, 1.3) + (t > kink ? 1.4 * smooth(kink, kink + 0.08, t) : 0);
      const dirAt = (t) => { const ph = Math.min(phAt(t), 2.6); return new V(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)); };
      for (let i = 0; i <= S; i++) {
        const t = i / S, d = dirAt(t), tau = tw * t;
        const side = side0.clone().multiplyScalar(Math.cos(tau)).add(new V().crossVectors(d, side0).multiplyScalar(Math.sin(tau))).normalize();
        pts.push({ p: p.clone(), side, w: W * profile(t), t });
        if (i < S) p.addScaledVector(dirAt((i + 0.5) / S), L / S);
      }
      return pts;
    }
    const leafProfile = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.86)), 0.55);
    if (leaves) for (let k = 0; k < nb; k++) {
      const b = BLADES[k];
      const root = new V(Math.cos(b.a) * b.r0, b.h0, Math.sin(b.a) * b.r0);
      strip(curve(root, b.th, b.ph0, b.arch, b.L, b.W, b.tw, b.dead ? b.kink : 9, segs, leafProfile), k / 20, b.dead ? 0.5 : 0, b.rnd);
    }
    for (let k = 0; k < culms; k++) {
      const c = CULMS[k], root = new V(Math.cos(c.a) * c.r0, 0, Math.sin(c.a) * c.r0);
      for (const off of [0, Math.PI / 2]) strip(curve(root, c.a + off, c.lean, 0.05, c.H, 0.013, 0, 9, culmSegs, (t) => 1 - 0.5 * t), 0, 0.5, c.rnd);
      if (strands > 0) {
        const top = curve(root, c.a, c.lean, 0.05, c.H, 0.01, 0, 9, culmSegs, () => 1).pop().p;
        const pr = mulberry32(Math.floor(c.plumeSeed * 1e6));
        for (let s = 0; s < strands; s++) {
          const th = c.a + (s / strands) * TAU + pr() * 0.5;
          strip(curve(top.clone().add(new V(0, -0.02 - pr() * 0.3, 0)), c.a + 0.4 + (pr() - 0.5) * 0.9, 0.05 + pr() * 0.25, 0.4 + pr() * 0.9, 0.22 + pr() * 0.2, 0.014, 0.8, 9, strandSegs, (t) => Math.sin(Math.PI * (0.25 + 0.75 * t))), 0, 1, pr());
        }
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 3));
    g.setAttribute('aBlade', new THREE.Float32BufferAttribute(bl, 4));
    g.setIndex(idx);
    g.userData.tris = idx.length / 3; g.userData.blades = nb;
    return g;
  }
  const geoA0 = buildClumpGeo({ nb: 20, segs: 7, culms: 3, culmSegs: 4, strands: 12, strandSegs: 3 });
  const geoP = buildClumpGeo({ nb: 0, segs: 1, culms: 2, culmSegs: 3, strands: 12, strandSegs: 3, leaves: false });

  // ---------- the painted card atlas (B): 4 variants of 512 x 1024; R = along-blade t, G = shade, B = 0 live / 128 dead / 255 plume ----------
  function paintAtlas() {
    const W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    for (let v = 0; v < 4; v++) {
      const r = mulberry32(400 + v * 17), ox = v * 512;
      g.save(); g.beginPath(); g.rect(ox, 0, 512, H); g.clip();
      const N = 320;
      for (let i = 0; i < N; i++) {
        const depth = i / N, culm = r() < 0.12, dead = !culm && r() < 0.26;
        const bx = 0.5 + (r() - 0.5) * (culm ? 0.3 : 0.5);
        let ang = (r() - 0.5) * (culm ? 0.12 : 0.8) + (bx - 0.5) * 0.8;
        const len = culm ? 0.8 + r() * 0.18 : 0.42 + r() * 0.55;
        const arch = culm ? (r() - 0.5) * 0.1 : Math.sign(ang || 1) * (0.25 + r() * 1.7) * (r() < 0.88 ? 1 : -0.6);
        const w0 = culm ? 0.008 : 0.009 + r() * 0.01; // fraction of cell width
        const kink = dead && r() < 0.5 ? 0.35 + r() * 0.4 : 9;
        const shade = clamp(0.42 + 0.58 * depth * (0.75 + 0.25 * r()) + (dead ? 0.08 : 0), 0, 1);
        const flag = dead || culm ? 128 : 0;
        const S = 26; let x = bx, y = 0.0, pts = [];
        for (let k = 0; k <= S; k++) {
          const t = k / S; pts.push([x, y, t]);
          const a = ang + arch * Math.pow(t, 1.4) + Math.sign(arch || 1) * 0.55 * smooth(kink, kink + 0.2, t);
          x += Math.sin(a) * len / S * 1.1; y += Math.cos(a) * len / S; // cards are 1.8 m wide by 2 m: x in cell widths
          if (x < 0.01 || x > 0.99 || y > 0.995 || y < 0) break;
        }
        if (pts.length < 3) continue;
        // one smooth polygon per blade; R (t) as a gradient from root to tip
        const left = [], right = [];
        for (let k = 0; k < pts.length; k++) {
          const [x0, y0, t0] = pts[k], [x1, y1] = pts[Math.min(k + 1, pts.length - 1)], [xm, ym] = pts[Math.max(k - 1, 0)];
          const wt = w0 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + t0 * 0.85)), 0.6);
          const dx = (x1 - xm) * 512, dy = (y1 - ym) * H, l = Math.hypot(dx, dy) || 1, nx = -dy / l * wt * 512 / 2, ny = dx / l * wt * 512 / 2;
          const X = ox + x0 * 512, Y = H - y0 * H;
          left.push([X - nx, Y + ny]); right.push([X + nx, Y - ny]);
        }
        const [xa, ya] = pts[0], [xb, yb, tb] = pts[pts.length - 1];
        const grd = g.createLinearGradient(ox + xa * 512, H - ya * H, ox + xb * 512, H - yb * H);
        grd.addColorStop(0, `rgb(0,${Math.round(shade * 255)},${flag})`); grd.addColorStop(1, `rgb(${Math.round(tb * 255)},${Math.round(shade * 255)},${flag})`);
        g.fillStyle = grd; g.beginPath();
        left.forEach(([X, Y], k) => (k ? g.lineTo(X, Y) : g.moveTo(X, Y)));
        for (let k = right.length - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
        g.closePath(); g.fill();
      }
      for (let p = 0; p < 0; p++) { // painted tufts read as solid white sheets; the 3D plume stems do this job
        if (r() < 0.4) continue;
        const px = 0.35 + r() * 0.3, py = 0.82 + r() * 0.12;
        for (let s = 0; s < 70; s++) {
          const a = (r() - 0.5) * 1.6 + 0.3, l = 0.02 + r() * 0.07, x0 = px + (r() - 0.5) * 0.04, y0 = py - r() * 0.1;
          g.strokeStyle = `rgb(${Math.round((0.9 + r() * 0.1) * 255)},${Math.round((0.8 + r() * 0.2) * 255)},255)`; g.lineWidth = 2 + r() * 2;
          g.beginPath(); g.moveTo(ox + x0 * 512, H - y0 * H); g.lineTo(ox + (x0 + Math.sin(a) * l * 0.6) * 512, H - (y0 + Math.cos(a) * l) * H); g.stroke();
        }
      }
      g.restore();
    }
    // push-pull so colours under transparent texels are their neighbours' (mipmaps then keep their meaning)
    const img = g.getImageData(0, 0, W, H).data;
    const levels = []; let w = W, h = H;
    let L0 = { w, h, c: new Float32Array(w * h * 3), a: new Float32Array(w * h) };
    for (let i = 0; i < w * h; i++) { const a = img[i * 4 + 3] / 255; L0.a[i] = a; for (let k = 0; k < 3; k++) L0.c[i * 3 + k] = img[i * 4 + k]; }
    levels.push(L0);
    while (w > 1 && h > 1) {
      const pw = w, nw = w >> 1, nh = h >> 1, prev = levels[levels.length - 1], L = { w: nw, h: nh, c: new Float32Array(nw * nh * 3), a: new Float32Array(nw * nh) };
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        let sa = 0, s0 = 0, s1 = 0, s2 = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const j = (y * 2 + dy) * pw + x * 2 + dx, a = prev.a[j]; sa += a; s0 += prev.c[j * 3] * a; s1 += prev.c[j * 3 + 1] * a; s2 += prev.c[j * 3 + 2] * a; }
        const i = y * nw + x; L.a[i] = sa / 4; if (sa > 0) { L.c[i * 3] = s0 / sa; L.c[i * 3 + 1] = s1 / sa; L.c[i * 3 + 2] = s2 / sa; }
      }
      levels.push(L); w = nw; h = nh;
    }
    for (let l = levels.length - 2; l >= 0; l--) {
      const L = levels[l], Pn = levels[l + 1];
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x; if (L.a[i] > 0.02) continue;
        const j = Math.min(Pn.h - 1, y >> 1) * Pn.w + Math.min(Pn.w - 1, x >> 1);
        L.c[i * 3] = Pn.c[j * 3]; L.c[i * 3 + 1] = Pn.c[j * 3 + 1]; L.c[i * 3 + 2] = Pn.c[j * 3 + 2];
      }
    }
    const out = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { out[i * 4] = L0.c[i * 3]; out[i * 4 + 1] = L0.c[i * 3 + 1]; out[i * 4 + 2] = L0.c[i * 3 + 2]; out[i * 4 + 3] = img[i * 4 + 3]; }
    const tex = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
    window.__atlasCanvas = cv;
    return tex;
  }
  U.uAtlas = { value: paintAtlas() };
  // three crossed fan cards per clump, 2 m tall, narrow at the root, 1.6 m wide at the top
  function buildCardGeo() {
    const pos = [], uvs = [], bl = [], idx = [], ROWS = 4, r = mulberry32(77);
    for (let c = 0; c < 3; c++) {
      const ang = c * Math.PI / 3 + (r() - 0.5) * 0.25, cx = Math.cos(ang), sz = Math.sin(ang), base = pos.length / 3;
      for (let j = 0; j <= ROWS; j++) {
        const v = j / ROWS, y = 2.0 * v, hw = 0.9; // rectangular: a trapezoid card warps the texture affinely across its diagonal (zigzag blades)
        for (const s of [-1, 1]) { pos.push(cx * hw * s, y, sz * hw * s); uvs.push((s + 1) / 2, v); bl.push(v, c, ang, r()); }
      }
      for (let j = 0; j < ROWS; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('aBlade', new THREE.Float32BufferAttribute(bl, 4));
    g.setIndex(idx); g.userData.tris = idx.length / 3; g.userData.blades = 0; return g;
  }
  const geoB = buildCardGeo();

  // ---------- grass shader (injected into MeshStandardMaterial so it takes the scene's light, fog and shadow) ----------
  const GRASS_VERT_PARS = `
    attribute vec4 iA; attribute vec4 iB; attribute vec4 iC; attribute vec4 iD;
    attribute vec4 aBlade;
    #ifdef GRASS_CARD
      attribute vec2 aUv; varying vec2 vGUv; varying vec4 vGInfo; varying float vVariant; varying float vFace;
    #else
      attribute vec3 aCenter;
    #endif
    uniform float uTime; uniform float uLanes; uniform float uWiden; uniform vec3 uCam; uniform vec4 uRange; uniform vec3 uShrink; uniform vec3 uSunDir;
    uniform vec3 uCBase, uCBody, uCTop, uCTip, uCDead0, uCDead1, uCPlume;
    varying vec3 vGCol; varying float vFade; varying float vTrans;
    vec3 gPos; vec3 gNrm;
    vec3 grassPalette(float t, float dry, float flag) {
      float split = mix(0.66, 0.2, dry);
      vec3 c = mix(uCBase, uCBody, smoothstep(0.0, split, t));
      c = mix(c, uCTop, smoothstep(split, min(split + 0.42, 1.0), t));
      c = mix(c, uCTip, smoothstep(0.8, 1.0, t) * 0.7);
      vec3 d = mix(uCDead0, uCDead1, smoothstep(0.0, 0.8, t));
      c = mix(c, d, clamp(flag * 2.0, 0.0, 1.0));
      return 0.68 * mix(c, uCPlume, clamp(flag * 2.0 - 1.0, 0.0, 1.0));
    }
    vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
    vec3 rotAxis(vec3 p, vec3 k, float a) { float c = cos(a), s = sin(a); return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c); }
    void grassMain() {
      vec3 ip = iA.xyz;
      float dist = distance(ip, uCam);
      float seed = iC.z;
      float tr = iC.w * uLanes;
      float skip = (iD.y > 0.5 && iD.y < 1.5 && uLanes > 0.5) ? 1.0 : 0.0;
      float low = (iD.y > 1.5 && uLanes < 0.5) ? 0.5 : 1.0;
      float inRange = step(uRange.x, dist) * (1.0 - step(uRange.y, dist)) * (1.0 - skip);
      float t = aBlade.x;
      #ifdef GRASS_CARD
        vec3 c = position;
        vec3 p = c * vec3(iB.x, iB.y, iB.x);
        float hRest = aBlade.x;
      #else
        vec3 c = aCenter;
        float rank = aBlade.y, flag = aBlade.z;
        float nb = 12.0 + floor(seed * 9.0);
        float keep = 1.0 - step(nb - 0.5, rank * 20.0);
        keep *= 1.0 - smoothstep(uShrink.x, uShrink.y, dist) * step(uShrink.z - 0.001, rank);
        if (flag > 0.75) keep *= step(fract(seed * 5.13), 0.2);
        float w = keep * (1.0 + max(0.0, dist - 10.0) * uWiden * (flag > 0.75 ? 0.35 : 1.0));
        vec3 p = c * vec3(iB.x, iB.y, iB.x) + (position - c) * w;
        float hRest = clamp(c.y / 1.9, 0.0, 1.0);
      #endif
      p.y *= (1.0 - 0.62 * tr) * low;
      p = rotY(p, iA.w);
      float la = iB.z + tr * 1.2;
      float ld = tr > 0.01 ? iD.x : iB.w;
      p = rotAxis(p, vec3(-sin(ld), 0.0, cos(ld)), -la);
      // wind: two travelling sine fields, a gust band, and a flutter; tops move, bases stay
      float hN = clamp(p.y / 2.1, 0.0, 1.2);
      vec2 wd = normalize(vec2(1.0, 0.32));
      float w1 = sin(dot(ip.xz, vec2(0.075, 0.03)) - uTime * 1.25);
      float w2 = sin(dot(ip.xz, vec2(-0.035, 0.11)) - uTime * 0.83 + 1.7);
      float gb = 0.5 + 0.5 * sin(dot(ip.xz, wd) * 0.045 - uTime * 0.62 + 1.5 * sin(dot(ip.xz, vec2(-wd.y, wd.x)) * 0.05 + uTime * 0.07));
      float gust = gb * gb * gb * gb;
      float s = 0.09 + 0.05 * w1 + 0.035 * w2 + 0.4 * gust;
      float fl = sin(uTime * (2.7 + seed * 2.2) + seed * 40.0 + t * 2.5) * (0.025 + 0.07 * gust);
      vec2 off = (wd * s + vec2(-wd.y, wd.x) * fl) * (1.0 - 0.75 * tr);
      float bend = hN * hN;
      p.xz += off * bend * 1.5;
      p.y -= dot(off, off) * bend * 0.9;
      gPos = inRange > 0.5 ? ip + p : vec3(0.0, -2000.0, 0.0);
      // a rounded tussock normal: outward from the clump axis and up (both faces lit alike)
      vec2 rad = c.xz / (length(c.xz) + 0.3);
      gNrm = normalize(rotY(vec3(rad.x * 1.1 + (aBlade.w - 0.5) * 0.6, 0.7, rad.y * 1.1 + (fract(aBlade.w * 7.3) - 0.5) * 0.6), iA.w));
      #if FADE_MODE == 1
        vFade = 1.0 - smoothstep(uRange.z, uRange.w, dist);
      #elif FADE_MODE == 2
        vFade = smoothstep(uRange.z, uRange.w, dist);
      #else
        vFade = 1.0;
      #endif
      vTrans = pow(max(0.0, dot(normalize(gPos - uCam), uSunDir)), 4.0) * smoothstep(0.15, 0.9, hRest);
      float ao = mix(0.16, 1.0, smoothstep(0.0, 0.85, hRest)) * (1.0 + 0.25 * tr);
      vec3 tintV = vec3(1.0 + 0.10 * (iC.y - 0.5), 1.0 + 0.05 * (iC.y - 0.5), 1.0 - 0.10 * (iC.y - 0.5)) * (0.86 + 0.28 * fract(seed * 7.7));
      #ifdef GRASS_CARD
        vGUv = aUv; vGInfo = vec4(hRest, iC.x, ao, tr); vVariant = mod(aBlade.y + floor(seed * 4.0), 4.0);
        vec3 cn = rotY(vec3(-sin(aBlade.z), 0.0, cos(aBlade.z)), iA.w);
        vec3 vd = normalize(uCam - gPos); vFace = abs(dot(vd, cn)) + 0.7 * max(0.0, vd.y - 0.6);
        vGCol = tintV;
      #else
        vGCol = grassPalette(t, iC.x, flag) * tintV * ao * (0.84 + 0.32 * aBlade.w) * mix(vec3(1.0), vec3(1.02, 0.95, 0.8), tr);
      #endif
    }
  `;
  const GRASS_FRAG_PARS = `
    varying vec3 vGCol; varying float vFade; varying float vTrans;
    uniform vec3 uSunCol;
    #ifdef GRASS_CARD
      varying vec2 vGUv; varying vec4 vGInfo; varying float vVariant; varying float vFace;
      uniform sampler2D uAtlas;
      uniform vec3 uCBase, uCBody, uCTop, uCTip, uCDead0, uCDead1, uCPlume;
      vec3 grassPalette(float t, float dry, float flag) {
        float split = mix(0.66, 0.2, dry);
        vec3 c = mix(uCBase, uCBody, smoothstep(0.0, split, t));
        c = mix(c, uCTop, smoothstep(split, min(split + 0.42, 1.0), t));
        c = mix(c, uCTip, smoothstep(0.8, 1.0, t) * 0.7);
        vec3 d = mix(uCDead0, uCDead1, smoothstep(0.0, 0.8, t));
        c = mix(c, d, clamp(flag * 2.0, 0.0, 1.0));
        return 0.6 * mix(c, uCPlume, clamp(flag * 2.0 - 1.0, 0.0, 1.0));
      }
    #endif
    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  `;
  const GRASS_COLOR_FRAG = `
    #ifdef GRASS_CARD
      vec2 auv = vec2((vVariant + vGUv.x) * 0.25, 1.0 - vGUv.y);
      vec4 tx = texture2D(uAtlas, auv);
      vec2 tp = auv * vec2(2048.0, 1024.0);
      float mip = max(0.0, 0.25 * log2(max(dot(dFdx(tp), dFdx(tp)) * dot(dFdy(tp), dFdy(tp)), 1e-8)));
      float ga = tx.a * min(1.0 + mip * 0.18, 1.6) * smoothstep(0.08, 0.4, vFace);
      ga = (ga - 0.5) / max(fwidth(ga), 0.0001) + 0.5;
      if (ga < 0.01) discard;
      // texture t is along each painted blade; also darken toward the card root (the clump core)
      float t = tx.r;
      vec3 gc = grassPalette(t, vGInfo.y, tx.b) * vGCol * vGInfo.z * (0.12 + 0.78 * tx.g) * 0.85;
      gc *= mix(vec3(1.0), vec3(1.02, 0.95, 0.8), vGInfo.w);
      diffuseColor = vec4(gc, clamp(ga, 0.0, 1.0));
    #else
      diffuseColor.rgb = vGCol;
    #endif
    float gz = ign(gl_FragCoord.xy);
    #if FADE_MODE == 1
      if (gz >= vFade) discard;
    #elif FADE_MODE == 2
      if (gz < 1.0 - vFade) discard;
    #endif
  `;
  function grassMaterial({ card = false, fadeMode = 0, range = [0, 1e6, 0, 1], shrink = [1e6, 1e6, 2], widen = 0.03, receive = false }) {
    const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
    m.defines = { FADE_MODE: fadeMode }; if (card) m.defines.GRASS_CARD = '';
    if (card) { m.alphaToCoverage = true; m.extensions = { derivatives: true }; }
    const own = { uRange: { value: new THREE.Vector4(...range) }, uShrink: { value: new THREE.Vector3(...shrink) }, uWiden: { value: widen } };
    m.userData.own = own; m.userData.receive = receive;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, own);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + GRASS_VERT_PARS)
        .replace('#include <color_vertex>', 'grassMain();')
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = gNrm;')
        .replace('#include <begin_vertex>', 'vec3 transformed = gPos;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + GRASS_FRAG_PARS)
        .replace('#include <color_fragment>', GRASS_COLOR_FRAG)
        .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize(vNormal); vec3 geometryNormal = normal;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSunCol * vTrans * 0.55;')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular *= 0.12; reflectedLight.indirectSpecular *= 0.12;');
    };
    m.customProgramCacheKey = () => 'grass' + (card ? 'C' : 'B') + fadeMode;
    return m;
  }

  class Bucket {
    constructor(name, list, geo, mat) {
      this.name = name; this.list = list; this.mat = mat;
      const g = geo.clone(); g.instanceCount = 0; this.geo = g; this.baseTris = geo.userData.tris; this.bladesPer = geo.userData.blades;
      this.arr = []; for (const k of ['iA', 'iB', 'iC', 'iD']) { const a = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.N) * 4), 4); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); this.arr.push(a); }
      this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.receiveShadow = !!mat.userData.receive; this.mesh.visible = false; scene.add(this.mesh);
      this.n = 0; this.blades = 0; this.clumps = 0;
    }
    get range() { return this.mat.userData.own.uRange.value; }
    fill(frustum, cam, lanes) {
      const L = this.list, R = this.range, box = new THREE.Box3(); let n = 0;
      const A = this.arr.map((a) => a.array);
      const lo = R.x, hi = R.y;
      this.blades = 0; this.clumps = 0;
      for (let cz = 0; cz < NCH; cz++) for (let cx = 0; cx < NCH; cx++) {
        const k = cz * NCH + cx, s = L.start[k]; if (s < 0) continue;
        const x0 = -FIELD + cx * CH, z0 = -FIELD + cz * CH;
        box.min.set(x0 - 2.5, L.ymin[k] - 0.5, z0 - 2.5); box.max.set(x0 + CH + 2.5, L.ymax[k] + 0.5, z0 + CH + 2.5);
        const dmin = box.distanceToPoint(cam), dmax = Math.hypot(Math.max(Math.abs(cam.x - box.min.x), Math.abs(cam.x - box.max.x)), Math.max(Math.abs(cam.y - box.min.y), Math.abs(cam.y - box.max.y)), Math.max(Math.abs(cam.z - box.min.z), Math.abs(cam.z - box.max.z)));
        if (dmax < lo || dmin >= hi || !frustum.intersectsBox(box)) continue;
        const e = L.end[k];
        for (let i = s; i < e; i++) {
          const o = i * 16, d = Math.hypot(L.data[o] - cam.x, L.data[o + 1] - cam.y, L.data[o + 2] - cam.z), sk = L.data[o + 13];
          if (d < lo || d >= hi || (sk === 1 && lanes)) continue;
          A[0].set(L.data.subarray(o, o + 4), n * 4); A[1].set(L.data.subarray(o + 4, o + 8), n * 4); A[2].set(L.data.subarray(o + 8, o + 12), n * 4); A[3].set(L.data.subarray(o + 12, o + 16), n * 4);
          n++; this.clumps++;
          if (this.bladesPer) { const nb = 12 + Math.floor(L.data[o + 10] * 9); const sh = this.mat.userData.own.uShrink.value; this.blades += Math.min(nb, d > sh.y ? Math.round(sh.z * 20) : this.bladesPer); }
        }
      }
      this.n = n; this.geo.instanceCount = n;
      for (const a of this.arr) { a.updateRange.offset = 0; a.updateRange.count = n * 4; a.needsUpdate = true; }
    }
  }
    const BUCKETS = [
      new Bucket('C blades', listA, geoA0, grassMaterial({ fadeMode: 1, range: [0, 29, 21, 29], receive: true })),
      new Bucket('C cards', listB, geoB, grassMaterial({ card: true, fadeMode: 2, range: [21, 1e6, 21, 29] })),
      new Bucket('C plumes', listP, geoP, grassMaterial({ fadeMode: 2, range: [21, 90, 21, 29] })),
    ];
    const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), lastCam = new THREE.Vector3(1e9, 0, 0), lastQ = new THREE.Quaternion();
    return {
      U, BUCKETS,
      update(camera, t) {
        U.uTime.value = t;
        // refill the instance lists when the camera has moved (the study did this on camera change)
        if (camera.position.distanceToSquared(lastCam) > 0.25 || camera.quaternion.angleTo(lastQ) > 0.05) {
          camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
          U.uCam.value.copy(camera.position);
          for (const b of BUCKETS) { b.fill(frustum, camera.position, true); b.mesh.visible = b.n > 0; }
          lastCam.copy(camera.position); lastQ.copy(camera.quaternion);
        }
      },
      stats() { return BUCKETS.reduce((s, b) => s + b.n, 0); },
    };
  }
})();
