// medevac.js: the helicopters (DESIGN.md 9, chapters 7 and 11), modelled from photographs in the studio's low-poly style.
// Chapter 7: two Marine medevacs at about 1805. The record does not name their type; they are shown as Sikorsky UH-34D
// Sea Horses, the Marine medium helicopter that flew emergency medevac to the Khe Sanh hill positions that spring
// (DY p. 461: HMM-363 "still retained the UH-34D"; Shauer note, DY p. 484). They come in from the east, settle on
// Company C's landing zone (the uphill wheels down: the slope is steep at 1/3 land), slide the cargo door open, load,
// close it, lift and fly off east, fading into the haze before the loop returns.
// Chapter 11: a Boeing Vertol CH-46A Sea Knight (named, DY p. 315; HMM-262 flew them, DY p. 461) hovers on the battle
// hill with its ramp down beside the spider holes, lifts after a few seconds, flies back to Hill 689 and lands hard,
// then winds its rotors down. Everything is a pure function of ctx.cycle.t in those chapters; hidden in every other.
// Draws: CH-46 5 (body, ramp, two rotors, rotor discs); each UH-34D 4 (body, door, rotor, discs); 8 at most at once.
//
// window.MEDEVAC (also ctx.medevac), updated each frame, nothing allocated:
//   aircraft: [{ type, pos, visible, rotorOn }] for all three (UH-34D, UH-34D, CH-46): land.js can flatten grass under them
//   ch46: { pos, ramp (0 closed - 1 down), visible, rampDown: [t0, t1] };  medevacs: [{ pos, visible }]
//   window.FIRE.ch46At(t) is set to the CH-46's position (fire.js aims the spider-hole fire at it); rotor-wash dust goes
//   in through FIRE.smoke when fire.js is loaded.
(function () {
  'use strict';
  window.Scene.register({
    name: 'medevac',
    init(ctx) {
      const { THREE, SITE } = ctx;
      const G = ctx.groundY;
      const W = window.WORKS || { lz: {} };
      const sm = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const V = (x, y, z) => new THREE.Vector3(x, y, z);

      // ---------- materials (own, so they fade; flat shading, vertex colours) ----------
      const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0, transparent: true }, o));
      const MAT = {
        b46: std({ side: THREE.DoubleSide }), bl46: std({}), d46: std({ side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
        b34: std({}), bl34: std({}), d34: std({ side: THREE.DoubleSide, depthWrite: false, roughness: 1 }),
      };
      const K = {
        od: 0x58623f, odDark: 0x48502f, belly: 0x434a2f, glass: 0x4d5d60, frame: 0x3e4530, black: 0x24261f, tyre: 0x2a2a26,
        metal: 0x6f7268, blade: 0x2e3029, tip: 0xb9b07a, letter: 0x1f211b, inside: 0x23251d, exhaust: 0x34312a, disc: 0x6c6c60, grille: 0x2d2f28,
      };
      const cc = new Map();
      const rgb = (hex) => { let c = cc.get(hex); if (!c) { const k = new THREE.Color(hex).convertSRGBToLinear(); c = [k.r, k.g, k.b]; cc.set(hex, c); } return c; };
      const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

      // ---------- a builder: triangles with one colour each, shade by facing ----------
      function B() { this.pos = []; this.col = []; }
      B.prototype.tri = function (a, b, c, hex, out) {
        _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); _a.cross(_b);
        if (out && _a.x * out[0] + _a.y * out[1] + _a.z * out[2] < 0) { const t = b; b = c; c = t; _a.multiplyScalar(-1); }
        _a.normalize();
        const col = rgb(hex), k = _a.y < -0.35 ? 0.72 : 0.86 + 0.14 * Math.max(0, _a.y);
        this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        for (let j = 0; j < 3; j++) this.col.push(col[0] * k, col[1] * k, col[2] * k);
      };
      B.prototype.add = function (geo, hex, x, y, z, o) {
        o = o || {};
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'YXZ'); _q.setFromEuler(_e);
        _s.set(o.sx || 1, o.sy || 1, o.sz || 1);
        g.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s));
        const A = g.attributes.position.array;
        for (let i = 0; i < A.length; i += 9) {
          const cx = (A[i] + A[i + 3] + A[i + 6]) / 3, cy = (A[i + 1] + A[i + 4] + A[i + 7]) / 3, cz = (A[i + 2] + A[i + 5] + A[i + 8]) / 3;
          this.tri([A[i], A[i + 1], A[i + 2]], [A[i + 3], A[i + 4], A[i + 5]], [A[i + 6], A[i + 7], A[i + 8]], o.color ? o.color(cx, cy, cz) : hex);
        }
        g.dispose();
      };
      B.prototype.rod = function (a, b, r, hex, sides) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
        const g = new THREE.CylinderGeometry(r, r, len, sides || 6);
        g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), _a.set(dx / len, dy / len, dz / len))));
        this.add(g, hex, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      };
      B.prototype.wheel = function (x, y, z, r, w) {
        this.add(new THREE.CylinderGeometry(r, r, w, 12), K.tyre, x, y, z, { rz: Math.PI / 2 });
        this.add(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.04, 8), K.metal, x, y, z, { rz: Math.PI / 2 });
      };
      B.prototype.mesh = function (mat, parent) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
        geo.computeVertexNormals(); geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.userData.dynamic = true;
        if (parent) parent.add(m);
        return m;
      };
      // a section of a lofted shell at z: { w, bot, top, n } interpolated between keys (keys from nose to tail, z falling)
      function sectionAt(keys, z) {
        if (z >= keys[0].z) return keys[0];
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i], b = keys[i + 1];
          if (z <= a.z && z >= b.z) { const k = (a.z - z) / (a.z - b.z || 1); return { z, w: lerp(a.w, b.w, k), bot: lerp(a.bot, b.bot, k), top: lerp(a.top, b.top, k), n: lerp(a.n || 3, b.n || 3, k) }; }
        }
        return keys[keys.length - 1];
      }
      const sePt = (s, ang, x0) => {
        const c = Math.cos(ang), si = Math.sin(ang), e = 2 / s.n, yc = (s.bot + s.top) / 2, h = s.top - s.bot;
        return [x0 + s.w / 2 * Math.sign(c) * Math.pow(Math.abs(c), e), yc + h / 2 * Math.sign(si) * Math.pow(Math.abs(si), e), s.z];
      };
      // the side of a shell at height y (for lettering): x of the superellipse there
      const sideX = (keys, z, y) => { const s = sectionAt(keys, z), yc = (s.bot + s.top) / 2, h = s.top - s.bot, n = s.n || 3, f = Math.min(0.999, Math.abs(2 * (y - yc) / h)); return s.w / 2 * Math.pow(1 - Math.pow(f, n), 1 / n); };
      // loft: a shell through the keys, N facets round, dz along; o.color(x, y, z) paints each facet (windows, glazing);
      // o.skip(angle) leaves facets out (the CH-46's ramp opening); o.lining paints the inside; o.capFront / capBack
      B.prototype.loft = function (keys, o) {
        o = o || {};
        const N = o.N || 20, dz = o.dz || 0.3, x0 = o.x || 0, z0 = keys[0].z, z1 = keys[keys.length - 1].z, steps = Math.max(1, Math.round((z0 - z1) / dz));
        const rings = [];
        for (let j = 0; j <= steps; j++) { const z = z0 - (z0 - z1) * j / steps, s = Object.assign({}, sectionAt(keys, z), { z }), r = []; for (let i = 0; i < N; i++) r.push(sePt(s, (i + 0.5) / N * Math.PI * 2, x0)); r.s = s; rings.push(r); }
        for (let j = 0; j < steps; j++) for (let i = 0; i < N; i++) {
          const angM = (i + 1) / N * Math.PI * 2;
          if (o.skip && o.skip(angM, rings[j].s.z)) continue;
          const a = rings[j][i], b = rings[j][(i + 1) % N], c = rings[j + 1][(i + 1) % N], d = rings[j + 1][i];
          const mx = (a[0] + b[0] + c[0] + d[0]) / 4, my = (a[1] + b[1] + c[1] + d[1]) / 4, mz = (a[2] + c[2]) / 2;
          const yc = (rings[j].s.bot + rings[j].s.top) / 2, out = [mx - x0, my - yc, 0];
          const hex = o.color ? o.color(mx, my, mz) : (o.hex || K.od);
          this.tri(a, b, c, hex, out); this.tri(a, c, d, hex, out);
          if (o.lining) { const inn = [-out[0], -out[1], 0], sh = (p) => [p[0] - out[0] * 0.04, p[1] - out[1] * 0.04, p[2]]; this.tri(sh(a), sh(b), sh(c), o.lining, inn); this.tri(sh(a), sh(c), sh(d), o.lining, inn); }
        }
        const cap = (r, dir, colFn) => { const s = r.s, c = [x0, (s.bot + s.top) / 2, s.z]; for (let i = 0; i < N; i++) { const a = r[i], b = r[(i + 1) % N], mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3; this.tri(c, a, b, colFn ? colFn(mx, my, s) : (o.hex || K.od), [0, 0, dir]); } };
        if (o.capFront) cap(rings[0], 1, o.capFront === true ? null : o.capFront);
        if (o.capBack) cap(rings[steps], -1, o.capBack === true ? null : o.capBack);
      };
      // block letters on a shell's side: text along the side (reading toward the tail on the left side, toward the nose
      // on the right), centred at zc, baseline y0, letter height h
      const FONT = {
        M: [[0, 0, 0, 5], [0, 5, 1.5, 2.6], [1.5, 2.6, 3, 5], [3, 5, 3, 0]],
        A: [[0, 0, 1.5, 5], [1.5, 5, 3, 0], [0.75, 2, 2.25, 2]],
        R: [[0, 0, 0, 5], [0, 5, 2.4, 5], [2.4, 5, 3, 4.3], [3, 4.3, 3, 3.2], [3, 3.2, 2.4, 2.6], [2.4, 2.6, 0, 2.6], [1.2, 2.6, 3, 0]],
        I: [[1.5, 0, 1.5, 5]],
        N: [[0, 0, 0, 5], [0, 5, 3, 0], [3, 0, 3, 5]],
        E: [[0, 0, 0, 5], [0, 5, 3, 5], [0, 2.5, 2.3, 2.5], [0, 0, 3, 0]],
        S: [[3, 5, 0, 5], [0, 5, 0, 2.5], [0, 2.5, 3, 2.5], [3, 2.5, 3, 0], [3, 0, 0, 0]],
      };
      B.prototype.letters = function (text, keys, zc, y0, h, sides) {
        const u = h / 5, adv = 4.3 * u, total = adv * text.length - 1.3 * u, thick = u * 0.75;
        for (const side of sides || [1, -1]) {
          const dirZ = side > 0 ? -1 : 1;     // left side (+x) reads toward the tail
          for (let li = 0; li < text.length; li++) {
            for (const [x1, y1, x2, y2] of FONT[text[li]]) {
              const u1 = li * adv + x1 * u - total / 2, u2 = li * adv + x2 * u - total / 2;
              const za = zc + dirZ * u1, zb = zc + dirZ * u2, ya = y0 + y1 * u, yb = y0 + y2 * u;
              const len = Math.hypot(zb - za, yb - ya) + thick, zm = (za + zb) / 2, ym = (ya + yb) / 2;
              const x = side * (sideX(keys, zm, ym) + 0.018);
              this.add(new THREE.BoxGeometry(0.02, len, thick), K.letter, x, ym, zm, { rx: Math.atan2(zb - za, yb - ya), order: 'XYZ' });
            }
          }
        }
      };
      // rotor blades (n, radius r, chord c) round y, droop at the tips; and a blurred disc (radius r) for the turning rotor
      function blades(b, n, r, c, x, y, z, axis) {
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + 0.3;
          const g = new THREE.BoxGeometry(c, 0.07, r - 0.45, 1, 1, 3);
          const P = g.attributes.position;
          for (let k = 0; k < P.count; k++) P.setY(k, P.getY(k) - 0.004 * Math.pow((P.getZ(k) + (r - 0.45) / 2), 2));
          g.translate(0, 0, (r - 0.45) / 2 + 0.45);
          g.rotateY(a);
          if (axis === 'x') g.rotateZ(Math.PI / 2);
          b.add(g, K.blade, x, y, z, { color: (cx, cy, cz) => (Math.hypot(axis === 'x' ? cy - y : cx - x, cz - z) > r - 0.5 ? K.tip : K.blade) });
        }
        b.add(new THREE.CylinderGeometry(0.32, 0.36, 0.34, 8), K.metal, x, y, z, axis === 'x' ? { rz: Math.PI / 2 } : null);
      }
      function disc(b, r, x, y, z, axis) {
        const N = 36, rIn = 0.45;
        const put = (rr, a) => { const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr; return axis === 'x' ? [x, y + cx, z + cz] : [x + cx, y, z + cz]; };
        for (let i = 0; i < N; i++) {
          const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
          for (const [r0, r1, hex] of [[rIn, r * 0.82, K.disc], [r * 0.82, r, 0x8a876f]]) {
            const p = [put(r0, a0), put(r0, a1), put(r1, a1), put(r1, a0)], up = axis === 'x' ? [1, 0, 0] : [0, 1, 0];
            b.tri(p[0], p[1], p[2], hex, up); b.tri(p[0], p[2], p[3], hex, up);
          }
        }
      }
      const tris = {};

      // ================= the CH-46A Sea Knight (nose +z, left +x, wheels on y = 0) =================
      function buildCH46() {
        const g = new THREE.Group(), b = new B();
        const body = [
          { z: 7.1, w: 0.55, bot: 1.3, top: 1.75, n: 2.2 }, { z: 6.9, w: 1.35, bot: 0.86, top: 2.25, n: 2.4 }, { z: 6.45, w: 1.95, bot: 0.66, top: 2.72, n: 3 },
          { z: 5.7, w: 2.2, bot: 0.6, top: 3.0, n: 3.6 }, { z: -3.35, w: 2.2, bot: 0.6, top: 3.0, n: 3.6 },
        ];
        const rear = [{ z: -3.35, w: 2.2, bot: 0.6, top: 3.0, n: 3.6 }, { z: -4.4, w: 2.15, bot: 1.25, top: 3.05, n: 3.4 }, { z: -5.6, w: 1.95, bot: 2.1, top: 3.08, n: 3 }, { z: -6.3, w: 1.6, bot: 2.68, top: 3.05, n: 2.6 }];
        const winZ = [3.0, 1.55, 0.1, -1.35, -2.7];
        const paint = (x, y, z) => {
          if (z > 5.55 && y > 1.5) {                                   // cockpit glazing with its frames
            if (Math.abs(x) < 0.09 || Math.abs(z - 6.3) < 0.07 || Math.abs(z - 6.75) < 0.05 || (z < 5.85) || Math.abs(y - 2.15) < 0.06) return K.frame;
            return K.glass;
          }
          if (z > 6.0 && y > 0.85 && y < 1.3 && Math.abs(x) < 0.75) return K.glass;   // chin windows
          if (x < -0.95 && z > 3.85 && z < 4.75 && y > 0.85 && y < 2.6) return K.inside; // the crew door, forward right, open
          if (Math.abs(x) > 0.95 && y > 1.85 && y < 2.4 && winZ.some((w) => Math.abs(z - w) < 0.27)) return K.glass;
          return y < 0.75 ? K.belly : K.od;
        };
        b.loft(body, { N: 24, dz: 0.25, color: paint });
        b.loft(rear, { N: 24, dz: 0.25, color: (x, y) => (y < 0.75 ? K.belly : K.od), lining: K.inside, skip: (a) => Math.sin(a) < -0.55, capBack: (x, y) => (y > 2.7 ? K.od : K.inside) });
        b.add(new THREE.BoxGeometry(2.08, 2.3, 0.05), K.inside, 0, 1.78, -2.9);       // the cabin seen through the ramp
        // pylons: forward over the cockpit, aft tall over the ramp
        const fwd = [{ z: 6.7, w: 0.8, bot: 2.55, top: 2.7, n: 2.6 }, { z: 6.1, w: 1.25, bot: 2.75, top: 3.5, n: 3 }, { z: 5.0, w: 1.35, bot: 2.85, top: 3.68, n: 3 }, { z: 3.8, w: 1.2, bot: 2.9, top: 3.45, n: 3 }, { z: 2.6, w: 0.8, bot: 2.9, top: 3.02, n: 2.6 }];
        b.loft(fwd, { N: 16, dz: 0.3, hex: K.od, capFront: true, capBack: true });
        const aft = [{ z: -0.5, w: 0.7, bot: 2.85, top: 3.0, n: 2.6 }, { z: -2.0, w: 1.2, bot: 2.85, top: 3.55, n: 3 }, { z: -3.4, w: 1.35, bot: 2.85, top: 4.32, n: 3.2 }, { z: -4.6, w: 1.36, bot: 2.85, top: 4.78, n: 3.2 }, { z: -5.6, w: 1.25, bot: 2.82, top: 4.72, n: 3 }, { z: -6.2, w: 1.05, bot: 2.8, top: 4.35, n: 2.8 }, { z: -6.5, w: 0.75, bot: 3.0, top: 3.85, n: 2.4 }];
        b.loft(aft, { N: 18, dz: 0.3, hex: K.od, capFront: true, capBack: true });
        b.letters('MARINES', aft, -4.05, 3.5, 0.34);
        // engines either side of the aft pylon: pods with dark intakes and exhausts
        for (const s of [1, -1]) {
          b.add(new THREE.CylinderGeometry(0.36, 0.38, 2.1, 10), K.odDark, s * 0.92, 3.28, -4.35, { rx: Math.PI / 2 });
          b.add(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 10), K.black, s * 0.92, 3.28, -3.29, { rx: Math.PI / 2 });
          b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 8), K.exhaust, s * 0.95, 3.22, -5.55, { rx: Math.PI / 2 + 0.15 });
        }
        // sponsons with the main wheels; the nose wheels
        for (const s of [1, -1]) {
          const sp = [{ z: -0.9, w: 0.55, bot: 0.55, top: 0.95, n: 2.4 }, { z: -1.6, w: 0.8, bot: 0.42, top: 1.25, n: 2.8 }, { z: -4.2, w: 0.8, bot: 0.45, top: 1.25, n: 2.8 }, { z: -4.9, w: 0.45, bot: 0.65, top: 1.1, n: 2.4 }];
          b.loft(sp, { N: 14, dz: 0.35, x: s * 1.38, hex: K.od, capFront: true, capBack: true });
          b.wheel(s * 1.42, 0.42, -2.95, 0.42, 0.28);
          b.wheel(s * 0.3, 0.3, 5.0, 0.3, 0.2);
          b.rod([s * 0.3, 0.3, 5.0], [s * 0.2, 0.75, 4.9], 0.06, K.metal);
        }
        b.rod([0.4, 2.3, 7.0], [0.45, 2.35, 7.7], 0.025, K.metal, 4);      // pitot
        b.rod([0, 3.0, 1.0], [0, 3.8, 0.6], 0.02, K.metal, 4);             // whip antenna
        // hubs on short masts
        b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), K.metal, 0, 3.85, 5.4);
        b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), K.metal, 0, 5.0, -4.85);
        tris.body46 = b.pos.length / 9;
        const bodyMesh = b.mesh(MAT.b46, g);
        // the ramp: hinged at the cabin floor's rear edge, closed it rises with the underside, lowered it reaches the ground
        const rb = new B();
        rb.add(new THREE.BoxGeometry(1.95, 0.16, 3.2), K.odDark, 0, 0, -1.6, { color: (x, y) => (y > 0.03 ? K.inside : K.belly) });
        rb.add(new THREE.BoxGeometry(0.08, 0.35, 3.2), K.od, 0.95, 0.12, -1.6); rb.add(new THREE.BoxGeometry(0.08, 0.35, 3.2), K.od, -0.95, 0.12, -1.6);
        tris.ramp = rb.pos.length / 9;
        const ramp = rb.mesh(MAT.b46, g); ramp.position.set(0, 0.68, -3.35);
        // rotors: blades on each hub (front and aft turn opposite ways), the two discs in one mesh
        const f = new B(); blades(f, 3, 7.62, 0.48, 0, 0, 0); const rotF = f.mesh(MAT.bl46, g); rotF.position.set(0, 4.15, 5.4);
        const a = new B(); blades(a, 3, 7.62, 0.48, 0, 0, 0); const rotA = a.mesh(MAT.bl46, g); rotA.position.set(0, 5.3, -4.85);
        const d = new B(); disc(d, 7.62, 0, 4.15, 5.4); disc(d, 7.62, 0, 5.3, -4.85); const discs = d.mesh(MAT.d46, g);
        tris.rotors46 = (f.pos.length + a.pos.length + d.pos.length) / 9;
        g.visible = false; ctx.root.add(g);
        return { g, body: bodyMesh, ramp, rotors: [rotF, rotA], dirs: [1, -1], discs };
      }

      // ================= the UH-34D Sea Horse (nose +z, left +x) =================
      function buildUH34() {
        const g = new THREE.Group(), b = new B();
        const body = [
          { z: 4.15, w: 1.25, bot: 1.05, top: 2.35, n: 2.2 }, { z: 3.95, w: 1.72, bot: 0.86, top: 2.62, n: 2.4 }, { z: 3.4, w: 1.95, bot: 0.78, top: 2.95, n: 2.8 },
          { z: 2.6, w: 2.05, bot: 0.76, top: 3.35, n: 3 }, { z: 1.0, w: 2.1, bot: 0.76, top: 3.45, n: 3.2 }, { z: 0.0, w: 2.1, bot: 0.8, top: 3.3, n: 3.4 },
          { z: -2.3, w: 2.0, bot: 0.95, top: 3.2, n: 3.2 }, { z: -3.4, w: 1.6, bot: 1.55, top: 3.1, n: 3 }, { z: -5.5, w: 0.95, bot: 2.2, top: 2.95, n: 2.6 },
          { z: -8.3, w: 0.55, bot: 2.55, top: 3.0, n: 2.4 }, { z: -9.3, w: 0.42, bot: 2.6, top: 3.5, n: 2.4 }, { z: -10.0, w: 0.36, bot: 2.75, top: 4.35, n: 2.4 },
          { z: -10.55, w: 0.2, bot: 3.2, top: 4.45, n: 2.2 },
        ];
        const paint = (x, y, z) => {
          if (z > 1.3 && z < 3.45 && y > 2.5) {                       // the high cockpit over the engine
            if (Math.abs(x) < 0.1 || Math.abs(z - 2.35) < 0.07 || z < 1.5 || y < 2.62) return K.frame;
            return K.glass;
          }
          if (z > 3.3 && Math.abs(x) < 0.04) return K.grille;          // the seam of the clamshell doors
          if (x < -0.9 && z > -0.6 && z < 0.9 && y > 0.95 && y < 2.55) return K.inside;   // cargo door opening, right side
          if (x > 0.9 && y > 2.05 && y < 2.5 && (Math.abs(z + 0.3) < 0.22 || Math.abs(z + 1.35) < 0.22)) return K.glass;
          if (x < -0.9 && y > 2.05 && y < 2.5 && Math.abs(z + 1.5) < 0.22) return K.glass;
          if (z > 2.8 && z < 3.2 && y > 1.2 && y < 1.6 && Math.abs(x) > 0.85) return K.exhaust;   // engine exhaust stubs
          return y < 0.9 ? K.belly : K.od;
        };
        b.loft(body, { N: 24, dz: 0.25, color: paint, capBack: true, capFront: (x, y, s) => { const r = Math.hypot(x / (s.w / 2), (y - (s.bot + s.top) / 2) / ((s.top - s.bot) / 2)); return r < 0.45 ? K.grille : r < 0.6 ? K.black : K.od; } });
        // the transmission fairing and rotor mast
        const fair = [{ z: 1.5, w: 1.0, bot: 3.3, top: 3.45, n: 2.6 }, { z: 0.9, w: 1.2, bot: 3.28, top: 3.85, n: 3 }, { z: -0.4, w: 1.15, bot: 3.2, top: 3.8, n: 3 }, { z: -1.5, w: 0.65, bot: 3.15, top: 3.25, n: 2.6 }];
        b.loft(fair, { N: 16, dz: 0.3, hex: K.od, capFront: true, capBack: true });
        b.add(new THREE.CylinderGeometry(0.15, 0.2, 0.55, 8), K.metal, 0, 4.05, 0.3);
        b.letters('MARINES', body, -5.0, 2.4, 0.36);
        // tall main gear with oleo struts, the long tail-wheel strut
        for (const s of [1, -1]) {
          b.wheel(s * 1.72, 0.45, 2.55, 0.45, 0.3);
          b.rod([s * 0.95, 1.15, 2.4], [s * 1.6, 0.45, 2.55], 0.07, K.metal);
          b.rod([s * 0.98, 2.15, 2.05], [s * 1.58, 0.8, 2.5], 0.09, K.metal);
          b.rod([s * 0.9, 1.05, 1.4], [s * 1.6, 0.5, 2.5], 0.05, K.metal);
        }
        b.wheel(0, 0.24, -7.45, 0.24, 0.14);
        b.rod([0, 2.5, -7.1], [0, 0.24, -7.45], 0.06, K.metal);
        b.rod([0, 2.55, -6.4], [0, 0.6, -7.4], 0.04, K.metal);
        // the tail: stabiliser on the right, tail-rotor hub on the left
        b.add(new THREE.BoxGeometry(1.3, 0.07, 0.5), K.od, -0.75, 3.75, -9.95);
        b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8), K.metal, 0.3, 3.95, -10.15, { rz: Math.PI / 2 });
        b.rod([0.2, 3.3, 3.9], [0.3, 3.3, 4.6], 0.025, K.metal, 4);
        tris.body34 = b.pos.length / 9;
        const bodyMesh = b.mesh(MAT.b34, g);
        // the cargo door (right side), slides aft to open
        const db = new B();
        db.add(new THREE.BoxGeometry(0.06, 1.62, 1.55), K.od, 0, 0, 0, { color: (x, y, z) => (Math.abs(z - 0.3) < 0.2 && y > 0.25 && y < 0.6 ? K.glass : K.od) });
        db.add(new THREE.BoxGeometry(0.08, 0.05, 1.6), K.metal, 0, 0.84, 0);
        tris.door34 = db.pos.length / 9;
        const door = db.mesh(MAT.b34, g); door.position.set(-1.1, 1.75, 0.15);
        const r = new B(); blades(r, 4, 8.53, 0.42, 0, 0, 0); const rot = r.mesh(MAT.bl34, g); rot.position.set(0, 4.42, 0.3);
        const d = new B(); disc(d, 8.53, 0, 4.42, 0.3); disc(d, 1.45, 0.42, 3.95, -10.15, 'x'); const discs = d.mesh(MAT.d34, g);
        tris.rotors34 = (r.pos.length + d.pos.length) / 9;
        g.visible = false; ctx.root.add(g);
        return { g, body: bodyMesh, door, rotors: [rot], dirs: [1], discs };
      }

      const H = buildCH46();
      const M = [buildUH34(), buildUH34()];
      const blobs = [ctx.blob(7), ctx.blob(7), ctx.blob(8)];

      // ---------- flight plans (computed once) ----------
      const pads = (W.lz && W.lz.czlz) || [SITE.czlz, V(SITE.czlz.x + 20, SITE.czlz.y, SITE.czlz.z)];
      const east = V(SITE.relayMast.x, 0, SITE.relayMast.z);
      const wheels34 = [[1.72, 2.55], [-1.72, 2.55], [0, -7.45]], wheels46 = [[1.42, -2.95], [-1.42, -2.95], [0.3, 5.0], [-0.3, 5.0]];
      // the body's height so the highest ground under any wheel carries it (level body, uphill wheels down)
      const restY = (p, yaw, wh) => { let y = -1e9; const c = Math.cos(yaw), s = Math.sin(yaw); for (const [wx, wz] of wh) { const x = p.x + wx * c + wz * s, z = p.z - wx * s + wz * c; y = Math.max(y, G(x, z)); } return y; };
      function plan(pad, t0, tDown, tLift, wh) {
        const from = V(east.x - pad.x, 0, east.z - pad.z).normalize();
        const yaw = Math.atan2(-from.x, -from.z);                         // nose into the approach (toward the hill)
        const rest = restY(pad, yaw, wh);
        const far = V(pad.x + from.x * 520, 0, pad.z + from.z * 520);
        far.y = Math.max(rest + 90, G(far.x, far.z) + 50);
        return { pad, from, yaw, rest, far, hover: V(pad.x, rest + 10, pad.z), ctrl: V(pad.x + from.x * 150, rest + 28, pad.z + from.z * 150), t0, tHover: tDown - 3, tDown, tLift };
      }
      // fix pass (review: they landed at a 1733 clock; the record says about 1805): in over the chapter's last 17 s,
      // down at t 116.5 and 118 (clock 1800, 1802), loading as the chapter fades; they do not lift within it
      const P1 = plan(pads[0], 103.5, 116.5, 140, wheels34), P2 = plan(pads[1], 105, 118, 141, wheels34);
      const L46 = (W.lz && W.lz.ch46) || SITE.routes.ch46[1], LZ689 = (W.lz && W.lz.lz689) || SITE.lz689;
      const PH = plan(L46, 80, 92.5, 98, wheels46);
      PH.hover.y = PH.rest + 9; PH.rest += 0.35;                             // the slope is too steep to land: a low hover, ramp down
      const yaw689 = Math.atan2(LZ689.x - L46.x, LZ689.z - L46.z), rest689 = restY(LZ689, yaw689, wheels46);
      const T_HARD = 113.2;                                                  // the hard landing on 689

      // the canopy (fix pass, Abram: "one flies through trees to land"): over forest the aircraft keeps about 15 m
      // above the crowns (crowns 10-18 m), and comes down to its own height only over the last of its LZ's clearing
      const clsAt = (x, z) => (ctx.land && ctx.land.cls ? ctx.land.cls(x, z) : 1);
      function canopyFloor(x, z, pads) {
        let f = 0;
        for (const [dx, dz] of [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9]]) f += 1 - sm((clsAt(x + dx, z + dz) - 0.4) / 0.15);
        f /= 5;
        let dp = 1e9; for (const p of pads) dp = Math.min(dp, Math.hypot(x - p.x, z - p.z));
        return G(x, z) + 6 + 28 * f * sm((dp - 12) / 30);
      }
      const st = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, a: 0 };
      const bez = (a, b, c, u, k) => (1 - u) * (1 - u) * a[k] + 2 * (1 - u) * u * b[k] + u * u * c[k];
      const wrap = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
      function approach(P, t) {
        // in from the east on a descending curve, nose down while fast, flaring nose-up as it slows to the hover
        const u0 = (t - P.t0) / (P.tHover - P.t0), u = 1 - (1 - u0) * (1 - u0);
        st.x = bez(P.far, P.ctrl, P.hover, u, 'x'); st.y = bez(P.far, P.ctrl, P.hover, u, 'y'); st.z = bez(P.far, P.ctrl, P.hover, u, 'z');
        st.y = Math.max(st.y, G(st.x, st.z) + 18 * (1 - u0) + 6, canopyFloor(st.x, st.z, [P.pad]));
        st.yaw = P.yaw; st.pitch = -0.1 * (1 - u0) + 0.16 * Math.sin(Math.PI * sm((u0 - 0.6) / 0.4)); st.roll = 0.04 * Math.sin(u0 * 5);
      }
      function settle(P, t, yTo) {
        const k = sm((t - P.tHover) / (P.tDown - P.tHover));
        st.x = P.pad.x; st.z = P.pad.z; st.y = lerp(P.hover.y, yTo, k); st.yaw = P.yaw; st.pitch = 0.03 * (1 - k); st.roll = 0;
      }
      function depart(P, t) {
        const tau = t - P.tLift, up = sm(tau / 3) * 14 + Math.max(0, tau - 2) * 3.5;
        const fwd = tau > 1.5 ? Math.min(2.5 * (tau - 1.5) * (tau - 1.5), 30 * (tau - 1.5) - 90) : 0;
        const turn = sm((tau - 1) / 3), dy = wrap(Math.atan2(P.from.x, P.from.z) - P.yaw);
        st.yaw = P.yaw + dy * turn;
        st.x = P.pad.x + P.from.x * fwd; st.z = P.pad.z + P.from.z * fwd; st.y = P.rest + up;
        st.pitch = -0.13 * sm((tau - 1.5) / 2); st.roll = 0.14 * Math.sin(Math.PI * turn) * Math.sign(dy);
      }
      let door = 0;
      function medevacAt(P, t) {
        door = 0;
        if (t < P.t0) return false;
        if (t < P.tHover) approach(P, t);
        else if (t < P.tDown) settle(P, t, P.rest);
        else if (t < P.tLift) {
          // on the ground: a gentle settle onto the gear, the cargo door slides open, loads, closes before lift
          const d = t - P.tDown;
          st.x = P.pad.x; st.z = P.pad.z; st.yaw = P.yaw; st.roll = 0;
          st.y = P.rest - 0.07 * Math.exp(-d * 2.5) * Math.sin(d * 7); st.pitch = 0.012 * Math.exp(-d * 2.5) * Math.sin(d * 6 + 1);
          door = sm((d - 0.8) / 1.6) * (1 - sm((t - (P.tLift - 2)) / 1.4));
        } else depart(P, t);
        st.a = sm((t - P.t0) / 2) * (1 - sm((t - 118.7) / 1.3));
        return st.a > 0.002;
      }
      let ramp = 0;
      function ch46At(t) {
        const P = PH;
        ramp = 0;
        if (t < P.t0) return false;
        if (t < P.tHover) approach(P, t);
        else if (t < P.tLift + 0.5) {
          settle(P, Math.min(t, P.tDown), P.rest);
          st.y += 0.15 * Math.sin(t * 2.1); st.roll = 0.01 * Math.sin(t * 1.7);     // holding a hover on the slope
          ramp = sm((t - (P.tDown + 0.3)) / 2) * (1 - sm((t - P.tLift) / 2.5));
        } else if (t < T_HARD) {
          // back across the valley to 689: up, over, down fast
          ramp = 1 - sm((t - P.tLift) / 2.5);
          const t1 = P.tLift + 0.5, t2 = T_HARD - 0.7, u = sm((t - t1) / (t2 - t1));
          const yTop = Math.max(P.rest, rest689) + 38;
          if (t < t2) {
            st.x = lerp(P.pad.x, LZ689.x, u); st.z = lerp(P.pad.z, LZ689.z, u);
            st.y = lerp(P.rest, rest689 + 3, u) + Math.sin(Math.PI * u) * (yTop - lerp(P.rest, rest689, u));
            st.y = Math.max(st.y, G(st.x, st.z) + 8 * Math.sin(Math.PI * u), canopyFloor(st.x, st.z, [P.pad, LZ689]));
            st.yaw = P.yaw + wrap(yaw689 - P.yaw) * sm((t - t1) / 3);
            st.pitch = -0.12 * Math.sin(Math.PI * u) + 0.12 * sm((u - 0.85) / 0.15); st.roll = 0.08 * Math.sin(Math.PI * sm((t - t1) / 3)) * Math.sign(wrap(yaw689 - P.yaw));
          } else {
            const f = 1 - (t - t2) / 0.7;
            st.x = LZ689.x; st.z = LZ689.z; st.yaw = yaw689; st.y = rest689 + 3 * f * f; st.pitch = 0.1 * f; st.roll = 0;
          }
        } else {
          // the hard landing: a jolt, a bounce, settling on the gear
          const d = t - T_HARD;
          st.x = LZ689.x; st.z = LZ689.z; st.yaw = yaw689;
          st.y = rest689 - 0.24 * Math.exp(-d * 3) * Math.sin(d * 9) + 0.18 * Math.exp(-d * 4) * Math.max(0, Math.sin(d * 4.5));
          st.pitch = 0.04 * Math.exp(-d * 2.5) * Math.sin(d * 7); st.roll = 0.05 * Math.exp(-d * 2.5) * Math.sin(d * 6 + 1);
        }
        st.a = sm((t - P.t0) / 2) * (1 - sm((t - 117.3) / 2.6));
        return st.a > 0.002;
      }
      // rotor speed after the landing winds down: omega = W0 * (1 - 0.85 s(u)), its integral in closed form
      const W0 = 9, WD = 6;
      const spin46 = (t) => { const u = Math.min(1, Math.max(0, (t - T_HARD) / WD)); return W0 * t - W0 * 0.85 * (WD * (u * u * u - u * u * u * u / 2) + Math.max(0, t - T_HARD - WD)); };
      const speed46 = (t) => 1 - 0.85 * sm((t - T_HARD) / WD);

      const OUT = {
        aircraft: [{ type: 'UH-34D', pos: V(0, 0, 0), visible: false, rotorOn: false }, { type: 'UH-34D', pos: V(0, 0, 0), visible: false, rotorOn: false }, { type: 'CH-46A', pos: V(0, 0, 0), visible: false, rotorOn: false }],
        ch46: { pos: V(0, 0, 0), ramp: 0, visible: false, rampDown: [PH.tDown + 0.3, PH.tLift + 2.5] },
        medevacs: [], tris,
      };
      OUT.medevacs = [OUT.aircraft[0], OUT.aircraft[1]];
      window.MEDEVAC = OUT; ctx.medevac = OUT;
      function place(h, t, blob, spin) {
        h.g.position.set(st.x, st.y, st.z);
        h.g.rotation.set(-st.pitch, st.yaw, st.roll, 'YXZ');
        for (let i = 0; i < h.rotors.length; i++) h.rotors[i].rotation.y = spin * h.dirs[i] + i * 0.6;
        const gy = G(st.x, st.z), alt = Math.max(0, st.y - gy);
        if (alt > 70 || st.a < 0.3) blob.hide(); else blob.set(st.x, gy, st.z, Math.max(0.3, 1.25 - alt / 45));
      }
      // rotor-wash dust (fire.js), once fire.js has loaded
      let dustDone = false;
      function dust() {
        const F = window.FIRE;
        if (dustDone || !F || !F.schedule) return;
        dustDone = true;
        const D = 0xb98a66;
        for (const P of [P1, P2]) F.smoke(P.pad, D, { at: P.tHover - 0.5, ch: 7, dur: P.tLift - P.tHover + 4 });
        F.smoke(PH.pad, D, { at: PH.tHover, ch: 11, dur: PH.tLift - PH.tHover + 2 });
        F.smoke(LZ689, D, { at: T_HARD - 1, ch: 11, dur: 4 });
        const tmp = { x: 0, y: 0, z: 0 };
        F.ch46At = (t) => { if (!ch46At(t)) { tmp.x = PH.pad.x; tmp.y = PH.rest + 3; tmp.z = PH.pad.z; return tmp; } tmp.x = st.x; tmp.y = st.y + 2; tmp.z = st.z; return tmp; };
      }
      let update = function () {
        dust();
        const t = ctx.cycle.t, id = ctx.chapter.id;
        let a34 = 0;
        for (let i = 0; i < 2; i++) {
          const h = M[i], o = OUT.aircraft[i], on = id === 7 && medevacAt(i ? P2 : P1, t);
          h.g.visible = on; o.visible = on; o.rotorOn = on;
          if (!on) { blobs[i].hide(); continue; }
          place(h, t, blobs[i], t * W0 + i * 1.3);
          h.door.position.z = 0.15 - 1.45 * door;
          o.pos.set(st.x, st.y, st.z); a34 = Math.max(a34, st.a);
        }
        MAT.b34.opacity = a34; MAT.b34.depthWrite = a34 > 0.98;
        MAT.bl34.opacity = a34 * 0.5; MAT.bl34.depthWrite = false;
        MAT.d34.opacity = a34 * 0.26;
        const o = OUT.aircraft[2], on = id === 11 && ch46At(t);
        H.g.visible = on; o.visible = on; OUT.ch46.visible = on;
        if (on) {
          place(H, t, blobs[2], spin46(t));
          H.ramp.rotation.x = lerp(0.6, -0.21, ramp);   // closed: along the rising underside; down: onto the slope
          o.pos.set(st.x, st.y, st.z); OUT.ch46.pos.copy(o.pos); OUT.ch46.ramp = ramp;
          const w = speed46(t);
          o.rotorOn = w > 0.2;
          MAT.b46.opacity = st.a; MAT.b46.depthWrite = st.a > 0.98;
          const solid = 1 - sm((w - 0.3) / 0.55);          // blades read solid as the rotors slow
          MAT.bl46.opacity = st.a * lerp(0.5, 1, solid); MAT.bl46.depthWrite = solid > 0.95 && st.a > 0.98;
          MAT.d46.opacity = st.a * 0.26 * (1 - solid);
        } else { blobs[2].hide(); o.rotorOn = false; OUT.ch46.ramp = 0; }
      }
      // ---------- the observation plane, chapter 11 (integration) ----------
      // "Later an observation plane circles the ridge" (DESIGN.md 9; ComdC 0900, HN midday): a small high-wing spotter
      // (an O-1 by type is ours; the record says only an air observer) flies in from the east, circles the battle hill
      // high up from t 40 to 70 and leaves; radio.js's air-observer arc (t ~57) leaves it through OUT.plane(). About
      // 150 triangles, one draw; it fades in and out far off in the haze.
      const PLANE = (() => {
        const g = new THREE.Group();
        const m = new THREE.MeshStandardMaterial({ color: ctx.lin(0x8c9288), flatShading: true, roughness: 0.8, metalness: 0, transparent: true });
        const dark = new THREE.MeshStandardMaterial({ color: ctx.lin(0x3c3f38), flatShading: true, roughness: 0.9, metalness: 0, transparent: true });
        const box = (w, h, d, x, y, z, mm) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm || m); b.position.set(x, y, z); g.add(b); return b; };
        box(1.0, 1.1, 2.6, 0, 0, 0.6);              // cabin (nose toward +z)
        box(0.6, 0.6, 3.4, 0, 0.15, -2.2);          // tail boom
        box(11.0, 0.12, 1.6, 0, 0.62, 0.7);         // the high wing
        box(3.4, 0.08, 0.9, 0, 0.2, -3.7);          // tailplane
        box(0.08, 1.1, 0.9, 0, 0.7, -3.7);          // fin
        box(0.5, 0.5, 0.5, 0, -0.1, 2.1, dark);     // engine
        box(1.9, 0.12, 0.06, 0, -0.1, 2.4, dark);   // propeller (a bar that spins)
        box(0.1, 0.9, 0.1, 0.7, -0.75, 0.9, dark); box(0.1, 0.9, 0.1, -0.7, -0.75, 0.9, dark);   // gear legs
        g.visible = false;
        ctx.scene.add(g);
        return { g, m, dark, prop: g.children[6], pos: V(0, 0, 0) };
      })();
      OUT.plane = () => (PLANE.g.visible ? PLANE.pos : null);
      const PL = { t0: 34, t1: 76, r: 80, h: 105, w: 2 * Math.PI / 24 };
      const planeAt = (t, out) => {
        const c = SITE.battleSummit, cy = c.y + PL.h;
        const ang = (u) => -1.2 + PL.w * (u - PL.t0);
        const onCircle = (u, o) => o.set(c.x + Math.cos(ang(u)) * PL.r, cy, c.z + Math.sin(ang(u)) * PL.r);
        if (t < PL.t0 + 6) { onCircle(PL.t0 + 6, out); const k = (PL.t0 + 6 - t) * 32; out.x += k * 0.95; out.z -= k * 0.3; return out; }
        if (t > PL.t1 - 6) { onCircle(PL.t1 - 6, out); const k = (t - (PL.t1 - 6)) * 32; out.x += k * 0.9; out.z -= k * 0.45; out.y += k * 0.1; return out; }
        return onCircle(t, out);
      };
      const pTmp = V(0, 0, 0);
      const _update = update;
      update = function () {
        _update();
        const t = ctx.cycle.t, on = ctx.chapter.id === 11 && t > PL.t0 && t < PL.t1;
        PLANE.g.visible = on;
        if (!on) return;
        planeAt(t, PLANE.pos); planeAt(t + 0.2, pTmp);
        PLANE.g.position.copy(PLANE.pos);
        PLANE.g.rotation.set(0, Math.atan2(pTmp.x - PLANE.pos.x, pTmp.z - PLANE.pos.z), 0, 'YXZ');
        const circling = t > PL.t0 + 6 && t < PL.t1 - 6;
        PLANE.g.rotation.z = circling ? 0.38 : 0;   // banked into the circle (clockwise seen from above: right wing down)
        const a = sm((t - PL.t0) / 3) * (1 - sm((t - (PL.t1 - 3)) / 3));
        PLANE.m.opacity = PLANE.dark.opacity = a; PLANE.m.depthWrite = PLANE.dark.depthWrite = a > 0.98;
        PLANE.prop.rotation.z = t * 60;
      };
      this.update = update;
      ctx.onChapter(() => update());
      ctx.tag('medevac', () => (OUT.aircraft[0].visible ? OUT.aircraft[0].pos : OUT.aircraft[1].pos), { r: 10, when: (ch) => ch.id === 7 && (OUT.aircraft[0].visible || OUT.aircraft[1].visible) });
    },
  });
})();
