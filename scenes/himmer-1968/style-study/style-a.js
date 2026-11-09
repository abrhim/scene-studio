// Direction A: soft clay toy. Smooth rounded forms (capsules, spheres, bevelled boxes), a big head (about 1/4.5 of the
// height), soft matte shading with a gentle warm rim light, like a stop-motion puppet.
(function () {
  'use strict';
  const FK = window.FK, G = FK.G, M = FK.M, V = FK.V, lin = FK.lin, TAU = Math.PI * 2;
  window.STYLES = window.STYLES || {};

  const C = {
    util: 0x6f7446, utilDark: 0x5c6139, utilCapt: 0x66703f, flak: 0x5d6439, flakDark: 0x4d532f, web: 0x737049, webDark: 0x5f5b3e,
    canteen: 0x716d48, cover: 0x7d8b4b, coverDark: 0x4d5e2e, coverBrown: 0x77663f, coverLight: 0x97a25c, band: 0x4c4a33,
    leather: 0x352f2a, canvas: 0x606643, sole: 0x2a2623, rifle: 0x34352f, rifleMetal: 0x3e403b, radio: 0x58623c, radioDark: 0x464f30,
    handset: 0x2e2e2b, eye: 0x22180f, white: 0xfbf6ea, holster: 0x5c3e28, map: 0xe9ddb9, mapInk: 0x8a9a5e,
  };
  const KINDS = {
    rifleman: { skin: 0xe2ad86, skinDark: 0xc98f6c, nose: 0xd89e78, brow: 0x5a3c26, hair: 0x5a3c26, rolled: true, util: C.util },
    captain: { skin: 0xebbb96, skinDark: 0xd39d7a, nose: 0xe0aa86, brow: 0x7a5434, hair: 0x7a5434, rolled: false, util: C.utilCapt },
    radioman: { skin: 0x8e5b3c, skinDark: 0x75472e, nose: 0x83523a, brow: 0x22160e, hair: 0x22160e, rolled: true, util: C.util },
  };
  const S = { ankle: 0.07, knee: 0.36, hip: 0.66, hipW: 0.1, waist: 0.8, shY: 1.17, shW: 0.235, elbow: 0.95, wrist: 0.74, neck: 1.27, eyeY: 1.45, eyeZ: 0.15 };
  const HC = V(0, 1.47, 0.0), HR = [0.19, 0.2, 0.18];

  function camo(x, y, z) {
    const n = FK.noise(x * 13 + 3, y * 13, z * 13), n2 = FK.noise(x * 9 - 7, y * 9 + 2, z * 9 + 5);
    if (n > 0.64) return C.coverDark;
    if (n2 > 0.7) return C.coverBrown;
    if (n < 0.26) return C.coverLight;
    return C.cover;
  }

  // rounded boxes: at most two rings of rounding (the triangle budget)
  G.rboxA = (w, h, d, r, seg) => G.rbox(w, h, d, r, Math.max(w, h, d) > 0.25 || r > 0.035 ? 2 : 1);
  function materials() {
    const body = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
    const rim = { value: lin(0xffe9c8) };
    body.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = rim;
      sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <output_fragment>',
        'float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);\n' +
        'outgoingLight += uRim * pow(rimF, 2.6) * 0.32 * (0.55 + diffuseColor.rgb * 0.9);\n' +
        'outgoingLight = mix(outgoingLight, outgoingLight * vec3(1.04, 0.99, 0.94), 0.5);\n#include <output_fragment>');
    };
    body.customProgramCacheKey = () => 'clay';
    const grass = FK.sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), 'clay');
    const ground = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    return { body, grass, ground, prop: body };
  }

  // a flattened rounded strip between two points (straps, suspenders)
  const strap = (a, b, w, t) => FK.along((L) => G.rbox(w, L + t, t, t * 0.48, 1).translate(0, L / 2, 0), V(...a), V(...b));
  const cap = (a, b, r1, r2, seg = 10) => FK.along((L) => G.capsule(r1, r2, L + r1 + r2, seg, 2).translate(0, -r1, 0), V(...a), V(...b));

  function rifle(bld, frame, sc) {
    const m = frame.m.clone().multiply(new THREE.Matrix4().makeScale(sc, sc, sc)), add = (g, c) => bld.add('chest', g, c, m);
    const stock = G.rboxA(0.27, 0.075, 0.04, 0.018, 2), p = stock.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (0.135 - p.getX(i)) / 0.27; p.setY(i, p.getY(i) * (0.85 + 0.65 * k) - 0.012 * k); }
    add(stock.translate(-0.195, -0.008, 0), C.rifle);
    add(G.rboxA(0.17, 0.06, 0.036, 0.014, 2).translate(0.02, 0, 0), C.rifle);
    add(G.rboxA(0.21, 0.036, 0.032, 0.012, 2).translate(0.045, 0.045, 0), C.rifleMetal);
    add(G.rboxA(0.15, 0.022, 0.022, 0.009, 2).translate(0.035, 0.105, 0), C.rifle);
    add(G.rboxA(0.022, 0.05, 0.02, 0.008, 2).translate(-0.03, 0.08, 0), C.rifle);
    add(G.rboxA(0.022, 0.04, 0.02, 0.008, 2).translate(0.1, 0.08, 0), C.rifle);
    add(G.rboxA(0.035, 0.1, 0.03, 0.013, 2).applyMatrix4(M(-0.04, -0.06, 0, 0, 0, 0.38)), C.rifle);
    add(G.rboxA(0.055, 0.12, 0.026, 0.01, 2).applyMatrix4(M(0.06, -0.08, 0, 0, 0, -0.08)), C.rifleMetal);
    add(G.capsule(0.027, 0.023, 0.29, 8, 2).applyMatrix4(M(0.12, 0.02, 0, 0, 0, -Math.PI / 2)), C.rifle);
    add(G.cyl(0.009, 0.009, 0.16, 8).applyMatrix4(M(0.47, 0.02, 0, 0, 0, Math.PI / 2)), C.rifleMetal);
    add(G.rboxA(0.016, 0.06, 0.014, 0.006, 1).translate(0.4, 0.06, 0), C.rifle);
    add(G.capsule(0.013, 0.013, 0.06, 8, 2).applyMatrix4(M(0.54, 0.02, 0, 0, 0, -Math.PI / 2)), C.rifleMetal);
  }

  function build(kind, mats) {
    const K = KINDS[kind], sk = FK.skeleton(S), bld = new FK.Builder(sk);
    const util = K.util;
    // ---- head ----
    bld.add('head', G.sph(HR[0], HR[1], HR[2], 18, 13), K.skin, M(HC.x, HC.y, HC.z));
    for (const sx of [-1, 1]) {
      bld.add('head', G.sph(0.032, 0.048, 0.028, 8, 6), K.skinDark, M(sx * 0.182, 1.43, -0.005, 0, sx * 0.3, 0));
      // sideburns / short crop under the helmet
      bld.add('head', G.sph(0.06, 0.08, 0.11, 8, 6), K.hair, M(sx * 0.148, 1.49, -0.06, 0, 0, sx * 0.12));
      // brows: small clay rolls, a little serious
      bld.add('head', cap([sx * 0.042, 1.497, 0.172], [sx * 0.11, 1.486, 0.156], 0.011, 0.009, 6), K.brow, null, { noline: true });
      // eyes: glossy dark ovals with a highlight
      bld.add('eyes', G.sph(0.021, 0.029, 0.014, 10, 6), C.eye, M(sx * 0.074, 1.445, 0.163, 0, sx * 0.42, 0));
      bld.add('eyes', G.sph(0.0055, 0.0055, 0.004, 6, 4), C.white, M(sx * 0.074 - 0.006, 1.455, 0.176, 0, sx * 0.42, 0));
    }
    bld.add('head', G.sph(0.022, 0.024, 0.02, 10, 8), K.nose, M(0, 1.41, 0.181));
    bld.add('head', cap([-0.026, 1.352, 0.163], [0.026, 1.352, 0.163], 0.0065, 0.0065, 6), K.skinDark, null, { noline: true });
    // helmet: a soft dome with a rolled brim, the leaf side of the cover out, an elastic band
    const helm = M(0, 1.525, -0.015, -0.17, 0, 0);
    bld.add('head', G.lathe([[0.001, 0.19], [0.1, 0.178], [0.175, 0.14], [0.228, 0.075], [0.246, 0.02], [0.252, -0.005], [0.272, -0.03], [0.284, -0.046], [0.27, -0.058], [0.244, -0.044]], 18), camo, helm.clone().multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 1.06)));
    bld.add('head', G.lathe([[0.244, 0.042], [0.25, 0.037], [0.252, 0.017], [0.248, 0.012]], 18), C.band, helm.clone().multiply(M(0, 0, 0, 0, 0, 0, 1, 1, 1.06)));
    // ---- body ----
    bld.add('chest', cap([0, 1.2, -0.01], [0, 1.33, 0.0], 0.062, 0.06), K.skin);
    const flak = G.lathe([[0.001, 0.79], [0.16, 0.79], [0.188, 0.81], [0.205, 0.92], [0.212, 1.04], [0.205, 1.13], [0.17, 1.22], [0.1, 1.27], [0.001, 1.27]], 18);
    bld.add('chest', flak, (x, y, z) => (Math.abs(x) < 0.008 && z > 0 ? C.flakDark : C.flak), M(0, 0, 0, 0, 0, 0, 1, 1, 0.8));
    const collar = G.torus(0.115, 0.042, 6, 16, TAU * 0.8).rotateZ(-0.3 * Math.PI - Math.PI * 0.1 + Math.PI * 0.2 - 0.5 * Math.PI * 0.6).rotateX(-Math.PI / 2);
    bld.add('chest', collar, C.flak, M(0, 1.245, -0.01, 0.1, 0, 0, 1, 1, 0.9));
    bld.add('chest', cap([0, 0.84, 0.163], [0, 1.18, 0.15], 0.009, 0.009, 6), C.flakDark);
    for (const sx of [-1, 1]) bld.add('chest', G.rboxA(0.1, 0.085, 0.04, 0.02, 2), C.flakDark, M(sx * 0.1, 0.87, 0.15, 0, sx * 0.35, 0));
    // suspenders over the flak jacket, and a first-aid pouch on the left one
    for (const sx of [-1, 1]) {
      bld.add('chest', strap([sx * 0.1, 0.83, 0.168], [sx * 0.115, 1.19, 0.12], 0.045, 0.014), C.web);
      bld.add('chest', strap([sx * 0.115, 1.2, 0.1], [sx * 0.11, 1.17, -0.15], 0.045, 0.014), C.web);
    }
    if (kind !== 'radioman') bld.add('chest', G.rboxA(0.07, 0.085, 0.04, 0.018, 2), C.web, M(0.11, 1.08, 0.165, -0.1, 0.25, 0));
    // pelvis: seat and belt, pouches, canteens
    bld.add('pelvis', G.lathe([[0.001, 0.58], [0.12, 0.6], [0.172, 0.67], [0.18, 0.77], [0.17, 0.84], [0.001, 0.85]], 18), util, M(0, 0, 0, 0, 0, 0, 1, 1, 0.82));
    bld.add('pelvis', G.lathe([[0.19, 0.745], [0.2, 0.765], [0.2, 0.805], [0.19, 0.825]], 20), C.web, M(0, 0, 0, 0, 0, 0, 1, 1, 0.84));
    bld.add('pelvis', G.rboxA(0.05, 0.05, 0.02, 0.008, 2), C.rifleMetal, M(0, 0.785, 0.168));
    for (const sx of [-1, 1]) {
      if (kind !== 'captain' || sx > 0) bld.add('pelvis', G.rboxA(0.085, 0.1, 0.06, 0.022, 2), C.web, M(sx * 0.11, 0.765, 0.16, 0, sx * 0.45, 0));
      bld.add('pelvis', G.capsule(0.06, 0.06, 0.16, 8, 2), C.canteen, M(sx * 0.15, 0.66, -0.12, 0.05, 0, sx * 0.1));
      bld.add('pelvis', G.cyl(0.022, 0.022, 0.02, 8), C.rifle, M(sx * 0.152, 0.83, -0.12));
    }
    if (kind === 'captain') {
      bld.add('pelvis', G.rboxA(0.07, 0.15, 0.05, 0.022, 2), C.holster, M(-0.2, 0.68, 0.04, 0, 0, -0.08));
      bld.add('pelvis', G.rboxA(0.045, 0.05, 0.035, 0.012, 2), C.rifle, M(-0.2, 0.775, 0.025, 0.2, 0, 0));
    }
    // ---- legs ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      bld.add('th' + s, cap([sx * S.hipW, S.hip + 0.04, 0], [sx * S.hipW, S.knee, 0.01], 0.09, 0.08), util);
      bld.add('sh' + s, cap([sx * S.hipW, S.knee, 0.01], [sx * S.hipW, 0.16, 0], 0.078, 0.07), util);
      bld.add('sh' + s, G.sph(0.083, 0.06, 0.083, 10, 6), util, M(sx * S.hipW, 0.2, 0.005));
      bld.add('sh' + s, G.capsule(0.066, 0.066, 0.17, 10, 2), C.canvas, M(sx * S.hipW, 0.04, 0.0));
      bld.add('sh' + s, G.rboxA(0.125, 0.11, 0.23, 0.05, 3), C.leather, M(sx * S.hipW, 0.06, 0.04));
      bld.add('sh' + s, G.rboxA(0.13, 0.03, 0.235, 0.014, 2), C.sole, M(sx * S.hipW, 0.016, 0.04));
    }
    // ---- arms ----
    for (const [sx, s] of [[1, 'L'], [-1, 'R']]) {
      const sh = sk.bind['ua' + s], el = sk.bind['fa' + s], wr = sk.wrist[s];
      bld.add('ua' + s, G.sph(0.078, 0.075, 0.078, 10, 7), util, M(sh.x - sx * 0.015, sh.y - 0.01, sh.z));
      if (K.rolled) {
        bld.add('ua' + s, cap([sh.x, sh.y, sh.z], [el.x, el.y + 0.07, el.z], 0.072, 0.066), util);
        bld.add('ua' + s, G.torus(0.064, 0.024, 6, 14).rotateX(Math.PI / 2), C.utilDark, M(el.x, el.y + 0.07, el.z));
        bld.add('fa' + s, cap([el.x, el.y + 0.05, el.z], [wr.x, wr.y, wr.z], 0.054, 0.046), K.skin);
      } else {
        bld.add('ua' + s, cap([sh.x, sh.y, sh.z], [el.x, el.y, el.z], 0.072, 0.064), util);
        bld.add('fa' + s, cap([el.x, el.y, el.z], [wr.x, wr.y + 0.02, wr.z], 0.062, 0.054), util);
        bld.add('fa' + s, G.torus(0.05, 0.016, 6, 14).rotateX(Math.PI / 2), C.utilDark, M(wr.x, wr.y + 0.035, wr.z));
      }
      // a mitten hand with a thumb
      bld.add('fa' + s, G.sph(0.043, 0.054, 0.037, 10, 7), K.skin, M(wr.x, wr.y - 0.045, wr.z + 0.005));
      bld.add('fa' + s, cap([wr.x, wr.y - 0.02, wr.z + 0.027], [wr.x - sx * 0.008, wr.y - 0.058, wr.z + 0.04], 0.016, 0.014, 8), K.skin);
    }
    const F = { kind };
    if (kind === 'rifleman') {
      const fr = FK.rifleFrame([-0.13, 0.83, 0.25], 0.26, 0.85, [0.8, 0.45]);
      rifle(bld, fr, 0.85);
      F.rifle = { R: fr.R.clone().add(V(0, -0.01, -0.02)), L: fr.L.clone().add(V(0.0, -0.035, -0.03)) };
    }
    if (kind === 'radioman') {
      const bx = M(0, 1.0, -0.25);
      bld.add('chest', G.rboxA(0.28, 0.26, 0.13, 0.04, 3), C.radio, bx);
      bld.add('chest', G.rboxA(0.27, 0.13, 0.125, 0.035, 3), C.radioDark, M(0, 0.82, -0.25));
      bld.add('chest', G.cyl(0.022, 0.022, 0.03, 12), C.rifle, M(-0.07, 1.14, -0.25));
      bld.add('chest', G.cyl(0.018, 0.018, 0.03, 12), C.rifle, M(0.0, 1.14, -0.25));
      bld.add('chest', G.cyl(0.016, 0.02, 0.05, 10), C.rifle, M(0.1, 1.15, -0.24));
      for (const sx of [-1, 1]) {
        bld.add('chest', strap([sx * 0.1, 1.12, -0.19], [sx * 0.12, 1.21, 0.0], 0.05, 0.016), C.webDark);
        bld.add('chest', strap([sx * 0.12, 1.2, 0.04], [sx * 0.12, 0.88, 0.175], 0.05, 0.016), C.webDark);
      }
      F.antBase = V(0.1, 1.17, -0.24).sub(sk.bind.chest);
      F.antLen = 1.05; F.antN = 10; F.antLean = [0.05, -0.12];
      const antMat = new THREE.MeshStandardMaterial({ color: lin(0x2e2f2a), roughness: 0.7 });
      F.antenna = FK.chain(F.antN, () => G.cyl(0.0075, 0.0075, 1, 6).translate(0, 0, 0), antMat);
      F.cordN = 14; F.cord = FK.chain(F.cordN, () => G.cyl(0.008, 0.008, 1, 6), antMat);
      F.cordFrom = V(-0.13, 0.86, -0.2).sub(sk.bind.chest);
      // the handset: a rounded bar with an earpiece and a mouthpiece
      const hb = new FK.Builder(sk);
      hb.add('chest', G.rboxA(0.045, 0.19, 0.04, 0.018, 3), C.handset);
      hb.add('chest', G.sph(0.033, 0.024, 0.033, 12, 8), C.handset, M(0, 0.085, 0.022));
      hb.add('chest', G.sph(0.03, 0.022, 0.03, 12, 8), C.handset, M(0, -0.08, 0.022));
      F.handset = new THREE.Mesh(FK.concat(hb.buckets.chest), mats.prop); F.handset.castShadow = true;
      F.handsetLen = 0.19;
      F.handsetLow = V(-0.12, 0.08, 0.2);
      F.handsetUp = V(-0.17, 0.5, 0.07);
      F.handsetQLow = new THREE.Euler(-1.2, 0, 0.5);
      F.handsetQUp = new THREE.Euler(0.15, 0.1, -0.3);
      F.strapL = V(0.25, 0.0, 0.1);
    }
    if (kind === 'captain') {
      const mb = new FK.Builder(sk);
      mb.add('chest', G.rboxA(0.2, 0.006, 0.15, 0.003, 1), (x, y, z) => (FK.noise(x * 30, 0, z * 30) > 0.55 ? C.mapInk : C.map));
      F.map = new THREE.Mesh(FK.concat(mb.buckets.chest), mats.prop); F.map.castShadow = true;
      F.map.rotation.set(0.7, 0.25, 0);
      F.mapAt = V(0.04, 0.02, 0.24);
      F.mapOff = V(-0.06, 0.04, 0.03);
      F.restR = V(-0.27, -0.21, 0.04);
      F.reach = 0.42; F.shY = S.shY - S.waist;
    }
    const asm = FK.assemble(bld, { body: mats.body, shade: (y) => 0.8 + 0.2 * FK.smooth(y / 0.9) });
    F.asm = asm;
    for (const k of ['antenna', 'cord', 'handset', 'map']) if (F[k]) asm.j.chest.add(F[k]);
    return F;
  }

  function grass(c, out, rnd) {
    const n = c.tall ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const h = c.h * (0.65 + rnd() * 0.45);
      const g = FK.blade({ h, w: c.tall ? 0.075 : 0.055, t: 0.02, bend: 0.2 + rnd() * 0.4, segs: 6, sides: 6, tip: 0.85, smooth: true });
      const a = rnd() * TAU, off = rnd() * 0.12;
      g.applyMatrix4(M(c.x + Math.cos(a) * off, c.y - 0.02, c.z + Math.sin(a) * off, 0, a, -0.1 - rnd() * 0.25));
      const tint = rnd();
      FK.paint(g, (x, y, z, hh) => (hh > 0.72 ? (tint > 0.5 ? 0xc9bb72 : 0xb8b468) : hh > 0.35 ? (tint > 0.6 ? 0x9aa45a : 0x8a9c50) : 0x6c8440));
      out.push(g);
    }
  }

  window.STYLES.a = {
    key: 'a', letter: 'Direction A', name: 'Soft clay toy', outline: false,
    blurb: 'rounded forms · head 1/4.5 · matte with a warm rim',
    materials, build, grass,
    groundColor(x, z) {
      const n = FK.noise(x * 1.3 + 4, 0, z * 1.3), path = Math.abs(x * 0.4 + z * 0.9 - 0.2) < 0.32 && z > -1.2;
      if (path || n > 0.72) return 0xa8683f;
      return n < 0.35 ? 0x8d9c55 : n < 0.55 ? 0x9aa45c : 0xaaa462;
    },
    groundSide: (y) => (y > -0.15 ? 0x8a5434 : 0x6a3f28),
    groundRings: 16, groundSegs: 56,
  };
})();
