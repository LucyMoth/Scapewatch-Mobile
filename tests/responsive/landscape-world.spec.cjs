'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} landscape world HUD`, () => {
    test.use({ viewport });

    test('compact world overlays leave the map open and retain original controls', async ({
      page,
    }) => {
      await loadGame(page, {
        scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
        beforeAdapter: async (page) => {
          await page.evaluate(() => {
            window.fixtureWorldScene({ combat: false, footer: 'compact' });
            document.querySelector('.ingame-hud-info').click();
          });
        },
      });
      await expect(page.locator('html')).toHaveClass(/\bsw-landscape\b/);
      const bounds = await viewportBounds(page);
      const health = await expectWithin(page.locator('.hp-bar'), bounds);
      const status = await expectWithin(page.locator('.ingame-hud'), bounds);
      const task = await expectWithin(page.locator('.floating-current-task'), bounds);
      expect(health.width, 'Health stays a compact capsule').toBeLessThanOrEqual(240);
      expect(status.width, 'Player status stays a compact card').toBeLessThanOrEqual(280);
      expect(
        status.height,
        'Collapsed status retains a touch target without extra rows',
      ).toBeLessThanOrEqual(48);
      expect(task.width, 'Task summary has a readable bounded width').toBeLessThanOrEqual(280);
      expect(task.height, 'Task summary leaves vertical space for the world').toBeLessThanOrEqual(
        112,
      );
      const info = page.locator('.ingame-hud-info');
      await expectReachable(page, info);
      await expectReachable(page, page.locator('.recenter-camera-btn'));
      await info.tap();
      await settle(page);
      const world = page.locator('.ingame-hud-world');
      await expectReachable(page, world, { scroll: true });
      await world.tap();
      expect(await page.evaluate(() => window.fixtureState.hudExpand)).toBe(2);
      expect(await page.evaluate(() => window.fixtureState.hudWorld)).toBe(1);
      await page.locator('.recenter-camera-btn').tap();
      expect(await page.evaluate(() => window.fixtureState.recenterClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      await screenshot(page, 'compact-landscape-world-hud');
    });
  });
}
