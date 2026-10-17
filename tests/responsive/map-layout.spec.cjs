const { test, expect, settle, screenshot } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { touch } = require('../support/map-input.cjs');
const { expectReachable, safeInsets } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 412, height: 915 },
]) {
  test(`portrait Map joins terrain, task strip and the native live route at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadMapGame(page);
    await page.evaluate(() => {
      window.nativeLegendBody = document.querySelector('.map-legend-body');
    });
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    await settle(page);
    const terrain = await page.locator('.map-overlay').boundingBox();
    const strip = await page.locator('#unified-queue-panel').boundingBox();
    const route = await page.locator('#sw-map-route').boundingBox();
    const tools = await page.locator('#sw-map-tools').boundingBox();
    const dock = await page.locator('#sw-nav').boundingBox();
    expect(terrain.y - tools.y - tools.height).toBeLessThanOrEqual(8);
    expect(strip.y - terrain.y - terrain.height).toBeCloseTo(8, 1);
    expect(route.y - strip.y - strip.height).toBeCloseTo(8, 1);
    expect(route.y + route.height).toBeCloseTo(dock.y - 8, 1);
    expect(route.height).toBeGreaterThan(150);
    expect(await page.evaluate(() => window.nativeLegendBody.parentNode.id)).toBe('sw-map-route');
    await page.locator('#sw-map-route .map-legend-animate').tap();
    expect(await page.evaluate(() => window.fixtureMap.animateCalls)).toBe(1);
    const source = await page.locator('.queue-slot-draggable').nth(0).boundingBox();
    const target = await page.locator('.queue-slot-draggable').nth(1).boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y: source.y + 12 });
    await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y + 12 });
    await expect(page.locator('#sw-map-route .map-legend-label').first()).toHaveText('1. smelt');
    expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
    await touch(cdp, 'touchCancel');
    await expect(page.locator('#sw-map-route .map-legend-label').first()).toHaveText('1. mine');
    await cdp.detach();
    await screenshot(page, 'portrait-route-workspace');
    const preferences = await page.evaluate(() => localStorage.getItem('scapewatch_settings'));
    await page.setViewportSize({ width: viewport.height, height: viewport.width });
    await settle(page);
    await expect(page.locator('#sw-map-route')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Route legend', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.nativeLegendBody.parentNode.className)).toBe(
      'map-legend-panel collapsed',
    );
    const area = await page.locator('#sw-map-area').boundingBox();
    const plane = await page.locator('.map-overlay').boundingBox();
    expect(plane.x + plane.width / 2).toBeCloseTo(area.x + area.width / 2, 1);
    expect(plane.y + plane.height / 2).toBeCloseTo(area.y + area.height / 2, 1);
    await screenshot(page, 'landscape-centered-map');
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    expect(await page.evaluate(() => window.nativeLegendBody.parentNode.className)).toBe(
      'map-legend-panel collapsed',
    );
    expect(await page.evaluate(() => localStorage.getItem('scapewatch_settings'))).toBe(
      preferences,
    );
  });
}

test('the route workspace scrolls long native routes on a short portrait phone with safe insets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 560 });
  await loadMapGame(page, {
    beforeAdapter: (page) =>
      page.evaluate((insets) => {
        const style = document.createElement('style');
        style.textContent = `:root { --safe-area-inset-top: ${insets.top}px; --safe-area-inset-right: ${insets.right}px; --safe-area-inset-bottom: ${insets.bottom}px; --safe-area-inset-left: ${insets.left}px; }`;
        document.head.appendChild(style);
        const queue = Array.from({ length: 8 }, (_, index) => `task${index}`);
        queue.forEach((id, index) => {
          window.fixtureMap.nodes[id] = { x: 180 + index * 200, y: 400 };
        });
        window.fixtureMap.replaceQueue(queue);
      }, safeInsets),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await settle(page);
  await expectReachable(page, page.locator('#sw-map-close'), { insets: safeInsets });
  const route = await page.locator('#sw-map-route').boundingBox();
  const strip = await page.locator('#unified-queue-panel').boundingBox();
  const dock = await page.locator('#sw-nav').boundingBox();
  expect(route.y).toBeGreaterThanOrEqual(strip.y + strip.height + 4);
  expect(route.y + route.height).toBeLessThanOrEqual(dock.y - 4);
  const body = page.locator('#sw-map-route .map-legend-body');
  const last = body.locator('.map-legend-entry').last();
  await last.scrollIntoViewIfNeeded();
  expect(await body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const bounds = await last.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(route.y + route.height);
  expect(await page.locator('#game-container').evaluate((container) => container.scrollTop)).toBe(
    0,
  );
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await screenshot(page, 'short-phone-route-workspace');
});
