'use strict';

const { expect, loadGame, settle } = require('./game.cjs');

const portrait = { width: 360, height: 740 };
const landscape = { width: 740, height: 360 };
const safeInsets = { top: 12, right: 28, bottom: 16, left: 20 };

async function loadResponsiveGame(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        window.fixtureWorldScene();
        window.fixtureCommunityChat();
      });
    },
  });
}

async function nativeSnapshot(page) {
  return page.evaluate(() => ({
    actions: Object.fromEntries(
      Object.entries(window.fixtureState).filter(
        ([key]) => !['listeners', 'storageCalls'].includes(key),
      ),
    ),
    listenerCount: window.fixtureState.listeners.length,
    preferences: Object.fromEntries(
      ['ui', 'chat', 'render', 'orientation'].map((name) => [
        name,
        localStorage.getItem(`sw_mobile_${name}`),
      ]),
    ),
  }));
}

async function viewportBounds(page, insets = {}) {
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: window.visualViewport?.height || innerHeight,
  }));
  return {
    left: insets.left || 0,
    top: insets.top || 0,
    right: viewport.width - (insets.right || 0),
    bottom: viewport.height - (insets.bottom || 0),
    ...viewport,
  };
}

async function expectWithin(locator, bounds) {
  await expect(locator).toBeVisible();
  const rect = await locator.boundingBox();
  expect(rect, 'Visible control has measured bounds').not.toBeNull();
  expect(rect.x, 'Control clears the left inset').toBeGreaterThanOrEqual(bounds.left - 1);
  expect(rect.y, 'Control clears the top inset').toBeGreaterThanOrEqual(bounds.top - 1);
  expect(rect.x + rect.width, 'Control clears the right inset').toBeLessThanOrEqual(
    bounds.right + 1,
  );
  expect(rect.y + rect.height, 'Control clears the bottom inset').toBeLessThanOrEqual(
    bounds.bottom + 1,
  );
  return rect;
}

async function expectReachable(page, locator, { insets, scroll = false } = {}) {
  if (scroll) await locator.scrollIntoViewIfNeeded();
  const rect = await expectWithin(locator, await viewportBounds(page, insets));
  expect(rect.width, 'Native action keeps a 44px touch target').toBeGreaterThanOrEqual(44);
  expect(rect.height, 'Native action keeps a 44px touch target').toBeGreaterThanOrEqual(44);
  expect(
    await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return hit === element || element.contains(hit);
    }),
    'Native action midpoint is unobscured',
  ).toBe(true);
}

async function expectNavigation(page, isLandscape, insets = {}) {
  await expect(page.locator('html')).toHaveClass(
    isLandscape ? /\bsw-landscape\b/ : /^(?!.*\bsw-landscape\b)/,
  );
  const viewport = await viewportBounds(page);
  const nav = await expectWithin(page.locator('#sw-nav'), viewport);
  await expect(page.locator('#sw-nav button')).toHaveCount(6);
  if (isLandscape) {
    expect(nav.width, 'Landscape navigation is a narrow rail').toBeLessThanOrEqual(
      88 + (insets.right || 0),
    );
    expect(nav.height, 'Rail uses the vertical axis').toBeGreaterThan(nav.width * 2);
    expect(nav.x, 'Rail is on the right').toBeGreaterThanOrEqual(
      viewport.width - 88 - (insets.right || 0),
    );
  } else {
    expect(nav.width, 'Portrait navigation spans the bottom').toBeGreaterThan(nav.height * 2);
    expect(nav.y, 'Dock stays at the bottom').toBeGreaterThanOrEqual(
      viewport.height - 96 - (insets.bottom || 0),
    );
  }
  for (const button of await page.locator('#sw-nav button').all()) {
    await expectReachable(page, button, { insets });
  }
}

async function roundTrip(page, assertState) {
  const before = await nativeSnapshot(page);
  for (const viewport of [portrait, landscape, portrait]) {
    await page.setViewportSize(viewport);
    await settle(page);
    await expectNavigation(page, viewport.width > viewport.height);
    await assertState();
    await expect(page.locator('#sw-shell')).toHaveCount(1);
    await expect(page.locator('#sw-mobile-style')).toHaveCount(1);
    expect(
      await nativeSnapshot(page),
      'Rotation does not issue native actions or change preferences',
    ).toEqual(before);
  }
}

module.exports = {
  landscape,
  safeInsets,
  loadResponsiveGame,
  nativeSnapshot,
  viewportBounds,
  expectWithin,
  expectReachable,
  expectNavigation,
  roundTrip,
};
