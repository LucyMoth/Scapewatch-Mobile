'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} screen selection`, () => {
    test.use({ viewport });

    test('selecting a native quest opens fitted detail immediately and returns to its list', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'quests.js'] });
      await page.evaluate(() => window.fixtureOpenModal('quests'));
      await settle(page);
      const selected = page.locator('.quest-row').nth(22);
      await selected.scrollIntoViewIfNeeded();
      await selected.tap();
      await settle(page);
      const detail = page.locator('.quest-detail-side');
      await expectWithin(detail.locator('.quest-detail-title'), await viewportBounds(page));
      expect(await detail.evaluate((node) => node.scrollTop)).toBe(0);
      expect(await detail.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await expect(detail.locator('.quest-step-text').first()).toHaveCSS('white-space', 'normal');
      const begin = detail.locator('.quest-btn-begin');
      await expectReachable(page, begin, { scroll: true });
      await begin.tap();
      expect(await page.evaluate(() => window.fixtureState.questActions)).toEqual([22]);
      expect(await page.evaluate(() => window.fixtureState.questSelections)).toEqual([22]);
      if (viewport.width < viewport.height) {
        await expectReachable(page, page.locator('.sw-quest-back'));
        await page.locator('.sw-quest-back').tap();
        await expect(page.locator('.quest-list-side')).toBeVisible();
        await expect(page.locator('.quest-row.selected')).toHaveAttribute('data-quest-id', '22');
      } else await expect(page.locator('.quest-list-side')).toBeVisible();
      await screenshot(page, 'quest-list-and-detail');
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('.sw-quest-back')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.querySelector('.quest-layout') === window.fixtureQuestLayout,
        ),
      ).toBe(true);
    });

    test('native quest links and tutorial selections open detail without undoing Back on passive refresh', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'quests.js'] });
      await page.evaluate(() => window.fixtureQuestLink(18));
      await settle(page);
      const detail = page.locator('.quest-detail-side');
      await expect(detail.locator('.quest-detail-title')).toHaveText('Sandscale Burnt Supper 18');
      await expectWithin(detail.locator('.quest-detail-title'), await viewportBounds(page));
      if (viewport.width < viewport.height) {
        expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
        await page.evaluate(() => window.fixtureQuestRefresh());
        await settle(page);
        await expect(page.locator('.quest-list-side')).toBeVisible();
        await expect(detail).toBeHidden();
      }
      await page.evaluate(() => window.fixtureQuestTutorial(23));
      await settle(page);
      await expectWithin(detail.locator('.quest-detail-title'), await viewportBounds(page));
      await expect(detail.locator('.quest-detail-title')).toHaveText('Sandscale Burnt Supper 23');
      if (viewport.width < viewport.height) await page.locator('.sw-quest-back').tap();
      await page.evaluate(() => window.fixtureOpenModal('collections'));
      await settle(page);
      await page.evaluate(() => window.fixtureQuestLink(23));
      await settle(page);
      await expectWithin(detail.locator('.quest-detail-title'), await viewportBounds(page));
      if (viewport.width < viewport.height) await page.locator('.sw-quest-back').tap();
      await page.locator('.modal-close').tap();
      await page.evaluate(() => window.fixtureQuestLink(23));
      await settle(page);
      await expectWithin(detail.locator('.quest-detail-title'), await viewportBounds(page));
      const begin = detail.locator('.quest-btn-begin');
      await begin.scrollIntoViewIfNeeded();
      await begin.tap();
      expect(await page.evaluate(() => window.fixtureState.questSelections)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.questActions)).toEqual([23]);
    });

    test('Barter aligns quantity and native actions without sideways scrolling', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'barter.js'] });
      await page.locator('#toggle-barter').evaluate((node) => node.click());
      await settle(page);
      const panel = page.locator('#barter-panel');
      const row = panel.locator('.barter-slot-row').first();
      const buy = row.locator('.barter-buy-btn');
      const charm = row.locator('.barter-charm-btn');
      await expectReachable(page, buy, { scroll: true });
      await expectReachable(page, charm);
      await buy.tap();
      await charm.tap();
      const quantity = row.locator('.barter-qty-input');
      await expectReachable(page, quantity);
      await quantity.evaluate((node) => {
        node.value = '7';
        node.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await buy.tap();
      expect(await page.evaluate(() => window.fixtureState.barterActions)).toEqual([
        [0, 'Buy', '1'],
        [0, 'Charm', '1'],
        [0, 'Buy', '7'],
      ]);
      expect(await panel.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await screenshot(page, 'barter-aligned-actions');
      await page.locator('#sw-secondary-close').tap();
      await expect(panel).toBeHidden();
    });

    test('Mob and PvP navigation clears the title and preserves native selection actions', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'combat-selection.js'] });
      await page.evaluate(() => window.fixtureSelection());
      await settle(page);
      await expectReachable(page, page.locator('.modal-close'));
      const title = await expectWithin(page.locator('.header-name'), await viewportBounds(page));
      const nav = await expectWithin(page.locator('.processing-nav'), await viewportBounds(page));
      if (viewport.width < viewport.height)
        expect(nav.y).toBeGreaterThanOrEqual(title.y + title.height);
      const row = page.locator('.mob-row').first();
      const icon = await row.locator('.mob-row-icon').boundingBox();
      expect(icon.width).toBeLessThanOrEqual(64);
      await row.tap();
      const fight = page.locator('.mob-config-panel .fight-btn');
      await expectReachable(page, fight, { scroll: true });
      await fight.tap();
      expect(
        await page
          .locator('#tab-mobs')
          .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      ).toBe(true);
      await page.locator('.processing-nav [data-tab=pvp]').tap();
      await settle(page);
      const family = page.locator('.pvp-left .loadout-sel-family').first();
      await expectReachable(page, family, { scroll: true });
      await family.tap();
      const attack = page.locator('.pvp-right .pvp-attack-btn').first();
      await expectReachable(page, attack, { scroll: true });
      await attack.tap();
      expect(
        await page.locator('#tab-pvp').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      ).toBe(true);
      expect(await page.evaluate(() => window.fixtureState.selectionActions)).toEqual([
        ['mob', 0],
        ['fight', 0],
        ['loadout', 'Melee'],
        ['attack', 0],
      ]);
      await screenshot(page, 'pvp-fitted-columns');
    });

    test('Hiscores keeps category, search, profile links and results inside the panel', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'hiscores.js'] });
      await page.evaluate(() => window.fixtureOpenModal('hiscores'));
      await settle(page);
      const category = page.getByLabel('Ranking category');
      await expectReachable(page, category);
      await category.selectOption({ label: 'Fortify' });
      const name = page.locator('.hs-search-input').first();
      await expectReachable(page, name);
      await name.fill('Adventurer');
      await page.locator('.hs-search-btn').first().tap();
      const own = page.locator('.hs-your-rank-btn');
      await expectReachable(page, own);
      await own.tap();
      const results = page.locator('.hs-leaderboard');
      expect(await results.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      const player = results.locator('.hs-row-name').first();
      await player.scrollIntoViewIfNeeded();
      await player.tap();
      expect(await page.evaluate(() => window.fixtureState.hiscoreActions)).toEqual([
        ['category', 'Fortify'],
        ['Name', 'Adventurer'],
        ['own'],
        ['player', 0],
      ]);
      await screenshot(page, 'hiscores-category-search-results');
    });
  });
}
