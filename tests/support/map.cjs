const { loadGame, settle } = require('./game.cjs');

async function loadMapGame(page, { beforeAdapter } = {}) {
  await page.addInitScript(() => {
    window.nativeMapViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  });
  await loadGame(page, {
    scripts: ['game.js', 'map/markup.js', 'map/native-controls.js', 'map/native-queue.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() =>
        Object.defineProperty(window, 'visualViewport', window.nativeMapViewport),
      );
      if (beforeAdapter) await beforeAdapter(page);
    },
  });
  await settle(page);
}

module.exports = { loadMapGame };
