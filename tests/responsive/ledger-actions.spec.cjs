'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable, expectWithin, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} Ledger navigation`, () => {
    test.use({ viewport });

    test('receipt actions stay visible while all native skill rows can scroll', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'ledger/content.js', 'ledger/index.js'] });
      await page.evaluate(() => window.fixtureNativeReceipt());
      await settle(page);
      const bounds = await viewportBounds(page);
      const card = page.locator('.ledger-card');
      await expectWithin(card, bounds);
      const body = card.locator('.ledger-compact');
      const footer = card.locator('.ledger-card-foot');
      const before = await footer.boundingBox();
      const last = card.locator('.ledger-total-row td').last();
      await last.scrollIntoViewIfNeeded();
      await expectWithin(last, bounds);
      expect(await footer.boundingBox()).toEqual(before);
      await expectReachable(page, card.locator('.ledger-btn-primary'));
      const left = await body.locator('.ledger-compact-left').boundingBox();
      const right = await body.locator('.ledger-compact-right').boundingBox();
      if (viewport.width > viewport.height)
        expect(right.x).toBeGreaterThanOrEqual(left.x + left.width);
      else expect(right.y).toBeGreaterThanOrEqual(left.y + left.height);
      await card.locator('.ledger-btn', { hasText: 'Open Ledger' }).tap();
      await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
      await expect(page.locator('#tab-ledger .ledger')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}
