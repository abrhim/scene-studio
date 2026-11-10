// sound.js: the sounds of the place, from field recordings (Abram, 2026-11-10: "can you find real sounds? not generate
// them"; "nature sounds first, then the talking and small chatter, then the radio, then the fighting sounds"; the
// gunshots "vary in sounds and distance and quality of gun that match the visual gun shots", "not too too loud").
// Everything in audio/ is cut from Freesound and BBC archive recordings (credits and licences in README.md).
//   Beds (loops, by the scene's clock, gusts and chapter; never a hand-set cue):
//     grass-wind, grass-gusts            dry grass in wind; the scene's gusts open it up
//     day-field, cicadas, dusk-cicadas, night   north-Vietnam field by day, two cicadas by the heat, Angkor evening, a Cát Tiên night
//     patrol-talk, work-talk             GIs on patrol / men working, Vietnam (BBC), band-limited so they read as men talking, not as lines
//     undergrowth, digging               soldiers moving through undergrowth; digging in stony ground (BBC)
//   The radio (radio.js's hooks): a handset lifted and the carrier opening as a hop lights, the squelch tail and the
//     handset put down as a call goes quiet; by the distance of that radio from the camera.
//   The fighting (fire.js's hooks): one shot per drawn round, by weapon (NVA: AK-47; Marines: M16; single shots from
//     the Cu Chi range recording), one blast per drawn burst (mortar near or far, rockets and artillery big), each by
//     distance (level and a low-pass), direction (pan) and the sound's own delay (340 m/s), so a far flash is seen
//     before it is heard. At most 28 shots sound at once.
// Browsers start audio only after a tap or a key; the first one starts it. The speaker in the story panel turns it off
// and on (remembered in localStorage; ?sound=0 starts it off). SOUND.render({...}) renders the beds offline;
// SOUND.capture(seconds) records the live mix (the samples sent for review).
(function () {
  const LS = 'himmer1968.sound';
  const BEDS = ['grass-wind', 'grass-gusts', 'day-field', 'cicadas', 'dusk-cicadas', 'night', 'patrol-talk', 'work-talk', 'undergrowth', 'digging'];
  const SETS = {
    m16: ['shot-m16-1', 'shot-m16-2', 'shot-m16-3', 'shot-m16-4', 'shot-m16-5', 'shot-m16-6'],
    ak: ['shot-ak-1', 'shot-ak-2', 'shot-ak-3', 'shot-ak-4', 'shot-ak-5', 'shot-ak-6'],
    m60: ['shot-m60-1', 'shot-m60-2', 'shot-m60-3', 'shot-m60-4'],
    mortar: ['blast-mortar-1', 'blast-mortar-2', 'blast-mortar-3', 'blast-mortar-4'],
    far: ['blast-far-1', 'blast-far-2', 'blast-far-3', 'blast-far-4'],
    big: ['blast-big-1', 'blast-big-2', 'blast-big-3'],
    radio: ['handset-up', 'handset-down', 'squelch-end', 'squelch-static'],
  };
  const ONES = Object.values(SETS).flat();
  const FILES = BEDS.concat(ONES);
  window.Scene.register({
    name: 'sound',
    init(ctx) {
      const params = new URLSearchParams(location.search);
      let on = params.get('sound') !== '0';
      try { const s = localStorage.getItem(LS); if (s === 'off') on = false; if (s === 'on' && params.get('sound') !== '0') on = true; } catch (e) { /* storage blocked */ }
      const S = (window.SOUND = { on, running: false, level: 0, layers: {}, loaded: false, voices: 0, stats: { shots: 0, blasts: 0, dropped: 0, radio: 0 } });
      const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const THREE = ctx.THREE, V = new THREE.Vector3();

      // ---------- the recordings: fetched once, decoded per context ----------
      const raw = {};
      let loading = null;
      function load() {
        if (loading) return loading;
        loading = Promise.all(FILES.map(async (n) => { const r = await fetch('audio/' + n + '.mp3'); raw[n] = await r.arrayBuffer(); })).then(() => { S.loaded = true; });
        return loading;
      }
      async function decodeAll(ac, names) {
        await load();
        const out = {};
        for (const n of names) out[n] = await ac.decodeAudioData(raw[n].slice(0));
        return out;
      }

      // ---------- the graph ----------
      // state(): { hour (0-24 by the scene's clock), gust (0-1), ch (chapter id) }
      function build(ac, bufs, startOffsets) {
        const master = ac.createGain(); master.gain.value = 0;
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.4;
        master.connect(comp); comp.connect(ac.destination);
        const beds = ac.createGain(); beds.gain.value = 1; beds.connect(master);
        const sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);
        const L = {};
        BEDS.forEach((n, i) => {
          if (!bufs[n]) return;
          const src = ac.createBufferSource(); src.buffer = bufs[n]; src.loop = true;
          const g = ac.createGain(); g.gain.value = 0;
          src.connect(g); g.connect(beds);
          const off = startOffsets ? startOffsets[i] % bufs[n].duration : Math.random() * bufs[n].duration;
          src.start(0, off);
          L[n] = { src, g };
        });
        // chatter and movement by chapter (the men the chapter is with); 0 where nobody talks or moves in the open
        const TALK = { 1: { 'work-talk': 0.5, digging: 0.35 }, 2: { 'patrol-talk': 0.55, undergrowth: 0.5 }, 4: { 'work-talk': 0.35 }, 5: { 'patrol-talk': 0.45, undergrowth: 0.45 }, 8: { undergrowth: 0.3, 'patrol-talk': 0.12 }, 11: { 'work-talk': 0.3 } };
        let fade = 0;
        function tick(now, dt, st) {
          const { hour, gust, ch } = st;
          const ramp = (p, v, tc) => { p.cancelScheduledValues(now); p.setTargetAtTime(v, now, tc || 0.4); };
          const night = hour < 5.5 || hour > 19.6 ? 1 : hour < 7 ? sm(7, 5.5, hour) : hour > 18.2 ? sm(18.2, 19.6, hour) : 0;
          const dayK = 1 - night;
          const heat = sm(9.5, 11.5, hour) * (1 - sm(16.5, 18.2, hour));
          const dusk = sm(16.5, 17.5, hour) * (1 - sm(19.3, 20.3, hour));
          const fight = ch === 3 || ch === 6 || ch === 7 ? 0.75 : 1;
          const grassK = ch === 1 || ch === 11 ? 0.6 : 1;
          const quietK = ch === 9 || ch === 10 ? 0.75 : 1;
          fade = Math.min(1, fade + dt / 2.5);
          ramp(master.gain, 0.9 * fade, 0.3);
          const set = (n, v, tc) => { if (L[n]) ramp(L[n].g.gain, v, tc); };
          set('grass-wind', (0.45 + 0.35 * gust) * grassK * quietK, 0.6);
          set('grass-gusts', 0.9 * Math.pow(gust, 1.4) * grassK * quietK, 0.35);
          set('day-field', 0.8 * dayK * fight, 1.0);
          set('cicadas', 0.7 * heat * fight, 1.2);
          set('dusk-cicadas', 0.55 * dusk, 1.2);
          set('night', 0.85 * night * quietK, 1.2);
          const T = TALK[ch] || {};
          for (const n of ['patrol-talk', 'work-talk', 'undergrowth', 'digging']) set(n, T[n] || 0, 2.0);
          S.level = fade;
        }
        // ---------- one-shots: a sample placed in the world, heard from the camera ----------
        let voices = 0;
        const pick = (set) => { const a = SETS[set]; return bufs[a[Math.floor(Math.random() * a.length)]]; };
        // d: metres from the camera; pan: -1..1; lp: the low-pass cutoff; delay: seconds (the sound's own travel time)
        function play(buf, o) {
          if (!buf) return false;
          const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = o.rate || 1;
          const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp || 12000; lp.Q.value = 0.5;
          const g = ac.createGain(); g.gain.value = o.gain;
          const pan = ac.createStereoPanner(); pan.pan.value = clamp(o.pan || 0, -1, 1);
          src.connect(lp); lp.connect(g); g.connect(pan); pan.connect(sfx);
          voices++; S.voices = voices; src.onended = () => { voices--; S.voices = voices; };
          src.start(ac.currentTime + (o.delay || 0));
          return true;
        }
        // where a world point is, from the camera: distance, pan, and the fall-off of level and brightness with it
        const cam = ctx.camera;
        function from(x, y, z) {
          V.set(x, y, z); const d = Math.max(1.5, V.distanceTo(cam.position));
          V.applyMatrix4(cam.matrixWorldInverse); const pan = clamp(V.x / (Math.hypot(V.x, V.z) || 1), -1, 1) * 0.8;
          return { d, pan };
        }
        function shot(ev) {
          const { d, pan } = from(ev.x, ev.y, ev.z);
          if (voices >= 28) { S.stats.dropped++; return; }
          const set = ev.side ? 'ak' : 'm16';
          // level: full at 12 m, 1/4 at 60 m, about 1/13 at 300 m (never gone: a far shot is still a crack); brightness falls with distance
          const gain = 0.38 * Math.pow(clamp(12 / d, 0.04, 1), 0.85) * (0.85 + Math.random() * 0.3);
          const lp = 700 + 9000 * clamp(25 / d, 0.1, 1);
          play(pick(set), { gain, lp, pan, delay: d / 340, rate: 0.96 + Math.random() * 0.08 });
          S.stats.shots++;
        }
        function blast(ev) {
          const { d, pan } = from(ev.x, ev.y, ev.z);
          const big = ev.blast === 'rocket' || ev.blast === 'arty';
          const set = big ? 'big' : ev.blast === 'grenade' ? 'mortar' : d < 90 ? 'mortar' : 'far';
          const base = big ? 0.7 : ev.blast === 'grenade' ? 0.4 : 0.6;
          const gain = base * Math.pow(clamp(30 / d, 0.08, 1), 0.7);
          const lp = 500 + 7000 * clamp(40 / d, 0.12, 1);
          play(pick(set), { gain, lp, pan, delay: d / 340, rate: ev.blast === 'grenade' ? 1.15 : 0.95 + Math.random() * 0.1 });
          S.stats.blasts++;
        }
        function radioEv(ev) {
          const { d, pan } = from(ev.p.x, ev.p.y, ev.p.z);
          const g = 0.32 * clamp(10 / d, 0.15, 1);
          if (ev.kind === 'open') { play(bufs['handset-up'], { gain: g, pan, lp: 6000 }); play(bufs['squelch-static'], { gain: g * 0.6, pan, lp: 5000, delay: 0.25 }); }
          else { play(bufs['squelch-end'], { gain: g * 0.7, pan, lp: 5000 }); play(bufs['handset-down'], { gain: g, pan, lp: 6000, delay: 0.3 }); }
          S.stats.radio++;
        }
        return { master, tick, L, shot, blast, radioEv };
      }

      // ---------- live ----------
      let ac = null, G = null, last = 0;
      const liveState = () => ({ hour: ctx.chapter.minutes / 60, gust: ctx.wind.gust, ch: ctx.chapter.id });
      async function start() {
        if (ac || !S.on) return;
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const a = (ac = new AC());
        const bufs = await decodeAll(a, FILES);
        if (ac !== a) return;   // turned off while loading
        G = build(a, bufs); S.running = true; last = a.currentTime; S.ac = a; S.layers = G.L; S.master = G.master;
        // the events that queued before the sound started are stale
        if (window.FIRE && FIRE.sfx) FIRE.sfx.length = 0; if (window.radio && radio.sfx) radio.sfx.length = 0;
      }
      function stop() { if (!ac) return; const a = ac; ac = null; G = null; S.running = false; try { a.close(); } catch (e) { /* closed */ } }
      const firstGesture = () => { if (S.on) start(); };
      window.addEventListener('pointerdown', firstGesture, { passive: true });
      window.addEventListener('keydown', firstGesture);
      load();
      S.set = (v) => { S.on = !!v; try { localStorage.setItem(LS, S.on ? 'on' : 'off'); } catch (e) { /* storage blocked */ } if (S.on) start(); else stop(); draw(); };
      S.toggle = () => S.set(!S.on);
      this.u = (t, dt) => {
        if (!ac || !G) return;
        if (ac.state === 'suspended') { ac.resume(); return; }
        // the hooks: every round, blast and radio event since the last frame
        const F = window.FIRE && FIRE.sfx; if (F && F.length) { for (const ev of F) { if (ev.kind === 'round') G.shot(ev); else G.blast(ev); } F.length = 0; }
        const R = window.radio && radio.sfx; if (R && R.length) { for (const ev of R) G.radioEv(ev); R.length = 0; }
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

      // ---------- for review: an offline render of the beds, and a live capture of the whole mix ----------
      S.render = async (o) => {
        const sr = 44100, sec = o.seconds || 20, oc = new OfflineAudioContext(2, sr * sec, sr);
        const bufs = await decodeAll(oc, BEDS);
        const seed = o.seed || 11, offs = BEDS.map((n, i) => ((seed * 7919 + i * 104729) % 1000) / 1000 * 300);
        const st = { hour: o.hour, gust: 0, ch: o.ch || 1 };
        const g = build(oc, bufs, offs);
        const step = 0.1; let t = 0;
        const arm = () => oc.suspend(t).then(() => { const gp = ((t + 8) % 24 - 14) / 6; st.gust = gp > 0 && gp < 1 ? Math.sin(Math.PI * gp) : 0; g.tick(t, step, st); t += step; if (t < sec - step) arm(); oc.resume(); });
        arm();
        const buf = await oc.startRendering();
        return [buf.getChannelData(0), buf.getChannelData(1)];
      };
      // capture(seconds): records what the live context plays (after start()) and resolves to a base64 webm/opus
      S.capture = (seconds) => new Promise((res, rej) => {
        if (!ac || !G) { rej(new Error('sound not running')); return; }
        const dest = ac.createMediaStreamDestination(); G.master.connect(dest);
        const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 }), chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(new Blob(chunks, { type: 'audio/webm' })); };
        rec.start(); setTimeout(() => rec.stop(), seconds * 1000);
      });
    },
    update(t, dt, ctx) { if (this.u) this.u(t, dt); },
  });
})();
