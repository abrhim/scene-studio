// works.js: the works of the battle (DESIGN.md 2, 7): the 1/9 perimeter and CP on Hill 689 with its LZ, the rocket
// scars of 1435 (chapters 6-11), the NVA bunkers, spider holes and trenches on the ridge (hidden in chapters 1-2,
// revealed from 3), the landing zones, the radio masts (relay, Khe Sanh base, the Army hill) and the Hill 552 marker.
// Everything is true human size on the 1/3 land, vertex-coloured, one material, merged per layer (7 draws).
//
// Shared data, for fire.js, radio.js, land.js and the marines (on the plug-in object, also window.WORKS and ctx.works;
// computed when this script loads, so it is there even under ?only= without works):
//   works.slits   [{ id, group ('arc' | 'north' | 'second'), pos: Vector3 (slit mouth), dir: Vector3 (unit, level, outward) }]
//   works.masts   { relay, base, army, cp }: Vector3 antenna tips (cp = the tallest CP antenna); masts.feet the same at ground
//   works.spiderHoles [{ id, group ('crest' | 'lz'), pos }]   ('lz' = within 12 m of the CH-46's landing point)
//   works.holes   [{ pos, out }]  689 fighting holes (out = outward unit vector);  works.cpTable { pos, rotY, w, d }
//   works.lz      { czlz: [padA, padB], alz, lz689, ch46 }: touchdown points;  works.clearings [{ x, z, r, kind, from }]
(function () {
  'use strict';
  const ctx0 = window.Scene.ctx;
  const { THREE, SITE, C } = ctx0;
  const G = ctx0.groundY;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const R = rng(16041968);
  const rr = (a, b) => a + (b - a) * R();
  const DEG = Math.PI / 180;
  const sm = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

  const WORKS = { name: 'works', slits: [], masts: {}, spiderHoles: [], holes: [], clearings: [], bunkers: [], lz: {}, cpTable: null };
  window.WORKS = WORKS;
  ctx0.works = WORKS;

  // ---------- layout (pure data) ----------
  const S6 = SITE.battleSummit;
  const flatness = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = 0; a < 6; a++) { const y = G(x + Math.cos(a * 60 * DEG) * r, z + Math.sin(a * 60 * DEG) * r); lo = Math.min(lo, y); hi = Math.max(hi, y); } return hi - lo; };
  function bestPads(c, n, rad, sep) {
    const cand = [];
    for (let dx = -rad; dx <= rad; dx += 2) for (let dz = -rad; dz <= rad; dz += 2) if (dx * dx + dz * dz <= rad * rad) cand.push({ x: c.x + dx, z: c.z + dz, f: flatness(c.x + dx, c.z + dz, 4) + 0.02 * Math.hypot(dx, dz) });
    cand.sort((a, b) => a.f - b.f);
    const out = [];
    for (const p of cand) { if (out.every((q) => Math.hypot(q.x - p.x, q.z - p.z) >= sep)) out.push(p); if (out.length === n) break; }
    return out.map((p) => V(p.x, G(p.x, p.z), p.z));
  }
  WORKS.lz.czlz = bestPads(SITE.czlz, 2, 15, 18);
  WORKS.lz.alz = bestPads(SITE.alz, 1, 12, 0)[0];
  WORKS.lz.lz689 = SITE.lz689.clone();
  WORKS.lz.ch46 = SITE.routes.ch46[1].clone();

  // bunkers on the ridge: the horseshoe (9), the north end (3), the second position (3)
  const ridgeBunkers = [];
  SITE.bunkerArc.forEach((p, i) => {
    const ox = p.x - S6.x, oz = p.z - S6.z, l = Math.hypot(ox, oz) || 1;
    const a = Math.atan2(oz / l, ox / l) + (i % 2 ? 0.45 : -0.45);   // turned alternately so the fields cross
    let bx = p.x + ox / l * 2, bz = p.z + oz / l * 2;
    // the arc's south-east end runs into Charlie's ground (Himmer's fall point, the six-man crater, the pause): those
    // bunkers stand 9 m further up the slope, toward the summit (integration; placements are ours)
    if ([SITE.himmerFall, SITE.craterSix, SITE.charliePause].some((q) => Math.hypot(q.x - bx, q.z - bz) < 10)) { bx -= ox / l * 9; bz -= oz / l * 9; }
    ridgeBunkers.push({ id: 'arc' + (i + 1), group: 'arc', x: bx, z: bz, dx: Math.cos(a), dz: Math.sin(a) });
  });
  {
    const toward = (from, to) => { const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz); return [dx / l, dz / l]; };
    const nd = toward(SITE.northEnd, SITE.alz);
    [[-7, -1], [0, 2], [7, -1]].forEach(([u, w], i) => {
      const x = SITE.northEnd.x - nd[1] * u + nd[0] * w, z = SITE.northEnd.z + nd[0] * u + nd[1] * w;
      ridgeBunkers.push({ id: 'north' + (i + 1), group: 'north', x, z, dx: nd[0], dz: nd[1] });
    });
    const sd = toward(SITE.secondPosition, SITE.himmerFall);
    [[-6, 0], [0, 2.5], [6, 0]].forEach(([u, w], i) => {
      const x = SITE.secondPosition.x - sd[1] * u + sd[0] * w, z = SITE.secondPosition.z + sd[0] * u + sd[1] * w;
      ridgeBunkers.push({ id: 'second' + (i + 1), group: 'second', x, z, dx: sd[0], dz: sd[1] });
    });
  }
  // the mound's front face at slit height (local z 1.72, scaled 0.9)
  for (const b of ridgeBunkers) {
    const f = 1.8, sx = b.x + b.dx * f, sz = b.z + b.dz * f;
    WORKS.slits.push({ id: b.id, group: b.group, pos: V(sx, G(sx, sz) + 0.4, sz), dir: V(b.dx, 0, b.dz) });
    WORKS.bunkers.push({ id: b.id, group: b.group, pos: V(b.x, G(b.x, b.z), b.z), dir: V(b.dx, 0, b.dz) });
    WORKS.clearings.push({ x: sx + b.dx * 2, z: sz + b.dz * 2, r: 3, kind: 'slit', from: 3 });
  }
  // spider holes: over the crest, and round the CH-46's landing point
  {
    const near = (x, z, d) => ridgeBunkers.some((b) => Math.hypot(b.x - x, b.z - z) < d) || WORKS.spiderHoles.some((s) => Math.hypot(s.pos.x - x, s.pos.z - z) < d * 0.6);
    let n = 0, tries = 0;
    while (n < 26 && tries++ < 2000) {
      const a = rr(0, Math.PI * 2), r = Math.sqrt(R()) * 46, x = S6.x + Math.cos(a) * r, z = S6.z + Math.sin(a) * r;
      if (near(x, z, 5)) continue;
      WORKS.spiderHoles.push({ id: 'sh' + (++n), group: 'crest', pos: V(x, G(x, z), z) });
    }
    const L = WORKS.lz.ch46;
    let m = 0; tries = 0;
    while (m < 10 && tries++ < 2000) {
      const a = rr(0, Math.PI * 2), r = rr(5, 12), x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r;
      if (near(x, z, 3.5)) continue;
      WORKS.spiderHoles.push({ id: 'sh' + (n + ++m), group: 'lz', pos: V(x, G(x, z), z) });
    }
  }
  // the spider holes nva.js lifts lids on (and fire.js fires from in chapter 11), by one rule shared by the three files
  WORKS.nvaHoles = (which) => {
    const d = (h, p) => Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
    const crest = (p) => WORKS.spiderHoles.filter((h) => h.group === 'crest' && !WORKS.slits.some((s) => Math.hypot(s.pos.x - h.pos.x, s.pos.z - h.pos.z) < 5)).sort((a, b) => d(a, p) - d(b, p));
    const lz = SITE.routes.ch46[1];
    const h11 = WORKS.spiderHoles.filter((h) => h.group === 'lz').sort((a, b) => d(a, lz) - d(b, lz)).slice(0, 4);
    if (which === 'lz') return h11;
    return [...crest(SITE.northEnd).slice(0, 2), ...crest(SITE.charliePause).slice(0, 2), ...h11];
  };
  // 689: fighting holes on the perimeter line, five bunkers in the gaps
  const P = SITE.perimeter;
  const out = (b) => [Math.sin(b * DEG), -Math.cos(b * DEG)];
  const PB = [30, 110, 200, 250, 320];
  for (let b = 0; b < 360; b += 10) {
    if (PB.some((q) => Math.abs(((b - q + 540) % 360) - 180) < 6)) continue;
    const bb = b + rr(-2.5, 2.5), r = P.rAt(bb) - 1 + rr(-1.5, 1.5), o = out(bb);
    WORKS.holes.push({ pos: V(o[0] * r, G(o[0] * r, o[1] * r), o[1] * r), out: V(o[0], 0, o[1]) });
  }
  WORKS.cpTable = { pos: SITE.cp.clone(), rotY: 0.35, w: 2.2, d: 1.0 };
  WORKS.clearings.push({ x: 0, z: 0, r: 999, kind: 'perimeter', from: 1, inside: (x, z) => Math.hypot(x, z) < P.rAt((Math.atan2(x, -z) / DEG + 360) % 360) + 6 });
  for (const p of [WORKS.lz.lz689, WORKS.lz.alz, ...WORKS.lz.czlz]) WORKS.clearings.push({ x: p.x, z: p.z, r: 9, kind: 'lz', from: p === WORKS.lz.alz ? 3 : p === WORKS.lz.lz689 ? 1 : 6 });
  // masts: tips
  const MH = { relay: 24, base: 50, army: 18 };
  for (const k of ['relay', 'base', 'army']) {
    const f = SITE[k === 'relay' ? 'relayMast' : k === 'army' ? 'armyMast' : 'base'];
    WORKS.masts[k] = V(f.x, f.y + MH[k], f.z);
  }
  const CPA = { x: SITE.cp.x + 5.5, z: SITE.cp.z - 4.5, h: 9.5 };
  WORKS.masts.cp = V(CPA.x, G(CPA.x, CPA.z) + CPA.h, CPA.z);
  WORKS.masts.feet = { relay: SITE.relayMast.clone(), base: SITE.base.clone(), army: SITE.armyMast.clone(), cp: V(CPA.x, G(CPA.x, CPA.z), CPA.z) };

  // ---------- geometry ----------
  const layers = {};
  const L_ = (n) => layers[n] || (layers[n] = { pos: [], col: [] });
  const colCache = new Map();
  const rgb = (hex) => { let c = colCache.get(hex); if (!c) { const k = new THREE.Color(hex).convertSRGBToLinear(); c = [k.r, k.g, k.b]; colCache.set(hex, c); } return c; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  const th = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };

  // a piece: geometry placed at x, y, z (o.ry, o.rx, o.rz, o.s / sx sy sz, o.q), coloured per triangle:
  // hex or o.color(cx, cy, cz, ny) → hex; shade lerps o.lo (0.68) → 1 from the piece's bottom to top; undersides darker.
  // o.drape: y is height above the ground (each vertex rides on groundY), minus o.sink.
  function piece(layer, geo, hex, x, y, z, o) {
    o = o || {};
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (o.q) _q.copy(o.q); else { _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); }
    const s = o.s || 1;
    _s.set(o.sx || s, o.sy || s, o.sz || s);
    _m.compose(_p.set(x, o.drape ? 0 : y, z), _q, _s);
    g.applyMatrix4(_m);
    const A = g.attributes.position.array;
    if (o.drape) for (let i = 0; i < A.length; i += 3) A[i + 1] += G(A[i], A[i + 2]) + y - (o.sink || 0);
    let y0 = 1e9, y1 = -1e9;
    for (let i = 1; i < A.length; i += 3) { y0 = Math.min(y0, A[i]); y1 = Math.max(y1, A[i]); }
    if (o.drape) { y0 = 0; y1 = 1; }
    const lay = L_(layer), lo = o.lo !== undefined ? o.lo : 0.68, tone = 1 + (R() - 0.5) * (o.tone !== undefined ? o.tone : 0.1);
    for (let i = 0; i < A.length; i += 9) {
      const cx = (A[i] + A[i + 3] + A[i + 6]) / 3, cy = (A[i + 1] + A[i + 4] + A[i + 7]) / 3, cz = (A[i + 2] + A[i + 5] + A[i + 8]) / 3;
      _a.set(A[i + 3] - A[i], A[i + 4] - A[i + 1], A[i + 5] - A[i + 2]);
      _b.set(A[i + 6] - A[i], A[i + 7] - A[i + 1], A[i + 8] - A[i + 2]);
      _a.cross(_b).normalize();
      const c = rgb(o.color ? o.color(cx, cy, cz, _a.y) : hex);
      let k = o.drape ? lo + (1 - lo) * Math.min(1, Math.max(0, (cy - G(cx, cz) + (o.sink || 0)) / (o.dh || 1.4))) : lo + (1 - lo) * Math.min(1, Math.max(0, (cy - y0) / Math.max(0.01, y1 - y0)));
      if (_a.y < -0.3) k *= 0.6;
      k *= tone * (0.97 + 0.06 * th(cx, cy, cz));
      for (let j = 0; j < 9; j++) lay.pos.push(A[i + j]);
      for (let j = 0; j < 3; j++) lay.col.push(c[0] * k, c[1] * k, c[2] * k);
    }
    g.dispose();
  }
  function rod(layer, ax, ay, az, bx, by, bz, r, hex, o) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
    const q = new THREE.Quaternion().setFromUnitVectors(UPV, _a.set(dx / len, dy / len, dz / len));
    piece(layer, new THREE.CylinderGeometry(r * ((o && o.taper) || 1), r, len, (o && o.sides) || 5), hex, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, Object.assign({ q, lo: 0.85 }, o));
  }
  // a flat patch that lies on the ground: rings of a fan, jagged edge, colour per triangle (hex or fn(i, ring))
  function patch(layer, cx, cz, r, hex, o) {
    o = o || {};
    const n = o.n || 14, rings = o.rings || 3, lift = o.lift || 0.08, sx = o.sx || 1, sz = o.sz || 1, ry = o.ry || 0, jag = o.jag !== undefined ? o.jag : 0.25, r0 = o.r0 || 0;
    const seed = R() * 100, lay = L_(layer);
    const pt = (i, ring) => {
      const a = i / n * Math.PI * 2, f = ring / rings, j = ring === rings ? 1 - jag * th(i, seed, 1) : 1;
      const rad = (r0 + (r - r0) * f) * j, lx = Math.cos(a) * rad * sx, lz = Math.sin(a) * rad * sz;
      const x = cx + lx * Math.cos(ry) - lz * Math.sin(ry), z = cz + lx * Math.sin(ry) + lz * Math.cos(ry);
      return [x, G(x, z) + lift, z];
    };
    const push = (a, b, c, hx) => {
      _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); _a.cross(_b);
      if (_a.y < 0) { const t = b; b = c; c = t; }
      const col = rgb(hx), k = 0.95 + 0.08 * th(a[0], a[2], seed);
      lay.pos.push(...a, ...b, ...c);
      for (let j = 0; j < 3; j++) lay.col.push(col[0] * k, col[1] * k, col[2] * k);
    };
    const colAt = (i, ring) => (typeof hex === 'function' ? hex(i, ring) : hex);
    const ctr = r0 > 0 ? null : [cx, G(cx, cz) + lift, cz];
    for (let ring = r0 > 0 ? 1 : 1; ring <= rings; ring++) for (let i = 0; i < n; i++) {
      if (ring === 1 && ctr) push(ctr, pt(i, 1), pt(i + 1, 1), colAt(i, 1));
      else if (ring > 1 || !ctr) {
        const pr = r0 > 0 && ring === 1 ? 0 : ring - 1;
        const a = pt(i, pr), b = pt(i + 1, pr), c = pt(i + 1, ring), d = pt(i, ring);
        push(a, b, c, colAt(i, ring)); push(a, c, d, colAt(i, ring));
      }
    }
  }
  // a ribbon on the ground along points (trenches)
  function ribbon(layer, pts, w, hex, lift) {
    const lay = L_(layer), col = rgb(hex), seq = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 1.2)); for (let k = 0; k < n; k++) seq.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }); }
    seq.push(pts[pts.length - 1]);
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      const q = [[a.x + nx, a.z + nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz], [a.x - nx, a.z - nz]].map(([x, z]) => [x, G(x, z) + lift, z]);
      for (const [p0, p1, p2] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]) {
        _a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); _b.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]); _a.cross(_b);
        const tri = _a.y < 0 ? [p0, p2, p1] : [p0, p1, p2];
        for (const p of tri) lay.pos.push(...p);
        for (let j = 0; j < 3; j++) lay.col.push(...col);
      }
    }
    return seq;
  }

  // ---------- palette (sRGB; DESIGN.md 1 and ours) ----------
  const K = {
    bagTan: 0xa08b5e, bagOD: 0x76724a, bagDark: 0x5f5c3c, timber: 0x6e5437, timberDark: 0x4d3b28, hole: 0x2a2218,
    earth: 0x8f6a42, laterite: C.laterite, dust: C.dust, scorch: 0x3d3326, poncho: 0x5b6442, crate: 0x646039, crateDark: 0x4c4a2e,
    radio: 0x4b5238, metal: 0x7d8076, metalDark: 0x5a5d55, map: 0xc6bd93, canvas: 0x5f6542, pole: 0x7a6442,
    grass: C.grass, grassTop: C.grassTop, grassDraw: C.grassDraw, trampled: 0x9d9257, trampled2: 0x8c844c,
    orange: 0xdf6a36, cerise: 0xcc4f7a, can: 0x4f5a38, smokeCan: 0x6b6f5c,
  };

  // ---------- builders ----------
  const bagGeos = [0, 1, 2, 3].map((i) => ctx0.jitterGeo(new THREE.BoxGeometry(0.56, 0.2, 0.34), 0.05, 31 + i));
  const bagHex = () => [K.bagTan, K.bagOD, K.bagOD, K.bagDark][Math.floor(R() * 4)];
  function bag(layer, x, y, z, ry, o) { piece(layer, bagGeos[Math.floor(R() * 4)], (o && o.hex) || bagHex(), x, y, z, Object.assign({ ry, lo: 0.75 }, o)); }

  function foxhole(layer, x, z, ox, oz) {
    const a0 = Math.atan2(oz, ox), ry = -a0;
    patch(layer, x, z, 1.35, K.earth, { n: 10, rings: 1, lift: 0.05, jag: 0.2 });
    patch(layer, x, z, 0.8, K.hole, { n: 8, rings: 1, lift: 0.08, sx: 1, sz: 0.62, ry: a0 + Math.PI / 2, jag: 0.05 });
    for (let c = 0; c < 2; c++) {
      const n = c ? 8 : 9;
      for (let i = 0; i < n; i++) {
        const a = a0 + (-140 + 280 * (i + (c ? 0.5 : 0)) / (n - 1 + (c ? 1 : 0))) * DEG, r = 1.12 - c * 0.06;
        const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
        bag(layer, bx, G(bx, bz) + 0.07 + c * 0.19, bz, -a + Math.PI / 2 + rr(-0.1, 0.1));
      }
    }
    void ry;
  }
  // a sandbagged bunker on 689: sandbag walls in courses, a log roof, sandbags on top, a slit outward, a door inward
  function pbunker(layer, x, z, ox, oz, w, d) {
    w = w || 4.2; d = d || 3.2;
    const ry = Math.atan2(ox, oz);
    const courses = (cy) => { const n = Math.floor((cy + 0.4) / 0.2); return n % 3 === 0 ? K.bagTan : n % 3 === 1 ? K.bagOD : K.bagDark; };
    piece(layer, new THREE.BoxGeometry(w, 1.5, d, 3, 7, 3), 0, x, 0.75, z, { ry, drape: true, sink: 0.35, color: (cx, cy, cz) => courses(cy - G(cx, cz)) });
    piece(layer, new THREE.BoxGeometry(w + 0.4, 0.26, d + 0.4, 9, 1, 1), 0, x, 1.28, z, { ry, drape: true, sink: 0.35, color: (cx, cy, cz) => (Math.floor((cx * Math.cos(ry) - cz * Math.sin(ry)) * 2.2) % 2 ? K.timber : K.timberDark) });
    piece(layer, new THREE.BoxGeometry(w + 0.1, 0.34, d + 0.1, 7, 1, 5), 0, x, 1.55, z, { ry, drape: true, sink: 0.35, color: (cx, cy, cz) => ((Math.floor(cx * 1.8) + Math.floor(cz * 2.7)) % 2 ? 0x837a52 : K.bagOD) });
    const fx = x + ox * (d / 2 + 0.02), fz = z + oz * (d / 2 + 0.02);
    piece(layer, new THREE.BoxGeometry(1.7, 0.24, 0.1), K.hole, fx, 0.9, fz, { ry, drape: true, sink: 0.35 });
    const bx = x - ox * (d / 2 + 0.02), bz = z - oz * (d / 2 + 0.02);
    piece(layer, new THREE.BoxGeometry(0.85, 1.05, 0.1), K.hole, bx, 0.5, bz, { ry, drape: true, sink: 0.35 });
    // a few loose bags at the door
    for (let i = 0; i < 3; i++) { const u = rr(-1.2, 1.2), px = bx - ox * 0.6 + oz * u, pz = bz - oz * 0.6 - ox * u; bag(layer, px, G(px, pz) + 0.06, pz, ry + rr(-0.4, 0.4)); }
  }
  function crate(layer, x, z, ry, y, o) {
    const yy = (y !== undefined ? y : G(x, z)) + 0.2;
    piece(layer, new THREE.BoxGeometry(0.9, 0.4, 0.45, 1, 2, 1), 0, x, yy, z, Object.assign({ ry, color: (cx, cy) => (cy > yy + 0.12 ? K.crateDark : K.crate) }, o));
    return yy + 0.2;
  }
  function jerrycan(layer, x, z, ry) {
    const y = G(x, z);
    piece(layer, new THREE.BoxGeometry(0.34, 0.47, 0.17), K.can, x, y + 0.23, z, { ry });
    piece(layer, new THREE.BoxGeometry(0.2, 0.06, 0.06), K.can, x, y + 0.5, z, { ry });
  }
  function stretcher(layer, x, y, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const u of [-0.29, 0.29]) rod(layer, x - s * 1.15 + c * u, y, z - c * 1.15 - s * u, x + s * 1.15 + c * u, y, z + c * 1.15 - s * u, 0.035, K.pole, { sides: 4 });
    piece(layer, new THREE.BoxGeometry(0.55, 0.03, 1.9), K.canvas, x, y + 0.01, z, { ry });
  }
  function tuft(layer, x, z, h, o) {
    o = o || {};
    const y = (o.y !== undefined ? o.y : G(x, z)) - 0.05, hh = h || rr(0.7, 1.2);
    piece(layer, new THREE.ConeGeometry(rr(0.25, 0.4), hh, 5), 0, x, y + hh / 2, z, Object.assign({ ry: rr(0, 6), rx: rr(-0.25, 0.25), rz: rr(-0.25, 0.25), lo: 1, color: (cx, cy) => (cy - y < hh * 0.35 ? K.grassDraw : cy - y < hh * 0.7 ? K.grass : K.grassTop) }, o));
  }
  function lump(layer, x, z, r, hex) { piece(layer, ctx0.jitterGeo(new THREE.IcosahedronGeometry(r, 0), r * 0.5, R() * 99), hex, x, G(x, z) + r * 0.2, z, { sy: 0.55, lo: 0.8 }); }
  // an RC-292-style antenna: a pole, a vertical element and three drooping radials, three guys
  function antenna(layer, x, z, h) {
    const y = G(x, z);
    rod(layer, x, y, z, x, y + h, z, 0.06, K.metalDark, { sides: 5, taper: 0.6 });
    rod(layer, x, y + h, z, x, y + h + 2.6, z, 0.03, K.metal, { sides: 4 });
    for (let i = 0; i < 3; i++) { const a = i * 120 * DEG + 0.3; rod(layer, x, y + h, z, x + Math.cos(a) * 1.9, y + h - 1.9, z + Math.sin(a) * 1.9, 0.025, K.metal, { sides: 4 }); }
    for (let i = 0; i < 3; i++) { const a = i * 120 * DEG + 1.3, gx = x + Math.cos(a) * 4.5, gz = z + Math.sin(a) * 4.5; rod(layer, x, y + h * 0.65, z, gx, G(gx, gz), gz, 0.018, K.metalDark, { sides: 3 }); }
  }
  // a lattice mast: four tapering legs, zig-zag bracing, stubs on top
  function mast(layer, x, z, h, w) {
    const y = G(x, z) - 0.3, top = 0.35, legs = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    const at = (k, f) => { const hw = (w + (top - w) * f) / 2; return [x + legs[k][0] * hw, y + h * f, z + legs[k][1] * hw]; };
    for (let k = 0; k < 4; k++) { const a = at(k, 0), b = at(k, 1); rod(layer, ...a, ...b, Math.max(0.06, w * 0.035), K.metal, { sides: 4 }); }
    const steps = Math.round(h / 3);
    for (let s = 0; s < steps; s++) for (let k = 0; k < 4; k++) { const a = at(k, s / steps), b = at((k + 1) % 4, (s + 1) / steps); rod(layer, ...a, ...b, Math.max(0.04, w * 0.018), K.metalDark, { sides: 3 }); }
    rod(layer, x, y + h, z, x, y + h + h * 0.12, z, 0.08, K.metal, { sides: 4 });
    for (let i = 0; i < 3; i++) { const a = i * 2.1; rod(layer, x, y + h - 1, z, x + Math.cos(a) * 1.4, y + h - 1.2, z + Math.sin(a) * 1.4, 0.05, K.metalDark, { sides: 3 }); }
    piece(layer, new THREE.BoxGeometry(w * 1.6, 0.3, w * 1.6), K.metalDark, x, 0.1, z, { drape: true });
  }
  function bagRing(layer, x, z, r, n, courses, gapAt) {
    for (let c = 0; c < courses; c++) for (let i = 0; i < n; i++) {
      const a = (i + (c % 2) * 0.5) / n * Math.PI * 2;
      if (gapAt !== undefined && Math.abs(((a - gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35) continue;
      const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
      bag(layer, bx, G(bx, bz) + 0.07 + c * 0.19, bz, -a + Math.PI / 2);
    }
  }

  // ---------- build ----------
  function build(ctx) {
    // ===== Hill 689: perimeter =====
    for (const h of WORKS.holes) foxhole('static', h.pos.x, h.pos.z, h.out.x, h.out.z);
    for (const b of PB) { const r = P.rAt(b) - 1.5, o = out(b); pbunker('static', o[0] * r, o[1] * r, o[0], o[1]); }
    // ===== the CP: map table under a poncho, crates, radios, antennas, a CP bunker =====
    {
      const T = WORKS.cpTable, x = T.pos.x, z = T.pos.z, ry = T.rotY, c = Math.cos(ry), s = Math.sin(ry);
      const L = (u, w) => [x + c * u + s * w, z - s * u + c * w];   // local (u along the table, w across) → world
      const y = G(x, z);
      piece('static', new THREE.BoxGeometry(2.2, 0.08, 1.0), K.timber, x, y + 0.86, z, { ry });
      piece('static', new THREE.BoxGeometry(1.5, 0.02, 0.8), K.map, x, y + 0.91, z, { ry, lo: 1, color: (cx, cy, cz) => (th(Math.floor(cx * 3), 0, Math.floor(cz * 3)) > 0.8 ? 0xb9c58f : K.map) });
      for (const [u, w] of [[-1, -0.42], [1, -0.42], [1, 0.42], [-1, 0.42]]) { const [lx, lz] = L(u, w); rod('static', lx, G(lx, lz) - 0.1, lz, lx, y + 0.83, lz, 0.045, K.timberDark, { sides: 4 }); }
      // the poncho: a shallow tent on four poles, ridge along the table
      for (const side of [-1, 1]) { const [px, pz] = L(0, side * 0.72); piece('static', new THREE.BoxGeometry(3.4, 0.04, 1.5), K.poncho, px, y + 2.08, pz, { ry, rx: side * -0.2, lo: 0.9 }); }
      for (const [u, w] of [[-1.6, -1.35], [1.6, -1.35], [1.6, 1.35], [-1.6, 1.35]]) { const [lx, lz] = L(u, w); rod('static', lx, G(lx, lz) - 0.1, lz, lx, y + 1.86, lz, 0.04, K.pole, { sides: 4 }); }
      { const [a1, b1] = L(-1.7, 0), [a2, b2] = L(1.7, 0); rod('static', a1, G(a1, b1) - 0.1, b1, a1, y + 2.25, b1, 0.05, K.pole, { sides: 4 }); rod('static', a2, G(a2, b2) - 0.1, b2, a2, y + 2.25, b2, 0.05, K.pole, { sides: 4 }); }
      // crates and radios with whip antennas
      const crates = [[-2.1, 1.7, 0.1], [-1.1, 1.9, -0.05], [2.3, -1.6, 0.2], [2.4, 1.2, 1.5], [-2.6, -1.4, 0.4]];
      crates.forEach(([u, w, r], i) => {
        const [cx, cz] = L(u, w); let top = crate('static', cx, cz, ry + r);
        if (i === 0 || i === 3) top = crate('static', cx, cz, ry + r + 0.08, top - 0.02 - G(cx, cz) + G(cx, cz));
        if (i <= 1 || i === 3) {
          piece('static', new THREE.BoxGeometry(0.36, 0.3, 0.17), K.radio, cx, top + 0.15, cz, { ry: ry + r });
          piece('static', new THREE.BoxGeometry(0.08, 0.2, 0.06), 0x30342a, cx + 0.22 * c, top + 0.1, cz - 0.22 * s, { ry: ry + r, rz: 0.3 });
          rod('static', cx - 0.12 * c, top + 0.3, cz + 0.12 * s, cx - 0.12 * c + 0.2, top + 2.6, cz + 0.12 * s + 0.08, 0.018, 0x45483a, { sides: 4 });
        }
      });
      // the antenna cluster, north-east of the table
      antenna('static', CPA.x, CPA.z, CPA.h);
      antenna('static', CPA.x + 3.4, CPA.z + 1.6, 7.5);
      antenna('static', CPA.x - 1.2, CPA.z - 3.6, 8.2);
      for (const [dx, dz] of [[1.5, -1.5], [2.2, 1.0]]) { const ax = CPA.x + dx, az = CPA.z + dz; rod('static', ax, G(ax, az), az, ax + 0.2, G(ax, az) + 4.2, az, 0.035, 0x33362c, { sides: 4 }); }
      // the CP bunker to the north-west, door toward the table
      const bxp = x - 6.5, bzp = z - 3.0, dx = x - bxp, dz = z - bzp, dl = Math.hypot(dx, dz);
      pbunker('static', bxp, bzp, -dx / dl, -dz / dl, 5.2, 3.8);
      // a short sandbag wall north of the table
      for (let cI = 0; cI < 2; cI++) for (let i = 0; i < 7; i++) { const [bx, bz] = L(-1.8 + i * 0.58 + cI * 0.29, -3.2); bag('static', bx, G(bx, bz) + 0.07 + cI * 0.19, bz, ry); }
    }
    // ===== the 689 LZ =====
    {
      const p = WORKS.lz.lz689;
      patch('static', p.x, p.z, 9, (i, ring) => (ring === 3 ? K.trampled2 : th(i, ring, 7) > 0.55 ? 0xb39a6a : (i + ring) % 2 ? K.trampled : 0xa8956a), { n: 16, rings: 3, lift: 0.1 });
      // a marker panel, a smoke-grenade spot
      piece('static', new THREE.BoxGeometry(1.8, 0.04, 0.6), K.orange, p.x + 5.5, 0.12, p.z - 2, { drape: true, ry: 0.4, lo: 1 });
      patch('static', p.x - 1, p.z + 1, 0.6, K.scorch, { n: 7, rings: 1, lift: 0.13 });
      piece('static', new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6), K.smokeCan, p.x - 1, G(p.x - 1, p.z + 1) + 0.09, p.z + 1, { rz: 1.4 });
      // ammo crates, water cans and stretchers at the LZ's edge (toward the CP)
      const ex = p.x - 9.5, ez = p.z - 4;
      for (let i = 0; i < 6; i++) { const cx = ex + (i % 3) * 0.95, cz = ez + Math.floor(i / 3) * 0.5, top = crate('static', cx, cz, 0.1); if (i < 3) crate('static', cx, cz, 0.14, top); }
      for (let i = 0; i < 6; i++) jerrycan('static', ex + 0.3 + i * 0.4, ez + 1.4, 0.1 + rr(-0.1, 0.1));
      const sx = ex + 3.8, sz = ez + 0.6;
      for (let i = 0; i < 4; i++) stretcher('static', sx, G(sx, sz) + 0.08 + i * 0.07, sz, 0.15 + rr(-0.05, 0.05));
    }
    // ===== rocket scars, from the 1435 strike (chapters 6-11) =====
    {
      const bs = [18, 62, 98, 148, 205, 238, 282, 318, 352];
      bs.forEach((b, i) => {
        const r = P.rAt(b) * (i % 3 === 0 ? 0.55 : 0.9) + rr(-2, 2), o = out(b), x = o[0] * r, z = o[1] * r;
        patch('scars', x, z, rr(1.6, 2.2), K.scorch, { n: 9, rings: 2, lift: 0.12, jag: 0.4 });
        patch('scars', x, z, 0.85, 0x5e3d28, { n: 7, rings: 1, lift: 0.15, jag: 0.3 });
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + rr(0, 0.6), d = rr(1.4, 2.0); lump('scars', x + Math.cos(a) * d, z + Math.sin(a) * d, rr(0.18, 0.3), k % 2 ? K.laterite : K.dust); }
        for (let k = 0; k < 3; k++) { const a = rr(0, 6.3), d = rr(1.8, 3.2), bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d; bag('scars', bx, G(bx, bz) + 0.1, bz, rr(0, 6), { rx: rr(-0.5, 0.5), rz: rr(-0.5, 0.5) }); }
      });
      // bags thrown from the nearest holes
      WORKS.holes.filter((_, i) => i % 6 === 2).forEach((h) => { for (let k = 0; k < 4; k++) { const bx = h.pos.x + h.out.x * rr(1.4, 2.6) + rr(-1, 1), bz = h.pos.z + h.out.z * rr(1.4, 2.6) + rr(-1, 1); bag('scars', bx, G(bx, bz) + 0.1, bz, rr(0, 6), { rx: rr(-0.6, 0.6), rz: rr(-0.6, 0.6) }); } });
    }

    // ===== the ridge: bunkers, slits, trenches, spider holes =====
    for (const b of ridgeBunkers) {
      const ry = Math.atan2(b.dx, b.dz), mc = (cx, cy, cz, ny) => (ny > 0.75 ? (th(cx, cz, 3) > 0.5 ? 0xa39a58 : 0x989050) : th(cx, cz, 4) > 0.6 ? 0x8a8448 : 0x948a4e);
      piece('static', ctx0.jitterGeo(new THREE.CylinderGeometry(1.4, 2.3, 0.85, 7, 1), 0.15, R() * 50), 0, b.x, 0.625, b.z, { ry, sx: 1.15, sz: 0.9, drape: true, sink: 0.3, color: mc });
      // hidden: brush screens over the slit and grass on the roof
      for (let i = -1; i <= 1; i++) { const u = i * 0.6, px = b.x + b.dx * 2.15 + b.dz * u, pz = b.z + b.dz * 2.15 - b.dx * u; tuft('hidden', px, pz, rr(0.9, 1.3)); }
      piece('hidden', new THREE.BoxGeometry(1.9, 0.5, 0.1), 0, b.x + b.dx * 1.86, 0.45, b.z + b.dz * 1.86, { ry, drape: true, rx: -0.25, color: () => K.grass });
      for (let i = 0; i < 3; i++) { const a = rr(0, 6.3), d = rr(0, 0.9); tuft('hidden', b.x + Math.cos(a) * d, b.z + Math.sin(a) * d, rr(0.6, 0.9), { y: G(b.x, b.z) + 0.6 }); }
      // revealed: the dark slit under a log lintel, disturbed earth in front, the brush pulled aside
      piece('revealed', new THREE.BoxGeometry(1.5, 0.26, 0.36), K.hole, b.x + b.dx * 1.6, 0.68, b.z + b.dz * 1.6, { ry, drape: true, sink: 0.3 });
      { const lx = b.x + b.dx * 1.62, lz = b.z + b.dz * 1.62, yl = G(lx, lz) + 0.58, c = Math.cos(ry), s = Math.sin(ry);
        rod('revealed', lx - c * 1.0, yl, lz + s * 1.0, lx + c * 1.0, yl, lz - s * 1.0, 0.12, K.timberDark, { sides: 5 }); }
      patch('revealed', b.x + b.dx * 2.9, b.z + b.dz * 2.9, 1.5, (i) => (i % 3 ? 0x94683f : 0x7f5a38), { n: 9, rings: 1, lift: 0.07, jag: 0.45, sx: 1.3, ry: Math.atan2(b.dz, b.dx) + Math.PI / 2 });
      for (const side of [-1, 1]) { const px = b.x + b.dx * 2.3 + b.dz * side * 1.6, pz = b.z + b.dz * 2.3 - b.dx * side * 1.6; tuft('revealed', px, pz, 1.0, { rx: 1.3, ry: ry + side, lo: 0.8 }); }
      lump('revealed', b.x + b.dx * 2.4 + b.dz * 0.9, b.z + b.dz * 2.4 - b.dx * 0.9, 0.3, K.earth);
    }
    // communication trenches between the horseshoe's bunkers (behind them) and across the second position
    {
      const back = (b, f) => ({ x: b.x - b.dx * f, z: b.z - b.dz * f });
      const lines = [ridgeBunkers.filter((b) => b.group === 'arc'), ridgeBunkers.filter((b) => b.group === 'second'), ridgeBunkers.filter((b) => b.group === 'north')];
      for (const line of lines) for (let i = 0; i < line.length - 1; i++) {
        const a = back(line[i], 2.4), c = back(line[i + 1], 2.4), m = { x: (a.x + c.x) / 2 - (line[i].dx + line[i + 1].dx) * 0.8, z: (a.z + c.z) / 2 - (line[i].dz + line[i + 1].dz) * 0.8 };
        const seq = ribbon('revealed', [a, m, c], 0.5, 0x4a3b28, 0.07);
        ribbon('revealed', [a, m, c], 0.95, 0xa3925c, 0.05);
        seq.forEach((p, k) => { if (k % 2) return; const s = k % 4 ? 1 : -1, nx = -(c.z - a.z), nz = c.x - a.x, l = Math.hypot(nx, nz) || 1; lump('revealed', p.x + nx / l * 0.95 * s, p.z + nz / l * 0.95 * s, 0.22, k % 3 ? 0x9a8152 : K.earth); });
      }
    }
    // nva.js animates its own lids on the holes it uses (the two crest holes nearest the north end and Charlie's pause,
    // away from the slits, and the four 'lz' holes nearest the CH-46's point): those get no static lid here
    // (WORKS.nvaHoles, the same rule nva.js and fire.js use).
    const nvaUse = new Set(WORKS.nvaHoles());
    for (const h of WORKS.spiderHoles) {
      const x = h.pos.x, z = h.pos.z, a = rr(0, 6.3);
      piece('hidden', new THREE.CylinderGeometry(0.44, 0.48, 0.08, 7), 0, x, 0.04, z, { drape: true, color: (cx, cy, cz, ny) => (ny > 0.5 ? K.grass : 0x6a5a3a) });
      tuft('hidden', x + 0.1, z, rr(0.5, 0.8), { y: G(x, z) + 0.08 });
      patch('revealed', x, z, 0.75, 0x94683f, { n: 8, rings: 1, lift: 0.05, jag: 0.35 });
      patch('revealed', x, z, 0.36, K.hole, { n: 7, rings: 1, lift: 0.08, jag: 0.05 });
      const lx = x + Math.cos(a) * 0.62, lz = z + Math.sin(a) * 0.62;
      if (!nvaUse.has(h)) piece('revealed', new THREE.CylinderGeometry(0.44, 0.48, 0.08, 7), 0, lx, G(lx, lz) + 0.28, lz, { ry: -a, rz: 1.15, q: null, color: (cx, cy, cz, ny) => (th(cx, cy, cz) > 0.5 ? K.grass : 0x6a5a3a) });
    }

    // ===== landing zones on the ridge =====
    const straw = (i, ring) => (ring === 3 ? K.trampled2 : i % 2 ? K.trampled : 0x958a52);
    const lzMarker = (layer, p) => {
      patch(layer, p.x + 2, p.z + 1.5, 0.6, K.scorch, { n: 7, rings: 1, lift: 0.13 });
      piece(layer, new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6), K.smokeCan, p.x + 2, G(p.x + 2, p.z + 1.5) + 0.09, p.z + 1.5, { rz: 1.4, rx: 0.5 });
    };
    patch('alz', WORKS.lz.alz.x, WORKS.lz.alz.z, 8.5, straw, { n: 16, rings: 3, lift: 0.1, jag: 0.3 });
    lzMarker('alz', WORKS.lz.alz);
    for (const p of WORKS.lz.czlz) patch('czlz', p.x, p.z, 9, straw, { n: 16, rings: 3, lift: 0.1, jag: 0.3 });
    { const a = WORKS.lz.czlz[0], b = WORKS.lz.czlz[1]; ribbon('czlz', [a, b], 2.5, K.trampled2, 0.09); lzMarker('czlz', a); }
    // the panels laid out at about 1805 (chapter 7)
    {
      const [a, b] = WORKS.lz.czlz, al = WORKS.lz.alz;
      const panel = (x, z, ry, hex) => piece('panels', new THREE.BoxGeometry(1.8, 0.04, 0.6), hex, x, 0.13, z, { drape: true, ry, lo: 1, tone: 0 });
      panel(a.x - 5, a.z + 1, 0.3, K.orange); panel(a.x - 5.9, a.z + 1.3, 0.3 + Math.PI / 2, K.cerise);
      panel(b.x + 4.5, b.z - 2, -0.5, K.orange);
      panel(al.x + 4, al.z + 2, 1.1, K.orange);
    }

    // ===== masts =====
    {
      const r = SITE.relayMast; mast('static', r.x, r.z, MH.relay, 2.0);
      pbunker('static', r.x - 4.5, r.z + 3, 0, 1, 3.4, 2.8); bagRing('static', r.x, r.z, 3.2, 18, 2, Math.PI);
      const b = SITE.base; mast('static', b.x, b.z, MH.base, 3.8); mast('static', b.x + 14, b.z + 9, 32, 2.6);
      for (const [dx, dz] of [[-12, 6], [-6, 14], [8, -10], [20, 2]]) pbunker('static', b.x + dx, b.z + dz, 0, 1, 7, 5);
      const am = SITE.armyMast; mast('static', am.x, am.z, MH.army, 1.6);
      pbunker('static', am.x + 4, am.z + 2.5, 1, 0, 3.6, 2.8); bagRing('static', am.x, am.z, 2.8, 16, 2, 0);
    }
    // ===== Hill 552: a small Marine position =====
    {
      const h = SITE.hill552;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, x = h.x + Math.cos(a) * 11, z = h.z + Math.sin(a) * 11; foxhole('static', x, z, Math.cos(a), Math.sin(a)); }
      pbunker('static', h.x - 2, h.z + 2, 0, 1, 4, 3);
      antenna('static', h.x + 3, h.z - 2, 8);
    }

    // ---------- merge each layer into one mesh ----------
    const M = ctx.mat(0xffffff, { vertexColors: true });
    const meshes = {};
    for (const [name, L] of Object.entries(layers)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L.pos), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(L.col), 3));
      geo.computeVertexNormals(); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, M);
      if (name === 'static') ctx.world.add(m);
      else { m.userData.dynamic = true; ctx.root.add(m); }
      meshes[name] = m;
      WORKS.tris = (WORKS.tris || 0) + L.pos.length / 9;
    }
    return meshes;
  }

  window.Scene.register({
    name: 'works',
    slits: WORKS.slits, masts: WORKS.masts, spiderHoles: WORKS.spiderHoles, holes: WORKS.holes, lz: WORKS.lz, clearings: WORKS.clearings, bunkers: WORKS.bunkers, cpTable: WORKS.cpTable,
    init(ctx) {
      const me = this;
      me.meshes = build(ctx);
      const show = (ch) => {
        const id = ch.id, m = me.meshes;
        m.hidden.visible = id <= 2;
        m.revealed.visible = id >= 3;
        m.scars.visible = id >= 6;
        m.alz.visible = id >= 3;
        m.czlz.visible = id >= 6;
        m.panels.visible = id === 7;
      };
      ctx.onChapter(show);
      show(ctx.chapter);
      // the steered camera stays out of the bunkers (ridge and 689) and the CP's sandbags (integration)
      const keepOut = WORKS.bunkers.map((b) => [b.pos.x, b.pos.z, 3.4]).concat(PB.map((b) => { const r = P.rAt(b); return [Math.sin(b * DEG) * r, -Math.cos(b * DEG) * r, 3.6]; }), [[SITE.cp.x, SITE.cp.z, 3.2]]);
      ctx.addCamFloor((x, z) => { for (const k of keepOut) if (Math.abs(x - k[0]) < k[2] && Math.abs(z - k[1]) < k[2] && Math.hypot(x - k[0], z - k[1]) < k[2]) return G(x, z) + 3.2; return null; });
      const arcMid = SITE.bunkerArc[4];
      ctx.tag('bunkers', () => arcMid, { r: 18, when: (ch) => ch.id >= 3 });
      ctx.tag('czlz', () => SITE.czlz, { r: 12, when: (ch) => ch.id >= 6 });
      ctx.tag('alz', () => SITE.alz, { r: 10, when: (ch) => ch.id >= 3 });
      ctx.tag('base', () => WORKS.masts.base, { r: 30 });
    },
    update(t, dt, ctx) {
      const p = this.meshes && this.meshes.panels;
      if (!p || !p.visible) return;
      // laid out from about 1730 (t 94), picked up before the loop returns to 1500
      const k = sm((ctx.cycle.t - 94) / 2) * (1 - sm((ctx.cycle.t - 117) / 2.5));
      p.position.y = -0.5 * (1 - k);
    },
  });
  // the registered object is window.Scene's copy; keep WORKS as the one other plug-ins read
})();
