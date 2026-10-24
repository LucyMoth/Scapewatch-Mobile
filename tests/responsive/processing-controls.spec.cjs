'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable, expectWithin, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} persistent processing controls`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await loadGame(page, {
        scripts: [
          'game.js',
          'processing/helpers.js',
          'processing/equipment.js',
          'processing/brewing.js',
          'processing/alms.js',
        ],
      });
      await page.evaluate(() => window.fixtureProcessing());
      await settle(page);
    });

    test('material and amount controls stay reachable after scrolling to the last recipe', async ({
      page,
    }) => {
      for (const skill of ['smith', 'craft', 'imbue']) {
        await page.locator(`.processing-nav [data-tab=${skill}]`).tap();
        const host = page.locator('#tab-' + skill);
        const header = host.locator('.proc-recipes-header');
        const before = await header.boundingBox();
        const last = host.locator('.proc-craft-btn').last();
        await expectReachable(page, last, { scroll: true });
        expect(await header.boundingBox()).toEqual(before);
        await expectReachable(page, host.locator('.proc-amount-input'));
        await expectReachable(page, host.locator('.proc-amount-reset-btn'));
        await expectReachable(page, host.locator('.proc-tier-row').first());
        await last.tap();
      }
      expect(await page.evaluate(() => window.fixtureState.processingActions)).toEqual([
        ['smith', 11],
        ['craft', 11],
        ['imbue', 11],
      ]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('all eight Brew categories and the amount remain visible while recipes scroll', async ({
      page,
    }) => {
      await page.locator('.processing-nav [data-tab=brew]').tap();
      const host = page.locator('#tab-brew');
      const bounds = await viewportBounds(page);
      for (const category of await host.locator('.brew-style-tab').all())
        await expectReachable(page, category);
      expect(
        await host
          .locator('.brew-style-filters')
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const header = host.locator('.brew-recipes-header');
      const before = await header.boundingBox();
      await host.locator('.brew-recipe-card').last().scrollIntoViewIfNeeded();
      expect(await header.boundingBox()).toEqual(before);
      await expectWithin(host.locator('.proc-amount-input'), bounds);
      await expectReachable(page, host.locator('.proc-amount-reset-btn'));
      expect(await page.evaluate(() => window.fixtureState.processingActions)).toEqual([]);
    });

    test('every Alms path filter has a 44 pixel touch width', async ({ page }) => {
      await page.locator('.processing-nav [data-tab=alms]').tap();
      for (const filter of await page.locator('.alms-path-filter').all())
        await expectReachable(page, filter, { scroll: true });
    });
  });
}
