// sound.js: the sounds of the place, from field recordings (Abram, 2026-11-10: "can you find real sounds? not generate
// them"). Six loops in audio/, cut from Freesound recordings (credits in README.md), each loudness-matched, each a
// seamless loop. Which plays, and how loud, follows the scene's own clock, light, gusts and chapter, never a hand-set
// cue:
//   grass-wind    dry grass in wind (felix.blume, Chile)       always; the scene's gusts open it up
//   grass-gusts   wind in dry tall grass, gusts (felix.blume)  on the scene's gusts
//   day-field     a warm afternoon field in north Vietnam, grasshoppers, crickets, cicadas, birds (kevp888)  daytime
//   cicadas       two cicadas in a tree, north Vietnam (kevp888)   by the heat of the hour, 10:00-18:00
//   dusk-cicadas  evening cicadas near Angkor Wat (Automatchski)   17:00-20:00
//   night         a night in Cát Tiên, Vietnam, insects and birds (marc.om)   19:30-05:30
// Browsers start audio only after a tap or a key; the first one starts it. The speaker in the story panel turns it
// off and on (remembered in localStorage; ?sound=0 starts it off). SOUND.render({...}) renders a scripted stretch
// offline (the samples sent for review). The synthesised version this replaces is kept as sound-synth-retired.js.
(function () {
  const LS = 'himmer1968.sound';
  const FILES = ['grass-wind', 'grass-gusts', 'day-field', 'cicadas', 'dusk-cicadas', 'night'];
  window.Scene.register({
    name: 'sound',
    init(ctx) {
      const params = new URLSearchParams(location.search);
      let on = params.get('sound') !== '0';
      try { const s = localStorage.getItem(LS); if (s === 'off') on = false; if (s === 'on' && params.get('sound') !== '0') on = true; } catch (e) { /* storage blocked */ }
      const S = (window.SOUND = { on, running: false, level: 0, layers: {}, loaded: false });
      const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

      // ---------- the recordings: fetched once, decoded per context (an OfflineAudioContext decodes its own copy) ----------
      const raw = {};
      let loading = null;
      function load() {
        if (loading) return loading;
        loading = Promise.all(FILES.map(async (n) => { const r = await fetch('audio/' + n + '.mp3'); raw[n] = await r.arrayBuffer(); })).then(() => { S.loaded = true; });
        return loading;
      }
      async function decodeAll(ac) {
        await load();
        const out = {};
        for (const n of FILES) out[n] = await ac.decodeAudioData(raw[n].slice(0));
        return out;
      }

      // ---------- the graph: one looping source per recording, a gain each, set every tick ----------
      // state(): { hour (0-24 by the scene's clock), day (0-1), gust (0-1), ch (chapter id) }
      function build(ac, bufs, startOffsets) {
        const master = ac.createGain(); master.gain.value = 0;
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.4;
        master.connect(comp); comp.connect(ac.destination);
        const L = {};
        FILES.forEach((n, i) => {
          const src = ac.createBufferSource(); src.buffer = bufs[n]; src.loop = true;
          const g = ac.createGain(); g.gain.value = 0;
          src.connect(g); g.connect(master);
          // each loop starts somewhere along itself, so two visits never sound the same, and a render is seeded
          const off = startOffsets ? startOffsets[i] % bufs[n].duration : Math.random() * bufs[n].duration;
          src.start(0, off);
          L[n] = { src, g };
        });
        let fade = 0;
        function tick(now, dt, st) {
          const { hour, gust, ch } = st;
          const ramp = (p, v, tc) => { p.cancelScheduledValues(now); p.setTargetAtTime(v, now, tc || 0.4); };
          const night = hour < 5.5 || hour > 19.6 ? 1 : hour < 7 ? sm(7, 5.5, hour) : hour > 18.2 ? sm(18.2, 19.6, hour) : 0;
          const dayK = 1 - night;
          const heat = sm(9.5, 11.5, hour) * (1 - sm(16.5, 18.2, hour));
          const dusk = sm(16.5, 17.5, hour) * (1 - sm(19.3, 20.3, hour));
          const fight = ch === 3 || ch === 6 || ch === 7 ? 0.75 : 1;        // the fighting will have its own layer; the field thins a little under it
          const grassK = ch === 1 || ch === 11 ? 0.6 : 1;                    // on the hill the grass is trodden; on the ridge it is 2 m high
          const quietK = ch === 9 || ch === 10 ? 0.75 : 1;                   // the night and first light run quieter
          fade = Math.min(1, fade + dt / 2.5);
          ramp(master.gain, 0.9 * fade, 0.3);
          ramp(L['grass-wind'].g.gain, (0.45 + 0.35 * gust) * grassK * quietK, 0.6);
          ramp(L['grass-gusts'].g.gain, 0.9 * Math.pow(gust, 1.4) * grassK * quietK, 0.35);
          ramp(L['day-field'].g.gain, 0.8 * dayK * fight, 1.0);
          ramp(L.cicadas.g.gain, 0.7 * heat * fight, 1.2);
          ramp(L['dusk-cicadas'].g.gain, 0.55 * dusk, 1.2);
          ramp(L.night.g.gain, 0.85 * night * quietK, 1.2);
          S.level = fade;
        }
        return { master, tick, L };
      }

      // ---------- live ----------
      let ac = null, G = null, last = 0;
      const liveState = () => ({ hour: ctx.chapter.minutes / 60, day: ctx.light.day, gust: ctx.wind.gust, ch: ctx.chapter.id });
      async function start() {
        if (ac || !S.on) return;
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const a = (ac = new AC());
        const bufs = await decodeAll(a);
        if (ac !== a) return;   // turned off while loading
        G = build(a, bufs); S.running = true; last = a.currentTime; S.ac = a; S.layers = G.L;
      }
      function stop() { if (!ac) return; const a = ac; ac = null; G = null; S.running = false; try { a.close(); } catch (e) { /* closed */ } }
      const firstGesture = () => { if (S.on) start(); };
      window.addEventListener('pointerdown', firstGesture, { passive: true });
      window.addEventListener('keydown', firstGesture);
      load();   // fetch the files early, so the first tap starts the sound at once
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

      // ---------- offline render for review: SOUND.render({ ch, hour, seconds, seed }) → [left, right] ----------
      S.render = async (o) => {
        const sr = 44100, sec = o.seconds || 20, oc = new OfflineAudioContext(2, sr * sec, sr);
        const bufs = await decodeAll(oc);
        const seed = o.seed || 11, offs = FILES.map((n, i) => ((seed * 7919 + i * 104729) % 1000) / 1000 * 300);
        const st = { hour: o.hour, day: 1, gust: 0, ch: o.ch || 1 };
        const g = build(oc, bufs, offs);
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
