'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable, expectWithin, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 412, height: 915 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} Slay Masters`, () => {
    test.use({ viewport });

    async function open(page) {
      await loadGame(page, {
        scripts: ['game.js', 'combat-selection.js', 'slay-masters.js'],
      });
      await page.evaluate(() => window.fixtureShowSlayMasters());
      await settle(page);
    }

    test('master headers and target details fit without changing native assignment readiness', async ({
      page,
    }) => {
      await open(page);
      const board = page.locator('.slay-masters-board');
      const rows = board.locator('.tier-row');
      const first = rows.first();
      const second = rows.nth(1);
      const last = rows.last();
      await expectWithin(first.locator('.master-panel'), await viewportBounds(page));
      await expect(first.locator('.get-task-btn')).toHaveText('Current Master');
      await expect(first.locator('.get-task-btn')).toHaveClass(/disabled/);
      if (viewport.width < viewport.height) {
        await expect(first.locator('.sw-slay-targets-toggle')).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        await expect(second.locator('.mob-cards-scroll')).toBeHidden();
        await expectReachable(page, first.locator('.sw-slay-targets-toggle'));
        await first.locator('.sw-slay-targets-toggle').tap();
        await expect(first.locator('.mob-cards-scroll')).toBeHidden();
        await second.locator('.sw-slay-targets-toggle').scrollIntoViewIfNeeded();
        await second.locator('.sw-slay-targets-toggle').tap();
        await expect(second.locator('.mob-card').first()).toBeVisible();
        await expectWithin(second.locator('.mob-card-name').first(), await viewportBounds(page));
      } else {
        await expect(first.locator('.sw-slay-targets-toggle')).toBeHidden();
        await expect(first.locator('.mob-card').first()).toBeVisible();
      }
      expect(await board.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await expectReachable(page, last.locator('.get-task-btn'), { scroll: true });
      await expect(last.locator('.get-task-btn')).toHaveText('Req. Lv 50');
      await last.locator('.get-task-btn').tap();
      expect(await page.evaluate(() => window.fixtureState.masterActions)).toEqual([]);
      const assign = second.locator('.get-task-btn');
      await expectReachable(page, assign, { scroll: true });
      await assign.tap();
      await expect(assign).toHaveText('Current Master');
      await expect(first.locator('.get-task-btn')).toHaveText('Assign Master');
      await expect(second.locator('.sw-slay-targets-toggle')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(await page.evaluate(() => window.fixtureState.masterActions)).toEqual([1]);
      expect(
        await page.evaluate(() => window.fixtureSlayNodes.every((node) => node.isConnected)),
      ).toBe(true);
      await screenshot(page, 'slay-master-choices');
    });

    test('native target selection opens mob detail and Original UI restores the untouched board', async ({
      page,
    }) => {
      await open(page);
      const target = page.locator('.slay-masters-board .mob-card').first();
      await expectReachable(page, target, { scroll: true });
      await target.tap();
      await expect(page.locator('.mob-encounter-name')).toHaveText('Feeble Acid Slime 0');
      expect(await page.evaluate(() => window.fixtureState.masterActions)).toEqual([
        ['target', 0, 0],
      ]);
      expect(await page.evaluate(() => window.fixtureState.selectionActions)).toEqual([['mob', 0]]);
      await page.evaluate(() => window.fixtureShowSlayMasters());
      await expect(page.locator('.sw-slay-targets-toggle')).toHaveCount(3);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('.sw-slay-targets-toggle')).toHaveCount(0);
      await expect(page.locator('.sw-slay-tier')).toHaveCount(0);
      expect(
        await page.evaluate(() => window.fixtureSlayNodes.every((node) => node.isConnected)),
      ).toBe(true);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('target disclosure survives resizing and page restoration without duplicate controls', async ({
      page,
    }) => {
      await open(page);
      const current = page.locator('.slay-masters-board .tier-row').first();
      if (viewport.width > viewport.height) await page.setViewportSize({ width: 320, height: 700 });
      await expect(current.locator('.sw-slay-targets-toggle')).toBeVisible();
      await current.locator('.sw-slay-targets-toggle').tap();
      await expect(current.locator('.mob-cards-scroll')).toBeHidden();
      await page.setViewportSize({ width: 740, height: 360 });
      await expect(current.locator('.mob-card').first()).toBeVisible();
      await page.setViewportSize({ width: 320, height: 700 });
      await expect(current.locator('.mob-cards-scroll')).toBeHidden();
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      await expect(page.locator('.sw-slay-targets-toggle')).toHaveCount(0);
      await page.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
      );
      await expect(page.locator('.sw-slay-targets-toggle')).toHaveCount(3);
      await expect(current.locator('.get-task-btn')).toHaveText('Current Master');
      await expect(current.locator('.mob-card').first()).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.masterActions)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}
