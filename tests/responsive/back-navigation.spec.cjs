'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { openAbout } = require('../support/about.cjs');

async function back(page) {
  return page.evaluate(() => window.__swMobileBack());
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} app back navigation`, () => {
    test.use({ viewport });

    test('Menu and secondary screens return to their parent before allowing system Back', async ({
      page,
    }) => {
      await loadGame(page);
      expect(await back(page)).toBe(false);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-menu [data-sw-target=skills]').tap();
      await expect(page.locator('#sw-secondary-title')).toHaveText('Skills');
      expect(await back(page)).toBe(true);
      await expect(page.locator('#sw-menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#sw-menu')).toBeHidden();
      await expect(page.locator('#sw-view-title')).toHaveText('World');
      expect(await back(page)).toBe(false);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('closing a native modal returns to Menu and closes it only once', async ({ page }) => {
      await loadGame(page);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('[data-sw-menu-section=display]').tap();
      await page.locator('#sw-menu [data-sw-target=settings]').tap();
      const modal = page.locator('.modal-overlay');
      await expect(modal).toBeVisible();
      await modal.locator('.modal-close').evaluate((button) => {
        window.backCloseCount = 0;
        button.addEventListener('click', () => window.backCloseCount++);
      });
      expect(await back(page)).toBe(true);
      await expect(modal).toBeHidden();
      await expect(page.locator('#sw-menu')).toBeVisible();
      expect(await page.evaluate(() => window.backCloseCount)).toBe(1);
      expect(await back(page)).toBe(true);
      expect(await back(page)).toBe(false);
    });

    test('Back keeps chat drafts and closes combat details without ending combat', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'combat.js'] });
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      await page.locator('.chat-input').fill('Keep this draft');
      expect(await back(page)).toBe(true);
      await expect(page.locator('#sw-view-title')).toHaveText('World');
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      await expect(page.locator('.chat-input')).toHaveValue('Keep this draft');
      expect(await back(page)).toBe(true);
      await page.evaluate(() => window.fixtureCombat(true));
      await page.locator('#sw-combat-toggle').tap();
      await expect(page.locator('#sw-combat-tabs')).toBeVisible();
      expect(await back(page)).toBe(true);
      await expect(page.locator('#sw-combat-tabs')).toBeHidden();
      await expect(page.locator('#sw-combat-toggle')).toBeVisible();
      expect(await back(page)).toBe(false);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('full map closes through its native controls before falling through to system Back', async ({
      page,
    }) => {
      await loadMapGame(page);
      await page.locator('#sw-nav [data-sw-view=map]').tap();
      await expect(page.locator('html')).toHaveClass(/\bsw-map\b/);
      expect(await back(page)).toBe(true);
      await expect(page.locator('html')).not.toHaveClass(/\bsw-map\b/);
      await expect(page.locator('#sw-view-title')).toHaveText('World');
      expect(await back(page)).toBe(false);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('credits close before Menu, and Original UI leaves Back to the game', async ({ page }) => {
      await loadGame(page, { scripts: ['game.js', 'credits.js'] });
      await openAbout(page);
      await page.locator('#sw-about-credits').tap();
      await expect(page.locator('.cc-credits-overlay')).toBeVisible();
      expect(await back(page)).toBe(true);
      await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
      await expect(page.locator('#sw-menu')).toBeVisible();
      await page.locator('#sw-layout-toggle').tap();
      expect(await back(page)).toBe(false);
      await page.locator('#sw-layout-toggle').tap();
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      expect(await back(page)).toBe(false);
    });

    test('player status starts collapsed but a deliberate expansion survives rotation', async ({
      page,
    }) => {
      await loadGame(page, {
        scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
        beforeAdapter: (page) => page.evaluate(() => window.fixtureWorldScene({ combat: false })),
      });
      const info = page.locator('.ingame-hud-info');
      await expect(page.locator('.ingame-hud-online')).toBeHidden();
      await info.tap();
      await expect(page.locator('.ingame-hud-online')).toBeVisible();
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await settle(page);
      await expect(page.locator('.ingame-hud-online')).toBeVisible();
      expect(await back(page)).toBe(true);
      await expect(page.locator('.ingame-hud-online')).toBeHidden();
      expect(await back(page)).toBe(false);
      await page.evaluate(() => window.fixtureHudDetailed(true));
      await expect(page.locator('.ingame-hud-online')).toBeHidden();
    });
  });
}

test('Back dismisses an item before closing the equipment picker, without equipping', async ({
  page,
}) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'items.js', 'equipment.js'],
    beforeAdapter: (page) =>
      page.evaluate(() => {
        window.fixtureItemDetails();
        window.fixtureEquipmentPicker();
      }),
  });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu [data-sw-target=equipment]').tap();
  const slot = page.locator('.equipment-panel .slot-head');
  await slot.scrollIntoViewIfNeeded();
  await slot.tap();
  await page.locator('#tab-bank [data-item-id=mystic_helm]').tap();
  await expect(page.locator('.global-tooltip')).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator('.global-tooltip')).toBeHidden();
  await expect(page.locator('.sw-equipment-picker-title')).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator('.equipment-panel')).toBeVisible();
  await expect(page.locator('.sw-equipment-picker-title')).toHaveCount(0);
  expect(await back(page)).toBe(true);
  await expect(page.locator('#sw-menu')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureEquipment.actions)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

test('Back cancels a native confirmation and respects an already handled Escape', async ({
  page,
}) => {
  await loadGame(page, {
    beforeAdapter: (page) =>
      page.evaluate(() => {
        document.addEventListener(
          'keydown',
          (event) => {
            const cancel = document.querySelector('.ctx-confirm-no');
            if (event.key !== 'Escape' || !cancel) return;
            event.preventDefault();
            event.stopPropagation();
            cancel.click();
          },
          true,
        );
        window.fixtureConfirm = () => {
          const overlay = document.createElement('div');
          overlay.className = 'ctx-confirm-overlay';
          overlay.innerHTML =
            '<button class="ctx-confirm-yes">End</button><button class="ctx-confirm-no">Cancel</button>';
          overlay.querySelector('.ctx-confirm-yes').onclick = () =>
            window.fixtureState.networkCalls.push('end');
          overlay.querySelector('.ctx-confirm-no').onclick = () => overlay.remove();
          document.getElementById('ui-container').append(overlay);
        };
      }),
  });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.evaluate(() => window.fixtureConfirm());
  expect(await back(page)).toBe(true);
  await expect(page.locator('.ctx-confirm-overlay')).toHaveCount(0);
  await expect(page.locator('#sw-menu')).toBeVisible();
  await page.evaluate(() => window.fixtureConfirm());
  await page.keyboard.press('Escape');
  await expect(page.locator('.ctx-confirm-overlay')).toHaveCount(0);
  await expect(page.locator('#sw-menu')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

test('Back dismisses a native chat popup immediately after a touch and keeps the draft', async ({
  page,
}) => {
  await loadGame(page);
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await page.locator('.chat-input').fill('Keep this draft');
  await page.evaluate(() => {
    const menu = document.createElement('div');
    menu.className = 'chat-room-menu';
    menu.textContent = 'Channels';
    document.getElementById('ui-container').append(menu);
    const lastTouch = Date.now();
    const dismiss = (event) => {
      if (event.type === 'mousedown' && Date.now() - lastTouch < 700) return;
      if (menu.contains(event.target)) return;
      menu.remove();
      document.removeEventListener('touchstart', dismiss, true);
      document.removeEventListener('mousedown', dismiss, true);
    };
    document.addEventListener('touchstart', dismiss, true);
    document.addEventListener('mousedown', dismiss, true);
  });
  expect(await back(page)).toBe(true);
  await expect(page.locator('.chat-room-menu')).toHaveCount(0);
  await expect(page.locator('#sw-view-title')).toHaveText('Chat');
  await expect(page.locator('.chat-input')).toHaveValue('Keep this draft');
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

for (const menu of ['potions-filter-menu', 'bank-filter-menu', 'chat-category-menu']) {
  test(`Back dismisses ${menu} before closing its screen`, async ({ page }) => {
    await loadGame(page);
    await page.locator('#sw-nav [data-sw-view=chat]').tap();
    await page.evaluate((className) => {
      const menu = document.createElement('div');
      menu.className = className;
      menu.textContent = 'Filters';
      document.getElementById('ui-container').append(menu);
      const dismiss = (event) => {
        if (menu.contains(event.target)) return;
        menu.remove();
        document.removeEventListener('touchstart', dismiss, true);
      };
      document.addEventListener('touchstart', dismiss, true);
    }, menu);
    expect(await back(page)).toBe(true);
    await expect(page.locator(`.${menu}`)).toHaveCount(0);
    await expect(page.locator('#sw-view-title')).toHaveText('Chat');
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('Back dismisses the login receipt without closing the screen beneath it', async ({ page }) => {
  await loadGame(page, { scripts: ['game.js', 'ledger/content.js', 'ledger/index.js'] });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.evaluate(() => window.fixtureNativeReceipt());
  await expect(page.locator('.ledger-return-overlay')).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
  await expect(page.locator('#sw-menu')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureNativeLedger.continued)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

test('Back closes credits opened by native Settings before the Settings modal', async ({
  page,
}) => {
  await loadGame(page, { scripts: ['game.js', 'credits.js'] });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=display]').tap();
  await page.locator('#sw-menu [data-sw-target=settings]').tap();
  await page.evaluate(() => window.Credits.showPopup());
  expect(await back(page)).toBe(true);
  await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
  await expect(page.locator('.modal-overlay')).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator('#sw-menu')).toBeVisible();
});

test('Back closes inspected receipt loot before dismissing the receipt', async ({ page }) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'items.js'],
    beforeAdapter: (page) => page.evaluate(() => window.fixtureItemDetails()),
  });
  await page.evaluate(() => {
    window.fixtureWelcomeBack();
    window.fixturePrepareAwayLoot();
  });
  await settle(page);
  const slot = page.locator('.ledger-return-overlay .ledger-slot').first();
  await slot.scrollIntoViewIfNeeded();
  await slot.tap();
  await expect(page.locator('.global-tooltip')).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.locator('.global-tooltip')).toBeHidden();
  await expect(page.locator('.ledger-return-overlay')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.ledgerContinue)).toBe(0);
  expect(await back(page)).toBe(true);
  await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixtureState.ledgerContinue)).toBe(1);
});

test('an inactive sleep overlay does not hide the active night ledger from Back', async ({
  page,
}) => {
  await loadGame(page);
  await page.evaluate(() => {
    const sleep = document.createElement('div');
    sleep.className = 'sleep-overlay';
    sleep.style.display = 'none';
    const ledger = document.createElement('div');
    ledger.className = 'ledger-night';
    ledger.innerHTML =
      '<button class="sleep-wake-btn">Wake</button><button class="sleep-enter-btn">Sleep</button>';
    ledger.addEventListener('click', () => window.fixtureState.networkCalls.push('sleep-action'));
    document.getElementById('ui-container').append(sleep, ledger);
  });
  expect(await back(page)).toBe(true);
  await expect(page.locator('.ledger-night')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
