'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} active raids`, () => {
    test.use({ viewport });
    for (const kind of ['combat', 'fortress']) {
      test(`${kind} HUD clears safe insets, fits its controls and preserves native interactions`, async ({
        page,
      }) => {
        await loadGame(page, {
          scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js', 'raid-hud.js'],
          beforeAdapter: (page) =>
            page.evaluate((kind) => {
              document.documentElement.style.setProperty('--safe-area-inset-top', '24px');
              document.documentElement.style.setProperty('--safe-area-inset-left', '12px');
              document.documentElement.style.setProperty('--safe-area-inset-right', '16px');
              document.documentElement.style.setProperty('--safe-area-inset-bottom', '12px');
              window.fixtureWorldScene({ combat: kind === 'combat', footer: 'compact' });
              window.fixtureCommunityChat();
              window.fixtureActiveRaid(kind);
            }, kind),
        });
        const insets = { top: 24, left: 12, right: 16, bottom: 12 };
        const bounds = await viewportBounds(page, insets);
        const hud = page.locator(kind === 'combat' ? '.raid-contrib-hud' : '.gauntlet-hud');
        await expectWithin(hud, bounds);
        const hp = await expectWithin(page.locator('.hp-bar'), bounds);
        const box = await hud.boundingBox();
        if (viewport.width < viewport.height)
          expect(box.y).toBeGreaterThanOrEqual(hp.y + hp.height);
        else expect(box.x).toBeGreaterThanOrEqual(hp.x + hp.width);
        expect(await hud.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        const collapse = hud.locator('.hud-collapse-btn');
        await expectReachable(page, collapse, { insets });
        const chat = await expectWithin(page.locator('#sw-mini-chat'), bounds);
        const leave = await page
          .locator(kind === 'combat' ? '.combat-hud' : '.gauntlet-leave-btn')
          .boundingBox();
        if (viewport.width < viewport.height)
          expect(chat.y + chat.height).toBeLessThanOrEqual(leave.y);
        else expect(chat.x + chat.width).toBeLessThanOrEqual(leave.x);
        expect(await page.evaluate(() => window.fixtureState.raidHudActions)).toEqual([]);

        if (kind === 'combat') {
          for (const tab of await hud.locator('.raid-contrib-tab').all())
            await expectReachable(page, tab, { insets });
          await hud.locator('.raid-contrib-tab').nth(1).tap();
          await collapse.tap();
          await expect(hud).not.toHaveClass(/hud-collapsed/);
          await hud.locator('.raid-contrib-tab').last().tap();
          await expect(hud.locator('.raid-contrib-recap')).toBeVisible();
          await expectReachable(page, hud.locator('.raid-contrib-tab').first(), { insets });
          await hud.locator('.raid-contrib-tab').first().tap();
          await collapse.tap();
          await settle(page);
          const toggle = page.locator('#sw-combat-toggle');
          await expectReachable(page, toggle, { insets });
          const toggleBox = await toggle.boundingBox();
          const raidBox = await hud.boundingBox();
          expect(toggleBox.y).toBeGreaterThanOrEqual(raidBox.y + raidBox.height);
          await toggle.tap();
          await expect(hud).toBeHidden();
          await expectReachable(page, page.locator('#sw-combat-close'), { insets });
          await page.locator('#sw-combat-close').tap();
          await settle(page);
          await expect(hud).toBeVisible();
          await expectReachable(page, page.locator('.combat-hud .btn-end-combat'), { insets });
          await page.locator('.combat-hud .btn-end-combat').tap();
          expect(await page.evaluate(() => window.fixtureState.raidHudActions)).toEqual([
            'DPS Total',
            'collapse',
            'Recap',
            'DPS Current',
            'collapse',
            'end-combat',
          ]);
        } else {
          if (viewport.width > viewport.height) {
            const info = await page.locator('.ingame-hud').boundingBox();
            const camera = await page.locator('.recenter-camera-btn').boundingBox();
            expect(camera.y).toBeGreaterThanOrEqual(info.y + info.height);
          }
          await collapse.tap();
          await expect(hud.locator('.gauntlet-hud-row').first()).toBeHidden();
          for (const role of await hud.locator('.gauntlet-foot-pill').all())
            await expectReachable(page, role, { insets, scroll: true });
          await hud.locator('[data-role="farm"]').tap();
          await expectReachable(page, page.locator('.gauntlet-leave-btn'), { insets });
          await page.locator('.gauntlet-leave-btn').tap();
          expect(await page.evaluate(() => window.fixtureState.raidHudActions)).toEqual([
            'collapse',
            'role:farm',
            'leave-fortress',
          ]);
        }
        expect(
          await page.evaluate(() => window.fixtureRaidHudNodes.every((node) => node.isConnected)),
        ).toBe(true);
        await screenshot(page, `active-${kind}`);
        await page.locator('#sw-nav [data-sw-view="menu"]').tap();
        await page.locator('#sw-layout-toggle').tap();
        await expect(page.locator('html')).not.toHaveClass(/sw-mobile/);
        expect(await hud.evaluate((node) => node.style.top)).toBe('');
        expect(
          await page.evaluate(() => window.fixtureRaidHudNodes.every((node) => node.isConnected)),
        ).toBe(true);
      });
    }
  });
}

test('Raid progress ticks and party sprite updates do not rescan mobile menus', async ({
  page,
}) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'raid-hud.js'],
    beforeAdapter: (page) => page.evaluate(() => window.fixtureActiveRaid('fortress')),
  });
  const scans = await page.evaluate(async () => {
    let scans = 0;
    const original = Document.prototype.querySelectorAll;
    Document.prototype.querySelectorAll = function (selector) {
      if (/floating-tab-strip|panel-tab-btn\[data-tab\]|modal-tabs.*tab-btn/.test(selector))
        scans++;
      return original.call(this, selector);
    };
    const fill = document.querySelector('.gauntlet-hud-chargefill');
    const header = document.querySelector('.gauntlet-hud-header');
    const roster = document.querySelector('.gauntlet-foot-roster');
    try {
      for (let tick = 0; tick < 25; tick++) {
        fill.style.width = tick + '%';
        header.textContent =
          'The Fortress · Upcoming: Wave 1 in 1:' + (55 - tick) + ' · Survived 0';
        roster.replaceChildren(document.createElement('canvas'));
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return scans;
    } finally {
      Document.prototype.querySelectorAll = original;
    }
  });
  expect(scans, 'Animated raid content does not invalidate navigation').toBe(0);
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
