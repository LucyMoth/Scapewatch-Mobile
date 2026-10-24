'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  expectReachable,
  expectWithin,
  viewportBounds,
  safeInsets,
} = require('../support/responsive.cjs');

async function loadActions(page, beforeAdapter, scripts = []) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js', 'client-actions.js', ...scripts],
    beforeAdapter: async (page) => {
      await page.evaluate((insets) => {
        window.fixtureWorldScene();
        for (const [side, value] of Object.entries(insets))
          document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
      }, safeInsets);
      if (beforeAdapter) await beforeAdapter(page);
    },
  });
}

for (const viewport of [
  { width: 320, height: 460 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} client actions`, () => {
    test.use({ viewport });

    test('Sleep uses the header moon and the native Wake target is reachable', async ({ page }) => {
      await loadActions(page);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await expect(page.locator('#sw-menu [data-sw-target=sleep]')).toHaveCount(0);
      const sleep = page.locator('#sw-sleep-toggle');
      await sleep.scrollIntoViewIfNeeded();
      await expectReachable(page, sleep, { insets: safeInsets });
      expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(0);
      await sleep.tap();
      await settle(page);
      await expect(page.locator('body')).toHaveClass(/\bsleeping\b/);
      await expect(page.locator('#sw-shell')).toBeHidden();
      const wake = page.locator('.sleep-overlay .sleep-wake-btn');
      await expectReachable(page, wake, { insets: safeInsets });
      await screenshot(page, 'native-sleep-wake');
      await wake.tap();
      await expect(page.locator('.sleep-overlay')).toBeHidden();
      await expect(page.locator('body')).not.toHaveClass(/\bsleeping\b/);
      await expect(page.locator('#sw-nav')).toBeVisible();
      await expect(page.locator('#sw-menu')).toBeHidden();
      expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.wakeClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('native waking keeps the scene centered until its leaving transition finishes', async ({
      page,
    }) => {
      await loadActions(page);
      await page.evaluate(() => window.fixtureHoldWake());
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-sleep-toggle').tap();
      const overlay = page.locator('.sleep-overlay');
      const scene = overlay.locator('.sleep-scene');
      const wake = overlay.locator('.sleep-wake-btn');
      const before = await scene.boundingBox();
      expect(before.width, 'The character scene remains readable on small screens').toBeGreaterThan(
        140,
      );
      await expectWithin(scene, await viewportBounds(page, safeInsets));
      await wake.tap();
      await expect(overlay).toHaveClass(/\bwaking\b/);
      expect(await scene.boundingBox()).toEqual(before);
      await expect(wake).toHaveCSS('pointer-events', 'none');
      await screenshot(page, 'native-waking-handoff');
      await page.evaluate(() => window.fixtureFinishWake());
      await expect(overlay).toHaveClass(/\bleaving\b/);
      await expect(scene).toHaveCSS('opacity', '0');
      await expect(overlay).toBeHidden();
      expect(await page.evaluate(() => window.fixtureState.wakeClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('the native night receipt keeps Wake and Ledger actions above its scrolling summary', async ({
      page,
    }) => {
      await loadActions(page, undefined, [
        'ledger/content.js',
        'ledger/index.js',
        'ledger/night.js',
      ]);
      await page.evaluate(() => window.fixtureNativeNightReceipt());
      await settle(page);
      const night = page.locator('.ledger-night');
      await expect(page.locator('#sw-combat-toggle')).toBeHidden();
      const bounds = await viewportBounds(page, safeInsets);
      await expectWithin(night, bounds);
      const actions = night.locator('.ledger-night-actions');
      const before = await actions.boundingBox();
      const body = night.locator('.ledger-night-body');
      await body.evaluate((node) => (node.scrollTop = node.scrollHeight));
      expect(await actions.boundingBox()).toEqual(before);
      for (const action of await actions.locator(':scope > *').all())
        await expectReachable(page, action, { insets: safeInsets });
      expect(await body.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
        await body.evaluate((node) => node.clientWidth),
      );
      await screenshot(page, 'native-night-receipt');
      await actions.locator('.sleep-wake-btn').tap();
      await expect(night).toHaveClass(/ledger-night-leaving/);
      await expect(night).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureNativeLedger.nightWakes)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('Auto Loadout keeps its native close fixed while its options scroll', async ({ page }) => {
      await loadActions(page);
      await page.evaluate(() => window.fixtureCombatDefaults());
      await settle(page);
      const close = page.locator('.cd-popup-close');
      await expectReachable(page, close, { insets: safeInsets });
      const initial = await close.boundingBox();
      const body = page.locator('.cd-popup-body');
      expect(await body.evaluate((node) => node.scrollHeight)).toBeGreaterThan(
        await body.evaluate((node) => node.clientHeight),
      );
      const first = page.locator('.cd-popup .combat-defaults-btn').first();
      await first.tap();
      await expect(first).toHaveClass(/\bactive\b/);
      const apply = page.locator('.combat-defaults-apply-btn');
      await apply.scrollIntoViewIfNeeded();
      await expectReachable(page, apply, { insets: safeInsets });
      await expectReachable(page, close, { insets: safeInsets });
      expect(await close.boundingBox()).toEqual(initial);
      await screenshot(page, 'autoloadout-scroll-close');
      await close.tap();
      await expect(page.locator('.cd-popup-overlay')).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureState.defaultsClose)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.defaultsApply)).toBe(0);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}

test('Back dismisses Auto Loadout before its underlying Settings and preserves unapplied choices', async ({
  page,
}) => {
  await loadActions(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=display]').tap();
  await page.locator('#sw-menu [data-sw-target=settings]').tap();
  await page.evaluate(() => window.fixtureCombatDefaults());
  const option = page.locator('.cd-popup .combat-defaults-btn').first();
  await option.tap();
  await page.setViewportSize({ width: 740, height: 360 });
  await settle(page);
  await expect(option).toHaveClass(/\bactive\b/);
  expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
  await expect(page.locator('.cd-popup-overlay')).toHaveCount(0);
  await expect(page.locator('#tab-settings')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.defaultsClose)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.defaultsApply)).toBe(0);
  expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
  await expect(page.locator('#sw-menu')).toBeVisible();
});

test('Sleep is gated before login and uses replacement native controls', async ({ page }) => {
  await loadActions(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=display]').tap();
  await page.evaluate(() => window.fixtureLogin(true));
  await expect(page.locator('#sw-sleep-toggle')).toBeHidden();
  await page.locator('#sw-sleep-toggle').evaluate((node) => node.click());
  await expect(page.locator('#sw-toast')).toHaveText('Sign in to Scapewatch first.');
  expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(0);
  await page.evaluate(() => {
    window.fixtureLogin(false);
    window.fixtureWindowControls();
  });
  await settle(page);
  await page.locator('#sw-sleep-toggle').tap();
  expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(1);
  await page.locator('.sleep-wake-btn').tap();
  expect(await page.evaluate(() => window.fixtureState.wakeClicks)).toBe(1);
});

test('Sleep follows late native controls and their removal', async ({ page }) => {
  await loadActions(page, (page) =>
    page.evaluate(() => {
      document.querySelector('.window-controls').remove();
      const hud = document.createElement('div');
      hud.id = 'hud-layer';
      document.getElementById('ui-container').append(hud);
    }),
  );
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=display]').tap();
  const sleep = page.locator('#sw-sleep-toggle');
  await expect(sleep).toBeHidden();
  await page.evaluate(() => window.fixtureWindowControls());
  await expect(sleep).toBeVisible();
  await page.evaluate(() => document.querySelector('.window-control-btn-sleep').remove());
  await expect(sleep).toBeHidden();
  await page.evaluate(() => window.fixtureWindowControls());
  await expect(sleep).toBeVisible();
  await sleep.tap();
  expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(1);
  await page.locator('.sleep-wake-btn').tap();
});

test('the header moon waits for the character and follows the current native disabled state', async ({
  page,
}) => {
  await loadActions(page, (page) =>
    page.evaluate(() => (document.querySelector('.ingame-hud-name').textContent = '')),
  );
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  const sleep = page.locator('#sw-sleep-toggle');
  await expect(sleep).toBeHidden();
  await page.evaluate(() => {
    document.querySelector('.ingame-hud-name').textContent = 'Adventurer';
  });
  await expect(sleep).toBeVisible();
  await page.evaluate(() => (document.querySelector('.window-control-btn-sleep').disabled = true));
  await expect(sleep).toBeDisabled();
  await page.evaluate(() => {
    window.fixtureDisabledSleep = document.querySelector('.window-control-btn-sleep');
    window.fixtureWindowControls();
  });
  await expect(sleep).toBeEnabled();
  await page.evaluate(() => (window.fixtureDisabledSleep.disabled = false));
  await expect(sleep).toBeEnabled();
  await sleep.tap();
  expect(await page.evaluate(() => window.fixtureState.sleepClicks)).toBe(1);
  await page.locator('.sleep-wake-btn').tap();
});

test('Original UI restores native Auto Loadout sizing and retains its selections', async ({
  page,
}) => {
  await loadActions(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await page.evaluate(() => window.fixtureCombatDefaults());
  const close = page.locator('.cd-popup-close');
  expect((await close.boundingBox()).height).toBeLessThan(44);
  const option = page.locator('.cd-popup .combat-defaults-btn').first();
  await option.evaluate((element) => element.click());
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  await expect(option).toHaveClass(/\bactive\b/);
  await expectReachable(page, close, { insets: safeInsets });
  await close.tap();
  expect(await page.evaluate(() => window.fixtureState.defaultsClose)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.defaultsApply)).toBe(0);
});

for (const viewport of [
  { width: 320, height: 460 },
  { width: 412, height: 915 },
  { width: 740, height: 360 },
]) {
  test(`native Steam prompt wraps and keeps Later reachable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadActions(page);
    await page.evaluate(() => window.fixtureSteamPrompt());
    const card = page.locator('.steam-prompt-card');
    const bounds = await card.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(safeInsets.left);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - safeInsets.right);
    expect(bounds.y).toBeGreaterThanOrEqual(safeInsets.top);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - safeInsets.bottom);
    expect(await card.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
      await card.evaluate((element) => element.clientWidth),
    );
    await expect(page.locator('#sw-combat-toggle')).toBeHidden();
    const later = page.locator('.steam-prompt-btn-later');
    await later.scrollIntoViewIfNeeded();
    await expectReachable(page, later, { insets: safeInsets });
    const never = page.locator('.steam-prompt-btn-never');
    await expectReachable(page, never, { insets: safeInsets });
    await screenshot(page, 'native-steam-prompt');
    expect(await page.evaluate(() => window.fixtureState.steamLater)).toBe(0);
    expect(await page.evaluate(() => window.fixtureState.steamNever)).toBe(0);
    await later.tap();
    await expect(page.locator('.steam-prompt-overlay')).toBeHidden();
    await expect(page.locator('#sw-combat-toggle')).toBeVisible();
    expect(await page.evaluate(() => window.fixtureState.steamLater)).toBe(1);
    expect(await page.evaluate(() => window.fixtureState.steamNever)).toBe(0);
    expect(await page.evaluate(() => window.fixtureState.steamLinks)).toEqual([]);
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}
