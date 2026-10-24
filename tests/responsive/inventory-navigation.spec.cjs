'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function loadReview(page, setup) {
  await loadGame(page, {
    scripts: [
      'game.js',
      'combat.js',
      'dialogs.js',
      'items.js',
      'equipment.js',
      'combat-selection.js',
      'hiscores.js',
      'barter.js',
      'review-controls.js',
    ],
    beforeAdapter: (page) =>
      page.evaluate((setup) => {
        window.fixtureBankControls();
        window.fixtureReviewInventory();
        if (setup === 'equipment') {
          window.fixtureItemDetails();
          window.fixtureEquipmentPicker();
          const label = document.querySelector(
            '.equipment-panel .loadout-sel-slot.active .loadout-sel-slot-label',
          );
          label.textContent = 'A full precision ranged loadout name';
        }
        if (setup === 'pvp') window.fixtureReviewPvp();
      }, setup),
  });
}

async function originalUi(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} inventory navigation`, () => {
    test.use({ viewport });

    test('Bag occupancy follows native slots and scraps stay collapsed until requested', async ({
      page,
    }) => {
      await loadReview(page);
      await page.locator('#sw-nav [data-sw-view=inventory]').tap();
      await expect(page.locator('.sw-bag-summary')).toContainText('Bag');
      await expect(page.locator('.sw-bag-summary')).toContainText('2 / 28 slots');
      await page.evaluate(() =>
        document
          .querySelectorAll('#bag-panel > .inv-slot')
          .forEach((slot) => slot.classList.add('empty')),
      );
      await expect(page.locator('.sw-bag-summary')).toContainText('0 / 28 slots');
      await expect(page.locator('.sw-bag-guide')).toContainText('Your Bag is empty');
      await page.locator('#sw-nav [data-sw-view=bank]').tap();
      await expect(page.locator('.sw-bank-scrap')).not.toHaveAttribute('open');
      const summary = page.locator('.sw-bank-scrap > summary');
      await expectReachable(page, summary);
      await summary.tap();
      await expect(page.locator('.sw-bank-scrap p')).toContainText('half XP');
      await page.locator('.bank-scrap-slot').tap();
      expect(await page.evaluate(() => window.fixtureReview.scrap)).toBe(1);
      await originalUi(page);
      expect(
        await page.evaluate(() => {
          const { row, parent, next } = window.fixtureReviewScrap;
          const bag = document.getElementById('bag-panel');
          return (
            row.parentElement === parent &&
            row.nextSibling === next &&
            Array.from(bag.children).every(
              (node, index) => node === window.fixtureReviewBagNodes[index],
            )
          );
        }),
      ).toBe(true);
      await expect(page.locator('.sw-bank-scrap, .sw-bag-summary, .sw-bag-guide')).toHaveCount(0);
    });

    for (const kind of ['bank', 'potions', 'chat']) {
      test(`${kind} filters keep native handlers and have a sticky Close target`, async ({
        page,
      }) => {
        await loadReview(page);
        await page.evaluate((kind) => window.fixtureReviewFilter(kind), kind);
        await settle(page);
        const close = page.locator('.sw-filter-close');
        await expectReachable(page, close);
        await page.locator('.bank-filter-body > .bank-filter-row').first().tap();
        expect(await page.evaluate(() => window.fixtureReview.filters)).toEqual([kind]);
        const menu = page.locator(`.${kind === 'chat' ? 'chat-category' : kind + '-filter'}-menu`);
        await menu.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
        await expectReachable(page, close);
        await close.tap();
        await expect(close).toHaveCount(0);
        expect(await page.evaluate(() => window.fixtureReview.closes)).toEqual([kind]);
      });
    }

    test('new overflow stays before guidance and removed scraps stay removed', async ({ page }) => {
      await loadReview(page);
      await page.locator('#sw-nav [data-sw-view=inventory]').tap();
      await page.evaluate(() => {
        const bag = document.getElementById('bag-panel');
        const overflow = bag.querySelector('.inv-slot').cloneNode(true);
        overflow.classList.add('bag-slot-overlay');
        overflow.classList.remove('empty');
        bag.append(overflow);
      });
      await expect(page.locator('.sw-bag-summary')).toContainText('1 overflow');
      const overflow = await page.locator('.bag-slot-overlay').boundingBox();
      const guide = await page.locator('.sw-bag-guide').boundingBox();
      expect(guide.y).toBeGreaterThanOrEqual(overflow.y + overflow.height);
      await page.locator('.bank-scrap-row').evaluate((node) => node.remove());
      await originalUi(page);
      await expect(page.locator('.bank-scrap-row')).toHaveCount(0);
    });

    test('a native filter Close is reused and its handler runs once', async ({ page }) => {
      await loadReview(page);
      await page.evaluate(() => window.fixtureReviewFilter('bank', true));
      await settle(page);
      await expect(page.locator('.bank-filter-head button')).toHaveCount(2);
      await expect(page.locator('.m-menu-x')).toHaveText('Close');
      await page.locator('.m-menu-x').tap();
      expect(await page.evaluate(() => window.fixtureReview.closes)).toEqual(['bank']);
      await expect(page.locator('.sw-filter-close')).toHaveCount(0);
    });

    test('Credits from Appearance has a large keyboard-accessible native close', async ({
      page,
    }) => {
      await loadReview(page);
      await page.evaluate(() => window.fixtureReviewCredits());
      await settle(page);
      const close = page.getByRole('button', { name: 'Close credits' });
      await expectReachable(page, close);
      await close.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
      expect(await page.evaluate(() => window.fixtureReview.closes)).toEqual(['credits']);
    });

    test('Equipment shows the full selected loadout and keeps the overview near the selector', async ({
      page,
    }) => {
      await loadReview(page, 'equipment');
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-menu [data-sw-target=equipment]').tap();
      const title = page.locator('.sw-equipment-loadout-name');
      await expect(title).toHaveText('Selected loadout: A full precision ranged loadout name');
      const gap = await page
        .locator('.equipment-panel')
        .evaluate(
          (panel) =>
            panel.querySelector('.equip-panel-paperdoll .slot-head').getBoundingClientRect().top -
            panel.querySelector('.equip-panel-tabs').getBoundingClientRect().bottom,
        );
      expect(gap).toBeLessThan(30);
      await page.locator('.equipment-panel [data-loadout=crossbow]').tap();
      await expect(title).toHaveText('Selected loadout: crossbow');
      await originalUi(page);
      await expect(title).toHaveCount(0);
    });

    test('Hiscores discovers every category through one native-backed picker', async ({ page }) => {
      await loadReview(page);
      await page.evaluate(() => window.fixtureOpenModal('hiscores'));
      await settle(page);
      const picker = page.getByLabel('Ranking category');
      await expectReachable(page, picker);
      await expect(picker.locator('option')).toHaveCount(15);
      await picker.selectOption({ label: 'Fortify' });
      await expect(page.locator('.hs-lb-title')).toHaveText('Fortify');
      expect(await page.evaluate(() => window.fixtureState.hiscoreActions)).toEqual([
        ['category', 'Fortify'],
      ]);
      await originalUi(page);
      await expect(page.locator('.sw-hs-category')).toHaveCount(0);
    });

    test('PvP warnings open the chosen paired loadout in Bank without equipping', async ({
      page,
    }) => {
      await loadReview(page, 'pvp');
      await page.evaluate(() => window.fixtureSelection('pvp'));
      await settle(page);
      const manage = page.getByRole('button', { name: 'Manage Defender 2' });
      await manage.scrollIntoViewIfNeeded();
      await expectReachable(page, manage);
      await manage.tap();
      await expect(page.locator('#tab-bank')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureReview.loadouts)).toEqual(['pvp_4']);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('Barter locks are compact while native quantity and purchase handlers remain intact', async ({
      page,
    }) => {
      await loadReview(page);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-menu [data-sw-target=barter]').tap();
      const locked = page.locator('.barter-slot-locked');
      await expect(locked.locator('.barter-slot-controls')).toBeHidden();
      const box = await locked.boundingBox();
      expect(box.height).toBeLessThan(90);
      const first = page.locator('.barter-slot-row').first();
      await first.locator('.barter-qty-input').fill('3');
      await first.getByRole('button', { name: 'Buy', exact: true }).tap();
      expect(await page.evaluate(() => window.fixtureState.barterActions)).toEqual([
        [0, 'Buy', '3'],
      ]);
    });
  });
}
