'use strict';

const assert = require('node:assert/strict');
const { returnToWorld, openSkills } = require('./support/navigation.cjs');
const { test, expect, BUNDLE, loadGame, settle, screenshot } = require('./support/game.cjs');

async function box(page, selector) {
  return page.locator(selector).first().boundingBox();
}
function inBounds(b, w, h) {
  assert(b, 'element visible');
  assert(
    b.x >= -1 && b.y >= -1 && b.x + b.width <= w + 1 && b.y + b.height <= h + 1,
    JSON.stringify({ box: b, viewport: { w, h } }),
  );
}

test.beforeEach(async ({ page }) => {
  await loadGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        window.fixtureBeforeAdapter = {
          fetch,
          XMLHttpRequest,
          WebSocket,
          listeners: window.fixtureState.listeners.slice(),
        };
      });
    },
  });
});

test('full viewport and readable navigation', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  assert.equal(
    await page
      .locator('html')
      .getAttribute('class')
      .then((s) => s.includes('sw-mobile')),
    true,
  );
  const ui = await box(page, '#ui-container');
  assert.equal(Math.round(ui.width), w);
  assert.equal(Math.round(ui.height), h);
  const nav = await box(page, '#sw-nav');
  inBounds(nav, w, h);
  await expect(page.locator('#sw-nav button')).toHaveCount(6);
  for (const b of await page.locator('#sw-nav button').all()) {
    const r = await b.boundingBox();
    assert(r.height >= 44 && r.width >= 44, JSON.stringify(r));
  }
  const old = await page
    .locator('#toggle-skills')
    .evaluate((el) => window.fixtureBeforeAdapter.listeners.find((l) => l.el === el).el === el);
  assert(old, 'original button identity retained');
  await screenshot(page, 'world');
});

test('skills original handlers and scroll', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await openSkills(page);
  await settle(page);
  inBounds(await box(page, '#skills-panel'), w, h);
  await page.locator('#skills-panel .skill-cell').first().click();
  assert.equal(await page.evaluate(() => window.fixtureState.skillClicks), 1);
  assert.equal(await page.evaluate(() => window.fixtureState.panelClicks.skills), 1);
  const r = await box(page, '#skills-panel .skill-cell');
  assert(r.height >= 44 && r.width >= 44, JSON.stringify(r));
  await page.locator('#skills-panel .skill-cell').last().scrollIntoViewIfNeeded();
  await screenshot(page, 'skills');
});

test('unified task queue scroll and original controls', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="tasks"]').click();
  await settle(page);
  inBounds(await box(page, '#unified-queue-panel'), w, h);
  await page.locator('.uq-controls .ctrl-btn').first().click();
  assert.equal(await page.evaluate(() => window.fixtureState.taskControlClicks), 1);
  await page.locator('.uq-row').last().scrollIntoViewIfNeeded();
  inBounds(await box(page, '.uq-controls .ctrl-btn'), w, h);
  await screenshot(page, 'tasks');
});

test('inventory original listeners', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="inventory"]').click();
  await settle(page);
  inBounds(await box(page, '#bag-panel'), w, h);
  await page.locator('#bag-panel .inv-slot').first().click();
  assert.equal(await page.evaluate(() => window.fixtureState.inventoryClicks), 1);
  await page.locator('#bag-panel .inv-slot').last().scrollIntoViewIfNeeded();
  const r = await box(page, '#bag-panel .inv-slot');
  assert(r.width >= 44 && r.height >= 44, JSON.stringify(r));
  await screenshot(page, 'bag');
});

test('native menus keep updating after cached page restoration', async ({ page }) => {
  await page.evaluate(() => (window.fixtureState.restoredMenuClicks = 0));
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.evaluate((cycle) => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'floating-tab-btn';
      button.dataset.tab = `restored-menu-${cycle}`;
      button.textContent = 'Restored menu';
      button.addEventListener('click', () => window.fixtureState.restoredMenuClicks++);
      document.querySelector('.floating-tab-strip').appendChild(button);
    }, cycle);
    await expect(
      page.locator(`#sw-game-grid [data-sw-target="restored-menu-${cycle}"]`),
    ).toHaveCount(1);
  }
  await expect(page.locator('#sw-shell')).toHaveCount(1);
  await expect(page.locator('#sw-nav button')).toHaveCount(6);
  assert.equal(await page.evaluate(() => window.fixtureState.restoredMenuClicks), 0);
  await page.locator('#sw-nav [data-sw-view="menu"]').click();
  await page.locator('#sw-game-grid [data-sw-target="restored-menu-1"]').click();
  await settle(page);
  assert.equal(await page.evaluate(() => window.fixtureState.restoredMenuClicks), 1);
});

test('Bank dock reaches the original bank modal', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="menu"]').click();
  await settle(page);
  inBounds(await box(page, '#sw-menu'), w, h);
  await expect(page.locator('#sw-game-grid .sw-menu-item')).toHaveCount(10);
  await screenshot(page, 'menu-character');
  await page.locator('#sw-nav [data-sw-view="bank"]').click();
  await settle(page);
  assert.equal(await page.evaluate(() => window.fixtureState.modalClicks.bank), 1);
  inBounds(await box(page, '.modal-overlay'), w, h);
  inBounds(await box(page, '.modal-close'), w, h);
  const hiddenTabs = await page
    .locator('.modal-tabs')
    .evaluate((el) => getComputedStyle(el).display === 'none');
  if (hiddenTabs) {
    assert.equal(
      await page.locator('.modal-tabs').evaluate((el) => el.getBoundingClientRect().height),
      0,
      'duplicate navigation consumes no modal height',
    );
  } else {
    const bar = await box(page, '.modal-tabs');
    const modal = await box(page, '.modal-container');
    assert(
      Math.round(bar.width) >= Math.round(modal.width) - 4 &&
        Math.round(bar.width) <= Math.round(modal.width),
      'visible tab strip fills its modal container',
    );
    assert.equal(
      await page.locator('.modal-tabs [data-tab="bank"]').getAttribute('data-sw-label'),
      'Bank',
    );
  }
  const search = await box(page, '.bank-search');
  inBounds(search, w, h);
  assert(search.height >= 44);
  await screenshot(page, 'bank');
  await page.locator('.modal-close').click();
  assert.equal(await page.evaluate(() => window.fixtureState.closeClicks), 1);
});

test('rerendered menu retains original handlers', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureRerenderNav());
  await settle(page);
  await page.locator('#sw-nav [data-sw-view="menu"]').click();
  await settle(page);
  await page.locator('#sw-menu [data-sw-menu-section=display]').click();
  await page.locator('#sw-settings-grid [data-sw-target="settings"]').click();
  await settle(page);
  assert.equal(await page.evaluate(() => window.fixtureState.modalClicks.settings), 1);
  await page.locator('.modal-close').click();
  await page.addScriptTag({ content: BUNDLE });
  await expect(page.locator('#sw-shell')).toHaveCount(1);
  await expect(page.locator('#sw-mobile-style')).toHaveCount(1);
  await page.evaluate(() => window.fixtureRender());
  await settle(page);
  const r = await box(page, '#ui-container');
  assert.equal(Math.round(r.width), w);
  assert.equal(Math.round(r.height), h);
});

test('chat original send and keyboard resize', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="chat"]').click();
  await settle(page);
  inBounds(await box(page, '#chat-panel'), w, h);
  await page.locator('.chat-input').fill('QA message stays original');
  await page.locator('.chat-input').press('Enter');
  assert.deepEqual(await page.evaluate(() => window.fixtureState.messages), [
    'QA message stays original',
  ]);
  const keyboardHeight = h > 520 ? 400 : 260;
  await page.locator('.chat-input').focus();
  await page.evaluate((height) => window.fixtureKeyboard(height), keyboardHeight);
  await settle(page);
  inBounds(await box(page, '.chat-input'), w, keyboardHeight);
  inBounds(await box(page, '#sw-nav'), w, keyboardHeight);
  await screenshot(page, 'chat-keyboard');
  await page.evaluate(() => window.fixtureKeyboard(innerHeight));
  await settle(page);
});

test('original login and signup controls', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureLogin(true));
  await settle(page);
  await page.locator('#login-btn-steam').scrollIntoViewIfNeeded();
  await screenshot(page, 'login');
  inBounds(await box(page, '#login-btn-steam'), w, h);
  await page.locator('#login-btn-steam').click();
  assert.equal(await page.evaluate(() => window.fixtureState.loginClicks), 1);
  await screenshot(page, 'login');
  await page.evaluate(() => window.fixtureLogin(true, true));
  await settle(page);
  await page.locator('#login-signup-input').scrollIntoViewIfNeeded();
  await page.locator('#login-signup-input').fill('MobileAdventurer');
  const keyboardHeight = h > 520 ? 400 : 260;
  await page.evaluate((height) => window.fixtureKeyboard(height), keyboardHeight);
  await settle(page);
  await page.locator('#login-signup-input').scrollIntoViewIfNeeded();
  inBounds(await box(page, '#login-signup-input'), w, keyboardHeight);
  await page.evaluate(() => {
    window.fixtureKeyboard(innerHeight);
    window.fixtureLogin(false);
  });
  await settle(page);
});

test('pre-login actions gated and original patch notes reachable', async ({ page }) => {
  await page.evaluate(() => window.fixtureLogin(true));
  await settle(page);
  assert.equal(
    await page.locator('.patch-notes-panel').isVisible(),
    false,
    'notes hidden by default',
  );
  const before = await page.evaluate(() => window.fixtureState.modalClicks.bank);
  await page.locator('#sw-nav [data-sw-view="menu"]').click();
  await page.locator('#sw-nav [data-sw-view="bank"]').click();
  assert.equal(
    await page.evaluate(() => window.fixtureState.modalClicks.bank),
    before,
    'login menu cannot invoke game actions',
  );
  await page.locator('#sw-menu [data-sw-menu-section=display]').click();
  await page.locator('#sw-notes-toggle').click();
  await settle(page);
  await expect(page.locator('.patch-notes-panel')).toBeVisible();
  await page.locator('.patch-notes-prev').click();
  assert.equal(await page.evaluate(() => window.fixtureState.patchNotesClicks), 1);
  await returnToWorld(page);
  await settle(page);
  await expect(page.locator('.patch-notes-panel')).toBeHidden();
  await page.evaluate(() => window.fixtureLogin(false));
  await settle(page);
});

test('reversible layout and presentation-only changes', async ({ page }) => {
  const before = await page.locator('#ui-container').evaluate((el) => ({
    zoom: el.style.zoom,
    transform: el.style.transform,
    width: el.style.width,
    height: el.style.height,
  }));
  await page.locator('#sw-nav [data-sw-view="menu"]').click();
  await settle(page);
  await page.locator('#sw-layout-toggle').click();
  assert.equal(
    await page
      .locator('html')
      .getAttribute('class')
      .then((s) => s.includes('sw-mobile')),
    false,
  );
  const off = await page.locator('#ui-container').evaluate((el) => ({
    zoom: el.style.zoom,
    transform: el.style.transform,
    width: el.style.width,
    height: el.style.height,
    computedZoom: getComputedStyle(el).zoom,
  }));
  assert.equal(Number(off.computedZoom), Number(before.zoom), 'original inline zoom restored');
  assert.deepEqual(
    {
      zoom: off.zoom,
      transform: off.transform,
      width: off.width,
      height: off.height,
    },
    before,
    'original renderer inline layout untouched',
  );
  await page.locator('#sw-layout-toggle').click();
  assert.equal(
    await page
      .locator('html')
      .getAttribute('class')
      .then((s) => s.includes('sw-mobile')),
    true,
  );
  const audit = await page.evaluate(() => ({
    apiIdentity:
      fetch === window.fixtureBeforeAdapter.fetch &&
      XMLHttpRequest === window.fixtureBeforeAdapter.XMLHttpRequest &&
      WebSocket === window.fixtureBeforeAdapter.WebSocket,
    network: window.fixtureState.networkCalls,
    storage: window.fixtureState.storageCalls,
    gameplayUnchanged:
      JSON.stringify(window.fixtureState.gameplay) === window.fixtureOriginalGameplay,
  }));
  assert(audit.apiIdentity, 'network APIs untouched');
  assert.deepEqual(audit.network, [], 'adapter made no network requests');
  assert(audit.gameplayUnchanged, 'gameplay fixture untouched');
  assert(
    audit.storage.every((call) =>
      [
        'sw_mobile_ui',
        'sw_mobile_render',
        'sw_mobile_chat',
        'sw_mobile_orientation',
        'sw_mobile_map_defaults',
      ].includes(call[1]),
    ),
    'only namespaced presentation preferences accessed',
  );
});
