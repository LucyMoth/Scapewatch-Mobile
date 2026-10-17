'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectWithin, expectReachable, viewportBounds } = require('../support/responsive.cjs');

function overlaps(first, second) {
  return (
    Math.min(first.x + first.width, second.x + second.width) > Math.max(first.x, second.x) + 1 &&
    Math.min(first.y + first.height, second.y + second.height) > Math.max(first.y, second.y) + 1
  );
}

async function checkHeader(page) {
  const bounds = await viewportBounds(page);
  const title = await expectWithin(page.locator('.modal-header .header-left'), bounds);
  const indicator = await expectWithin(
    page.locator('.modal-header .collections-indicator'),
    bounds,
  );
  const close = page.locator('.modal-header .modal-close');
  await expectReachable(page, close);
  const closeBounds = await close.boundingBox();
  const buttons = page.locator('.unlocks-header-slot .processing-nav-btn');
  await expect(buttons).toHaveCount(5);
  for (const button of await buttons.all()) {
    await expectReachable(page, button);
    const rect = await button.boundingBox();
    expect(overlaps(rect, title), 'Icon navigation clears the page title').toBe(false);
    expect(overlaps(rect, indicator), 'Icon navigation clears the collection count').toBe(false);
    expect(overlaps(rect, closeBounds), 'Icon navigation clears Close').toBe(false);
  }
  expect(overlaps(title, indicator), 'Title and collection count use separate space').toBe(false);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} collection and diary pages`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await loadGame(page, { scripts: ['game.js', 'collections.js', 'diary.js'] });
    });

    test('Diary navigation clears the title and compact cards retain search and native actions', async ({
      page,
    }) => {
      await page.evaluate(() => window.fixtureUnlocksView('Diary'));
      await settle(page);
      await checkHeader(page);
      const title = page.locator('.diary-modal-title');
      await expect(title).toHaveCSS('font-size', '20px');
      await title.scrollIntoViewIfNeeded();
      await expectWithin(title, await viewportBounds(page));
      const search = page.locator('.diary-modal-search');
      await search.fill('Battlefrost');
      const cards = page.locator('.diary-modal-card:visible');
      await expect(cards).toHaveCount(1);
      await expect(cards.locator('.diary-bank-name')).toHaveText('Battlefrost');
      await expect(cards.locator('.diary-bank-name')).toHaveCSS('font-size', '16px');
      await expect(cards.locator('.diary-tier-reward')).toHaveCSS('font-size', '14px');
      const plus = cards.locator('.diary-bulk-btn.plus');
      await expectReachable(page, plus, { scroll: true });
      await plus.tap();
      expect(await page.evaluate(() => window.fixtureState.diaryStepperClicks)).toEqual([
        ['Battlefrost', '1'],
      ]);
      expect(await page.evaluate(() => window.fixtureState.diaryCardClicks)).toEqual([]);
      await screenshot(page, 'compact-diary-card');
      await page.locator('.modal-header .modal-close').tap();
      expect(await page.evaluate(() => window.fixtureState.closeClicks)).toBe(1);
    });

    test('Collections use compact headings and item targets while retaining native section and item clicks', async ({
      page,
    }) => {
      await page.evaluate(() => window.fixtureUnlocksView('Collections'));
      await settle(page);
      await checkHeader(page);
      const section = page.locator('.collections-section[data-coll-section=capes]');
      const header = section.locator('.collections-section-header');
      await expect(section.locator('.collections-section-title')).toHaveCSS('font-size', '18px');
      await expectReachable(page, header, { scroll: true });
      await header.tap();
      await expect(section.locator('.collections-section-content')).toBeHidden();
      await header.tap();
      await expect(section.locator('.collections-section-content')).toBeVisible();
      const slot = section.locator('.collections-slot .inv-slot').last();
      await expectReachable(page, slot, { scroll: true });
      expect((await slot.boundingBox()).width).toBe(44);
      const wrapper = slot.locator('..');
      expect(
        (await wrapper.boundingBox()).height,
        'Rate badges keep their own vertical space',
      ).toBeGreaterThan(44);
      await slot.tap();
      expect(await page.evaluate(() => window.fixtureState.collectionSectionClicks)).toEqual([
        'capes',
        'capes',
      ]);
      expect(await page.evaluate(() => window.fixtureState.collectionItemClicks)).toEqual([
        'capes:30',
      ]);
      await screenshot(page, 'compact-collection-slots');
      const diary = page.locator('.unlocks-header-slot [data-unlocks-view=Diary]');
      await diary.tap();
      expect(await page.evaluate(() => window.fixtureState.unlocksViewClicks)).toEqual(['Diary']);
      await expect(page.locator('.diary-modal-title')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
        await page.evaluate(() => window.fixtureOriginalGameplay),
      );
    });
  });
}
