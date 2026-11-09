// fire.js (plug-in "fire"): tracers, muzzle flashes, mortar, rocket and artillery bursts, smoke, coloured smoke at the
// LZs, the spider-hole fire at the CH-46 and the two shots at 0630 (DESIGN.md 1, 7, 9; DECISIONS.md "The fighting").
//
// Tone: the flashes and tracers show roughly who is shooting where. No injury is shown. The NVA stay unseen: their
// fire comes from positions (bunker slits, spider holes, snipers), never from rows of men.
//
// Everything is a pure function of ctx.chapter.id and ctx.cycle.t. On entering a chapter the plug-in builds that
// chapter's timeline once (seeded, so the same every time): every round, every burst, every smoke emitter, each with
// its start time in the loop. Each frame it draws what is alive at cycle.t, including what started near the end of the
// previous loop, so the loop has no seam. Nothing is allocated per frame.
//
// Draws: 3 (tracers, glows, smoke puffs), plus 4 pooled point lights that only glow at night (constant count, so no
// shader recompiles). Triangles: 2 per tracer, 2 per glow, 80 per puff; at most about 60k.
//
// API (window.FIRE, also ctx.fire): see the bottom of this comment block in the code, `Object.assign(FIRE, ...)`.
//
// Timing table (chapter, loop t in s, event), also in FIRE.timing:
//   3   11-114  north-end bunker slits fire on A's positions (2-4 rounds/s per active slit, in windows)
//   3   16-114  A's positions answer in bursts of 3-6
//   3   38, 58, 81, 103  mortar bursts on A's positions
//   5   60-80   15 rockets (120 mm) on the Hill 689 perimeter
//   6   3-88    the horseshoe fires on Charlie's line; Charlie answers up the slope
//   6   20-88   the second hidden position on Charlie's left opens on Charlie's left half
//   6   18, 41, 66  mortar bursts on the slope
//   6   50.0, 50.9, 52.3, 53.8  the artillery salvo within 50 m of Charlie, on the slope to its left; then nothing
//   7   0-120   the whole ridge, lighter; A, C and D answer lightly
//   7   3-118   sniper single shots at Delta's approach, one every 6-10 s
//   7   9, 31, 55, 77, 99  mortar bursts on the slopes
//   7   95-110  smoke grenades: yellow at Charlie's LZ, purple at A's LZ (gone by 119)
//   8   0-90    sparse fire from two slits, a few Marine replies
//   9   12, 35, 78  one bunker slit, short bursts toward the crater area
//   9   14.5, 15.3, 38.0, 38.6, 80.5  Hunnicutt's single shots back
//   9   42.0    Hunnicutt's grenade bursts (the throw leaves his hand at 40.8), dust, then quiet
//   11  12.0, 14.0  two single flashes on the ridge, no tracer (the voice across the valley stops)
//   11  92.8-98 spider holes round the battle-hill LZ fire up at the CH-46 (its hover window)
//   1, 2, 4, 10  quiet
(function () {
  'use strict';

  const FIRE = (window.FIRE = window.FIRE || {});
  const noop = () => {};
  // stubs until init runs (?only= may leave the plug-in out)
  Object.assign(FIRE, { burst: noop, blast: noop, smoke: noop, flash: noop, rebuild: noop });

  window.Scene.register({
    name: 'fire',
    init(ctx) {
      const { THREE } = ctx;
      const S = ctx.SITE;
      const gy = (x, z) => ctx.groundY(x, z);
      const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
      const smooth = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

      // ---------- settings and API ----------
      // The additive shaders write display colour directly (like the base's lamp glows), so their colours are sRGB
      // as DESIGN.md gives them; the lit smoke puffs take linear colours through ctx.lin.
      Object.assign(FIRE, {
        // false: every tracer pale yellow (DESIGN.md 1; no source states the colours, R §5). true: red for the
        // Marines, green for the NVA, the common convention. Read every frame, so it can be flipped live.
        tracerConvention: false,
        colors: { tracer: 0xffe9a8, us: 0xff7048, nva: 0xa8ff78, flash: 0xfff3c4, impact: 0xffd890 },
        // rate multipliers; call FIRE.rebuild() after changing them
        rates: { all: 1, slit: 1, marine: 1, mortar: 1, smoke: 1 },
        speed: 170,        // tracer speed on screen, m/s (slowed from ~800 so a streak reads)
        streak: 6,         // streak length, m
        width: 0.11,       // streak width, m (never thinner than minPx on screen)
        minPx: 1.8,        // tracers and flashes never smaller than this many pixels
        pull: 1.6,         // flashes and tracers drawn this many metres toward the camera, so grass beside them doesn't swallow them
        nightLight: 1,     // strength of the muzzle-flash point lights at night
        // chapter 11: where the CH-46 is (loop time → {x,y,z}); medevac.js may replace this, then FIRE.rebuild()
        ch46At: null,
        timing: [],
      });
      ctx.fire = FIRE;

      // ---------- firing positions (resolved when the first timeline is built, after every plug-in's init) ----------
      let P = null;
      const pt = (x, z, h) => ({ x, y: gy(x, z) + (h || 0), z });
      const flat = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l, l }; };
      const off = (p, u, along, side, h) => { const x = p.x + u.x * along + u.z * side, z = p.z + u.z * along - u.x * side; return pt(x, z, h); };
      function places() {
        const W = ctx.works || window.WORKS || window.Works || null;
        let slits = W && Array.isArray(W.slits) && W.slits.length ? W.slits.map((s, i) => ({
          x: s.pos.x, y: s.pos.y, z: s.pos.z, dir: s.dir || null, id: s.id || 'slit' + i })) : null;
        const fromWorks = !!slits;
        if (!slits) slits = S.bunkerArc.map((p, i) => {
          const u = flat(S.battleSummit, p);
          return { x: p.x, y: p.y, z: p.z, dir: { x: u.x, y: 0, z: u.z }, id: 'arc' + i };
        });
        // the muzzle: just out of the slit, a little up
        for (const s of slits) {
          const d = s.dir || { x: 0, z: 0 };
          s.m = { x: s.x + (d.x || 0) * 0.4, y: s.y + 0.35, z: s.z + (d.z || 0) * 0.4 };
        }
        const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
        let second = slits.filter((s) => dist(s, S.secondPosition) < 14);
        // Charlie's line: below the pause, across the slope. off()'s side vector is (u.z, -u.x): facing up the slope
        // (north), positive side is west, Charlie's LEFT, where the second position is (DY p. 314)
        const up = flat(S.charliePause, S.battleSummit);
        const C = [];
        for (let i = 0; i < 9; i++) { const side = -22 + i * 5.5; C.push(Object.assign(off(S.charliePause, up, -9 - Math.abs(side) * 0.12, side, 0.8), { side })); }
        const Cleft = C.filter((c) => c.side > 0);
        if (!second.length) {
          const u = flat(S.secondPosition, Cleft[1]);
          second = [-4, 0, 4].map((sd, i) => { const p = off(S.secondPosition, u, 0, sd, 0); return { x: p.x, y: p.y, z: p.z, dir: { x: u.x, y: 0, z: u.z }, id: 'second' + i, m: off(S.secondPosition, u, 0.4, sd, 0.35) }; });
        }
        const horseshoe = slits.filter((s) => !second.includes(s));
        const byN = horseshoe.slice().sort((a, b) => dist(a, S.northEnd) - dist(b, S.northEnd));
        let north = byN.filter((s, i) => i < 2 || (i < 4 && dist(s, S.northEnd) < dist(byN[0], S.northEnd) * 1.12));
        let nc = north.reduce((a, s) => ({ x: a.x + s.x / north.length, z: a.z + s.z / north.length }), { x: 0, z: 0 });
        let ua = flat(S.northEnd, nc);
        // A was pinned "at the fringe" of the bunkers at the north end (DY p. 313). If no slit stands within 30 m of
        // the north end (the base's arc alone is about 54 m off), two stand-in slits go 16 m past it toward the crest.
        if (ua.l > 30) {
          north = [-4, 4].map((sd, i) => { const p = off(S.northEnd, ua, 16, sd, 0), m = off(S.northEnd, ua, 15.6, sd, 0.35); return { x: p.x, y: p.y, z: p.z, dir: { x: -ua.x, y: 0, z: -ua.z }, id: 'north' + i, m }; });
          nc = { x: (north[0].x + north[1].x) / 2, z: (north[0].z + north[1].z) / 2 }; ua = flat(S.northEnd, nc);
        }
        // A's positions: in front of the north end, about 14 m short of the bunkers
        let A = [];
        // where Company A's men actually lie at the fringe (marines-a-d.js, chapter 3 late in the loop), else a line
        // 14 m short of the north-end slits
        const MA = window.MARINES_AD;
        if (MA && MA.posAt) {
          const ps = MA.actors.filter((a) => a.group === 'A' && a.plans[3]).map((a) => MA.posAt(a, 3, 100)).filter((p) => p && !p.hidden);
          ps.sort((a, b) => Math.hypot(a.x - nc.x, a.z - nc.z) - Math.hypot(b.x - nc.x, b.z - nc.z));
          A = ps.slice(0, 14).filter((p, i) => i % 2 === 0).map((p) => pt(p.x, p.z, 0.7));
        }
        if (A.length < 4) {
          A = [];
          const aAlong = Math.max(-4, ua.l - 14);
          for (let i = 0; i < 7; i++) A.push(off(S.northEnd, ua, aAlong + ((i * 37) % 7) - 3, -14 + i * 4.7, 0.7));
        }
        // Delta along its axis, and the snipers on the ridge ahead of it
        const ax = { x: S.deltaAxis.x, z: S.deltaAxis.z };
        const D = [];
        for (let i = 0; i < 5; i++) D.push(off(S.deltaStart, ax, 10 + i * 11, (i % 2 ? 5 : -5), 0.9));
        const snipers = [off(S.deltaStart, ax, S.deltaStop * 1.25, 12, 1.4), off(S.deltaStart, ax, S.deltaStop * 1.15, -14, 1.4)];
        const nearC = horseshoe.slice().sort((a, b) => dist(a, S.charliePause) - dist(b, S.charliePause)).slice(0, 5);
        // chapter 9: the slit that fires on the crater area (15-60 m off), else the second position
        const cands = slits.filter((s) => dist(s, S.himmerFall) >= 15 && dist(s, S.himmerFall) <= 60).sort((a, b) => dist(a, S.himmerFall) - dist(b, S.himmerFall));
        const s9 = cands[0] || second[0];
        const hun = pt(S.himmerFall.x - 1.0, S.himmerFall.z + 0.8, 0.45);
        // chapter 11
        const ridgeShot = off(S.gully, flat(S.gully, S.battleSummit), 10, 0, 1.0);
        const lz = S.routes.ch46[1];
        const wl = W && W.nvaHoles ? W.nvaHoles('lz') : [];
        const holes = wl.length === 4 ? wl.map((h) => pt(h.pos.x, h.pos.z, 0.3)) : [0, 1, 2, 3].map((i) => { const a = 0.6 + i * 1.7, r = 4 + (i % 2) * 4.5; return pt(lz.x + Math.cos(a) * r, lz.z + Math.sin(a) * r, 0.3); });
        P = { slits, fromWorks, horseshoe, north, second, nearC, A, C, Cleft, D, snipers, s9, hun, ridgeShot, lz, holes };
      }

      // ---------- the timeline ----------
      // round: { t, ax..bz, dur, side (0 us, 1 nva), tracer, fs (flash size) }
      // blast: { t, x, y, z, kind, size, life, seed }
      // emitter: { t0, t1, x, y, z, every, life, size, rise, col (THREE.Color linear), kind, seed }
      let TL = null, builtFor = -1, builtN = -1;
      const extras = {};      // permanent additions from FIRE.burst/blast/smoke with { at }, by chapter
      function rngOf(seed) { return ctx.mulberry32(seed * 7919 + 13); }

      function build(id, L) {
        if (!P) places();
        const R = FIRE.rates, rng = rngOf(id);
        const rounds = [], blasts = [], emitters = [];
        const pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
        const gunCol = ctx.lin(0xd8d2c4), smokeCol = ctx.lin(0xaea292);
        let eid = 1;

        function round(t, a, tg, sc, side, o) {
          o = o || {};
          const ang = rng() * Math.PI * 2, rad = sc * Math.sqrt(rng());
          let bx = tg.x + Math.cos(ang) * rad, bz = tg.z + Math.sin(ang) * rad;
          // most rounds carry on a little past the aim point
          const u = flat(a, { x: bx, z: bz }), over = rng() * sc * 1.5;
          bx += u.x * over; bz += u.z * over;
          const by = o.by !== undefined ? o.by + (rng() - 0.5) * 1.2 : gy(bx, bz) + 0.4 + rng() * 1.6;
          const d = Math.hypot(bx - a.x, by - a.y, bz - a.z);
          rounds.push({ t, ax: a.x, ay: a.y, az: a.z, bx, by, bz, d, dur: d / FIRE.speed, side, tracer: o.tracer !== false, fs: o.fs || (side ? 0.8 : 0.55), fl: o.fl });
        }
        function gunPuff(t, a, sz, life) {
          emitters.push({ t0: t, t1: t, x: a.x, y: a.y, z: a.z, every: 1, life: life || 7, size: sz || 0.45, rise: 1.2, col: gunCol, seed: eid++, drift: 0.8 });
        }
        // a bunker slit or machine gun: windows of 2-4 rounds/s
        function stream(s, tgts, t0, t1, o) {
          o = o || {};
          const a = s.m || s, act = o.act || (() => 1), sc = o.sc || 3;
          let t = t0 + rng() * 1.5;
          while (t < t1) {
            const k = act(t) * R.all;
            if (k <= 0.03) { t += 0.5; continue; }
            const end = Math.min(t1, t + (o.w || 1.2 + rng() * 3));
            const tg = pick(tgts), rate = (2 + rng() * 2) * R.slit;
            gunPuff(t, a);
            for (let r = t; r < end; r += (1 / rate) * (0.75 + 0.5 * rng())) round(r, a, tg, sc, 1, o);
            t = end + (1.5 + rng() * 4) / Math.max(0.1, k);
          }
        }
        // a Marine position: bursts of 3-6 at about 9 rounds/s
        function bursts(a, tgts, t0, t1, o) {
          o = o || {};
          const act = o.act || (() => 1), sc = o.sc || 2.5;
          let t = t0 + rng() * 3;
          while (t < t1) {
            const k = act(t) * R.all * R.marine;
            if (k <= 0.03) { t += 0.5; continue; }
            const n = 3 + Math.floor(rng() * 4), tg = pick(tgts);
            for (let i = 0; i < n; i++) round(t + i * (0.09 + rng() * 0.04), a, tg, sc, 0, o);
            if (rng() < 0.4) gunPuff(t, a);
            t += (2.5 + rng() * 4.5) / Math.max(0.1, k);
          }
        }
        function singles(a, tgts, t0, t1, g0, g1, o) {
          let t = t0 + rng() * g0;
          while (t < t1) { round(t, a, pick(tgts), 2, 1, o); gunPuff(t, a); t += g0 + rng() * (g1 - g0); }
        }
        function blast(t, p, kind) {
          const size = { mortar: 1, rocket: 1.8, arty: 1.5, grenade: 0.9 }[kind];
          blasts.push({ t, x: p.x, y: gy(p.x, p.z), z: p.z, kind, size, life: kind === 'grenade' ? 14 : 22 + size * 9, seed: eid++ });   // smoke lingers 20-40 s (fix pass)
        }
        const near = (p, r) => { const a = rng() * Math.PI * 2, d = r * Math.sqrt(rng()); return { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d }; };
        const ridgeSmoke = (p, t0, t1) => emitters.push({ t0, t1, x: p.x, y: p.y + 1, z: p.z, every: 2.4 / R.smoke, life: 16, size: 1.1, rise: 3.5, col: smokeCol, seed: eid++, drift: 1.3 });
        const timing = [];

        if (id === 3) {
          const act = (t) => smooth((t - 11) / 5) * (1 - 0.4 * smooth((t - 80) / 15) - 0.6 * smooth((t - 100) / 14));
          P.north.forEach((s, i) => stream(s, P.A, 11 + i * 1.5, 114, { act }));
          P.A.forEach((a, i) => { if (i % 3 !== 2) bursts(a, P.north.map((s) => s.m), 16 + i, 114, { act }); });
          for (const t of [38, 58, 81, 103]) if (rng() < R.mortar + 0.001) blast(t, near(pick(P.A), 5), 'mortar');
          ridgeSmoke(P.north[0], 14, 108);
          timing.push([3, '11-114', 'north-end slits fire on A'], [3, '16-114', 'A answers in bursts'], [3, '38, 58, 81, 103', 'mortars on A']);
        } else if (id === 5) {
          for (let k = 0; k < 15; k++) {
            const t = 60 + k * (20 / 15) + rng() * 0.6, b = rng() * 360, p = S.perimeter.at(b);
            blast(t, near(p, 6), 'rocket');
          }
          timing.push([5, '60-80', '15 rockets on the 689 perimeter']);
        } else if (id === 6) {
          const act = (t) => 0.35 + 0.65 * smooth((t - 4) / 6) * (1 - 0.65 * smooth((t - 74) / 14));
          P.nearC.forEach((s, i) => stream(s, P.C, 3 + i, 88, { act }));
          P.second.forEach((s, i) => stream(s, P.Cleft, 20 + i * 0.7, 88, { act: () => 1.3 }));
          P.C.forEach((c, i) => {
            bursts(c, P.nearC.map((s) => s.m), 3 + i * 0.5, 88, { act: (t) => act(t) * 0.8 });
            if (c.side < 0) bursts(c, P.second.map((s) => s.m), 24 + i, 88, { act: () => 0.6 });
          });
          for (const t of [18, 41, 66]) blast(t, near(pick(P.C), 12), 'mortar');
          const Cl = P.Cleft[0];
          [50.0, 50.9, 52.3, 53.8].forEach((t, i) => {
            const k = 0.45 + 0.08 * i, p = { x: Cl.x + (S.secondPosition.x - Cl.x) * k, z: Cl.z + (S.secondPosition.z - Cl.z) * k };
            blast(t, near(p, 4), 'arty');
          });
          ridgeSmoke(P.nearC[0], 6, 84); ridgeSmoke(P.second[0], 22, 84);
          timing.push([6, '3-88', 'horseshoe on C; C answers'], [6, '20-88', 'second position on C\'s left'], [6, '18, 41, 66', 'mortars'], [6, '50.0-53.8', 'artillery salvo, 4 bursts, then nothing']);
        } else if (id === 7) {
          const tg = P.A.concat(P.C, P.D);
          for (let i = 0; i < 6; i++) stream(P.slits[(i * 5 + 1) % P.slits.length], tg, i * 2, 118, { act: () => 0.45 });
          P.A.concat(P.C).forEach((a, i) => { if (i % 2 === 0) bursts(a, P.slits.map((s) => s.m), i, 118, { act: () => 0.4 }); });
          P.D.forEach((d) => bursts(d, P.snipers, 5, 118, { act: () => 0.3 }));
          P.snipers.forEach((s, i) => singles(s, P.D, 3 + i * 4, 118, 12, 20, { fs: 0.6 }));   // two snipers: together one shot every 6-10 s
          for (const t of [9, 31, 55, 77, 99]) blast(t, near(pick(tg), 8), 'mortar');
          emitters.push({ t0: 103, t1: 119, x: S.czlz.x, y: S.czlz.y + 0.2, z: S.czlz.z, every: 0.45, life: 9, size: 1.0, rise: 5, col: ctx.lin(0xe6c43c), seed: eid++, drift: 1.6, colored: true });
          emitters.push({ t0: 103.5, t1: 119, x: S.alz.x, y: S.alz.y + 0.2, z: S.alz.z, every: 0.45, life: 9, size: 1.0, rise: 5, col: ctx.lin(0x8a5aa8), seed: eid++, drift: 1.6, colored: true });
          ridgeSmoke(S.battleSummit, 0, 110);
          timing.push([7, '0-120', 'whole ridge, lighter'], [7, '3-118', 'sniper singles at Delta, every 6-10 s'], [7, '9, 31, 55, 77, 99', 'mortars'], [7, '103-119', 'yellow smoke at C\'s LZ, purple at A\'s LZ (the medevacs land 116.5, 118)']);
        } else if (id === 8) {
          [P.nearC[0], P.second[0]].forEach((s, i) => stream(s, P.C, 4 + i * 9, 86, { act: () => 0.18, w: 1.4 }));
          P.C.forEach((c, i) => { if (i % 4 === 1) bursts(c, P.nearC.map((s) => s.m), 8 + i, 86, { act: () => 0.15 }); });
          timing.push([8, '0-90', 'sparse fire']);
        } else if (id === 9) {
          const s = P.s9, a = s.m || s, tg = [{ x: S.himmerFall.x, z: S.himmerFall.z }];
          const by = S.himmerFall.y + 1.1;
          for (const t0 of [12, 35, 78]) { const n = 3 + Math.floor(rng() * 3); gunPuff(t0, a); for (let i = 0; i < n; i++) round(t0 + i * 0.32, a, tg[0], 3, 1, { by }); }
          for (const t of [14.5, 15.3, 38.0, 38.6, 80.5]) { round(t, P.hun, a, 1.2, 0, { by: a.y + 0.3 }); gunPuff(t, P.hun, 0.09, 3); }   // a wisp about 0.4 m across: it must not hide the throw at 40.8 (integration)
          const u = flat(P.hun, a), d = Math.min(u.l - 3, 10);   // 10 m toward the slit, in the chapter camera's frame (fix pass; was up to 26)
          blast(42.0, { x: P.hun.x + u.x * d, z: P.hun.z + u.z * d }, 'grenade');
          timing.push([9, '12, 35, 78', 'slit bursts at the crater area'], [9, '14.5, 15.3, 38.0, 38.6, 80.5', 'Hunnicutt fires back'], [9, '42.0', 'grenade bursts (throw at 40.8), then quiet']);
        } else if (id === 11) {
          for (const t of [12.0, 14.0]) { round(t, P.ridgeShot, { x: P.ridgeShot.x + 6, z: P.ridgeShot.z - 4 }, 0.5, 1, { tracer: false, fs: 2.2, fl: 0.13 }); gunPuff(t, P.ridgeShot); }
          const heli = FIRE.ch46At || ((t) => ({ x: P.lz.x, y: P.lz.y + 2.5 + 12 * smooth((t - 96) / 4), z: P.lz.z }));
          P.holes.forEach((h, i) => {
            for (let t = 92.8 + i * 0.4 + rng() * 0.3; t < 98; t += (1 / 3) * (0.75 + 0.5 * rng())) { const q = heli(t); round(t, h, q, 1.5, 1, { by: q.y }); }
            gunPuff(92.8 + i * 0.4, h);
          });
          timing.push([11, '12.0, 14.0', 'two single flashes on the ridge, no tracer'], [11, '92.8-98', 'spider holes fire at the CH-46 while its ramp is down']);
        }
        // permanent additions from the API
        for (const x of extras[id] || []) x(round, blast, emitters, gunPuff);
        rounds.sort((a, b) => a.t - b.t);
        blasts.sort((a, b) => a.t - b.t);
        FIRE.timing = timing;
        return { id, L, rounds, blasts, emitters };
      }
      function ensure() {
        const id = ctx.chapter.id;
        if (!TL || builtFor !== id || builtN !== rebuildN) { TL = build(id, ctx.cycle.length || 60); builtFor = id; builtN = rebuildN; }
      }
      let rebuildN = 0;
      FIRE.rebuild = () => { rebuildN++; P = null; };
      ctx.onChapter(() => { live.length = 0; });

      // ---------- meshes ----------
      const MAX_T = 320, MAX_G = 400, MAX_P = 1200;
      function quadGeo(corners, n, attrs) {
        const g = new THREE.InstancedBufferGeometry();
        g.setAttribute('corner', new THREE.Float32BufferAttribute(corners, 2));
        g.setIndex([0, 1, 2, 0, 2, 3]);
        const bufs = {};
        for (const [name, size] of attrs) { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); bufs[name] = a; }
        g.instanceCount = 0;
        return { g, bufs };
      }
      const U = { uPxK: { value: 1000 }, uMinPx: { value: FIRE.minPx }, uPull: { value: FIRE.pull } };
      // tracers: camera-facing ribbons from tail (iA) to head (iB)
      const T = quadGeo([0, -1, 1, -1, 1, 1, 0, 1], MAX_T, [['iA', 3], ['iB', 3], ['iC', 4]]);
      const tracerMat = new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute vec2 corner; attribute vec3 iA; attribute vec3 iB; attribute vec4 iC;
          uniform float uPxK, uMinPx, uPull; varying vec3 vCol; varying vec2 vUv;
          void main() {
            vec3 a = (modelViewMatrix * vec4(iA, 1.0)).xyz, b = (modelViewMatrix * vec4(iB, 1.0)).xyz;
            vec3 p = mix(a, b, corner.x), d = b - a; float dl = length(d); d = dl > 1e-4 ? d / dl : vec3(1.0, 0.0, 0.0);
            vec3 s = cross(d, normalize(-p)); float sl = length(s); s = sl > 1e-4 ? s / sl : vec3(0.0, 1.0, 0.0);
            float w = max(iC.w, uMinPx * max(-p.z, 0.1) / uPxK);
            p += s * corner.y * w * 0.5;
            float L = length(p); p *= max(0.3, (L - min(uPull, L * 0.3)) / L);
            vCol = iC.rgb * mix(1.0, iC.w / w, 0.45); vUv = corner;
            gl_Position = projectionMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `varying vec3 vCol; varying vec2 vUv;
          void main() { float al = vUv.x * vUv.x * (3.0 - 2.0 * vUv.x); float ac = 1.0 - vUv.y * vUv.y;
            vec3 c = mix(vCol, vec3(1.0), 0.35 * al * ac) * al * ac; gl_FragColor = vec4(c, 1.0); }`,
      });
      const tracerMesh = new THREE.Mesh(T.g, tracerMat);
      // glows: muzzle flashes, impacts, burst flashes
      const G = quadGeo([-1, -1, 1, -1, 1, 1, -1, 1], MAX_G, [['iP', 3], ['iC', 4]]);
      const glowMat = new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute vec2 corner; attribute vec3 iP; attribute vec4 iC;
          uniform float uPxK, uMinPx, uPull; varying vec3 vCol; varying vec2 vUv;
          void main() {
            vec4 mv = modelViewMatrix * vec4(iP, 1.0);
            float w = max(iC.w, 2.5 * uMinPx * max(-mv.z, 0.1) / uPxK);
            mv.xy += corner * w;
            float L = length(mv.xyz); mv.xyz *= max(0.3, (L - min(uPull, L * 0.3)) / L);
            vCol = iC.rgb * mix(1.0, iC.w / w, 0.3); vUv = corner;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying vec3 vCol; varying vec2 vUv;
          void main() { float d2 = dot(vUv, vUv); if (d2 > 1.0) discard;
            float core = exp(-d2 * 22.0), halo = exp(-d2 * 4.5) * (1.0 - d2);
            gl_FragColor = vec4(vCol * halo * 0.55 + mix(vCol, vec3(1.0), 0.6) * core * 1.2, 1.0); }`,
      });
      const glowMesh = new THREE.Mesh(G.g, glowMat);
      for (const m of [tracerMesh, glowMesh]) { m.frustumCulled = false; m.renderOrder = 5; m.userData.dynamic = true; ctx.scene.add(m); }
      // smoke and dust (fix pass, Abram wants the smoke the record supports richer): soft camera-facing sprites, many
      // small ones per burst, each a lumpy disc with its own alpha, lit by a tint that follows the light, fading as it
      // thins and drifts downwind; one draw, pooled (MAX_P)
      const PS = quadGeo([-1, -1, 1, -1, 1, 1, -1, 1], MAX_P, [['iP', 4], ['iC', 4], ['iS', 1]]);
      const PU = { uTint: { value: new THREE.Color(1, 1, 1) }, uFogC: { value: new THREE.Color() }, uFogN: { value: 400 }, uFogF: { value: 6000 } };
      const puffMat = new THREE.ShaderMaterial({
        uniforms: PU, transparent: true, depthWrite: false,
        vertexShader: `attribute vec2 corner; attribute vec4 iP; attribute vec4 iC; attribute float iS;
          varying vec4 vCol; varying vec2 vUv; varying float vSeed; varying float vFog; uniform float uFogN, uFogF;
          void main() {
            vec4 mv = modelViewMatrix * vec4(iP.xyz, 1.0);
            float a = iS * 6.2832; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
            mv.xy += (R * corner) * iP.w;
            vCol = iC; vUv = corner; vSeed = iS;
            vFog = smoothstep(uFogN, uFogF, -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying vec4 vCol; varying vec2 vUv; varying float vSeed; varying float vFog; uniform vec3 uTint, uFogC;
          float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          void main() {
            float d = length(vUv);
            float lump = 0.65 * n(vUv * 2.2 + vSeed * 17.0) + 0.35 * n(vUv * 4.7 - vSeed * 9.0);
            float m = smoothstep(1.0, 0.25, d + (lump - 0.5) * 0.55);
            if (m < 0.01) discard;
            float shade = 0.82 + 0.3 * (vUv.y * 0.5 + 0.5) + 0.12 * (lump - 0.5);
            vec3 c = vCol.rgb * uTint * shade;
            c = mix(c, uFogC, vFog);
            gl_FragColor = vec4(c, m * vCol.a);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }`,
      });
      const puffs = new THREE.Mesh(PS.g, puffMat);
      puffs.frustumCulled = false; puffs.renderOrder = 4; puffs.userData.dynamic = true;
      ctx.scene.add(puffs);
      const lights = [];
      for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffd8a0, 0, 16, 2); ctx.scene.add(l); lights.push(l); }

      // ---------- per-frame scratch (allocated once) ----------
      const cTr = new THREE.Color(), cUs = new THREE.Color(), cNva = new THREE.Color(), cFl = new THREE.Color(), cIm = new THREE.Color();
      const tmpC = new THREE.Color(), dustC = ctx.lin(0xb98a66), smokeC = ctx.lin(0xa99c8a), nightSmoke = ctx.lin(0x8e8a84);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
      const dbs = new THREE.Vector2();
      const cand = [0, 0, 0, 0].map(() => ({ s: 0, x: 0, y: 0, z: 0 }));
      let nT = 0, nG = 0, nP = 0, night = 0;
      const H = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
      // the wind smoke follows: the land's shared vector if it exposes one, else the base's ctx.wind.dir (east, a
      // little south), with a slow wander that repeats with the loop
      let wx = 1, wz = 0.3;
      function windAt(tl, L) {
        const w = (ctx.land && ctx.land.wind) || ctx.windVec || ctx.wind.dir;
        const a = Math.atan2(w.z, w.x) + 0.22 * Math.sin((Math.PI * 2 * tl) / L) + 0.1 * Math.sin((Math.PI * 4 * tl) / L + 1.3);
        wx = Math.cos(a); wz = Math.sin(a);
      }
      function light(s, x, y, z) {
        let mi = 0;
        for (let i = 1; i < 4; i++) if (cand[i].s < cand[mi].s) mi = i;
        if (s > cand[mi].s) { const c = cand[mi]; c.s = s; c.x = x; c.y = y; c.z = z; }
      }
      function glow(x, y, z, col, k, size) {
        if (nG >= MAX_G) return;
        G.bufs.iP.setXYZ(nG, x, y, z);
        G.bufs.iC.setXYZW(nG, col.r * k, col.g * k, col.b * k, size);
        nG++;
      }
      // a soft sprite: centre, radius s (m), colour col * k, opacity al (0-1), seed for its turn and lumps
      function puff(x, y, z, s, col, k, seed, al) {
        if (nP >= MAX_P || s <= 0.01) return;
        PS.bufs.iP.setXYZW(nP, x, y, z, s * 1.25);
        PS.bufs.iC.setXYZW(nP, col.r * k, col.g * k, col.b * k, al === undefined ? 0.55 : al);
        PS.bufs.iS.setX(nP, ((seed * 0.6180339) % 1 + 1) % 1);
        nP++;
      }
      function sideCol(side) { return FIRE.tracerConvention ? (side ? cNva : cUs) : cTr; }

      function drawRound(r, tau) {
        const fl = r.fl || 0.075;
        if (tau < fl) {
          const k = 1 - tau / fl, sz = r.fs * (0.6 + 0.4 * k) * (1 + 0.7 * night);
          glow(r.ax, r.ay, r.az, cFl, 1.6 * Math.sqrt(k), sz);
          light(r.fs * k, r.ax, r.ay + 0.3, r.az);
        }
        if (r.tracer && nT < MAX_T) {
          const v = FIRE.speed, head = Math.min(1, (tau * v) / r.d), tail = Math.max(0, Math.min(1, (tau * v - FIRE.streak) / r.d));
          if (head > tail) {
            const c = sideCol(r.side), k = 1.5;
            T.bufs.iA.setXYZ(nT, r.ax + (r.bx - r.ax) * tail, r.ay + (r.by - r.ay) * tail, r.az + (r.bz - r.az) * tail);
            T.bufs.iB.setXYZ(nT, r.ax + (r.bx - r.ax) * head, r.ay + (r.by - r.ay) * head, r.az + (r.bz - r.az) * head);
            T.bufs.iC.setXYZW(nT, c.r * k, c.g * k, c.b * k, FIRE.width);
            nT++;
          }
          const ti = tau - r.dur;
          if (ti > 0 && ti < 0.1) glow(r.bx, r.by, r.bz, cIm, 0.5 * (1 - ti / 0.1), 0.3);
        }
      }
      function drawBlast(b, a, L) {
        const sz = b.size;
        // the flash
        if (a < 0.22) {
          const k = 1 - a / 0.22;
          glow(b.x, b.y + 1 + sz * 0.6, b.z, cFl, 2.2 * k, (2.2 + 2.4 * sz) * (0.7 + 0.3 * k) * (1 + 0.5 * night));
          light(3 * sz * k + 0.5, b.x, b.y + 2, b.z);
        }
        windAt(b.t, L);
        // a dust-and-smoke column that leans downwind, spreads and thins: dust brown at first, grey-brown smoke after
        const n = b.kind === 'rocket' ? 34 : b.kind === 'arty' ? 28 : b.kind === 'grenade' ? 12 : 22;
        const life = b.life, col = night > 0.5 ? nightSmoke : smokeC;
        const column = b.kind === 'rocket' || b.kind === 'arty';
        for (let j = 0; j < n; j++) {
          const h1 = H(b.seed, j), h2 = H(b.seed + 1.7, j), h3 = H(b.seed + 3.1, j);
          const lifeJ = life * (0.45 + 0.55 * h3);
          if (a > lifeJ) continue;
          const ang = h1 * Math.PI * 2, out = (0.5 + h2 * 1.8) * sz;
          const up = (j / n) * (column ? 9 : 5) * sz + h3 * 1.2;
          const e1 = 1 - Math.exp(-a * 3.2), e2 = 1 - Math.exp(-a * 1.2);
          // downwind, faster for the higher puffs; a little turbulence
          const drift = Math.max(0, a - 0.6) * (0.7 + 0.5 * (j / n) + 0.3 * h2);
          const tw = Math.sin(a * 0.35 + h1 * 6.3) * 0.6 * Math.min(1, a / 6);
          const x = b.x + Math.cos(ang) * out * e1 * (1 + a * 0.05) + wx * drift - wz * tw, z = b.z + Math.sin(ang) * out * e1 * (1 + a * 0.05) + wz * drift + wx * tw;
          const y = b.y + 0.4 + up * e2 + a * 0.1;
          const s = (0.55 + h2 * 0.6) * sz * smooth(a / 0.3) * (0.7 + 0.3 * e2) * (1 + a * 0.09);
          tmpC.copy(dustC).lerp(col, smooth((a - 0.3) / 3.5));
          const hot = a < 0.18 ? 1 + 2.5 * (1 - a / 0.18) : 1;
          const al = (a < 1.5 ? 0.85 : 0.85 - 0.45 * smooth((a - 1.5) / 6)) * (1 - smooth((a / lifeJ - 0.35) / 0.65));
          puff(x, y, z, s, tmpC, hot, b.seed + j, al);
        }
      }
      function drawEmitter(e, tl, L) {
        if (tl < e.t0) return;
        const last = Math.floor((Math.min(tl, e.t1) - e.t0) / e.every);
        const first = Math.max(0, Math.ceil((tl - e.life - e.t0) / e.every));
        for (let i = first; i <= last; i++) {
          const te = e.t0 + i * e.every, a = tl - te;
          if (a < 0 || a >= e.life) continue;
          windAt(te, L);
          const h1 = H(e.seed, i), h2 = H(e.seed + 2.3, i);
          const drift = a * e.drift * (0.8 + 0.4 * h1);
          const x = e.x + wx * drift + (h1 - 0.5) * 0.8, z = e.z + wz * drift + (h2 - 0.5) * 0.8;
          const y = e.y + e.rise * (1 - Math.exp(-a / 2.5)) + a * 0.08;
          const s = e.size * (0.35 + 0.65 * (1 - Math.exp(-a / 1.8))) * (1 + a * 0.06) * smooth(a / 0.5) * (1 - smooth((a / e.life - 0.6) / 0.4)) * (0.8 + 0.4 * h2);
          const col = e.colored ? e.col : (night > 0.5 ? nightSmoke : e.col), k = e.colored ? 1.1 : 1;
          // two soft sprites per puff, thinning with age
          const al = (e.colored ? 0.8 : 0.5) * (1 - smooth((a / e.life - 0.3) / 0.7));
          puff(x, y, z, s * 1.1, col, k, e.seed * 0.37 + i, al);
          const ox = (H(e.seed + 5.1, i) - 0.5) * 1.6 * s, oz = (H(e.seed + 6.3, i) - 0.5) * 1.6 * s;
          puff(x + ox + wx * s * 0.6, y - s * 0.25, z + oz + wz * s * 0.6, s * 0.8, col, k * 0.96, e.seed * 0.53 + i, al * 0.8);
        }
      }
      // live additions without a loop time: they play once, by the page clock
      const live = [];

      function lower(arr, t) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].t < t) lo = m + 1; else hi = m; } return lo; }
      const ROUND_LIFE = 1.2;

      this._frame = function () {
        ensure();
        const t = ctx.cycle.t, L = TL.L;
        night = clamp01((0.65 - ctx.light.day) / 0.5);
        // smoke lets light through: lift its shaded faces a little by day, so a puff never reads as a rock
        {
          // the smoke's light: warm-white by day, the key light's colour low, blue-grey under the moon
          const d = ctx.light.day; PU.uTint.value.setRGB(0.32 + 0.78 * d, 0.34 + 0.74 * d, 0.42 + 0.64 * d);
          const f = ctx.scene.fog; if (f) { PU.uFogC.value.copy(f.color); if (f.near !== undefined) { PU.uFogN.value = f.near; PU.uFogF.value = f.far; } }
        }
        cTr.set(FIRE.colors.tracer); cUs.set(FIRE.colors.us); cNva.set(FIRE.colors.nva); cFl.set(FIRE.colors.flash); cIm.set(FIRE.colors.impact);
        U.uMinPx.value = FIRE.minPx; U.uPull.value = FIRE.pull;
        ctx.renderer.getDrawingBufferSize(dbs);
        U.uPxK.value = ctx.camera.projectionMatrix.elements[5] * dbs.y * 0.5;
        nT = 0; nG = 0; nP = 0;
        for (const c of cand) c.s = 0;
        // rounds alive now, and those from the end of the previous loop
        const R = TL.rounds;
        for (let i = lower(R, t - ROUND_LIFE); i < R.length && R[i].t <= t; i++) drawRound(R[i], t - R[i].t);
        if (t < ROUND_LIFE) for (let i = lower(R, L + t - ROUND_LIFE); i < R.length; i++) drawRound(R[i], t + L - R[i].t);
        for (const b of TL.blasts) {
          let a = t - b.t; if (a < 0) a += L;
          if (a >= 0 && a < b.life) drawBlast(b, a, L);
        }
        for (const e of TL.emitters) { drawEmitter(e, t, L); if (e.t1 + e.life > L && !e.colored) drawEmitter(e, t + L, L); }   // final pass: the LZ smoke grenades (1800) do not carry over into the loop's start (1500)
        // the haze of dust and smoke over the ridge once the fighting has gone on a while (chapters 6 and 7): a few
        // broad, very faint sprites low over the crest, drifting downwind and wrapping (fix pass)
        {
          const id = TL.id, k = id === 6 ? smooth((t - 25) / 40) : id === 7 ? 1 : 0;
          if (k > 0.01) {
            windAt(t, L);
            const c = S.battleSummit, col = night > 0.5 ? nightSmoke : smokeC;
            for (let i = 0; i < 14; i++) {
              const h1 = H(91, i), h2 = H(92, i), h3 = H(93, i);
              const span = 220, ph = ((h1 * span + t * 0.6) % span) - span / 2;
              const x = c.x + wx * ph - wz * (h2 - 0.5) * 160, z = c.z + wz * ph + wx * (h2 - 0.5) * 160;
              const edge = 1 - smooth((Math.abs(ph) - span * 0.32) / (span * 0.18));
              puff(x, gy(x, z) + 7 + h3 * 8, z, 26 + h3 * 22, col, 1.05, 300 + i, 0.07 * k * edge);
            }
          }
        }
        // live ones
        const now = ctx.clock.elapsed;
        for (let i = live.length - 1; i >= 0; i--) {
          const x = live[i], a = now - x.at;
          if (a > x.life) { live.splice(i, 1); continue; }
          if (x.round) { if (a >= 0) drawRound(x.round, a); } else if (x.blast) { if (a >= 0) drawBlast(x.blast, a, L); } else if (x.em) drawEmitter(x.em, a, L);
        }
        T.g.instanceCount = nT; G.g.instanceCount = nG; PS.g.instanceCount = nP; puffs.visible = nP > 0;
        FIRE.stats = { tracers: nT, glows: nG, puffs: nP };
        if (nT) { T.bufs.iA.needsUpdate = T.bufs.iB.needsUpdate = T.bufs.iC.needsUpdate = true; }
        if (nG) { G.bufs.iP.needsUpdate = G.bufs.iC.needsUpdate = true; }
        if (nP) { PS.bufs.iP.needsUpdate = PS.bufs.iC.needsUpdate = PS.bufs.iS.needsUpdate = true; }
        for (let i = 0; i < 4; i++) {
          const c = cand[i], l = lights[i];
          l.intensity = c.s > 0 ? Math.min(6, c.s * 2.4) * night * FIRE.nightLight : 0;
          if (c.s > 0) l.position.set(c.x, c.y, c.z);
        }
      };

      // ---------- the API ----------
      const V = (p) => ({ x: p.x, y: p.y, z: p.z });
      const target = (pos, dir, o) => {
        if (o.to) return V(o.to);
        const r = o.range || 40, d = dir || { x: 1, y: 0, z: 0 }, l = Math.hypot(d.x, d.y || 0, d.z) || 1;
        return { x: pos.x + (d.x / l) * r, y: pos.y + ((d.y || 0) / l) * r, z: pos.z + (d.z / l) * r };
      };
      // burst(pos, dir, n, { at, ch, side: 'us'|'nva', range, to, rate, tracer, sc }): n rounds from pos along dir
      // (or at `to`). With `at` (loop seconds) it joins chapter `ch`'s timeline for good (call once, in init): the
      // pure way. Without, it fires now, once.
      FIRE.burst = (pos, dir, n, o) => {
        o = o || {}; n = n || 4;
        const a = V(pos), tg = target(pos, dir, o), side = o.side === 'nva' ? 1 : 0, rate = o.rate || 9;
        const mk = (t0) => { const out = []; for (let i = 0; i < n; i++) { const t = t0 + i / rate, bx = tg.x + (H(t0, i) - 0.5) * (o.sc || 2), bz = tg.z + (H(t0 + 1, i) - 0.5) * (o.sc || 2), by = tg.y + (H(t0 + 2, i) - 0.3) * 1.2, d = Math.hypot(bx - a.x, by - a.y, bz - a.z); out.push({ t, ax: a.x, ay: a.y, az: a.z, bx, by, bz, d, dur: d / FIRE.speed, side, tracer: o.tracer !== false, fs: o.fs || (side ? 0.8 : 0.55) }); } return out; };
        if (o.at !== undefined) {
          const ch = o.ch || ctx.chapter.id;
          (extras[ch] = extras[ch] || []).push((round, blast, emitters, gunPuff) => { for (const r of mk(o.at)) TLpush(r); gunPuff(o.at, a); });
          FIRE.rebuild();
        } else {
          const now = ctx.clock.elapsed;
          for (const r of mk(0)) { const t = r.t; r.t = 0; live.push({ at: now + t, life: 1.2, round: r }); }
        }
      };
      let pendingRounds = null;
      function TLpush(r) { pendingRounds.push(r); }
      // wrap build so API rounds land in the sorted list
      const build0 = build;
      build = function (id, L) { pendingRounds = []; const tl = build0(id, L); if (pendingRounds.length) { tl.rounds.push(...pendingRounds); tl.rounds.sort((a, b) => a.t - b.t); } return tl; };
      // blast(pos, kind 'mortar'|'rocket'|'arty'|'grenade', { at, ch })
      FIRE.blast = (pos, kind, o) => {
        o = o || {}; kind = kind || 'mortar';
        const size = { mortar: 1, rocket: 1.8, arty: 1.5, grenade: 0.9 }[kind] || 1;
        const b = { t: o.at || 0, x: pos.x, y: gy(pos.x, pos.z), z: pos.z, kind, size, life: kind === 'grenade' ? 9 : 12 + size * 4, seed: 900 + Math.floor(H(pos.x, pos.z) * 1000) };
        if (o.at !== undefined) { const ch = o.ch || ctx.chapter.id; (extras[ch] = extras[ch] || []).push((round, blast) => blast(o.at, pos, kind)); FIRE.rebuild(); }
        else live.push({ at: ctx.clock.elapsed, life: b.life, blast: b });
      };
      // smoke(pos, colourHex, { at, ch, dur }): a smoke grenade or a drifting plume
      FIRE.smoke = (pos, hex, o) => {
        o = o || {};
        const e = { t0: o.at || 0, t1: (o.at || 0) + (o.dur || 15), x: pos.x, y: pos.y + 0.2, z: pos.z, every: 0.35, life: 9, size: 1.3, rise: 5, col: ctx.lin(hex || 0xbfae9a), seed: 77 + Math.floor(H(pos.z, pos.x) * 100), drift: 1.6, colored: !!hex };
        if (o.at !== undefined) { const ch = o.ch || ctx.chapter.id; (extras[ch] = extras[ch] || []).push((round, blast, emitters) => emitters.push(e)); FIRE.rebuild(); }
        else { e.t0 = 0; e.t1 = o.dur || 15; live.push({ at: ctx.clock.elapsed, life: e.t1 + e.life, em: e }); }
      };
      // flash(pos, size, { at, ch }): a single muzzle flash, no tracer
      FIRE.flash = (pos, size, o) => FIRE.burst(pos, null, 1, Object.assign({ tracer: false, fs: size || 0.8, to: pos }, o || {}));
      FIRE.schedule = () => { ensure(); return { rounds: TL.rounds.length, blasts: TL.blasts.map((b) => [b.kind, +b.t.toFixed(1)]), emitters: TL.emitters.length, positions: P && { fromWorks: P.fromWorks, slits: P.slits.length, north: P.north.map((s) => s.id), second: P.second.map((s) => s.id), s9: P.s9.id } }; };
    },
    update() { if (this._frame) this._frame(); },
  });
})();
