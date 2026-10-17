'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable, safeInsets } = require('../support/responsive.cjs');
const { touch } = require('../support/map-input.cjs');

async function loadItems(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'items.js'],
    beforeAdapter: (page) =>
      page.evaluate((insets) => {
        window.fixtureBankControls();
        window.fixtureItemDetails();
        for (const [edge, value] of Object.entries(insets))
          document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
      }, safeInsets),
  });
}

async function scrollDetails(page, tip) {
  const box = await tip.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const point = { x: box.x + box.width / 2, y: box.y + box.height - 20 };
  await touch(cdp, 'touchStart', point);
  for (const delta of [12, 24, 48, 72, 100])
    await touch(cdp, 'touchMove', { ...point, y: point.y - delta });
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  await expect(tip).toBeVisible();
  await expect.poll(() => tip.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const last = tip.locator('.tt-line').last();
  await last.scrollIntoViewIfNeeded();
  const end = await last.boundingBox();
  expect(end.x + end.width).toBeLessThanOrEqual(box.x + box.width);
  expect(end.y + end.height).toBeLessThanOrEqual(box.y + box.height);
  expect(await tip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await expect(last).toContainText('Detail 13:');
}

async function expectQuantityFits(slot) {
  expect(
    await slot.evaluate((element) => {
      const quantity = element.querySelector('.inv-qty').getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return quantity.left >= box.left && quantity.right <= box.right;
    }),
    'The complete quantity badge stays inside its own item cell',
  ).toBe(true);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} item details and Bank`, () => {
    test.use({ viewport });

    test('Bank details scroll without disappearing and keep the native second tap action', async ({
      page,
    }) => {
      await loadItems(page);
      await page.locator('#sw-nav [data-sw-view=bank]').tap();
      const slot = page.locator('#tab-bank .bank-slot').first();
      await slot.scrollIntoViewIfNeeded();
      await expectQuantityFits(slot);
      await slot.tap();
      const tip = page.locator('.global-tooltip');
      await expect(tip).toBeVisible();
      expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
      await expectReachable(page, slot);
      const box = await tip.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(safeInsets.left);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - safeInsets.right);
      await screenshot(page, 'bank-detail-summary');
      await scrollDetails(page, tip);
      await expectReachable(page, slot);
      await slot.tap();
      expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([
        'Battlefrost precision longbow',
      ]);
      await page.locator('.modal-close').tap();
      await expect(tip).toBeHidden();
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('away loot descriptions stay above the receipt and Continue still works', async ({
      page,
    }) => {
      await loadItems(page);
      await page.evaluate(() => {
        window.fixtureWelcomeBack();
        window.fixturePrepareAwayLoot();
      });
      await settle(page);
      const slot = page.locator('.ledger-return-overlay .ledger-slot').first();
      await slot.scrollIntoViewIfNeeded();
      await expectQuantityFits(slot);
      await slot.tap();
      const tip = page.locator('.global-tooltip');
      await expect(tip).toBeVisible();
      expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
      await scrollDetails(page, tip);
      await screenshot(page, 'away-loot-detail');
      const cont = page.locator('.ledger-btn-primary');
      await cont.scrollIntoViewIfNeeded();
      await cont.tap();
      await expect(tip).toBeHidden();
      await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureState.ledgerContinue)).toBe(1);
    });

    test('item Close dismisses inspection and Equip invokes the original Bank action once', async ({
      page,
    }) => {
      await loadItems(page);
      await page.locator('#sw-nav [data-sw-view=bank]').tap();
      const slot = page.locator('#tab-bank .bank-slot').first();
      await slot.tap();
      const tip = page.locator('.global-tooltip');
      const close = tip.getByRole('button', { name: 'Close', exact: true });
      await expectReachable(page, close, { scroll: true });
      await close.tap();
      await expect(tip).toBeHidden();
      expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
      await slot.tap();
      const equip = tip.getByRole('button', { name: 'Equip', exact: true });
      await expectReachable(page, equip, { scroll: true });
      await equip.tap();
      await expect(tip).toBeHidden();
      expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([
        'Battlefrost precision longbow',
      ]);
      await expect(page.locator('.modal-overlay')).toBeVisible();
    });

    test('Bank keeps search, sideways categories and original arrangement controls', async ({
      page,
    }) => {
      await loadItems(page);
      await page.locator('#sw-nav [data-sw-view=bank]').tap();
      const toolbar = page.locator('#tab-bank .bank-toolbar');
      await expect(toolbar.locator('.sw-bank-categories .bank-filter-btn')).toHaveCount(6);
      await expect(toolbar.locator('.sw-bank-tools')).not.toHaveAttribute('open');
      const search = toolbar.locator('.bank-search');
      await expectReachable(page, search);
      await search.fill('crab');
      await search.blur();
      const lastCategory = toolbar.locator('[data-filter=scrolls]');
      await lastCategory.scrollIntoViewIfNeeded();
      await expectReachable(page, lastCategory);
      await lastCategory.tap();
      await expect(lastCategory).toHaveClass(/active/);
      const summary = toolbar.locator('.sw-bank-tools > summary');
      await expectReachable(page, summary, { scroll: true });
      await summary.tap();
      for (const control of await toolbar.locator('.sw-bank-tools-body > button').all()) {
        await expectReachable(page, control, { scroll: true });
        await control.tap();
      }
      expect(await page.evaluate(() => window.fixtureBank.filters)).toEqual(['scrolls']);
      expect(await page.evaluate(() => window.fixtureBank.search)).toEqual(['crab']);
      expect(await page.evaluate(() => window.fixtureBank.modes)).toEqual([
        'Sort',
        'Swap',
        'Insert',
        'Filters',
        'Remove placeholders',
      ]);
      const slot = page.locator('#tab-bank .bank-slot').last();
      await expectReachable(page, slot, { scroll: true });
      expect(
        await page.locator('#tab-bank .bank-grid').evaluate((element) => {
          const style = getComputedStyle(element);
          return style.overflowY === 'visible' && element.clientHeight >= element.scrollHeight;
        }),
        'The bank uses the page scroll instead of nesting a clipped item grid',
      ).toBe(true);
      const stats = page.locator('#tab-bank .equip-stats-panel');
      for (const label of await stats.locator('.stats-weapon-line, .stats-style-line').all()) {
        await label.scrollIntoViewIfNeeded();
        expect(
          await label.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
          'Complete equipment labels wrap inside the statistics panel',
        ).toBe(true);
      }
      for (const utility of await stats.locator(':scope > [class$="-wrap"]').all()) {
        await expectReachable(page, utility, { scroll: true });
        await utility.tap();
        await expect(page.locator('.global-tooltip')).toBeVisible();
        await utility.tap();
      }
      expect(await page.evaluate(() => window.fixtureBank.utilities)).toEqual([
        'potion-stats-toggle',
        'equip-compare-toggle',
        'spirit-stats-toggle',
        'gearcalc-launch',
      ]);
      await screenshot(page, 'bank-tools');
    });

    test('advanced Bank filters fit safely and keep the original bank close reachable', async ({
      page,
    }) => {
      await loadItems(page);
      await page.locator('#sw-nav [data-sw-view=bank]').tap();
      await page.evaluate(() => window.fixtureBankFilterMenu());
      await settle(page);
      const menu = page.locator('.bank-filter-menu');
      const box = await menu.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(safeInsets.left);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - safeInsets.right);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - safeInsets.bottom);
      expect(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
        true,
      );
      await menu.locator('.bank-filter-row').last().scrollIntoViewIfNeeded();
      const close = page.locator('.modal-close');
      await expectReachable(page, close);
      await close.tap();
      await expect(menu).toHaveCount(0);
      await expect(page.locator('.modal-overlay')).toBeHidden();
    });
  });
}

test('Original UI restores the exact bank toolbar nodes and their native handlers', async ({
  page,
}) => {
  await loadItems(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  expect(
    await page.evaluate(() => {
      const children = Array.from(document.querySelector('#tab-bank .bank-toolbar').children);
      return (
        children.length === window.fixtureOriginalBankNodes.length &&
        children.every((node, index) => node === window.fixtureOriginalBankNodes[index])
      );
    }),
  ).toBe(true);
  await expect(page.locator('.sw-bank-tools, .sw-bank-categories')).toHaveCount(0);
  await page.evaluate(() => {
    document.querySelector('#tab-bank [data-filter=equipment]').click();
    document.querySelector('#tab-bank .bank-mode-btn').click();
  });
  expect(await page.evaluate(() => window.fixtureBank.filters)).toEqual(['equipment']);
  expect(await page.evaluate(() => window.fixtureBank.modes)).toEqual(['Sort']);
});

for (const verb of ['drink', 'use', 'open', 'consume', 'finish']) {
  test(`Bank inspection offers the native ${verb} action without invoking it on first tap`, async ({
    page,
  }) => {
    await loadItems(page);
    await page.evaluate((verb) => {
      document.querySelector('#tab-bank .bank-slot .tooltip').innerHTML =
        `<div class="tt-name">Native consumable</div><div class="tt-line">Click to ${verb} • Right-click for more</div>`;
    }, verb);
    await page.locator('#sw-nav [data-sw-view=bank]').tap();
    await page.locator('#tab-bank .bank-slot').first().tap();
    expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
    await page.locator('.global-tooltip').getByRole('button', { name: verb, exact: false }).tap();
    expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([
      'Battlefrost precision longbow',
    ]);
    await expect(page.locator('.global-tooltip')).toBeHidden();
  });
}

test('disabled, placeholder and passive items expose Close without an action', async ({ page }) => {
  await loadItems(page);
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  const slot = page.locator('#tab-bank .bank-slot').first();
  const tip = page.locator('.global-tooltip');
  for (const mode of ['disabled', 'bank-placeholder', 'passive']) {
    await slot.evaluate((slot, mode) => {
      slot.classList.remove('disabled', 'bank-placeholder');
      if (mode === 'passive') {
        slot.dataset.itemId = 'oak_logs';
        slot.querySelector('.tooltip').innerHTML = '<div class="tt-name">Oak logs</div>';
      } else slot.classList.add(mode);
    }, mode);
    await slot.tap();
    await expect(tip.getByRole('button')).toHaveCount(1);
    await tip.getByRole('button', { name: 'Close', exact: true }).tap();
    await expect(tip).toBeHidden();
  }
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});

test('Bag inspection can find an owned item in Bank without using or equipping it', async ({
  page,
}) => {
  await loadItems(page);
  await page.evaluate(() => {
    const slot = document.querySelector('#tab-bank .bank-slot').cloneNode(true);
    slot.className = 'inv-slot';
    slot.dataset.itemId = 'precision_longbow';
    delete slot.dataset.bankIndex;
    document.querySelector('#bag-panel .inv-slot').replaceWith(slot);
  });
  await expect(page.locator('#tab-bank .bank-slot').first()).not.toHaveAttribute('data-item-id');
  await expect(page.locator('#tab-bank .bank-slot').first()).toHaveAttribute(
    'data-bank-index',
    '0',
  );
  await page.locator('#sw-nav [data-sw-view=inventory]').tap();
  await page.locator('#bag-panel [data-item-id=precision_longbow]').tap();
  const tip = page.locator('.global-tooltip');
  await tip.getByRole('button', { name: 'View in Bank', exact: true }).scrollIntoViewIfNeeded();
  await tip.getByRole('button', { name: 'View in Bank', exact: true }).tap();
  await expect(page.locator('#tab-bank')).toHaveClass(/active/);
  await expect(tip).toBeVisible();
  await expect(tip.getByRole('button', { name: 'Equip', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});

test('Bag inspection refuses ambiguous presented Bank matches', async ({ page }) => {
  await loadItems(page);
  await page.evaluate(() => {
    const bank = document.querySelector('#tab-bank .bank-slot');
    const duplicate = bank.cloneNode(true);
    duplicate.dataset.bankIndex = '1';
    bank.after(duplicate);
    const bag = bank.cloneNode(true);
    bag.className = 'inv-slot';
    bag.dataset.itemId = 'precision_longbow';
    delete bag.dataset.bankIndex;
    document.querySelector('#bag-panel .inv-slot').replaceWith(bag);
  });
  await page.locator('#sw-nav [data-sw-view=inventory]').tap();
  await page.locator('#bag-panel [data-item-id=precision_longbow]').tap();
  const tip = page.locator('.global-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip.getByRole('button')).toHaveCount(1);
  await expect(tip.getByRole('button', { name: 'View in Bank', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});

for (const change of ['removed', 'rebuilt', 'hidden', 'reused']) {
  test(`a ${change} native Bank item cannot act through its stale inspection`, async ({ page }) => {
    await loadItems(page);
    await page.locator('#sw-nav [data-sw-view=bank]').tap();
    const slot = page.locator('#tab-bank .bank-slot').first();
    await slot.tap();
    const tip = page.locator('.global-tooltip');
    const equip = tip.getByRole('button', { name: 'Equip', exact: true });
    await equip.scrollIntoViewIfNeeded();
    await slot.evaluate((slot, change) => {
      if (change === 'removed') slot.remove();
      if (change === 'rebuilt') {
        const replacement = slot.cloneNode(true);
        replacement.addEventListener('click', () => window.fixtureItems.actions.push('new item'));
        slot.replaceWith(replacement);
      }
      if (change === 'hidden') slot.closest('.bank-grid').style.display = 'none';
      if (change === 'reused') slot.querySelector('.tt-name').textContent = 'Different item';
    }, change);
    await equip.tap();
    await expect(tip).toBeHidden();
    expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
  });
}

test('a reused Bag slot cannot navigate using details for its previous item', async ({ page }) => {
  await loadItems(page);
  await page.evaluate(() => {
    const slot = document.querySelector('#tab-bank .bank-slot').cloneNode(true);
    slot.className = 'inv-slot';
    slot.dataset.itemId = 'precision_longbow';
    delete slot.dataset.bankIndex;
    document.querySelector('#bag-panel .inv-slot').replaceWith(slot);
  });
  await page.locator('#sw-nav [data-sw-view=inventory]').tap();
  const slot = page.locator('#bag-panel [data-item-id=precision_longbow]');
  await slot.tap();
  const tip = page.locator('.global-tooltip');
  const bank = tip.getByRole('button', { name: 'View in Bank', exact: true });
  await bank.scrollIntoViewIfNeeded();
  await slot.evaluate((slot) => (slot.dataset.itemId = 'different_item'));
  await bank.tap();
  await expect(tip).toBeHidden();
  await expect(page.locator('.modal-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});

test('rotation keeps an open item description within the new viewport and native slot reachable', async ({
  page,
}) => {
  await loadItems(page);
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  const slot = page.locator('#tab-bank .bank-slot').first();
  await slot.tap();
  const tip = page.locator('.global-tooltip');
  for (const viewport of [
    { width: 740, height: 360 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await settle(page);
    await expect(tip).toBeVisible();
    const box = await tip.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(safeInsets.top);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - safeInsets.bottom);
    await expectReachable(page, slot);
  }
  expect(await page.evaluate(() => window.fixtureItems.actions)).toEqual([]);
});
