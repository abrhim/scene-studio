// buildings.js: an example plug-in. Chunky, massive, flat-shaded architecture with shade baked into vertex colours.
// Replace with the scene's own.
(function () {
  'use strict';
  window.Scene.register({
    name: 'buildings',
    init(ctx) {
      const { THREE } = ctx;
      // a small stone hut: thick walls, a deep doorway, a flat roof
      const x = 6, z = -6, y = ctx.groundY(x, z);
      const stone = ctx.mat(0xe8dcc0), dark = ctx.mat(0x8a6a48);
      ctx.add(ctx.world, new THREE.BoxGeometry(4, 2.6, 3.4), stone, x, y + 1.3, z);
      ctx.add(ctx.world, new THREE.BoxGeometry(4.4, 0.3, 3.8), ctx.mat(0xbfae8c), x, y + 2.75, z);
      ctx.add(ctx.world, new THREE.BoxGeometry(0.9, 1.7, 0.2), dark, x, y + 0.85, z + 1.65);
    },
  });
})();
