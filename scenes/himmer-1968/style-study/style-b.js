// Direction B: cel-shaded with ink outlines. MeshToonMaterial with a three-band gradient, an inverted-hull outline,
// natural proportions (head about 1/6 of the height), crisp light and shadow bands, like a hand-drawn adventure film.
(function () {
  'use strict';
  const FK = window.FK, G = FK.G, M = FK.M, V = FK.V, lin = FK.lin, TAU = Math.PI * 2;
  window.STYLES = window.STYLES || {};

  const C = {
    util: 0x6c7343, utilDark: 0x535a32, utilCapt: 0x627040, flak: 0x5a6238, flakDark: 0x454b2a, web: 0x77734a, webDark: 0x5c5a3b,
    canteen: 0x6a6745, cover: 0x7c8c48, coverDark: 0x45552a, coverBrown: 0x7a6640, coverLight: 0x9aa75c, band: 0x44432f,
    leather: 0x2f2a25, canvas: 0x5e6541, sole: 0x24211e, rifle: 0x2e2f2b, rifleMetal: 0x3a3c37, radio: 0x56613a, radioDark: 0x434c2e,
    handset: 0x2b2b28, eye: 0x1f160f, white: 0xf7f0e0, holster: 0x5a3c26, map: 0xeee2bf, mapInk: 0x8d9c60, lips: 0x9c6650,
  };
  const KINDS = {
    rifleman: { skin: 0xd59b74, skinDark: 0xb87f5c, brow: 0x4e3420, hair: 0x4e3420, rolled: true, util: C.util },
    captain: { skin: 0xdca782, skinDark: 0xc18c69, brow: 0x6e4c30, hair: 0x6e4c30, rolled: false, util: C.utilCapt },
    radioman: { skin: 0x8a5739, skinDark: 0x6f432b, brow: 0x1f140c, hair: 0x1f140c, rolled: true, util: C.util },
  };
  const S = { ankle: 0.08, knee: 0.5, hip: 0.92, hipW: 0.092, waist: 1.0, shY: 1.435, shW: 0.19, elbow: 1.14, wrist: 0.885, neck: 1.47, eyeY: 1.618, eyeZ: 0.094 };
  const HC = V(0, 1.6, 0.004);

  function camo(x, y, z) {
    const n = FK.noise(x * 22 + 3, y * 22, z * 22), n2 = FK.noise(x * 15 - 7, y * 15 + 2, z * 15 + 5);
    if (n > 0.62) return C.coverDark;
    if (n2 > 0.68) return C.coverBrown;
    if (n < 0.3) return C.coverLight;
    return C.cover;
  }

  let gradient = null;
  function toonGradient() {
    if (gradient) return gradient;
    gradient = new THREE.DataTexture(new Uint8Array([52, 52, 52, 128, 128, 128, 255, 255, 255]), 3, 1, THREE.RGBFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
    return gradient;
  }
  // the ink: an inverted hull pushed out along smoothed normals, about the same width on screen near or far
  function inkMaterial(sway) {
    return new THREE.ShaderMaterial({
      uniforms: { uW: { value: sway ? 0.0011 : 0.0021 }, uC: { value: new THREE.Color(sway ? 0x3d4a22 : 0x2a2317) }, uTime: FK.time },
      vertexShader: [
        'uniform float uW; uniform float uTime;',
        sway ? 'attribute float aH;' : '',
        'void main() {',
        '  vec3 transformed = position;',
        sway ? FK.SWAY_GLSL : '',
        '  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);',
        '  vec3 n = normalize(normalMatrix * normal);',
        '  mv.xyz += n * uW * clamp(-mv.z, 0.6, 60.0);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: 'uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0); }',
      side: THREE.BackSide,
    });
  }

  function materials() {
    const body = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
    const ink = inkMaterial(false), inkSway = inkMaterial(true);
    const outline = (g) => { const m = new THREE.Mesh(FK.smoothNormals(g), ink); m.castShadow = false; return m; };
    const grass = FK.sway(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() }), 'toon');
    const grassOutline = (g) => {
      const o = FK.smoothNormals(g);
      o.setAttribute('aH', g.attributes.aH);
      const m = new THREE.Mesh(o, inkSway); m.castShadow = false; return m;
    };
    const ground = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
    return { body, outline, grass, grassOutline, ground, prop: body };
  }

  // tapered limb along a bone: a lathe with domed ends
  const limb = (a, b, r1, r2, seg = 10) => FK.along((L) => {
    const pts = [[0.001, -r1 * 0.6], [r1 * 0.7, -r1 * 0.45], [r1, 0], [r1 + (r2 - r1) * 0.5, L * 0.5], [r2, L], [r2 * 0.7, L + r2 * 0.45], [0.001, L + r2 * 0.6]];
    return G.lathe(pts, seg);
  }, V(...a), V(...b));
  const strap = (a, b, w, t) => FK.along((L) => G.box(w, L, t).translate(0, L / 2, 0), V(...a), V(...b));

  function rifle(bld, frame) {
    const add = (g, c) => bld.add('chest', g, c, frame.m);
    const stock = G.box(0.25, 0.07, 0.036), p = stock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (0.125 - p.getX(i)) / 0.25; p.setY(i, p.getY(i) * (0.8 + 0.75 * k) - 0.014 * k); }
    add(stock.translate(-0.205, -0.01, 0), C.rifle);
    add(G.box(0.17, 0.055, 0.032).translate(0.015, 0, 0), C.rifle);
    add(G.box(0.2, 0.034, 0.03).translate(0.04, 0.042, 0), C.rifleMetal);
    add(G.box(0.14, 0.016, 0.016).translate(0.03, 0.1, 0), C.rifle);
    add(G.box(0.03, 0.05, 0.016).translate(-0.035, 0.078, 0), C.rifle);
    add(G.box(0.02, 0.04, 0.016).translate(0.095, 0.075, 0), C.rifle);
    add(G.box(0.032, 0.095, 0.028).applyMatrix4(M(-0.045, -0.06, 0, 0, 0, 0.38)), C.rifle);
    add(G.box(0.05, 0.13, 0.024).applyMatrix4(M(0.055, -0.085, 0, 0, 0, -0.06)), C.rifleMetal);
    add(G.cyl(0.026, 0.024, 0.3, 6).applyMatrix4(M(0.27, 0.025, 0, 0, 0, -Math.PI / 2)), C.rifle);
    add(G.cyl(0.008, 0.008, 0.16, 6).applyMatrix4(M(0.49, 0.025, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
    add(G.box(0.014, 0.065, 0.012).translate(0.43, 0.062, 0), C.rifle);
    add(G.cyl(0.012, 0.012, 0.06, 6).applyMatrix4(M(0.59, 0.025, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
  }

  function build(kind, mats) {
    const K = KINDS[kind], sk = FK.skeleton(S), bld = new FK.Builder(sk), util = K.util;
    // ---- head: a longer skull, a jaw, a nose, shaped eyes, brows and a mouth line ----
    bld.add('head', G.sph(0.088, 0.115, 0.102, 22, 16), K.skin, M(HC.x, HC.y + 0.01, HC.z));
    bld.add('head', G.sph(0.072, 0.065, 0.078, 16, 10), K.skin, M(0, 1.535, 0.022));
    bld.add('head', G.cone(0.02, 0.05, 4).rotateX(Math.PI / 2 + 0.5).rotateZ(Math.PI / 4), K.skinDark, M(0, 1.592, 0.103, 0, 0, 0, 1, 1, 0.85));
    bld.add('head', G.box(0.03, 0.005, 0.006), K.skinDark, M(0, 1.545, 0.1), { noline: true });
    for (const sx of [-1, 1]) {
      bld.add('head', G.sph(0.02, 0.03, 0.014, 8, 6), K.skinDark, M(sx * 0.088, 1.6, -0.005, 0, sx * 0.3, 0));
      bld.add('head', G.sph(0.03, 0.045, 0.06, 8, 6), K.hair, M(sx * 0.074, 1.635, -0.035));
      bld.add('head', G.box(0.038, 0.009, 0.008), K.brow, M(sx * 0.037, 1.646, 0.099, 0, sx * 0.25, sx * 0.08), { noline: true });
      bld.add('eyes', G.sph(0.011, 0.016, 0.006, 10, 6), C.eye, M(sx * 0.036, 1.62, 0.095, 0, sx * 0.3, 0));
      bld.add('eyes', G.sph(0.0035, 0.0035, 0.002, 4, 3), C.white, M(sx * 0.036 - 0.0035, 1.626, 0.1005, 0, sx * 0.3, 0));
    }
    // the M1 helmet: a true profile (low dome, flared skirt), the cover's leaf side out, an elastic band
    const helm = M(0, 1.682, -0.016, -0.22, 0, 0, 1, 1, 1.07);
    bld.add('head', G.lathe([[0.001, 0.12], [0.06, 0.114], [0.1, 0.094], [0.124, 0.06], [0.133, 0.02], [0.136, -0.015], [0.148, -0.04], [0.156, -0.052], [0.148, -0.058], [0.13, -0.045]], 30), camo, helm, { faceColor: true });
    bld.add('head', G.lathe([[0.126, 0.035], [0.13, 0.034], [0.135, 0.012], [0.133, 0.008]], 30), C.band, helm);
    // ---- body ----
    bld.add('chest', limb([0, 1.43, -0.008], [0, 1.53, 0.0], 0.044, 0.04, 10), K.skin);
    const flak = G.lathe([[0.001, 0.98], [0.138, 0.98], [0.15, 1.0], [0.158, 1.12], [0.165, 1.25], [0.16, 1.36], [0.13, 1.44], [0.08, 1.475], [0.001, 1.475]], 18);
    bld.add('chest', flak, (x, y, z) => (Math.abs(x) < 0.006 && z > 0 ? C.flakDark : C.flak), M(0, 0, 0, 0, 0, 0, 1, 1, 0.74));
    bld.add('chest', G.lathe([[0.072, 1.5], [0.088, 1.495], [0.096, 1.46], [0.09, 1.445]], 16, 0.35, TAU - 0.7), C.flak, M(0, 0, -0.008, 0, 0, 0, 1, 1, 0.86));
    for (const sx of [-1, 1]) {
      bld.add('chest', G.box(0.085, 0.07, 0.025), C.flakDark, M(sx * 0.078, 1.05, 0.108, 0, sx * 0.3, 0));
      bld.add('chest', G.box(0.088, 0.02, 0.028), C.flak, M(sx * 0.078, 1.088, 0.11, 0, sx * 0.3, 0));
      bld.add('chest', strap([sx * 0.075, 0.99, 0.118], [sx * 0.088, 1.42, 0.08], 0.034, 0.012), C.web);
      bld.add('chest', strap([sx * 0.088, 1.43, 0.07], [sx * 0.085, 1.4, -0.11], 0.034, 0.012), C.web);
    }
    if (kind !== 'radioman') bld.add('chest', G.box(0.05, 0.065, 0.03), C.web, M(0.088, 1.28, 0.115, -0.15, 0.2, 0));
    // pelvis: trousers seat, the belt and its pouches, canteens behind
    bld.add('pelvis', G.lathe([[0.001, 0.86], [0.1, 0.87], [0.135, 0.92], [0.142, 1.0], [0.135, 1.03], [0.001, 1.04]], 16), util, M(0, 0, 0, 0, 0, 0, 1, 1, 0.78));
    bld.add('pelvis', G.lathe([[0.146, 0.955], [0.152, 0.96], [0.152, 1.0], [0.146, 1.005]], 18), C.web, M(0, 0, 0, 0, 0, 0, 1, 1, 0.8));
    bld.add('pelvis', G.box(0.04, 0.04, 0.012), C.rifleMetal, M(0, 0.978, 0.122));
    for (const sx of [-1, 1]) {
      if (kind !== 'captain' || sx > 0) bld.add('pelvis', G.box(0.07, 0.085, 0.045), C.web, M(sx * 0.088, 0.955, 0.113, 0, sx * 0.4, 0));
      bld.add('pelvis', G.cyl(0.045, 0.045, 0.13, 10), C.canteen, M(sx * 0.115, 0.9, -0.1, 0.05, 0, sx * 0.08));
      bld.add('pelvis', G.cyl(0.016, 0.016, 0.02, 6), C.rifle, M(sx * 0.117, 0.975, -0.1));
    }
    if (kind === 'captain') {
      bld.add('pelvis', G.box(0.055, 0.15, 0.04), C.holster, M(-0.155, 0.88, 0.02, 0, 0, -0.08));
      bld.add('pelvis', G.box(0.035, 0.05, 0.03), C.rifle, M(-0.158, 0.975, 0.008, 0.2, 0, 0));
      bld.add('pelvis', G.box(0.05, 0.05, 0.035), C.web, M(0.1, 0.955, 0.1, 0, 0.4, 0));
    }
    // ---- legs ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      bld.add('th' + s, limb([sx * S.hipW, S.hip + 0.04, 0], [sx * S.hipW, S.knee, 0.012], 0.072, 0.055), util);
      bld.add('th' + s, G.box(0.03, 0.12, 0.08), util, M(sx * (S.hipW + 0.062), 0.72, 0.01, 0, 0, sx * 0.04));
      bld.add('sh' + s, limb([sx * S.hipW, S.knee, 0.012], [sx * S.hipW, 0.24, 0], 0.054, 0.045), util);
      bld.add('sh' + s, G.sph(0.058, 0.045, 0.058, 10, 6), util, M(sx * S.hipW, 0.235, 0.003));
      bld.add('sh' + s, G.cyl(0.044, 0.048, 0.17, 10), C.canvas, M(sx * S.hipW, 0.135, 0));
      const boot = G.rbox(0.09, 0.075, 0.24, 0.03, 1);
      bld.add('sh' + s, boot, C.leather, M(sx * S.hipW, 0.055, 0.035));
      bld.add('sh' + s, G.box(0.094, 0.022, 0.245), C.sole, M(sx * S.hipW, 0.013, 0.035));
    }
    // ---- arms ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      const sh = sk.bind['ua' + s], el = sk.bind['fa' + s], wr = sk.wrist[s];
      bld.add('ua' + s, G.sph(0.056, 0.055, 0.058, 10, 7), util, M(sh.x - sx * 0.008, sh.y - 0.012, sh.z));
      if (K.rolled) {
        bld.add('ua' + s, limb([sh.x, sh.y, sh.z], [el.x, el.y + 0.05, el.z], 0.05, 0.044), util);
        bld.add('ua' + s, G.cyl(0.05, 0.052, 0.04, 10), C.utilDark, M(el.x, el.y + 0.055, el.z));
        bld.add('fa' + s, limb([el.x, el.y + 0.04, el.z], [wr.x, wr.y, wr.z], 0.038, 0.028), K.skin);
      } else {
        bld.add('ua' + s, limb([sh.x, sh.y, sh.z], [el.x, el.y, el.z], 0.05, 0.043), util);
        bld.add('fa' + s, limb([el.x, el.y, el.z], [wr.x, wr.y + 0.015, wr.z], 0.043, 0.036), util);
        bld.add('fa' + s, G.cyl(0.039, 0.039, 0.025, 10), C.utilDark, M(wr.x, wr.y + 0.02, wr.z));
      }
      bld.add('fa' + s, G.rbox(0.035, 0.08, 0.045, 0.015, 1), K.skin, M(wr.x, wr.y - 0.04, wr.z + 0.006));
      bld.add('fa' + s, limb([wr.x, wr.y - 0.012, wr.z + 0.025], [wr.x - sx * 0.006, wr.y - 0.05, wr.z + 0.038], 0.012, 0.01, 6), K.skin);
    }
    const F = { kind };
    if (kind === 'rifleman') {
      const fr = FK.rifleFrame([-0.11, 1.0, 0.2], 0.24, 1.0, [0.8, 0.45]);
      rifle(bld, fr);
      F.rifle = { R: fr.R.clone().add(V(0, -0.01, -0.025)), L: fr.L.clone().add(V(0, -0.03, -0.03)) };
    }
    if (kind === 'radioman') {
      bld.add('chest', G.box(0.27, 0.27, 0.11), C.radio, M(0, 1.2, -0.19));
      bld.add('chest', G.box(0.265, 0.13, 0.105), C.radioDark, M(0, 1.0, -0.19));
      bld.add('chest', G.cyl(0.018, 0.018, 0.025, 8), C.rifle, M(-0.07, 1.345, -0.19));
      bld.add('chest', G.cyl(0.015, 0.015, 0.025, 8), C.rifle, M(0.0, 1.345, -0.19));
      bld.add('chest', G.cyl(0.013, 0.017, 0.045, 8), C.rifle, M(0.095, 1.355, -0.18));
      for (const sx of [-1, 1]) {
        bld.add('chest', strap([sx * 0.085, 1.33, -0.14], [sx * 0.09, 1.44, 0.0], 0.04, 0.012), C.webDark);
        bld.add('chest', strap([sx * 0.09, 1.43, 0.04], [sx * 0.085, 1.07, 0.12], 0.04, 0.012), C.webDark);
      }
      F.antBase = V(0.095, 1.37, -0.18).sub(sk.bind.chest);
      F.antLen = 1.15; F.antN = 10; F.antLean = [0.05, -0.12];
      const antMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a2317) });
      F.antenna = FK.chain(F.antN, () => G.cyl(0.006, 0.006, 1, 5), antMat);
      F.cordN = 14; F.cord = FK.chain(F.cordN, () => G.cyl(0.006, 0.006, 1, 5), antMat);
      F.cordFrom = V(-0.11, 1.0, -0.15).sub(sk.bind.chest);
      const hb = new FK.Builder(sk);
      hb.add('chest', G.box(0.035, 0.17, 0.03), C.handset);
      hb.add('chest', G.cyl(0.026, 0.026, 0.02, 10).rotateX(Math.PI / 2), C.handset, M(0, 0.075, 0.018));
      hb.add('chest', G.cyl(0.024, 0.024, 0.02, 10).rotateX(Math.PI / 2), C.handset, M(0, -0.07, 0.018));
      const hg = FK.concat(hb.buckets.chest);
      F.handset = new THREE.Group();
      const hm = new THREE.Mesh(hg, mats.prop); hm.castShadow = true;
      F.handset.add(hm, mats.outline(hg));
      F.handsetLen = 0.17;
      F.handsetLow = V(-0.11, 0.14, 0.17);
      F.handsetUp = V(-0.12, 0.45, 0.06);
      F.handsetQLow = new THREE.Euler(-1.2, 0, 0.5);
      F.handsetQUp = new THREE.Euler(0.15, 0.1, -0.3);
      F.strapL = V(0.2, -0.02, 0.07);
    }
    if (kind === 'captain') {
      const mb = new FK.Builder(sk);
      mb.add('chest', G.box(0.21, 0.004, 0.15), (x, y, z) => (FK.noise(x * 30, 0, z * 30) > 0.55 ? C.mapInk : C.map));
      const mg = FK.concat(mb.buckets.chest);
      F.map = new THREE.Group();
      const mm = new THREE.Mesh(mg, mats.prop); mm.castShadow = true;
      F.map.add(mm, mats.outline(mg));
      F.map.rotation.set(0.75, 0.25, 0);
      F.mapAt = V(0.04, 0.08, 0.23);
      F.mapOff = V(-0.06, 0.05, 0.035);
      F.restR = V(-0.23, -0.12, 0.03);
      F.reach = 0.5; F.shY = S.shY - S.waist;
    }
    const asm = FK.assemble(bld, { body: mats.body, outline: mats.outline, shade: (y) => 0.86 + 0.14 * FK.smooth(y / 1.0) });
    F.asm = asm;
    for (const k of ['antenna', 'cord', 'handset', 'map']) if (F[k]) asm.j.chest.add(F[k]);
    return F;
  }

  function grass(c, out, rnd) {
    const n = c.tall ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const h = c.h * (0.65 + rnd() * 0.45);
      const g = FK.blade({ h, w: c.tall ? 0.04 : 0.035, t: 0.01, bend: 0.3 + rnd() * 0.5, segs: 4, sides: 3, tip: 0.0, smooth: true });
      const a = rnd() * TAU, off = rnd() * 0.1;
      g.applyMatrix4(M(c.x + Math.cos(a) * off, c.y - 0.02, c.z + Math.sin(a) * off, 0, a, -0.1 - rnd() * 0.3));
      const tint = rnd();
      FK.paint(g, (x, y, z, hh) => (hh > 0.6 ? (tint > 0.45 ? 0xd2c06c : 0xa9b45a) : (tint > 0.5 ? 0x7f9a44 : 0x6e8c3e)));
      out.push(g);
    }
  }

  window.STYLES.b = {
    key: 'b', letter: 'Direction B', name: 'Cel and ink', outline: true,
    blurb: 'toon bands · ink hull · head 1/6',
    materials, build, grass,
    groundColor(x, z) {
      const n = FK.noise(x * 1.6 + 9, 0, z * 1.6), path = Math.abs(x * 0.4 + z * 0.9 - 0.2) < 0.3 && z > -1.2;
      if (path || n > 0.74) return 0xb0623a;
      return n < 0.4 ? 0x86a04c : 0x98a856;
    },
    groundSide: (y) => (y > -0.15 ? 0x8c5132 : 0x6a3c25),
    groundRings: 14, groundSegs: 48,
  };
})();
