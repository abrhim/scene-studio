// land.js: the land of Hill 689 and the battle ridge (DESIGN.md 1, 2, 4, 7, 8; DECISIONS.md "Land and vegetation",
// "Grass", "Scale of the ground"). Plug-in "land". Budget 60 draws, 1.2 M triangles.
//
//   Elephant grass: treatment C of grass-study/ (3D arching blade clumps near the camera, painted crossed cards beyond,
//     dithered switches), placed by ctx.land.cls, with the study's four owed improvements: stiff culms with leaves at
//     several heights, a dark interior (litter under the stand, AO up the clump), plume heads on some stems, trampled
//     lanes along SITE.routes that appear from the chapter they were made, with standing walls and grass flattened
//     along the line of travel. Four distance tiers, generated lazily per chunk from a hash grid (deterministic), the
//     instances picked on the CPU when the camera moves (no allocation per frame).
//   Forest and bamboo in the draws (cls forest), a tree line below the bunker crest on the west of the battle hill.
//   B-52 craters: bowls with thrown-earth rims on the crest and upper slopes, a few with water; the named ones.
//   Streams: intermittent creeks in the valley draws and the gully, faked shallow channels with stones and a few pools. Laterite on the lanes and the 689 perimeter.
//   Dust on the 689 perimeter and the LZs by day; valley haze in chapters 1, 2 and 10.
//   Clearings from works.js (window.WORKS.clearings) and rotor wash under window.MEDEVAC.
// The base's ground material gets a small injection (litter under the grass, laterite on lanes and the perimeter);
// the base file itself is untouched.
(function () {
  'use strict';
  window.Scene.register({
    name: 'land',
    init(ctx) { this.u = build(ctx); },
    update(t, dt, ctx) { if (this.u) this.u(t, dt); },
  });

  function build(ctx) {
    const { THREE, SITE } = ctx;
    const L = ctx.land, tile = L.tile, gy = ctx.groundY, landCls = L.cls;
    const TAU = Math.PI * 2;
    const lin = ctx.lin;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const sstep = (a, b, v) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
    const mulberry32 = ctx.mulberry32;
    function ih(ix, iz, s) { let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
    function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); const a = ih(ix, iz, 7), b = ih(ix + 1, iz, 7), c = ih(ix, iz + 1, 7), d = ih(ix + 1, iz + 1, 7); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
    function fbm(x, z) { return vnoise(x, z) * 0.55 + vnoise(x * 2.07 + 5.2, z * 2.07 - 1.3) * 0.3 + vnoise(x * 4.3 - 2.7, z * 4.3 + 7.1) * 0.15; }
    const P = SITE.perimeter, CP = SITE.cp;
    const bearingOf = (x, z) => ((Math.atan2(x - CP.x, -(z - CP.z)) * 180 / Math.PI) + 360) % 360;

    const STREAMS = [];
    // ======================= craters =======================
    // B-52 bowls at true size (base: SITE.craters, 8-20 m across). The ground can't be lowered from a plug-in, so a bowl
    // is a raised rim of thrown earth round a bare laterite floor at ground level; its height is a walking surface.
    const CR = [];
    {
      const c0 = SITE.craters.center, R0 = SITE.craters.radius, rnd = mulberry32(52);
      const avoid = [SITE.himmerFall, SITE.czlz, SITE.alz, SITE.charliePause, SITE.deltaStart, SITE.secondPosition, SITE.northEnd, ...SITE.bunkerArc];
      const ok = (x, z, r, named) => {
        if (!named) {
          if (Math.hypot(x - c0.x, z - c0.z) > R0) return false;
          if (landCls(x, z) < 0.6 || L.realH(x, z) < 545) return false;
          for (const p of avoid) if (Math.hypot(p.x - x, p.z - z) < r * 1.35 + 4) return false;
        }
        for (const c of CR) if (Math.hypot(c.x - x, c.z - z) < (c.r + r) * (named || c.named ? 1.05 : 0.8)) return false;
        return true;
      };
      const addC = (x, z, r, named, water) => { CR.push({ x, z, r, named: named || null, water: !!water, h: 0.35 + 0.075 * 2 * r, p1: rnd() * TAU, p2: rnd() * TAU }); };
      addC(SITE.hunnicuttCrater.x, SITE.hunnicuttCrater.z, 6.5, 'hunnicutt');   // "the size of a swimming pool" class
      addC(SITE.craterSix.x, SITE.craterSix.z, 4.6, 'six');
      addC(SITE.dawnCover.x, SITE.dawnCover.z, 3.6, 'dawn');
      // bomb trains: strings of craters along a line, as B-52 strikes fall
      for (let s = 0; s < 6; s++) {
        const a = rnd() * TAU, d0 = Math.sqrt(rnd()) * R0 * 0.8;
        let x = c0.x + Math.cos(a) * d0, z = c0.z + Math.sin(a) * d0;
        const hd = rnd() * TAU, n = 8 + Math.floor(rnd() * 6);
        x -= Math.cos(hd) * n * 6; z -= Math.sin(hd) * n * 6;
        for (let k = 0; k < n * 2; k++) {
          const r = (8 + 12 * Math.pow(rnd(), 1.8)) / 2;
          x += Math.cos(hd) * (r * 2.2 + rnd() * 4) + (rnd() - 0.5) * 4; z += Math.sin(hd) * (r * 2.2 + rnd() * 4) + (rnd() - 0.5) * 4;
          if (ok(x, z, r)) addC(x, z, r);
          if (CR.length >= 46) break;
        }
      }
      for (let k = 0; k < 400 && CR.length < 54; k++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * R0, r = (8 + 12 * Math.pow(rnd(), 1.8)) / 2;
        const x = c0.x + Math.cos(a) * d, z = c0.z + Math.sin(a) * d;
        if (ok(x, z, r)) addC(x, z, r);
      }
      // standing water in a few on gentle ground (ours: left from the wet season)
      let w = 0;
      for (const c of CR) {
        if (c.named || w >= 5) continue;
        const sl = Math.abs(gy(c.x + c.r, c.z) - gy(c.x - c.r, c.z)) + Math.abs(gy(c.x, c.z + c.r) - gy(c.x, c.z - c.r));
        if (sl < 0.16 * c.r) { c.water = true; w++; }
      }
      // on steep ground a flat floor cut into the slope showed only as a long strip (review: red streaks): there the
      // bowl drapes on the slope (no flat floor) and is drawn a little smaller (fix pass)
      for (const c of CR) {
        c.steep = 0;
        if (c.named || c.water) continue;
        const gr = (Math.abs(gy(c.x + c.r, c.z) - gy(c.x - c.r, c.z)) + Math.abs(gy(c.x, c.z + c.r) - gy(c.x, c.z - c.r))) / (2 * c.r);
        c.steep = sstep(0.18, 0.45, gr);
        c.r *= 1 - 0.3 * c.steep; c.h = 0.35 + 0.075 * 2 * c.r;
      }
      for (const c of CR) {
        c.flat = c.water ? 1 : 0.5 * (1 - c.steep);
        let hi = -1e9; for (let a = 0; a < 8; a++) hi = Math.max(hi, gy(c.x + Math.cos(a * TAU / 8) * c.r * 0.6, c.z + Math.sin(a * TAU / 8) * c.r * 0.6));
        c.floorY = Math.max(hi, gy(c.x, c.z));
      }
    }
    // a grid of the craters by 10 m cell for lookups
    const CG = new Map(), CGS = 10;
    for (let i = 0; i < CR.length; i++) {
      const c = CR[i], e = c.r * 1.62;
      for (let gx = Math.floor((c.x - e) / CGS); gx <= Math.floor((c.x + e) / CGS); gx++) for (let gz = Math.floor((c.z - e) / CGS); gz <= Math.floor((c.z + e) / CGS); gz++) {
        const k = gz * 100000 + gx; if (!CG.has(k)) CG.set(k, []); CG.get(k).push(i);
      }
    }
    const rEff = (c, th) => c.r * (1 + 0.07 * Math.sin(3 * th + c.p1) + 0.05 * Math.sin(5 * th + c.p2));
    function prof(q, h) {
      if (q < 0.62) return 0.07;
      if (q < 1.0) return 0.07 + (h - 0.07) * Math.pow((q - 0.62) / 0.38, 1.5);
      if (q < 1.55) { const u = (q - 1) / 0.55; return h * (1 - u * u * (3 - 2 * u)) - 0.08 * u * u * u * u; }
      return 0;
    }
    // craterAt(x, z): sets CQ (the smallest normalised distance) and CL (the lift above the ground there)
    let CQ = 9, CL = 0;
    function craterAt(x, z) {
      CQ = 9; CL = 0;
      const list = CG.get(Math.floor(z / CGS) * 100000 + Math.floor(x / CGS));
      if (!list) return;
      let best = -1e9, g = null;
      for (const i of list) {
        const c = CR[i], dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
        const q = d / rEff(c, Math.atan2(dz, dx));
        if (q >= 1.55) continue;
        if (q < CQ) CQ = q;
        if (g === null) g = gy(x, z);
        const fw = c.flat * (1 - sstep(0.62, 1.0, q));
        const lift = prof(q, c.h) + fw * (c.floorY - g);
        if (lift > best) best = lift;
      }
      if (best > -1e9) CL = best;
    }
    const surfY = (x, z) => { craterAt(x, z); return gy(x, z) + CL; };
    ctx.addSurface((x, z) => { craterAt(x, z); return CQ < 1.55 ? gy(x, z) + CL : null; });

    // the base's ground colours, to blend crater aprons into
    const groundMesh = ctx.world.children.find((o) => o.name === 'ground');
    const NXg = tile.xs.length;
    function groundCol(x, z, out) {
      const col = groundMesh.geometry.attributes.color.array;
      const fi = clamp((x - tile.x0) / tile.cell, 0, tile.nx - 1.001), fj = clamp((z - tile.z0) / tile.cell, 0, tile.nz - 1.001);
      const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, w = fj - j;
      const k = (j + tile.zi0) * NXg + i + tile.xi0;
      for (let c = 0; c < 3; c++) out[c] = (col[k * 3 + c] * (1 - u) + col[(k + 1) * 3 + c] * u) * (1 - w) + (col[(k + NXg) * 3 + c] * (1 - u) + col[(k + NXg + 1) * 3 + c] * u) * w;
      return out;
    }

    const earthMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    // The grade (fix pass, review 2026-11-09): under warm low light the laterite read as pools of blood with wounded men
    // lying in it. Per light preset the crater earth and the bare ground are desaturated and pulled toward a dull umber
    // (dusk), a cool grey-brown (night) or a pale grey-umber (first light); in full day the laterite stays, a touch less
    // saturated. uGSat: 1 keeps the colour, 0 is grey; uGTint multiplies; uGGround grades the whole bare ground (the
    // trampled clearings) toward the grass's own night and dawn palette.
    const GRADE = { uGSat: { value: 0.85 }, uGTint: { value: new THREE.Vector3(1, 1, 1) }, uGGround: { value: 0 }, uGGTint: { value: new THREE.Vector3(1, 1, 1) } };
    const GRADES = {
      sunrise: { sat: 0.55, tint: [0.92, 0.88, 0.84], g: 0, gt: [1, 1, 1] },
      morning: { sat: 0.62, tint: [0.92, 0.88, 0.84], g: 0, gt: [1, 1, 1] },
      day: { sat: 0.62, tint: [0.92, 0.88, 0.84], g: 0, gt: [1, 1, 1] },
      noon: { sat: 0.62, tint: [0.92, 0.88, 0.84], g: 0, gt: [1, 1, 1] },
      // final pass: under the gold light the floors still read maroon (ch 7 t 2); less saturated, the red pulled down
      gold: { sat: 0.24, tint: [0.86, 0.86, 0.8], g: 0, gt: [1, 1, 1] },
      dusk: { sat: 0.35, tint: [0.9, 0.88, 0.7], g: 0.3, gt: [0.95, 0.9, 0.82] },
      night: { sat: 0.08, tint: [0.95, 1.0, 1.12], g: 0.85, gt: [1.25, 1.35, 1.5] },
      firstlight: { sat: 0.15, tint: [1.2, 1.16, 1.06], g: 0.7, gt: [1.12, 1.08, 1.02] },
    };
    const GLSL_GRADE = 'uniform float uGSat; uniform vec3 uGTint; uniform float uGGround; uniform vec3 uGGTint;\nvec3 gradeLat(vec3 c) { float l = dot(c, vec3(0.299, 0.587, 0.114)); return mix(vec3(l), c, uGSat) * uGTint; }\n';
    earthMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, GRADE);
      sh.fragmentShader = GLSL_GRADE + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = gradeLat(diffuseColor.rgb);');
    };
    earthMat.customProgramCacheKey = () => 'landEarthGrade';
    const waterMat = new THREE.MeshStandardMaterial({ color: lin(0x343c3a), roughness: 0.12, metalness: 0, emissive: new THREE.Color(0, 0, 0), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const cLat = lin(0x86563c), cLatD = lin(0x5e3a26), cDust = lin(0x958a6e), cMud = lin(0x3e3024);
    {
      const pos = [], col = [], wpos = [];
      const FR = [0, 0.3, 0.5, 0.62, 0.74, 0.86, 0.95, 1.0, 1.1, 1.25, 1.4, 1.55];
      const gc = [0, 0, 0], tc = new THREE.Color();
      for (const c of CR) {
        const S = c.r < 5 ? 16 : 22, verts = [];
        for (let i = 0; i < FR.length; i++) {
          const row = [];
          for (let j = 0; j < S; j++) {
            const th = (j + (i % 2) * 0.5) / S * TAU, q = FR[i], re = rEff(c, th) * q;
            const x = c.x + Math.cos(th) * re, z = c.z + Math.sin(th) * re, g = gy(x, z);
            const fw = c.flat * (1 - sstep(0.62, 1.0, q));
            const y = g + prof(q, c.h) + fw * (c.floorY - g) + (q < 0.62 ? 0.1 : 0);
            // colour: dark laterite floor, laterite wall, pale thrown dust on the rim, into the ground's own colour
            const n = vnoise(x * 0.9, z * 0.9);
            if (q < 0.62) tc.copy(c.water ? cMud : cLatD).lerp(cLat, 0.35 * n);
            else if (q < 0.95) tc.copy(cLat).lerp(cLatD, 0.25 * (1 - n)).lerp(cDust, sstep(0.8, 0.95, q) * 0.6);
            else if (q < 1.15) tc.copy(cDust).lerp(cLat, 0.3 * n);
            else { groundCol(x, z, gc); tc.copy(cDust).lerp(cLat, 0.25 * n); const k = sstep(1.1, 1.4, q); tc.r += (gc[0] - tc.r) * k; tc.g += (gc[1] - tc.g) * k; tc.b += (gc[2] - tc.b) * k; }
            const k3 = q < 1.15 ? 0.7 : 1;
            row.push([x, y, z, tc.r * k3, tc.g * k3, tc.b * k3]);
          }
          verts.push(row);
        }
        const put = (v) => { pos.push(v[0], v[1], v[2]); col.push(v[3], v[4], v[5]); };
        for (let j = 0; j < S; j++) { put([c.x, verts[0][0][1], c.z, verts[0][0][3], verts[0][0][4], verts[0][0][5]]); put(verts[1][(j + 1) % S]); put(verts[1][j]); }
        for (let i = 1; i < FR.length - 1; i++) for (let j = 0; j < S; j++) {
          const a = verts[i][j], b = verts[i][(j + 1) % S], o = i % 2;
          const cc = verts[i + 1][(j + o) % S], d = verts[i + 1][(j + 1 + o) % S];
          if (o === 0) { put(a); put(b); put(cc); } else { put(a); put(b); put(cc); }
          put(b); put(d); put(cc);
        }
        if (c.water) {
          const wy = c.floorY + 0.3, wr = c.r * 0.76, n = 14;
          for (let j = 0; j < n; j++) { const a0 = j / n * TAU, a1 = (j + 1) / n * TAU; wpos.push(c.x, wy, c.z, c.x + Math.cos(a1) * wr, wy, c.z + Math.sin(a1) * wr, c.x + Math.cos(a0) * wr, wy, c.z + Math.sin(a0) * wr); }
        }
      }
      // streams (below) add their beds and water to the same arrays
      buildStreams(pos, col, wpos);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      ctx.world.add(new THREE.Mesh(g, earthMat));
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
      wg.computeVertexNormals();
      ctx.world.add(new THREE.Mesh(wg, waterMat));
    }

    // ======================= streams =======================
    // Intermittent creeks in the valley draws and the gully (1968 sheet: thin blue lines, intermittent), traced downhill
    // from the saddle and the gully's lip. Fix pass 2026-11-09 (Abram on the old flat glint ribbon: "what is this
    // line?"): the ground can't be lowered from a plug-in, so a creek is a faked shallow channel, as the craters fake
    // their bowls: a low lip of dark wet earth each side and a darker bed between, both of varying width on each side
    // and fading into the ground's own colour (no border stripe), with stretches where the channel all but vanishes;
    // pale sand bars on the inside of bends; rounded stones along the bed, partly sunk (one instanced draw); water only
    // in a few low still pools (end of the dry season). The gully below SITE.gullyEdge is a dry rocky bed with a broken
    // trickle at its bottom. Trees stand over the streams (forest below), so they show in glimpses through the canopy.
    function trace(x, z, len) {
      const pts = []; let dx = 0, dz = 0, rise = 0, last = gy(x, z), push = 0, breach = 0, yStall = 0;
      for (let s = 0; s < len / 2; s++) {
        if (push > 0) push--;
        else {
          const e = 1.6, gx = gy(x + e, z) - gy(x - e, z), gz = gy(x, z + e) - gy(x, z - e), l = Math.hypot(gx, gz) || 1;
          dx = dx * 0.65 - gx / l * 0.35; dz = dz * 0.65 - gz / l * 0.35;
        }
        const m = Math.hypot(dx, dz) || 1; x += dx / m * 2; z += dz / m * 2;
        if (x < tile.x0 + 5 || x > tile.x1 - 5 || z < tile.z0 + 5 || z > tile.z1 - 5) break;
        const y = gy(x, z);
        if (push > 0) { if (y > yStall + 2.5) break; }
        else { rise = y > last - 0.02 ? rise + 1 : 0; if (rise > 12) break; }
        last = y;
        pts.push([x, z]);
        // circling in a hollow of the elevation model (it piled most of a stream's points on one spot): back out of the
        // circle and carry straight on down the draw, as the water would once the hollow filled; three times at most
        const n = pts.length;
        if (n > 12 && Math.hypot(x - pts[n - 9][0], z - pts[n - 9][1]) < 7) {
          pts.length = n - 8;
          if (++breach > 3) break;
          const p = pts[pts.length - 1], q = pts[pts.length - 5];
          x = p[0]; z = p[1]; dx = p[0] - q[0]; dz = p[1] - q[1]; push = 14; yStall = gy(x, z); rise = 0; last = yStall;
        }
      }
      return pts;
    }
    function buildStreams(pos, col, wpos) {
      const sad = SITE.saddle, a = SITE.bearing689to600 * Math.PI / 180, px = Math.cos(a), pz = Math.sin(a);
      const starts = [[sad.x + px * 12, sad.z + pz * 12, 320, 'creek'], [sad.x - px * 12, sad.z - pz * 12, 320, 'creek'], [SITE.gullyEdge.x, SITE.gullyEdge.z, 260, 'gully'], [SITE.crossing.to.x, SITE.crossing.to.z, 200, 'creek']];
      const cBank = lin(0x3d3122), cWet = lin(0x2b2218), cBed = lin(0x211a13), cSand = lin(0x8a7b5f), cRockBed = lin(0x4a4338);
      const gc = [0, 0, 0], tc = new THREE.Color(), tg = new THREE.Color(), rs = mulberry32(6891), stones = [];
      // the cross-section from the -n side to the +n side, in fractions of that side's half-width: ground, lip, wet
      // bank, bed, centre, bed, wet bank, lip, ground
      const OF = [-2.1, -1.4, -1.0, -0.5, 0, 0.5, 1.0, 1.4, 2.1];
      const put = (v) => { pos.push(v[0], v[1], v[2]); col.push(v[3], v[4], v[5]); };
      starts.forEach(([sx, sz, len, kind], si) => {
        const raw = trace(sx, sz, len); if (raw.length < 8) return;
        const gully = kind === 'gully', N = raw.length;
        // a slow wander across the draw, so the bed doesn't run ruler-straight down the fall line
        const pts = raw.map((p, i) => {
          const pa = raw[Math.max(0, i - 2)], pb = raw[Math.min(N - 1, i + 2)], dx = pb[0] - pa[0], dz = pb[1] - pa[1], l = Math.hypot(dx, dz) || 1;
          const o = ((vnoise(i * 0.06 + si * 13, 0.7) - 0.5) * 3.6 + (vnoise(i * 0.2 + si * 5, 2.9) - 0.5) * 0.8) * Math.min(1, i / 6);
          const x = p[0] - dz / l * o, z = p[1] + dx / l * o;
          return [x, z, gy(x, z)];   // x, z, and the ground's height for tools
        });
        pts.kind = kind;
        STREAMS.push(pts);
        // frames: tangent t, normal n (t turned toward +z from +x), bend k (> 0 turns toward +n, so +n is the inside),
        // half-widths each side, and presence pr (0: the channel fades out into the forest floor)
        const F = pts.map((p, i) => {
          const pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(N - 1, i + 1)];
          let tx = pb[0] - pa[0], tz = pb[1] - pa[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          return { x: p[0], z: p[1], tx, tz, nx: -tz, nz: tx };
        });
        F.forEach((f, i) => {
          let k = 0;
          for (let d = -3; d <= 3; d++) { const a0 = F[clamp(i + d - 1, 0, N - 1)], a1 = F[clamp(i + d + 1, 0, N - 1)]; k += a0.tx * a1.tz - a0.tz * a1.tx; }
          f.k = k / 7;
          const n = vnoise(i * 0.13 + si * 7, 4.4), w = gully ? 0.8 + 1.4 * n : 0.45 + 1.5 * n;
          const taper = sstep(0, 6, i) * sstep(0, 6, N - 1 - i);
          f.wp = w * (0.7 + 0.6 * vnoise(i * 0.31, si + 1.1)) * (0.4 + 0.6 * taper);
          f.wn = w * (0.7 + 0.6 * vnoise(i * 0.29, si + 6.3)) * (0.4 + 0.6 * taper);
          f.pr = sstep(0.18, 0.5, vnoise(i * 0.06 + si * 3, 8.2)) * taper;
          if (gully) f.pr = Math.max(f.pr, 0.6 * taper);
        });
        // still pools in the low spots of a creek (two at most, 50 m apart); the bed is full and wide round them
        const pools = [];
        if (!gully) {
          const yAt = (i) => { const f = F[clamp(i, 0, N - 1)]; return gy(f.x, f.z); };
          const cand = []; for (let i = 6; i < N - 4; i++) if (yAt(i) <= yAt(i - 3) && yAt(i) <= yAt(i + 3)) cand.push([yAt(i), i]);
          cand.sort((p, q) => p[0] - q[0]);
          for (const [, i] of cand) { if (pools.length >= 2) break; if (pools.every((j) => Math.abs(j - i) > 25)) pools.push(i); }
        }
        pts.pools = pools.map((i) => pts[i]);
        F.forEach((f, i) => {
          const pn = pools.reduce((m, j) => Math.min(m, Math.abs(j - i)), 99);
          if (pn < 4) { const k = 1 - pn / 4; f.pr = Math.max(f.pr, k); f.wp *= 1 + 0.4 * k; f.wn *= 1 + 0.4 * k; }
        });
        // the channel
        const lip = gully ? 0.34 : 0.26, LIFT = [0.05, lip, lip * 0.5, 0.07, 0.06, 0.07, lip * 0.5, lip, 0.05];   // over the ground mesh's folds
        const rows = F.map((f) => OF.map((o, j) => {
          const w = o < 0 ? f.wn : f.wp, x = f.x + f.nx * o * w, z = f.z + f.nz * o * w, ao = Math.abs(o), m = vnoise(x * 0.8 + si, z * 0.8);
          groundCol(x, z, gc); tg.setRGB(gc[0], gc[1], gc[2]);
          if (ao > 2) tc.copy(tg);
          else if (ao > 1.2) tc.copy(cBank).lerp(tg, 0.35 + 0.3 * m);
          else if (ao > 0.9) tc.copy(cWet).lerp(cBank, 0.4 * m);
          else tc.copy(gully ? cRockBed : cBed).lerp(gully ? cBank : cWet, 0.5 * m);
          if (!gully && ao > 0.2 && ao < 1.2 && Math.sign(o) === Math.sign(f.k)) tc.lerp(cSand, sstep(0.08, 0.22, Math.abs(f.k)) * (0.6 + 0.4 * m));
          if (ao <= 2) tc.lerp(tg, 1 - f.pr);
          return [x, gy(x, z) + (ao > 2 ? LIFT[j] : 0.05 + (LIFT[j] - 0.05) * f.pr), z, tc.r, tc.g, tc.b];
        }));
        for (let i = 1; i < N; i++) for (let j = 0; j < OF.length - 1; j++) {
          const A = rows[i - 1][j + 1], B = rows[i - 1][j], C = rows[i][j + 1], D = rows[i][j];
          put(A); put(C); put(B); put(B); put(C); put(D);
        }
        // pools: flat water at the low end of the hollow; the higher ground and the lips hide the rest of the disc
        for (const i of pools) {
          const f = F[i], al = 1.4 + 1.2 * rs(), ac = Math.min(1.5, 0.35 + 0.5 * (f.wp + f.wn)), S = 12, rim = [];
          let ymin = 1e9;
          for (let s = 0; s < S; s++) {
            const th = s / S * TAU, rr = 0.75 + 0.35 * vnoise(s * 0.9 + i, si * 2.3);
            const u = Math.cos(th) * al * rr, v = Math.sin(th) * ac * rr, x = f.x + f.tx * u + f.nx * v, z = f.z + f.tz * u + f.nz * v;
            rim.push([x, z]); ymin = Math.min(ymin, gy(x, z));
          }
          const wy = ymin + 0.16;
          for (let s = 0; s < S; s++) { const p0 = rim[s], p1 = rim[(s + 1) % S]; wpos.push(f.x, wy, f.z, p1[0], wy, p1[1], p0[0], wy, p0[1]); }
        }
        // the gully's trickle: broken threads of water down its lower half
        if (gully) for (let i = Math.floor(N * 0.45) + 1; i < N; i++) {
          const n0 = vnoise((i - 1) * 0.15, 9.1), n1 = vnoise(i * 0.15, 9.1); if (n0 < 0.45 || n1 < 0.45) continue;
          const P = (f, n, s) => { const w = (0.08 + 0.6 * (n - 0.45)) * s, x = f.x + f.nx * w, z = f.z + f.nz * w; return [x, gy(x, z) + 0.1, z]; };
          const A = P(F[i - 1], n0, 1), B = P(F[i - 1], n0, -1), C = P(F[i], n1, 1), D = P(F[i], n1, -1);
          wpos.push(...A, ...C, ...B, ...B, ...C, ...D);
        }
        // stones along the bed and the bank toes (the gully is all stone)
        F.forEach((f) => {
          const n = gully ? 2 + (rs() < 0.6 ? 1 : 0) + (rs() < 0.4 ? 1 : 0) : (rs() < 0.4 + 0.5 * f.pr ? 1 : 0) + (rs() < 0.7 * f.pr ? 1 : 0) + (rs() < 0.4 * f.pr ? 1 : 0);
          for (let k = 0; k < n; k++) {
            const side = rs() < 0.5 ? -1 : 1, w = side < 0 ? f.wn : f.wp;
            const o = side * (gully ? rs() * 1.15 : (rs() < 0.6 ? 0.75 + rs() * 0.45 : rs() * 0.7)), al = (rs() - 0.5) * 2;
            const x = f.x + f.nx * o * w + f.tx * al, z = f.z + f.nz * o * w + f.tz * al;
            const r = (gully ? 0.25 + Math.pow(rs(), 1.4) * 0.6 : 0.2 + Math.pow(rs(), 1.3) * 0.4) / 2;
            // on the channel's own surface there (the lips stand above the ground), a third sunk
            const ao = Math.abs(o), j = ao < 0.5 ? 0 : ao < 1 ? 1 : 2, lo = [0, 0.5, 1, 1.4][j], hi = [0, 0.5, 1, 1.4][j + 1];
            const lift = LIFT[4 + j] + (LIFT[5 + j] - LIFT[4 + j]) * (ao - lo) / (hi - lo);
            stones.push([x, gy(x, z) + 0.05 + (lift - 0.05) * f.pr - r * 0.21, z, r, rs() * TAU, rs(), ao < 0.65 ? 1 : 0]);
          }
        });
      });
      // one draw for all the stones: jittered icosahedra with the normals of the sphere they came from (rounded),
      // flattened, partly sunk; grey-brown, darker where wet in the bed
      if (stones.length) {
        const sg = ctx.jitterGeo(new THREE.IcosahedronGeometry(1, 0), 0.32, 17), sp = sg.attributes.position, nv = new THREE.Vector3();
        for (let i = 0; i < sp.count; i++) { nv.set(sp.getX(i), sp.getY(i), sp.getZ(i)).normalize(); sg.attributes.normal.setXYZ(i, nv.x, nv.y, nv.z); }
        const im = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 }), stones.length);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
        const sc = [lin(0x4f483e), lin(0x413a31), lin(0x5b5447), lin(0x4a3e30)];
        stones.forEach(([x, y, z, r, rot, sh, wet], i) => {
          e.set((sh - 0.5) * 0.5, rot, (rs() - 0.5) * 0.5); q.setFromEuler(e);
          m4.compose(pv.set(x, y, z), q, sv.set(r * (0.9 + 0.3 * sh), r * 0.7, r * (1.2 - 0.3 * sh))); im.setMatrixAt(i, m4);
          tc.copy(sc[Math.floor(sh * 4) % 4]).multiplyScalar(wet ? 0.72 : 1); im.setColorAt(i, tc);
        });
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        ctx.root.add(im);
      }
      window.LAND = window.LAND || {};
      window.LAND.streams = STREAMS;
    }

    // ======================= lanes =======================
    // Trampled lanes along the routes, each from the chapter in which it was made. The record gives the routes'
    // shape only roughly; the lanes meander a little round them (ours).
    const R_ = SITE.routes, V3 = (x, z) => new THREE.Vector3(x, gy(x, z), z);
    const dEnd = SITE.deltaStart.clone().addScaledVector(SITE.deltaAxis, SITE.deltaStop);
    const LANES = [
      { pts: R_.A, from: 2, w: 1.2 },
      { pts: R_.C, from: 5, w: 1.3 },
      { pts: R_.D, from: 6, w: 1.2 },
      { pts: [SITE.deltaStart, V3(dEnd.x, dEnd.z)], from: 7, w: 1.1 },
      { pts: R_.cahillToLZ, from: 7, w: 0.9 },
      { pts: R_.withdraw || [SITE.czlz, SITE.saddle, SITE.crossing.from, SITE.perimSW], from: 8, w: 1.4 },   // the withdrawal with the wounded
      { pts: R_.hunnicuttCrawl, from: 8, w: 0.7 },
      { pts: R_.dawn, from: 10, w: 0.8 },
    ];
    const SEG = [];   // ax, az, bx, bz, ang, ch, halfwidth
    LANES.forEach((ln, li) => {
      const out = [];
      let s = 0;
      for (let i = 0; i < ln.pts.length - 1; i++) {
        const a = ln.pts[i], b = ln.pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(len / 3));
        const nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
        for (let k = (i === 0 ? 0 : 1); k <= n; k++) {
          const f = k / n, taper = sstep(0, 12, Math.min(f * len, (1 - f) * len) + (i > 0 && k === 0 ? 99 : 0));
          const o = ((vnoise((s + f * len) * 0.025 + li * 7, 1.7) - 0.5) * 5 + (vnoise((s + f * len) * 0.12, li + 3.3) - 0.5) * 1.2) * (i === 0 || i === ln.pts.length - 2 ? taper : 1);
          out.push([a.x + (b.x - a.x) * f + nx * o, a.z + (b.z - a.z) * f + nz * o]);
        }
        s += len;
      }
      ln.path = out;
      for (let i = 0; i < out.length - 1; i++) SEG.push([out[i][0], out[i][1], out[i + 1][0], out[i + 1][1], Math.atan2(out[i + 1][1] - out[i][1], out[i + 1][0] - out[i][0]), ln.from, ln.w / 2, li]);
    });
    const LG = new Map(), LGS = 6;
    SEG.forEach((s, i) => {
      for (let gx = Math.floor((Math.min(s[0], s[2]) - 3) / LGS); gx <= Math.floor((Math.max(s[0], s[2]) + 3) / LGS); gx++)
        for (let gz = Math.floor((Math.min(s[1], s[3]) - 3) / LGS); gz <= Math.floor((Math.max(s[1], s[3]) + 3) / LGS); gz++) {
          const k = gz * 100000 + gx; if (!LG.has(k)) LG.set(k, []); LG.get(k).push(i);
        }
    });
    // laneAt(x, z): LD distance (in lane half-widths beyond the centre, metres), LA travel angle, LO outward angle, LC chapter
    let LD = 99, LDm = 99, LA = 0, LO = 0, LC = 99;
    function laneAt(x, z) {
      LD = 99; LC = 99;
      const list = LG.get(Math.floor(z / LGS) * 100000 + Math.floor(x / LGS));
      if (!list) return;
      for (const i of list) {
        const s = SEG[i], dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz;
        const f = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l2, 0, 1), cx = s[0] + dx * f, cz = s[1] + dz * f;
        const d = Math.hypot(x - cx, z - cz) * (0.6 / s[6]);   // normalised so 0.6 is the lane's edge
        if (d < LD - 0.05 || (Math.abs(d - LD) <= 0.05 && s[5] < LC)) { LD = d; LDm = d * s[6] / 0.6; LA = s[4]; LO = Math.atan2(z - cz, x - cx); LC = s[5]; }
      }
      LD += (vnoise(x * 0.4, z * 0.4) - 0.5) * 0.4;
    }

    // ======================= the cover bake (2 m) and the ground's textures =======================
    const BK = { res: 2, x0: tile.x0, z0: tile.z0 };
    BK.w = Math.ceil((tile.x1 - tile.x0) / BK.res) + 1; BK.h = Math.ceil((tile.z1 - tile.z0) / BK.res) + 1;
    BK.cover = new Float32Array(BK.w * BK.h); BK.dust = new Float32Array(BK.w * BK.h); BK.cls = new Float32Array(BK.w * BK.h); BK.tall = new Float32Array(BK.w * BK.h);
    const LZS = [{ p: SITE.lz689, r: 12, cov: 0, dust: 0.85 }, { p: SITE.czlz, r: 9, cov: 0.55, dust: 0.25 }, { p: SITE.alz, r: 9, cov: 0.55, dust: 0.25 }];
    for (let j = 0; j < BK.h; j++) for (let i = 0; i < BK.w; i++) {
      const x = BK.x0 + i * BK.res, z = BK.z0 + j * BK.res, k = j * BK.w + i;
      const c = landCls(x, z);
      let cov = sstep(0.38, 0.72, c) * clamp(0.6 + 0.6 * fbm(x * 0.05 + 3, z * 0.05 - 2), 0, 1);
      let dust = 0, tall = 1;
      const r6 = Math.hypot(x - CP.x, z - CP.z);
      if (r6 < 110) {
        const rp = P.rAt(bearingOf(x, z)), n = vnoise(x * 0.3, z * 0.3);
        cov *= sstep(rp - 1, rp + 3, r6) * (0.45 + 0.55 * sstep(rp + 3, rp + 18, r6));
        tall = 0.7 + 0.3 * sstep(rp + 4, rp + 25, r6);   // fields of fire kept down
        dust = Math.max(dust, (1 - sstep(rp + 1, rp + 7 + 4 * n, r6)) * (0.55 + 0.35 * n));
      }
      for (const z0 of LZS) {
        const q = Math.hypot(x - z0.p.x, z - z0.p.z) / z0.r;
        cov *= z0.cov + (1 - z0.cov) * sstep(0.7, 1.3, q);
        dust = Math.max(dust, z0.dust * (1 - sstep(0.6, 1.1, q)));
      }
      cov *= 0.2 + 0.8 * sstep(2.5, 5.5, Math.hypot(x - SITE.himmerFall.x, z - SITE.himmerFall.z));   // "lying in an open area"
      BK.cover[k] = cov; BK.dust[k] = dust; BK.cls[k] = c; BK.tall[k] = tall;
    }
    function bk(arr, x, z) {
      const fx = clamp((x - BK.x0) / BK.res, 0, BK.w - 1.001), fz = clamp((z - BK.z0) / BK.res, 0, BK.h - 1.001);
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j, k = j * BK.w + i;
      return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - w) + (arr[k + BK.w] * (1 - u) + arr[k + BK.w + 1] * u) * w;
    }
    const inTile = (x, z) => x > tile.x0 && x < tile.x1 && z > tile.z0 && z < tile.z1;
    const coverAt = (x, z) => (inTile(x, z) ? bk(BK.cover, x, z) : 0);

    // tree-line trunks thin the grass a little: done in the clump generator via TL grid (below)
    // GPU: cover (with crater floors bare), dust, cls
    const coverTex = (() => {
      const d = new Uint8Array(BK.w * BK.h * 4);
      for (let j = 0; j < BK.h; j++) for (let i = 0; i < BK.w; i++) {
        const k = j * BK.w + i, x = BK.x0 + i * BK.res, z = BK.z0 + j * BK.res;
        craterAt(x, z);
        d[k * 4] = Math.round(255 * BK.cover[k] * sstep(0.7, 1.15, CQ)); d[k * 4 + 1] = Math.round(255 * BK.dust[k]); d[k * 4 + 2] = Math.round(255 * BK.cls[k]); d[k * 4 + 3] = 255;
      }
      const tx = new THREE.DataTexture(d, BK.w, BK.h, THREE.RGBAFormat);
      tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
      return tx;
    })();
    // ----- Hill 689's crest after eight days (fix pass, hill689): bare trodden laterite inside the line, grass left in
    // patches between the holes and hooches, the holes' spoil, a cleared and trodden band outside the holes (fields of
    // fire), standing grass beyond. works.js loads after land.js, so the crest is re-baked once window.WORKS is there
    // (WORKS.grassPatch, WORKS.pathAt, WORKS.paths); until then the old bake stands.
    let perimBaked = false;
    function perimCell(x, z, k) {
      const r6 = Math.hypot(x - CP.x, z - CP.z);
      if (r6 >= 110) return;
      const W = window.WORKS, c = BK.cls[k], rp = P.rAt(bearingOf(x, z)), n = vnoise(x * 0.3, z * 0.3), n2 = vnoise(x * 0.11 + 7, z * 0.11 - 3);
      let cov = sstep(0.38, 0.72, c) * clamp(0.6 + 0.6 * fbm(x * 0.05 + 3, z * 0.05 - 2), 0, 1), dust, tall;
      if (r6 < rp - 2.5) {
        const pa = W.grassPatch(x, z), onPath = 1 - sstep(-0.3, 0.8, W.pathAt(x, z));
        cov = Math.max(cov, 0.55) * pa * (0.75 + 0.25 * n);
        tall = 0.42 + 0.2 * n2;
        dust = clamp(0.7 + 0.25 * n - 0.45 * pa + 0.3 * onPath, 0, 1);
      } else if (r6 < rp + 2.5) {
        cov = 0; tall = 0.4; dust = 0.8 + 0.15 * n;                                                  // the holes and their spoil
      } else {
        const u = r6 - rp;                                                                           // the cleared band outside
        cov *= (0.18 + 0.5 * sstep(0.45, 0.7, n2)) * (1 - sstep(10, 22, u)) + sstep(10, 22, u) * (0.45 + 0.55 * sstep(22, 32, u));
        tall = 0.3 + 0.25 * n + 0.45 * sstep(9, 26, u);
        dust = (1 - sstep(6, 14 + 4 * n, u)) * (0.5 + 0.3 * n);
      }
      for (const z0 of LZS) { const q = Math.hypot(x - z0.p.x, z - z0.p.z) / z0.r; cov *= z0.cov + (1 - z0.cov) * sstep(0.7, 1.3, q); dust = Math.max(dust, z0.dust * (1 - sstep(0.6, 1.1, q))); }
      BK.cover[k] = cov; BK.dust[k] = dust; BK.tall[k] = tall;
    }
    function bakePerim() {
      const W = window.WORKS;
      if (perimBaked || !W || !W.grassPatch || !W.paths) return false;
      perimBaked = true;
      const d = coverTex.image.data;
      for (let j = 0; j < BK.h; j++) for (let i = 0; i < BK.w; i++) {
        const k = j * BK.w + i, x = BK.x0 + i * BK.res, z = BK.z0 + j * BK.res;
        if (Math.hypot(x - CP.x, z - CP.z) >= 110) continue;
        perimCell(x, z, k);
        craterAt(x, z);
        d[k * 4] = Math.round(255 * BK.cover[k] * sstep(0.7, 1.15, CQ)); d[k * 4 + 1] = Math.round(255 * BK.dust[k]);
      }
      coverTex.needsUpdate = true;
      // the crest's fine ground at 0.25 m: R the paths, G darker churned earth, B pale dust (in the ground shader)
      const S = 136, ppm = 4, N = S * ppm, cv = document.createElement('canvas'); cv.width = cv.height = N;
      const g = cv.getContext('2d'), rnd = mulberry32(80468), px = (v) => (v + S / 2) * ppm;
      g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
      g.globalCompositeOperation = 'lighter';
      const blot = (x, z, r, rgb) => { const gr = g.createRadialGradient(px(x), px(z), 0, px(x), px(z), r * ppm); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(px(x), px(z), r * ppm, 0, Math.PI * 2); g.fill(); };
      for (let i = 0; i < 1400; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 66, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (r > P.rAt(bearingOf(x, z)) + 12) continue;
        const sz = 0.6 + rnd() * 2.6;
        blot(x, z, sz, rnd() < 0.55 ? `0,${Math.round(40 + rnd() * 50)},0` : `0,0,${Math.round(40 + rnd() * 60)}`);
      }
      g.globalCompositeOperation = 'source-over';
      g.lineCap = g.lineJoin = 'round'; g.filter = 'blur(2px)';
      for (const p of W.paths) { g.strokeStyle = 'rgba(255,0,0,0.62)'; g.lineWidth = p.w * ppm * (0.8 + rnd() * 0.3); g.beginPath(); g.moveTo(px(p.a[0]), px(p.a[1])); g.lineTo(px(p.b[0]), px(p.b[1])); g.stroke(); }
      g.filter = 'none';
      const im = g.getImageData(0, 0, N, N);
      perimTex.image = { data: new Uint8Array(im.data.buffer), width: N, height: N };
      perimTex.needsUpdate = true;
      GU.uLPerim.value.set(-S / 2, -S / 2, 1 / S, 1 / S);
      for (const T of TIERS) { T.map.clear(); T.next = 0; T.stamp.fill(-1); }
      return true;
    }
    const perimTex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
    perimTex.magFilter = THREE.LinearFilter; perimTex.minFilter = THREE.LinearFilter; perimTex.needsUpdate = true;
    // lanes: R = trampled, G = the chapter from which (16 per chapter, 255 none), 0.25 m per pixel over their box
    const LB = (() => {
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (const ln of LANES) for (const [x, z] of ln.path) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
      x0 -= 4; z0 -= 4; x1 += 4; z1 += 4;
      const ppm = 4, W = Math.ceil((x1 - x0) * ppm), H = Math.ceil((z1 - z0) * ppm);
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.lineCap = g.lineJoin = 'round'; return [c, g]; };
      const [, gi] = mk(), [, gc] = mk();
      gc.fillStyle = 'rgb(255,255,255)'; gc.fillRect(0, 0, W, H);
      const stroke = (g, ln, w) => { g.lineWidth = w * ppm; g.beginPath(); ln.path.forEach(([x, z], k) => (k ? g.lineTo : g.moveTo).call(g, (x - x0) * ppm, (z - z0) * ppm)); g.stroke(); };
      gi.filter = 'blur(1px)'; gi.strokeStyle = '#fff';
      for (const ln of LANES) stroke(gi, ln, ln.w * 0.85);
      [...LANES].sort((a, b) => b.from - a.from).forEach((ln) => { gc.strokeStyle = `rgb(${ln.from * 16},${ln.from * 16},${ln.from * 16})`; stroke(gc, ln, ln.w * 1.8); });
      const a = gi.getImageData(0, 0, W, H).data, b = gc.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H * 4);
      for (let i = 0; i < W * H; i++) { out[i * 4] = a[i * 4]; out[i * 4 + 1] = b[i * 4]; out[i * 4 + 3] = 255; }
      const tx = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
      tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
      return { tx, x0, z0, w: x1 - x0, d: z1 - z0 };
    })();

    // chapter state for everything that appears by chapter (lanes, clearings): A -> B blended by K
    const CHS = { a: { value: 1 }, b: { value: 1 }, k: { value: 1 } };
    let chFadeAt = -1e9;
    const GU = {
      uLCover: { value: coverTex }, uLTile: { value: new THREE.Vector4(BK.x0, BK.z0, 1 / ((BK.w - 1) * BK.res), 1 / ((BK.h - 1) * BK.res)) },
      uLLaneTex: { value: LB.tx }, uLLane: { value: new THREE.Vector4(LB.x0, LB.z0, 1 / LB.w, 1 / LB.d) },
      uLLitter: { value: lin(0x3e3826) }, uLLat: { value: lin(0x7c4e34).multiplyScalar(0.85) }, uLDust: { value: lin(0x9c8062).multiplyScalar(0.85) }, uLLaneCol: { value: lin(0x6e4a34) },
      uChA: CHS.a, uChB: CHS.b, uChK: CHS.k,
      uLPerimTex: { value: perimTex }, uLPerim: { value: new THREE.Vector4(0, 0, 0, 0) },
    };
    Object.assign(GU, GRADE);
    if (groundMesh) {
      const gm = groundMesh.material, prev = gm.onBeforeCompile;
      gm.userData.extraKey = 'land1';
      gm.onBeforeCompile = (sh, r) => {
        if (prev) prev.call(gm, sh, r);
        Object.assign(sh.uniforms, GU);
        sh.fragmentShader = 'uniform sampler2D uLCover; uniform vec4 uLTile; uniform sampler2D uLLaneTex; uniform vec4 uLLane; uniform vec3 uLLitter; uniform vec3 uLLat; uniform vec3 uLDust; uniform vec3 uLLaneCol; uniform float uChA; uniform float uChB; uniform float uChK; uniform sampler2D uLPerimTex; uniform vec4 uLPerim;\n' + GLSL_GRADE +
          sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec2 cuv = (vWPos.xz - uLTile.xy) * uLTile.zw;
            float inT = step(0.0, cuv.x) * step(cuv.x, 1.0) * step(0.0, cuv.y) * step(cuv.y, 1.0);
            vec4 cv = texture2D(uLCover, cuv) * inT;
            float dc = distance(vWPos, cameraPosition);
            float mott = 0.5 + 0.5 * sin(vWPos.x * 1.7 + sin(vWPos.z * 1.3)) * sin(vWPos.z * 1.9 + sin(vWPos.x * 1.1));
            float nearK = 1.0 - smoothstep(25.0, 100.0, dc);
            diffuseColor.rgb = mix(diffuseColor.rgb, uLLitter * (0.75 + 0.6 * mott), cv.r * nearK * 0.7);
            diffuseColor.rgb *= mix(vec3(1.0), vec3(0.8, 0.77, 0.62), cv.r * (1.0 - nearK) * 0.75);
            {
              // the bare ground (trampled clearings) follows the grass's palette at dusk, night and first light
              float gl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gl) * uGGTint, uGGround);
            }
            vec3 lat = gradeLat(mix(uLLat, uLDust, 0.3 + 0.6 * mott));
            diffuseColor.rgb = mix(diffuseColor.rgb, lat, cv.g * 0.8);
            vec2 luv = (vWPos.xz - uLLane.xy) * uLLane.zw;
            float inL = step(0.0, luv.x) * step(luv.x, 1.0) * step(0.0, luv.y) * step(luv.y, 1.0);
            vec4 lv = texture2D(uLLaneTex, luv) * inL;
            float lch = lv.g * 255.0 / 16.0;
            float on = mix(step(lch, uChA + 0.5), step(lch, uChB + 0.5), uChK);
            float lane = lv.r * on * smoothstep(0.25, 0.6, cv.b);
            // flattened grass: pale straw laid over, a little trodden earth only in the very centre (fix pass: dark lanes
            // read as trails behind a man)
            vec3 straw = mix(vec3(0.24, 0.205, 0.11), vec3(0.3, 0.26, 0.15), mott);
            vec3 flatC = mix(straw, gradeLat(uLLaneCol), 0.15);
            float gl2 = dot(flatC, vec3(0.299, 0.587, 0.114));
            flatC = mix(flatC, vec3(gl2) * uGGTint, uGGround);
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(flatC, mix(flatC, lat, 0.25 * mott), smoothstep(0.75, 0.98, lv.r)), lane * 0.85);
            // Hill 689's crest: churned earth, pale dust, and the paths trodden dark between the holes (fix pass, hill689)
            vec2 puv = (vWPos.xz - uLPerim.xy) * uLPerim.zw;
            float inP = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0) * step(0.0001, uLPerim.z);
            vec4 pv = texture2D(uLPerimTex, puv) * inP;
            float bare = cv.g;
            vec3 pc = diffuseColor.rgb;
            pc = mix(pc, pc * vec3(0.8, 0.68, 0.55), pv.g * bare * 1.1);
            pc = mix(pc, gradeLat(uLDust) * vec3(1.25, 1.18, 1.05), pv.b * bare * 0.75);
            vec3 trod = mix(gradeLat(uLLat), gradeLat(uLLaneCol), 0.5) * vec3(0.9, 0.85, 0.78);
            float glt = dot(trod, vec3(0.299, 0.587, 0.114));
            trod = mix(trod, vec3(glt) * uGGTint, uGGround);
            pc = mix(pc, trod, pv.r * 0.6);
            diffuseColor.rgb = pc;
          }`);
      };
      gm.needsUpdate = true;
    }

    // ======================= forest, bamboo, the tree line =======================
    const TL = [];   // tree-line trunks in the grass (to thin the grass round them)
    {
      const rnd = mulberry32(1968416);
      const near = (x, z, p, r) => Math.hypot(x - p.x, z - p.z) < r;
      const streamNear = (x, z, r, st = 2) => { for (const s of STREAMS) for (let i = 0; i < s.length; i += st) if (Math.abs(s[i][0] - x) < r && Math.abs(s[i][1] - z) < r && Math.hypot(s[i][0] - x, s[i][1] - z) < r) return true; return false; };
      const trees = [[], [], []];   // per crown variant: x, y, z, H, R, rot, shade
      const tcol = [lin(0x3f6a3a).multiplyScalar(0.62), lin(0x2c4a2c).multiplyScalar(0.62), lin(0x4f7a40).multiplyScalar(0.62), lin(0x6a7438).multiplyScalar(0.62)];
      // a trail through the forest where a lane crosses it (fix pass: the columns of chapters 2, 5 and 8 were invisible
      // under the canopy): a tree whose crown would hang over a lane is left out, after its random draws, so every other
      // tree keeps its place
      const overLane = (x, z, R) => { if (!inTile(x, z)) return false; laneAt(x, z); return LD < 90 && LDm < R * 0.9 + 1.6; };
      // the helicopters' landing zones are clear of trees for their last approach (fix pass)
      const lzClear = [[SITE.czlz, 30], [SITE.routes.ch46[1], 22]];
      const inLZ = (x, z, R) => lzClear.some(([p, r]) => Math.hypot(x - p.x, z - p.z) < r + R);
      const addTree = (x, z, H, R, v, tr) => { const rot = rnd() * TAU, sh = rnd(); if (overLane(x, z, R) || inLZ(x, z, R)) return; trees[v].push([x, gy(x, z), z, H, R, rot, sh, tr ? 1 : 0]); };
      const sp = 8;
      const x0 = tile.x0 - 260, x1 = tile.x1 + 260, z0 = tile.z0 - 260, z1 = tile.z1 + 260;
      for (let x = x0; x < x1; x += sp) for (let z = z0; z < z1; z += sp) {
        const out = !inTile(x, z);
        if (out && (Math.round((x - x0) / sp) + 2 * Math.round((z - z0) / sp)) % 3 !== 0) continue;   // a third beyond the tile
        const px = x + (rnd() - 0.5) * sp * 0.9, pz = z + (rnd() - 0.5) * sp * 0.9;
        const c = out ? landCls(px, pz) : bk(BK.cls, px, pz);
        if (c > 0.48 || rnd() > Math.pow(1 - c / 0.48, 0.6) * 0.92) continue;
        if (near(px, pz, CP, P.rMax + 12) || near(px, pz, SITE.lz689, 16)) continue;
        if (!out && streamNear(px, pz, 1.1, 1)) continue;   // no trunk in the bed; crowns may close over it
        const tp = L.tpi(px, pz), H = (10 + 5 * sstep(4, -14, tp) + rnd() * 3) * (out ? 1.15 : 1);
        addTree(px, pz, H, H * (0.3 + rnd() * 0.08) * (out ? 1.3 : 1), out ? 0 : (rnd() < 0.55 ? 0 : rnd() < 0.6 ? 1 : 2), !out && (c > 0.15 || rnd() < 0.2));
      }
      // the tree line below the bunker crest on the west (HN; placement ours)
      const bs = SITE.battleSummit, arc = SITE.bunkerArc.slice(0, 5);
      for (let i = 0; i < arc.length - 1; i++) for (let f = 0; f < 1; f += 0.2) {
        const ax = arc[i].x + (arc[i + 1].x - arc[i].x) * f, az = arc[i].z + (arc[i + 1].z - arc[i].z) * f;
        const dx = ax - bs.x, dz = az - bs.z, l = Math.hypot(dx, dz) || 1, off = 18 + rnd() * 10;
        const x = ax + dx / l * off + (rnd() - 0.5) * 3, z = az + dz / l * off + (rnd() - 0.5) * 3;
        if (CR.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 1.5)) continue;
        const H = 8 + rnd() * 4; addTree(x, z, H, H * 0.32, rnd() < 0.5 ? 2 : 0, true); TL.push([x, z]);
      }
      // trees on the stream banks in the forest, so the canopy closes over the creeks and they show only in glimpses
      // (fix pass 2026-11-09); their own random stream, so every other tree keeps its place
      {
        const rs = mulberry32(4417);
        for (const s of STREAMS) for (let i = 3; i < s.length - 3; i += 4) {
          const side = rs() < 0.5 ? -1 : 1, d = 1.6 + rs() * 2.5, tx = s[i + 1][0] - s[i][0], tz = s[i + 1][1] - s[i][1], l = Math.hypot(tx, tz) || 1;
          const x = s[i][0] - tz / l * d * side, z = s[i][1] + tx / l * d * side;
          const H = 9 + rs() * 4, R = H * (0.32 + rs() * 0.08), v = rs() < 0.5 ? 0 : rs() < 0.6 ? 1 : 2, rot = rs() * TAU, sh = rs();
          if (rs() > 0.75 || !inTile(x, z) || bk(BK.cls, x, z) > 0.45) continue;
          if (near(x, z, CP, P.rMax + 12) || overLane(x, z, R) || inLZ(x, z, R)) continue;
          trees[v].push([x, gy(x, z), z, H, R, rot, sh, 1]);
        }
      }
      // crowns: faceted icosahedra, shade baked darker underneath
      const shadeGeo = (g) => {
        g = g.index ? g.toNonIndexed() : g;
        const p = g.attributes.position, col = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) { const k = 0.55 + 0.45 * sstep(-0.9, 0.7, p.getY(i)); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
      };
      const ico = (r, x, y, z, sx, sy, sz, seed) => { const g = ctx.jitterGeo(new THREE.IcosahedronGeometry(r, 0), r * 0.28, seed); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
      const merge = (gs) => { const ps = []; for (const g of gs) { const a = (g.index ? g.toNonIndexed() : g).attributes.position.array; for (let i = 0; i < a.length; i++) ps.push(a[i]); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); return g; };
      const crowns = [
        shadeGeo(ico(1, 0, 0, 0, 1, 0.72, 1, 3)),
        shadeGeo(merge([ico(0.78, -0.4, -0.05, 0.1, 1, 0.72, 1, 5), ico(0.72, 0.42, 0.15, -0.12, 1, 0.8, 1, 6)])),
        shadeGeo(merge([ico(0.8, 0, -0.1, 0, 0.85, 1.15, 0.85, 9), ico(0.45, 0.1, 0.75, 0.05, 1, 1, 1, 10)])),
      ];
      const crownMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
      ctx.addWind(crownMat, 0.012);
      const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1, 5, 1, true); trunkGeo.translate(0, 0.5, 0);
      const nT = trees[0].length + trees[1].length + trees[2].length, nTr = trees.reduce((a, l) => a + l.filter((e) => e[7]).length, 0);
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: lin(0x5a4a3a), flatShading: true, roughness: 0.95 }), Math.max(1, nTr));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tc = new THREE.Color();
      let ti = 0;
      trees.forEach((list, v) => {
        const im = new THREE.InstancedMesh(crowns[v], crownMat, Math.max(1, list.length));
        list.forEach(([x, y, z, H, R, rot, sh, hasTrunk], i) => {
          q.setFromAxisAngle(up, rot);
          const th = H * 0.55;
          if (hasTrunk) { m4.compose(pv.set(x, y - 0.3, z), q, sv.set(H / 14, th + 0.3, H / 14)); trunks.setMatrixAt(ti++, m4); }
          m4.compose(pv.set(x, y + th + R * 0.45, z), q, sv.set(R, R, R)); im.setMatrixAt(i, m4);
          tc.copy(tcol[0]).lerp(tcol[1], clamp(0.25 + sh * 0.6 - sstep(-2, 10, L.tpi(x, z)) * 0.3, 0, 1));
          if (sh > 0.93) tc.lerp(tcol[3], 0.6); else if (sh < 0.12) tc.lerp(tcol[2], 0.6);
          im.setColorAt(i, tc);
        });
        im.count = list.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        ctx.root.add(im);
      });
      trunks.count = ti; ctx.root.add(trunks);

      // bamboo clumps (#8fa85a), densest at the valley crossing and the gully, and along the streams
      const bam = [];
      const segD = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, f = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(a.x + dx * f - x, a.z + dz * f - z); };
      for (let x = tile.x0; x < tile.x1; x += 9) for (let z = tile.z0; z < tile.z1; z += 9) {
        const px = x + (rnd() - 0.5) * 8, pz = z + (rnd() - 0.5) * 8, c = bk(BK.cls, px, pz);
        if (c > 0.5) continue;
        let w = 0.08;
        w += 0.6 * (1 - sstep(20, 70, Math.min(segD(px, pz, SITE.crossing.from, SITE.crossing.to), segD(px, pz, SITE.crossing.to, SITE.saddle))));
        w += 0.7 * (1 - sstep(15, 60, Math.min(segD(px, pz, SITE.gullyEdge, SITE.gully), Math.hypot(px - SITE.gully.x, pz - SITE.gully.z))));
        if (streamNear(px, pz, 8)) w += 0.35;
        if (rnd() > w * (1 - c * 1.6)) continue;
        if (streamNear(px, pz, 1.5) || near(px, pz, CP, P.rMax + 10)) continue;
        const bs = 0.8 + rnd() * 0.5, br = rnd() * TAU;
        if (overLane(px, pz, 3.2 * bs) || inLZ(px, pz, 3.2 * bs)) continue;
        bam.push([px, gy(px, pz), pz, bs, br]);
      }
      const bgeo = (() => {
        const ps = [], cs = [], r = mulberry32(88), cul = lin(0x8fa85a).multiplyScalar(0.75), culD = lin(0x6f8442).multiplyScalar(0.7), lf = lin(0x7d9448).multiplyScalar(0.5), lfD = lin(0x5c7436).multiplyScalar(0.5);
        const tri = (a, b, c, col) => { ps.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) cs.push(col.r, col.g, col.b); };
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * TAU + r() * 0.6, r0 = 0.15 + r() * 0.45, H = 6 + r() * 4, lean = 0.12 + r() * 0.25, arch = 0.25 + r() * 0.3;
          const pts = []; let x = Math.cos(a) * r0, y = 0, z = Math.sin(a) * r0;
          for (let s = 0; s <= 2; s++) { pts.push([x, y, z]); const ph = lean + arch * s / 2; x += Math.cos(a) * Math.sin(ph) * H / 2; z += Math.sin(a) * Math.sin(ph) * H / 2; y += Math.cos(ph) * H / 2; }
          for (let s = 0; s < 2; s++) {
            const rw = 0.09 * (1 - s * 0.25);
            for (let f = 0; f < 3; f++) {
              const a0 = f / 3 * TAU, a1 = (f + 1) / 3 * TAU, P0 = pts[s], P1 = pts[s + 1];
              const o = (P, aa, w) => [P[0] + Math.cos(aa) * w, P[1], P[2] + Math.sin(aa) * w];
              const c = s === 0 ? culD : cul;
              tri(o(P0, a0, rw), o(P1, a0, rw * 0.8), o(P0, a1, rw), c); tri(o(P0, a1, rw), o(P1, a0, rw * 0.8), o(P1, a1, rw * 0.8), c);
            }
          }
          // feathery leaf masses along the upper culm: flattened octahedra
          for (const s of [2]) {
            const P0 = pts[s], c = r() < 0.5 ? lf : lfD, sx = 1.3 + r() * 0.5, sy = 1.1 + r() * 0.5, sz = 0.9 + r() * 0.3, rot = a;
            const V = (dx, dy, dz) => [P0[0] + (dx * Math.cos(rot) - dz * Math.sin(rot)), P0[1] + dy - 0.3, P0[2] + (dx * Math.sin(rot) + dz * Math.cos(rot))];
            const X = [V(sx, 0, 0), V(-sx * 0.5, 0, 0), V(0, sy, 0), V(0, -sy, 0), V(0, 0, sz), V(0, 0, -sz)];
            const F = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
            for (const [i, j, l] of F) tri(X[i], X[j], X[l], c);
          }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); g.computeVertexNormals(); return g;
      })();
      const bamMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
      ctx.addWind(bamMat, 0.03);
      const bim = new THREE.InstancedMesh(bgeo, bamMat, Math.max(1, bam.length));
      bam.forEach(([x, y, z, s, rot], i) => { q.setFromAxisAngle(up, rot); m4.compose(pv.set(x, y - 0.2, z), q, sv.set(s, s, s)); bim.setMatrixAt(i, m4); });
      bim.count = bam.length; ctx.root.add(bim);
      ctx.__landCounts = { trees: nT, bamboo: bam.length, craters: CR.length, streams: STREAMS.length };
    }
    const TLG = new Map();
    for (const [x, z] of TL) { const k = Math.floor(z / 8) * 100000 + Math.floor(x / 8); if (!TLG.has(k)) TLG.set(k, []); TLG.get(k).push([x, z]); }
    const nearTL = (x, z) => { const l = TLG.get(Math.floor(z / 8) * 100000 + Math.floor(x / 8)); if (!l) return 9; let d = 9; for (const p of l) d = Math.min(d, Math.hypot(p[0] - x, p[1] - z)); return d; };

    // ======================= clearings (works.js) =======================
    // window.WORKS.clearings [{ x, z, r, kind, from, inside? }]: perimeter = no grass, lz = flattened, slit = kept
    // under 0.5 m within its radius; each from its chapter. Read lazily (load order is not guaranteed).
    // The clearings arrive late: marines-a-d.js adds its trodden ground to WORKS.clearings once its figures are built,
    // and marines-c.js offers window.MARINES_C_TRAMPLE. update() watches their count (and a 'landClearingsChanged'
    // event) and re-reads them, dropping every cached grass chunk so the next refill rebuilds them. A 6 m grid keeps
    // clearAt cheap with a few hundred clearings.
    let CLR = null, CLRG = null, CLRW = [], clrSig = -1, clrDirty = false;
    addEventListener('landClearingsChanged', () => { clrDirty = true; });
    const KIND = { perimeter: 3, lz: 2, slit: 1 };
    const CLG = 6, cgKey = (ix, iz) => (iz + 4096) * 8192 + ix + 4096;
    function clrSource() {
      const W = window.WORKS, T = window.MARINES_C_TRAMPLE;
      return { list: (W && W.clearings) || [], tr: Array.isArray(T) ? T : [] };
    }
    function readClearings() {
      const { list, tr } = clrSource();
      CLR = list.concat(tr.filter((c) => !list.includes(c)));
      CLRG = new Map(); CLRW = [];
      for (const c of CLR) {
        if (c.inside || c.r > 60) { CLRW.push(c); continue; }
        for (let ix = Math.floor((c.x - c.r) / CLG); ix <= Math.floor((c.x + c.r) / CLG); ix++)
          for (let iz = Math.floor((c.z - c.r) / CLG); iz <= Math.floor((c.z + c.r) / CLG); iz++) {
            const k = cgKey(ix, iz); let l = CLRG.get(k); if (!l) CLRG.set(k, (l = [])); l.push(c);
          }
      }
    }
    function clearAt(x, z) {
      if (!CLR) return 0;
      let best = 0, bestCh = 99;
      const test = (c) => {
        const kind = KIND[c.kind] || 2;
        let inside;
        if (c.inside) inside = Math.hypot(x - c.x, z - c.z) < 90 && c.inside(x, z);
        else inside = Math.hypot(x - c.x, z - c.z) < c.r;
        if (!inside) return;
        if (kind > best || (kind === best && c.from < bestCh)) { best = kind; bestCh = c.from || 1; }
      };
      for (const c of CLRW) test(c);
      const l = CLRG.get(cgKey(Math.floor(x / CLG), Math.floor(z / CLG)));
      if (l) for (const c of l) test(c);
      return best ? bestCh * 4 + best : 0;
    }
    // called each frame: re-read the clearings when their count changes and drop the cached chunks
    function watchClearings() {
      const { list, tr } = clrSource(), sig = list.length * 1000 + tr.length;
      if (sig === clrSig && !clrDirty) return false;
      clrSig = sig; clrDirty = false;
      readClearings();
      for (const T of TIERS) { T.map.clear(); T.next = 0; T.stamp.fill(-1); }
      return true;
    }

    // grassH(x, z, ch): about how tall the stand is there in chapter ch (m; 0 where there is none, lowered on slit,
    // LZ and perimeter clearings from their chapter). For fire.js's line-of-sight test and the tools.
    window.LAND = window.LAND || {};
    window.LAND.grassH = (x, z, ch) => {
      const cov = coverAt(x, z);
      if (inTile(x, z) && bk(BK.cls, x, z) < 0.38) return 2.5;   // forest: the understory and the trunks
      if (cov < 0.18) return 0;
      let h = 1.95 * bk(BK.tall, x, z);
      const c = clearAt(x, z), kind = c % 4, from = (c - kind) / 4;
      if (kind && from <= ch) h *= kind === 1 ? 0.2 : kind === 2 ? 0.38 : 0;
      laneAt(x, z); if (LD < 0.6 && LC <= ch) h *= 0.4;   // a trampled lane
      return h;
    };
    // ======================= grass =======================
    const U = {
      uTime: { value: 0 }, uGust: { value: 0 }, uNight: { value: 0 }, uCam: { value: new THREE.Vector3() },
      uLSunDir: { value: new THREE.Vector3(0, 1, 0) }, uLSunCol: { value: new THREE.Color(1, 1, 1) },
      uChA: CHS.a, uChB: CHS.b, uChK: CHS.k,
      uCBase: { value: lin(0x56622e) }, uCBody: { value: lin(0x8d8a46) }, uCTop: { value: lin(0xb9a95c) }, uCTip: { value: lin(0xd2c38a) },
      uCDead0: { value: lin(0x857a5c) }, uCDead1: { value: lin(0xb3a682) }, uCPlume: { value: lin(0xddd4bc) }, uCTopN: { value: lin(0xc4c8c2) },
      uWash: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    };
    // the blade clump: stiff culms, basal blades arching out, leaves leaving the culms at several heights
    const BR = mulberry32(1968);
    const CULMS = [];
    for (let k = 0; k < 4; k++) CULMS.push({ a: k * TAU / 4 + BR() * 0.9, r0: 0.03 + BR() * 0.07, H: 1.72 + BR() * 0.38, lean: 0.02 + BR() * 0.07, rnd: BR() });
    const BLADES = [];
    for (let k = 0; k < 20; k++) {
      if (k < 9) {
        const a = k * 2.39996 + (BR() - 0.5) * 0.5;
        BLADES.push({ root: [Math.cos(a) * (0.02 + BR() * 0.11), BR() * 0.05, Math.sin(a) * (0.02 + BR() * 0.11)], th: a + (BR() - 0.5) * 0.8, ph0: 0.05 + BR() * 0.25, arch: 0.35 + BR() * 1.2,
          L: 1.25 + BR() * 0.65, W: 0.02 + BR() * 0.014, tw: (BR() - 0.5) * 2.6, dead: BR() < 0.28, kink: BR() < 0.45 ? 0.35 + BR() * 0.4 : 9, rnd: BR() });
      } else {
        const c = CULMS[k % 4], h0 = 0.25 + BR() * 1.2, sl = Math.sin(c.lean) * h0;
        BLADES.push({ root: [Math.cos(c.a) * (c.r0 + sl), h0, Math.sin(c.a) * (c.r0 + sl)], th: BR() * TAU, ph0: 0.35 + BR() * 0.45, arch: 0.8 + BR() * 1.3,
          L: (0.95 - h0 * 0.25) * (0.75 + BR() * 0.5), W: 0.018 + BR() * 0.012, tw: (BR() - 0.5) * 2.2, dead: BR() < 0.2, kink: BR() < 0.4 ? 0.4 + BR() * 0.3 : 9, rnd: BR() });
      }
    }
    function buildClumpGeo({ nb, segs, culms, culmSegs, strands, strandSegs, leaves = true, plumeLift = 0 }) {
      const pos = [], cen = [], bl = [], idx = [], V = THREE.Vector3;
      function strip(points, rank, flag, rnd) {
        const base = pos.length / 3;
        for (const { p, side, w, t } of points) {
          pos.push(p.x - side.x * w / 2, p.y - side.y * w / 2, p.z - side.z * w / 2, p.x + side.x * w / 2, p.y + side.y * w / 2, p.z + side.z * w / 2);
          cen.push(p.x, p.y, p.z, p.x, p.y, p.z);
          bl.push(t, rank, flag, rnd, t, rank, flag, rnd);
        }
        for (let i = 0; i < points.length - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
      }
      function curve(root, th, ph0, arch, Ln, W, tw, kink, S, profile, t0 = 0, t1 = 1) {
        const pts = [], p = root.clone(), side0 = new V(-Math.sin(th), 0, Math.cos(th));
        const phAt = (t) => ph0 + arch * Math.pow(t, 1.3) + (t > kink ? 1.4 * sstep(kink, kink + 0.08, t) : 0);
        const dirAt = (t) => { const ph = Math.min(phAt(t), 2.6); return new V(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)); };
        for (let i = 0; i <= S; i++) {
          const t = i / S, d = dirAt(t), tau = tw * t;
          const side = side0.clone().multiplyScalar(Math.cos(tau)).add(new V().crossVectors(d, side0).multiplyScalar(Math.sin(tau))).normalize();
          pts.push({ p: p.clone(), side, w: W * profile(t), t: t0 + (t1 - t0) * t });
          if (i < S) p.addScaledVector(dirAt((i + 0.5) / S), Ln / S);
        }
        return pts;
      }
      const leafProfile = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, 0.14 + t * 0.86)), 0.55);
      if (leaves) for (let k = 0; k < nb; k++) {
        const b = BLADES[k], root = new V(...b.root), h0 = b.root[1] / 2.0;
        strip(curve(root, b.th, b.ph0, b.arch, b.L, b.W, b.tw, b.dead ? b.kink : 9, segs, leafProfile, h0, Math.min(1, h0 + 0.85)), k / 20, b.dead ? 0.5 : 0, b.rnd);
      }
      for (let k = 0; k < culms; k++) {
        const c = CULMS[k], root = new V(Math.cos(c.a) * c.r0, 0, Math.sin(c.a) * c.r0), H = c.H + plumeLift;
        for (const off of [0, Math.PI / 2]) strip(curve(root, c.a + off, c.lean, 0.04, H, 0.022, 0, 9, culmSegs, (t) => 1 - 0.45 * t), 0, 0.5, c.rnd);
        if (strands > 0) {
          const top = curve(root, c.a, c.lean, 0.04, H, 0.01, 0, 9, culmSegs, () => 1).pop().p;
          const pr = mulberry32(1000 + k * 77);
          for (let s = 0; s < strands; s++) {
            strip(curve(top.clone().add(new V(0, -0.02 - pr() * 0.32, 0)), c.a + 0.4 + (pr() - 0.5) * 1.1, 0.05 + pr() * 0.3, 0.4 + pr() * 0.9, 0.22 + pr() * 0.22, 0.02, 0.8, 9, strandSegs, (t) => Math.sin(Math.PI * (0.25 + 0.75 * t))), 0, 1, pr());
          }
        }
      }
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 3));
      g.setAttribute('aBlade', new THREE.Float32BufferAttribute(bl, 4));
      g.setIndex(idx);
      return g;
    }
    // the painted card atlas: 4 variants of 256 x 512; R = along-blade t, G = shade, B = 0 live / 128 dead or culm
    function paintAtlas() {
      const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const VW = 256;
      for (let v = 0; v < 4; v++) {
        const r = mulberry32(400 + v * 17), ox = v * VW;
        g.save(); g.beginPath(); g.rect(ox, 0, VW, H); g.clip();
        const culmX = [];
        // fix pass: each variant is lopsided its own way (a clump leaning left, one right, one bunched off-centre,
        // one sparse and ragged), so the cards stop mirroring each other
        const N = [230, 210, 220, 150][v], bxC = [0.5, 0.4, 0.62, 0.47][v], bxW = [0.5, 0.42, 0.36, 0.62][v], lean = [0, -0.32, 0.3, 0.12][v];
        for (let i = 0; i < N; i++) {
          const depth = i / N, culm = r() < 0.16, dead = !culm && r() < 0.26;
          let bx, y0 = 0, ang, len, arch;
          if (culm) { bx = 0.5 + (r() - 0.5) * 0.55; culmX.push(bx); ang = (r() - 0.5) * 0.1 + (bx - 0.5) * 0.25; len = 0.8 + r() * 0.18; arch = (r() - 0.5) * 0.08; }
          else if (culmX.length && r() < 0.45) {   // a leaf leaving a culm part way up
            bx = culmX[Math.floor(r() * culmX.length)]; y0 = 0.15 + r() * 0.55;
            const s = r() < 0.5 ? -1 : 1; ang = s * (0.35 + r() * 0.6); len = 0.25 + r() * 0.3; arch = s * (0.8 + r() * 1.4);
          } else { bx = bxC + (r() - 0.5) * bxW; ang = lean + (r() - 0.5) * 0.8 + (bx - 0.5) * 0.8; len = (0.42 + r() * 0.5) * (v === 3 ? 0.6 + 0.5 * r() : 1); arch = Math.sign(ang || 1) * (0.25 + r() * 1.7) * (r() < 0.88 ? 1 : -0.6); }
          const w0 = culm ? 0.011 : 0.011 + r() * 0.01;
          const kink = dead && r() < 0.5 ? 0.35 + r() * 0.4 : 9;
          const shade = clamp(0.38 + 0.62 * depth * (0.75 + 0.25 * r()) + (dead ? 0.08 : 0) + (culm ? 0.12 : 0), 0, 1);
          const flag = dead || culm ? 128 : 0;
          const S = 22; let x = bx, y = y0; const pts = [];
          for (let k = 0; k <= S; k++) {
            const t = k / S; pts.push([x, y, y0 + t * (1 - y0) * len]);
            const a = ang + arch * Math.pow(t, 1.4) + Math.sign(arch || 1) * 0.55 * sstep(kink, kink + 0.2, t);
            x += Math.sin(a) * len / S * 1.1; y += Math.cos(a) * len / S;
            if (x < 0.01 || x > 0.99 || y > 0.995 || y < 0) break;
          }
          if (pts.length < 3) continue;
          const left = [], right = [];
          for (let k = 0; k < pts.length; k++) {
            const [x0, yy] = pts[k], [x1, y1] = pts[Math.min(k + 1, pts.length - 1)], [xm, ym] = pts[Math.max(k - 1, 0)];
            const t0 = k / (pts.length - 1);
            const wt = w0 * (culm ? 1 - 0.4 * t0 : Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + t0 * 0.85)), 0.6));
            const dx = (x1 - xm) * VW, dy = (y1 - ym) * H, l = Math.hypot(dx, dy) || 1, nx = -dy / l * wt * VW / 2 * 2, ny = dx / l * wt * VW / 2 * 2;
            const X = ox + x0 * VW, Y = H - yy * H;
            left.push([X - nx, Y + ny]); right.push([X + nx, Y - ny]);
          }
          const [xa, ya, ta] = pts[0], [xb, yb, tb] = pts[pts.length - 1];
          const grd = g.createLinearGradient(ox + xa * VW, H - ya * H, ox + xb * VW, H - yb * H);
          grd.addColorStop(0, `rgb(${Math.round(clamp(ya, 0, 1) * 255)},${Math.round(shade * 255 * (0.6 + 0.4 * clamp(ya * 2, 0, 1)))},${flag})`);
          grd.addColorStop(1, `rgb(${Math.round(clamp(yb, 0, 1) * 255)},${Math.round(shade * 255)},${flag})`);
          g.fillStyle = grd; g.beginPath();
          left.forEach(([X, Y], k) => (k ? g.lineTo(X, Y) : g.moveTo(X, Y)));
          for (let k = right.length - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
          g.closePath(); g.fill();
        }
        g.restore();
      }
      // push-pull so colours under transparent texels are their neighbours' (mipmaps keep their meaning)
      const img = g.getImageData(0, 0, W, H).data;
      const levels = []; let w = W, h = H;
      const L0 = { w, h, c: new Float32Array(w * h * 3), a: new Float32Array(w * h) };
      for (let i = 0; i < w * h; i++) { const a = img[i * 4 + 3] / 255; L0.a[i] = a; for (let k = 0; k < 3; k++) L0.c[i * 3 + k] = img[i * 4 + k]; }
      levels.push(L0);
      while (w > 1 && h > 1) {
        const pw = w, nw = w >> 1, nh = h >> 1, prev = levels[levels.length - 1], Lv = { w: nw, h: nh, c: new Float32Array(nw * nh * 3), a: new Float32Array(nw * nh) };
        for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
          let sa = 0, s0 = 0, s1 = 0, s2 = 0;
          for (let q = 0; q < 4; q++) { const j = (y * 2 + (q >> 1)) * pw + x * 2 + (q & 1), a = prev.a[j]; sa += a; s0 += prev.c[j * 3] * a; s1 += prev.c[j * 3 + 1] * a; s2 += prev.c[j * 3 + 2] * a; }
          const i = y * nw + x; Lv.a[i] = sa / 4; if (sa > 0) { Lv.c[i * 3] = s0 / sa; Lv.c[i * 3 + 1] = s1 / sa; Lv.c[i * 3 + 2] = s2 / sa; }
        }
        levels.push(Lv); w = nw; h = nh;
      }
      for (let l = levels.length - 2; l >= 0; l--) {
        const Lv = levels[l], Pn = levels[l + 1];
        for (let y = 0; y < Lv.h; y++) for (let x = 0; x < Lv.w; x++) {
          const i = y * Lv.w + x; if (Lv.a[i] > 0.02) continue;
          const j = Math.min(Pn.h - 1, y >> 1) * Pn.w + Math.min(Pn.w - 1, x >> 1);
          Lv.c[i * 3] = Pn.c[j * 3]; Lv.c[i * 3 + 1] = Pn.c[j * 3 + 1]; Lv.c[i * 3 + 2] = Pn.c[j * 3 + 2];
        }
      }
      const out = new Uint8Array(W * H * 4);
      for (let i = 0; i < W * H; i++) { out[i * 4] = L0.c[i * 3]; out[i * 4 + 1] = L0.c[i * 3 + 1]; out[i * 4 + 2] = L0.c[i * 3 + 2]; out[i * 4 + 3] = img[i * 4 + 3]; }
      const tex = new THREE.DataTexture(out, W, H, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
      return tex;
    }
    U.uAtlas = { value: paintAtlas() };
    function buildCardGeo(nCards, rows) {
      const pos = [], uvs = [], bl = [], idx = [], r = mulberry32(77);
      // fix pass (Abram: "too consistently shaped in an X"): three cards built flat along x; the shader turns them per
      // clump (three at 60 degrees, or two 50-130 degrees apart with the third dropped), tilts each a few degrees and
      // scales each 0.7-1.3, so no two clumps make the same cross
      nCards = 3;
      for (let c = 0; c < nCards; c++) {
        const ang = 0, base = pos.length / 3;
        for (let j = 0; j <= rows; j++) { const v = j / rows, y = 2.0 * v; for (const s of [-1, 1]) { pos.push(0.9 * s, y, 0); uvs.push((s + 1) / 2, v); bl.push(v, c, ang, r()); } }
        for (let j = 0; j < rows; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
      }
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aUv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setAttribute('aBlade', new THREE.Float32BufferAttribute(bl, 4));
      g.setIndex(idx);
      return g;
    }

    const PALETTE = `
      vec3 grassPalette(float t, float dry, float flag) {
        float split = mix(0.66, 0.2, dry);
        vec3 top = mix(uCTop, uCTopN, uNight), tip = mix(uCTip, uCTopN * 1.08, uNight);
        vec3 c = mix(uCBase, uCBody, smoothstep(0.0, split, t));
        c = mix(c, top, smoothstep(split, min(split + 0.42, 1.0), t));
        c = mix(c, tip, smoothstep(0.8, 1.0, t) * 0.7);
        vec3 d = mix(uCDead0, uCDead1, smoothstep(0.0, 0.8, t));
        d = mix(d, uCTopN * 0.92, uNight * smoothstep(0.3, 1.0, t));
        c = mix(c, d, clamp(flag * 2.0, 0.0, 1.0));
        c = mix(c, mix(uCPlume, uCTopN * 1.15, uNight), clamp(flag * 2.0 - 1.0, 0.0, 1.0));
        return c * mix(1.0, mix(0.4, 1.05, smoothstep(0.25, 0.95, t)), uNight * NIGHT_DARK);
      }`;
    const UNI = 'uniform float uTime, uGust, uNight, uChA, uChB, uChK; uniform vec3 uCam, uLSunDir, uLSunCol; uniform vec4 uRange, uFade; uniform vec3 uCBase, uCBody, uCTop, uCTip, uCDead0, uCDead1, uCPlume, uCTopN; uniform vec4 uWash[3];';
    const GRASS_VERT_PARS = `
      attribute vec4 iA; attribute vec4 iB; attribute vec4 iC; attribute vec4 iD;
      attribute vec4 aBlade;
      #ifdef GRASS_CARD
        attribute vec2 aUv; varying vec2 vGUv; varying vec4 vGInfo; varying float vVariant; varying float vFace;
      #else
        attribute vec3 aCenter;
      #endif
      ${UNI}
      varying vec3 vGCol; varying float vFadeIn; varying float vFadeOut; varying float vTrans;
      vec3 gPos; vec3 gNrm;
      ${PALETTE}
      float chOn(float c) { return mix(step(c, uChA + 0.5), step(c, uChB + 0.5), uChK); }
      vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
      vec3 rotAxis(vec3 p, vec3 k, float a) { float c = cos(a), s = sin(a); return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c); }
      void grassMain() {
        vec3 ip = iA.xyz;
        float dist = distance(ip, uCam);
        float seed = iC.z;
        float on = chOn(iD.y);
        float tr = max(iC.w, 0.0) * on, wl = max(-iC.w, 0.0) * on;
        float flags = iD.w, plume = mod(flags, 2.0), skip = mod(floor(flags / 2.0), 2.0);
        float cc = floor(iD.z / 4.0), kind = iD.z - cc * 4.0, con = kind > 0.5 ? chOn(cc) : 0.0;
        float hide = skip * on + (kind > 2.5 ? con : 0.0);
        #ifdef GRASS_CARD
          hide += (kind > 1.5 && kind < 2.5) ? con : 0.0;
        #endif
        float inRange = step(uRange.x, dist) * (1.0 - step(uRange.y, dist)) * step(hide, 0.5);
        #ifdef PLUME
          inRange *= plume;
        #endif
        float t = aBlade.x;
        float cardAng = 0.0;
        #ifdef GRASS_CARD
          vec3 c = position;
          float ci = aBlade.y, hs = fract(seed * 13.71), three = step(hs, 0.4);
          float sep = mix(0.873, 2.269, fract(seed * 29.37));
          cardAng = three > 0.5 ? ci * 1.0472 : ci * sep;
          float keep = three > 0.5 ? 1.0 : step(ci, 1.5);
          float hc = fract(sin((seed * 31.0 + ci) * 91.7) * 4375.85);
          float tilt = (fract(hc * 17.3) - 0.5) * 0.5;
          vec3 pc = c; pc.x *= mix(0.7, 1.3, hc); pc.y *= mix(0.82, 1.18, fract(hc * 5.13));
          // each card off the clump's centre a little, so the cards do not all cross at one point (no star from above)
          pc = vec3(pc.x + (fract(hc * 2.9) - 0.5) * 0.7, pc.y * cos(tilt), pc.y * sin(tilt) + (fract(hc * 3.7) - 0.5) * 0.9);
          pc = rotY(pc, cardAng) * keep;
          vec3 p = pc * vec3(iB.x, iB.y, iB.x);
          float hRest = aBlade.x;
        #else
          vec3 c = aCenter;
          float flag = aBlade.z;
          float w = 1.0 + max(0.0, dist - 10.0) * 0.03 * (flag > 0.75 ? 0.35 : 1.0);
          vec3 p = c * vec3(iB.x, iB.y, iB.x) + (position - c) * w;
          float hRest = clamp(c.y / 2.0, 0.0, 1.0);
        #endif
        if (kind > 1.5 && kind < 2.5) tr = max(tr, con);
        float lowK = (kind > 0.5 && kind < 1.5) ? con : 0.0;
        // rotor wash: pressed down and out, rippling
        vec2 wv = vec2(0.0); float wash = 0.0;
        for (int i = 0; i < 3; i++) {
          vec2 d = ip.xz - uWash[i].xy; float l = length(d);
          float k = uWash[i].w * (1.0 - smoothstep(uWash[i].z * 0.45, uWash[i].z, l));
          wv += d / max(l, 0.6) * k; wash = max(wash, k);
        }
        p.y *= (1.0 - 0.62 * tr) * mix(1.0, 0.2, lowK) * (1.0 - 0.4 * wash);
        p = rotY(p, iA.w);
        float la = iB.z + tr * 1.2 + wl * 0.18;
        float ld = (tr > 0.01 || wl > 0.01) ? iD.x : iB.w;
        p = rotAxis(p, vec3(-sin(ld), 0.0, cos(ld)), -la);
        // wind: two travelling sine fields, a gust band, a flutter; tops move, bases stay
        float hN = clamp(p.y / 2.1, 0.0, 1.2);
        vec2 wd = normalize(vec2(1.0, 0.32));
        float w1 = sin(dot(ip.xz, vec2(0.075, 0.03)) - uTime * 1.25);
        float w2 = sin(dot(ip.xz, vec2(-0.035, 0.11)) - uTime * 0.83 + 1.7);
        float gb = 0.5 + 0.5 * sin(dot(ip.xz, wd) * 0.045 - uTime * 0.62 + 1.5 * sin(dot(ip.xz, vec2(-wd.y, wd.x)) * 0.05 + uTime * 0.07));
        float gust = gb * gb * gb * gb + 0.5 * uGust;
        float s = 0.09 + 0.05 * w1 + 0.035 * w2 + 0.4 * gust;
        float fl = sin(uTime * (2.7 + seed * 2.2) + seed * 40.0 + t * 2.5) * (0.025 + 0.07 * gust);
        vec2 off = (wd * s + vec2(-wd.y, wd.x) * fl) * (1.0 - 0.75 * tr) * (1.0 - wash);
        #ifdef NOWIND
          off = wv * 0.6;
        #endif
        off += wv * (0.75 + 0.25 * sin(uTime * 13.0 + seed * 30.0 + t * 3.0)) * 0.9;
        float bend = hN * hN;
        p.xz += off * bend * 1.5;
        p.y -= dot(off, off) * bend * 0.9;
        gPos = inRange > 0.5 ? ip + p : vec3(0.0, -2000.0, 0.0);
        vec2 rad = c.xz / (length(c.xz) + 0.3);
        gNrm = normalize(rotY(vec3(rad.x * 1.1 + (aBlade.w - 0.5) * 0.6, 0.7, rad.y * 1.1 + (fract(aBlade.w * 7.3) - 0.5) * 0.6), iA.w));
        #ifdef FADE_IN
          vFadeIn = smoothstep(uFade.x, uFade.y, dist);
        #else
          vFadeIn = 1.0;
        #endif
        #ifdef FADE_OUT
          vFadeOut = 1.0 - smoothstep(uFade.z, uFade.w, dist);
        #else
          vFadeOut = 1.0;
        #endif
        vTrans = pow(max(0.0, dot(normalize(gPos - uCam), uLSunDir)), 4.0) * smoothstep(0.15, 0.9, hRest);
        // the dark interior: deep shade low in the stand
        float ao = mix(GRASS_AO, 1.0, pow(smoothstep(0.0, 0.9, hRest), 1.2)) * (1.0 + 0.3 * tr);
        vec3 tintV = vec3(1.0 + 0.10 * (iC.y - 0.5), 1.0 + 0.05 * (iC.y - 0.5), 1.0 - 0.10 * (iC.y - 0.5)) * (0.86 + 0.28 * fract(seed * 7.7));
        #ifdef GRASS_CARD
          vGUv = aUv; vGInfo = vec4(hRest, iC.x, ao, tr); vVariant = mod(aBlade.y + floor(seed * 4.0), 4.0);
          vec3 cn = rotY(vec3(sin(cardAng), 0.0, cos(cardAng)), iA.w);
          vec3 vd = normalize(uCam - gPos); vFace = abs(dot(vd, cn)) + 0.7 * max(0.0, vd.y - 0.6);
          vGCol = tintV;
        #else
          vGCol = GRASS_K * grassPalette(t, iC.x, flag) * tintV * ao * (0.84 + 0.32 * aBlade.w) * mix(vec3(1.0), vec3(1.02, 0.95, 0.8), tr);
        #endif
      }
    `;
    const GRASS_FRAG_PARS = `
      varying vec3 vGCol; varying float vFadeIn; varying float vFadeOut; varying float vTrans;
      ${UNI}
      #ifdef GRASS_CARD
        varying vec2 vGUv; varying vec4 vGInfo; varying float vVariant; varying float vFace;
        uniform sampler2D uAtlas;
        ${PALETTE}
      #endif
      float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    `;
    const GRASS_COLOR_FRAG = `
      #ifdef GRASS_CARD
        vec2 auv = vec2((vVariant + vGUv.x) * 0.25, 1.0 - vGUv.y);
        vec4 tx = texture2D(uAtlas, auv);
        vec2 tp = auv * vec2(1024.0, 512.0);
        float mip = max(0.0, 0.25 * log2(max(dot(dFdx(tp), dFdx(tp)) * dot(dFdy(tp), dFdy(tp)), 1e-8)));
        float ga = tx.a * min(1.0 + mip * 0.22, 1.8) * smoothstep(0.08, 0.4, vFace);
        ga = (ga - 0.5) / max(fwidth(ga), 0.0001) + 0.5;
        #ifdef ALPHA_TEST_CARD
          if (ga < 0.5) discard; ga = 1.0;
        #else
          if (ga < 0.01) discard;
        #endif
        vec3 gc = grassPalette(tx.r, vGInfo.y, tx.b) * vGCol * vGInfo.z * (GRASS_AO + (0.9 - GRASS_AO) * tx.g) * GRASS_K;
        gc *= mix(vec3(1.0), vec3(1.02, 0.95, 0.8), vGInfo.w);
        diffuseColor = vec4(gc, clamp(ga, 0.0, 1.0));
      #else
        diffuseColor.rgb = vGCol;
      #endif
      float gz = ign(gl_FragCoord.xy);
      if (gz < 1.0 - vFadeIn || gz >= vFadeOut) discard;
    `;
    function grassMaterial({ key, card = false, plume = false, range, fade = null, fadeIn = false, fadeOut = false, k, ao = 0.1, nowind = false, a2c = false, nd = 1 }) {
      // Lambert: lighting per vertex, a much cheaper fragment (fill rate at Retina is the cost)
      const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
      m.defines = { GRASS_K: k.toFixed(3), GRASS_AO: ao.toFixed(3), NIGHT_DARK: nd.toFixed(2) };
      if (card) m.defines.GRASS_CARD = '';
      if (plume) m.defines.PLUME = '';
      if (fadeIn) m.defines.FADE_IN = '';
      if (fadeOut) m.defines.FADE_OUT = '';
      if (card) { m.alphaToCoverage = a2c; m.extensions = { derivatives: true }; if (!a2c) m.defines.ALPHA_TEST_CARD = ''; }
      if (nowind) m.defines.NOWIND = '';
      m.userData.land = true;
      const own = { uRange: { value: new THREE.Vector4(range[0], range[1], 0, 0) }, uFade: { value: new THREE.Vector4(...(fade || [0, 1, 1e6, 1e6 + 1])) } };
      m.userData.extraKey = 'lgrass-' + key;
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
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uLSunCol * vTrans * 0.55;')
          .split('( gl_FrontFacing ) ?').join('( true ) ?');
      };
      m.customProgramCacheKey = () => m.userData.extraKey;
      return m;
    }
    function instMesh(geo, mat, max) {
      const ib = new THREE.InstancedInterleavedBuffer(new Float32Array(max * 16), 16, 1);
      ib.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(ib, 4, 0));
      geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(ib, 4, 4));
      geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(ib, 4, 8));
      geo.setAttribute('iD', new THREE.InterleavedBufferAttribute(ib, 4, 12));
      geo.instanceCount = 0;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false; mesh.visible = false; mesh.userData.dynamic = true;
      ctx.root.add(mesh);
      return { mesh, geo, ib, arr: ib.array, max, n: 0 };
    }
    // the tiers: blades near, three card tiers out to the haze, each a hash grid generated per chunk on demand
    // Quality (window.LAND.quality or ?landq=, set before land.js loads): 'normal' meets the budget (about 4 ms GPU and
    // under 800k triangles at the chapter views on the M4 Pro at native Retina); 'high' is the study's look; 'low' is lighter.
    // Each preset: 3D blades to bR m; near cards (2 per clump, alpha-tested) to cR; mid cards (no wind) to mR; a sparse
    // far tier for silhouettes; the ground tint does the rest.
    const QP = {
      high: { bR: 20, bN: 18, bSeg: 4, bn: 12, bcs: 8, cR: 76, cn: 21, ccs: 12, cw: 1, cCards: 3, mR: 200, mn: 20, mcs: 24, mw: 1.7, fn: 16, fcs: 52, fw: 2.6, a2c: true },
      normal: { bR: 11, bN: 14, bSeg: 3, bn: 10, bcs: 7, cR: 55, cn: 15, ccs: 12, cw: 1.4, cCards: 2, mR: 125, mn: 12, mcs: 18, mw: 2.0, fn: 18, fcs: 50, fw: 3.2, a2c: false },
      low: { bR: 7, bN: 10, bSeg: 3, bn: 8, bcs: 7, cR: 45, cn: 14, ccs: 12, cw: 1.4, cCards: 2, mR: 110, mn: 10, mcs: 18, mw: 2.2, fn: 7, fcs: 50, fw: 3.4, a2c: false },
    };
    const qName = (window.LAND && window.LAND.quality) || new URLSearchParams(location.search).get('landq') || 'normal';
    const Q = QP[qName] || QP.normal;
    window.LAND = Object.assign(window.LAND || {}, { quality: QP[qName] ? qName : 'normal', presets: Object.keys(QP) });
    const bF = Q.bR * 0.72, cF = Q.cR * 0.8, mF = Q.mR * 0.85;
    const TIERS = [
      { name: 'blades', blades: true, n: Q.bn, cs: Q.bcs, seed: 11, lo: 0, hi: Q.bR, wide: 1, dens: 1, slots: 120, max: 5000, lanes: true,
        mk: () => instMesh(buildClumpGeo({ nb: Q.bN, segs: Q.bSeg, culms: 3, culmSegs: 2, strands: 0, strandSegs: 0 }), grassMaterial({ key: 'b', range: [0, Q.bR], fade: [0, 1, bF, Q.bR], fadeOut: true, k: 0.6 }), 5000),
        mkP: () => instMesh(buildClumpGeo({ nb: 0, segs: 1, culms: 2, culmSegs: 2, strands: 7, strandSegs: 2, leaves: false, plumeLift: 0.35 }), grassMaterial({ key: 'bp', plume: true, range: [0, Q.bR], fade: [0, 1, bF, Q.bR], fadeOut: true, k: 0.6 }), 1500), pHi: Q.bR },
      { name: 'near cards', n: Q.cn, cs: Q.ccs, seed: 23, lo: bF, hi: Q.cR, wide: Q.cw, dens: 1, slots: 360, max: 30000, lanes: true,
        mk: () => instMesh(buildCardGeo(Q.cCards, 2), grassMaterial({ key: 'c1', card: true, a2c: Q.a2c, range: [bF, Q.cR], fade: [bF, Q.bR, cF, Q.cR], fadeIn: true, fadeOut: true, k: 0.5 }), 30000),
        mkP: () => instMesh(buildClumpGeo({ nb: 0, segs: 1, culms: 1, culmSegs: 1, strands: 5, strandSegs: 1, leaves: false, plumeLift: 0.35 }), grassMaterial({ key: 'cp', plume: true, range: [bF, 32], fade: [bF, Q.bR, 26, 32], fadeIn: true, fadeOut: true, k: 0.6 }), 6000), pHi: 32 },
      { name: 'mid cards', n: Q.mn, cs: Q.mcs, seed: 37, lo: cF, hi: Q.mR, wide: Q.mw, dens: 1, slots: 520, max: 30000, lanes: false,
        mk: () => instMesh(buildCardGeo(2, 1), grassMaterial({ key: 'c2', card: true, nowind: true, a2c: Q.a2c, range: [cF, Q.mR], fade: [cF, Q.cR, mF, Q.mR], fadeIn: true, fadeOut: true, k: 0.56, ao: 0.45, nd: 0.35 }), 30000) },
      { name: 'far cards', n: Q.fn, cs: Q.fcs, seed: 41, lo: mF, hi: 1500, wide: Q.fw, dens: 1, slots: 460, max: 40000, lanes: false,
        mk: () => instMesh(buildCardGeo(2, 1), grassMaterial({ key: 'c3', card: true, nowind: true, a2c: Q.a2c, range: [mF, 1500], fade: [mF, Q.mR, 1e6, 1e6 + 1], fadeIn: true, k: 0.66, ao: 0.72, nd: 0.15 }), 40000) },
    ];
    for (const T of TIERS) {
      T.sp = T.cs / T.n; T.cap = T.n * T.n;
      T.slab = new Float32Array(T.slots * T.cap * 16);
      T.cnt = new Int32Array(T.slots); T.ymin = new Float32Array(T.slots); T.ymax = new Float32Array(T.slots);
      T.key = new Int32Array(T.slots); T.stamp = new Int32Array(T.slots).fill(-1); T.map = new Map(); T.next = 0;
      T.cx0 = Math.floor(tile.x0 / T.cs); T.cx1 = Math.floor(tile.x1 / T.cs); T.cz0 = Math.floor(tile.z0 / T.cs); T.cz1 = Math.floor(tile.z1 / T.cs);
      T.gw = T.cx1 - T.cx0 + 1; T.has = new Uint8Array(T.gw * (T.cz1 - T.cz0 + 1));
      for (let cz = T.cz0; cz <= T.cz1; cz++) for (let cx = T.cx0; cx <= T.cx1; cx++) {
        let any = 0;
        for (let x = cx * T.cs - 2; x <= cx * T.cs + T.cs + 2 && !any; x += 2) for (let z = cz * T.cs - 2; z <= cz * T.cs + T.cs + 2; z += 2) if (coverAt(x, z) > 0.02) { any = 1; break; }
        T.has[(cz - T.cz0) * T.gw + cx - T.cx0] = any;
      }
      T.M = T.mk(); T.P = T.mkP ? T.mkP() : null;
    }
    function genChunk(T, cx, cz, frame) {
      let slot;
      if (T.next < T.slots) slot = T.next++;
      else { let best = -1, bs = 1e9; for (let i = 0; i < T.slots; i++) if (T.stamp[i] !== frame && T.stamp[i] < bs) { bs = T.stamp[i]; best = i; } slot = best < 0 ? 0 : best; T.map.delete(T.key[slot]); }
      const key = (cz + 4096) * 8192 + cx + 4096;
      T.map.set(key, slot); T.key[slot] = key;
      const S = T.slab, base = slot * T.cap * 16, sd = T.seed;
      let k = 0, y0 = 1e9, y1 = -1e9;
      for (let gx = 0; gx < T.n; gx++) for (let gz = 0; gz < T.n; gz++) {
        const ix = cx * T.n + gx, iz = cz * T.n + gz;
        const jit = T.blades ? 0.92 : 1.35;
        const x = (ix + 0.5 + (ih(ix, iz, sd + 1) - 0.5) * jit) * T.sp, z = (iz + 0.5 + (ih(ix, iz, sd + 2) - 0.5) * jit) * T.sp;
        if (!inTile(x, z)) continue;
        // a few bare gaps in the stand (fix pass: the even spacing read as rows)
        let dens = bk(BK.cover, x, z) * T.dens * sstep(0.2, 0.34, vnoise(x * 0.09 + 31, z * 0.09 - 7));
        if (dens <= 0.001) continue;
        craterAt(x, z);
        const q = CQ, lift = CL;
        dens *= sstep(0.8, 1.25, q) * (1 - 0.35 * Math.exp(-Math.pow((q - 1.1) / 0.2, 2)));
        const dTL = nearTL(x, z); if (dTL < 1.2) dens *= 0.3;
        if (ih(ix, iz, sd) >= dens) continue;
        const y = gy(x, z) + lift;
        const r4 = ih(ix, iz, sd + 4), r5 = ih(ix, iz, sd + 5), r6 = ih(ix, iz, sd + 6), r7 = ih(ix, iz, sd + 7), r8 = ih(ix, iz, sd + 8), r9 = ih(ix, iz, sd + 9), r10 = ih(ix, iz, sd + 10), r11 = ih(ix, iz, sd + 11);
        let h = 0.94 + 0.28 * (fbm(x * 0.045 + 9, z * 0.045 + 4) - 0.5) * 2 + (r4 - 0.5) * 0.26;
        h *= (0.78 + 0.22 * sstep(1.0, 1.6, q)) * bk(BK.tall, x, z);
        const hScale = clamp(h, 0.68, 1.18);
        const spread = (0.82 + r5 * 0.4) * T.wide;
        const lean = 0.04 + r6 * 0.18, leanDir = r7 < 0.35 ? 0.3 + (r8 - 0.5) * 0.8 : r8 * TAU;
        const dry = clamp(0.5 + (fbm(x * 0.035 - 4, z * 0.035 + 8) - 0.5) * 1.1 + (r9 - 0.5) * 0.35, 0, 1);
        const tint = clamp(0.45 * r10 + 0.55 * (fbm(x * 0.03 + 17, z * 0.03 - 5) * 1.6 - 0.3), 0, 1);
        laneAt(x, z);
        let tv = 0, ldir = 0, lch = 99, skip = 0;
        if (LD < 2.2) {
          lch = LC;
          if (T.lanes) {
            const tr = 1 - sstep(0.3, 0.75, LD), wall = sstep(0.55, 0.85, LD) * (1 - sstep(1.3, 2.0, LD));
            if (tr > 0.02 && T.blades) { tv = tr; ldir = LA + (r11 - 0.5) * 0.7 + (r11 > 0.82 ? Math.PI : 0); } else if (wall > 0.02 || (tr > 0.02 && !T.blades)) { tv = -Math.max(wall, 0.5); ldir = LO; }
            if (T.blades ? (LD < 0.4 && r11 < 0.55) : tr > 0.25) skip = 1;
          } else if (LDm < 0.45 * spread * 0.9 * 1.4 + 0.5) skip = 1;
        }
        const o = base + k * 16;
        S[o] = x; S[o + 1] = y; S[o + 2] = z; S[o + 3] = r10 * TAU;
        S[o + 4] = spread; S[o + 5] = hScale; S[o + 6] = lean; S[o + 7] = leanDir;
        S[o + 8] = dry; S[o + 9] = tint; S[o + 10] = ih(ix, iz, sd + 12); S[o + 11] = tv;
        S[o + 12] = ldir; S[o + 13] = lch; S[o + 14] = clearAt(x, z); S[o + 15] = (ih(ix, iz, sd + 13) < 0.24 ? 1 : 0) + 2 * skip;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        k++;
      }
      T.cnt[slot] = k; T.ymin[slot] = k ? y0 : 0; T.ymax[slot] = k ? y1 + 2.8 : 0;
      return slot;
    }
    const box = new THREE.Box3(), frustum = new THREE.Frustum(), pm = new THREE.Matrix4();
    const cullCam = new THREE.PerspectiveCamera(50, 1, 0.5, 4000);
    let frameNo = 0, overflow = false;
    function fillTier(T, cam) {
      const lo = T.lo - 2, hi = T.hi + 2, lo2 = lo > 0 ? lo * lo : 0, hi2 = hi * hi, pHi2 = T.pHi ? (T.pHi + 2) * (T.pHi + 2) : 0;
      const M = T.M, A = M.arr, Pm = T.P, PA = Pm ? Pm.arr : null;
      let n = 0, np = 0;
      const ax0 = Math.max(T.cx0, Math.floor((cam.x - hi) / T.cs)), ax1 = Math.min(T.cx1, Math.floor((cam.x + hi) / T.cs));
      const az0 = Math.max(T.cz0, Math.floor((cam.z - hi) / T.cs)), az1 = Math.min(T.cz1, Math.floor((cam.z + hi) / T.cs));
      for (let cz = az0; cz <= az1; cz++) for (let cx = ax0; cx <= ax1; cx++) {
        if (!T.has[(cz - T.cz0) * T.gw + cx - T.cx0]) continue;
        const x0 = cx * T.cs, z0 = cz * T.cs, key = (cz + 4096) * 8192 + cx + 4096;
        let slot = T.map.get(key), y0, y1;
        if (slot !== undefined) { y0 = T.ymin[slot]; y1 = T.ymax[slot]; } else { const yc = gy(x0 + T.cs / 2, z0 + T.cs / 2); y0 = yc - T.cs; y1 = yc + T.cs + 3; }
        box.min.set(x0 - 2.5, y0 - 0.5, z0 - 2.5); box.max.set(x0 + T.cs + 2.5, y1 + 0.5, z0 + T.cs + 2.5);
        const dmin = box.distanceToPoint(cam);
        const ex = Math.max(Math.abs(cam.x - box.min.x), Math.abs(cam.x - box.max.x)), ey = Math.max(Math.abs(cam.y - box.min.y), Math.abs(cam.y - box.max.y)), ez = Math.max(Math.abs(cam.z - box.min.z), Math.abs(cam.z - box.max.z));
        if (ex * ex + ey * ey + ez * ez < lo2 || dmin > hi || !frustum.intersectsBox(box)) continue;
        if (slot === undefined) slot = genChunk(T, cx, cz, frameNo);
        T.stamp[slot] = frameNo;
        const S = T.slab, base = slot * T.cap * 16, c = T.cnt[slot];
        for (let i = 0; i < c; i++) {
          const o = base + i * 16, dx = S[o] - cam.x, dy = S[o + 1] - cam.y, dz = S[o + 2] - cam.z, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < lo2 || d2 > hi2) continue;
          if (n < M.max) { const w = n * 16; for (let j = 0; j < 16; j++) A[w + j] = S[o + j]; n++; } else overflow = true;
          if (PA && (S[o + 15] % 2) === 1 && d2 < pHi2 && np < Pm.max) { const w = np * 16; for (let j = 0; j < 16; j++) PA[w + j] = S[o + j]; np++; }
        }
      }
      for (const [X, cnt] of [[M, n], [Pm, np]]) {
        if (!X) continue;
        X.n = cnt; X.geo.instanceCount = cnt; X.mesh.visible = cnt > 0;
        X.ib.updateRange.offset = 0; X.ib.updateRange.count = cnt * 16; X.ib.needsUpdate = true;
      }
    }
    const lastCam = new THREE.Vector3(1e9, 0, 0), lastDir = new THREE.Vector3(), camDir = new THREE.Vector3();
    function refill(force) {
      const cam = ctx.camera;
      cam.updateMatrixWorld();
      cam.getWorldDirection(camDir);
      if (!force && lastCam.distanceToSquared(cam.position) < 0.16 && camDir.dot(lastDir) > 0.99985) return;
      lastCam.copy(cam.position); lastDir.copy(camDir);
      cullCam.position.copy(cam.position); cullCam.quaternion.copy(cam.quaternion);
      cullCam.fov = cam.fov + 12; cullCam.aspect = cam.aspect; cullCam.updateProjectionMatrix(); cullCam.updateMatrixWorld();
      pm.multiplyMatrices(cullCam.projectionMatrix, cullCam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
      frameNo++;
      for (const T of TIERS) fillTier(T, cam.position);
      if (overflow && !refill.warned) { refill.warned = true; console.warn('land: a grass tier ran out of instances'); }
    }

    // ======================= dust and haze =======================
    const DUST = (() => {
      const N = 320, rnd = mulberry32(77), aP = new Float32Array(N * 4), aQ = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        let x, z, kind;
        if (i < 190) { const b = rnd() * 360, r = P.rAt(b) + (rnd() - 0.7) * 10; x = CP.x + Math.sin(b * Math.PI / 180) * r; z = CP.z - Math.cos(b * Math.PI / 180) * r; kind = 0; }
        else { const lz = i < 230 ? SITE.lz689 : i < 275 ? SITE.alz : SITE.czlz; kind = i < 230 ? 0 : i < 275 ? 1 : 2; const a = rnd() * TAU, r = Math.sqrt(rnd()) * 9; x = lz.x + Math.cos(a) * r; z = lz.z + Math.sin(a) * r; }
        const s = 1.2 + rnd() * 2.2;
        aP.set([x, gy(x, z) + s * 0.5, z, rnd()], i * 4); aQ.set([s, 1 / (14 + rnd() * 16), kind, rnd()], i * 4);
      }
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); g.setAttribute('aQ', new THREE.InstancedBufferAttribute(aQ, 4));
      g.instanceCount = N;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAmt: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector3(1, 0, 0.3) }, uCol: { value: new THREE.Color() } },
        vertexShader: 'attribute vec4 aP; attribute vec4 aQ; uniform float uTime; uniform vec3 uAmt; uniform vec3 uWind; varying float vA; varying vec2 vUv;\n' +
          'void main() { float u = fract(uTime * aQ.y + aP.w); vec3 c = aP.xyz + uWind * (u - 0.5) * 9.0 + vec3(0.0, 0.2 + u * 2.0, 0.0); float s = aQ.x * (0.6 + 0.8 * u);\n' +
          ' vec4 mv = modelViewMatrix * vec4(c, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv;\n' +
          ' float amt = aQ.z < 0.5 ? uAmt.x : (aQ.z < 1.5 ? uAmt.y : uAmt.z); vA = sin(3.14159 * u) * amt * (0.5 + 0.5 * aQ.w) * smoothstep(3.0, 12.0, -mv.z); vUv = position.xy; }',
        fragmentShader: 'uniform vec3 uCol; varying float vA; varying vec2 vUv; void main() { float d = length(vUv); float a = (1.0 - smoothstep(0.15, 1.0, d)) * vA; if (a < 0.003) discard; gl_FragColor = vec4(uCol, a * 0.32); }',
        transparent: true, depthWrite: false,
      });
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; m.userData.dynamic = true; ctx.root.add(m);
      return { mat, mesh: m };
    })();
    const HAZE = (() => {
      const res = 4, hx0 = tile.x0 - 300, hz0 = tile.z0 - 300, hw = Math.ceil((tile.x1 - tile.x0 + 600) / res), hh = Math.ceil((tile.z1 - tile.z0 + 600) / res);
      const d = new Float32Array(hw * hh);
      for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) d[j * hw + i] = gy(hx0 + (i + 0.5) * res, hz0 + (j + 0.5) * res);
      const tx = new THREE.DataTexture(d, hw, hh, THREE.RedFormat, THREE.FloatType);
      tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.needsUpdate = true;
      const ps = [], X0 = hx0, X1 = hx0 + hw * res, Z0 = hz0, Z1 = hz0 + hh * res;
      for (const y of [-18, -10, -2, 6, 14, 22, 30]) ps.push(X0, y, Z0, X1, y, Z1, X1, y, Z0, X0, y, Z0, X0, y, Z1, X1, y, Z1);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uH: { value: tx }, uHB: { value: new THREE.Vector4(hx0, hz0, 1 / (hw * res), 1 / (hh * res)) }, uHN: { value: new THREE.Vector2(hw, hh) }, uAmt: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
        fragmentShader: [
          'uniform sampler2D uH; uniform vec4 uHB; uniform vec2 uHN; uniform float uAmt; uniform float uTime; uniform vec3 uCol; varying vec3 vW;',
          'float th(vec2 i) { return texture2D(uH, (clamp(i, vec2(0.0), uHN - 1.0) + 0.5) / uHN).r; }',
          'void main() {',
          '  vec2 g = (vW.xz - uHB.xy) * uHB.zw * uHN - 0.5; vec2 i = floor(g), f = g - i;',
          '  float terr = mix(mix(th(i), th(i + vec2(1.0, 0.0)), f.x), mix(th(i + vec2(0.0, 1.0)), th(i + 1.0), f.x), f.y);',
          '  float t = vW.y - terr; if (t <= 0.0) discard;',
          '  float n = 0.5 + 0.5 * sin(vW.x * 0.011 + uTime * 0.03 + sin(vW.z * 0.013)) * sin(vW.z * 0.009 - uTime * 0.02 + 1.3 * sin(vW.x * 0.007));',
          '  float a = uAmt * smoothstep(0.0, 9.0, t) * (0.35 + 0.65 * n);',
          '  a *= smoothstep(8.0, 60.0, distance(vW, cameraPosition)) * (1.0 - smoothstep(4.0, 36.0, vW.y));',
          '  if (a < 0.002) discard;',
          '  gl_FragColor = vec4(uCol, a);',
          '}'].join('\n'),
        transparent: true, depthWrite: false,
      });
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; m.visible = false; m.userData.dynamic = true; ctx.root.add(m);
      return { mat, mesh: m };
    })();
    // per chapter: dust (689 + its LZ, A's LZ, C's LZ) and valley haze
    const DUSTCH = { 1: [0.5, 0, 0], 2: [0.6, 0, 0], 3: [0.8, 0.5, 0], 4: [1, 0.6, 0], 5: [1, 0.6, 0], 6: [0.9, 0.6, 0.6], 7: [0.8, 0.6, 0.8], 11: [0.8, 0.5, 0.5] };
    const HAZECH = { 1: 0.11, 2: 0.06, 10: 0.1 };
    const dustA = new THREE.Vector3(), dustB = new THREE.Vector3();
    let hazeA = 0, hazeB = 0;

    // ======================= labels =======================
    {
      const g1 = SITE.charliePause, near = (p, dx, dz) => new THREE.Vector3(p.x + dx, gy(p.x + dx, p.z + dz) + 1.4, p.z + dz);
      const gp = [near(g1, 6, 14), near(SITE.alz, 10, 6), near(SITE.crossing.from, 0, -6)];
      for (const p of gp) ctx.tag('grass', () => p, { r: 6 });
      const big = CR.filter((c) => !c.named).sort((a, b) => b.r - a.r).slice(0, 3);
      for (const c of [CR[0], ...big]) { const p = new THREE.Vector3(c.x, gy(c.x, c.z) + 0.5, c.z); ctx.tag('craters', () => p, { r: c.r }); }
    }

    // ======================= chapters, light, wash =======================
    // chapter changes are watched in update (a listener registered after the base's first goChapter misses the start)
    let curCh = -1;
    function chapterChanged(id, t) {
      const first = curCh < 0;
      const k = sstep(0, 1, (t - chFadeAt) / 1.6);
      CHS.a.value = first ? id : (k > 0.5 ? CHS.b.value : CHS.a.value);
      CHS.b.value = id;
      dustA.copy(DUST.mat.uniforms.uAmt.value);
      const d = DUSTCH[id] || [0, 0, 0]; dustB.set(d[0], d[1], d[2]);
      hazeA = HAZE.mat.uniforms.uAmt.value; hazeB = HAZECH[id] || 0;
      if (first) { dustA.copy(dustB); hazeA = hazeB; chFadeAt = -1e9; } else chFadeAt = t;
      curCh = id;
    }
    const keyLight = ctx.scene.children.find((o) => o.isDirectionalLight);
    const wy = (p) => p.y - gy(p.x, p.z);
    function setWash(i, p, k) { const W = U.uWash.value[i]; if (!p || k <= 0) { W.w = 0; return; } W.set(p.x, p.z, 12, k); }
    const lzPads = () => { const W = window.WORKS; return W && W.lz && W.lz.czlz ? W.lz.czlz : [SITE.czlz]; };
    const waterDay = lin(0x93a4aa).multiplyScalar(0.1), waterNight = lin(0x22305a).multiplyScalar(0.35);

    for (const mm of [earthMat, waterMat, DUST.mat, HAZE.mat]) mm.userData.land = true;
    ctx.scene.traverse((o) => { if (o.isInstancedMesh && o.parent === ctx.root) o.material.userData.land = true; });
    window.__landDbg = { CHS, LANES, laneAt: (x, z) => { laneAt(x, z); return [LD, LC]; }, TIERS, CR };
    let started = false, gradeT = null;
    return function update(t) {
      if (!started) started = true;
      bakePerim();
      const clrNew = watchClearings();
      if (ctx.chapter.id !== curCh) chapterChanged(ctx.chapter.id, t);
      const k = sstep(0, 1, (t - chFadeAt) / 1.6);
      CHS.k.value = k;
      U.uTime.value = t; U.uGust.value = ctx.wind.gust || 0;
      U.uNight.value = clamp((0.42 - ctx.light.day) / 0.42, 0, 1);
      {
        const Gd = GRADES[ctx.light.preset] || GRADES.day, a = 1 - Math.exp(-Math.max(0, t - (gradeT ?? t)) * 2.5);
        const first = gradeT === null; gradeT = t;
        const kk = first ? 1 : a;
        GRADE.uGSat.value += (Gd.sat - GRADE.uGSat.value) * kk; GRADE.uGGround.value += (Gd.g - GRADE.uGGround.value) * kk;
        const T1 = GRADE.uGTint.value, T2 = GRADE.uGGTint.value;
        T1.x += (Gd.tint[0] - T1.x) * kk; T1.y += (Gd.tint[1] - T1.y) * kk; T1.z += (Gd.tint[2] - T1.z) * kk;
        T2.x += (Gd.gt[0] - T2.x) * kk; T2.y += (Gd.gt[1] - T2.y) * kk; T2.z += (Gd.gt[2] - T2.z) * kk;
      }
      if (keyLight) {
        U.uLSunDir.value.copy(keyLight.position).sub(keyLight.target.position).normalize();
        U.uLSunCol.value.copy(keyLight.color).multiplyScalar(keyLight.intensity * (0.4 + 0.6 * ctx.light.day));
      }
      U.uCam.value.copy(ctx.camera.position);
      // rotor wash: under the CH-46 and the medevacs, else round the LZ pads in chapter 7's landing
      const MV = window.MEDEVAC;
      const near = (p) => clamp(1 - (wy(p) - 2) / 30, 0, 1);   // fix pass: the wash reaches the grass under the last of the approach
      if (MV && MV.ch46) setWash(0, MV.ch46.pos, MV.ch46.visible && MV.ch46.pos ? near(MV.ch46.pos) : 0); else setWash(0, null, 0);
      if (MV && MV.medevacs && MV.medevacs.length) {
        for (let i = 0; i < 2; i++) { const m = MV.medevacs[i]; setWash(i + 1, m && m.pos, m && m.visible && m.pos ? near(m.pos) : 0); }
      } else if (ctx.chapter.id === 7) {
        const ct = ctx.cycle.t, e = sstep(86, 90, ct) * (1 - sstep(108, 112, ct)), pads = lzPads();
        setWash(1, pads[0], e); setWash(2, pads[1], e);
      } else { setWash(1, null, 0); setWash(2, null, 0); }

      refill(frameNo === 0 || clrNew);

      // dust by day on the perimeter and the LZs, haze in the valleys
      const du = DUST.mat.uniforms;
      du.uTime.value = t; du.uAmt.value.lerpVectors(dustA, dustB, k).multiplyScalar(clamp(ctx.light.day * 1.4 - 0.2, 0, 1));
      du.uWind.value.copy(ctx.wind.dir);
      du.uCol.value.copy(cDust).multiplyScalar(0.5 + 0.7 * ctx.light.day);
      DUST.mesh.visible = du.uAmt.value.x + du.uAmt.value.y + du.uAmt.value.z > 0.001;
      const hu = HAZE.mat.uniforms;
      hu.uTime.value = t; hu.uAmt.value = hazeA + (hazeB - hazeA) * k;
      hu.uCol.value.copy(ctx.scene.fog.color).lerp(lin(0xf4eee2), 0.25 + 0.2 * ctx.light.day);
      HAZE.mesh.visible = hu.uAmt.value > 0.001;
      waterMat.emissive.copy(waterNight).lerp(waterDay, ctx.light.day);
    };
  }
})();
