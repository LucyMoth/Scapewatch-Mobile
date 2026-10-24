'use strict';

const { test, expect, loadGame } = require('../support/game.cjs');

async function loadItems(page, { lateTooltip = false } = {}) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'items.js'],
    beforeAdapter: (page) =>
      page.evaluate((late) => {
        if (late) document.querySelector('.global-tooltip').remove();
        else window.fixtureItemDetails();
      }, lateTooltip),
  });
  if (lateTooltip) {
    await page.evaluate(() => {
      const tip = document.createElement('div');
      tip.className = 'tooltip global-tooltip';
      tip.style.display = 'none';
      document.body.append(tip);
      window.fixtureItemDetails();
    });
  }
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
}

for (const dismiss of ['Close', 'Back']) {
  test(`${dismiss} clears the native touch inspection before the same item is tapped again`, async ({
    page,
  }) => {
    await loadItems(page);
    const slot = page.locator('#tab-bank .bank-slot').first();
    const tip = page.locator('.global-tooltip');
    await slot.tap();
    await expect(tip).toBeVisible();
    if (dismiss === 'Close') {
      const close = tip.getByRole('button', { name: 'Close', exact: true });
      await close.scrollIntoViewIfNeeded();
      await close.tap();
    } else expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
    await expect(tip).toBeHidden();
    await slot.tap();
    await expect(tip).toBeVisible();
    expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
    await slot.tap();
    expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([
      'Battlefrost precision longbow',
    ]);
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('item actions attach when the native tooltip is created after mobile startup', async ({
  page,
}) => {
  await loadItems(page, { lateTooltip: true });
  const slot = page.locator('#tab-bank .bank-slot').first();
  await slot.tap();
  const tip = page.locator('.global-tooltip');
  const equip = tip.getByRole('button', { name: 'Equip', exact: true });
  await expect(equip).toHaveCount(1);
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
  await equip.scrollIntoViewIfNeeded();
  await equip.tap();
  await expect(tip).toBeHidden();
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([
    'Battlefrost precision longbow',
  ]);
});

test('item actions reattach to a replacement native tooltip', async ({ page }) => {
  await loadItems(page);
  const slot = page.locator('#tab-bank .bank-slot').first();
  await slot.tap();
  await page.evaluate(() => {
    window.__swMobileBack();
    window.fixtureReplaceTooltip();
  });
  await slot.tap();
  const tip = page.locator('.global-tooltip');
  await expect(tip.getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);
  await expect(tip.getByRole('button', { name: 'Equip', exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});
