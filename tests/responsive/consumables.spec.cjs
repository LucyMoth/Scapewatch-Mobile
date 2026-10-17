'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { safeInsets, expectReachable } = require('../support/responsive.cjs');
const { touch } = require('../support/map-input.cjs');

async function loadBattle(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js', 'consumables.js'],
    beforeAdapter: (page) =>
      page.evaluate((insets) => {
        window.fixtureWorldScene({ footer: 'detailed', potions: 'expanded' });
        window.fixtureConsumableDetails();
        for (const [edge, value] of Object.entries(insets))
          document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
      }, safeInsets),
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} consumable details`, () => {
    test.use({ viewport });
    for (const kind of ['food', 'melee']) {
      test(`${kind} details fit, scroll by touch, and keep native outside dismissal`, async ({
        page,
      }) => {
        await loadBattle(page);
        const row = page.locator(`.active-potions-panel .potion-row[data-style=${kind}]`);
        await row.scrollIntoViewIfNeeded();
        await row.tap();
        const tip = page.locator('.global-tooltip');
        await expect(tip).toBeVisible();
        await expect(page.locator('.active-potions-panel')).toBeVisible();
        expect(await page.evaluate(() => window.fixtureState.potionCollapse)).toBe(0);
        const box = await tip.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(safeInsets.left);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - safeInsets.right);
        const nav = await page.locator('#sw-nav').boundingBox();
        expect(box.y + box.height).toBeLessThanOrEqual(
          viewport.width > viewport.height ? viewport.height - safeInsets.bottom : nav.y,
        );
        expect(
          await tip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBe(true);
        if (kind === 'food')
          await expect(tip.locator('.potion-tt-total')).toContainText('+1,641,000');
        await screenshot(page, `${kind}-details-summary`);
        const cdp = await page.context().newCDPSession(page);
        const point = { x: box.x + box.width / 2, y: box.y + box.height - 24 };
        await touch(cdp, 'touchStart', point);
        for (const delta of [12, 24, 48, 72, 100])
          await touch(cdp, 'touchMove', { ...point, y: point.y - delta });
        await touch(cdp, 'touchEnd');
        await cdp.detach();
        await expect(tip).toBeVisible();
        await expect.poll(() => tip.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        const last = tip.locator('.potion-tt-count').last();
        await last.scrollIntoViewIfNeeded();
        const end = await last.boundingBox();
        expect(end.x + end.width).toBeLessThanOrEqual(box.x + box.width);
        expect(end.y + end.height).toBeLessThanOrEqual(box.y + box.height);
        await screenshot(page, `${kind}-details`);
        await page.locator('#sw-nav [data-sw-view=menu]').tap();
        await expect(tip).toBeHidden();
        expect(await page.evaluate(() => window.fixtureConsumables.dismissed)).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      });
    }

    test('long training and loadout labels remain complete and their original controls work', async ({
      page,
    }) => {
      await loadBattle(page);
      await page.evaluate(() => {
        const controls = document.querySelectorAll('.float-combat-col');
        controls[0].textContent = 'Loadout: ConcentratedPrecisionRangedLongbow';
        controls[1].textContent = 'Training: ExtendedAccuracySpecialization';
      });
      await settle(page);
      for (const control of await page.locator('.float-combat-col, .float-toggle-pill').all()) {
        await expectReachable(page, control, { insets: safeInsets, scroll: true });
        expect(
          await control.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const rect = element.getBoundingClientRect();
            return [...range.getClientRects()].every(
              (text) => text.left >= rect.left - 1 && text.right <= rect.right + 1,
            );
          }),
          'All label text stays inside its own touch target',
        ).toBe(true);
        await control.tap();
      }
      expect(await page.evaluate(() => window.fixtureState.v4FooterActions)).toEqual([
        'loadout',
        'training',
        'auto',
      ]);
      await screenshot(page, 'combat-footer-controls');
    });

    test('food descriptions keep combat Back and native potion collapse reachable', async ({
      page,
    }) => {
      await loadBattle(page);
      await page.locator('#sw-combat-toggle').tap();
      await settle(page);
      const row = page.locator('.active-potions-panel .potion-row[data-style=food]');
      await row.scrollIntoViewIfNeeded();
      await row.tap();
      const tip = page.locator('.global-tooltip');
      await expect(tip).toBeVisible();
      const close = page.locator('#sw-combat-close');
      await expectReachable(page, close, { insets: safeInsets });
      await screenshot(page, 'combat-food-back');
      await close.tap();
      await expect(tip).toBeHidden();
      await expect(page.locator('html')).not.toHaveClass(/\bsw-combat-details\b/);
      expect(await page.evaluate(() => window.fixtureState.potionCollapse)).toBe(0);

      await page.locator('#sw-combat-toggle').tap();
      await settle(page);
      await row.tap();
      await expect(tip).toBeVisible();
      await expectReachable(page, row, { insets: safeInsets });
      await row.tap();
      await expect(page.locator('.active-potions-pill')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.potionCollapse)).toBe(1);
    });
  });
}

test('item effect descriptions can be scrolled and Original UI restores native tooltip behavior', async ({
  page,
}) => {
  await loadBattle(page);
  await page.locator('#fixture-consumable-item').tap();
  const tip = page.locator('.global-tooltip');
  await expect(tip).toBeVisible();
  expect(await tip.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('auto');
  await tip.locator('.tt-line').last().scrollIntoViewIfNeeded();
  await expect(tip).toContainText('Effect 13:');
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  expect(await tip.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
});
