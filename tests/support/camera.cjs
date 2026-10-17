'use strict';

const { loadGame, settle } = require('./game.cjs');

async function loadCameraGame(
  page,
  { mobile = true, beforeAdapter, scripts = ['game.js', 'camera.js'] } = {},
) {
  await page.addInitScript(() => {
    window.nativeViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  });
  await loadGame(page, {
    scripts,
    bundle: mobile,
    beforeAdapter,
  });
  if (!mobile) {
    await page.addStyleTag({
      content:
        'html,body{margin:0;overflow:visible!important;touch-action:auto!important}#game-container{position:absolute;left:0!important;top:0!important;transform:none!important;width:100vw!important;height:100vh!important;touch-action:auto!important}#game-canvas{width:100%;height:100%;touch-action:auto!important}#ui-container{display:none!important}',
    });
  }
  await settle(page);
}

module.exports = { loadCameraGame };
