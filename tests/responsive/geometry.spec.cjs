'use strict';

const { test, expect, settle, screenshot } = require('../support/game.cjs');
const {
  landscape,
  safeInsets,
  loadResponsiveGame,
  viewportBounds,
  expectWithin,
  expectReachable,
  expectNavigation,
} = require('../support/responsive.cjs');

test.beforeEach(async ({ page }) => {
  await loadResponsiveGame(page);
});

async function checkInsetActions(page) {
  await page.evaluate((insets) => {
    for (const [edge, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
    }
  }, safeInsets);
  await settle(page);
  const isLandscape = await page.evaluate(() => screen.orientation.type.startsWith('landscape'));
  await expectNavigation(page, isLandscape, safeInsets);
  for (const selector of [
    '.hp-bar',
    '.recenter-camera-btn',
    '#sw-combat-toggle',
    '.btn-end-combat',
  ]) {
    await expectReachable(page, page.locator(selector), { insets: safeInsets });
  }
  await page.locator('.btn-end-combat').tap();
  expect(await page.evaluate(() => window.fixtureState.v4RaidEnd)).toBe(1);
  await page.locator('#sw-nav [data-sw-view=inventory]').tap();
  const slot = page.locator('#bag-panel .inv-slot').last();
  await expectReachable(page, slot, { insets: safeInsets, scroll: true });
  await slot.tap();
  expect(await page.evaluate(() => window.fixtureState.inventoryClicks)).toBe(1);
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  const row = page.locator('.uq-row').last();
  await row.locator('.icon-option.selected').scrollIntoViewIfNeeded();
  await row.locator('.icon-option.selected').tap();
  await settle(page);
  const reroll = row.locator('.reroll-option').last();
  await expectReachable(page, reroll, { insets: safeInsets, scroll: true });
  await reroll.tap();
  expect(await page.evaluate(() => window.fixtureState.rerollClicks)).toBe(0);
  await reroll.tap();
  expect(await page.evaluate(() => window.fixtureState.rerollClicks)).toBe(1);
  await screenshot(page, 'insets-last-task-control');
}

test('portrait side insets preserve native HUD, dock and last scroll controls', async ({
  page,
}) => {
  await checkInsetActions(page);
});

test.describe('short portrait with system insets', () => {
  test.use({ viewport: { width: 320, height: 460 } });

  test('bottom inset leaves dock targets and final native actions reachable', async ({ page }) => {
    await checkInsetActions(page);
  });
});

for (const viewport of [landscape, { width: 915, height: 412 }]) {
  test.describe(`${viewport.width}x${viewport.height} landscape reading`, () => {
    test.use({ viewport });

    test('combat has a reading pane with visible values before scrolling', async ({ page }) => {
      await expectNavigation(page, true);
      await page.locator('#sw-combat-toggle').tap();
      await settle(page);
      const panel = page.locator('#ce-player-panel');
      const pane = await expectWithin(panel, await viewportBounds(page));
      const rail = await page.locator('#sw-nav').boundingBox();
      expect(pane.width, 'Landscape has a constrained reading pane').toBeGreaterThanOrEqual(280);
      expect(pane.width, 'Reading pane leaves a separate world area').toBeLessThanOrEqual(400);
      expect(pane.height, 'Combat provides useful reading space').toBeGreaterThanOrEqual(180);
      expect(pane.x + pane.width, 'Reading pane clears the navigation rail').toBeLessThanOrEqual(
        rail.x + 1,
      );
      const value = panel.locator('[data-content=stats] .derived-value').first();
      await expect(value).toHaveText('Precise Ranged');
      await expect(value).toBeInViewport({ ratio: 1 });
      const rect = await value.boundingBox();
      expect(
        rect.y + rect.height,
        'A full stat value is visible before any scroll',
      ).toBeLessThanOrEqual(pane.y + pane.height + 1);
      expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
      expect(await page.evaluate(() => window.fixtureState.combatTabClicks)).toEqual([]);
      await screenshot(page, 'landscape-combat-reading');
    });

    test('side insets preserve native HUD, rail and last scroll controls', async ({ page }) => {
      await checkInsetActions(page);
    });
  });
}
