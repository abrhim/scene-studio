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
  const th = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };

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
    // the north end is a horseshoe open toward A (Q3 "horseshoe shaped", Q24 "mutually supporting"): the three across
    // the back, and two arms of two that run forward on either side, turned inward so their fields cross A's ground.
    // [u across (left negative), w forward toward A, id, turn inward in degrees]; the array runs round the arc for the trench
    [[-24, 18, 4, 75], [-17, 8, 5, 50], [-7, -1, 1, 0], [0, 2, 2, 0], [7, -1, 3, 0], [17, 8, 6, -50], [24, 18, 7, -75]].forEach(([u, w, n, turn]) => {
      const x = SITE.northEnd.x - nd[1] * u + nd[0] * w, z = SITE.northEnd.z + nd[0] * u + nd[1] * w;
      const a = turn * Math.PI / 180, dx = nd[0] * Math.cos(a) - nd[1] * Math.sin(a), dz = nd[1] * Math.cos(a) + nd[0] * Math.sin(a);
      ridgeBunkers.push({ id: 'north' + n, group: 'north', x, z, dx, dz });
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
  // (their 'lz' four get low grass round them from chapter 11, below, so the man who rises there and his flash show)
  WORKS.nvaHoles = (which) => {
    const d = (h, p) => Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
    const crest = (p) => WORKS.spiderHoles.filter((h) => h.group === 'crest' && !WORKS.slits.some((s) => Math.hypot(s.pos.x - h.pos.x, s.pos.z - h.pos.z) < 5)).sort((a, b) => d(a, p) - d(b, p));
    const lz = SITE.routes.ch46[1];
    const h11 = WORKS.spiderHoles.filter((h) => h.group === 'lz').sort((a, b) => d(a, lz) - d(b, lz)).slice(0, 4);
    if (which === 'lz') return h11;
    return [...crest(SITE.northEnd).slice(0, 2), ...crest(SITE.charliePause).slice(0, 2), ...h11];
  };
  for (const h of WORKS.nvaHoles('lz')) WORKS.clearings.push({ x: h.pos.x, z: h.pos.z, r: 2.6, kind: 'slit', from: 11 });
  // ===== 689: the battalion position after eight days (.scratch/hill689/SOURCES.md) =====
  // Two-man fighting holes all round the line (96, on a ring 120-180 m real; the 1/3 land makes it 40-60 scene metres,
  // so the holes stand about 3.6 m apart where real ones stood about 11), five bunkers in the gaps, a dug-in CP bunker
  // on the summit with its open side toward the south-west, an aid-station bunker by the LZ, three 81 mm mortar pits
  // on the north side, poncho hooches behind the line, the litter of a week, a trash pit, the scars of the 82 mm fire of
  // 8 April. No wire: no source puts wire on 689 or on the battalions moving hill to hill in the spring (SOURCES.md 9).
  const P = SITE.perimeter;
  const out = (b) => [Math.sin(b * DEG), -Math.cos(b * DEG)];
  const bOf = (x, z) => ((Math.atan2(x, -z) / DEG) + 360) % 360;
  const PB = [30, 110, 200, 250, 320];
  {
    const NH = 106;
    let k = 0;
    for (let i = 0; i < NH; i++) {
      const b0 = i * 360 / NH;
      if (PB.some((q) => Math.abs(((b0 - q + 540) % 360) - 180) < 2.6)) continue;
      const bb = b0 + rr(-0.9, 0.9), r = P.rAt(bb) - 1.4 + rr(-0.7, 0.7) + (i % 2 ? -0.7 : 0.35), o = out(bb);
      const x = o[0] * r, z = o[1] * r, ou = V(o[0], 0, o[1]);
      const cover = th(i, 3, 9) < 0.42 ? 'logs' : th(i, 5, 2) < 0.55 ? 'poncho' : 'open';
      const sx = x - o[0] * 0.5, sz = z - o[1] * 0.5;
      WORKS.holes.push({ i: k++, pos: V(x, G(x, z), z), out: ou, b: bb, cover, seat: V(sx, G(sx, sz), sz), seatYaw: Math.atan2(o[0], o[1]) });
    }
  }
  // the CP bunker: on the summit, its open side (and the poncho over the door) toward the south-west, where the
  // chapter 1 and 4 cameras stand; the map table and radios inside, the floor dug 0.5 m (the CP's men stand sunk)
  const CPB = (() => {
    const fb = 212, f = out(fb), u = [-f[1], f[0]];   // f: out of the open side; u: along it
    const c = { x: SITE.cp.x - f[0] * 0.4, z: SITE.cp.z - f[1] * 0.4 };
    return { x: c.x, z: c.z, f, u, w: 5.8, d: 4.2, floor: 0.3, roof: 1.75, ry: Math.atan2(f[0], f[1]) };
  })();
  // the table: its frame (works.cpTable, marines-a-d tL): w toward the open side, u along it
  {
    const tx = CPB.x + CPB.f[0] * 0.35, tz = CPB.z + CPB.f[1] * 0.35;
    WORKS.cpTable = { pos: V(tx, G(tx, tz), tz), rotY: Math.atan2(CPB.f[0], CPB.f[1]), w: 2.0, d: 0.85, floor: CPB.floor, bunker: CPB };
  }
  WORKS.cp = CPB;
  // the aid station, between the CP and the LZ; the mortar pits on the north side
  const AID = { x: 9.5, z: 17.5 };
  { const dx = SITE.lz689.x - AID.x, dz = SITE.lz689.z - AID.z, l = Math.hypot(dx, dz); AID.f = [dx / l, dz / l]; }
  WORKS.aid = V(AID.x, G(AID.x, AID.z), AID.z);
  const MORT = [292, 322, 352].map((b) => { const r = Math.min(24, P.rAt(b) - 15), o = out(b); return { x: o[0] * r, z: o[1] * r, o }; });
  WORKS.mortars = MORT.map((m) => V(m.x, G(m.x, m.z), m.z));
  const TRASH = (() => { const b = 98, o = out(b), r = P.rAt(b) - 13; return { x: o[0] * r, z: o[1] * r }; })();
  WORKS.trash = V(TRASH.x, G(TRASH.x, TRASH.z), TRASH.z);
  // Company A's forming ground (chapter 1): kept clear of hooches and litter
  const ASSEMBLY = (x, z) => { const b = bOf(x, z), r = Math.hypot(x, z); return b > 196 && b < 248 && r > 20 && r < P.rAt(b) - 4; };
  WORKS.assembly = ASSEMBLY;
  // the paths between the holes, the CP, the LZ, the aid station and the mortar pits (land.js tramples them)
  WORKS.paths = [];
  {
    // each path meanders a little (pieces of about 2.5 m, pushed sideways on a smooth wobble)
    const seg = (a, b, w) => {
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), n = Math.max(1, Math.round(l / 2.5)), nx = -dz / (l || 1), nz = dx / (l || 1), ph = rr(0, 6.3);
      let px = a.x, pz = a.z;
      for (let k = 1; k <= n; k++) {
        const f = k / n, o = k === n ? 0 : (Math.sin(f * 5.1 + ph) * 0.7 + Math.sin(f * 13.7 + ph * 2) * 0.25) * Math.min(1, l / 12);
        const qx = a.x + dx * f + nx * o, qz = a.z + dz * f + nz * o;
        WORKS.paths.push({ a: [px, pz], b: [qx, qz], w: w * (0.85 + 0.3 * th(qx, qz, 4)) });
        px = qx; pz = qz;
      }
    };
    const cpDoor = { x: CPB.x + CPB.f[0] * 3.2, z: CPB.z + CPB.f[1] * 3.2 };
    seg(CPB, SITE.lz689, 1.6); seg(CPB, AID, 1.4); seg(AID, SITE.lz689, 1.5); seg(CPB, cpDoor, 1.6);
    for (const m of MORT) seg(CPB, m, 1.2);
    seg(CPB, TRASH, 1.0);
    // the ring path behind the holes, and spokes
    let prev = null;
    for (let b = 0; b <= 360; b += 6) { const o = out(b), r = P.rAt(b) - 5.2, p = { x: o[0] * r + rr(-0.5, 0.5), z: o[1] * r + rr(-0.5, 0.5) }; if (prev) seg(prev, p, 1.3); prev = p; }
    for (const b of [20, 75, 140, 180, 217, 265, 305, 335]) { const o = out(b), r = P.rAt(b) - 5; seg(b === 217 ? cpDoor : CPB, { x: o[0] * r, z: o[1] * r }, 1.1); }
    seg({ x: SITE.perimSW.x * 0.85, z: SITE.perimSW.z * 0.85 }, SITE.perimSW, 1.6);   // out through the line toward the ridge
  }
  // where grass survives inside the ring: patches away from the paths and the works (land.js reads it)
  {
    const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); const a = th(ix, iz, 1), b = th(ix + 1, iz, 1), c = th(ix, iz + 1, 1), d = th(ix + 1, iz + 1, 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    const segD = (x, z, s) => { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], f = Math.min(1, Math.max(0, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(s.a[0] + dx * f - x, s.a[1] + dz * f - z); };
    WORKS.pathAt = (x, z) => { let d = 9; for (const s of WORKS.paths) { const e = segD(x, z, s) - s.w / 2; if (e < d) d = e; } return d; };   // metres beyond the nearest path's edge
    const patchRaw = (x, z) => {
      const r = Math.hypot(x, z);
      if (r < 9 || Math.hypot(x - SITE.lz689.x, z - SITE.lz689.z) < 11 || Math.hypot(x - AID.x, z - AID.z) < 5) return 0;
      if (MORT.some((m) => Math.hypot(x - m.x, z - m.z) < 4) || ASSEMBLY(x, z) && r < P.rAt(bOf(x, z)) - 9) return 0;
      const n = vn(x * 0.16 + 3.1, z * 0.16 - 1.7) * 0.7 + vn(x * 0.5, z * 0.5) * 0.3;
      return Math.max(0, Math.min(1, (n - 0.56) / 0.12)) * Math.min(1, Math.max(0, (WORKS.pathAt(x, z) - 0.4) / 1.2));
    };
    // baked on a 1 m grid (land.js asks per grass clump)
    const GR = 66, GN = GR * 2 + 1, grid = new Float32Array(GN * GN);
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) grid[j * GN + i] = patchRaw(i - GR, j - GR);
    WORKS.grassPatch = (x, z) => {
      const fx = x + GR, fz = z + GR;
      if (fx < 0 || fz < 0 || fx >= GN - 1 || fz >= GN - 1) return 0;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * GN + i;
      return (grid[k] * (1 - u) + grid[k + 1] * u) * (1 - v) + (grid[k + GN] * (1 - u) + grid[k + GN + 1] * u) * v;
    };
  }
  WORKS.clearings.push({ x: 0, z: 0, r: 999, kind: 'perimeter', from: 1, inside: (x, z) => Math.hypot(x, z) < P.rAt(bOf(x, z)) + 1.2 && WORKS.grassPatch(x, z) < 0.35 });
  // the fields of fire: a band outside the holes cut and trodden flat (land.js flattens 'lz' clearings)
  WORKS.clearings.push({ x: 0, z: 0, r: 999, kind: 'lz', from: 1, inside: (x, z) => { const r = Math.hypot(x, z), rp = P.rAt(bOf(x, z)); return r > rp + 0.8 && r < rp + 8 + 4 * th(Math.floor(x / 3), Math.floor(z / 3), 6); } });
  for (const p of [WORKS.lz.lz689, WORKS.lz.alz, ...WORKS.lz.czlz]) WORKS.clearings.push({ x: p.x, z: p.z, r: 9, kind: 'lz', from: p === WORKS.lz.alz ? 3 : p === WORKS.lz.lz689 ? 1 : 6 });
  // masts: tips
  const MH = { relay: 24, base: 50, army: 18 };
  for (const k of ['relay', 'base', 'army']) {
    const f = SITE[k === 'relay' ? 'relayMast' : k === 'army' ? 'armyMast' : 'base'];
    WORKS.masts[k] = V(f.x, f.y + MH[k], f.z);
  }
  const CPA = { x: CPB.x - CPB.f[0] * 4.4 + CPB.u[0] * 1.2, z: CPB.z - CPB.f[1] * 4.4 + CPB.u[1] * 1.2, h: 9.5 };
  WORKS.masts.cp = V(CPA.x, G(CPA.x, CPA.z) + CPA.h, CPA.z);
  WORKS.masts.feet = { relay: SITE.relayMast.clone(), base: SITE.base.clone(), army: SITE.armyMast.clone(), cp: V(CPA.x, G(CPA.x, CPA.z), CPA.z) };

  // ---------- geometry ----------
  const layers = {};
  const L_ = (n) => layers[n] || (layers[n] = { pos: [], col: [] });
  const colCache = new Map();
  const rgb = (hex) => { let c = colCache.get(hex); if (!c) { const k = new THREE.Color(hex).convertSRGBToLinear(); c = [k.r, k.g, k.b]; colCache.set(hex, c); } return c; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);

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


  // ---------- 689 builders ----------
  const K2 = { pit: 0x2b2117, floor: 0x3a2d20, spoil: 0x8a6440, spoil2: 0x9a7650, ration: 0x8c7a55, rationD: 0x766645, ammoCan: 0x4f5233, can: 0x5d6040, rag: 0x6d6a4c };
  // a two-man fighting hole: the pit along the line, spoil thrown out and to the sides, a sandbag parapet on the front
  // and the flanks, and over the rear half logs and sandbags (the commonest), a poncho on sticks, or nothing
  function foxhole2(layer, h) {
    const x = h.pos.x, z = h.pos.z, ox = h.out.x, oz = h.out.z, ux = -oz, uz = ox, a0 = Math.atan2(oz, ox);
    const L = (u, w) => [x + ux * u + ox * w, z + uz * u + oz * w];
    patch(layer, x + ox * 0.15, z + oz * 0.15, 1.25, (i, ring) => (th(i, ring, x) > 0.5 ? K2.spoil : K2.spoil2), { n: 10, rings: 1, lift: 0.05, jag: 0.3, sx: 1.25, sz: 1.0, ry: a0 + Math.PI / 2 });
    patch(layer, x, z, 0.82, K2.pit, { n: 10, rings: 1, lift: 0.08, sx: 1.0, sz: 0.52, ry: a0 + Math.PI / 2, jag: 0.06 });
    // the parapet: two courses round the front from flank to flank
    for (let c = 0; c < 2; c++) {
      const n = c ? 6 : 7;
      for (let i = 0; i < n; i++) {
        const t = -1 + 2 * (i + (c ? 0.5 : 0)) / (n - 1 + (c ? 1 : 0)), ang = t * 1.75;
        const u = Math.sin(ang) * 1.18, w = Math.cos(ang) * 0.72 + 0.12;
        const [bx, bz] = L(u, w);
        bag(layer, bx, G(bx, bz) + 0.07 + c * 0.19, bz, Math.atan2(Math.cos(ang) * ux - Math.sin(ang) * ox * 0.6, Math.cos(ang) * uz - Math.sin(ang) * oz * 0.6) + rr(-0.12, 0.12));
      }
    }
    if (h.cover === 'logs') {
      // three short logs across the rear half, bags on them
      const y = G(x, z) + 0.2;
      for (const w of [-0.12, -0.36, -0.58]) { const [p1x, p1z] = L(-1.05, w), [p2x, p2z] = L(1.05, w); rod(layer, p1x, y, p1z, p2x, y + rr(-0.03, 0.03), p2z, 0.075, th(w, x, 1) > 0.5 ? K.timber : K.timberDark, { sides: 5 }); }
      for (let i = 0; i < 4; i++) { const [bx, bz] = L(-0.75 + i * 0.5, -0.36); bag(layer, bx, y + 0.17, bz, h.seatYaw + Math.PI / 2 + rr(-0.15, 0.15)); }
      lump(layer, ...L(0, -0.9), 0.32, K2.spoil);
    } else if (h.cover === 'poncho') {
      // a poncho stretched over the rear half on two sticks, tied down behind
      const [sx1, sz1] = L(-0.85, -0.05), [sx2, sz2] = L(0.85, -0.05), y = G(x, z);
      rod(layer, sx1, y - 0.1, sz1, sx1, y + 0.55, sz1, 0.025, K.pole, { sides: 3 });
      rod(layer, sx2, y - 0.1, sz2, sx2, y + 0.55, sz2, 0.025, K.pole, { sides: 3 });
      const [px, pz] = L(0, -0.42);
      piece(layer, new THREE.BoxGeometry(1.95, 0.025, 0.95), th(x, z, 5) > 0.5 ? K.poncho : 0x51593b, px, y + 0.38, pz, { ry: h.seatYaw, rx: -0.42, lo: 0.85 });
    }
    // what lies by a hole: an ammunition can, a ration carton, empty cans, sometimes a helmet-less pack
    const r = th(x, z, 11);
    if (r < 0.55) { const [cx, cz] = L(rr(-1.3, 1.3), rr(-1.1, -0.7)); ammoCan(layer, cx, cz, rr(0, 6)); }
    if (r > 0.35) { const [cx, cz] = L(rr(-1.4, 1.4), rr(-1.4, -0.8)); carton(layer, cx, cz, rr(0, 6)); }
    for (let i = 0; i < 2; i++) { const [cx, cz] = L(rr(-1.6, 1.6), rr(-1.8, -0.7)); tin(layer, cx, cz); }
  }
  function ammoCan(layer, x, z, ry) { const y = G(x, z); piece(layer, new THREE.BoxGeometry(0.28, 0.18, 0.11), K2.ammoCan, x, y + 0.09, z, { ry, lo: 0.8 }); }
  function carton(layer, x, z, ry, y0) { const y = (y0 !== undefined ? y0 : G(x, z)); piece(layer, new THREE.BoxGeometry(0.42, 0.24, 0.3), th(x, z, 2) > 0.4 ? K2.ration : K2.rationD, x, y + 0.12, z, { ry, lo: 0.82, rz: rr(-0.08, 0.08) }); return y + 0.24; }
  function tin(layer, x, z) { piece(layer, new THREE.CylinderGeometry(0.04, 0.04, 0.09, 5), th(x, z, 3) > 0.5 ? K2.can : 0x8a8466, x, G(x, z) + 0.04, z, { rz: th(z, x, 1) > 0.5 ? 1.5 : 0, ry: rr(0, 6), lo: 0.9 }); }
  // the CP bunker: dug 0.5 m, sandbag walls on three sides, a log-and-sandbag roof, the open side toward the south-west
  // with a poncho hung over its left third (the door); inside the map table, radios on ammunition crates
  function cpBunker(layer) {
    const B = CPB, c = (u, w) => [B.x + B.u[0] * u + B.f[0] * w, B.z + B.u[1] * u + B.f[1] * w];
    const hw = B.w / 2, hd = B.d / 2, y0 = G(B.x, B.z);
    const courses = (cy) => { const n = Math.floor((cy + 0.4) / 0.2); return n % 3 === 0 ? K.bagTan : n % 3 === 1 ? K.bagOD : K.bagDark; };
    // the floor, dark and trodden
    piece(layer, new THREE.BoxGeometry(B.w - 0.9, 0.02, B.d - 0.3, 4, 1, 3), K2.floor, B.x + B.f[0] * 0.1, 0.05, B.z + B.f[1] * 0.1, { ry: B.ry, drape: true, lo: 1 });
    // the walls: back and two sides
    const wall = (u, w, len, alongU) => { const p = c(u, w); piece(layer, new THREE.BoxGeometry(alongU ? len : 0.6, 2.0, alongU ? 0.6 : len, alongU ? 6 : 1, 10, alongU ? 1 : 5), 0, p[0], 1.0, p[1], { ry: B.ry, drape: true, sink: 0.25, color: (cx, cy, cz) => courses(cy - G(cx, cz)) }); };
    wall(0, -hd + 0.3, B.w, true); wall(-hw + 0.3, 0, B.d - 0.2, false); wall(hw - 0.3, 0, B.d - 0.2, false);
    // earth banked against the walls outside
    const bank = [];
    for (let i = 0; i < 5; i++) bank.push(c(-hw - 0.45, -hd + 0.3 + i * (B.d - 0.9) / 4), c(hw + 0.45, -hd + 0.3 + i * (B.d - 0.9) / 4));
    for (let i = 0; i < 7; i++) bank.push(c(-hw + i * B.w / 6, -hd - 0.5));
    for (const [ex, ez] of bank) piece(layer, ctx0.jitterGeo(new THREE.IcosahedronGeometry(0.8, 1), 0.2, R() * 99), th(ex, ez, 2) > 0.5 ? 0x745a3c : 0x6a5237, ex, G(ex, ez) + 0.1, ez, { sy: 0.7, lo: 0.7 });
    // the front posts and lintel, the roof logs, the bags and earth on top
    const yr = y0 + B.roof;
    for (const u of [-hw + 0.35, -0.6, hw - 0.35]) { const [px, pz] = c(u, hd - 0.15); rod(layer, px, G(px, pz) - 0.3, pz, px, yr, pz, 0.1, K.timberDark, { sides: 5 }); }
    { const [a1, b1] = c(-hw - 0.2, hd - 0.15), [a2, b2] = c(hw + 0.2, hd - 0.15); rod(layer, a1, yr, b1, a2, yr + 0.02, b2, 0.13, K.timber, { sides: 6 }); }
    for (let i = 0; i < 12; i++) { const u = -hw + 0.2 + i * (B.w - 0.4) / 11, [a1, b1] = c(u, -hd - 0.2), [a2, b2] = c(u, hd + 0.05); rod(layer, a1, yr + 0.12, b1, a2, yr + 0.12, b2, 0.12, i % 3 ? K.timber : K.timberDark, { sides: 5 }); }
    { const [mx, mz] = c(0, -0.1); piece(layer, new THREE.BoxGeometry(B.w + 0.2, 0.42, B.d + 0.1, 8, 2, 6), 0, mx, yr + 0.45, mz, { ry: B.ry, color: (cx, cy, cz) => ((Math.floor(cx * 1.8) + Math.floor(cz * 2.7) + Math.floor(cy * 4.5)) % 3 === 0 ? 0x837a52 : (Math.floor(cx * 1.8) + Math.floor(cz * 2.7)) % 2 ? K.bagOD : K.bagTan) }); }
    for (let i = 0; i < 9; i++) { const [lx, lz] = c(rr(-hw + 0.4, hw - 0.4), rr(-hd + 0.3, hd - 0.4)); bag(layer, lx, yr + 0.72, lz, B.ry + rr(-0.3, 0.3)); }
    // the poncho over the door (the left third of the open side), hanging from the lintel, a corner tied back
    { const [px, pz] = c(-hw + 1.15, hd + 0.02); piece(layer, new THREE.BoxGeometry(1.75, 1.7, 0.03, 3, 3, 1), K.poncho, px, yr - 0.8, pz, { ry: B.ry, rx: 0.06, lo: 0.7 }); }
    // the inside: the map table (its top 0.86 above the dug floor), radios on crates against the back wall
    const T = WORKS.cpTable, fy = y0 - B.floor, gy0 = y0, tc = Math.cos(T.rotY), ts = Math.sin(T.rotY);
    const tL = (u, w) => [T.pos.x + tc * u + ts * w, T.pos.z - ts * u + tc * w];
    piece(layer, new THREE.BoxGeometry(T.w, 0.06, T.d), K.timber, T.pos.x, fy + 0.86, T.pos.z, { ry: T.rotY });
    piece(layer, new THREE.BoxGeometry(1.4, 0.02, 0.72), K.map, T.pos.x, fy + 0.9, T.pos.z, { ry: T.rotY, lo: 1, color: (cx, cy, cz) => (th(Math.floor(cx * 3), 0, Math.floor(cz * 3)) > 0.8 ? 0xb9c58f : K.map) });
    for (const [u, w] of [[-0.9, -0.36], [0.9, -0.36], [0.9, 0.36], [-0.9, 0.36]]) { const [lx, lz] = tL(u, w); rod(layer, lx, gy0 - 0.1, lz, lx, fy + 0.83, lz, 0.045, K.timberDark, { sides: 4 }); }
    WORKS.cpRadios = [];
    [[-1.7, -1.55], [-0.7, -1.6], [0.5, -1.6], [1.6, -1.5]].forEach(([u, w], i) => {
      const [cx, cz] = tL(u, w); const top = crate(layer, cx, cz, T.rotY + rr(-0.06, 0.06));
      if (i !== 2) {
        piece(layer, new THREE.BoxGeometry(0.36, 0.3, 0.17), K.radio, cx, top + 0.15, cz, { ry: T.rotY });
        piece(layer, new THREE.BoxGeometry(0.08, 0.2, 0.06), 0x30342a, cx + 0.22 * tc, top + 0.1, cz - 0.22 * ts, { ry: T.rotY, rz: 0.3 });
        WORKS.cpRadios.push(V(cx, top + 0.3, cz));
      } else { carton(layer, cx, cz, T.rotY + 0.3, top); }
    });
    // an ammunition box to sit on at each end of the table (marines-a-d: Hartzell), and a water can
    WORKS.cpSeats = [tL(-1.55, -0.45), tL(1.6, 0.55)].map(([sx, sz]) => { const top = crate(layer, sx, sz, T.rotY + Math.PI / 2); return V(sx, top, sz); });
    { const [jx, jz] = tL(-2.0, 0.9); jerrycan(layer, jx, jz, T.rotY); }
    // outside: a sandbag blast wall a pace in front of the right two-thirds (low, so the camera sees in), the CP's
    // water cans, ration cartons, a log bench by the door
    for (let cI = 0; cI < 2; cI++) for (let i = 0; i < 6; i++) { const [bx, bz] = c(-0.1 + i * 0.5 + cI * 0.25, hd + 1.7); bag(layer, bx, G(bx, bz) + 0.07 + cI * 0.19, bz, B.ry + Math.PI / 2 + rr(-0.08, 0.08)); }
    for (let i = 0; i < 4; i++) { const [jx, jz] = c(hw + 0.9, -0.8 + i * 0.38); jerrycan(layer, jx, jz, B.ry + rr(-0.1, 0.1)); }
    for (let i = 0; i < 3; i++) { const [cx, cz] = c(hw + 1.0 + rr(-0.3, 0.3), 1.1 + i * 0.45); carton(layer, cx, cz, rr(0, 6)); }
    { const [a1, b1] = c(-hw - 0.2, hd + 1.6), [a2, b2] = c(-hw + 1.6, hd + 1.9); rod(layer, a1, G(a1, b1) + 0.15, b1, a2, G(a2, b2) + 0.15, b2, 0.15, K.timber, { sides: 6 }); WORKS.cpLog = { a: V(a1, G(a1, b1) + 0.3, b1), b: V(a2, G(a2, b2) + 0.3, b2) }; }
  }
  // the aid station: a smaller bunker, door toward the LZ, stretchers stacked by the door, a poncho on the ground
  function aidBunker(layer) {
    const f = AID.f;
    pbunker(layer, AID.x, AID.z, -f[0], -f[1], 3.8, 3.0);
    const dx = AID.x + f[0] * 2.4, dz = AID.z + f[1] * 2.4, ry = Math.atan2(f[0], f[1]);
    const sx = dx - f[1] * 1.6, sz = dz + f[0] * 1.6;
    for (let i = 0; i < 5; i++) stretcher(layer, sx, G(sx, sz) + 0.1 + i * 0.075, sz, ry + rr(-0.06, 0.06));
    { const lx = dx + f[1] * 1.7, lz = dz - f[0] * 1.7, y = G(lx, lz); piece(layer, new THREE.BoxGeometry(0.55, 0.03, 1.9), K.canvas, lx + f[1] * 0.4, y + 1.05, lz - f[0] * 0.4, { ry, rz: 1.0 }); stretcher(layer, lx, y + 0.95, lz, ry); }
    for (let i = 0; i < 3; i++) carton(layer, dx + rr(-0.9, 0.9), dz + rr(-0.2, 0.6), rr(0, 6));
    piece(layer, new THREE.BoxGeometry(1.8, 0.02, 1.1), K.poncho, dx + f[1] * 0.2, G(dx, dz) + 0.08, dz - f[0] * 0.2, { ry: ry + 0.2, drape: false });
    jerrycan(layer, dx - f[1] * 0.9, dz + f[0] * 0.9, ry);
    WORKS.aidDoor = V(dx, G(dx, dz), dz);
  }
  // an 81 mm mortar pit: a ring of three courses with a gap at the back, the tube on its baseplate and bipod laid
  // outward, ready rounds in an open box and crates stacked inside the wall
  function mortarPit(layer, m) {
    const x = m.x, z = m.z, o = m.o, back = Math.atan2(-o[1], -o[0]);
    patch(layer, x, z, 2.2, (i, ring) => (ring === 2 ? K2.spoil2 : K2.spoil), { n: 12, rings: 2, lift: 0.06, jag: 0.2 });
    patch(layer, x, z, 1.45, K2.floor, { n: 12, rings: 1, lift: 0.08, jag: 0.05 });
    bagRing(layer, x, z, 1.75, 16, 3, back);
    const y = G(x, z) + 0.08;
    piece(layer, new THREE.CylinderGeometry(0.27, 0.3, 0.06, 8), K.metalDark, x - o[0] * 0.25, y + 0.03, z - o[1] * 0.25, {});
    const e = 0.95, len = 1.29, tx = x - o[0] * 0.25, tz = z - o[1] * 0.25;
    const hx = tx + o[0] * len * Math.cos(e), hz = tz + o[1] * len * Math.cos(e), hy = y + 0.06 + len * Math.sin(e);
    rod(layer, tx, y + 0.06, tz, hx, hy, hz, 0.045, 0x3e4234, { sides: 6 });
    const mx = tx + o[0] * len * 0.62 * Math.cos(e), mz = tz + o[1] * len * 0.62 * Math.cos(e), my = y + 0.06 + len * 0.62 * Math.sin(e);
    for (const s of [-1, 1]) rod(layer, mx, my, mz, mx + o[0] * 0.35 - o[1] * 0.33 * s, y, mz + o[1] * 0.35 + o[0] * 0.33 * s, 0.02, 0x3e4234, { sides: 3 });
    piece(layer, new THREE.BoxGeometry(0.12, 0.1, 0.14), 0x2c3026, mx - o[1] * 0.12, my + 0.08, mz + o[0] * 0.12, {});
    // ready ammunition: crates at the back wall, an open box of rounds
    for (let i = 0; i < 3; i++) { const a = back + (i - 1) * 0.55, cx = x + Math.cos(a) * 1.05, cz = z + Math.sin(a) * 1.05; const top = crate(layer, cx, cz, -a + Math.PI / 2); if (i !== 1) crate(layer, cx, cz, -a + Math.PI / 2 + 0.05, top); }
    { const a = back + 1.3, cx = x + Math.cos(a) * 0.95, cz = z + Math.sin(a) * 0.95, gy = G(cx, cz);
      piece(layer, new THREE.BoxGeometry(0.62, 0.2, 0.4), K.crateDark, cx, gy + 0.1, cz, { ry: -a });
      for (let k = 0; k < 6; k++) { const u = (k % 3 - 1) * 0.17, w = (Math.floor(k / 3) - 0.5) * 0.16; piece(layer, new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6), 0x55573f, cx + Math.cos(-a) * u + Math.sin(-a) * w, gy + 0.3, cz - Math.sin(-a) * u + Math.cos(-a) * w, { rx: 0.12 }); } }
  }
  // the trash pit: a shallow hole with cans, cartons and ash, burning low (the wisp is drawn in init)
  function trashPit(layer) {
    const x = TRASH.x, z = TRASH.z;
    patch(layer, x, z, 1.9, K2.spoil, { n: 10, rings: 1, lift: 0.06, jag: 0.4, sx: 1.3 });
    patch(layer, x, z, 1.25, 0x3a3128, { n: 9, rings: 2, lift: 0.08, jag: 0.25, sx: 1.3 });
    patch(layer, x + 0.2, z, 0.6, 0x5c5a52, { n: 7, rings: 1, lift: 0.1, jag: 0.4 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, d = 1.9; lump(layer, x + Math.cos(a) * d * 1.3, z + Math.sin(a) * d, rr(0.2, 0.32), K.earth); }
    for (let i = 0; i < 10; i++) carton(layer, x + rr(-1.1, 1.1), z + rr(-0.8, 0.8), rr(0, 6));
    for (let i = 0; i < 24; i++) tin(layer, x + rr(-1.4, 1.4), z + rr(-1.0, 1.0));
  }
  // a poncho hooch: two ponchos snapped into a low A-frame on sticks, a ground sheet, a pack at the door
  function hooch(layer, x, z, ry) {
    const y = G(x, z), c = Math.cos(ry), s = Math.sin(ry), hcol = th(x, z, 4) > 0.5 ? K.poncho : 0x535b3c;
    // ridge along the local x axis (world (c, -s)); the two ponchos slope down to either side
    for (const side of [-1, 1]) piece(layer, new THREE.BoxGeometry(2.1, 0.025, 1.12), hcol, x + s * side * 0.4, y + 0.44, z + c * side * 0.4, { ry, rx: side * 0.86, lo: 0.75 });
    for (const e of [-1, 1]) rod(layer, x + c * e * 1.02, y - 0.05, z - s * e * 1.02, x + c * e * 1.02, y + 0.88, z - s * e * 1.02, 0.025, K.pole, { sides: 3 });
    if (th(x, z, 6) > 0.4) { const px = x + c * 1.5, pz = z - s * 1.5; piece(layer, new THREE.BoxGeometry(0.34, 0.4, 0.2), 0x5a5a3a, px, G(px, pz) + 0.18, pz, { ry: ry + 0.4, rx: 0.3 }); }
    if (th(z, x, 7) > 0.5) { const px = x - c * 1.4 + s * 0.9, pz = z + s * 1.4 + c * 0.9; carton(layer, px, pz, rr(0, 6)); tin(layer, px + 0.3, pz + 0.2); }
  }
  // what a week leaves: ammunition crates, cans and boxes, water cans, ration cartons and empty cans, between the
  // holes and the CP; none on Company A's forming ground
  function litter(layer) {
    let n = 0, tries = 0;
    while (n < 120 && tries++ < 1500) {
      const a = rr(0, 6.3), r = Math.sqrt(R()) * 58, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (r > P.rAt(bOf(x, z)) - 2.5 || ASSEMBLY(x, z) || Math.hypot(x - CPB.x, z - CPB.z) < 4.2 || Math.hypot(x - SITE.lz689.x, z - SITE.lz689.z) < 9.5) continue;
      if (MORT.some((m) => Math.hypot(x - m.x, z - m.z) < 2.4) || Math.hypot(x - AID.x, z - AID.z) < 3.4 || WORKS.pathAt(x, z) < 0.2) continue;
      n++;
      const k = R();
      if (k < 0.45) tin(layer, x, z);
      else if (k < 0.7) carton(layer, x, z, rr(0, 6));
      else if (k < 0.82) ammoCan(layer, x, z, rr(0, 6));
      else if (k < 0.92) crate(layer, x, z, rr(0, 6));
      else jerrycan(layer, x, z, rr(0, 6));
    }
  }
  // a man in a hole, as the line is seen from the CP's distance: helmet, shoulders in the flak jacket, arms on the
  // parapet, the rifle laid over the bags (instanced in init; the marines' own figures take some holes)
  function holeManGeo() {
    const pos = [], col = [];
    const add = (geo, hex, x, y, z, o) => {
      o = o || {}; const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(o.sx || 1, o.sy || 1, o.sz || 1)); g.applyMatrix4(_m);
      const A = g.attributes.position.array, c = rgb(hex);
      for (let i = 0; i < A.length; i += 9) {
        _a.set(A[i + 3] - A[i], A[i + 4] - A[i + 1], A[i + 5] - A[i + 2]); _b.set(A[i + 6] - A[i], A[i + 7] - A[i + 1], A[i + 8] - A[i + 2]); _a.cross(_b).normalize();
        const k = (_a.y < -0.3 ? 0.6 : 1) * (o.k || 1);
        for (let j = 0; j < 9; j++) pos.push(A[i + j]);
        for (let j = 0; j < 3; j++) col.push(c[0] * k, c[1] * k, c[2] * k);
      }
    };
    // local frame: +z outward, y up from the ground at the hole's centre; the man stands in the front of the pit, his
    // chest at the parapet, elbows on the bags, the rifle laid forward over them
    add(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 8), 0x56593b, 0, 0.3, 0.02, { sz: 0.72 });                      // flak jacket
    add(new THREE.SphereGeometry(0.19, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), 0x5b5e3e, 0, 0.5, 0.02, { sy: 0.55, sz: 0.8 });   // shoulders
    add(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 6), 0x8f6c50, 0, 0.58, 0.04);                                 // neck
    add(new THREE.SphereGeometry(0.095, 7, 5), 0x9c7656, 0, 0.67, 0.06, { sy: 1.12 });                              // face
    add(new THREE.SphereGeometry(0.155, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), 0x5e5c3d, 0, 0.705, 0.03, { sy: 0.92 }); // helmet
    add(new THREE.CylinderGeometry(0.175, 0.175, 0.025, 9), 0x55543a, 0, 0.705, 0.04, { k: 0.8 });                  // brim
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 5), 0x5b5e40, s * 0.17, 0.43, 0.13, { rx: 1.0, rz: s * 0.2 });   // upper arms
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 5), 0x5b5e40, s * 0.11, 0.42, 0.33, { rx: 1.45, rz: -s * 0.5 }); // forearms
    }
    add(new THREE.BoxGeometry(0.035, 0.06, 0.82), 0x2c2b25, 0.04, 0.44, 0.52, { rx: 0.05 });                        // rifle
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }

  // ---------- build ----------
  function build(ctx) {
    // ===== Hill 689: the holes =====
    for (const h of WORKS.holes) foxhole2('static', h);
    for (const b of PB) { const r = P.rAt(b) - 1.5, o = out(b); pbunker('static', o[0] * r, o[1] * r, o[0], o[1]); }
    // ===== the CP bunker =====
    cpBunker('static');
    {
      // the antenna cluster behind the bunker (RC-292s), and whips up from the roof
      antenna('static', CPA.x, CPA.z, CPA.h);
      antenna('static', CPA.x + CPB.u[0] * 3.4 - CPB.f[0] * 1.2, CPA.z + CPB.u[1] * 3.4 - CPB.f[1] * 1.2, 7.5);
      antenna('static', CPA.x - CPB.u[0] * 3.6 - CPB.f[0] * 0.8, CPA.z - CPB.u[1] * 3.6 - CPB.f[1] * 0.8, 8.2);
      const yr = G(CPB.x, CPB.z) + CPB.roof + 0.62;
      for (const [uu, ww, hh] of [[-1.9, -1.2, 3.2], [-1.4, -1.5, 2.7], [1.7, -1.3, 3.0], [2.2, -0.9, 2.4]]) {
        const ax = CPB.x + CPB.u[0] * uu + CPB.f[0] * ww, az = CPB.z + CPB.u[1] * uu + CPB.f[1] * ww;
        rod('static', ax, yr - 0.4, az, ax + 0.12, yr + hh, az + 0.05, 0.022, 0x33362c, { sides: 4 });
      }
    }
    // ===== the 689 LZ: the panels, a smoke-grenade spot, ammunition and water at its edge =====
    {
      const p = WORKS.lz.lz689;
      patch('static', p.x, p.z, 9, (i, ring) => (ring === 3 ? 0x8c7650 : th(i, ring, 7) > 0.55 ? 0xa48660 : (i + ring) % 2 ? 0x9a7d58 : 0x93754f), { n: 16, rings: 3, lift: 0.1 });
      piece('static', new THREE.BoxGeometry(1.8, 0.04, 0.6), K.orange, p.x + 5.5, 0.12, p.z - 2, { drape: true, ry: 0.4, lo: 1, tone: 0 });
      piece('static', new THREE.BoxGeometry(1.8, 0.04, 0.6), K.cerise, p.x + 6.2, 0.12, p.z - 0.9, { drape: true, ry: 0.4 + Math.PI / 2, lo: 1, tone: 0 });
      piece('static', new THREE.BoxGeometry(1.8, 0.04, 0.6), K.orange, p.x - 5.8, 0.12, p.z + 2.6, { drape: true, ry: -0.3, lo: 1, tone: 0 });
      patch('static', p.x - 1, p.z + 1, 0.6, K.scorch, { n: 7, rings: 1, lift: 0.13 });
      piece('static', new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6), K.smokeCan, p.x - 1, G(p.x - 1, p.z + 1) + 0.09, p.z + 1, { rz: 1.4 });
      const ex = p.x - 9.5, ez = p.z - 4;
      for (let i = 0; i < 6; i++) { const cx = ex + (i % 3) * 0.95, cz = ez + Math.floor(i / 3) * 0.5, top = crate('static', cx, cz, 0.1); if (i < 3) crate('static', cx, cz, 0.14, top); }
      for (let i = 0; i < 6; i++) jerrycan('static', ex + 0.3 + i * 0.4, ez + 1.4, 0.1 + rr(-0.1, 0.1));
      for (let i = 0; i < 5; i++) carton('static', ex + 3.2 + rr(-0.4, 0.4), ez + rr(-0.5, 0.8), rr(0, 6));
    }
    // ===== the aid station, its stretchers; the mortar pits; the trash pit =====
    aidBunker('static');
    for (const m of MORT) mortarPit('static', m);
    trashPit('static');
    // ===== poncho hooches behind the line =====
    {
      let n = 0, tries = 0;
      const placed = [];
      while (n < 34 && tries++ < 600) {
        const b = rr(0, 360), o = out(b), r = P.rAt(b) - rr(7, 13), x = o[0] * r, z = o[1] * r;
        if (ASSEMBLY(x, z) || Math.hypot(x, z) < 10 || Math.hypot(x - SITE.lz689.x, z - SITE.lz689.z) < 12 || Math.hypot(x - AID.x, z - AID.z) < 5.5) continue;
        if (MORT.some((m) => Math.hypot(x - m.x, z - m.z) < 4.5) || Math.hypot(x - TRASH.x, z - TRASH.z) < 5 || WORKS.pathAt(x, z) < 0.6) continue;
        if (placed.some((q) => Math.hypot(q[0] - x, q[1] - z) < 3.2)) continue;
        placed.push([x, z]); n++;
        hooch('static', x, z, Math.atan2(o[0], o[1]) + Math.PI / 2 + rr(-0.4, 0.4));
      }
      WORKS.hooches = placed.map(([x, z]) => V(x, G(x, z), z));
    }
    // ===== the litter of eight days =====
    litter('static');
    // ===== the 82 mm fire of 8 April: 38 rounds (research.md 3), small craters weathered and trodden over =====
    {
      let n = 0, tries = 0;
      while (n < 38 && tries++ < 500) {
        const a = rr(0, 6.3), r = Math.sqrt(R()) * 66, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - CPB.x, z - CPB.z) < 5 || WORKS.holes.some((h) => Math.hypot(h.pos.x - x, h.pos.z - z) < 1.6)) continue;
        if (Math.hypot(x - SITE.lz689.x, z - SITE.lz689.z) < 8) continue;
        n++;
        const cr = rr(0.55, 0.95), old = WORKS.pathAt(x, z) < 0.5 || Math.hypot(x, z) < P.rAt(bOf(x, z)) - 3;
        patch('static', x, z, cr * 1.7, (i, ring) => (ring === 2 ? (old ? 0x7d6448 : 0x6a5238) : old ? 0x5e4a36 : 0x4a3b2b), { n: 9, rings: 2, lift: 0.1, jag: 0.45 });
        patch('static', x, z, cr * 0.6, old ? 0x463626 : 0x33291f, { n: 7, rings: 1, lift: 0.12, jag: 0.25 });
        for (let k = 0; k < 4; k++) { const aa = k / 4 * 6.28 + rr(0, 0.9), d = cr * rr(1.0, 1.5); lump('static', x + Math.cos(aa) * d, z + Math.sin(aa) * d, rr(0.1, 0.18), k % 2 ? K.earth : 0x7a5a3a); }
      }
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
      // ----- the men in the holes the marines' own figures do not take: two to a hole at stand-to (chapters 1 and 10),
      // one on watch otherwise; down in the hole while the rockets fall (chapter 5, 60-82)
      {
        const geo = holeManGeo(), M = ctx.mat(0xffffff, { vertexColors: true }), H = WORKS.holes;
        const mk = () => { const m = new THREE.InstancedMesh(geo, M, H.length); m.userData.dynamic = true; ctx.root.add(m); return m; };
        me.men = [mk(), mk()];
        me.vacant = new Set();
        const place = () => {
          me.men.forEach((m, k) => {
            let n = 0;
            H.forEach((h, i) => {
              if (me.vacant.has(i) || (k === 1 && th(i, 7, 1) < 0.18)) return;
              const yaw = Math.atan2(h.out.x, h.out.z) + (th(i, k, 3) - 0.5) * 0.7, side = k ? -0.42 : 0.38;
              const x = h.pos.x - h.out.z * side, z = h.pos.z + h.out.x * side;
              _q.setFromAxisAngle(UPV, yaw);
              _m.compose(_p.set(x, G(x, z) - 0.04 - th(i, k, 5) * 0.08, z), _q, _s.set(1, 1, 1));
              m.setMatrixAt(n++, _m);
            });
            m.count = n; m.instanceMatrix.needsUpdate = true;
          });
        };
        place();
        // marines-a-d / marines-c: a hole their own figure stands in shows no stand-in
        WORKS.vacate = (idx) => { for (const i of idx) me.vacant.add(i); place(); };
      }
      // ----- seats: an ammunition box under a man who sits (the marines files call WORKS.seat at build time)
      {
        const geo = new THREE.BoxGeometry(0.9, 0.4, 0.45, 1, 2, 1).toNonIndexed(), A = geo.attributes.position.array, col = [];
        for (let i = 0; i < A.length; i += 3) { const c = rgb(A[i + 1] > 0.12 ? K.crateDark : K.crate); col.push(c[0] * 0.92, c[1] * 0.92, c[2] * 0.92); }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
        const seats = new THREE.InstancedMesh(geo, ctx.mat(0xffffff, { vertexColors: true }), 96);
        seats.count = 0; seats.frustumCulled = false; ctx.world.add(seats);
        // WORKS.seat(x, z, yaw, kind): 'box' puts an ammunition box under the man and returns the sink for his feet
        // (Sitting Idle's seat is WORKS.SEAT_H above his soles); 'lip' (a hole's rear lip, his legs in the hole) and
        // 'ground'/'none' add nothing
        WORKS.SEAT_H = 0.4;
        WORKS.seat = (x, z, yaw, kind) => {
          kind = kind || 'box';
          if (kind === 'lip') return { sink: WORKS.SEAT_H };
          if (kind !== 'box' || seats.count >= 96) return { sink: 0 };
          _q.setFromAxisAngle(UPV, yaw + Math.PI / 2 * 0 + 0);
          _m.compose(_p.set(x - Math.sin(yaw) * 0.04, G(x, z) + 0.2, z - Math.cos(yaw) * 0.04), _q.setFromAxisAngle(UPV, yaw), _s.set(1, 1, 1));
          seats.setMatrixAt(seats.count++, _m); seats.instanceMatrix.needsUpdate = true;
          return { sink: WORKS.SEAT_H - 0.4 };
        };
      }
      // ----- the trash pit's smoke: a thin wisp by day
      {
        const N = 14, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c2 = cv.getContext('2d');
        const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
        const sm2 = new THREE.PointsMaterial({ size: 2.2, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, color: 0xb9b4a8, opacity: 0.32, sizeAttenuation: true });
        me.smoke = new THREE.Points(g, sm2); me.smoke.frustumCulled = false; me.smoke.userData.dynamic = true; ctx.root.add(me.smoke);
        me.smokeN = N;
      }
      const show = (ch) => {
        const id = ch.id, m = me.meshes;
        m.hidden.visible = id <= 2;
        m.revealed.visible = id >= 3;
        m.scars.visible = id >= 6;
        m.alz.visible = id >= 3;
        m.czlz.visible = id >= 6;
        m.panels.visible = id === 7;
        // a man on watch in every hole; the second man up at stand-to (dawn) and in the afternoon's alert
        me.men[0].visible = true;
        me.men[1].visible = id === 1 || id === 10 || id === 5 || id === 6 || id === 7;
        me.smoke.visible = id <= 4 || id === 11;
      };
      ctx.onChapter(show);
      show(ctx.chapter);
      // the steered camera stays out of the bunkers (ridge and 689) and the CP's sandbags (integration)
      const keepOut = WORKS.bunkers.map((b) => [b.pos.x, b.pos.z, 3.4]).concat(PB.map((b) => { const r = P.rAt(b); return [Math.sin(b * DEG) * r, -Math.cos(b * DEG) * r, 3.6]; }), [[CPB.x, CPB.z, 4.2], [AID.x, AID.z, 3.0]]);
      ctx.addCamFloor((x, z) => { for (const k of keepOut) if (Math.abs(x - k[0]) < k[2] && Math.abs(z - k[1]) < k[2] && Math.hypot(x - k[0], z - k[1]) < k[2]) return G(x, z) + 3.2; return null; });
      const arcMid = SITE.bunkerArc[4];
      ctx.tag('bunkers', () => arcMid, { r: 18, when: (ch) => ch.id >= 3 });
      ctx.tag('czlz', () => SITE.czlz, { r: 12, when: (ch) => ch.id >= 6 });
      ctx.tag('alz', () => SITE.alz, { r: 10, when: (ch) => ch.id >= 3 });
      ctx.tag('base', () => WORKS.masts.base, { r: 30 });
    },
    update(t, dt, ctx) {
      const me = this;
      if (me.men) {
        // chapter 5: down into the holes for the rockets (60-82)
        const tt = ctx.cycle.t, k = ctx.chapter.id === 5 ? sm((tt - 60.2) / 0.5) * (1 - sm((tt - 82) / 2)) : 0;
        for (const m of me.men) m.position.y = -0.62 * k;
      }
      if (me.smoke && me.smoke.visible) {
        const a = me.smoke.geometry.attributes.position, tt = ctx.cycle.t, x0 = TRASH.x + 0.2, z0 = TRASH.z, y0 = G(x0, z0);
        for (let i = 0; i < me.smokeN; i++) { const f = ((tt * 0.09 + i / me.smokeN) % 1); a.setXYZ(i, x0 + f * 2.2 + Math.sin(i * 1.7 + tt * 0.3) * 0.3 * f, y0 + 0.3 + f * 5.5, z0 + f * 0.9 + Math.cos(i * 2.3) * 0.25 * f); }
        a.needsUpdate = true;
      }
      const p = this.meshes && this.meshes.panels;
      if (!p || !p.visible) return;
      // laid out from about 1730 (t 94), picked up before the loop returns to 1500
      const k = sm((ctx.cycle.t - 94) / 2) * (1 - sm((ctx.cycle.t - 117) / 2.5));
      p.position.y = -0.5 * (1 - k);
    },
  });
  // the registered object is window.Scene's copy; keep WORKS as the one other plug-ins read
})();
