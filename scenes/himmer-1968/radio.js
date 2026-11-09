// radio.js: the radio and command net made visible (DESIGN.md 7 "Radio messages", 9 Radio column; research.md 4).
// Each message is a held connection (Abram, 2026-11-09: "Instead of being 'sent' we should show a connection being
// held. Otherwise it looks like a missile."): a thin, steady, faintly glowing line between the two radios' antennas,
// bowed only slightly, that fades in over 0.5 s when the call opens, holds for the call with a slow carrier pulse
// running along it both ways, and fades out over 1 s. Nothing flies and nothing lands. A soft glow sits at each
// handset. A relayed call holds sender to relay, waits there with its clock running, then lights relay to the next
// mast. The Army sighting reaches out from its mast and connects to no one. Replies reuse the same line (one line per
// pair of radios, re-lit or pulsing the other way). The tag on the line: the time, a small radio glyph and the
// sender's short name. Words on screen come only from labels.js; the times only from labels.js or the chapter clock.
//
// Two draws: the lines (one ribbon mesh, a slot per lit pair), the tags and glows (one instanced billboard mesh).
// Everything is a pure function of ctx.chapter.id and ctx.cycle.t; nothing is allocated per frame.
//
// The API (window.radio, also the plug-in object):
//   radio.send({ ch, from, to, via: [], t0, dt, label, clock, received, hold, waitFrom, partial, run, jump, id, quiet })
//     from / to / via: a node name ('cp', 'relay', 'base', 'army', 'plane', 'cahill', 'banks', 'himmer', 'connelly',
//       'cargile', 'coA', 'coC', 'coD'), a THREE.Vector3, or a function (chapterId, t, out) -> Vector3
//     t0: loop seconds when the call opens; dt: how long the call holds after its last hop lights (at least 4 s)
//     label: the labels.js key (tapped for its words); clock: 'HHMM' shown on the tag (default label.sent; null: none)
//     received: 'HHMM' shown once the call has gone through, when it differs (default label.received)
//     hold: seconds between one hop lighting and the next (number or array; default 1.2); 'end' holds the call at
//       its last node to the end of the loop. waitFrom: every hop but the last is already held from the loop's start
//       and the last lights at t0 (the 1320 call waiting at the relay in chapter 6).
//     partial: the sighting that never arrives: a short segment reaches out this far (fraction) and fades.
//     run: the tag's clock runs with the chapter's while the call waits; jump: on going through it shows `received`.
//     quiet: no clock tag (the second and third withdraw lines would repeat the first).
//   radio.messages: { [chapterId]: [entries] } (what is scheduled); radio.clear(ch); radio.TIMING (the table below)
(function () {
  'use strict';
  const SLOTS = 14, SEG = 40, MAXG = 260;

  window.Scene.register({
    name: 'radio',
    init(ctx) {
      const { THREE, SITE } = ctx;
      const radio = this;
      window.radio = radio;
      const V = () => new THREE.Vector3();
      const clamp01 = (x) => Math.min(1, Math.max(0, x));
      const sm = ctx.smooth01;
      const hm = (s) => (s ? Number(String(s).slice(0, 2)) * 60 + Number(String(s).slice(2, 4)) : null);
      const LAB = window.LABELS || {};

      // ---------- where things are: works.masts and marines.radios when present, else SITE and the routes ----------
      const ext = (name) => window[name] || ctx[name] || (window.Scene && window.Scene[name]) || null;
      const MAST_H = 9, RADIO_H = 2.3;
      const tmpA = V(), tmpB = V();
      function lifted(p, h, out) {
        out.copy(p);
        const g = ctx.groundY(p.x, p.z);
        if (out.y - g < 1) out.y = g + h;
        return out;
      }
      function along(route, f, out) {
        let total = 0;
        for (let i = 1; i < route.length; i++) total += route[i].distanceTo(route[i - 1]);
        let d = clamp01(f) * total;
        for (let i = 1; i < route.length; i++) {
          const L = route[i].distanceTo(route[i - 1]);
          if (d <= L || i === route.length - 1) { out.lerpVectors(route[i - 1], route[i], L ? Math.min(1, d / L) : 0); break; }
          d -= L;
        }
        out.y = ctx.groundY(out.x, out.z);
        return out;
      }
      function fromExt(group, key, out, h) {
        const g = ext(group);
        const src = g && (group === 'works' ? g.masts : g.radios);
        let p = src && src[key];
        if (typeof p === 'function') p = p();
        if (p && p.isVector3) { lifted(p, h, out); return true; }
        return false;
      }
      // fallback positions of the radiomen, by chapter and loop time (until marines.radios exists)
      const offs = (p, dx, dz, out) => { out.set(p.x + dx, 0, p.z + dz); out.y = ctx.groundY(out.x, out.z); return out; };
      const people = {
        cahill(ch, t, L, out) {
          if (ch <= 3) return out.copy(SITE.cp);
          if (ch === 4) { out.lerpVectors(SITE.cp, SITE.perimSW, sm((t / L - 0.25) / 0.6)); out.y = ctx.groundY(out.x, out.z); return out; }
          if (ch === 5) return along(SITE.routes.C, 0.95 * t / L, out);
          if (ch === 6) return offs(SITE.charliePause, 10, 14, out);
          if (ch === 7) { tmpA.copy(offs(SITE.charliePause, 10, 14, tmpB)); out.lerpVectors(tmpA, SITE.czlz, sm((t / L - 0.1) / 0.5)); out.y = ctx.groundY(out.x, out.z); return out; }
          return out.copy(SITE.czlz);
        },
        banks: (ch, t, L, out) => offs(SITE.northEnd, 6, 8, out),
        himmer: (ch, t, L, out) => offs(SITE.charliePause, -3, 4, out),
        connelly: (ch, t, L, out) => offs(SITE.charliePause, 4, 6, out),
        cargile: (ch, t, L, out) => { out.copy(SITE.deltaStart).addScaledVector(SITE.deltaAxis, 50); out.y = ctx.groundY(out.x, out.z); return out; },
        coA: (ch, t, L, out) => offs(SITE.northEnd, 0, 0, out),
        coC: (ch, t, L, out) => offs(SITE.charliePause, 0, 0, out),
        coD: (ch, t, L, out) => { out.copy(SITE.deltaStart).addScaledVector(SITE.deltaAxis, 60); out.y = ctx.groundY(out.x, out.z); return out; },
      };
      const radioKey = { cahill: 'cahill', banks: 'banks', himmer: 'himmer', connelly: 'connelly', cargile: 'cargile', cp: 'cp' };
      function resolve(node, out, chAt, tAt) {
        const ch = chAt || ctx.chapter.id, t = tAt !== undefined ? tAt : ctx.cycle.t;
        const L = (ctx.CHAPTERS.find((c) => c.id === ch) || ctx.chapter).loop;
        if (node && node.isVector3) return lifted(node, MAST_H, out);
        if (typeof node === 'function') return node(ch, t, out) || out;
        switch (node) {
          case 'relay': if (!fromExt('works', 'relay', out, MAST_H)) lifted(SITE.relayMast, MAST_H, out); return out;
          case 'base': if (!fromExt('works', 'base', out, MAST_H)) lifted(SITE.base, MAST_H, out); return out;
          case 'army': if (!fromExt('works', 'army', out, MAST_H)) lifted(SITE.armyMast, MAST_H, out); return out;
          case 'cp': if (!fromExt('marines', 'cp', out, RADIO_H)) { out.copy(SITE.cp); out.y += 6; } return out;
          case 'plane': {
            const m = ext('medevac'), p = m && (typeof m.plane === 'function' ? m.plane() : m.plane);
            if (p && p.isVector3) return out.copy(p);
            const a = t / 30 * Math.PI * 2;
            return out.set(SITE.battleSummit.x + Math.cos(a) * 70, SITE.battleSummit.y + 110, SITE.battleSummit.z + Math.sin(a) * 70);
          }
        }
        if (radioKey[node] && fromExt('marines', radioKey[node], out, RADIO_H)) return out;
        if (people[node]) { people[node](ch, t, L, out); out.y += RADIO_H; return out; }
        console.warn('radio: no node ' + node);
        return out.copy(SITE.cp);
      }
      // the sender's short name on the tag, only where labels.js gives that word (labels.js has no "CP")
      const SHORT = { banks: 'Banks', cahill: 'Cahill', connelly: 'Connelly', base: 'Meyers' };

      // ---------- materials: premultiplied blend, so a fragment can both glow (rgb) and lift a faint shade (alpha) ----------
      const blend = { transparent: true, depthWrite: false, fog: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation };
      const U = {
        uCol: { value: new THREE.Color() }, uBright: { value: 1 }, uShade: { value: 0.2 },
        uVP: { value: new THREE.Vector2(1920, 1080) }, uT: { value: 0 },
      };
      const gl = {};
      const vec4s = () => Array.from({ length: SLOTS }, () => new THREE.Vector4());

      // the lines: SLOTS ribbons of SEG segments, shaped in the shader from per-slot uniforms
      // uA: a.xyz, bow (m); uB: b.xyz, alpha; uS: reach (fraction lit from a), speaking weight a->b, seed, unused
      const lineU = Object.assign({ uA: { value: vec4s() }, uB: { value: vec4s() }, uS: { value: vec4s() } }, U);
      {
        const n = SLOTS * (SEG + 1) * 2, slot = new Float32Array(n), u = new Float32Array(n), side = new Float32Array(n), pos = new Float32Array(n * 3), idx = [];
        let k = 0;
        for (let s = 0; s < SLOTS; s++) for (let i = 0; i <= SEG; i++) for (let j = 0; j < 2; j++) { slot[k] = s; u[k] = i / SEG; side[k] = j ? 1 : -1; k++; }
        for (let s = 0; s < SLOTS; s++) for (let i = 0; i < SEG; i++) { const a = (s * (SEG + 1) + i) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aSlot', new THREE.BufferAttribute(slot, 1));
        g.setAttribute('aU', new THREE.BufferAttribute(u, 1));
        g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
        g.setIndex(idx);
        const m = new THREE.ShaderMaterial(Object.assign({
          uniforms: lineU,
          vertexShader: `
            uniform vec4 uA[${SLOTS}]; uniform vec4 uB[${SLOTS}]; uniform vec4 uS[${SLOTS}];
            attribute float aSlot; attribute float aU; attribute float aSide;
            varying float vU; varying float vSide; varying vec4 vS; varying float vA; varying float vLen;
            void main() {
              int s = int(aSlot + 0.5);
              vec4 A = uA[s]; vec4 B = uB[s];
              vS = uS[s]; vA = B.w; vU = aU; vSide = aSide; vLen = length(B.xyz - A.xyz);
              vec3 p = mix(A.xyz, B.xyz, aU) + vec3(0.0, A.w * 4.0 * aU * (1.0 - aU), 0.0);
              vec3 T = normalize((B.xyz - A.xyz) + vec3(0.0, A.w * 4.0 * (1.0 - 2.0 * aU), 0.0));
              vec3 toCam = cameraPosition - p;
              float dist = length(toCam);
              vec3 sideV = normalize(cross(T, toCam / dist));
              float w = max(0.05, dist * 0.0012);
              if (B.w < 0.001) p = vec3(0.0, -9999.0, 0.0);
              gl_Position = projectionMatrix * viewMatrix * vec4(p + sideV * aSide * w, 1.0);
            }`,
          fragmentShader: `
            uniform vec3 uCol; uniform float uBright; uniform float uShade; uniform float uT;
            varying float vU; varying float vSide; varying vec4 vS; varying float vA; varying float vLen;
            void main() {
              float reach = vS.x, speak = vS.y, seed = vS.z;
              if (vU > reach) discard;
              float across = 1.0 - abs(vSide);
              float core = smoothstep(0.0, 0.85, across);
              // the carrier: slow soft swells running both ways along the held line, stronger from the speaker
              float span = max(0.04, 10.0 / max(vLen, 1.0));
              float f1 = fract(uT * 0.22 + seed), f2 = fract(uT * 0.17 + seed + 0.5);
              float p1 = exp(-pow((vU - f1) / span, 2.0)), p2 = exp(-pow((vU - (1.0 - f2)) / span, 2.0));
              float carrier = p1 * mix(0.25, 0.6, speak) + p2 * mix(0.6, 0.25, speak);
              float k = (0.5 + carrier) * vA;
              if (reach < 0.999) k *= 1.0 - smoothstep(reach * 0.45, reach, vU);   // the sighting thins out into nothing
              vec3 c = mix(uCol, vec3(1.0, 0.98, 0.92), carrier * 0.35) * k * core * uBright;
              float a = uShade * k * core * 0.5;
              gl_FragColor = vec4(c, clamp(a, 0.0, 0.4));
            }`,
        }, blend));
        const mesh = gl.lineMesh = new THREE.Mesh(g, m);
        mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.userData.dynamic = true;
        ctx.scene.add(mesh);
      }

      // the tags and glows: instanced screen-sized billboards from a small atlas (digits, arrow, dot, glow, pill,
      // radio glyph; one row per short name)
      const COLS = 4, ROWS = 8, NAME_ROW0 = 5;
      const CELL = { arrow: 10, dot: 11, glow: 12, pillL: 13, pillM: 14, pillR: 15, radio: 16 };
      const NAMES = ['Banks', 'Cahill', 'Connelly', 'Meyers'];
      const atlas = (() => {
        const S = 64, cv = document.createElement('canvas'); cv.width = S * COLS; cv.height = S * ROWS;
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 54px "Helvetica Neue", Helvetica, Arial, sans-serif';
        const at = (i) => [(i % COLS) * S, Math.floor(i / COLS) * S];
        for (let i = 0; i < 10; i++) { const [x, y] = at(i); g.fillText(String(i), x + S / 2, y + S / 2 + 2); }
        { const [x, y] = at(CELL.arrow); g.lineWidth = 5; g.beginPath(); g.moveTo(x + 12, y + 32); g.lineTo(x + 50, y + 32); g.moveTo(x + 38, y + 20); g.lineTo(x + 51, y + 32); g.lineTo(x + 38, y + 44); g.stroke(); }
        { const [x, y] = at(CELL.dot); g.beginPath(); g.arc(x + 32, y + 34, 5, 0, Math.PI * 2); g.fill(); }
        { const [x, y] = at(CELL.glow); const gr = g.createRadialGradient(x + 32, y + 32, 0, x + 32, y + 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, S, S); g.fillStyle = '#fff'; }
        { const [x, y] = at(CELL.pillL); g.beginPath(); g.arc(x + 64, y + 32, 26, Math.PI / 2, Math.PI * 1.5); g.fill(); }
        { const [x, y] = at(CELL.pillM); g.fillRect(x, y + 6, S, 52); }
        { const [x, y] = at(CELL.pillR); g.beginPath(); g.arc(x, y + 32, 26, -Math.PI / 2, Math.PI / 2); g.fill(); }
        // the radio glyph: two concentric arcs over a dot
        { const [x, y] = at(CELL.radio); g.lineWidth = 5.5; g.lineCap = 'round';
          g.beginPath(); g.arc(x + 32, y + 44, 6, 0, Math.PI * 2); g.fill();
          for (const r of [15, 26]) { g.beginPath(); g.arc(x + 32, y + 44, r, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke(); } }
        // the short names, one row each, small caps-free serif-less text centred in the row
        g.font = '600 40px "Helvetica Neue", Helvetica, Arial, sans-serif';
        NAMES.forEach((nm, i) => g.fillText(nm, S * COLS / 2, (NAME_ROW0 + i) * S + S / 2 + 2));
        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
        return tex;
      })();
      {
        const base = new THREE.PlaneGeometry(1, 1);
        const g = new THREE.InstancedBufferGeometry();
        g.index = base.index;
        g.setAttribute('position', base.attributes.position);
        g.setAttribute('uv', base.attributes.uv);
        const mk = (name, size) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(MAXG * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; };
        gl.pos = mk('iPos', 3); gl.off = mk('iOff', 4); gl.cell = mk('iCell', 1); gl.col = mk('iCol', 4);
        g.instanceCount = 0;
        gl.geo = g;
        const m = new THREE.ShaderMaterial(Object.assign({
          uniforms: Object.assign({ uAtlas: { value: atlas } }, U),
          vertexShader: `
            uniform vec2 uVP;
            attribute vec3 iPos; attribute vec4 iOff; attribute float iCell; attribute vec4 iCol;
            varying vec2 vUv; varying vec4 vCol;
            void main() {
              vec4 c = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
              float k = uVP.y / 1080.0;
              vec2 px = (iOff.xy + position.xy * iOff.zw) * k;
              c.xy += px * 2.0 / uVP * c.w;
              if (c.w < 0.0 || iCol.a <= 0.0) c = vec4(0.0, 0.0, 2.0, 1.0);
              gl_Position = c;
              if (iCell >= 99.5) {
                float row = iCell - 100.0 + ${NAME_ROW0}.0;
                vUv = vec2(uv.x, 1.0 - (row + 1.0 - uv.y) / ${ROWS}.0);
              } else {
                float cx = mod(iCell, ${COLS}.0), cy = floor(iCell / ${COLS}.0);
                vUv = vec2((cx + uv.x) / ${COLS}.0, 1.0 - (cy + 1.0 - uv.y) / ${ROWS}.0);
              }
              vCol = iCol;
            }`,
          fragmentShader: `
            uniform sampler2D uAtlas;
            varying vec2 vUv; varying vec4 vCol;
            void main() {
              float m = texture2D(uAtlas, vUv).r;
              // vCol.a > 1.5 marks a dark backing (shade only); else glowing ink
              if (vCol.a > 1.5) gl_FragColor = vec4(vCol.rgb * m, (vCol.a - 2.0) * m);
              else gl_FragColor = vec4(vCol.rgb * m * vCol.a, 0.12 * m * vCol.a);
            }`,
          depthTest: false,
        }, blend));
        const mesh = gl.mesh = new THREE.Mesh(g, m);
        mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.userData.dynamic = true;
        ctx.scene.add(mesh);
      }
      let gN = 0;
      const INK = ctx.lin(0xfff1cf), PILL = ctx.lin(0x1a1610), NAMEINK = ctx.lin(0xe6d6ac);
      function glyph(p, ox, oy, w, h, cell, r, g, b, a) {
        if (gN >= MAXG) return;
        const i = gN++;
        gl.pos.array[i * 3] = p.x; gl.pos.array[i * 3 + 1] = p.y; gl.pos.array[i * 3 + 2] = p.z;
        gl.off.array[i * 4] = ox; gl.off.array[i * 4 + 1] = oy; gl.off.array[i * 4 + 2] = w; gl.off.array[i * 4 + 3] = h;
        gl.cell.array[i] = cell;
        gl.col.array[i * 4] = r; gl.col.array[i * 4 + 1] = g; gl.col.array[i * 4 + 2] = b; gl.col.array[i * 4 + 3] = a;
      }
      // a tag: [radio glyph] HHMM (→ HHMM | ···), the sender's short name under it; centred above p, raised by `lift` px
      const DW = 11.5, DH = 22, NAME_W = [62, 58, 76, 70];
      const digits = [0, 0, 0, 0, 0, 0, 0, 0];
      function putTime(m, at) {
        m = ((Math.round(m) % 1440) + 1440) % 1440;
        const h = Math.floor(m / 60), mi = m % 60;
        digits[at] = Math.floor(h / 10); digits[at + 1] = h % 10; digits[at + 2] = Math.floor(mi / 10); digits[at + 3] = mi % 10;
      }
      function tagAt(p, a, m0, m1, waiting, name, t, lift) {
        if (a <= 0.01) return;
        const hasT = m0 !== null && m0 !== undefined, two = hasT && m1 !== null && m1 !== undefined;
        if (hasT) putTime(m0, 0);
        if (two) putTime(m1, 4);
        const nGl = (hasT ? 4 : 0) + (two ? 5 : 0) + (waiting ? 4 : 0);
        const gw = 20, w = gw + (nGl ? 4 + nGl * DW : 0) + (two ? 6 : 0), y = 40 + lift;
        const pa = 2 + 0.62 * a;
        glyph(p, -w / 2 - 6, y, 26, 26, CELL.pillL, PILL.r, PILL.g, PILL.b, pa);
        glyph(p, 0, y, Math.max(1, w - 14), 26, CELL.pillM, PILL.r, PILL.g, PILL.b, pa);
        glyph(p, w / 2 + 6, y, 26, 26, CELL.pillR, PILL.r, PILL.g, PILL.b, pa);
        let x = -w / 2 + gw / 2;
        glyph(p, x, y + 1, 22, 22, CELL.radio, INK.r, INK.g, INK.b, a * 0.9);
        x += gw / 2 + 4 + DW / 2;
        if (hasT) for (let i = 0; i < 4; i++, x += DW) glyph(p, x, y, DH * 1.15, DH * 1.15, digits[i], INK.r, INK.g, INK.b, a);
        if (two) {
          x += 3; glyph(p, x, y, DH * 1.15, DH * 1.15, CELL.arrow, INK.r, INK.g, INK.b, a * 0.85); x += DW + 3;
          for (let i = 4; i < 8; i++, x += DW) glyph(p, x, y, DH * 1.15, DH * 1.15, digits[i], INK.r, INK.g, INK.b, a);
        }
        if (waiting) {
          x += 3; glyph(p, x, y, DH * 1.15, DH * 1.15, CELL.arrow, INK.r, INK.g, INK.b, a * 0.85); x += DW + 3;
          for (let i = 0; i < 3; i++, x += DW) glyph(p, x, y, DH * 1.15, DH * 1.15, CELL.dot, INK.r, INK.g, INK.b, a * (0.35 + 0.65 * sm(Math.sin(t * 3.2 - i * 0.9) * 0.5 + 0.5)));
        }
        if (name >= 0) {
          const nw = NAME_W[name], ny = y - 22;
          glyph(p, -nw / 2, ny, 18, 18, CELL.pillL, PILL.r, PILL.g, PILL.b, 2 + 0.5 * a);
          glyph(p, 0, ny, nw - 8, 18, CELL.pillM, PILL.r, PILL.g, PILL.b, 2 + 0.5 * a);
          glyph(p, nw / 2, ny, 18, 18, CELL.pillR, PILL.r, PILL.g, PILL.b, 2 + 0.5 * a);
          glyph(p, 0, ny, 64, 16, 100 + name, NAMEINK.r, NAMEINK.g, NAMEINK.b, a * 0.95);
        }
      }

      // ---------- the schedule ----------
      const messages = radio.messages = {};
      function plan(e) {
        const nodes = [e.from, ...e.via, e.to];
        const nL = nodes.length - 1;
        e.nodes = nodes; e.nL = nL;
        // when each hop lights
        e.starts = [];
        let t = e.t0;
        if (e.waitFrom) { for (let i = 0; i < nL - 1; i++) e.starts.push(-1e3); e.starts.push(e.t0); }
        else for (let i = 0; i < nL; i++) {
          e.starts.push(t);
          const h = Array.isArray(e.hold) ? e.hold[i] : (typeof e.hold === 'number' && e.hold > 0 ? e.hold : 1.2);
          t += h;
        }
        e.tLast = e.starts[nL - 1];
        e.dur = Math.max(4, typeof e.dt === 'number' ? e.dt : 0, e.dur || 0);
        e.tEnd = e.tLast + e.dur;
      }
      radio.send = function (spec) {
        const L = LAB[spec.label] || null;
        const e = Object.assign({ via: [], hold: 0, partial: 0, run: false, waitFrom: false }, spec);
        e.ch = spec.ch || ctx.chapter.id;
        e.id = spec.id || (spec.label || 'msg') + '@' + e.ch + ':' + e.t0;
        e.sentM = hm(spec.clock !== undefined ? spec.clock : L && L.sent && !String(L.sent).includes('·') ? L.sent : null);
        e.recvM = hm(spec.received !== undefined ? spec.received : L && L.received);
        if (e.recvM === e.sentM) e.recvM = null;
        e.anchor = V(); e.vis = 0;
        e.p = Array.from({ length: e.via.length + 2 }, V);
        e.name = typeof e.from === 'string' && SHORT[e.from] ? NAMES.indexOf(SHORT[e.from]) : -1;
        plan(e);
        (messages[e.ch] = messages[e.ch] || []).push(e);
        if (spec.label && L && !spec.noTag) {
          ctx.tag(spec.label, () => e.anchor, { r: 6, ringY: undefined, when: () => ctx.chapter.id === e.ch && e.vis > 0.05, onTap: () => focusSender(e) });
        }
        return e;
      };
      radio.clear = (ch) => { if (ch) delete messages[ch]; else for (const k in messages) delete messages[k]; };
      function focusSender(e) {
        resolve(e.nodes[0], tmpA);
        const f = ctx.focus || ctx.focusOn || ctx.lookAt || (window.Scene && window.Scene.focus);
        if (typeof f === 'function') f(tmpA.clone(), { dist: 60 });
      }

      // ---------- the timing table (DESIGN.md 9; research.md 4). t0 is loop seconds; the clock column is the
      // chapter's own clock at t0, from clock0..clock1 across the loop. dt is how long the call holds. ----------
      const at = (ch, hhmm) => { if (ctx.clockT) return ctx.clockT(ch, hhmm); const C = ctx.CHAPTERS.find((c) => c.id === ch); return (hm(hhmm) - C.m0) / (C.m1 - C.m0) * C.loop; };
      const TIMING = radio.TIMING = [
        // ch 1, 0600 held: SitRep #1, 1/9 out to the 26th Marines, through the relay (ComdC p. 36)
        { ch: 1, label: 'msg_sitrep1', from: 'cp', via: ['relay'], to: 'base', t0: 9, dt: 5 },
        // ch 3, 1000-1200: Banks's report, Cahill's offer, Banks's refusal, times silent (DY p. 313); spot reports
        // at 1020 and 1145 (ComdC p. 36; 0959 falls before the loop opens). The offer and the refusal re-light the
        // same Banks-CP line, the refusal speaking the other way.
        { ch: 3, label: 'msg_spotreps', from: 'cp', via: ['relay'], to: 'base', t0: at(3, '1020'), clock: '1020' },
        { ch: 3, label: 'msg_squad', from: 'banks', to: 'cp', t0: 34, clock: null, dt: 5 },
        { ch: 3, label: 'msg_offer', from: 'cp', to: 'banks', t0: 44, clock: null, dt: 4.5 },
        { ch: 3, label: 'msg_offer', from: 'banks', to: 'cp', t0: 50, clock: null, id: 'refusal', noTag: true, dt: 4.5 },
        { ch: 3, label: 'msg_spotreps', from: 'cp', via: ['relay'], to: 'base', t0: at(3, '1145'), clock: '1145' },
        // ch 4, 1200-1320: Banks asks for help at noon (Q5); Cahill to Meyers at 1320, through the CP to the relay,
        // where it holds with its clock running to the end of the chapter
        { ch: 4, label: 'msg_noon', from: 'banks', to: 'cp', t0: 1.2, dt: 6 },
        { ch: 4, label: 'msg_commit', from: 'cahill', via: ['cp'], to: 'relay', t0: 83.5, hold: 'end', run: true },
        // ch 5, 1230-1435: the 1320 call opens in this chapter's clock and holds at the relay to the end; the Army
        // sighting once per loop, no time; P1 at 1430 (HN)
        { ch: 5, label: 'msg_army', from: 'army', to: 'cp', t0: 40, partial: 0.55, clock: null },
        { ch: 5, label: 'msg_commit', from: 'cahill', via: ['cp'], to: 'relay', t0: at(5, '1320'), hold: 'end', run: true },
        { ch: 5, label: 'msg_move1st', from: 'cahill', to: 'himmer', t0: at(5, '1430') - 1.5, dt: 4.5 },
        // ch 6, 1435-1500: the 1320 call holds Cahill to the relay from the chapter's start with its clock running,
        // goes through to the base in the last seconds (tag 1320 → 1543: the received time stated, not run up to);
        // Meyers' query and Cahill's decline follow on the same lines; Connelly's cease fire
        { ch: 6, label: 'msg_ceasefire', from: 'connelly', to: 'base', t0: 46, clock: null, dt: 5 },
        { ch: 6, label: 'msg_commit', from: 'cahill', via: ['relay'], to: 'base', t0: 75, dt: 4, waitFrom: true, run: true, jump: true },
        { ch: 6, label: 'msg_status', from: 'base', via: ['relay'], to: 'cahill', t0: 80, dt: 4, hold: 0.6 },
        { ch: 6, label: 'msg_decline', from: 'cahill', via: ['relay'], to: 'base', t0: 85.5, dt: 4, hold: 0.6, clock: null },
        // ch 7, 1500-1805: the withdrawal order, about 1730, to the companies; to Hartzell and Donnelly about 1745
        { ch: 7, label: 'msg_withdraw', from: 'cahill', to: 'coA', t0: at(7, '1730'), dt: 8 },
        { ch: 7, label: 'msg_withdraw', from: 'cahill', to: 'coC', t0: at(7, '1730') + 0.3, id: 'w-c', noTag: true, quiet: true, dt: 8 },
        { ch: 7, label: 'msg_withdraw', from: 'cahill', to: 'coD', t0: at(7, '1730') + 0.6, id: 'w-d', noTag: true, quiet: true, dt: 8 },
        { ch: 7, label: 'msg_withdraw', from: 'cahill', to: 'cp', t0: at(7, '1745'), clock: '1745', id: 'w-cp', dt: 8 },
        // ch 11, 0630-1200: the air observer's sighting to the CP, 0900 (ComdC p. 11)
        { ch: 11, label: 'msg_ao', from: 'plane', to: 'cp', t0: at(11, '0900'), dt: 5 },
      ];
      for (const row of TIMING) radio.send(row);

      // ---------- per frame: one line per pair of radios ----------
      const slots = Array.from({ length: SLOTS }, () => ({ na: null, nb: null, a: V(), b: V(), alpha: 0, start: -1e9, reach: 1, tags: 0 }));
      let nS = 0;
      function light(na, nb, pa, pb, alpha, start, reach) {
        let s = null;
        for (let i = 0; i < nS; i++) { const q = slots[i]; if ((q.na === na && q.nb === nb) || (q.na === nb && q.nb === na)) { s = q; break; } }
        if (!s) { if (nS >= SLOTS) return null; s = slots[nS++]; s.na = na; s.nb = nb; s.alpha = 0; s.start = -1e9; s.tags = 0; s.reach = reach; s.a.copy(pa); s.b.copy(pb); }
        if (start >= s.start) { s.start = start; s.a.copy(pa); s.b.copy(pb); s.reach = reach; }   // the newest call speaks
        s.alpha = Math.max(s.alpha, alpha);
        return s;
      }
      const P = V(), NDC = V();
      const dayCol = ctx.lin(0xffe0a0), nightCol = ctx.lin(0xffe7b8);
      const bowOf = (a, b) => Math.min(3.5, a.distanceTo(b) * 0.018) + Math.abs(a.y - b.y) * 0.04;
      function pointOn(s, u, out) { out.lerpVectors(s.a, s.b, u); out.y += bowOf(s.a, s.b) * 4 * u * (1 - u); return out; }
      radio.update = function (tAbs) {
        const t = ctx.cycle.t, L = ctx.cycle.length, day = ctx.light.day;
        U.uVP.value.set(innerWidth, innerHeight);
        U.uT.value = tAbs;
        U.uCol.value.copy(dayCol).lerp(nightCol, 1 - day);
        U.uBright.value = 0.95 + 0.7 * (1 - day);
        U.uShade.value = 0.35 * day;
        gN = 0; nS = 0;
        const list = messages[ctx.chapter.id] || [];
        for (const e of list) {
          e.vis = 0; e.slot = null; e.nLit = 0;
          if (!e.hops) e.hops = new Array(e.nL).fill(null);
          if (t < e.starts[0] - 0.01 && !e.waitFrom) continue;
          for (let i = 0; i < e.nodes.length; i++) resolve(e.nodes[i], e.p[i]);
          const endHold = e.hold === 'end';
          let out;
          if (e.partial) out = 1 - sm((t - (e.t0 + 3.6)) / 1.0);
          else if (endHold) out = 1 - sm((t - (L - 1.3)) / 1.0);
          else out = 1 - sm((t - e.tEnd) / 1.0);
          if (out <= 0) continue;
          for (let k = 0; k < e.nL; k++) {
            const ts = e.starts[k];
            if (t < ts) break;
            const inA = ts < -100 ? sm(t / 0.5) : sm((t - ts) / 0.5);
            const a = Math.min(inA, out);
            if (a <= 0.001) continue;
            let reach = 1;
            if (e.partial) {
              const d = e.p[k].distanceTo(e.p[k + 1]);
              reach = Math.min(e.partial * 0.6, 140 / Math.max(1, d)) * (0.35 + 0.65 * sm((t - ts) / 1.4));
            }
            const s = light(e.nodes[k], e.nodes[k + 1], e.p[k], e.p[k + 1], a, ts, reach);
            if (s) { e.slot = s; e.hops[e.nLit++] = s; e.vis = Math.max(e.vis, a); }
          }
          const s = e.slot;
          if (!s) continue;
          // the tag sits on the line: the newest hop's midpoint, else the first point of any lit hop that is in
          // frame (near the speaker's end first: s.a is the speaker's end)
          if (s.reach < 1) pointOn(s, s.reach * 0.6, P);
          else {
            let found = false;
            // final pass: 0.05 too, so a long hop seen from near its speaker (ch 6, Cahill to the relay) still carries its tag
            for (let h = e.nLit - 1; h >= 0 && !found; h--) for (let c = 0; c < 4 && !found; c++) {
              pointOn(e.hops[h], c === 0 ? 0.5 : c === 1 ? 0.15 : c === 2 ? 0.85 : 0.05, P);
              NDC.copy(P).project(ctx.camera);
              found = Math.abs(NDC.x) < 0.9 && NDC.y > -0.97 && NDC.y < 0.8 && NDC.z < 1;   // the tag rises 40 px above its point
            }
            if (!found) pointOn(s, 0.5, P);
          }
          e.anchor.copy(P);
          if (e.quiet) continue;
          // the clock
          const m0 = e.sentM;
          let m1 = null, waiting = false;
          const now = Math.max(e.sentM || 0, ctx.chapter.minutes);
          if (m0 !== null && e.run && endHold) {
            if (t >= e.tLast) { if (now > m0 + 0.5) m1 = now; else waiting = true; }
          } else if (m0 !== null && e.run && e.waitFrom) {
            if (t < e.t0) { if (now > m0 + 0.5) m1 = now; else waiting = true; } else m1 = e.recvM;
          } else if (m0 !== null && e.recvM !== null && t >= e.tLast) m1 = e.recvM;
          tagAt(e.anchor, e.vis, m0, m1, waiting, e.name, tAbs, s.tags * 46);
          s.tags++;
        }
        // the lines and the glows at the handsets
        const A = lineU.uA.value, B = lineU.uB.value, S = lineU.uS.value, c = U.uCol.value;
        for (let i = 0; i < SLOTS; i++) {
          if (i >= nS) { B[i].w = 0; continue; }
          const s = slots[i];
          A[i].set(s.a.x, s.a.y, s.a.z, bowOf(s.a, s.b));
          B[i].set(s.b.x, s.b.y, s.b.z, s.alpha);
          S[i].set(s.reach, 1, (i * 0.37) % 1, 0);
          const g = s.alpha * (0.6 + 0.15 * Math.sin(tAbs * 1.9 + i));
          glyph(s.a, 0, 0, 16, 16, CELL.glow, c.r, c.g, c.b, g);
          if (s.reach >= 1) glyph(s.b, 0, 0, 16, 16, CELL.glow, c.r, c.g, c.b, g);
        }
        gl.geo.instanceCount = gN;
        gl.lineMesh.visible = nS > 0; gl.mesh.visible = gN > 0;
        gl.pos.needsUpdate = gl.off.needsUpdate = gl.cell.needsUpdate = gl.col.needsUpdate = true;
      };
    },
  });
})();
