'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  expectReachable,
  expectWithin,
  safeInsets,
  viewportBounds,
} = require('../support/responsive.cjs');

async function loadLedger(page) {
  await loadGame(page, {
    scripts: ['game.js', 'ledger/content.js', 'ledger/index.js'],
    beforeAdapter: (page) =>
      page.evaluate((insets) => {
        for (const [edge, value] of Object.entries(insets))
          document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
      }, safeInsets),
  });
}

async function expectContainedSummary(page, scope) {
  const skills = scope.locator('.ledger-skills, .ledger-sec-skills');
  const loot = scope.locator('.ledger-loot, .ledger-sec-loot');
  const last = skills.locator('.ledger-total-row td').last();
  await last.scrollIntoViewIfNeeded();
  await expectWithin(last, await viewportBounds(page));
  expect(
    await skills.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const body = element.querySelector('.ledger-sec-body');
      return (
        getComputedStyle(body).overflowY === 'visible' &&
        body.clientHeight >= body.scrollHeight - 1 &&
        Array.from(element.querySelectorAll('td')).every((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left >= box.left && rect.right <= box.right && rect.bottom <= box.bottom;
        })
      );
    }),
    'Every original skill value remains inside its section without a nested clipped viewport',
  ).toBe(true);
  expect(
    await loot.evaluate((element) => {
      const skills = element
        .closest('.ledger, .ledger-compact')
        .querySelector('.ledger-skills, .ledger-sec-skills');
      return element.getBoundingClientRect().top >= skills.getBoundingClientRect().bottom;
    }),
    'Loot follows the complete Total card instead of painting under sticky total cells',
  ).toBe(true);
  for (const cell of await skills.locator('.ledger-total-row td').all()) {
    expect(await cell.evaluate((element) => getComputedStyle(element).position)).toBe('static');
    expect(await cell.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true,
    );
  }
  await expect(skills.locator('.ledger-total-row .ledger-td-num')).toHaveText([
    '326',
    '—',
    '+662',
    '—',
    '—',
  ]);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} native Ledger`, () => {
    test.use({ viewport });

    test('manual Ledger uses a readable receipt flow and keeps original period, toggle and loot controls', async ({
      page,
    }) => {
      await loadLedger(page);
      await page.evaluate(() => window.fixtureNativeLedgerOpen({ long: true }));
      await settle(page);
      const ledger = page.locator('#tab-ledger .ledger');
      await expect(ledger.locator(':scope > .ledger-top')).toHaveCount(1);
      const close = page.locator('.modal-close');
      await expectReachable(page, close);
      expect(
        await page
          .locator('.modal-header')
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBeLessThanOrEqual(72);
      const top = ledger.locator('.ledger-top');
      for (const control of await top.locator('.ledger-tab, .ledger-toggle').all()) {
        await expectReachable(page, control, { scroll: true });
        await control.tap();
      }
      expect(await page.evaluate(() => window.fixtureNativeLedger.periods)).toEqual([
        'last',
        'day',
        'week',
        'life',
      ]);
      expect(await page.evaluate(() => window.fixtureNativeLedger.toggles)).toEqual([
        'login',
        'sleep',
      ]);
      const unchanged = ledger.locator('.ledger-skills .ledger-toggle');
      await expectReachable(page, unchanged, { scroll: true });
      await unchanged.tap();
      await settle(page);
      await expect(ledger.locator('.ledger-table tbody tr')).toHaveCount(30);
      await expect(ledger.locator('.ledger-table tbody tr td')).toHaveCount(210);
      await expectContainedSummary(page, ledger);
      const search = ledger.locator('.ledger-loot-bar .bank-search');
      await expectReachable(page, search, { scroll: true });
      await search.fill('potion');
      await search.blur();
      await ledger.locator('.ledger-loot-bar .bank-filter-btn').tap();
      await ledger.locator('.ledger-loot-bar .bank-filter-menu-btn').tap();
      expect(await page.evaluate(() => window.fixtureNativeLedger.searches)).toEqual(['potion']);
      expect(await page.evaluate(() => window.fixtureNativeLedger.filters)).toEqual([
        'all',
        'filters',
      ]);
      const lastLoot = ledger.locator('.ledger-slot').last();
      await expectReachable(page, lastLoot, { scroll: true });
      await lastLoot.tap();
      expect(await page.evaluate(() => window.fixtureNativeLedger.actions)).toEqual(['Spent:7']);
      await screenshot(page, 'ledger-loot');
      await ledger.locator('.ledger-top').scrollIntoViewIfNeeded();
      await screenshot(page, 'ledger-header');
      await expectReachable(page, close);
      await close.tap();
      await expect(page.locator('.modal-overlay')).toBeHidden();
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('return receipt has the same complete skill cards and its original Continue action', async ({
      page,
    }) => {
      await loadLedger(page);
      await page.evaluate(() => window.fixtureNativeReceipt());
      await settle(page);
      const card = page.locator('.ledger-card');
      await screenshot(page, 'receipt-header');
      await expectContainedSummary(page, card);
      const lastLoot = card.locator('.ledger-slot').last();
      await expectReachable(page, lastLoot, { scroll: true });
      const footerBounds = await expectWithin(
        card.locator('.ledger-card-foot'),
        await viewportBounds(page),
      );
      const bodyBounds = await card.locator('.ledger-compact').boundingBox();
      expect(
        footerBounds.y,
        'Receipt actions stay outside the scrolling body',
      ).toBeGreaterThanOrEqual(bodyBounds.y + bodyBounds.height - 1);
      await lastLoot.tap();
      expect(await page.evaluate(() => window.fixtureNativeLedger.actions)).toEqual(['Spent:0']);
      await screenshot(page, 'receipt-skills-loot');
      const cont = card.locator('.ledger-btn-primary');
      await expectReachable(page, cont, { scroll: true });
      await cont.tap();
      await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureNativeLedger.continued)).toBe(1);
    });
  });
}

test('Original UI and page restoration retain the original Ledger header node and handlers', async ({
  page,
}) => {
  await loadLedger(page);
  await page.evaluate(() => window.fixtureNativeLedgerOpen());
  await settle(page);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  expect(
    await page.evaluate(() => {
      const { top, parent } = window.fixtureNativeLedger;
      return top.parentNode === parent && parent.firstChild === top;
    }),
  ).toBe(true);
  await page.evaluate(() => document.querySelector('.ledger-tab[data-period=week]').click());
  expect(await page.evaluate(() => window.fixtureNativeLedger.periods)).toEqual(['week']);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await settle(page);
  await expect(page.locator('#tab-ledger .ledger > .ledger-top')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(
    await page.evaluate(
      () => window.fixtureNativeLedger.top.parentNode === window.fixtureNativeLedger.parent,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await settle(page);
  await expect(page.locator('#tab-ledger .ledger > .ledger-top')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => window.fixtureNativeLedger.top === document.querySelector('#tab-ledger .ledger-top'),
    ),
  ).toBe(true);
});

test('rebuilt native Ledger replaces its moved header without reviving the previous node', async ({
  page,
}) => {
  await loadLedger(page);
  await page.evaluate(() => window.fixtureNativeLedgerOpen());
  await settle(page);
  await page.evaluate(() => {
    window.fixturePreviousLedgerTop = window.fixtureNativeLedger.top;
    window.fixtureNativeLedgerOpen();
  });
  await settle(page);
  await expect(page.locator('.ledger-top')).toHaveCount(1);
  expect(await page.evaluate(() => window.fixturePreviousLedgerTop.isConnected)).toBe(false);
  expect(
    await page.evaluate(
      () =>
        document.querySelector('#tab-ledger .ledger > .ledger-top') ===
        window.fixtureNativeLedger.top,
    ),
  ).toBe(true);
  await page.locator('.ledger-tab[data-period=life]').tap();
  expect(await page.evaluate(() => window.fixtureNativeLedger.periods)).toEqual(['life']);
});
