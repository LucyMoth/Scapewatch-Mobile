'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

test('Mobile graphics replace the browser-locked map quality row while Original UI restores it', async ({
  page,
}) => {
  await loadGame(page, { scripts: ['game.js', 'dialogs.js', 'settings.js'] });
  await page.evaluate(() => {
    window.fixtureSettings();
    window.fixtureQualityButtons = Array.from(
      document.querySelectorAll(
        '#settings-sec-display .settings-map-quality-row:not(.settings-scaling-btn)',
      ),
    );
  });
  const quality = page.locator(
    '#settings-sec-display .settings-toggle-row:has(.settings-map-quality-row:not(.settings-scaling-btn))',
  );
  await expect(quality).toBeHidden();
  await expect(page.locator('#settings-sec-display .settings-scaling-btn').first()).toBeVisible();
  const original = await quality.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => ({
      text: button.textContent,
      disabled: button.disabled,
      className: button.className,
    })),
  );
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=display]').tap();
  await page.locator('#sw-render-mode').selectOption('high');
  await expect(page.locator('#sw-render-mode')).toHaveValue('high');
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_render'))).toBe('high');
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
  await expect(quality).toBeVisible();
  expect(
    await quality.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => ({
        text: button.textContent,
        disabled: button.disabled,
        className: button.className,
      })),
    ),
  ).toEqual(original);
  expect(
    await page.evaluate(() => window.fixtureQualityButtons.every((button) => button.isConnected)),
  ).toBe(true);
  expect(await page.evaluate(() => window.fixtureState.settingsChanges)).toEqual([]);
  await page.locator('#sw-layout-toggle').tap();
  await expect(quality).toBeHidden();
  await expect(page.locator('#sw-render-mode')).toHaveValue('high');
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_render'))).toBe('high');
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} settings and appearance`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await loadGame(page, { scripts: ['game.js', 'dialogs.js', 'settings.js', 'collections.js'] });
    });

    test('Settings uses one readable page with native search, section jumps and controls', async ({
      page,
    }) => {
      await page.evaluate(() => window.fixtureSettings());
      await settle(page);
      const bounds = await viewportBounds(page);
      const host = page.locator('#tab-settings');
      expect(
        await host.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
        'Settings has no horizontal page scroll',
      ).toBe(true);
      await expect(page.locator('.settings-section-header').first()).toHaveCSS('font-size', '20px');
      await expectReachable(page, page.locator('.settings-search-input'));
      await page.locator('.settings-search-input').fill('font size');
      await expect(page.locator('.settings-section:visible')).toHaveCount(2);
      const fontSlider = page.locator('#settings-sec-display .settings-quality-slider');
      await expectReachable(page, fontSlider, { scroll: true });
      await fontSlider.press('ArrowRight');
      await expect(page.locator('#settings-sec-display .settings-quality-badge')).toHaveText(
        '19px',
      );
      await expectReachable(page, page.locator('.settings-search-clear'));
      await page.locator('.settings-search-clear').tap();
      await expect(page.locator('.settings-section:visible')).toHaveCount(15);
      const jump = page.locator('.settings-nav-btn', { hasText: /^Audio$/ });
      await expectReachable(page, jump, { scroll: true });
      await jump.tap();
      await expect
        .poll(() => page.evaluate(() => window.fixtureState.settingsJumps))
        .toEqual(['Audio']);
      const play = page.locator('#settings-sec-audio .settings-sound-preview').first();
      await expectReachable(page, play, { scroll: true });
      await play.tap();
      expect(await page.evaluate(() => window.fixtureState.settingsPreviews)).toEqual([
        'Task completed',
      ]);
      const toggle = page.locator('#settings-sec-audio .settings-switch').first();
      await toggle.scrollIntoViewIfNeeded();
      await toggle.tap();
      expect(await page.evaluate(() => window.fixtureState.settingsChanges)).toEqual([
        ['Display font', '19'],
        ['Audio', false],
      ]);
      await expectWithin(page.locator('.modal-close'), bounds);
      await screenshot(page, 'settings-native-controls');
      expect(
        await page.evaluate(() => window.fixtureSettingsNodes.every((node) => node.isConnected)),
      ).toBe(true);
      expect(await page.locator('#game-container').evaluate((node) => node.scrollTop)).toBe(0);
      await page.locator('.modal-close').tap();
      expect(await page.evaluate(() => window.fixtureState.closeClicks)).toBe(1);
      await page.evaluate(() => window.fixtureOpenModal('settings'));
      await expect(page.locator('#settings-sec-audio .settings-switch').first()).not.toHaveClass(
        /\bon\b/,
      );
    });

    test('Appearance keeps the live preview at the top while native options and pack cards scroll', async ({
      page,
    }) => {
      await page.evaluate(() => {
        window.fixtureCustomize();
        window.fixtureCreatorNodes = Array.from(document.querySelectorAll('.character-creator *'));
        window.fixtureCreatorSummary = document.querySelector('.cc-layers-summary');
      });
      await settle(page);
      const bounds = await viewportBounds(page);
      const preview = page.locator('.cc-canvas-wrap');
      const before = await expectWithin(preview, bounds);
      await expectReachable(page, page.locator('.cc-dir-btns button').last());
      await expectReachable(page, page.locator('.cc-save-btn').first());
      await expectReachable(page, page.locator('.modal-close'));
      const packs = page.locator('.sw-appearance-details > summary', {
        hasText: 'Appearance packs',
      });
      await expectReachable(page, packs, { scroll: true });
      await packs.tap();
      const pack = page.locator('.cc-pack-card').last();
      await pack.scrollIntoViewIfNeeded();
      await expectWithin(pack, bounds);
      await expectReachable(page, pack.locator('.cc-pack-cue'));
      await pack.locator('.cc-pack-cue').tap();
      expect(await page.evaluate(() => window.fixtureState.creatorPackClicks)).toEqual([
        'Wings Pack',
      ]);
      const last = page.locator('.cc-slot-row select').last();
      await expectReachable(page, last, { scroll: true });
      const center = await page.locator('.creator-center').boundingBox();
      const lastBounds = await last.boundingBox();
      expect(lastBounds.y).toBeGreaterThanOrEqual(center.y - 1);
      expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(center.y + center.height + 1);
      await last.selectOption('long');
      expect(await page.evaluate(() => window.fixtureState.creatorSelect)).toEqual([[13, 'long']]);
      const after = await expectWithin(preview, bounds);
      expect(after).toEqual(before);
      await page.locator('.cc-dir-btns button').last().tap();
      await page.locator('.cc-save-btn').first().tap();
      expect(await page.evaluate(() => window.fixtureState.creatorDirections)).toEqual([3]);
      expect(await page.evaluate(() => window.fixtureState.creatorActions)).toEqual(['Save']);
      expect(
        await page
          .locator('.creator-center')
          .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
        'Appearance options and Steam pack cards fit the page',
      ).toBe(true);
      expect(
        await page.evaluate(() => window.fixtureCreatorNodes.every((node) => node.isConnected)),
      ).toBe(true);
      await screenshot(page, 'appearance-fixed-preview');
    });

    test('Unlocks wraps each native skill and its rewards within the page', async ({ page }) => {
      await page.evaluate(() => window.fixtureUnlocksView('Unlocks'));
      await settle(page);
      const grid = page.locator('#tab-unlocks .unlocks-grid');
      await expect(grid).toHaveClass(/sw-unlocks-grid/);
      expect(await grid.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      const skill = page.locator('.grid-skill-header[data-skill="0"]');
      const first = page.locator('.unlock-item[data-skill="0"][data-reward="0"]');
      const last = page.locator('.unlock-item[data-skill="0"][data-reward="13"]');
      const header = await skill.boundingBox();
      const firstBounds = await first.boundingBox();
      const lastBounds = await last.boundingBox();
      expect(firstBounds.x).toBeGreaterThan(header.x + header.width);
      expect(firstBounds.y).toBeGreaterThanOrEqual(header.y);
      expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(header.y + header.height + 1);
      const finalReward = page.locator('.unlock-item[data-skill="30"][data-reward="13"]');
      await expectReachable(page, finalReward, { scroll: true });
      await finalReward.tap();
      expect(await page.evaluate(() => window.fixtureState.unlockGridClicks)).toEqual([[30, 13]]);
      expect(
        await page.evaluate(() => {
          const current = Array.from(document.querySelector('.unlocks-grid').children);
          return window.fixtureUnlockGridNodes.every((node, index) => current[index] === node);
        }),
        'Native grid node order remains intact',
      ).toBe(true);
      await screenshot(page, 'unlocks-grouped-rewards');
    });

    test('Trying a locked appearance keeps the preview and native pack actions usable', async ({
      page,
    }) => {
      await page.evaluate(() => {
        window.fixtureCustomize();
        window.fixtureCreatorLock();
      });
      await settle(page);
      const preview = page.locator('.cc-canvas-wrap');
      const bounds = await viewportBounds(page);
      const before = await expectWithin(preview, bounds);
      await expect(page.locator('.cc-save-btn').first()).toBeDisabled();
      const previewPanel = await page.locator('.creator-preview').boundingBox();
      const warning = await page.locator('.cc-preview-lock').boundingBox();
      expect(warning.y).toBeGreaterThanOrEqual(previewPanel.y);
      expect(warning.y + warning.height).toBeLessThanOrEqual(previewPanel.y + previewPanel.height);
      const last = page.locator('.cc-slot-row select').last();
      await expectReachable(page, last, { scroll: true });
      const center = await page.locator('.creator-center').boundingBox();
      const lastBounds = await last.boundingBox();
      expect(lastBounds.y).toBeGreaterThanOrEqual(center.y - 1);
      expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(center.y + center.height + 1);
      await last.selectOption('long');
      expect(await expectWithin(preview, bounds)).toEqual(before);
      await expectReachable(page, page.locator('.cc-preview-lock-btn.buy'));
      await expectReachable(page, page.locator('.cc-preview-lock-btn').last());
      await page.locator('.cc-preview-lock-btn').last().tap();
      await expect(page.locator('.cc-save-btn').first()).toBeEnabled();
      await expect(page.locator('.cc-preview-lock')).toBeHidden();
      expect(await page.evaluate(() => window.fixtureState.creatorActions)).toEqual([
        'Remove pack items',
      ]);
      await screenshot(page, 'appearance-native-pack-preview');
    });
  });
}

test('Appearance and Unlocks restore original DOM and inline grid placement after mobile mode', async ({
  page,
}) => {
  await loadGame(page, { scripts: ['game.js', 'dialogs.js', 'collections.js'] });
  await page.evaluate(() => window.fixtureCustomize());
  await settle(page);
  await expect(
    page.locator('.creator-center > .sw-appearance-details > .cc-layers-summary'),
  ).toHaveCount(1);
  await page.locator('.modal-close').tap();
  await page.evaluate(() => window.fixtureUnlocksView('Unlocks'));
  await settle(page);
  await expect(page.locator('.unlocks-grid')).toHaveClass(/sw-unlocks-grid/);
  for (const viewport of [
    { width: 740, height: 360 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await settle(page);
    expect(
      await page
        .locator('.unlocks-grid')
        .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true);
    expect(
      await page.evaluate(() => {
        const grid = document.querySelector('.unlocks-grid');
        return window.fixtureUnlockGridNodes.every((node, index) => grid.children[index] === node);
      }),
    ).toBe(true);
  }
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  });
  await expect(page.locator('.creator-preview > .cc-layers-summary')).toHaveCount(1);
  await expect(page.locator('.unlocks-grid')).not.toHaveClass(/sw-unlocks-grid/);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await settle(page);
  await expect(
    page.locator('.creator-center > .sw-appearance-details > .cc-layers-summary'),
  ).toHaveCount(1);
  await expect(page.locator('.unlocks-grid')).toHaveClass(/sw-unlocks-grid/);
  await page.locator('.modal-close').tap();
  await page.locator('#sw-nav [data-sw-view="menu"]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
  await expect(page.locator('.creator-preview > .cc-layers-summary')).toHaveCount(1);
  await expect(page.locator('.unlocks-grid')).not.toHaveClass(/sw-unlocks-grid/);
  expect(
    await page.locator('.unlocks-grid').evaluate((node) => node.style.gridTemplateColumns),
  ).toBe('repeat(31, 56px)');
  expect(
    await page
      .locator('.unlocks-grid > *')
      .evaluateAll((nodes) =>
        nodes.every((node) => !node.style.getPropertyValue('--sw-unlock-row')),
      ),
  ).toBe(true);
  expect(
    await page
      .locator('.unlocks-grid > *')
      .evaluateAll((nodes) => nodes.every((node) => !node.hasAttribute('style'))),
    'Unlocks restores originally unstyled native cells without empty style attributes',
  ).toBe(true);
});
