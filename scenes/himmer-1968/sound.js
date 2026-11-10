// sound.js: the sounds of the place, made in code (Web Audio), nothing recorded. Nature first (Abram, 2026-11-10:
// "Nature sounds first. Then we add the talking and small chatter, then the radio, then the fighting sounds").
//   wind      filtered noise that follows the scene's own gusts (ctx.wind.gust), with a slow breath of its own
//   grass     a high rustle on each gust, full on the ridge chapters, half on the hill
//   cicadas   two voices, swelling and dying away, by the heat of the hour (10:00-18:00), and never at night
//   birds     short calls at dawn and in the morning, placed left and right, near and far; few while the fighting is on
//   crickets  three trilling voices at dusk and through the night; frogs from the draw in the night chapters
// Everything reads the scene's clock (ctx.chapter.minutes), light (ctx.light.day) and chapter, so a layer is never
// scripted to a chapter by hand: dusk brings the crickets up because the clock says dusk.
// Browsers start audio only after a tap or a key; the first one starts it. The speaker in the story panel turns it
// off and on (remembered in localStorage; ?sound=0 starts it off). SOUND.render({...}) renders a scripted stretch
// offline (the samples sent for review).
(function () {
  const LS = 'himmer1968.sound';
  window.Scene.register({
    name: 'sound',
    init(ctx) {
      const params = new URLSearchParams(location.search);
      let on = params.get('sound') !== '0';
      try { const s = localStorage.getItem(LS); if (s === 'off') on = false; if (s === 'on' && params.get('sound') !== '0') on = true; } catch (e) { /* storage blocked */ }
      const S = (window.SOUND = { on, running: false, level: 0, layers: {} });
      const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      const rnd = () => Math.random();

      // ---------- the graph: built on a live AudioContext, or an OfflineAudioContext for a render ----------
      // state(): { hour (0-24 by the scene's clock), day (0-1), gust (0-1), ch (chapter id) }
      function build(ac, state, seed) {
        let r0 = seed || 7; const rr = () => { r0 = (r0 * 1103515245 + 12345) & 0x7fffffff; return r0 / 0x7fffffff; };
        const R = seed ? rr : rnd;
        const master = ac.createGain(); master.gain.value = 0;
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
        master.connect(comp); comp.connect(ac.destination);
        // one looped noise buffer feeds every noise layer
        const nb = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
        { const d = nb.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = R() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; } }
        const noise = ac.createBufferSource(); noise.buffer = nb; noise.loop = true; noise.start();
        // and a white one for the high, dry layers (pink noise has next to nothing left at 3-7 kHz)
        const wb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
        { const d = wb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * 0.5; }
        const white = ac.createBufferSource(); white.buffer = wb; white.loop = true; white.start();
        const L = {};
        // wind: a low band that opens with the gust, and a slow breath of its own
        { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.6;
          const g = ac.createGain(); g.gain.value = 0; noise.connect(lp); lp.connect(g); g.connect(master);
          L.wind = { lp, g, ph: R() * 10 }; }
        // grass: the rustle, high and dry
        { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.7;
          const g = ac.createGain(); g.gain.value = 0; white.connect(bp); bp.connect(g); g.connect(master);
          L.grass = { bp, g }; }
        // cicadas: narrow bands of noise, each shaken at its own rate, swelling and dying away
        L.cicadas = [];
        for (let i = 0; i < 2; i++) {
          const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5400 + i * 1100 + R() * 300; bp.Q.value = 9;
          const am = ac.createGain(); am.gain.value = 0; const lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 85 + i * 30 + R() * 20;
          const lg = ac.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); lfo.start();
          const g = ac.createGain(); g.gain.value = 0; const pan = ac.createStereoPanner(); pan.pan.value = i ? 0.55 : -0.5;
          white.connect(bp); bp.connect(am); am.connect(g); g.connect(pan); pan.connect(master);
          L.cicadas.push({ g, am, swell: 0, next: 2 + R() * 4, on: false, k: 0 });
        }
        // crickets: a pure tone chopped into a trill, three voices at three pitches
        L.crickets = [];
        for (let i = 0; i < 3; i++) {
          const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 3900 + i * 380 + R() * 120;
          const chop = ac.createGain(); chop.gain.value = 0.5; const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 17 + i * 4 + R() * 3;
          const lg = ac.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(chop.gain); lfo.start();
          const g = ac.createGain(); g.gain.value = 0; const pan = ac.createStereoPanner(); pan.pan.value = [-0.7, 0.2, 0.75][i];
          o.connect(chop); chop.connect(g); g.connect(pan); pan.connect(master); o.start();
          L.crickets.push({ g, on: false, next: R() * 2, k: 0 });
        }
        // frogs and birds: short voices scheduled as they come
        const voice = (type) => { const o = ac.createOscillator(); o.type = type; const g = ac.createGain(); g.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000; const pan = ac.createStereoPanner(); o.connect(g); g.connect(lp); lp.connect(pan); pan.connect(master); o.start(); return { o, g, lp, pan, busy: 0 }; };
        L.frogs = [voice('triangle'), voice('triangle')]; L.frogNext = 1 + R() * 3;
        L.birds = [voice('sine'), voice('sine'), voice('sine')]; L.birdNext = 0.5 + R() * 2;
        const birdCall = (v, now, far) => {
          const o = v.o, g = v.g, f0 = 2300 + R() * 1200, kind = R(), lvl = (0.08 + R() * 0.07) * (1 - 0.6 * far);
          v.pan.pan.setValueAtTime(R() * 1.6 - 0.8, now); v.lp.frequency.setValueAtTime(far ? 3500 : 9000, now);
          g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(0, now);
          let t = now;
          if (kind < 0.45) {          // a run of rising chips
            const n = 3 + Math.floor(R() * 3);
            for (let i = 0; i < n; i++) { o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.06); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.012); g.gain.linearRampToValueAtTime(0, t + 0.065); t += 0.11 + R() * 0.05; }
          } else if (kind < 0.75) {   // a long falling whistle
            o.frequency.setValueAtTime(f0 * 1.5, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + 0.32);
            g.gain.linearRampToValueAtTime(lvl, t + 0.03); g.gain.setValueAtTime(lvl, t + 0.24); g.gain.linearRampToValueAtTime(0, t + 0.34); t += 0.4;
          } else {                    // two notes, the second higher
            o.frequency.setValueAtTime(f0 * 0.8, t); g.gain.linearRampToValueAtTime(lvl, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.13);
            o.frequency.setValueAtTime(f0 * 1.2, t + 0.17); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.3); g.gain.setValueAtTime(0, t + 0.17); g.gain.linearRampToValueAtTime(lvl, t + 0.19); g.gain.linearRampToValueAtTime(0, t + 0.34); t += 0.4;
          }
          v.busy = t + 0.1;
        };
        const frogCall = (v, now) => {
          const f0 = 330 + R() * 160, lvl = 0.1 + R() * 0.05, n = 1 + Math.floor(R() * 3);
          v.pan.pan.setValueAtTime(R() * 1.2 - 0.6, now); v.lp.frequency.setValueAtTime(1800, now);
          let t = now; v.g.gain.cancelScheduledValues(now); v.g.gain.setValueAtTime(0, now);
          for (let i = 0; i < n; i++) { v.o.frequency.setValueAtTime(f0 * 1.15, t); v.o.frequency.exponentialRampToValueAtTime(f0, t + 0.12); v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(lvl, t + 0.02); v.g.gain.linearRampToValueAtTime(0, t + 0.16); t += 0.26 + R() * 0.08; }
          v.busy = t + 0.1;
        };

        // tick(now, dt): the levels for this moment, set with short ramps so nothing clicks
        let fade = 0;
        function tick(now, dt, st) {
          const { hour, day, gust, ch } = st;
          const ramp = (p, v, tc) => { p.cancelScheduledValues(now); p.setTargetAtTime(v, now, tc || 0.12); };
          const night = hour < 5.5 || hour > 19.6 ? 1 : hour < 7 ? sm(7, 5.5, hour) : hour > 18 ? sm(18, 19.6, hour) : 0;
          const heat = sm(9.5, 11.5, hour) * (1 - sm(16.5, 18.2, hour)) * (1 - night);
          const dawn = (sm(5.2, 6.2, hour) * (1 - sm(8.5, 10.5, hour)) * 0.85 + 0.15) * (1 - night);
          const fight = ch === 3 || ch === 6 || ch === 7 ? 0.25 : ch === 4 || ch === 5 ? 0.6 : 1;
          const grassK = ch === 1 || ch === 11 ? 0.5 : 1;
          const quietK = ch === 9 || ch === 10 ? 0.7 : 1;
          fade = Math.min(1, fade + dt / 2.5);
          ramp(master.gain, 1.0 * fade, 0.3);
          // wind
          { const W = L.wind; W.ph += dt * 0.07; const breath = 0.5 + 0.5 * Math.sin(W.ph * 6.28) * Math.cos(W.ph * 2.1);
            ramp(W.lp.frequency, 240 + 160 * breath + 520 * gust, 0.5);
            ramp(W.g.gain, (0.11 + 0.06 * breath + 0.2 * gust) * quietK, 0.5); }
          // grass
          ramp(L.grass.g.gain, (0.01 + 0.09 * Math.pow(gust, 1.4)) * grassK * quietK, 0.25);
          // cicadas: each swells for 4-9 s, rests 3-8 s
          for (const C of L.cicadas) {
            C.next -= dt;
            if (C.next <= 0) { C.on = !C.on; C.next = C.on ? 4 + R() * 5 : 3 + R() * 5; }
            C.k += ((C.on ? 1 : 0) - C.k) * Math.min(1, dt / (C.on ? 1.6 : 2.4));
            ramp(C.g.gain, 0.28 * C.k * heat, 0.3); ramp(C.am.gain, 0.5, 0.3);
          }
          // crickets: trills of 0.4-0.9 s, pauses of 0.3-1.4 s
          for (const K of L.crickets) {
            K.next -= dt;
            if (K.next <= 0) { K.on = !K.on; K.next = K.on ? 0.4 + R() * 0.5 : 0.3 + R() * 1.1; }
            K.k += ((K.on ? 1 : 0) - K.k) * Math.min(1, dt / 0.05);
            ramp(K.g.gain, 0.08 * K.k * night, 0.03);
          }
          // frogs: in the night chapters only, from the draw
          L.frogNext -= dt;
          if (L.frogNext <= 0) { L.frogNext = 1.5 + R() * 6; const frogK = night * (ch === 9 ? 1 : ch === 8 || ch === 10 ? 0.45 : 0); if (frogK > 0.05 && R() < frogK) { const v = L.frogs.find((q) => q.busy < now); if (v) frogCall(v, now); } }
          // birds: at dawn and in the morning, fewer while the fighting is on, none at night
          L.birdNext -= dt;
          if (L.birdNext <= 0) { const rate = dawn * fight * (1 - night); L.birdNext = rate > 0.01 ? (0.6 + R() * 2.2) / Math.max(0.12, rate) : 1; if (rate > 0.01) { const v = L.birds.find((q) => q.busy < now); if (v) birdCall(v, now, R() < 0.5); } }
          S.level = fade;
        }
        L.birdCall = birdCall; L.frogCall = frogCall;
        return { master, tick, L };
      }

      S.build = build;   // for the sound study's measurements
      // ---------- live ----------
      let ac = null, G = null, last = 0;
      const liveState = () => ({ hour: ctx.chapter.minutes / 60, day: ctx.light.day, gust: ctx.wind.gust, ch: ctx.chapter.id });
      function start() {
        if (ac || !S.on) return;
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ac = new AudioContext(); G = build(ac, liveState); S.running = true; last = ac.currentTime;
        S.ac = ac; S.layers = G.L;
      }
      function stop() { if (!ac) return; const a = ac; ac = null; G = null; S.running = false; try { a.close(); } catch (e) { /* closed */ } }
      const firstGesture = () => { if (S.on) start(); };
      window.addEventListener('pointerdown', firstGesture, { passive: true });
      window.addEventListener('keydown', firstGesture);
      S.set = (v) => { S.on = !!v; try { localStorage.setItem(LS, S.on ? 'on' : 'off'); } catch (e) { /* storage blocked */ } if (S.on) start(); else stop(); draw(); };
      S.toggle = () => S.set(!S.on);
      this.u = (t, dt) => {
        if (!ac || !G) return;
        if (ac.state === 'suspended') { ac.resume(); return; }
        const now = ac.currentTime, d = Math.min(0.25, now - last); if (d < 0.04) return; last = now;
        G.tick(now, d, liveState());
      };

      // ---------- the speaker in the story panel ----------
      const box = document.createElement('div'); box.className = 'snd';
      const css = document.createElement('style');
      css.textContent = '#story .snd{display:inline-flex;align-items:center;gap:6px;margin:5px 0 0 12px;vertical-align:top;font:12px/1 Georgia,serif;color:#e6d6ac;text-transform:none;letter-spacing:0}' +
        '#story .snd button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid rgba(240,212,138,.35);border-radius:9px;color:#cdbf98}' +
        '#story .snd button[aria-pressed=true]{background:rgba(240,212,138,.22);color:#f6e6b8}#story .snd svg{display:block}' +
        '#story .snd button:focus-visible{outline:2px solid #f0d48a;outline-offset:-2px}';
      document.head.appendChild(css);
      box.innerHTML = '<button type="button" aria-label="Sound"><svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path class="w" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg><span>Sound</span></button>';
      const btn = box.querySelector('button');
      function draw() { btn.setAttribute('aria-pressed', S.on ? 'true' : 'false'); btn.querySelector('.w').style.opacity = S.on ? 1 : 0.25; btn.lastChild.textContent = S.on ? 'Sound on' : 'Sound off'; }
      btn.addEventListener('click', (e) => { e.stopPropagation(); S.toggle(); });
      const mount = () => { const mk = document.querySelector('#story .mk'); const head = document.querySelector('#story .head .t'); if (mk) mk.appendChild(box); else if (head) head.appendChild(box); else return false; return true; };
      if (!mount()) setTimeout(mount, 500);
      draw();

      // ---------- offline render for review: SOUND.render({ ch, hour, day, seconds, seed }) → [left, right] ----------
      S.render = async (o) => {
        const sr = 44100, sec = o.seconds || 20, oc = new OfflineAudioContext(2, sr * sec, sr);
        const st = { hour: o.hour, day: o.day === undefined ? 1 : o.day, gust: 0, ch: o.ch || 1 };
        const g = build(oc, () => st, o.seed || 11);
        // (an offline context runs ahead of time: arm each suspend before the render reaches it)
        const step = 0.1; let t = 0;
        const arm = () => oc.suspend(t).then(() => { const gp = ((t + 8) % 24 - 14) / 6; st.gust = gp > 0 && gp < 1 ? Math.sin(Math.PI * gp) : 0; g.tick(t, step, st); t += step; if (t < sec - step) arm(); oc.resume(); });
        arm();
        const buf = await oc.startRendering();
        return [buf.getChannelData(0), buf.getChannelData(1)];
      };
    },
    update(t, dt, ctx) { if (this.u) this.u(t, dt); },
  });
})();
