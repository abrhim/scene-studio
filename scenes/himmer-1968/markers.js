// markers.js: the sides marked on the ground (DECISIONS.md, ground-marker ruling, 2026-11-09). The uniforms stay
// nearly identical, as the record has them; the ground says who is who. Two modes, chosen in the story panel header
// ("Off · Groups · Each man"), with M (cycles), ?markers=off|groups|each, remembered in localStorage:
//   groups  a soft blue haze under each Marine group (company, or platoon when a company is split more than 25 m;
//           the CP staff is one group), moving with it; Rider's file carries a moving red halo in chapter 5.
//   each    a small soft disc (0.8 m) under each Marine's hips, blue, dimmer (0.2) when he is down; a red one under
//           each NVA man only while he is seen (slits, lids, Rider's file). Fades with distance (full to 60 m from the
//           camera, gone by 200 m).
// In both modes every enemy position (horseshoe, north end, second position, spider-hole clusters) carries a soft
// red stain at 0.15 from chapter 1 (Abram, 2026-11-09), pulsing to 0.3 for 2 s when it first fires in a chapter
// (fire.js's timing table). Nothing at all in chapters 9-10 (night, first light); x0.6 at dusk (8).
// Sample switches (not in the UI): ?markerStyle=map (firmer, stronger groups), ?markerRed=stain (no NVA-man discs).
//
// Two draws at most: the large discs (group hazes and stains) and the small per-man discs, each one merged mesh of
// polar discs draped on the terrain on the CPU (large discs only when they move). No per-frame allocation.
// Exposes window.MARKERS = { mode, setMode(m), tracks, positions, stats }.
(function () {
  'use strict';
  const MODES = ['off', 'groups', 'each'];
  const LS = 'himmer1968.markers';

  window.Scene.register({
    name: 'markers',
    init(ctx) {
      const { THREE } = ctx;
      const params = new URLSearchParams(location.search);
      const MAP = params.get('markerStyle') === 'map';
      const STAIN_ONLY = params.get('markerRed') === 'stain';   // sample D: no discs under NVA men
      const sm = ctx.smooth01;
      let mode = 'groups';
      try { const s = localStorage.getItem(LS); if (MODES.includes(s)) mode = s; } catch (e) { /* storage blocked */ }
      { const q = params.get('markers'); if (q === '0') mode = 'off'; else if (MODES.includes(q)) mode = q; }
      const M = (window.MARKERS = { mode, tracks: [], positions: [], stats: {} });

      const BLUE = new THREE.Color(0x3b78e0), RED = new THREE.Color(0xc8324a);

      // ---------- a pool of polar discs in one mesh; per-vertex alpha and side, written per slot ----------
      function pool(slots, rings, segs, soft, lift) {
        const vps = 1 + rings * segs, n = slots * vps;
        const pos = new Float32Array(n * 3), fr = new Float32Array(n), al = new Float32Array(n), rd = new Float32Array(n), idx = [];
        const cs = new Float32Array(segs), sn = new Float32Array(segs);
        for (let j = 0; j < segs; j++) { cs[j] = Math.cos(j / segs * Math.PI * 2); sn[j] = Math.sin(j / segs * Math.PI * 2); }
        for (let s = 0; s < slots; s++) {
          const b = s * vps;
          for (let i = 0; i < vps; i++) { fr[b + i] = i === 0 ? 0 : Math.ceil(i / segs) / rings; pos[(b + i) * 3 + 1] = -9999; }
          // counter-clockwise seen from above (front faces up)
          for (let j = 0; j < segs; j++) idx.push(b, b + 1 + (j + 1) % segs, b + 1 + j);
          for (let r = 1; r < rings; r++) for (let j = 0; j < segs; j++) {
            const a0 = b + 1 + (r - 1) * segs + j, a1 = b + 1 + (r - 1) * segs + (j + 1) % segs;
            idx.push(a0, a1 + segs, a0 + segs, a0, a1, a1 + segs);
          }
        }
        const geo = new THREE.BufferGeometry();
        const P = new THREE.BufferAttribute(pos, 3), A = new THREE.BufferAttribute(al, 1), R = new THREE.BufferAttribute(rd, 1);
        P.setUsage(THREE.DynamicDrawUsage); A.setUsage(THREE.DynamicDrawUsage); R.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('position', P); geo.setAttribute('aF', new THREE.BufferAttribute(fr, 1)); geo.setAttribute('aA', A); geo.setAttribute('aR', R);
        geo.setIndex(idx);
        const mat = new THREE.ShaderMaterial({
          uniforms: { uBlue: { value: BLUE }, uRed: { value: RED }, uDim: { value: 1 } },
          vertexShader: `
            attribute float aF; attribute float aA; attribute float aR;
            varying float vF; varying float vA; varying float vR;
            void main() {
              vF = aF; vA = aA; vR = aR;
              vec3 p = position; if (aA <= 0.001) p = vec3(0.0, -9999.0, 0.0);
              gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
            }`,
          fragmentShader: `
            uniform vec3 uBlue; uniform vec3 uRed; uniform float uDim;
            varying float vF; varying float vA; varying float vR;
            void main() {
              float f = vF;
              float k = ${soft};
              gl_FragColor = vec4(mix(uBlue, uRed, step(0.5, vR)) * uDim, vA * k);
            }`,
          transparent: true, depthWrite: false, fog: false,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.userData.dynamic = true;
        ctx.scene.add(mesh);
        const last = new Float32Array(slots * 3).fill(1e9);
        const D = { mesh, mat, slots, used: 0 };
        // drape slot s at (x, z), radius r; side 1 = red; alpha a (0 hides it). force: redrape even if it barely moved
        D.put = (s, x, z, r, a, red, force) => {
          const b = s * vps;
          if (al[b] !== a || rd[b] !== red) { for (let i = 0; i < vps; i++) { al[b + i] = a; rd[b + i] = red; } A.needsUpdate = R.needsUpdate = true; }
          if (a <= 0.001) return;
          const o = s * 3;
          if (!force && Math.abs(last[o] - x) < 0.25 && Math.abs(last[o + 1] - z) < 0.25 && Math.abs(last[o + 2] - r) < 0.25) return;
          last[o] = x; last[o + 1] = z; last[o + 2] = r;
          pos[b * 3] = x; pos[b * 3 + 1] = ctx.groundY(x, z) + lift; pos[b * 3 + 2] = z;
          for (let ri = 1; ri <= rings; ri++) {
            const rr = r * ri / rings;
            for (let j = 0; j < segs; j++) {
              const px = x + cs[j] * rr, pz = z + sn[j] * rr, q = (b + 1 + (ri - 1) * segs + j) * 3;
              pos[q] = px; pos[q + 1] = ctx.groundY(px, pz) + lift; pos[q + 2] = pz;
            }
          }
          P.needsUpdate = true;
        };
        D.hideFrom = (s0) => { for (let s = s0; s < slots; s++) D.put(s, 0, 0, 0, 0, 0); };
        return D;
      }
      const big = pool(40, 7, 22, MAP ? '1.0 - smoothstep(0.72, 1.0, f)' : 'exp(-2.6 * f * f) * (1.0 - smoothstep(0.6, 1.0, f))', 0.35);
      const men = pool(200, 3, 12, 'exp(-2.2 * f * f) * (1.0 - smoothstep(0.35, 1.0, f))', 0.12);

      // ---------- the Marines ----------
      let figs = null;
      function collect() {
        const ad = window.MARINES_AD, mc = window.MARINES_C;
        if (!ad || !mc || !ad.actors || !mc.figures) return null;
        const out = [];
        const hip = (F) => F.j && F.j.mixamorigHips;
        for (const A of ad.actors) out.push({ g: A.group, root: A.F.root, hip: hip(A.F), o: null, a: 0 });
        for (const k in mc.figures) { const o = mc.figures[k]; out.push({ g: 'C', root: o.F.root, hip: hip(o.F), o, a: 0 }); }
        return out;
      }
      const shown = (F) => F.root.visible && !(F.o && F.o.alpha !== undefined && F.o.alpha < 0.3);
      const GROUPS = ['A', 'D', 'CP', 'C'];
      const SUBJECT = { 1: 'CP', 2: 'A', 3: 'A', 4: 'C', 5: 'C', 6: 'C', 7: 'C', 8: 'C', 11: 'A' };
      const MAXC = 16;
      const cl = Array.from({ length: MAXC }, () => ({ g: '', n: 0, sx: 0, sz: 0, x: 0, z: 0, r: 0 }));
      let nCl = 0;
      function cluster() {
        nCl = 0;
        for (const g of GROUPS) {
          const first = nCl;
          for (const F of figs) {
            if (F.g !== g || !shown(F)) continue;
            const x = F.root.position.x, z = F.root.position.z;
            let best = -1, bd = g === 'CP' ? 1e9 : 25;
            for (let i = first; i < nCl; i++) { const c = cl[i], d = Math.hypot(c.sx / c.n - x, c.sz / c.n - z); if (d < bd) { bd = d; best = i; } }
            if (best < 0) { if (nCl >= MAXC) continue; best = nCl++; const c = cl[best]; c.g = g; c.n = 0; c.sx = 0; c.sz = 0; c.r = 0; }
            const c = cl[best]; c.n++; c.sx += x; c.sz += z;
          }
          for (let i = first; i < nCl; i++) { const c = cl[i]; c.x = c.sx / c.n; c.z = c.sz / c.n; }
          for (const F of figs) {
            if (F.g !== g || !shown(F)) continue;
            const x = F.root.position.x, z = F.root.position.z;
            let best = -1, bd = 1e9;
            for (let i = first; i < nCl; i++) { const d = Math.hypot(cl[i].x - x, cl[i].z - z); if (d < bd) { bd = d; best = i; } }
            if (best >= 0 && bd > cl[best].r) cl[best].r = bd;
          }
        }
      }
      const NT = 20;
      const tracks = M.tracks = Array.from({ length: NT }, (_, i) => ({ slot: i, g: '', x: 0, z: 0, r: 0, tx: 0, tz: 0, tr: 0, a: 0, ta: 0, live: false, hit: false }));

      // ---------- the NVA: positions from works.js ----------
      let positions = null;
      function buildPositions() {
        const W = window.WORKS || ctx.works;
        if (!W || !W.slits || !W.slits.length) return null;
        const out = [];
        const add = (key, pts, pad) => {
          if (!pts.length) return;
          let x = 0, z = 0; for (const p of pts) { x += p.x; z += p.z; } x /= pts.length; z /= pts.length;
          let r = 0; for (const p of pts) r = Math.max(r, Math.hypot(p.x - x, p.z - z));
          out.push({ key, x, z, r: Math.max(7, r + pad), slot: NT + out.length });
        };
        for (const g of ['arc', 'north', 'second']) add(g, W.slits.filter((s) => s.group === g).map((s) => s.pos), 6);
        for (const g of ['crest', 'lz']) {
          const hs = (W.spiderHoles || []).filter((h) => h.group === g).map((h) => h.pos), groups = [];
          for (const p of hs) { const G = groups.find((q) => Math.hypot(q[0].x - p.x, q[0].z - p.z) < 30); if (G) G.push(p); else groups.push([p]); }
          groups.forEach((G, i) => { if (G.length >= 2) add(g === 'lz' ? 'lz' : 'crest', G, 4); });
        }
        out.length = Math.min(out.length, 39 - NT);
        return out;
      }
      // first fire per chapter, from fire.js's timing table (the comment at the top of fire.js)
      const FIRST = { 3: { north: 11 }, 6: { arc: 3, second: 20 }, 7: { arc: 0, north: 0, second: 0 }, 8: { arc: 4, second: 13 }, 11: { lz: 92.8 } };
      const FILE_SLOT = 39;
      let nvaFigs = null;

      // ---------- the control and the legend in the story panel header ----------
      const css = document.createElement('style');
      css.textContent = '#story .mk{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:5px;font:12px/1 Georgia,serif;color:#e6d6ac;letter-spacing:0;text-transform:none}' +
        '#story .mk .lg{display:inline-flex;gap:8px}#story .mk .lg span{display:inline-flex;align-items:center;gap:5px}' +
        '#story .mk .lg i{width:10px;height:10px;border-radius:50%}#story .mk .lg[hidden]{display:none}' +
        '#story .mk .sw{display:inline-flex;border:1px solid rgba(240,212,138,.35);border-radius:9px;overflow:hidden}' +
        '#story .mk .sw button{all:unset;cursor:pointer;padding:3px 7px;font:12px/1 Georgia,serif;color:#cdbf98}' +
        '#story .mk .sw button+button{border-left:1px solid rgba(240,212,138,.25)}' +
        '#story .mk .sw button[aria-pressed=true]{background:rgba(240,212,138,.22);color:#f6e6b8}' +
        '#story .mk .sw button:focus-visible{outline:2px solid #f0d48a;outline-offset:-2px}';
      document.head.appendChild(css);
      const box = document.createElement('div');
      box.className = 'mk';
      box.innerHTML = '<span class="sw" role="group" aria-label="Markers"><button type="button" data-m="off">Off</button><button type="button" data-m="groups">Groups</button><button type="button" data-m="each">Each man</button></span>' +
        '<span class="lg"><span><i style="background:#3b78e0"></i>Marines</span><span><i style="background:#c8324a"></i>NVA</span></span>';
      const legend = box.querySelector('.lg'), btns = box.querySelectorAll('button');
      const head = document.querySelector('#story .head .t');
      if (head) head.appendChild(box);
      box.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
      function setMode(m) {
        if (!MODES.includes(m)) return;
        mode = M.mode = m;
        try { localStorage.setItem(LS, m); } catch (e) { /* storage blocked */ }
        btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
      }
      M.setMode = setMode;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
      addEventListener('keydown', (e) => {
        if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.key === 'm' || e.key === 'M') setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
      });

      // ---------- per frame ----------
      let mulG = -1, mulE = -1, lastCh = -1;
      const cam = ctx.camera;
      const fade = (cur, target, step) => (cur < 0 ? target : cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), step));
      M._update = (a, b) => this.update(a, b);
      this.update = function (tAbs, dt) {
        const t0p = performance.now();
        const ch = ctx.chapter.id, t = ctx.cycle.t;
        if (!figs) figs = collect();
        if (!positions) { positions = buildPositions(); if (positions) M.positions = positions; }
        if (!nvaFigs && window.NVA && NVA.me && NVA.me.place) nvaFigs = NVA.me.place.figs;
        const chOn = ch !== 9 && ch !== 10;
        legend.hidden = !(mode !== 'off' && chOn);
        const lvl = chOn ? (ch === 8 ? 0.6 : 1) : 0;
        const step = Math.min(0.5, Math.max(0, dt || 0));
        mulG = fade(mulG, mode === 'groups' ? lvl : 0, step);   // 1 s cross-fade between modes and at chapters 9-10
        mulE = fade(mulE, mode === 'each' ? lvl : 0, step);
        const mulR = Math.max(mulG, mulE);
        const chChanged = ch !== lastCh; lastCh = ch;
        big.mat.uniforms.uDim.value = men.mat.uniforms.uDim.value = 0.75 + 0.25 * ctx.light.day;
        const k = 1 - Math.exp(-step * 2.5), ka = step / 0.8;
        if (chChanged) for (const T of tracks) { T.live = false; T.a = 0; }

        // large discs: group hazes, Rider's file halo (groups mode), stains (both modes)
        if (mulG > 0.001 || mulR > 0.001) {
          big.mesh.visible = true;
          const S = MAP ? 0.4 / 0.18 : 1;
          if (figs && mulG > 0.001) {
            cluster();
            for (const T of tracks) T.hit = false;
            for (let i = 0; i < nCl; i++) {
              const c = cl[i];
              if (c.n < (c.g === 'CP' ? 2 : 3)) continue;
              let best = null, bd = 1e9;
              for (const T of tracks) if (T.live && !T.hit && T.g === c.g) { const d = Math.hypot(T.x - c.x, T.z - c.z); if (d < Math.max(30, T.r + 10) && d < bd) { bd = d; best = T; } }
              if (!best) { best = tracks.find((T) => !T.live && T.a <= 0.001); if (!best) continue; best.live = true; best.g = c.g; best.x = c.x; best.z = c.z; best.r = c.r + 3; best.a = 0; }
              best.hit = true; best.tx = c.x; best.tz = c.z; best.tr = Math.min(48, Math.max(6, c.r + 3));
              best.ta = SUBJECT[ch] === c.g ? 0.28 : 0.18;
            }
          }
          for (const T of tracks) {
            if (T.live && mulG > 0.001) {
              if (!T.hit) T.ta = 0;
              T.x += (T.tx - T.x) * k; T.z += (T.tz - T.z) * k; T.r += (T.tr - T.r) * k;
              T.a += Math.sign(T.ta - T.a) * Math.min(Math.abs(T.ta - T.a), ka * 0.3);
              if (!T.hit && T.a <= 0.001) T.live = false;
            }
            big.put(T.slot, T.x, T.z, T.r, T.live ? Math.min(0.6, T.a * S) * mulG : 0, 0);
          }
          if (positions) {
            const F = FIRST[ch] || {};
            for (const P of positions) {
              const tf = F[P.key];
              // shown from chapter 1 (Abram, 2026-11-09: "fine with the red ones being shown"); a 2 s pulse to 0.3
              // when the position first fires in the chapter, so the fire reads as coming from there
              let a = 0.15;
              if (tf !== undefined && t >= tf && t < tf + 2.4) { const u = t - tf; a += 0.15 * sm(u / 0.4) * (1 - sm((u - 1.6) / 0.8)); }
              big.put(P.slot, P.x, P.z, P.r, Math.min(0.6, a * (MAP ? 1.5 : 1)) * mulR, 1);
            }
          }
          // Rider's file (chapter 5, nva.js), groups mode: a moving red halo while the men are out of the grass
          let fa = 0;
          const N = window.NVA && window.NVA.me;
          if (ch === 5 && mulG > 0.001 && N && N.FILE && N.runSpeed) {
            const Fl = N.FILE, L = Math.hypot(Fl.to[0] - Fl.from[0], Fl.to[1] - Fl.from[1]), ux = (Fl.to[0] - Fl.from[0]) / L, uz = (Fl.to[1] - Fl.from[1]) / L;
            let n = 0, sx = 0, sz = 0, s0 = 1e9, s1 = -1e9;
            for (let i = 0; i < Fl.n; i++) {
              const s = (t - (Fl.t0 + i * Fl.gap + 0.25 * Math.sin(i * 2.3))) * N.runSpeed * Fl.rate - Fl.lead;
              if (s < 0 || s > L) continue;
              n++; sx += Fl.from[0] + ux * s; sz += Fl.from[1] + uz * s; s0 = Math.min(s0, s); s1 = Math.max(s1, s);
            }
            if (n) { fa = Math.min(0.6, 0.3 * Math.min(1, n / 3) * (MAP ? 1.5 : 1)) * mulG; big.put(FILE_SLOT, sx / n, sz / n, Math.max(5, (s1 - s0) / 2 + 3), fa, 1); }
          }
          if (!fa) big.put(FILE_SLOT, 0, 0, 0, 0, 1);
        } else big.mesh.visible = false;

        // small discs: one under each man (each mode)
        let nm = 0;
        if (mulE > 0.001 && figs) {
          men.mesh.visible = true;
          const cx = cam.position.x, cz = cam.position.z;
          const disc = (F, red) => {
            const on = shown(F);
            F.a = on ? 1 : Math.max(0, F.a - ka);   // fade out over 0.8 s when he leaves the view of the story
            if (on && F.a < 1) F.a = Math.min(1, F.a + ka);
            if (F.a <= 0.001 || nm >= men.slots) return;
            const e = F.hip ? F.hip.matrixWorld.elements : null;
            const x = e ? e[12] : F.root.position.x, z = e ? e[14] : F.root.position.z;
            const d = Math.hypot(x - cx, z - cz), df = 1 - sm((d - 60) / 140);
            if (df <= 0.01) return;
            const down = e && e[13] - ctx.groundY(x, z) < 0.55;   // lying: hips under 0.55 m
            men.put(nm++, x, z, 0.8, (down ? 0.2 : 0.35) * df * F.a * mulE, red, true);
          };
          for (const F of figs) disc(F, 0);
          if (nvaFigs && !STAIN_ONLY) for (const f of nvaFigs) { if (!f.__mk) f.__mk = { root: f.F.root, hip: f.F.j && f.F.j.mixamorigHips, o: null, a: 0 }; disc(f.__mk, 1); }
          men.hideFrom(nm);
          men.used = nm;
        } else if (men.mesh.visible) { men.hideFrom(0); men.mesh.visible = false; }
        M.stats.ms = performance.now() - t0p; M.stats.men = nm;
      };
    },
  });
})();
