'use strict';

const { test, expect, settle } = require('../support/game.cjs');
const { openSkills } = require('../support/navigation.cjs');
const {
  loadResponsiveGame,
  nativeSnapshot,
  expectReachable,
  safeInsets,
} = require('../support/responsive.cjs');

test.beforeEach(async ({ page }) => {
  await loadResponsiveGame(page);
});

for (const [view, panel] of [
  ['tasks', '#unified-queue-panel'],
  ['inventory', '#bag-panel'],
]) {
  test(`${view} primary navigation closes and reopens without repeating the native action`, async ({
    page,
  }) => {
    const button = page.locator(`#sw-nav [data-sw-view=${view}]`);
    await button.tap();
    await settle(page);
    await expect(page.locator(panel)).toBeVisible();
    const before = await nativeSnapshot(page);
    expect(before.actions.panelClicks[view]).toBe(1);
    await button.tap();
    await settle(page);
    await expect(page.locator(panel)).toBeHidden();
    await expect(page.locator('#sw-view-title')).toHaveText('World');
    await expect(page.locator('#sw-nav button[aria-current=page]')).toHaveCount(0);
    expect(
      await nativeSnapshot(page),
      'Closing a presentation sheet invokes no native action',
    ).toEqual(before);
    await button.tap();
    await settle(page);
    await expect(page.locator(panel)).toBeVisible();
    await expect(button).toHaveAttribute('aria-current', 'page');
    expect(
      await nativeSnapshot(page),
      'Reopening the retained native panel invokes no second action',
    ).toEqual(before);
  });
}

test('Menu groups destinations and keeps future native destinations reachable', async ({
  page,
}) => {
  const before = await nativeSnapshot(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  const menu = page.locator('#sw-menu');
  await expect(menu.getByRole('button', { name: 'Game', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Activities', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.locator('#sw-character-grid')).toBeVisible();
  await expect(page.locator('#sw-character-grid .sw-menu-heading')).toHaveText([
    'Character',
    'Progress',
    'Social',
  ]);
  await expect(page.locator('#sw-character-grid .sw-menu-item').first()).toHaveText('Skills');
  await expect(page.locator('#sw-menu [data-sw-target=bank]')).toHaveCount(0);
  await expect(page.locator('#sw-game-grid')).toBeVisible();
  await expect(page.locator('#sw-game-grid .sw-menu-heading')).toHaveText(['Combat', 'Crafting']);
  for (const tab of ['quests', 'diary']) {
    await expect(menu.locator(`[data-sw-target=${tab}]`)).toHaveCount(1);
    await expect(menu.locator(`[data-sw-target=${tab}]`)).toHaveAttribute('data-sw-kind', 'game');
  }
  await expect(page.locator('.sw-render-setting:has(#sw-render-mode)')).toBeHidden();
  await menu.getByRole('button', { name: 'Settings', exact: true }).tap();
  await expect(page.locator('.sw-render-setting:has(#sw-render-mode)')).toBeVisible();
  await expect(page.locator('#sw-settings-grid [data-sw-target=settings]')).toBeVisible();
  await expect(page.locator('#sw-orientation-toggle')).toBeHidden();
  await expect(page.locator('#sw-character-grid')).toBeHidden();
  await expect(page.locator('#sw-game-grid')).toBeHidden();
  await menu.getByRole('button', { name: 'Game', exact: true }).tap();
  await expect(page.locator('#sw-game-grid .sw-menu-heading')).toHaveText(['Combat', 'Crafting']);
  await expect(page.locator('#sw-character-grid')).toBeVisible();
  await expect(page.locator('.sw-render-setting:has(#sw-render-mode)')).toBeHidden();
  expect(await nativeSnapshot(page), 'Changing menu sections invokes no game actions').toEqual(
    before,
  );
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.className = 'floating-tab-btn';
    button.dataset.tab = 'future-feature';
    button.textContent = 'Future feature';
    button.addEventListener('click', () => window.fixtureState.futureClicks++);
    window.fixtureState.futureClicks = 0;
    document.querySelector('.floating-tab-strip').append(button);
  });
  const future = page.locator('#sw-game-grid [data-sw-target=future-feature]');
  await expect(future).toBeVisible();
  await expect(future.locator('xpath=../..')).toHaveAttribute('aria-label', 'More');
  await future.tap();
  expect(await page.evaluate(() => window.fixtureState.futureClicks)).toBe(1);
});

test('Bank opens, closes and switches from another modal through native controls', async ({
  page,
}) => {
  const button = page.locator('#sw-nav [data-sw-view=bank]');
  await button.tap();
  await settle(page);
  await expect(page.locator('#tab-bank')).toBeVisible();
  await expect(button).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
  await button.tap();
  await settle(page);
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(button).toHaveAttribute('aria-current', 'false');
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.closeClicks)).toBe(1);
  await page.locator('.floating-tab-btn[data-tab=quests]').evaluate((element) => element.click());
  await button.tap();
  await settle(page);
  await expect(page.locator('#tab-bank')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(2);
  await page.locator('.modal-close').tap();
  await settle(page);
  await expect(button).toHaveAttribute('aria-current', 'false');
  await expect(page.locator('#sw-view-title')).toHaveText('World');
});

test('single Quests and Diary entries invoke their native page once', async ({ page }) => {
  for (const tab of ['quests', 'diary']) {
    const before = await page.evaluate((tab) => window.fixtureState.panelClicks[tab] || 0, tab);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    const entry = page.locator(`#sw-menu [data-sw-target=${tab}]`);
    await expect(entry).toHaveCount(1);
    await entry.tap();
    await expect(page.locator('.modal-overlay')).toBeVisible();
    expect(await page.evaluate((tab) => window.fixtureState.modalClicks[tab], tab)).toBe(1);
    expect(await page.evaluate((tab) => window.fixtureState.panelClicks[tab] || 0, tab)).toBe(
      before,
    );
    await page.locator('.modal-close').tap();
  }
});

test('a tracker remains available when its native full page is missing', async ({ page }) => {
  await page.evaluate(() =>
    document.querySelector('.floating-tab-strip [data-tab=quests]').remove(),
  );
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  const entry = page.locator('#sw-menu [data-sw-target=quests]');
  await expect(entry).toHaveCount(1);
  await expect(entry).toHaveAttribute('data-sw-kind', 'dock');
  await entry.tap();
  await expect(page.locator('#quests-panel')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.panelClicks.quests)).toBe(1);
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 640, height: 300 },
]) {
  test(`Skills has a reachable return action at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.evaluate((insets) => {
      for (const [side, value] of Object.entries(insets))
        document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
    }, safeInsets);
    await openSkills(page);
    const panel = page.locator('#skills-panel');
    const close = page.locator('#sw-secondary-close');
    await expect(panel).toBeVisible();
    await expectReachable(page, close, { insets: safeInsets });
    const header = await page.locator('#sw-secondary-header').boundingBox();
    const rect = await panel.boundingBox();
    expect(rect.y, 'The secondary panel starts below its return header').toBeGreaterThanOrEqual(
      header.y + header.height - 1,
    );
    const before = await nativeSnapshot(page);
    await close.tap();
    await settle(page);
    await expect(panel).toBeHidden();
    await expect(close).toBeHidden();
    await expect(page.locator('#sw-view-title')).toHaveText('World');
    expect(await nativeSnapshot(page), 'Returning changes presentation only').toEqual(before);
    await openSkills(page);
    expect(await nativeSnapshot(page), 'Reopening reuses the retained native panel').toEqual(
      before,
    );
  });
}

test('Bank is gated before login and survives native toolbar replacement', async ({ page }) => {
  await page.evaluate(() => window.fixtureLogin(true));
  await settle(page);
  const button = page.locator('#sw-nav [data-sw-view=bank]');
  await button.tap();
  await expect(page.locator('.modal-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBeUndefined();
  await page.evaluate(() => {
    window.fixtureLogin(false);
    window.fixtureRerenderNav();
  });
  await settle(page);
  await button.tap();
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
});

test('closing Skills in Original UI clears its secondary header when returning to Mobile UI', async ({
  page,
}) => {
  await openSkills(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
  await page.locator('#toggle-skills').evaluate((button) => button.click());
  expect(await page.evaluate(() => window.fixtureState.panelClicks.skills)).toBe(2);
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  await expect(page.locator('#skills-panel')).toBeHidden();
  await expect(page.locator('#sw-secondary-header')).toBeHidden();
  await expect(page.locator('#sw-view-title')).toHaveText('World');
  await expect(page.locator('#sw-nav button[aria-current=page]')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixtureState.panelClicks.skills)).toBe(2);
});

test('Skills from Menu closes the prior native Bank modal', async ({ page }) => {
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  await openSkills(page);
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('#skills-panel')).toBeVisible();
  await expect(page.locator('#sw-secondary-header')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.closeClicks)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.panelClicks.skills)).toBe(1);
});
