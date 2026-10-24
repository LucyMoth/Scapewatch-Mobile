'use strict';

const { test, expect, read, BUNDLE, loadGame } = require('../support/game.cjs');

for (const preference of [null, 'auto', 'mobile', 'desktop']) {
  test(`wrapper owns layout before native bootstrap with ${preference} preference`, async ({
    page,
  }) => {
    await page.addInitScript((preference) => {
      if (preference) localStorage.setItem('scapewatch_layout', preference);
      localStorage.setItem('unrelated-preference', 'preserved');
    }, preference);
    await loadGame(page, { documentStart: true, scripts: ['game.js', 'mobile-layout.js'] });
    await expect(page.locator('#sw-shell')).toHaveCount(1);
    await expect(page.locator('#m-shell')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe(
      'preserved',
    );
  });
}

for (const layout of ['mobile', 'auto', 'desktop']) {
  test(`layout URL override ${layout} cannot start a second mobile controller`, async ({
    page,
  }) => {
    await page.addInitScript({ content: BUNDLE });
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/') return route.abort();
      return route.fulfill({
        contentType: 'text/html',
        body: read('tests/fixtures/index.html'),
      });
    });
    await page.goto(`https://play.scapewatch.com/?layout=${layout}&keep=1#map`);
    await page.addScriptTag({ content: read('tests/fixtures/mobile-layout.js') });
    await expect(page.locator('#sw-shell')).toHaveCount(1);
    await expect(page.locator('#m-shell')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
    expect(new URL(page.url()).hash).toBe('#map');
  });
}

test('late injection reloads once before installing over an active native layout', async ({
  page,
}) => {
  let loads = 0;
  await page.route('https://play.scapewatch.com/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/native-layout.js')
      return route.fulfill({
        contentType: 'text/javascript',
        body: read('tests/fixtures/mobile-layout.js'),
      });
    if (pathname === '/mobile-ui.js')
      return route.fulfill({ contentType: 'text/javascript', body: BUNDLE });
    if (pathname !== '/') return route.abort();
    loads++;
    return route.fulfill({
      contentType: 'text/html',
      body: read('tests/fixtures/index.html').replace(
        '</body>',
        '<script src="/native-layout.js"></script><script src="/mobile-ui.js"></script></body>',
      ),
    });
  });
  await page.goto('https://play.scapewatch.com/');
  await expect(page.locator('#sw-shell')).toHaveCount(1);
  await expect(page.locator('#m-shell')).toHaveCount(0);
  expect(loads).toBe(2);
});

test('unavailable layout preference leaves native UI and renderer in control', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable');
    };
  });
  await loadGame(page);
  await expect(page.locator('#sw-shell')).toHaveCount(0);
  expect(await page.evaluate(() => window.__swRendering)).toBeUndefined();
});
