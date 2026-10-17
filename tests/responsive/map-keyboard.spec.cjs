const { test, expect, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');

test('Map search and filter controls clear navigation when the portrait keyboard opens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
  const search = page.locator('.map-filter-search');
  await search.fill('Mossy Hollow');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 200,
    screenWidth: 360,
    screenHeight: 740,
    deviceScaleFactor: 1,
    mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await settle(page);
  await expect(page.locator('html')).not.toHaveClass(/sw-landscape/);
  await expect(search).toHaveValue('Mossy Hollow');
  const panel = await page.locator('.map-filter-body').boundingBox();
  const navigation = await page.locator('#sw-nav').boundingBox();
  expect(
    panel.y + panel.height,
    'Expanded filters end before the navigation dock',
  ).toBeLessThanOrEqual(navigation.y);
  const row = page.locator('.map-filter-row').nth(4);
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y + box.height).toBeLessThanOrEqual(panel.y + panel.height);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  await settle(page);
  await expect(search).toHaveValue('Mossy Hollow');
});
