// figkit.js: shared helpers for the style study. Geometry primitives, a builder that bakes vertex colours (linear)
// into one mesh per joint, a small skeleton, two-bone arm IK and the idle animation. Each style (style-a/b/c.js)
// uses these with its own primitives, proportions and materials. Everything is on window.FK.
(function () {
  'use strict';
  const FK = (window.FK = {});
  const TAU = Math.PI * 2;
  const V = (FK.V = (x, y, z) => new THREE.Vector3(x, y, z));
  const lin = (FK.lin = (hex) => new THREE.Color(hex).convertSRGBToLinear());
  const clamp = (FK.clamp = (x, a, b) => Math.max(a, Math.min(b, x)));
  const smooth = (FK.smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); });
  FK.TAU = TAU;
  // a transform: position, Euler XYZ rotation, scale
  FK.M = (px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));

  // ---------- noise ----------
  function hash3(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  FK.hash = hash3;
  FK.noise = function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const L = (a, b, k) => a + (b - a) * k;
    const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
    return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
  };
  FK.rand = function (seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---------- primitives (all in local space, Y up) ----------
  // Flip a geometry's winding (and normals) when it faces inward. Tests the average of normal . (p - centroid).
  function outward(g) {
    const p = g.attributes.position, n = g.attributes.normal;
    if (!n) return g;
    g.computeBoundingBox();
    const c = new THREE.Vector3(); g.boundingBox.getCenter(c);
    let s = 0;
    for (let i = 0; i < p.count; i++) s += (p.getX(i) - c.x) * n.getX(i) + (p.getZ(i) - c.z) * n.getZ(i);
    if (s < 0) {
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    }
    return g;
  }
  const G = (FK.G = {
    sph(rx, ry, rz, ws = 16, hs = 12, phi0 = 0, phiL = TAU, th0 = 0, thL = Math.PI) {
      const g = new THREE.SphereGeometry(1, ws, hs, phi0, phiL, th0, thL);
      g.scale(rx, ry === undefined ? rx : ry, rz === undefined ? rx : rz);
      return g;
    },
    cyl(rt, rb, h, seg = 8, open = false, hs = 1) { return new THREE.CylinderGeometry(rt, rb, h, seg, hs, open); },
    box(w, h, d) { return new THREE.BoxGeometry(w, h, d); },
    cone(r, h, seg = 8) { return new THREE.ConeGeometry(r, h, seg); },
    ico(r, detail = 1) { return new THREE.IcosahedronGeometry(r, detail); },
    torus(R, r, rs = 8, ts = 16, arc = TAU) { return new THREE.TorusGeometry(R, r, rs, ts, arc); },
    // pts: [[radius, y], ...] in either order; turned to face outward
    lathe(pts, seg = 16, phi0 = 0, phiL = TAU) {
      const g = new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(Math.max(q[0], 1e-4), q[1])), seg, phi0, phiL);
      g.computeVertexNormals();
      return outward(g);
    },
    // a rounded box: a subdivided box whose vertices are pulled onto a rounded shape
    rbox(w, h, d, r, seg = 3) {
      r = Math.min(r, w / 2, h / 2, d / 2);
      const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position, n = g.attributes.normal;
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, q = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        q.set(p.getX(i), p.getY(i), p.getZ(i));
        c.set(clamp(q.x, -hx, hx), clamp(q.y, -hy, hy), clamp(q.z, -hz, hz));
        q.sub(c);
        if (q.lengthSq() < 1e-12) q.set(0, 1, 0);
        q.normalize();
        n.setXYZ(i, q.x, q.y, q.z);
        q.multiplyScalar(r).add(c);
        p.setXYZ(i, q.x, q.y, q.z);
      }
      return g;
    },
    // a capsule along Y: bottom radius r1, top radius r2, total height h (caps included), base at y = 0
    capsule(r1, r2, h, seg = 16, cs = 5) {
      const pts = [];
      for (let i = 0; i <= cs; i++) { const a = -Math.PI / 2 + (i / cs) * (Math.PI / 2); pts.push([Math.cos(a) * r1, r1 + Math.sin(a) * r1]); }
      for (let i = 0; i <= cs; i++) { const a = (i / cs) * (Math.PI / 2); pts.push([Math.cos(a) * r2, h - r2 + Math.sin(a) * r2]); }
      return G.lathe(pts, seg);
    },
  });

  // A piece along a bone from a to b: make(len) returns geometry along +Y from 0 to len.
  FK.along = function (make, a, b) {
    const A = Array.isArray(a) ? V(a[0], a[1], a[2]) : a, B = Array.isArray(b) ? V(b[0], b[1], b[2]) : b;
    const d = B.clone().sub(A), len = d.length(), g = make(len);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(A, q, V(1, 1, 1)));
    return g;
  };

  // ---------- the builder: pieces in bind space, tagged by joint, baked to one mesh per joint ----------
  // color: a hex number, or fn(x, y, z) -> hex (evaluated per vertex, or per face when faceColor is set).
  function Builder(skel, opt) {
    this.skel = skel;
    this.faceColor = !!(opt && opt.faceColor);
    this.buckets = {};
    this.cache = new Map();
  }
  Builder.prototype.col = function (hex) {
    let c = this.cache.get(hex);
    if (!c) { c = lin(hex); this.cache.set(hex, c); }
    return c;
  };
  Builder.prototype.add = function (joint, geo, color, matrix, opt) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = p.count, arr = new Float32Array(n * 3);
    const faceC = (opt && opt.faceColor !== undefined) ? opt.faceColor : this.faceColor;
    if (typeof color === 'number') { const c = this.col(color); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; } }
    else if (faceC) {
      for (let i = 0; i < n; i += 3) {
        const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        const c = this.col(color(x, y, z, i / 3));
        for (let k = 0; k < 3; k++) { arr[(i + k) * 3] = c.r; arr[(i + k) * 3 + 1] = c.g; arr[(i + k) * 3 + 2] = c.b; }
      }
    } else for (let i = 0; i < n; i++) { const c = this.col(color(p.getX(i), p.getY(i), p.getZ(i), i)); arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', p);
    out.setAttribute('normal', g.attributes.normal);
    out.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    const key = joint + (opt && opt.noline ? '|nl' : '');
    (this.buckets[key] = this.buckets[key] || []).push(out);
    return this;
  };
  FK.Builder = Builder;
  function concat(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      P.set(g.attributes.position.array, o); N.set(g.attributes.normal.array, o); C.set(g.attributes.color.array, o);
      o += g.attributes.position.count * 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return g;
  }
  FK.concat = concat;
  // normals averaged over every vertex at the same place, so an inverted hull stays closed over hard edges
  FK.smoothNormals = function (g) {
    const p = g.attributes.position, n = g.attributes.normal, map = new Map(), key = (i) => Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000);
    for (let i = 0; i < p.count; i++) {
      const k = key(i); let a = map.get(k);
      if (!a) { a = [0, 0, 0]; map.set(k, a); }
      a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    }
    const out = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
      out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', p);
    g2.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return g2;
  };

  // ---------- skeleton ----------
  // s: { ankle, knee, hip, hipW, waist, shY, shW, elbow, wrist, neck, eyeY, eyeZ }. The figure faces +z; its left is +x.
  const PARENT = { pelvis: null, chest: 'pelvis', head: 'chest', eyes: 'head', uaL: 'chest', uaR: 'chest', faL: 'uaL', faR: 'uaR', thL: 'pelvis', thR: 'pelvis', shL: 'thL', shR: 'thR' };
  FK.skeleton = function (s) {
    const b = {
      pelvis: V(0, s.hip, 0), chest: V(0, s.waist, 0), head: V(0, s.neck, 0), eyes: V(0, s.eyeY, s.eyeZ),
      uaL: V(s.shW, s.shY, 0), uaR: V(-s.shW, s.shY, 0), faL: V(s.shW + 0.02, s.elbow, -0.01), faR: V(-s.shW - 0.02, s.elbow, -0.01),
      thL: V(s.hipW, s.hip, 0), thR: V(-s.hipW, s.hip, 0), shL: V(s.hipW, s.knee, 0.0), shR: V(-s.hipW, s.knee, 0.0),
    };
    const wL = V(s.shW + 0.035, s.wrist, 0.01), wR = V(-s.shW - 0.035, s.wrist, 0.01);
    return { s, bind: b, wrist: { L: wL, R: wR } };
  };

  // Turn a builder into a figure: joints as Object3Ds, one mesh per bucket. mats: { body, outline? (fn(geo) -> mesh) }
  FK.assemble = function (bld, mats) {
    const sk = bld.skel, root = new THREE.Group(), j = {};
    for (const name of Object.keys(PARENT)) {
      const o = new THREE.Group();
      o.name = name;
      j[name] = o;
    }
    for (const name of Object.keys(PARENT)) {
      const par = PARENT[name], o = j[name];
      o.position.copy(sk.bind[name]);
      if (par) o.position.sub(sk.bind[par]);
      (par ? j[par] : root).add(o);
    }
    let tris = 0;
    const meshes = [];
    for (const key of Object.keys(sk.bind).map((k) => [k, k + '|nl']).flat()) {
      const list = bld.buckets[key];
      if (!list) continue;
      const jn = key.split('|')[0], g = concat(list), off = sk.bind[jn];
      if (mats.shade) { const P = g.attributes.position, Cc = g.attributes.color; for (let i = 0; i < P.count; i++) { const k = mats.shade(P.getY(i), P.getZ(i)); Cc.setXYZ(i, Cc.getX(i) * k, Cc.getY(i) * k, Cc.getZ(i) * k); } }
      g.translate(-off.x, -off.y, -off.z);
      g.computeBoundingSphere();
      tris += g.attributes.position.count / 3;
      const m = new THREE.Mesh(g, mats.body);
      m.castShadow = true;
      j[jn].add(m);
      meshes.push(m);
      if (mats.outline && !key.endsWith('|nl')) j[jn].add(mats.outline(g));
    }
    // arm lengths and rest directions for the IK
    const arm = {};
    for (const side of ['L', 'R']) {
      const S = sk.bind['ua' + side], E = sk.bind['fa' + side], W = sk.wrist[side];
      arm[side] = { lu: S.distanceTo(E), lf: E.distanceTo(W), restU: E.clone().sub(S).normalize(), restF: W.clone().sub(E).normalize(), S: S.clone().sub(sk.bind.chest) };
    }
    return { root, j, tris: Math.round(tris), arm, sk, meshes };
  };

  // ---------- IK: two bones, targets in chest space ----------
  const _d = V(0, 0, 0), _u = V(0, 0, 0), _w = V(0, 0, 0), _e = V(0, 0, 0), _f = V(0, 0, 0), _q = new THREE.Quaternion(), _T = V(0, 0, 0);
  FK.solveArm = function (fig, side, T, pole) {
    const a = fig.arm[side], ua = fig.j['ua' + side], fa = fig.j['fa' + side];
    _d.copy(T).sub(a.S);
    const dist = clamp(_d.length(), 0.02, (a.lu + a.lf) * 0.998);
    _u.copy(_d).normalize();
    _T.copy(a.S).addScaledVector(_u, dist);
    const cosA = clamp((a.lu * a.lu + dist * dist - a.lf * a.lf) / (2 * a.lu * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    _w.copy(pole).addScaledVector(_u, -pole.dot(_u)).normalize();
    _e.copy(a.S).addScaledVector(_u, a.lu * cosA).addScaledVector(_w, a.lu * sinA);
    ua.quaternion.setFromUnitVectors(a.restU, _f.copy(_e).sub(a.S).normalize());
    _f.copy(_T).sub(_e).normalize().applyQuaternion(_q.copy(ua.quaternion).invert());
    fa.quaternion.setFromUnitVectors(a.restF, _f);
    fig.handDir = fig.handDir || {};
    (fig.handDir[side] = fig.handDir[side] || V(0, 0, 0)).copy(_T).sub(_e).normalize();
  };

  // ---------- idle animation ----------
  // A glance: the head turns to a look target now and then, holds, and comes back. Pure function of t.
  FK.glance = function (t, seed, period, amp) {
    const ph = (t + seed * 7.3) % period, k = smooth(ph / 1.1) * (1 - smooth((ph - period * 0.45) / 1.2));
    const dir = Math.sin(Math.floor((t + seed * 7.3) / period) * 12.9898 + seed) > 0 ? 1 : -1;
    return k * amp * dir;
  };
  FK.blink = function (t, seed) {
    const p = (t + seed * 1.7) % 3.9;
    return p < 0.14 ? 1 - Math.sin((p / 0.14) * Math.PI) * 0.92 : 1;
  };
  // A window 0 -> 1 -> 0 inside a repeating period: rises at a, falls at b, each edge e seconds.
  FK.cyc = function (t, period, a, b, e) {
    const p = t % period;
    return smooth((p - a) / e) * (1 - smooth((p - b) / e));
  };

  // ---------- the rifle frame: a rifle held across the body, muzzle up toward the left shoulder ----------
  // g: the pistol grip (bind space); returns the matrix and the two hand targets (bind space).
  FK.rifleFrame = function (g, tilt, len, dir) {
    const x = V(dir ? dir[0] : 0.6, dir ? dir[1] : 0.74, tilt).normalize(), z0 = V(0, 0, 1);
    const y = V(0, 0, 0).crossVectors(z0, x).normalize().negate();  // the carry handle: up and to the right
    if (y.y < 0) y.negate();
    const z = V(0, 0, 0).crossVectors(x, y).normalize();
    y.crossVectors(z, x).normalize();
    const G0 = V(g[0], g[1], g[2]);
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(G0);
    return {
      m,
      x, y, z,
      R: G0.clone().addScaledVector(y, -0.045 * len),
      L: G0.clone().addScaledVector(x, 0.42 * len).addScaledVector(y, -0.035 * len),
    };
  };

  // ---------- grass ----------
  // One blade as a swept cross-section along an arching spine. o: { h, w, t (thickness), bend, segs, sides (2 = flat
  // ribbon), tip (0 pointed .. 1 blunt), smooth (analytic normals) }. Built along +y, arching toward +x. Has aH (0..1).
  FK.blade = function (o) {
    const segs = o.segs || 5, sides = o.sides || 2, pos = [], nor = [], hh = [];
    const rings = [], norms = [];
    const C = (s) => V(o.bend * o.h * s * s, o.h * s * (1 - 0.3 * o.bend * s), 0);
    for (let i = 0; i <= segs; i++) {
      const s = i / segs, c = C(s), tg = C(Math.min(1, s + 0.01)).sub(C(Math.max(0, s - 0.01))).normalize();
      const Z = V(0, 0, 1), N = V(0, 0, 0).crossVectors(tg, Z).normalize();
      const tp = o.tip || 0, taper = i === segs ? 0.0 : Math.pow(1 - s, 0.7) * (1 - tp) + tp * Math.sqrt(Math.max(0, 1 - s * s));
      const wd = o.w * Math.max(taper, i === segs ? 0 : 0.05) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, s * 1.6))), th = (o.t || 0.004) * Math.max(taper, 0.1);
      const ring = [], nr = [];
      for (let k = 0; k < sides; k++) {
        const a = sides === 2 ? (k === 0 ? 0 : Math.PI) : (k / sides) * TAU;
        ring.push(c.clone().addScaledVector(Z, Math.cos(a) * wd).addScaledVector(N, Math.sin(a) * th));
        nr.push(V(0, 0, 0).addScaledVector(Z, Math.cos(a) * 0.35).addScaledVector(N, Math.sin(a) + (sides === 2 ? 1 : 0)).normalize());
      }
      rings.push(ring); norms.push(nr); hh.push(s);
    }
    const tri = (i1, k1, i2, k2, i3, k3) => {
      for (const [i, k] of [[i1, k1], [i2, k2], [i3, k3]]) {
        const p = rings[i][k], n = norms[i][k];
        pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); hhOut.push(hh[i]);
      }
    };
    const hhOut = [];
    const loop = sides === 2 ? 1 : sides;
    for (let i = 0; i < segs; i++) for (let k = 0; k < loop; k++) {
      const k2 = (k + 1) % sides;
      if (i === segs - 1) tri(i, k, i, k2, i + 1, k);
      else { tri(i, k, i, k2, i + 1, k2); tri(i, k, i + 1, k2, i + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(hhOut, 1));
    if (!o.smooth) g.computeVertexNormals();
    return g;
  };
  // Merge blades (each with aH and color) into one geometry.
  FK.concatH = function (list) {
    const g = FK.concat(list);
    let n = 0; for (const x of list) n += x.attributes.aH.count;
    const H = new Float32Array(n); let o = 0;
    for (const x of list) { H.set(x.attributes.aH.array, o); o += x.attributes.aH.count; }
    g.setAttribute('aH', new THREE.BufferAttribute(H, 1));
    return g;
  };
  // Colour a geometry's vertices: fn(x, y, z, h) -> hex (linear-converted), per face if faceColor.
  FK.paint = function (g, fn, faceColor) {
    const p = g.attributes.position, h = g.attributes.aH, n = p.count, arr = new Float32Array(n * 3), cache = new Map();
    const col = (hex) => { let c = cache.get(hex); if (!c) { c = lin(hex); cache.set(hex, c); } return c; };
    for (let i = 0; i < n; i += faceColor ? 3 : 1) {
      let c;
      if (faceColor) c = col(fn((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, h ? (h.getX(i) + h.getX(i + 1) + h.getX(i + 2)) / 3 : 0, i / 3));
      else c = col(fn(p.getX(i), p.getY(i), p.getZ(i), h ? h.getX(i) : 0, i));
      for (let k = 0; k < (faceColor ? 3 : 1); k++) { arr[(i + k) * 3] = c.r; arr[(i + k) * 3 + 1] = c.g; arr[(i + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  };
  // Wind sway for anything with aH: the tip moves most. The uniform is shared (FK.time.value = seconds).
  FK.time = { value: 0 };
  FK.SWAY_GLSL = [
    'float swH = aH * aH;',
    'vec4 swW = modelMatrix * vec4(position, 1.0);',
    'float swA = sin(uTime * 1.1 + swW.x * 0.55 + swW.z * 0.35) * 0.65 + sin(uTime * 2.4 + swW.x * 1.9 + swW.z * 1.3) * 0.22;',
    'transformed.x += swA * 0.09 * swH;',
    'transformed.z += sin(uTime * 0.83 + swW.z * 0.9 + swW.x * 0.2) * 0.04 * swH;',
  ].join('\n');
  FK.sway = function (m, tag) {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.uniforms.uTime = FK.time;
      sh.vertexShader = 'attribute float aH;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FK.SWAY_GLSL);
    };
    m.customProgramCacheKey = () => 'sway|' + (tag || '');
    return m;
  };

  // The whip antenna and the handset cord: chains of small segments placed each frame.
  FK.chain = function (n, make, mat) {
    const group = new THREE.Group(), segs = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(make(), mat); m.castShadow = true; group.add(m); segs.push(m); }
    const a = V(0, 0, 0), b = V(0, 0, 0), up = V(0, 1, 0);
    // pts: array of n+1 Vector3s in group space
    group.userData.set = function (pts) {
      for (let i = 0; i < n; i++) {
        a.copy(pts[i]); b.copy(pts[i + 1]);
        const s = segs[i], len = a.distanceTo(b);
        s.position.copy(a).add(b).multiplyScalar(0.5);
        s.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
        s.scale.set(1, len, 1);
      }
    };
    return group;
  };
})();
