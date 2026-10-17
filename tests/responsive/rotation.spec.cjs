'use strict';

const { test, expect, settle, screenshot } = require('../support/game.cjs');
const {
  loadResponsiveGame,
  nativeSnapshot,
  viewportBounds,
  expectWithin,
  expectReachable,
  expectNavigation,
  roundTrip,
} = require('../support/responsive.cjs');

test.beforeEach(async ({ page }) => {
  await loadResponsiveGame(page);
});

async function openOpponentLoot(page) {
  await page.locator('#sw-combat-toggle').tap();
  await page.locator('#sw-combat-tabs [data-sw-combat=opponent]').tap();
  await page.locator('.mob-tabs .panel-tab[data-tab=loot]').tap();
  await settle(page);
}

for (const [view, panel, action, counter] of [
  ['tasks', '#unified-queue-panel', '.uq-controls .ctrl-btn', 'taskControlClicks'],
  ['inventory', '#bag-panel', '.inv-slot', 'inventoryClicks'],
]) {
  test(`${view} selection and native controls survive portrait-landscape-portrait`, async ({
    page,
  }) => {
    await page.locator(`#sw-nav [data-sw-view=${view}]`).tap();
    await settle(page);
    await roundTrip(page, async () => {
      await expect(page.locator(panel)).toBeVisible();
      await expect(page.locator(`#sw-nav [data-sw-view=${view}]`)).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(await page.evaluate((view) => window.fixtureState.panelClicks[view], view)).toBe(1);
    });
    const control = page.locator(panel).locator(action).first();
    await expectReachable(page, control, { scroll: true });
    await control.tap();
    expect(await page.evaluate((counter) => window.fixtureState[counter], counter)).toBe(1);
    await screenshot(page, `${view}-rotation-restored`);
  });
}

test('expanded opponent loot and native tab selection survive rotation without game actions', async ({
  page,
}) => {
  await openOpponentLoot(page);
  await roundTrip(page, async () => {
    await expect(page.locator('#sw-combat-tabs')).toBeVisible();
    await expect(page.locator('#sw-combat-tabs [data-sw-combat=opponent]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#ce-mob-panel')).toBeVisible();
    await expect(page.locator('#ce-player-panel')).toBeHidden();
    await expect(page.locator('.mob-tabs .panel-tab[data-tab=loot]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#ce-mob-panel [data-content=loot]')).toBeVisible();
  });
  await page.locator('.mob-tabs .panel-tab[data-tab=loot]').tap();
  await settle(page);
  expect(await page.evaluate(() => window.fixtureState.combatTabClicks)).toEqual([
    ['mob', 'loot'],
    ['mob', 'loot'],
  ]);
  await expect(page.locator('#sw-combat-toggle')).toBeVisible();
});

test('rotation preserves native collapsed loot and reopening invokes one original handler', async ({
  page,
}) => {
  await openOpponentLoot(page);
  await page.locator('.mob-tabs .panel-tab[data-tab=loot]').tap();
  await settle(page);
  await roundTrip(page, async () => {
    await expect(page.locator('#ce-mob-panel')).toHaveClass(/\bpanel-hidden\b/);
    await expect(page.locator('.mob-tabs')).toBeHidden();
    await expect(page.locator('#sw-combat-tabs')).toBeHidden();
    await expect(page.locator('#sw-combat-toggle')).toBeVisible();
  });
  await page.locator('#sw-combat-toggle').tap();
  await settle(page);
  await expect(page.locator('#ce-mob-panel [data-content=loot]')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.combatTabClicks)).toEqual([
    ['mob', 'loot'],
    ['mob', 'loot'],
    ['mob', 'loot'],
  ]);
});

test('chat draft and presentation preferences survive rotation with a single native send', async ({
  page,
}) => {
  const draft = 'A message composed before rotating';
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await page.locator('.chat-input').fill(draft);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu').getByRole('button', { name: 'Settings', exact: true }).tap();
  await page.locator('#sw-mini-enabled').uncheck();
  await page.locator('#sw-render-mode').selectOption('battery');
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await settle(page);
  await roundTrip(page, async () => {
    await expect(page.locator('#chat-panel')).toBeVisible();
    await expect(page.locator('.chat-input')).toHaveValue(draft);
    await expect(page.locator('#sw-nav [data-sw-view=chat]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await page.evaluate(() => localStorage.getItem('sw_mobile_chat'))).toBe('off');
    expect(await page.evaluate(() => localStorage.getItem('sw_mobile_render'))).toBe('battery');
  });
  await page.locator('.chat-input').press('Enter');
  expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([draft]);
});

test('portrait keyboard resize keeps the bottom dock and draft without selecting landscape', async ({
  page,
}) => {
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await page.locator('.chat-input').fill('A portrait keyboard draft');
  const before = await nativeSnapshot(page);
  await page.evaluate(() => window.fixtureKeyboard(260));
  await settle(page);
  await expectNavigation(page, false);
  await expectWithin(page.locator('.chat-input'), await viewportBounds(page));
  await expect(page.locator('.chat-input')).toHaveValue('A portrait keyboard draft');
  expect(await nativeSnapshot(page)).toEqual(before);
  await page.evaluate(() => window.fixtureKeyboard(innerHeight));
  await page.setViewportSize({ width: 360, height: 260 });
  await settle(page);
  await expect(page.locator('html')).not.toHaveClass(/\bsw-landscape\b/);
  await expect(page.locator('.chat-input')).toHaveValue('A portrait keyboard draft');
  expect(await nativeSnapshot(page)).toEqual(before);
});

test('wide portrait adjustResize follows physical screen orientation, not keyboard-shaped bounds', async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 915 });
  await settle(page);
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await page.locator('.chat-input').fill('A wide portrait keyboard draft');
  const before = await nativeSnapshot(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 740,
    height: 360,
    screenWidth: 740,
    screenHeight: 915,
    deviceScaleFactor: 1,
    mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await settle(page);
  expect(await page.evaluate(() => screen.orientation.type)).toBe('portrait-primary');
  await expectNavigation(page, false);
  await expectWithin(page.locator('.chat-input'), await viewportBounds(page));
  await expect(page.locator('.chat-input')).toHaveValue('A wide portrait keyboard draft');
  expect(await nativeSnapshot(page)).toEqual(before);
});
