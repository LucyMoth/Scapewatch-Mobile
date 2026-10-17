const { test, expect, settle, screenshot } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { expectReachable } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test(`Map navigation fits the native map and retains its controls at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadMapGame(page);
    const before = await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay));
    const button = page.locator('#sw-nav [data-sw-view=map]');
    await button.tap();
    await settle(page);
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.map-overlay')).toBeVisible();
    const plane = await page.locator('.map-overlay').boundingBox();
    const area = await page.locator('#sw-map-area').boundingBox();
    expect(plane.width / plane.height, 'The world map retains its native aspect ratio').toBeCloseTo(
      1920 / 1080,
      3,
    );
    expect(plane.x).toBeGreaterThanOrEqual(area.x - 1);
    expect(plane.y).toBeGreaterThanOrEqual(area.y - 1);
    expect(plane.x + plane.width).toBeLessThanOrEqual(area.x + area.width + 1);
    expect(plane.y + plane.height).toBeLessThanOrEqual(area.y + area.height + 1);
    const image = await page.locator('.map-overlay-img').boundingBox();
    expect(image.width).toBeCloseTo(plane.width, 1);
    expect(image.height).toBeCloseTo(plane.height, 1);
    await expectReachable(page, page.locator('#sw-map-close'));
    await expect(page.locator('#unified-queue-panel')).toBeVisible();
    expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTaskRoute)).toBe(true);
    expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTerrain)).toBe(true);
    expect(await page.evaluate(() => window.fixtureMap.route)).toEqual([
      'home',
      'mine',
      'smelt',
      'fish',
      'cook',
    ]);
    const calls = await page.evaluate(() => ({
      map: window.fixtureMap.openCalls,
      tasks: window.fixtureState.panelClicks.tasks,
      game: JSON.stringify(window.fixtureState.gameplay),
      network: window.fixtureState.networkCalls,
    }));
    expect(calls).toEqual({ map: 1, tasks: 1, game: before, network: [] });
    await screenshot(page, 'full-map');
    await button.tap();
    await settle(page);
    await expect(page.locator('#sw-view-title')).toHaveText('World');
    await expect(page.locator('.map-overlay')).toBeHidden();
    expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(1);
    expect(
      await page.evaluate(() =>
        window.fixtureMap.originalControls.every(
          (control) => control.parentNode === window.fixtureMap.element,
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        window.fixtureMap.originalTitles.every(
          (title, index) =>
            title ===
              window.fixtureMap.originalControls[index].querySelector(
                '.map-filter-title, .map-legend-title',
              ) && title.parentNode === window.fixtureMap.originalControls[index],
        ),
      ),
    ).toBe(true);
    await expect(page.locator('.sw-map-control')).toHaveCount(0);
  });
}

test('Map preserves subsequent filter choices and restores original controls through layout changes', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
  await page.locator('.map-filter-row').nth(4).locator('input').uncheck();
  await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
  await page.locator('#sw-map-close').tap();
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTerrain)).toBe(false);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  expect(
    await page.evaluate(() =>
      window.fixtureMap.originalControls.every(
        (control) => control.parentNode === window.fixtureMap.element,
      ),
    ),
  ).toBe(true);
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  expect(
    await page.evaluate(() =>
      window.fixtureMap.originalControls.every(
        (control) => control.parentNode.id === 'sw-map-tools',
      ),
    ),
  ).toBe(true);
  await expect(page.locator('#sw-nav [data-sw-view=map]')).toHaveAttribute('aria-current', 'page');
});

for (const [section, target, panel] of [
  ['character', 'equipment', '#equipment-panel'],
  ['character', 'friends', '#friends-panel'],
]) {
  test(`Menu ${target} leaves Map and opens its original panel once`, async ({ page }) => {
    await loadMapGame(page);
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator(`[data-sw-menu-section=${section}]`).tap();
    await page.locator(`#sw-menu [data-sw-target=${target}]`).tap();
    await settle(page);
    await expect(page.locator('.map-overlay')).toBeHidden();
    await expect(page.locator(panel)).toBeVisible();
    expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(1);
    expect(
      await page.evaluate(
        (target) =>
          window.fixtureState.panelClicks[target] || window.fixtureState.modalClicks[target],
        target,
      ),
    ).toBe(1);
  });
}

test('the Bank dock action leaves Map and opens the original bank once', async ({ page }) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  await settle(page);
  await expect(page.locator('.map-overlay')).toBeHidden();
  await expect(page.locator('.modal-overlay')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
});

test('login closes the native Map and blocks reopening without a session', async ({ page }) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await page.evaluate(() => window.fixtureLogin(true));
  await settle(page);
  await expect(page.locator('.map-overlay')).toBeHidden();
  await expect(page.locator('#sw-view-title')).toHaveText('World');
  expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(1);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  expect(await page.evaluate(() => window.fixtureMap.openCalls)).toBe(1);
  await expect(page.locator('#sw-toast')).toContainText('Sign in');
});
