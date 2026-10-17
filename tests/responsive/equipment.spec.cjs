'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function loadEquipment(page, setup = {}) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'items.js', 'equipment.js'],
    beforeAdapter: (page) =>
      page.evaluate((setup) => {
        window.fixtureItemDetails();
        window.fixtureEquipmentPicker();
        if (setup.bankLoadout) {
          window.fixtureEquipmentBankLoadout(setup.bankLoadout, setup.bankFamily);
        }
        if (setup.previewFamily) {
          document
            .querySelector(
              `.equipment-panel .loadout-sel-family[data-family=${setup.previewFamily}]`,
            )
            .click();
        }
      }, setup),
  });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu [data-sw-target=equipment]').tap();
  await expect(page.locator('#sw-secondary-title')).toHaveText('Equipment');
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} equipment selection`, () => {
    test.use({ viewport });

    test('first tap inspects and second tap equips then returns to the gear overview', async ({
      page,
    }) => {
      await loadEquipment(page);
      const slot = page.locator('.equipment-panel .slot-head');
      await slot.scrollIntoViewIfNeeded();
      await expectReachable(page, slot);
      await slot.tap();
      await expect(page.locator('.sw-equipment-picker-title')).toHaveText('Choose Head');
      await expect(page.locator('#tab-bank .equip-side')).toBeHidden();
      await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(14);
      const option = page.locator('#tab-bank [data-item-id=mystic_helm]');
      await expectReachable(page, option);
      await option.tap();
      await expect(page.locator('.global-tooltip')).toContainText('Native equipment effects');
      await expect(page.locator('.global-tooltip')).toBeVisible();
      await expect(page.locator('.sw-equipment-picker-title')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
      await screenshot(page, 'equipment-options');
      await option.tap();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
        ['equip', 'bow', 'head', 'mystic_helm'],
      ]);
      await expect(page.locator('.modal-overlay')).toBeHidden();
      await expect(page.locator('.sw-equipment-picker-title')).toHaveCount(0);
      await expect(page.locator('.global-tooltip')).toBeHidden();
      await expect(page.locator('.equipment-panel')).toBeVisible();
      await expect(page.locator('.equipment-panel .slot-head .tt-name')).toHaveText(
        'Mystic enchanted helm',
      );
      await slot.tap();
      await expect(page.locator('.sw-equipment-picker-title')).toHaveText('Choose Head');
      const next = page.locator('#tab-bank [data-item-id=iron_helm]');
      await next.tap();
      await expect(page.locator('.sw-equipment-picker-title')).toBeVisible();
      await next.tap();
      await expect(page.locator('.modal-overlay')).toBeHidden();
      await expect(page.locator('.equipment-panel .slot-head .tt-name')).toHaveText('Iron helm');
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
        ['equip', 'bow', 'head', 'mystic_helm'],
        ['equip', 'bow', 'head', 'iron_helm'],
      ]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('empty slots show an honest empty state and newly banked compatible items become selectable', async ({
      page,
    }) => {
      await loadEquipment(page);
      const slot = page.locator('.equipment-panel .slot-cape');
      await slot.scrollIntoViewIfNeeded();
      await slot.tap();
      await expect(page.locator('.sw-equipment-picker-empty')).toHaveText(
        'No cape equipment in your Bank.',
      );
      await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(0);
      await page.evaluate(() => window.fixtureEquipmentAdd());
      const option = page.locator('#tab-bank [data-item-id=new_cape]');
      await expect(option.locator('.sw-equipment-option-name')).toHaveText('New acquired cape');
      await expect(page.locator('.sw-equipment-picker-empty')).toBeHidden();
      await expectReachable(page, option);
      await option.tap();
      await option.tap();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
        ['equip', 'bow', 'cape', 'new_cape'],
      ]);
      await expect(page.locator('.modal-overlay')).toBeHidden();
      await expect(page.locator('.equipment-panel')).toBeVisible();
    });

    test('explicit Close leaves gear unchanged and Equip returns to the overview after one native action', async ({
      page,
    }) => {
      await loadEquipment(page);
      await page.locator('.equipment-panel .slot-head').tap();
      const option = page.locator('#tab-bank [data-item-id=mystic_helm]');
      await option.tap();
      const tip = page.locator('.global-tooltip');
      const close = tip.getByRole('button', { name: 'Close', exact: true });
      await expectReachable(page, close, { scroll: true });
      await close.tap();
      await expect(tip).toBeHidden();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
      await expect(page.locator('.sw-equipment-picker-title')).toBeVisible();
      await option.tap();
      const equip = tip.getByRole('button', { name: 'Equip', exact: true });
      await expectReachable(page, equip, { scroll: true });
      await equip.tap();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
        ['equip', 'bow', 'head', 'mystic_helm'],
      ]);
      await expect(tip).toBeHidden();
      await expect(page.locator('.modal-overlay')).toBeHidden();
      await expect(page.locator('.equipment-panel')).toBeVisible();
      await expect(page.locator('.equipment-panel .slot-head .tt-name')).toHaveText(
        'Mystic enchanted helm',
      );
    });

    test('loadout and stats controls remain reachable and the native weapon filter keeps its family', async ({
      page,
    }) => {
      await loadEquipment(page);
      const panel = page.locator('.equipment-panel');
      for (const button of await panel.locator('.loadout-sel-family').all()) {
        await expectReachable(page, button);
      }
      const loadout = panel.locator('[data-loadout=crossbow]');
      await expectReachable(page, loadout);
      await loadout.tap();
      const stats = panel.locator('.equip-panel-view-toggle');
      await expectReachable(page, stats);
      await stats.tap();
      await expect(panel.locator('.equip-panel-paperdoll')).toBeHidden();
      await stats.tap();
      const slot = panel.locator('.slot-mainhand');
      await slot.scrollIntoViewIfNeeded();
      await slot.tap();
      await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(1);
      await expect(page.locator('#tab-bank [data-item-id=dagger]')).toBeHidden();
      const option = page.locator('#tab-bank [data-item-id=longbow]');
      await option.tap();
      await option.tap();
      expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
        ['loadout', 'crossbow'],
        ['stats', true],
        ['stats', false],
        ['equip', 'crossbow', 'mainhand', 'longbow'],
      ]);
    });
  });
}

test('equipping closes the picker and restores Bank category, search, slot and advanced filters without replacing native options', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.evaluate(() => {
    const bank = document.getElementById('tab-bank');
    bank.querySelector('[data-filter=raw]').click();
    bank.querySelector('.paperdoll .slot-hands').click();
    bank.querySelector('.bank-filter-btn-check').click();
    const search = bank.querySelector('.bank-search');
    search.value = 'Oak';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('.equipment-panel .slot-head').tap();
  await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(14);
  const option = page.locator('#tab-bank [data-item-id=mystic_helm]');
  await option.tap();
  await option.tap();
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await settle(page);
  expect(
    await page.evaluate(() => ({
      filter: window.fixtureEquipment.filter,
      search: window.fixtureEquipment.search,
      slot: window.fixtureEquipment.slot,
      advanced: window.fixtureEquipment.advanced,
      originalNodes: window.fixtureEquipmentNativeNodes.every(
        (node, index) => document.querySelector('.bank-grid').children[index] === node,
      ),
      labels: document.querySelectorAll('.sw-equipment-option-name').length,
    })),
  ).toEqual({
    filter: 'raw',
    search: 'Oak',
    slot: 'hands',
    advanced: true,
    originalNodes: true,
    labels: 0,
  });
});

test('Back after native picker Close immediately returns to Menu without consuming an invisible selection', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.locator('.equipment-panel .slot-head').tap();
  expect(
    await page.evaluate(() => {
      document.querySelector('.modal-overlay .modal-close').click();
      return window.__swMobileBack();
    }),
  ).toBe(true);
  await expect(page.locator('#sw-menu')).toBeVisible();
  await expect(page.locator('.sw-equipment-picker-title')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
});

test('rotation preserves the active native picker, its search and equipment handlers', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.locator('.equipment-panel .slot-head').tap();
  await page.locator('#tab-bank .bank-search').fill('Mystic');
  for (const viewport of [
    { width: 740, height: 360 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await settle(page);
    await expect(page.locator('.sw-equipment-picker-title')).toHaveText('Choose Head');
    await expect(page.locator('#tab-bank .bank-search')).toHaveValue('Mystic');
    await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(1);
    await expectReachable(page, page.locator('#tab-bank [data-item-id=mystic_helm]'));
    await expectReachable(page, page.locator('.modal-close'));
  }
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
});

test('Original UI and page suspension remove picker presentation and restore native slot attributes', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.locator('.equipment-panel .slot-head').tap();
  await page.locator('#tab-bank [data-item-id=mystic_helm]').tap();
  await expect(page.locator('.global-tooltip')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('.global-tooltip')).toBeHidden();
  await expect(page.locator('.sw-equipment-picker-title')).toHaveCount(0);
  await expect(page.locator('.equipment-panel .slot-head')).not.toHaveAttribute('role');
  await expect(page.locator('.equip-panel-paperdoll')).not.toHaveAttribute('data-no-tap-first');
  await page.evaluate(() => {
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);
  });
  await expect(page.locator('.equipment-panel .slot-head')).toHaveAttribute('role', 'button');
  await page.locator('.equipment-panel .slot-head').tap();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('.sw-equipment-picker-title')).toHaveCount(0);
  await expect(page.locator('.equipment-panel .slot-head')).not.toHaveAttribute('role');
  await expect(page.locator('.equip-panel-paperdoll')).not.toHaveAttribute('data-no-tap-first');
  await expect(page.locator('.modal-close')).not.toHaveAttribute('aria-label');
});

test('logout closes the native picker and clears its options and direct slot controls', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.locator('.equipment-panel .slot-head').tap();
  await page.evaluate(() => document.body.classList.add('login-active'));
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('.sw-equipment-picker-title, .sw-equipment-option-name')).toHaveCount(
    0,
  );
  await expect(page.locator('.equipment-panel .slot-head')).not.toHaveAttribute('role');
  await expect(page.locator('.equip-panel-paperdoll')).not.toHaveAttribute('data-no-tap-first');
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
});

test('leaving the picker for another native screen restores Bank filters without closing the next screen', async ({
  page,
}) => {
  await loadEquipment(page);
  await page.locator('.equipment-panel .slot-head').tap();
  await page.evaluate(() => {
    document.querySelector('.floating-tab-strip [data-tab=raid]').click();
  });
  await settle(page);
  await expect(page.locator('#tab-raid')).toBeVisible();
  await expect(page.locator('.modal-overlay')).toBeVisible();
  await expect(page.locator('.sw-equipment-picker-title, .sw-equipment-option-name')).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => window.fixtureEquipment.filter)).toBe('all');
  expect(await page.evaluate(() => window.fixtureEquipment.slot)).toBeNull();
});

test('first opening aligns a stale Bank loadout with the equipped loadout before filtering or equipping', async ({
  page,
}) => {
  await loadEquipment(page, { bankLoadout: 'stab', bankFamily: 'melee' });
  await expect(page.locator('.equipment-panel .loadout-sel-slot.active')).toHaveAttribute(
    'data-loadout',
    'bow',
  );
  expect(await page.evaluate(() => window.fixtureEquipment.bankLoadout)).toBe('stab');
  const slot = page.locator('.equipment-panel .slot-mainhand');
  await slot.scrollIntoViewIfNeeded();
  await slot.tap();
  await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(1);
  await expect(page.locator('#tab-bank [data-item-id=dagger]')).toBeHidden();
  const option = page.locator('#tab-bank [data-item-id=longbow]');
  await option.tap();
  await option.tap();
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
    ['equip', 'bow', 'mainhand', 'longbow'],
  ]);
  expect(await page.evaluate(() => window.fixtureEquipment.bankSelections)).toEqual(['bow']);
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('.equipment-panel .loadout-sel-slot.active')).toHaveAttribute(
    'data-loadout',
    'bow',
  );
  expect(await page.evaluate(() => window.fixtureEquipment.bankLoadout)).toBe('bow');
});

test('browsing another Equipment family keeps the actual selected loadout for Bank choices', async ({
  page,
}) => {
  await loadEquipment(page, { bankLoadout: 'stab', bankFamily: 'melee' });
  await page.locator('.equipment-panel .loadout-sel-family[data-family=melee]').tap();
  await expect(page.locator('.equipment-panel .loadout-sel-slot.active')).toHaveCount(0);
  const slot = page.locator('.equipment-panel .slot-mainhand');
  await slot.scrollIntoViewIfNeeded();
  await slot.tap();
  await expect(page.locator('#tab-bank .bank-slot:visible')).toHaveCount(1);
  const option = page.locator('#tab-bank [data-item-id=longbow]');
  await option.tap();
  await option.tap();
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([
    ['family', 'melee'],
    ['equip', 'bow', 'mainhand', 'longbow'],
  ]);
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('.equipment-panel .loadout-sel-family.active')).toHaveAttribute(
    'data-family',
    'melee',
  );
  expect(await page.evaluate(() => window.fixtureEquipment.loadout)).toBe('bow');
});

test('late injection without an identifiable Equipment selection asks for a loadout instead of using stale Bank state', async ({
  page,
}) => {
  await loadEquipment(page, {
    bankLoadout: 'stab',
    bankFamily: 'melee',
    previewFamily: 'melee',
  });
  await page.locator('.equipment-panel .slot-head').tap();
  await expect(page.locator('#sw-toast')).toHaveText('Select a loadout first.');
  await expect(page.locator('.modal-overlay')).toBeHidden();
  expect(await page.evaluate(() => window.fixtureEquipment.bankSelections)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureEquipment.bankLoadout)).toBe('stab');
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBeUndefined();
});
