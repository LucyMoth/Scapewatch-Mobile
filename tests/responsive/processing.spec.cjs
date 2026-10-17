'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} processing`, () => {
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
      await page.evaluate(() => {
        window.fixtureProcessing();
        window.fixtureProcessingNodes = Array.from(
          document.querySelectorAll(
            '.processing-nav *, .proc-layout *, .brew-layout *, .alms-layout *',
          ),
        );
      });
      await settle(page);
    });

    test('native skill navigation, material tiers and crafting actions remain easy to reach', async ({
      page,
    }) => {
      const bounds = await viewportBounds(page);
      const title = await expectWithin(page.locator('.header-name'), bounds);
      const navigation = await expectWithin(page.locator('.processing-nav'), bounds);
      if (viewport.width < viewport.height)
        expect(navigation.y).toBeGreaterThanOrEqual(title.y + title.height);
      else expect(navigation.x).toBeGreaterThanOrEqual(title.x + title.width);
      await expectReachable(page, page.locator('.modal-close'));
      for (const skill of ['smith', 'craft', 'imbue']) {
        const tab = page.locator(`.processing-nav [data-tab='${skill}']`);
        await expectReachable(page, tab);
        await expect(tab.locator('.processing-nav-tooltip')).toBeVisible();
        await tab.tap();
        await settle(page);
        const host = page.locator('#tab-' + skill);
        const tier = host.locator('.proc-tier-row').nth(1);
        await expectReachable(page, tier, { scroll: true });
        await tier.tap();
        await expect(host.locator('.proc-mat-label')).toHaveText('Tin');
        const input = host.locator('.proc-amount-input');
        await expectReachable(page, input, { scroll: true });
        await input.fill('42');
        const max = host.locator('.proc-amount-max-btn', { hasText: /^MAX$/ });
        await expectReachable(page, max, { scroll: true });
        await max.tap();
        const craft = host.locator('.proc-craft-btn').first();
        await expectReachable(page, craft, { scroll: true });
        await craft.tap();
        expect(await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
        const rail = host.locator('.proc-tier-sidebar-scroll');
        expect(await rail.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(
          viewport.width < viewport.height,
        );
      }
      expect(await page.evaluate(() => window.fixtureState.processingTiers)).toEqual([
        ['smith', 1],
        ['craft', 1],
        ['imbue', 1],
      ]);
      expect(await page.evaluate(() => window.fixtureState.processingActions)).toEqual([
        ['smith', 0],
        ['craft', 0],
        ['imbue', 0],
      ]);
      await screenshot(page, 'processing-native-recipes');
      expect(
        await page.evaluate(() => window.fixtureProcessingNodes.every((node) => node.isConnected)),
      ).toBe(true);
    });

    test('requirements fit the phone and long materials scroll without hiding their names', async ({
      page,
    }) => {
      const info = page.locator('#tab-smith .proc-recipe-info-btn').first();
      await expectReachable(page, info, { scroll: true });
      await info.tap();
      const pop = page.locator('.proc-recipe-info-pop');
      await expectWithin(pop, await viewportBounds(page));
      const last = pop.locator('.proc-recipe-info-row').last();
      await last.scrollIntoViewIfNeeded();
      await expectWithin(last, await viewportBounds(page));
      await expect(last.locator('.proc-recipe-info-name')).toHaveCSS('white-space', 'normal');
      expect(await pop.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await page.locator('.modal-close').tap();
      await expect(pop).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureState.closeClicks)).toBe(1);
    });

    test('brewing filters and amounts stay separate from fitted recipe actions', async ({
      page,
    }) => {
      await page.locator(".processing-nav [data-tab='brew']").tap();
      await settle(page);
      const host = page.locator('#tab-brew');
      const filter = host.locator(".brew-style-tab[data-style='discovery']");
      await expectReachable(page, filter, { scroll: true });
      await filter.tap();
      await expect(host.locator('.brew-recipe-card:visible')).toHaveCount(3);
      const max = host.locator('.proc-amount-max-btn', { hasText: /^MAX$/ });
      await expectReachable(page, max, { scroll: true });
      await max.tap();
      const brew = host.locator('.brew-recipe-card:visible .brew-btn').first();
      await expectReachable(page, brew, { scroll: true });
      await brew.tap();
      expect(await page.evaluate(() => window.fixtureState.processingActions)).toEqual([
        ['brew', 'discovery', 0],
      ]);
      expect(await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await screenshot(page, 'brewing-native-filter');
    });

    test('Alms keeps donation, preview and path rewards within the screen', async ({ page }) => {
      await page.locator(".processing-nav [data-tab='alms']").tap();
      await settle(page);
      const host = page.locator('#tab-alms');
      const input = host.locator('.alms-gold-input');
      await expectReachable(page, input, { scroll: true });
      await input.fill('500');
      const confirm = host.locator('.alms-confirm-btn');
      await expectReachable(page, confirm, { scroll: true });
      await confirm.tap();
      const preview = host.locator('.alms-preview');
      await preview.scrollIntoViewIfNeeded();
      await expectWithin(preview, await viewportBounds(page));
      const claim = host.locator('.alms-path-reward .alms-path-claim-btn').first();
      await expectReachable(page, claim, { scroll: true });
      await claim.tap();
      expect(await page.evaluate(() => window.fixtureState.processingActions)).toEqual([
        ['alms', '500'],
      ]);
      expect(await page.evaluate(() => window.fixtureState.almsControls)).toEqual([
        '500',
        ['claim', 1],
      ]);
      expect(
        await host
          .locator('.alms-path-row')
          .first()
          .evaluate((row) => {
            const level = row.querySelector('.alms-path-node').getBoundingClientRect();
            const perks = row.querySelector('.alms-path-perks').getBoundingClientRect();
            const reward = row.querySelector('.alms-path-reward').getBoundingClientRect();
            return level.right <= perks.left && level.right <= reward.left;
          }),
        'Alms level markers leave a separate column for perks and rewards',
      ).toBe(true);
      expect(await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await screenshot(page, 'alms-native-actions');
    });

    test('switching destinations and Original UI restores native processing layout', async ({
      page,
    }) => {
      await page.evaluate(() => window.fixtureProcessing('bank'));
      await settle(page);
      await expect(page.locator('.processing-nav')).toBeHidden();
      await page.evaluate(() => {
        window.fixtureProcessing('smith');
        document.querySelector('#sw-nav [data-sw-view="menu"]').click();
      });
      await settle(page);
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
      await expect(page.locator('.processing-nav')).toHaveCSS('position', 'absolute');
      await expect(page.locator('#tab-smith .proc-main-layout')).toHaveCSS('flex-direction', 'row');
      expect(
        await page
          .locator('#tab-smith .proc-tier-sidebar')
          .evaluate((node) => parseFloat(getComputedStyle(node).width)),
      ).toBeCloseTo(300, 0);
      expect(
        await page.evaluate(() => window.fixtureProcessingNodes.every((node) => node.isConnected)),
      ).toBe(true);
    });
  });
}
