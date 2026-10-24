'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function loadAppearance(page) {
  await loadGame(page, { scripts: ['game.js', 'dialogs.js'] });
  await page.evaluate(() => {
    window.fixtureCustomize();
    window.fixtureAppearancePlacements = ['.cc-pack-banner', '.cc-layers-summary'].map(
      (selector) => {
        const node = document.querySelector(selector);
        return { node, parent: node.parentNode, next: node.nextSibling };
      },
    );
  });
  await settle(page);
}

test('secondary appearance details start collapsed and preserve native pack actions', async ({
  page,
}) => {
  await loadAppearance(page);
  const packs = page
    .locator('.sw-appearance-details')
    .filter({ has: page.locator('.cc-pack-banner') });
  const layers = page
    .locator('.sw-appearance-details')
    .filter({ has: page.locator('.cc-layers-summary') });
  await expect(packs).not.toHaveAttribute('open');
  await expect(layers).not.toHaveAttribute('open');
  await expect(page.locator('.cc-pack-card').first()).toBeHidden();
  const preview = await page.locator('.cc-canvas-wrap').boundingBox();
  const summary = packs.locator('summary');
  await expectReachable(page, summary);
  await summary.tap();
  await expectReachable(page, packs.locator('.cc-pack-cue').first(), { scroll: true });
  await packs.locator('.cc-pack-cue').first().tap();
  expect(await page.evaluate(() => window.fixtureState.creatorPackClicks)).toEqual(['Base Game']);
  await layers.locator('summary').scrollIntoViewIfNeeded();
  await layers.locator('summary').tap();
  await expect(page.locator('.cc-ls-row').last()).toBeVisible();
  expect(await page.locator('.cc-canvas-wrap').boundingBox()).toEqual(preview);
  expect(await page.evaluate(() => window.fixtureState.creatorActions)).toEqual([]);
});

test('Original UI and cached pages restore exact native appearance placements', async ({
  page,
}) => {
  await loadAppearance(page);
  const original = () =>
    page.evaluate(() =>
      window.fixtureAppearancePlacements.every(
        ({ node, parent, next }) => node.parentNode === parent && node.nextSibling === next,
      ),
    );
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await original()).toBe(true);
  await expect(page.locator('.sw-appearance-details')).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await settle(page);
  await expect(page.locator('.sw-appearance-details')).toHaveCount(2);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  expect(await original()).toBe(true);
  await expect(page.locator('.sw-appearance-details')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await settle(page);
  await expect(page.locator('.sw-appearance-details')).toHaveCount(2);
});

test('rebuilt appearance selectors receive one disclosure per native section', async ({ page }) => {
  await loadAppearance(page);
  await page.evaluate(() => window.fixtureCustomize());
  await settle(page);
  await expect(page.locator('.sw-appearance-details')).toHaveCount(2);
  await expect(page.locator('.sw-appearance-details .sw-appearance-details')).toHaveCount(0);
  await expect(page.locator('.cc-slot-row select')).toHaveCount(14);
});
