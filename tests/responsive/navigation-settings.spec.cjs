'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

test('Continue leads with unfinished quests and remembers explicit native filter choices', async ({
  page,
}) => {
  await loadGame(page, {
    scripts: ['game.js', 'quests.js'],
    beforeAdapter: async () =>
      page.evaluate(() => {
        window.fixtureQuestStatuses = Array(30).fill('completed');
        window.fixtureQuestStatuses[12] = 'active';
        window.fixtureQuestStatuses[20] = 'available';
        window.fixtureQuestStatuses[24] = 'claimable';
        window.fixtureQuestRows();
        window.fixtureOpenModal('quests');
      }),
  });
  const continuing = page.locator('[data-sw-quest-filter=continue]');
  await expect(continuing).toHaveClass(/active/);
  await expect(page.locator('.quest-row:visible')).toHaveCount(3);
  await page.locator('.quest-filter-btn[data-filter=completed]').tap();
  await expect(page.locator('.quest-row:visible')).toHaveCount(27);
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_quest_filter'))).toBe(
    'completed',
  );
  await page.locator('.modal-close').tap();
  await page.evaluate(() => window.fixtureOpenModal('quests'));
  await expect(page.locator('.quest-filter-btn[data-filter=completed]')).toHaveClass(/active/);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await expect(continuing).toHaveCount(0);
  await expect(page.locator('.quest-filter-btn[data-filter=all]')).toHaveClass(/active/);
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('.quest-filter-btn[data-filter=completed]')).toHaveClass(/active/);
  expect(await page.evaluate(() => window.fixtureState.questActions)).toEqual([]);
});

test('Continue survives native quest refreshes without reopening details after Back', async ({
  page,
}) => {
  await loadGame(page, { scripts: ['game.js', 'quests.js'] });
  await page.evaluate(() => window.fixtureOpenModal('quests'));
  await page.locator('.quest-row').nth(5).tap();
  await page.locator('.sw-quest-back').tap();
  await page.evaluate(() => {
    window.fixtureQuestStatuses = Array(30).fill('locked');
    window.fixtureQuestStatuses[5] = 'active';
    window.fixtureQuestRefresh();
  });
  await expect(page.locator('.quest-row:visible')).toHaveCount(1);
  await expect(page.locator('.quest-detail-side')).toBeHidden();
  await expect(page.locator('[data-sw-quest-filter=continue]')).toHaveClass(/active/);
  await page.evaluate(() => {
    window.fixtureQuestStatuses = Array(30).fill('completed');
    window.fixtureQuestRows();
  });
  await expect(page.locator('.sw-quest-empty')).toBeVisible();
  await page.locator('.quest-filter-btn[data-filter=all]').tap();
  await expect(page.locator('.sw-quest-empty')).toBeHidden();
  await expect(page.locator('.quest-row:visible')).toHaveCount(30);
});

test('Settings handles native rebuilding and page restoration without resurrecting old rows', async ({
  page,
}) => {
  await loadGame(page, {
    scripts: ['game.js', 'dialogs.js', 'settings.js', 'settings-display.js'],
  });
  await page.evaluate(() => window.fixtureSettingsDisplay());
  await expect(page.locator('.sw-settings-original-note')).toHaveCount(2);
  await page.evaluate(() => {
    window.fixtureOldDisplayNodes = window.fixtureDisplayNodes;
    window.fixtureSettingsDisplay();
  });
  await expect(page.locator('.sw-settings-original-note')).toHaveCount(2);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  await expect(page.locator('.sw-settings-original-note')).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect(page.locator('.sw-settings-original-note')).toHaveCount(2);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  expect(
    await page.evaluate(() => window.fixtureOldDisplayNodes.some((node) => node.isConnected)),
  ).toBe(false);
  await expect(page.locator('#tab-settings > .settings-section')).toHaveCount(15);
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} navigation refinements`, () => {
    test.use({ viewport });

    test('Mob detail fills a phone page and Back restores the mob list position', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'combat-selection.js'] });
      await page.evaluate(() => window.fixtureSelection());
      const row = page.locator('.mob-row').nth(12);
      await row.scrollIntoViewIfNeeded();
      const position = await page.locator('.mob-list-scroll').evaluate((node) => node.scrollTop);
      await row.tap();
      await expect(page.locator('.mob-detail-side')).toBeVisible();
      await expectReachable(page, page.locator('.fight-btn'), { scroll: true });
      if (viewport.width < viewport.height) {
        await expect(page.locator('.mob-list-side')).toBeHidden();
        await expectReachable(page, page.locator('.sw-mob-back'));
        expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
        await expect(page.locator('.mob-list-side')).toBeVisible();
        await expect(page.locator('.mob-detail-side')).toBeHidden();
        expect(await page.locator('.mob-list-scroll').evaluate((node) => node.scrollTop)).toBe(
          position,
        );
        await page.locator('.mob-row-map-icon').nth(12).tap();
        await expect(page.locator('.mob-detail-side')).toBeHidden();
      } else await expect(page.locator('.mob-list-side')).toBeVisible();
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('.sw-mob-back')).toHaveCount(0);
      await expect(page.locator('.mob-layout')).not.toHaveClass(/sw-mob-layout/);
      expect(await page.evaluate(() => window.fixtureState.selectionActions)).not.toContainEqual([
        'fight',
        12,
      ]);
    });

    test('Settings puts common controls first and preserves Original UI display settings', async ({
      page,
    }) => {
      await loadGame(page, {
        scripts: ['game.js', 'dialogs.js', 'settings.js', 'settings-display.js'],
      });
      await page.evaluate(() => window.fixtureSettingsDisplay());
      await settle(page);
      const host = page.locator('#tab-settings');
      await expect(host.locator('.settings-section').first()).toHaveAttribute(
        'id',
        'settings-sec-display',
      );
      await expect(host.locator('.settings-nav-btn').first()).toHaveText('Display');
      await expect(host.locator('.sw-lang-picker:visible')).toHaveCount(1);
      const originalOnly = host.locator('.sw-settings-original');
      await expect(originalOnly).toHaveCount(2);
      await expect(originalOnly.locator('.sw-settings-original-note').first()).toContainText(
        'Original UI only',
      );
      const hud = host.locator('input[min="50"][max="150"]');
      await expect(hud).toHaveValue('85');
      await expect(hud.locator('..')).toHaveAttribute('inert', '');
      await host.locator('.settings-search-input').fill('font size');
      await expect(host.locator('.settings-section:visible')).toHaveCount(2);
      await host.locator('.settings-search-clear').tap();
      await host.locator('.settings-search-bar .sw-lang-picker').selectOption('sv');
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-layout-toggle').tap();
      await expect(host.locator('.sw-settings-original-note')).toHaveCount(0);
      await expect(hud.locator('..')).not.toHaveAttribute('inert');
      await expect(hud).toHaveValue('85');
      await expect(host.locator('.sw-lang-picker:visible')).toHaveCount(2);
      expect(
        await host
          .locator(':scope > .settings-section')
          .evaluateAll((sections) => sections.map((section) => section.id)),
      ).toEqual(await page.evaluate(() => window.fixtureOriginalSettingsOrder));
      expect(
        await page.evaluate(() => window.fixtureDisplayNodes.every((node) => node.isConnected)),
      ).toBe(true);
      expect(await page.evaluate(() => window.fixtureState.settingsChanges)).toEqual([
        ['language', 'sv'],
      ]);
    });
  });
}
