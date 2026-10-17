const fs = require('node:fs');
const path = require('node:path');
const { test: base, expect } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '../..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const BUNDLE = read('dist/mobile-ui.js');

const test = base.extend({
  pageErrors: [
    async ({ page }, use) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'Unexpected browser JavaScript errors').toEqual([]);
    },
    { auto: true },
  ],
});

async function loadGame(
  page,
  {
    origin = 'https://play.scapewatch.com',
    scripts = ['game.js'],
    bundle = true,
    documentStart = false,
    beforeAdapter,
  } = {},
) {
  if (bundle && documentStart) await page.addInitScript({ content: BUNDLE });
  await page.route('**/*', (route) =>
    route.request().url() === `${origin}/`
      ? route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: read('tests/fixtures/index.html'),
        })
      : route.abort(),
  );
  await page.goto(`${origin}/`);
  for (const name of ['style.css', 'unified-queue.css']) {
    await page.addStyleTag({ content: read(`tests/fixtures/${name}`) });
  }
  for (const name of scripts) {
    await page.addScriptTag({ content: read(`tests/fixtures/${name}`) });
  }
  if (beforeAdapter) await beforeAdapter(page);
  if (bundle && !documentStart) await page.addScriptTag({ content: BUNDLE });
  if (bundle) await settle(page);
}

async function settle(page) {
  let previous;
  let stableSince = Date.now();
  // Structural updates debounce for 100ms before measured geometry runs.
  await expect
    .poll(
      async () => {
        const signature = await page.evaluate(() => {
          const selectors = [
            'html',
            '#sw-shell',
            '#sw-nav',
            '#sw-menu',
            '.hp-bar',
            '#task-display',
            '.combat-hud',
            '#ce-player-panel',
            '#ce-mob-panel',
            '#sw-mini-chat',
            '#unified-queue-panel',
            '#bag-panel',
            '#skills-panel',
            '#chat-panel',
            '.modal-overlay',
            '.skill-custom-tab',
          ];
          return JSON.stringify(
            selectors.map((selector) => {
              const node = document.querySelector(selector);
              if (!node) return null;
              const rect = node.getBoundingClientRect();
              return [
                node.className,
                node.getAttribute('style'),
                node.hidden,
                rect.x,
                rect.y,
                rect.width,
                rect.height,
              ];
            }),
          );
        });
        if (signature !== previous) {
          previous = signature;
          stableSince = Date.now();
        }
        return Date.now() - stableSince >= 150;
      },
      { intervals: [50], timeout: 6_000 },
    )
    .toBe(true);
}

async function screenshot(page, name) {
  const info = test.info();
  const filename = info.outputPath(`${name}.png`);
  await page.screenshot({ path: filename });
  await info.attach(name, { path: filename, contentType: 'image/png' });
}

module.exports = { test, expect, read, BUNDLE, loadGame, settle, screenshot };
