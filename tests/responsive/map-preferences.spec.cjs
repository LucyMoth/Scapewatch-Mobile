const { test, expect } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');

test('Map defaults are applied once and preserve native filter and layout choices after restarting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await loadMapGame(page);
  expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTaskRoute)).toBe(false);
  expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTerrain)).toBe(false);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_map_defaults'))).toBe('1');
  await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
  await page.locator('.map-filter-row').nth(1).locator('input').uncheck();
  await page.locator('.map-filter-row').nth(4).locator('input').uncheck();
  await page.getByRole('button', { name: 'Route legend', exact: true }).tap();
  const before = await page.evaluate(() => localStorage.getItem('scapewatch_settings'));
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTaskRoute)).toBe(false);
  expect(await page.evaluate(() => window.fixtureMap.filters.mapShowTerrain)).toBe(false);
  await expect(page.locator('.map-filter-panel')).toHaveClass(/collapsed/);
  await expect(page.locator('.map-legend-panel')).not.toHaveClass(/collapsed/);
  expect(await page.evaluate(() => localStorage.getItem('scapewatch_settings'))).toBe(before);
});
