'use strict';

const { test, expect, loadGame } = require('../support/game.cjs');
const { returnToWorld } = require('../support/navigation.cjs');
const { nativeSnapshot } = require('../support/responsive.cjs');
const { loadNativeOrientation } = require('../support/orientation.cjs');

async function openMenu(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
}

test('supported native orientation is shown with the accepted native preference', async ({
  page,
}) => {
  await loadNativeOrientation(page, 'landscape');
  const before = await nativeSnapshot(page);
  await openMenu(page);
  await expect(page.locator('#sw-orientation-toggle')).toBeVisible();
  await expect(page.locator('#sw-orientation-toggle')).toHaveText('Portrait');
  await expect(page.locator('#sw-orientation-toggle')).toHaveAttribute(
    'aria-label',
    'Switch to portrait',
  );
  await expect(page.locator('#sw-orientation-toggle')).toBeEnabled();
  await expect(page.locator('[data-sw-menu-panel=character]')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureOrientation.calls)).toEqual([
    ['ScapewatchOrientation', 'getOrientation', null],
  ]);
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_orientation'))).toBe(
    'landscape',
  );
  expect(await nativeSnapshot(page), 'Reading native orientation issues no game actions').toEqual(
    before,
  );
});

test('accepted orientation change persists after the native request and invokes no game action', async ({
  page,
}) => {
  await loadNativeOrientation(page);
  await openMenu(page);
  const before = await nativeSnapshot(page);
  const button = page.locator('#sw-orientation-toggle');
  await button.tap();
  await expect(button).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('sw_mobile_orientation'))).toBe('portrait');
  expect(await nativeSnapshot(page), 'A pending request has no accepted side effects').toEqual(
    before,
  );
  await page.evaluate(() => {
    const native = window.fixtureOrientation;
    native.accepted = native.pending.requested;
    native.pending.resolve({ orientation: native.accepted, supported: true });
  });
  await expect(button).toBeEnabled();
  await expect(button).toHaveText('Portrait');
  expect(await nativeSnapshot(page)).toEqual({
    ...before,
    preferences: { ...before.preferences, orientation: 'landscape' },
  });
  await returnToWorld(page);
  await openMenu(page);
  await expect(button).toHaveText('Portrait');
  expect(await page.evaluate(() => window.fixtureOrientation.calls)).toEqual([
    ['ScapewatchOrientation', 'getOrientation', null],
    ['ScapewatchOrientation', 'setOrientation', { orientation: 'landscape' }],
  ]);
});

test('rejected orientation request restores the prior choice, preference and enabled control', async ({
  page,
}) => {
  await loadNativeOrientation(page, 'landscape');
  await openMenu(page);
  const before = await nativeSnapshot(page);
  const button = page.locator('#sw-orientation-toggle');
  await button.tap();
  await expect(button).toBeDisabled();
  expect(await nativeSnapshot(page), 'Pending orientation has not been saved').toEqual(before);
  await page.evaluate(() =>
    window.fixtureOrientation.pending.reject(new Error('Native orientation request rejected')),
  );
  await expect(button).toBeEnabled();
  await expect(button).toHaveText('Portrait');
  await expect(page.locator('#sw-toast')).toHaveText('Could not change screen orientation.');
  await expect(page.locator('#sw-toast')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureOrientation.accepted)).toBe('landscape');
  expect(
    await nativeSnapshot(page),
    'A rejection retains preferences and native game state',
  ).toEqual(before);
  expect(await page.evaluate(() => window.fixtureOrientation.calls)).toEqual([
    ['ScapewatchOrientation', 'getOrientation', null],
    ['ScapewatchOrientation', 'setOrientation', { orientation: 'portrait' }],
  ]);
});

test('ordinary browser keeps orientation hidden without creating a native bridge', async ({
  page,
}) => {
  await loadGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate(() => localStorage.setItem('sw_mobile_orientation', 'landscape'));
    },
  });
  const before = await nativeSnapshot(page);
  await openMenu(page);
  await expect(page.locator('#sw-orientation-toggle')).toBeHidden();
  expect(await page.evaluate(() => 'Capacitor' in window || 'androidBridge' in window)).toBe(false);
  expect(await nativeSnapshot(page), 'Browser display settings keep existing preferences').toEqual(
    before,
  );
});
