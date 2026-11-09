// Direction C: refined low-poly. Still faceted and flat-shaded like the studio's blocky kit, but grown up: about 1/5.5
// head-to-height, and far more modelled detail (helmet cover folds and band, flak collar and pockets, pouches, straps,
// rolled sleeves, cargo pockets, bloused boots). Every face carries its own slightly varied colour.
(function () {
  'use strict';
  const FK = window.FK, G = FK.G, M = FK.M, V = FK.V, lin = FK.lin, TAU = Math.PI * 2;
  window.STYLES = window.STYLES || {};

  const C = {
    util: 0x6c7344, utilDark: 0x565c35, utilCapt: 0x637041, flak: 0x5b6339, flakDark: 0x485030, web: 0x77734b, webDark: 0x5e5b3d,
    canteen: 0x6b6846, cover: 0x7b8a49, coverDark: 0x4a5a2c, coverBrown: 0x77653f, coverLight: 0x98a45c, band: 0x48462f,
    leather: 0x302b26, canvas: 0x5f6642, sole: 0x262320, rifle: 0x30312d, rifleMetal: 0x3c3e39, radio: 0x56613a, radioDark: 0x444d2e,
    handset: 0x2c2c29, eye: 0x21170f, holster: 0x5b3d27, map: 0xeadfbc, mapInk: 0x8a9a5e, metal: 0x5f5f57, bottle: 0x6f7a50,
  };
  const KINDS = {
    rifleman: { skin: 0xe0aa84, skinDark: 0xc58d69, brow: 0x52381f, hair: 0x52381f, rolled: true, util: C.util },
    captain: { skin: 0xeab995, skinDark: 0xd09b78, brow: 0x704d31, hair: 0x704d31, rolled: false, util: C.utilCapt },
    radioman: { skin: 0x8c5a3b, skinDark: 0x72462d, brow: 0x20150d, hair: 0x20150d, rolled: true, util: C.util },
  };
  const S = { ankle: 0.08, knee: 0.47, hip: 0.87, hipW: 0.098, waist: 0.96, shY: 1.37, shW: 0.2, elbow: 1.08, wrist: 0.835, neck: 1.415, eyeY: 1.578, eyeZ: 0.104 };

  // each face a touch lighter or darker, like hand-placed polygons
  const shadeCache = new Map();
  function jit(hex, i, amt = 0.05) {
    const k = Math.round((FK.hash(i * 0.731, hex * 1e-6, 3.1) - 0.5) * 6) / 6 * amt * 2;
    const key = hex + '|' + k;
    let out = shadeCache.get(key);
    if (out === undefined) {
      const c = new THREE.Color(hex), h = {};
      c.getHSL(h);
      c.setHSL(h.h, h.s, Math.min(1, Math.max(0, h.l * (1 + k))));
      out = c.getHex();
      shadeCache.set(key, out);
    }
    return out;
  }
  const J = (hex, amt) => (x, y, z, i) => jit(hex, Math.floor(x * 97 + y * 131 + z * 173) + i, amt);
  function camo(x, y, z, i) {
    const n = FK.noise(x * 20 + 3, y * 20, z * 20), n2 = FK.noise(x * 14 - 7, y * 14 + 2, z * 14 + 5);
    const b = n > 0.62 ? C.coverDark : n2 > 0.68 ? C.coverBrown : n < 0.3 ? C.coverLight : C.cover;
    return jit(b, i, 0.04);
  }
  // push vertices in and out by noise (cover folds, cloth)
  function crumple(g, amt, freq, seed, filter) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (filter && !filter(x, y, z)) continue;
      const n = (FK.noise(x * freq + seed, y * freq, z * freq) - 0.5) * 2 * amt, l = Math.hypot(x, z) || 1;
      p.setXYZ(i, x + (x / l) * n, y + n * 0.3, z + (z / l) * n);
    }
    g.computeVertexNormals();
    return g;
  }

  function materials() {
    const body = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.93, metalness: 0 });
    const grass = FK.sway(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }), 'flat');
    const ground = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
    return { body, grass, ground, prop: body };
  }

  const prism = (a, b, r1, r2, seg = 6) => FK.along((L) => G.cyl(r2, r1, L, seg).translate(0, L / 2, 0), V(...a), V(...b));
  const strap = (a, b, w, t) => FK.along((L) => G.box(w, L, t).translate(0, L / 2, 0), V(...a), V(...b));
  // a pouch: a box with a slanted lid flap and a small snap
  function pouch(bld, joint, w, h, d, col, m) {
    bld.add(joint, G.box(w, h, d), J(col, 0.05), m);
    const flap = G.box(w * 1.06, h * 0.32, d * 1.1), p = flap.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0 && p.getZ(i) > 0) p.setZ(i, p.getZ(i) + d * 0.12);
    bld.add(joint, flap, J(C.webDark, 0.04), m.clone().multiply(M(0, h * 0.36, 0)));
    bld.add(joint, G.box(w * 0.18, h * 0.12, 0.006), C.metal, m.clone().multiply(M(0, h * 0.2, d * 0.62)));
  }

  function rifle(bld, frame) {
    const add = (g, c) => bld.add('chest', g, J(c, 0.06), frame.m);
    const stock = G.box(0.25, 0.07, 0.036), p = stock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (0.125 - p.getX(i)) / 0.25; p.setY(i, p.getY(i) * (0.8 + 0.75 * k) - 0.014 * k); }
    add(stock.translate(-0.205, -0.01, 0), C.rifle);
    add(G.box(0.012, 0.13, 0.04).translate(-0.335, -0.025, 0), C.rifleMetal);
    add(G.box(0.17, 0.055, 0.032).translate(0.015, 0, 0), C.rifle);
    add(G.box(0.2, 0.034, 0.03).translate(0.04, 0.042, 0), C.rifleMetal);
    add(G.cyl(0.009, 0.009, 0.03, 5).applyMatrix4(M(0.0, 0.05, -0.022, Math.PI / 2, 0, 0)), C.rifleMetal);
    add(G.box(0.14, 0.014, 0.016).translate(0.03, 0.1, 0), C.rifle);
    add(G.box(0.028, 0.05, 0.016).translate(-0.035, 0.078, 0), C.rifle);
    add(G.box(0.018, 0.04, 0.016).translate(0.095, 0.075, 0), C.rifle);
    add(G.box(0.032, 0.095, 0.028).applyMatrix4(M(-0.045, -0.06, 0, 0, 0, 0.38)), C.rifle);
    add(G.box(0.032, 0.012, 0.022).translate(-0.01, -0.035, 0), C.rifleMetal);
    add(G.box(0.05, 0.13, 0.024).applyMatrix4(M(0.055, -0.085, 0, 0, 0, -0.06)), C.rifleMetal);
    add(G.cyl(0.028, 0.025, 0.3, 3).applyMatrix4(M(0.27, 0.022, 0, Math.PI, 0, -Math.PI / 2)), C.rifle);
    add(G.cyl(0.03, 0.03, 0.014, 6).applyMatrix4(M(0.123, 0.022, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
    add(G.cyl(0.008, 0.008, 0.16, 5).applyMatrix4(M(0.49, 0.025, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
    add(G.box(0.012, 0.065, 0.012).applyMatrix4(M(0.43, 0.06, 0, 0, 0, -0.15)), C.rifle);
    add(G.cyl(0.012, 0.012, 0.06, 6).applyMatrix4(M(0.59, 0.025, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
    // the sling, hanging slack from the front swivel to the stock
    add(G.box(0.012, 0.005, 0.3).applyMatrix4(M(0.12, -0.075, 0.03, 0, Math.PI / 2, -0.25)), C.web);
  }

  function build(kind, mats) {
    const K = KINDS[kind], sk = FK.skeleton(S), bld = new FK.Builder(sk, { faceColor: true }), util = K.util;
    const U = J(util, 0.05), Ud = J(C.utilDark, 0.05), Sk = J(K.skin, 0.035);
    // ---- head: a cut gem of a skull with a jaw, brow ridge, nose and cheeks ----
    const skull = G.ico(1, 1).scale(0.096, 0.112, 0.104);
    bld.add('head', skull, Sk, M(0, 1.575, 0.0));
    const jaw = G.cyl(0.07, 0.05, 0.08, 7).applyMatrix4(M(0, 0, 0, 0, Math.PI / 7, 0));
    bld.add('head', jaw, Sk, M(0, 1.5, 0.02, -0.18, 0, 0, 1, 1, 1.05));
    bld.add('head', G.box(0.14, 0.022, 0.03), Sk, M(0, 1.6, 0.085, -0.25, 0, 0));
    bld.add('head', G.cone(0.018, 0.05, 4).rotateX(Math.PI / 2 + 0.45).rotateZ(Math.PI / 4), J(K.skinDark, 0.03), M(0, 1.565, 0.103, 0, 0, 0, 1, 1, 0.8));
    bld.add('head', G.box(0.03, 0.005, 0.008), K.skinDark, M(0, 1.508, 0.098));
    for (const sx of [-1, 1]) {
      bld.add('head', G.box(0.016, 0.034, 0.026), J(K.skinDark, 0.03), M(sx * 0.097, 1.565, -0.008, 0, 0, 0));
      bld.add('head', G.box(0.03, 0.06, 0.09), J(K.hair, 0.04), M(sx * 0.082, 1.585, -0.03, 0, 0, sx * 0.1));
      bld.add('head', G.box(0.04, 0.011, 0.01), K.brow, M(sx * 0.04, 1.614, 0.106, 0, sx * 0.22, sx * 0.07));
      bld.add('eyes', G.box(0.017, 0.023, 0.006), C.eye, M(sx * 0.038, 1.582, 0.1, 0, sx * 0.3, 0));
    }
    // ---- helmet: a faceted M1 shell with the cover crumpled into folds, the band, and a bottle of repellent ----
    const helm = M(0, 1.658, -0.018, -0.22, 0, 0, 1, 1, 1.07);
    const shell = crumple(G.lathe([[0.001, 0.125], [0.066, 0.118], [0.106, 0.095], [0.13, 0.058], [0.14, 0.015], [0.143, -0.015], [0.155, -0.04], [0.163, -0.054], [0.153, -0.062], [0.136, -0.048]], 14), 0.008, 26, 4, (x, y) => y > -0.03);
    bld.add('head', shell, camo, helm);
    // fold ridges where the cover gathers under the band
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + 0.3;
      bld.add('head', G.box(0.016, 0.036, 0.008), camo, helm.clone().multiply(M(Math.sin(a) * 0.136, 0.05, Math.cos(a) * 0.136, 0, a, 0).multiply(M(0, 0, 0, -0.32, 0, 0))));
    }
    bld.add('head', G.cyl(0.143, 0.141, 0.018, 14, true), J(C.band, 0.05), helm.clone().multiply(M(0, 0.022, 0)));
    bld.add('head', G.cyl(0.143, 0.141, 0.018, 14, true).scale(0.985, 1, 0.985), J(C.band, 0.05), helm.clone().multiply(M(0, 0.022, 0)));
    bld.add('head', G.cyl(0.011, 0.011, 0.05, 6), J(C.bottle, 0.04), helm.clone().multiply(M(0.098, 0.035, 0.102, 0.25, 0, -0.1)));
    bld.add('head', G.cyl(0.006, 0.006, 0.012, 5), C.sole, helm.clone().multiply(M(0.1, 0.064, 0.108, 0.25, 0, -0.1)));
    // ---- body: neck, flak jacket with its collar, zip, shoulder pads and lower pockets ----
    bld.add('chest', prism([0, 1.38, -0.008], [0, 1.47, 0.0], 0.045, 0.042, 7), Sk);
    const flak = crumple(G.lathe([[0.001, 0.94], [0.143, 0.94], [0.157, 0.97], [0.165, 1.09], [0.172, 1.2], [0.166, 1.29], [0.138, 1.365], [0.085, 1.405], [0.001, 1.405]], 10), 0.004, 18, 1);
    bld.add('chest', flak, (x, y, z, i) => (Math.abs(x) < 0.02 && z > 0 ? jit(C.flakDark, i) : jit(C.flak, i, 0.05)), M(0, 0, 0, 0, 0, 0, 1, 1, 0.74));
    // the M1955 collar: a thick roll round the back and sides, open at the front
    for (let k = 0; k < 9; k++) {
      const a0 = 0.55 + (k / 9) * (TAU - 1.1), a1 = 0.55 + ((k + 1) / 9) * (TAU - 1.1);
      const p0 = [Math.sin(a0) * 0.098, 1.425, Math.cos(a0) * 0.085 - 0.01], p1 = [Math.sin(a1) * 0.098, 1.425, Math.cos(a1) * 0.085 - 0.01];
      bld.add('chest', prism(p0, p1, 0.024, 0.024, 5), J(C.flak, 0.06));
    }
    bld.add('chest', G.box(0.012, 0.42, 0.012), J(C.flakDark, 0.03), M(0, 1.16, 0.122, -0.07, 0, 0));
    for (const sx of [-1, 1]) {
      bld.add('chest', G.box(0.07, 0.03, 0.15), J(C.flakDark, 0.05), M(sx * 0.13, 1.365, -0.005, 0, 0, -sx * 0.45));
      pouch(bld, 'chest', 0.08, 0.075, 0.025, C.flakDark, M(sx * 0.076, 1.02, 0.114, 0, sx * 0.3, 0));
      // web suspenders over the flak, with a buckle
      bld.add('chest', strap([sx * 0.07, 0.95, 0.122], [sx * 0.088, 1.36, 0.083], 0.034, 0.012), J(C.web, 0.05));
      bld.add('chest', strap([sx * 0.09, 1.37, 0.07], [sx * 0.088, 1.33, -0.11], 0.034, 0.012), J(C.web, 0.05));
      bld.add('chest', G.box(0.04, 0.018, 0.016), C.metal, M(sx * 0.078, 1.16, 0.115, -0.05, 0, 0));
    }
    if (kind !== 'radioman') pouch(bld, 'chest', 0.05, 0.065, 0.03, C.web, M(0.088, 1.25, 0.112, -0.12, 0.2, 0));
    // ---- pelvis: trousers seat, belt with buckle, ammo pouches, canteens with caps ----
    bld.add('pelvis', G.lathe([[0.001, 0.82], [0.1, 0.83], [0.138, 0.88], [0.146, 0.96], [0.138, 0.99], [0.001, 1.0]], 10), U, M(0, 0, 0, 0, 0, 0, 1, 1, 0.78));
    bld.add('pelvis', G.lathe([[0.15, 0.915], [0.156, 0.92], [0.156, 0.96], [0.15, 0.965]], 12), J(C.web, 0.04), M(0, 0, 0, 0, 0, 0, 1, 1, 0.8));
    bld.add('pelvis', G.box(0.04, 0.036, 0.012), C.metal, M(0, 0.94, 0.125));
    for (const sx of [-1, 1]) {
      if (kind !== 'captain' || sx > 0) pouch(bld, 'pelvis', 0.07, 0.085, 0.045, C.web, M(sx * 0.09, 0.915, 0.112, 0, sx * 0.4, 0));
      bld.add('pelvis', G.cyl(0.045, 0.045, 0.13, 7), J(C.canteen, 0.05), M(sx * 0.115, 0.86, -0.1, 0.05, 0, sx * 0.08));
      bld.add('pelvis', G.box(0.07, 0.03, 0.07), J(C.webDark, 0.05), M(sx * 0.115, 0.925, -0.1, 0.05, 0, sx * 0.08));
      bld.add('pelvis', G.cyl(0.015, 0.015, 0.02, 5), C.sole, M(sx * 0.117, 0.95, -0.085));
    }
    if (kind === 'captain') {
      bld.add('pelvis', G.box(0.055, 0.15, 0.04), J(C.holster, 0.05), M(-0.158, 0.84, 0.02, 0, 0, -0.08));
      bld.add('pelvis', G.box(0.06, 0.04, 0.044), J(C.holster, 0.05), M(-0.16, 0.9, 0.022, 0, 0, -0.08));
      bld.add('pelvis', G.box(0.032, 0.05, 0.028), C.rifle, M(-0.162, 0.94, 0.006, 0.2, 0, 0));
      pouch(bld, 'pelvis', 0.05, 0.05, 0.035, C.web, M(0.1, 0.915, 0.1, 0, 0.4, 0));
    }
    // ---- legs: cargo pockets, bloused trousers, jungle boots with canvas uppers ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      bld.add('th' + s, prism([sx * S.hipW, S.hip + 0.04, 0], [sx * S.hipW, S.knee, 0.012], 0.072, 0.056, 7), U);
      pouch(bld, 'th' + s, 0.03, 0.12, 0.085, util, M(sx * (S.hipW + 0.06), 0.68, 0.01, 0, sx * Math.PI / 2, 0));
      bld.add('sh' + s, prism([sx * S.hipW, S.knee + 0.02, 0.012], [sx * S.hipW, 0.24, 0], 0.056, 0.046, 7), U);
      bld.add('sh' + s, G.cyl(0.058, 0.05, 0.07, 7), Ud, M(sx * S.hipW, 0.235, 0.003));
      bld.add('sh' + s, G.cyl(0.044, 0.048, 0.17, 7), J(C.canvas, 0.05), M(sx * S.hipW, 0.135, 0));
      bld.add('sh' + s, G.box(0.012, 0.11, 0.004), C.leather, M(sx * S.hipW, 0.14, 0.048));
      const boot = G.box(0.09, 0.075, 0.24), bp = boot.attributes.position;
      for (let i = 0; i < bp.count; i++) if (bp.getZ(i) > 0 && bp.getY(i) > 0) { bp.setY(i, bp.getY(i) - 0.03); }
      boot.computeVertexNormals();
      bld.add('sh' + s, boot, J(C.leather, 0.05), M(sx * S.hipW, 0.055, 0.035));
      bld.add('sh' + s, G.box(0.096, 0.022, 0.25), C.sole, M(sx * S.hipW, 0.013, 0.035));
    }
    // ---- arms: rolled sleeves in two turns, or sleeves down with a buttoned cuff ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      const sh = sk.bind['ua' + s], el = sk.bind['fa' + s], wr = sk.wrist[s];
      bld.add('ua' + s, G.ico(1, 0).scale(0.06, 0.058, 0.062), U, M(sh.x - sx * 0.008, sh.y - 0.012, sh.z));
      if (K.rolled) {
        bld.add('ua' + s, prism([sh.x, sh.y, sh.z], [el.x, el.y + 0.06, el.z], 0.052, 0.046, 7), U);
        bld.add('ua' + s, G.cyl(0.053, 0.055, 0.028, 7), Ud, M(el.x, el.y + 0.072, el.z));
        bld.add('ua' + s, G.cyl(0.051, 0.053, 0.025, 7), U, M(el.x, el.y + 0.047, el.z));
        bld.add('fa' + s, prism([el.x, el.y + 0.04, el.z], [wr.x, wr.y, wr.z], 0.039, 0.029, 6), Sk);
      } else {
        bld.add('ua' + s, prism([sh.x, sh.y, sh.z], [el.x, el.y, el.z], 0.052, 0.044, 7), U);
        bld.add('fa' + s, prism([el.x, el.y, el.z], [wr.x, wr.y + 0.015, wr.z], 0.044, 0.037, 7), U);
        bld.add('fa' + s, G.cyl(0.04, 0.04, 0.028, 7), Ud, M(wr.x, wr.y + 0.022, wr.z));
      }
      bld.add('fa' + s, G.box(0.034, 0.075, 0.046), Sk, M(wr.x, wr.y - 0.038, wr.z + 0.006));
      bld.add('fa' + s, prism([wr.x, wr.y - 0.012, wr.z + 0.026], [wr.x - sx * 0.006, wr.y - 0.05, wr.z + 0.038], 0.012, 0.01, 4), Sk);
    }
    const F = { kind };
    if (kind === 'rifleman') {
      const fr = FK.rifleFrame([-0.11, 0.96, 0.2], 0.24, 1.0, [0.8, 0.45]);
      rifle(bld, fr);
      F.rifle = { R: fr.R.clone().add(V(0, -0.01, -0.025)), L: fr.L.clone().add(V(0, -0.03, -0.03)) };
    }
    if (kind === 'radioman') {
      bld.add('chest', G.box(0.27, 0.27, 0.11), J(C.radio, 0.05), M(0, 1.15, -0.19));
      bld.add('chest', G.box(0.265, 0.13, 0.105), J(C.radioDark, 0.05), M(0, 0.95, -0.19));
      bld.add('chest', G.box(0.28, 0.012, 0.115), C.metal, M(0, 1.016, -0.19));
      bld.add('chest', G.cyl(0.018, 0.018, 0.025, 6), C.rifle, M(-0.07, 1.295, -0.19));
      bld.add('chest', G.cyl(0.015, 0.015, 0.025, 6), C.rifle, M(0.0, 1.295, -0.19));
      bld.add('chest', G.box(0.04, 0.02, 0.03), C.rifle, M(-0.03, 1.293, -0.16));
      bld.add('chest', G.cyl(0.013, 0.017, 0.045, 6), C.rifle, M(0.095, 1.305, -0.18));
      for (const sx of [-1, 1]) {
        bld.add('chest', strap([sx * 0.085, 1.28, -0.14], [sx * 0.09, 1.38, 0.0], 0.04, 0.012), J(C.webDark, 0.05));
        bld.add('chest', strap([sx * 0.09, 1.37, 0.04], [sx * 0.085, 1.02, 0.12], 0.04, 0.012), J(C.webDark, 0.05));
        bld.add('chest', G.box(0.044, 0.02, 0.016), C.metal, M(sx * 0.088, 1.2, 0.098, -0.25, 0, 0));
      }
      F.antBase = V(0.095, 1.32, -0.18).sub(sk.bind.chest);
      F.antLen = 1.12; F.antN = 8; F.antLean = [0.05, -0.12];
      const antMat = new THREE.MeshStandardMaterial({ color: lin(0x2c2d29), flatShading: true, roughness: 0.8 });
      F.antenna = FK.chain(F.antN, () => G.cyl(0.0065, 0.0065, 1, 4), antMat);
      F.cordN = 10; F.cord = FK.chain(F.cordN, () => G.cyl(0.007, 0.007, 1, 4), antMat);
      F.cordFrom = V(-0.11, 0.95, -0.15).sub(sk.bind.chest);
      const hb = new FK.Builder(sk, { faceColor: true });
      hb.add('chest', G.box(0.035, 0.17, 0.03), J(C.handset, 0.05));
      hb.add('chest', G.cyl(0.026, 0.026, 0.02, 6).rotateX(Math.PI / 2), J(C.handset, 0.05), M(0, 0.075, 0.018));
      hb.add('chest', G.cyl(0.024, 0.024, 0.02, 6).rotateX(Math.PI / 2), J(C.handset, 0.05), M(0, -0.07, 0.018));
      hb.add('chest', G.box(0.012, 0.03, 0.01), C.metal, M(-0.02, 0.0, 0.0));
      F.handset = new THREE.Mesh(FK.concat(hb.buckets.chest), mats.prop); F.handset.castShadow = true;
      F.handsetLen = 0.17;
      F.handsetLow = V(-0.11, 0.14, 0.17);
      F.handsetUp = V(-0.125, 0.41, 0.08);
      F.handsetQLow = new THREE.Euler(-1.2, 0, 0.5);
      F.handsetQUp = new THREE.Euler(0.15, 0.1, -0.3);
      F.strapL = V(0.21, -0.02, 0.07);
    }
    if (kind === 'captain') {
      const mb = new FK.Builder(sk, { faceColor: true });
      mb.add('chest', G.box(0.21, 0.004, 0.15, 4, 1, 3), (x, y, z, i) => (FK.noise(x * 30, 0, z * 30) > 0.55 ? C.mapInk : jit(C.map, i, 0.03)));
      F.map = new THREE.Mesh(FK.concat(mb.buckets.chest), mats.prop); F.map.castShadow = true;
      F.map.rotation.set(0.75, 0.25, 0);
      F.mapAt = V(0.04, 0.08, 0.23);
      F.mapOff = V(-0.06, 0.05, 0.035);
      F.restR = V(-0.24, -0.12, 0.03);
      F.reach = 0.48; F.shY = S.shY - S.waist;
    }
    const asm = FK.assemble(bld, { body: mats.body, shade: (y) => 0.82 + 0.18 * FK.smooth(y / 1.0) });
    F.asm = asm;
    for (const k of ['antenna', 'cord', 'handset', 'map']) if (F[k]) asm.j.chest.add(F[k]);
    return F;
  }

  function grass(c, out, rnd) {
    const n = c.tall ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const h = c.h * (0.65 + rnd() * 0.45);
      const g = FK.blade({ h, w: c.tall ? 0.05 : 0.04, t: 0.0, bend: 0.25 + rnd() * 0.5, segs: 3, sides: 2, tip: 0.0 });
      const a = rnd() * TAU, off = rnd() * 0.1;
      g.applyMatrix4(M(c.x + Math.cos(a) * off, c.y - 0.02, c.z + Math.sin(a) * off, 0, a, -0.1 - rnd() * 0.3));
      const tint = rnd();
      FK.paint(g, (x, y, z, hh, i) => jit(hh > 0.62 ? (tint > 0.45 ? 0xc8b86a : 0xa4ae58) : hh > 0.3 ? 0x8aa04c : 0x6f8a3f, i + Math.floor(tint * 50), 0.06), true);
      out.push(g);
    }
  }

  window.STYLES.c = {
    key: 'c', letter: 'Direction C', name: 'Refined low-poly', outline: false,
    blurb: 'faceted, flat-shaded · head 1/5.5 · modelled kit',
    materials, build, grass,
    groundColor(x, z) {
      const n = FK.noise(x * 1.5 + 2, 0, z * 1.5), path = Math.abs(x * 0.4 + z * 0.9 - 0.2) < 0.3 && z > -1.2;
      const h = FK.hash(Math.round(x * 20), Math.round(z * 20), 7);
      if (path || n > 0.73) return h > 0.5 ? 0xa65f3a : 0x9a5634;
      return n < 0.38 ? (h > 0.5 ? 0x86994e : 0x7f924a) : (h > 0.5 ? 0x9aa458 : 0x929d53);
    },
    groundSide: (y) => (y > -0.15 ? 0x8a5133 : 0x683c26),
    groundRings: 11, groundSegs: 32, groundFaceted: true, groundJitter: 0.12,
  };
})();
