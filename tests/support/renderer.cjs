'use strict';

const path = require('node:path');
const { buildSync } = require('esbuild');
const { loadGame, settle } = require('./game.cjs');

const rendererScript = buildSync({
  entryPoints: [path.resolve(__dirname, '../../src/mobile-renderer.js')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'ScapewatchRenderer',
  target: 'es2022',
}).outputFiles[0].text;

async function loadRenderer(
  page,
  { origin = 'https://play.scapewatch.com', fakeImages = false } = {},
) {
  await loadGame(page, {
    origin,
    scripts: [],
    bundle: false,
    beforeAdapter: async (page) => {
      await page.addStyleTag({
        content:
          'html,body{margin:0;width:100%;height:100%;overflow:hidden}#game-container{position:absolute;left:0;top:0;width:100vw;height:100vh;transform:none;overflow:hidden}#game-canvas{display:block;width:100%;height:100%}',
      });
      await page.evaluate((mockImages) => {
        document.body.classList.add('no-scale');
        window.rendererBefore = {
          fetch,
          WebSocket,
          XMLHttpRequest,
          setTimeout,
          setInterval,
          requestAnimationFrame,
          cancelAnimationFrame,
          width: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'),
          height: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height'),
          setTransform: CanvasRenderingContext2D.prototype.setTransform,
          save: CanvasRenderingContext2D.prototype.save,
          restore: CanvasRenderingContext2D.prototype.restore,
          stroke: CanvasRenderingContext2D.prototype.stroke,
        };
        window.fakeImages = [];
        if (mockImages) {
          window.Image = class {
            constructor() {
              this.onload = null;
              this.onerror = null;
              this._src = '';
              this.complete = false;
              window.fakeImages.push(this);
            }
            set src(value) {
              this._src = value;
            }
            get src() {
              return this._src;
            }
            decode() {
              return Promise.resolve();
            }
          };
        }
      }, fakeImages);
      await page.addScriptTag({ content: rendererScript });
      await page.evaluate(() => window.ScapewatchRenderer.initializeRenderer());
    },
  });
  await settle(page);
}

module.exports = { loadRenderer };
