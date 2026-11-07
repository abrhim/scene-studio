// land.js: an example plug-in. Trees, rocks and plants on the base's terrain. Static things go in ctx.world (merged by
// material on the first frame); repeated things are instanced. Replace with the scene's own.
(function () {
  'use strict';
  window.Scene.register({
    name: 'land',
    init(ctx) {
      const { THREE } = ctx;
      // an oak: a trunk and a faceted crown, flat-shaded
      const x = -6, z = -4, y = ctx.groundY(x, z);
      ctx.add(ctx.world, new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6), ctx.mat(0x7a5236), x, y + 1.1, z);
      const leaves = ctx.mat(0x6f9a48);
      ctx.addWind(leaves, 0.02);
      const crown = ctx.add(ctx.root, ctx.jitterGeo(new THREE.IcosahedronGeometry(1.8, 1), 0.3, 3), leaves, x, y + 3.2, z, { s: [1.2, 0.9, 1.2] });
      ctx.tag('oak', () => crown.position, { r: 2.4 });
    },
  });
})();
