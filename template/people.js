// people.js: an example plug-in. Blocky figures on one rig (one draw call), driven by a Script that loops with the
// cycle, with soft shadows and tappable heads. A tap starts a small moment: the walker waves for a few seconds.
// Replace with the scene's own.
(function () {
  'use strict';
  window.Scene.register({
    name: 'people',
    init(ctx) {
      const B = ctx.Blocky, K = ctx.figureKit, rig = ctx.kit.makeRig();
      const f = B.make(ctx.kit, rig, { preset: 'man', col: { robe: 0xd8c8a4, mantle: 0x3f5f9a } });
      B.finish(rig, ctx.root);
      f.floor = ctx.surfaceY;
      const S = new K.Script(-8, 4, Math.PI / 2, 'walker');
      S.walk([[8, 5]], 0.9, f);
      S.hold(4, (s) => ({ pose: K.idle(s, 1, f.base) }));
      S.walk([[-8, 4]], 0.9, f);
      S.holdTo(180, (s) => ({ pose: K.idle(s, 2, f.base) }));
      this.f = f; this.S = S; this.shadow = ctx.blob(f.shadowR); this.waveAt = -99;
      ctx.tag('walker', () => f.headTop(), { onTap: (now) => { this.waveAt = now; } });
    },
    update(t, dt, ctx) {
      const st = this.S.sample(ctx.cycle.t, { t, ct: ctx.cycle.t, n: ctx.cycle.n });
      // a tapped moment: a wave for 3 s, blended in and out, laid over whatever the timeline says
      const w = window.Motion.win(t - this.waveAt, 0, 3, 0.5);
      if (w > 0) {
        st.pose = ctx.figureKit.mix(st.pose, ctx.figureKit.P(Object.assign({}, this.f.base, { af1: 2.6, ao1: 0.5, e1: 0.4 + 0.3 * Math.sin(t * 9), hx: -0.1 })), w);
      }
      this.f.set(st);
      this.f.eyes.scale.y = window.Motion.blink(t, 3);
      const p = this.f.root.position;
      this.shadow.set(p.x, ctx.surfaceY(p.x, p.z), p.z);
    },
  });
})();
