'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  safeInsets,
  nativeSnapshot,
  viewportBounds,
  expectWithin,
  expectReachable,
  expectNavigation,
} = require('../support/responsive.cjs');

async function loadAuthentication(page) {
  await loadGame(page, {
    scripts: ['game.js', 'authentication.js'],
    beforeAdapter: async (page) => {
      await page.evaluate((insets) => {
        window.fixtureLogin(true);
        for (const [edge, value] of Object.entries(insets)) {
          document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
        }
      }, safeInsets);
    },
  });
}

async function expectLoginControl(page, locator) {
  await expectReachable(page, locator, { insets: safeInsets, scroll: true });
  await expectClearsNavigation(page, locator);
}

async function expectClearsNavigation(page, locator) {
  const control = await locator.boundingBox();
  const nav = await page.locator('#sw-nav').boundingBox();
  const isLandscape = await page
    .locator('html')
    .evaluate((root) => root.classList.contains('sw-landscape'));
  if (isLandscape) {
    expect(control.x + control.width, 'Sign-in controls clear the rail').toBeLessThanOrEqual(nav.x);
  } else {
    expect(control.y + control.height, 'Sign-in controls clear the dock').toBeLessThanOrEqual(
      nav.y,
    );
  }
}

async function expectOriginalNodes(page) {
  expect(
    await page.evaluate(() => {
      const original = window.fixtureAuthenticationNodes;
      return (
        document.querySelector('#login-btn-steam') === original.steam &&
        document.querySelector('#login-signup-input') === original.input &&
        document.querySelector('.login-screen > .screen-tip') === original.tip &&
        [...document.querySelectorAll('.login-world-btn')].every(
          (button, index) => button === original.worlds[index],
        ) &&
        [...document.querySelectorAll('.login-social-link')].every(
          (link, index) => link === original.social[index],
        )
      );
    }),
    'Mobile presentation retains the original sign-in controls and handlers',
  ).toBe(true);
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} public login`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await loadAuthentication(page);
    });

    test('original sign-in, five worlds and social links remain reachable beside navigation', async ({
      page,
    }) => {
      await expectNavigation(page, viewport.width > viewport.height, safeInsets);
      await expectWithin(page.locator('.login-screen'), await viewportBounds(page));
      await expectOriginalNodes(page);
      const before = await nativeSnapshot(page);
      const steam = page.locator('#login-btn-steam');
      await expectLoginControl(page, steam);
      expect((await steam.boundingBox()).height).toBeGreaterThanOrEqual(56);
      const choices = page.locator('#login-world-picker-mount .login-world-row .login-world-btn');
      await expect(choices).toHaveCount(5);
      for (const choice of await choices.all()) {
        await expect(choice).toHaveCSS('min-height', '52px');
        await expectLoginControl(page, choice);
        expect((await choice.boundingBox()).height).toBeGreaterThanOrEqual(52);
      }
      await expect(page.locator('.login-social')).toHaveCSS('opacity', '1');
      for (const link of await page.locator('.login-social-link').all()) {
        await expectLoginControl(page, link);
      }
      expect(await nativeSnapshot(page), 'Measuring and scrolling issue no native actions').toEqual(
        before,
      );
      await steam.tap();
      expect(await page.evaluate(() => window.fixtureState.loginClicks)).toBe(1);
      await choices.last().tap();
      await expect(choices.last()).toHaveClass(/\bselected\b/);
      expect(await page.evaluate(() => window.fixtureState.authWorldClicks)).toEqual(['New World']);
      await page.locator('.login-social-link').last().tap();
      expect(await page.evaluate(() => window.fixtureState.authSocialClicks)).toEqual(['Wiki']);
      await expectOriginalNodes(page);
      const after = await nativeSnapshot(page);
      expect(after.actions, 'Original handlers run once without other game actions').toEqual({
        ...before.actions,
        loginClicks: 1,
        authWorldClicks: ['New World'],
        authSocialClicks: ['Wiki'],
      });
      expect(after.listenerCount, 'Sign-in controls retain a single original binding').toBe(
        before.listenerCount,
      );
      expect(after.preferences).toEqual(before.preferences);
      await screenshot(page, 'public-login-native-controls');
    });

    test('dynamic tip stays in flow and the native login guard preserves signup input and hidden state', async ({
      page,
    }) => {
      const tipText =
        'Did you know? Your selected world is remembered. You can explore different regions, ' +
        'queue gathering tasks, and change your equipment after signing in. Choose the world ' +
        'closest to you for a responsive connection before beginning your adventure.';
      await page.evaluate((text) => window.fixtureAuthenticationTip(text), tipText);
      const tip = page.locator('.login-screen > .screen-tip');
      await expect(tip).toHaveText(tipText);
      await tip.scrollIntoViewIfNeeded();
      const tipRect = await expectWithin(tip, await viewportBounds(page, safeInsets));
      await expectClearsNavigation(page, tip);
      expect(await tip.evaluate((element) => getComputedStyle(element).position)).toBe('static');
      for (const control of await page
        .locator('#login-btn-steam, .login-world-btn, .login-social-link')
        .all()) {
        const rect = await control.boundingBox();
        expect(
          rect.y + rect.height,
          'Tip follows the native controls without covering text',
        ).toBeLessThanOrEqual(tipRect.y);
      }
      await screenshot(page, 'public-login-dynamic-tip');
      const before = await nativeSnapshot(page);
      await page.locator('#sw-nav [data-sw-view=tasks]').tap();
      await expect(page.locator('#sw-toast')).toHaveText('Sign in to Scapewatch first.');
      await expect(page.locator('#unified-queue-panel')).toBeHidden();
      expect(await nativeSnapshot(page), 'Sign-in guard issues no native game action').toEqual(
        before,
      );
      await page.evaluate(() => window.fixtureLogin(true, true));
      await settle(page);
      await expect(page.locator('#login-form')).toBeHidden();
      const input = page.locator('#login-signup-input');
      await input.fill('MobileAdventurer');
      await page.evaluate(() => window.fixtureKeyboard(260));
      await settle(page);
      await expectLoginControl(page, input);
      await expect(input).toHaveValue('MobileAdventurer');
      await expectOriginalNodes(page);
      await page.evaluate(() => {
        window.fixtureKeyboard(innerHeight);
        window.fixtureLogin(false);
      });
      await settle(page);
      await expect(page.locator('.login-screen')).toBeHidden();
      await expect(page.locator('.login-screen')).toHaveCSS('display', 'none');
      await page.locator('#sw-nav [data-sw-view=tasks]').tap();
      await settle(page);
      await expect(page.locator('#unified-queue-panel')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.panelClicks.tasks)).toBe(1);
      await expect(page.locator('.login-screen')).toBeHidden();
      await expectOriginalNodes(page);
    });
  });
}
