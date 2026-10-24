'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { nativeSnapshot, expectReachable } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} menu discovery`, () => {
    test.use({ viewport });

    test('Game menu searches names and groups while preserving native actions', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'dialogs.js'] });
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await expect(page.locator('[data-sw-menu-section=character]')).toHaveText('Game');
      const before = await nativeSnapshot(page);
      const search = page.getByRole('searchbox', { name: 'Find a game menu' });
      await expectReachable(page, search);
      await search.fill('crafting');
      await expect(
        page.locator('[data-sw-menu-panel=character] .sw-menu-group:visible'),
      ).toHaveCount(1);
      await expect(
        page.locator('[data-sw-menu-panel=character] .sw-menu-item:visible'),
      ).toHaveCount(5);
      await search.fill('  brew  ');
      await expect(
        page.locator('[data-sw-menu-panel=character] .sw-menu-item:visible'),
      ).toHaveCount(1);
      const brew = page.locator('#sw-menu [data-sw-target=brew]');
      await expectReachable(page, brew, { scroll: true });
      expect(await nativeSnapshot(page)).toEqual(before);
      await brew.tap();
      await expect(page.locator('#tab-brew')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.modalClicks.brew)).toBe(1);
    });

    test('Search explains empty results, clears and includes newly supplied native menus', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'dialogs.js'] });
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      const search = page.locator('#sw-menu-search');
      await search.fill('future feature');
      await expect(page.locator('#sw-menu-search-empty')).toBeVisible();
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.className = 'floating-tab-btn';
        button.dataset.tab = 'future-feature';
        const tooltip = document.createElement('span');
        tooltip.className = 'floating-tab-tooltip';
        tooltip.textContent = 'Future feature';
        button.append(tooltip);
        button.addEventListener('click', () => window.fixtureState.futureClicks++);
        window.fixtureState.futureClicks = 0;
        document.querySelector('.floating-tab-strip').append(button);
      });
      await settle(page);
      await expect(page.locator('#sw-menu-search-empty')).toBeHidden();
      const future = page.locator('#sw-menu [data-sw-target=future-feature]');
      await expect(future).toBeVisible();
      await expect(
        page.locator('[data-sw-menu-panel=character] .sw-menu-item:visible'),
      ).toHaveCount(1);
      await page.locator('[data-sw-menu-section=display]').tap();
      await expect(search).toBeHidden();
      await page.locator('[data-sw-menu-section=character]').tap();
      await expect(search).toHaveValue('future feature');
      await expectReachable(page, page.locator('#sw-menu-search-clear'));
      await page.locator('#sw-menu-search-clear').tap();
      await expect(search).toHaveValue('');
      await expect(search).toBeFocused();
      await expect(page.locator('#sw-menu-search-clear')).toBeHidden();
      await expect(
        page.locator('[data-sw-menu-panel=character] .sw-menu-group:visible'),
      ).toHaveCount(6);
      await search.fill('future feature');
      await future.tap();
      expect(await page.evaluate(() => window.fixtureState.futureClicks)).toBe(1);
    });
  });
}
