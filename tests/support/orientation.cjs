'use strict';

const { loadGame } = require('./game.cjs');

async function loadNativeOrientation(page, orientation = 'portrait', insets = {}) {
  await loadGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate(
        ({ orientation, insets }) => {
          for (const [side, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
          localStorage.setItem(
            'sw_mobile_orientation',
            orientation === 'portrait' ? 'landscape' : 'portrait',
          );
          window.fixtureOrientation = { accepted: orientation, calls: [], pending: null };
          window.androidBridge = { postMessage() {} };
          window.Capacitor = {
            isNativePlatform: () => true,
            PluginHeaders: [
              {
                name: 'ScapewatchOrientation',
                methods: [
                  { name: 'getOrientation', rtype: 'promise' },
                  { name: 'setOrientation', rtype: 'promise' },
                ],
              },
            ],
            nativePromise(plugin, method, options) {
              const native = window.fixtureOrientation;
              native.calls.push([plugin, method, options || null]);
              if (method === 'getOrientation')
                return Promise.resolve({ orientation: native.accepted, supported: true });
              return new Promise((resolve, reject) => {
                native.pending = { requested: options.orientation, resolve, reject };
              });
            },
          };
        },
        { orientation, insets },
      );
    },
  });
}

module.exports = { loadNativeOrientation };
