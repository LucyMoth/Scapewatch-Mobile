'use strict';

const { test, expect, settle, read } = require('../support/game.cjs');
const { loadNativeOrientation } = require('../support/orientation.cjs');
const {
  expectReachable,
  expectNavigation,
  nativeSnapshot,
  safeInsets,
} = require('../support/responsive.cjs');

async function loadHeader(page, orientation, insets) {
  await loadNativeOrientation(page, orientation, insets);
  await page.addScriptTag({ content: read('tests/fixtures/client-actions.js') });
  await settle(page);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 640, height: 300 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test(`orientation sits beside Original UI without covering Menu at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadHeader(page, 'portrait', safeInsets);
    const before = await nativeSnapshot(page);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await settle(page);
    await expectNavigation(page, viewport.width > viewport.height, safeInsets);
    const sleep = page.locator('#sw-sleep-toggle');
    const orientation = page.locator('#sw-orientation-toggle');
    await expectReachable(page, sleep, { insets: safeInsets });
    const original = page.locator('#sw-layout-toggle');
    await expectReachable(page, orientation, { insets: safeInsets });
    await expectReachable(page, original, { insets: safeInsets });
    const moon = await sleep.boundingBox();
    const turn = await orientation.boundingBox();
    expect(moon.y).toBe(turn.y);
    expect(moon.x + moon.width).toBeLessThanOrEqual(turn.x - 4);
    const layout = await original.boundingBox();
    expect(turn.y, 'Both choices share one header row').toBe(layout.y);
    expect(turn.x + turn.width, 'The controls have a clear gap').toBeLessThanOrEqual(layout.x - 4);
    const title = await page.locator('#sw-menu h2').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return { right: rect.right, bottom: rect.bottom };
    });
    if (viewport.width <= 350)
      expect(title.bottom, 'Narrow screens place the actions beneath Menu').toBeLessThanOrEqual(
        moon.y - 4,
      );
    else
      expect(title.right, 'Header choices leave the Menu title readable').toBeLessThanOrEqual(
        moon.x - 4,
      );
    for (const tab of await page.locator('.sw-menu-tabs button').all()) {
      await expectReachable(page, tab, { insets: safeInsets });
      const rect = await tab.boundingBox();
      expect(rect.y, 'Section tabs stay below the header choices').toBeGreaterThanOrEqual(
        turn.y + turn.height,
      );
    }
    await expect(page.locator('[data-sw-menu-panel=character]')).toBeVisible();
    expect(await nativeSnapshot(page), 'Opening Menu keeps native actions and preferences').toEqual(
      before,
    );
  });
}

test('scrolling a short landscape Menu keeps header controls and section tabs unobscured', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await loadHeader(page, 'portrait', safeInsets);
  const before = await nativeSnapshot(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await settle(page);
  expect(await page.locator('#sw-menu').evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  for (const control of await page.locator('#sw-layout-actions button, .sw-menu-tabs button').all())
    await expectReachable(page, control, { insets: safeInsets });
  const header = await page.locator('#sw-menu-header').boundingBox();
  const last = page.locator('#sw-game-grid button').last();
  await expectReachable(page, last, { insets: safeInsets, scroll: true });
  const target = await last.boundingBox();
  expect(target.y, 'Native Menu actions clear the sticky header').toBeGreaterThanOrEqual(
    header.y + header.height,
  );
  expect(
    await nativeSnapshot(page),
    'Menu scrolling invokes no game actions or preferences',
  ).toEqual(before);
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test(`Original UI retains both header choices and returns to Mobile UI at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadHeader(page, 'landscape', safeInsets);
    const before = await nativeSnapshot(page);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    await settle(page);
    await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
    await expect(page.locator('#sw-menu')).toBeHidden();
    await expect(page.locator('#sw-sleep-toggle')).toBeHidden();
    await expect(page.locator('#sw-layout-toggle')).toHaveText('Mobile UI');
    await expectReachable(page, page.locator('#sw-layout-toggle'), { insets: safeInsets });
    await expectReachable(page, page.locator('#sw-orientation-toggle'), { insets: safeInsets });
    await expect(page.locator('#sw-orientation-toggle')).toHaveText('Portrait');
    await page.locator('#sw-layout-toggle').tap();
    await settle(page);
    await expect(page.locator('html')).toHaveClass(/\bsw-mobile\b/);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await expectReachable(page, page.locator('#sw-orientation-toggle'), { insets: safeInsets });
    await expect(page.locator('#sw-layout-toggle')).toHaveText('Original UI');
    await expect(page.locator('#sw-shell')).toHaveCount(1);
    const after = await nativeSnapshot(page);
    expect(after.actions, 'Layout recovery invokes no native game actions').toEqual(before.actions);
    expect(after.listenerCount, 'Layout recovery adds no game listeners').toBe(
      before.listenerCount,
    );
    expect(after.preferences.orientation).toBe('landscape');
    expect(await page.evaluate(() => window.fixtureOrientation.calls)).toEqual([
      ['ScapewatchOrientation', 'getOrientation', null],
    ]);
  });
}
