'use strict';

const assert = require('node:assert/strict');
const { returnToWorld, openSkills } = require('./support/navigation.cjs');
const { test, expect, loadGame, settle, screenshot } = require('./support/game.cjs');

function bounds(r, w, h) {
  assert(r, 'element has a visible rectangle');
  assert(
    r.x >= -1 && r.y >= -1 && r.x + r.width <= w + 1 && r.y + r.height <= h + 1,
    JSON.stringify({ r, viewport: { w, h } }),
  );
}
function overlaps(a, b) {
  return (
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
  );
}
async function details(page) {
  if (await page.locator('#sw-combat-toggle').isVisible())
    await page.locator('#sw-combat-toggle').tap();
  await settle(page);
}
async function closeDetails(page) {
  if (await page.locator('#sw-combat-close').isVisible())
    await page.locator('#sw-combat-close').tap();
  await settle(page);
}
async function minimumDetailsHeight(page) {
  return page.evaluate(() => {
    if (!document.documentElement.classList.contains('sw-landscape')) return 44;
    const styles = getComputedStyle(document.documentElement);
    const top = parseFloat(styles.getPropertyValue('--safe-area-inset-top')) || 0;
    const bottom = parseFloat(styles.getPropertyValue('--safe-area-inset-bottom')) || 0;
    const height = window.visualViewport?.height || innerHeight;
    return (height - top - bottom) / 2;
  });
}
async function visibleGeometry(page, w, h, selectors) {
  const rects = [];
  for (const selector of selectors) {
    const node = page.locator(selector).first();
    if ((await node.count()) && (await node.isVisible())) {
      const rect = await node.boundingBox();
      bounds(rect, w, h);
      rects.push({ selector, ...rect });
    }
  }
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      assert(
        !overlaps(rects[i], rects[j]),
        'visible boxes overlap ' + JSON.stringify([rects[i], rects[j]]),
      );
  return rects;
}
async function reachable(node, w, h) {
  try {
    await node.scrollIntoViewIfNeeded();
    bounds(await node.boundingBox(), w, h);
    assert(
      await node.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return hit === el || el.contains(hit);
      }),
      'original control midpoint is unobscured',
    );
  } catch (error) {
    error.message += ' control ' + (await node.evaluate((el) => el.outerHTML.slice(0, 280)));
    throw error;
  }
}
const top = [
  '.hp-bar',
  '#sw-combat-toggle',
  '#sw-combat-tabs',
  '.player-tabs',
  '.mob-tabs',
  '.recenter-camera-btn',
  '.active-potions-pill',
  '.active-potions-panel',
];
const bottom = ['#task-display', '.combat-hud', '#sw-mini-chat', '#sw-nav'];

test.beforeEach(async ({ page }) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        window.fixtureWorldScene();
        window.fixtureCommunityChat();
        window.fixtureLayoutBaseline = {
          fetch,
          WebSocket,
          XMLHttpRequest,
          setTimeout,
          setInterval,
          requestAnimationFrame,
          cancelAnimationFrame,
          gameplay: JSON.stringify(window.fixtureState.gameplay),
        };
        window.fixtureObserverScopes = [];
        const observe = MutationObserver.prototype.observe;
        MutationObserver.prototype.observe = function (target, options) {
          window.fixtureObserverScopes.push({
            id: target.id,
            className: typeof target.className === 'string' ? target.className : '',
            tag: target.tagName || target.nodeName,
            options: JSON.parse(JSON.stringify(options)),
          });
          return observe.call(this, target, options);
        };
      });
    },
  });
});

test('combat starts collapsed with separated HP camera potions task and End Combat', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await expect(page.locator('#sw-combat-toggle')).toBeVisible();
  await expect(page.locator('#sw-combat-tabs')).toBeHidden();
  await expect(page.locator('#ce-player-panel')).toBeHidden();
  await expect(page.locator('#ce-mob-panel')).toBeHidden();
  await visibleGeometry(page, w, h, [...top, ...bottom]);
  assert((await page.locator('.hp-bar').boundingBox()).height >= 44);
  await reachable(page.locator('.btn-end-combat'), w, h);
  await reachable(page.locator('#sw-combat-toggle'), w, h);
  assert.deepEqual(await page.evaluate(() => window.fixtureState.combatTabClicks), []);
  await screenshot(page, 'combat-collapsed');
});

test('passive five chat lines preserve filtered names text and only existing badges', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await closeDetails(page);
  await page.evaluate(() => window.fixtureCommunityChat());
  await settle(page);
  const mini = page.locator('#sw-mini-chat');
  await expect(mini).toBeVisible();
  bounds(await mini.boundingBox(), w, h);
  await expect(mini.locator('.sw-mini-line')).toHaveCount(5);
  assert.deepEqual(await mini.locator('.sw-mini-name').allTextContents(), [
    'Bob: ',
    'César: ',
    'Daria: ',
    'Eryn: ',
    'Frida: ',
  ]);
  assert.deepEqual(await mini.locator('.sw-mini-text').allTextContents(), [
    'A short chat message',
    '¡Buenas noches!',
    'Friend message',
    'Clan message',
    '<img src=x onerror=alert(1)>',
  ]);
  await expect(mini.locator('img')).toHaveCount(3);
  await expect(mini.locator('button,a,input,.tooltip,.chat-timestamp,.chat-world-tag')).toHaveCount(
    0,
  );
  await expect(page.locator('#sw-mini-open,#sw-mini-close')).toHaveCount(0);
  assert(
    await page.evaluate(() =>
      window.fixtureOriginalChatBadges.every(
        (img) => img.isConnected && img.closest('.chat-message-area'),
      ),
    ),
    'original badge nodes were not moved',
  );
  const audit = await mini.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      bg: s.backgroundColor,
      border: s.borderTopWidth,
      hit: Array.from(el.querySelectorAll('*'))
        .concat(el)
        .every((n) => getComputedStyle(n).pointerEvents === 'none'),
    };
  });
  assert.equal(audit.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(audit.border, '0px');
  assert(audit.hit, 'every child is passive');
  await screenshot(page, 'passive-chat');
});

test('passive chat permits underlying tap and Menu is its only preference control', async ({
  page,
}) => {
  const mini = page.locator('#sw-mini-chat');
  const r = await mini.boundingBox();
  assert(r);
  await page.evaluate((rect) => {
    const b = document.createElement('button');
    b.id = 'under-chat-control';
    b.style.cssText =
      'position:fixed;z-index:999;left:' +
      rect.x +
      'px;top:' +
      rect.y +
      'px;width:' +
      rect.width +
      'px;height:' +
      rect.height +
      'px;pointer-events:auto';
    b.textContent = 'Original underlying map action';
    window.fixtureState.underChatTaps = 0;
    b.addEventListener('click', () => window.fixtureState.underChatTaps++);
    document.body.append(b);
  }, r);
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  assert.equal(await page.evaluate(() => window.fixtureState.underChatTaps), 1);
  await page.locator('#under-chat-control').evaluate((el) => el.remove());
  await page.locator('#sw-nav [data-sw-view="chat"]').tap();
  await settle(page);
  await expect(page.locator('#chat-panel')).toBeVisible();
  await expect(mini).toBeHidden();
  await page.locator('#sw-nav [data-sw-view="menu"]').tap();
  await settle(page);
  await page.locator('#sw-menu [data-sw-menu-section=display]').tap();
  await page.locator('#sw-mini-enabled').uncheck();
  await returnToWorld(page);
  await settle(page);
  await expect(mini).toBeHidden();
  await page.locator('#sw-nav [data-sw-view="menu"]').tap();
  await page.locator('#sw-menu [data-sw-menu-section=display]').tap();
  await page.locator('#sw-mini-enabled').check();
  await returnToWorld(page);
  await settle(page);
  await expect(mini).toBeVisible();
});

test('opening combat details creates one usable scroll sheet without native tab actions', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  const before = await page.evaluate(() => window.fixtureState.combatTabClicks.length);
  const chatPreference = await page.evaluate(() => localStorage.getItem('sw_mobile_chat'));
  await details(page);
  await expect(page.locator('#sw-combat-tabs')).toBeVisible();
  await expect(page.locator('#ce-player-panel')).toBeVisible();
  await expect(page.locator('#ce-mob-panel')).toBeHidden();
  assert.equal(await page.evaluate(() => window.fixtureState.combatTabClicks.length), before);
  await visibleGeometry(page, w, h, [...top, ...bottom, '#ce-player-panel']);
  const sheet = await page.locator('#ce-player-panel').boundingBox();
  assert(
    sheet.height >= (await minimumDetailsHeight(page)),
    'landscape details retain a readable half-height pane; compact portrait keeps a full control row ' +
      JSON.stringify(sheet),
  );
  await expect(page.locator('#sw-mini-chat')).toBeHidden();
  assert.equal(
    await page.evaluate(() => localStorage.getItem('sw_mobile_chat')),
    chatPreference,
    'combat reading yields the passive preview without disabling its preference',
  );
  for (const selector of [
    '#sw-combat-tabs [data-sw-combat=player]',
    '#sw-combat-tabs [data-sw-combat=opponent]',
    '#sw-combat-close',
    '.player-tabs .panel-tab',
  ]) {
    const node = page.locator(selector).first();
    await reachable(node, w, h);
    assert((await node.boundingBox()).height >= 44);
  }
  await screenshot(page, 'combat-player-stats');
});

test('expanded potions reserve combat sheet space and last original row remains scrollable', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await details(page);
  await page.locator('.active-potions-pill').tap();
  await settle(page);
  await visibleGeometry(page, w, h, [...top, ...bottom, '#ce-player-panel']);
  const sheet = await page.locator('#ce-player-panel').boundingBox();
  assert(
    sheet.height >= (await minimumDetailsHeight(page)),
    'expanded potions retain readable landscape details and a usable portrait row ' +
      JSON.stringify(sheet),
  );
  const panel = page.locator('.active-potions-panel');
  await reachable(panel.locator('.potion-row-count').last(), w, h);
  await screenshot(page, 'combat-expanded-potions');
  await panel.tap();
  await settle(page);
  await expect(page.locator('.active-potions-pill')).toBeVisible();
});

test('long combat values all ten skills table cells and native stat tools remain reachable', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await details(page);
  const panel = page.locator('#ce-player-panel');
  await expect(panel.locator('[data-content=stats] .skill-row')).toHaveCount(10);
  await expect(panel.locator('.derived-item')).toHaveCount(6);
  const overflow = await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  assert.equal(overflow, false, 'no clipped horizontal combat data');
  const xp = panel.locator('.skill-row.selectable').first();
  await reachable(xp, w, h);
  await xp.tap();
  assert.equal(await page.evaluate(() => window.fixtureState.xpToggleClicks), 1);
  const last = panel.locator('[data-content=stats] .stats-table tbody tr').last();
  await last.scrollIntoViewIfNeeded();
  assert.equal(await last.locator('td').last().textContent(), '+1,234');
  for (const selector of [
    '.potion-stats-toggle-wrap',
    '.spirit-stats-toggle-wrap',
    '.gearcalc-launch-wrap',
  ]) {
    const control = panel.locator(selector);
    await reachable(control, w, h);
    await control.tap();
  }
  assert.deepEqual(await page.evaluate(() => window.fixtureState.v4CombatUtilities), [
    'Potion boosts',
    'Spirit modifier',
    'Extended combat calculator',
  ]);
  await screenshot(page, 'combat-stats-tools');
});

test('original Equipment loadout families slots paperdoll and bonus table still work', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await details(page);
  await page.locator('.player-tabs .panel-tab[data-tab=equipment]').tap();
  await settle(page);
  const panel = page.locator('#ce-player-panel [data-content=equipment]');
  await expect(panel).toBeVisible();
  const trigger = panel.locator('.loadout-dropdown-trigger');
  await reachable(trigger, w, h);
  await trigger.tap();
  const family = panel.locator('.loadout-sel-family').last();
  await reachable(family, w, h);
  await family.tap();
  const choice = panel.locator('.loadout-sel-slot').last();
  await reachable(choice, w, h);
  await choice.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.v4LoadoutFamilies), ['Magic']);
  assert.deepEqual(await page.evaluate(() => window.fixtureState.v4LoadoutChoices), [3]);
  const slot = panel.locator('.paperdoll .inv-slot').last();
  await reachable(slot, w, h);
  await slot.tap();
  assert.equal(await page.evaluate(() => window.fixtureState.equipmentClicks), 1);
  const tableCell = panel.locator('.stats-table tbody tr').last().locator('td').last();
  await tableCell.scrollIntoViewIfNeeded();
  bounds(await tableCell.boundingBox(), w, h);
  await screenshot(page, 'combat-equipment');
});

test('enemy selection has one sheet and original Received Drop Table and last loot actions', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await details(page);
  const before = await page.evaluate(() => window.fixtureState.combatTabClicks.length);
  await page.locator('#sw-combat-tabs [data-sw-combat=opponent]').tap();
  await settle(page);
  assert.equal(await page.evaluate(() => window.fixtureState.combatTabClicks.length), before);
  await expect(page.locator('#ce-player-panel')).toBeHidden();
  await expect(page.locator('#ce-mob-panel')).toBeVisible();
  await page.locator('.mob-tabs .panel-tab[data-tab=loot]').tap();
  await settle(page);
  const loot = page.locator('#ce-mob-panel [data-content=loot]');
  for (const [tab, grid, index] of [
    [0, '.v4-loot-received', 35],
    [1, '.v4-loot-drops', 135],
  ]) {
    const control = loot.locator('.loot-sub-tab').nth(tab);
    await reachable(control, w, h);
    await control.tap();
    const slot = loot.locator(grid + ' .inv-slot').last();
    await reachable(slot, w, h);
    await slot.tap();
    assert.equal(await page.evaluate(() => window.fixtureState.v4LootChoices.at(-1)), index);
  }
  await screenshot(page, 'combat-loot-bottom');
});

test('native active-tab collapse is preserved and owned close restores collapsed combat', async ({
  page,
}) => {
  await details(page);
  await page.locator('#sw-combat-tabs [data-sw-combat=opponent]').tap();
  await settle(page);
  await page.locator('.mob-tabs .panel-tab[data-tab=loot]').tap();
  await settle(page);
  const native = page.locator('.mob-tabs .panel-tab[data-tab=loot]');
  await native.tap();
  await settle(page);
  assert(
    await page.locator('#ce-mob-panel').evaluate((el) => el.classList.contains('panel-hidden')),
  );
  assert.equal(
    await page.locator('.mob-tabs').isVisible(),
    false,
    'native collapse also hides native tab strip',
  );
  assert(
    await page.locator('#sw-combat-toggle').isVisible(),
    'native collapse returns to public details button',
  );
  const before = await page.evaluate(() => window.fixtureState.combatTabClicks.length);
  await details(page);
  assert.equal(
    await page.evaluate(() => window.fixtureState.combatTabClicks.length),
    before + 1,
    'public reopening invokes one original UI tab handler',
  );
  assert.equal(
    await page.locator('#ce-mob-panel').evaluate((el) => el.classList.contains('panel-hidden')),
    false,
  );
  const reopened = await page.evaluate(() => window.fixtureState.combatTabClicks.length);
  await closeDetails(page);
  assert.equal(await page.evaluate(() => window.fixtureState.combatTabClicks.length), reopened);
  await expect(page.locator('#sw-combat-toggle')).toBeVisible();
  await expect(page.locator('#ce-mob-panel')).toBeHidden();
  await expect(page.locator('#sw-mini-chat')).toBeVisible();
});

test('native closed startup and hidden actor can open through public details using one original UI handler', async ({
  page,
}) => {
  await details(page);
  await page.locator('#sw-combat-tabs [data-sw-combat=opponent]').tap();
  await settle(page);
  await closeDetails(page);
  await page.evaluate(() => window.fixtureCombat(true, true));
  await settle(page);
  await expect(page.locator('.player-tabs')).toBeHidden();
  await expect(page.locator('.mob-tabs')).toBeHidden();
  const before = await page.evaluate(() => window.fixtureState.combatTabClicks.length);
  await details(page);
  assert.equal(await page.evaluate(() => window.fixtureState.combatTabClicks.length), before + 1);
  await expect(page.locator('#ce-mob-panel')).toBeVisible();
  assert.equal(
    await page.locator('#ce-mob-panel').evaluate((el) => el.classList.contains('panel-hidden')),
    false,
  );
  await page.locator('#sw-combat-tabs [data-sw-combat=player]').tap();
  await settle(page);
  assert.equal(await page.evaluate(() => window.fixtureState.combatTabClicks.length), before + 2);
  await expect(page.locator('#ce-player-panel')).toBeVisible();
  await expect(page.locator('#ce-mob-panel')).toBeHidden();
  assert.equal(
    await page.locator('#ce-player-panel').evaluate((el) => el.classList.contains('panel-hidden')),
    false,
  );
  await closeDetails(page);
  await details(page);
  assert.equal(
    await page.evaluate(() => window.fixtureState.combatTabClicks.length),
    before + 2,
    'already-open native sheet is not toggled again',
  );
  await closeDetails(page);
});

test('native variable heights and inline offsets reflow both collapsed and expanded potions', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureWorldScene({ combat: false }));
  await settle(page);
  for (let tick = 0; tick < 4; tick++) {
    await page.evaluate((t) => window.fixtureResizeHud(t), tick);
    await settle(page);
    await visibleGeometry(page, w, h, [
      '.hp-bar',
      '.ingame-hud',
      '.recenter-camera-btn',
      '.active-potions-pill',
      '.active-potions-panel',
      '#task-display',
      '#sw-mini-chat',
      '#sw-nav',
    ]);
    const css = await page.evaluate(() => {
      const s = document.documentElement.style;
      return Object.fromEntries(
        [
          '--sw-hp-height',
          '--sw-camera-height',
          '--sw-potions-height',
          '--sw-task-height',
          '--sw-hud-bottom',
        ].map((key) => [key, parseFloat(s.getPropertyValue(key))]),
      );
    });
    assert(css['--sw-hp-height'] >= 44);
    assert(css['--sw-camera-height'] >= 44);
    assert(css['--sw-task-height'] > 0);
    assert(css['--sw-hud-bottom'] > 0);
  }
  await screenshot(page, 'variable-hud-potions');
  const panel = page.locator('.active-potions-panel');
  await panel.locator('.potion-row').last().scrollIntoViewIfNeeded();
  await reachable(panel.locator('.potion-row-count').last(), w, h);
  await panel.tap();
  await settle(page);
  const pill = page.locator('.active-potions-pill');
  await reachable(pill, w, h);
  await pill.tap();
  await settle(page);
  await panel.tap();
  await reachable(page.locator('.recenter-camera-btn'), w, h);
  await page.locator('.recenter-camera-btn').tap();
  assert.equal(await page.evaluate(() => window.fixtureState.recenterClicks), 1);
  await page.locator('.ingame-hud-info').tap();
  await settle(page);
  await page.locator('.ingame-hud-world').tap();
  await page.locator('.ingame-hud-offline').tap();
  assert.equal(await page.evaluate(() => window.fixtureState.hudWorld), 1);
  assert.equal(await page.evaluate(() => window.fixtureState.hudOffline), 1);
});

test('whole footer shows all original task actions and native raid End Combat together', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureWorldScene({ combat: true, footer: 'detailed' }));
  await settle(page);
  await closeDetails(page);
  await visibleGeometry(page, w, h, [...top, ...bottom]);
  const task = page.locator('#task-display');
  const card = await task.boundingBox();
  assert(
    await task.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
    'the task card has no internal scrolling',
  );
  for (const control of await page
    .locator('#task-display .float-combat-col,#task-display .float-toggle-pill')
    .all()) {
    const rect = await control.boundingBox();
    assert(rect.y >= card.y && rect.y + rect.height <= card.y + card.height + 1);
    assert(rect.height >= 44, 'each visible task action retains a full touch target');
    assert(
      await control.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return hit === element || element.contains(hit);
      }),
      'every task action is reachable before any scroll',
    );
    await control.tap();
  }
  assert.deepEqual(await page.evaluate(() => window.fixtureState.v4FooterActions), [
    'loadout',
    'training',
    'auto',
  ]);
  await reachable(page.locator('.btn-end-combat'), w, h);
  await page.locator('.btn-end-combat').tap();
  assert.equal(await page.evaluate(() => window.fixtureState.v4RaidEnd), 1);
  await screenshot(page, 'footer-all-controls');
  await details(page);
  await page.evaluate(() => window.fixtureCombat(false));
  await settle(page);
  await page.evaluate(() => window.fixtureCombat(true));
  await settle(page);
  await expect(page.locator('#sw-combat-toggle')).toBeVisible();
  assert.equal(
    await page.locator('#sw-combat-tabs').isVisible(),
    false,
    'a new fight starts with details closed',
  );
});

test('passive chat hides behind full chat modals login and Original UI without changing preference', async ({
  page,
}) => {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu [data-sw-menu-section=display]').tap();
  await page.locator('#sw-mini-enabled').uncheck();
  await page.locator('#sw-mini-enabled').check();
  await returnToWorld(page);
  await settle(page);
  const mini = page.locator('#sw-mini-chat');
  await page.evaluate(() => window.fixtureOpenModal('bank'));
  await settle(page);
  await expect(mini).toBeHidden();
  await page.locator('.modal-close').tap();
  await page.evaluate(() => window.fixtureLogin(true));
  await settle(page);
  await expect(mini).toBeHidden();
  await page.evaluate(() => window.fixtureLogin(false));
  await settle(page);
  await expect(mini).toBeVisible();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  await expect(mini).toBeHidden();
  await page.locator('#sw-layout-toggle').tap();
  await returnToWorld(page);
  await settle(page);
  await expect(mini).toBeVisible();
  assert.equal(await page.evaluate(() => localStorage.getItem('sw_mobile_chat')), 'on');
});

test('native HP opens and closes Tasks with one original action and correct mobile selection', async ({
  page,
}) => {
  const before = await page.evaluate(() => window.fixtureState.panelClicks.tasks || 0);
  await page.locator('.hp-bar').tap();
  await settle(page);
  await expect(page.locator('#unified-queue-panel')).toBeVisible();
  assert.equal(
    await page.locator('#sw-nav [data-sw-view=tasks]').getAttribute('aria-current'),
    'page',
  );
  assert.equal(await page.evaluate(() => window.fixtureState.panelClicks.tasks), before + 1);
  await page.locator('.hp-bar').tap();
  await settle(page);
  await expect(page.locator('#unified-queue-panel')).toBeHidden();
  assert.equal(
    await page.locator('#sw-nav [data-sw-view=map]').getAttribute('aria-current'),
    'false',
  );
  assert.equal(await page.evaluate(() => window.fixtureState.panelClicks.tasks), before + 2);
  assert.equal(await page.evaluate(() => window.fixtureState.hpNativeClicks), 2);
});

test('Tasks Bag and Skills sheets leave native HP clear and hide unrelated world potion controls', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  for (const [view, selector] of [
    ['tasks', '#unified-queue-panel'],
    ['inventory', '#bag-panel'],
    ['skills', '#skills-panel'],
  ]) {
    if (view === 'skills') await openSkills(page);
    else await page.locator('#sw-nav [data-sw-view=' + view + ']').tap();
    await settle(page);
    await visibleGeometry(page, w, h, ['.hp-bar', selector, '#sw-nav']);
    await expect(page.locator('.active-potions-pill')).toBeHidden();
    await expect(page.locator('.active-potions-panel')).toBeHidden();
  }
  await returnToWorld(page);
  await settle(page);
  await expect(page.locator('.active-potions-pill')).toBeVisible();
});

test('direct chat observation and original APIs network and game state remain intact', async ({
  page,
}) => {
  const scopes = await page.evaluate(() =>
    window.fixtureObserverScopes.filter((scope) =>
      scope.className.split(' ').includes('chat-message-area'),
    ),
  );
  assert(scopes.length >= 1);
  assert(
    scopes.every(
      (scope) =>
        scope.options.childList &&
        scope.options.subtree &&
        scope.options.characterData &&
        scope.options.attributes &&
        JSON.stringify(scope.options.attributeFilter) ===
          JSON.stringify(['data-channel', 'data-category', 'hidden', 'style']),
    ),
    JSON.stringify(scopes),
  );
  const audit = await page.evaluate(() => ({
    apis: [
      'fetch',
      'WebSocket',
      'XMLHttpRequest',
      'setTimeout',
      'setInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ].map((name) => [name, window[name] === window.fixtureLayoutBaseline[name]]),
    network: window.fixtureState.networkCalls,
    gameplay:
      JSON.stringify(window.fixtureState.gameplay) === window.fixtureLayoutBaseline.gameplay,
  }));
  assert(
    audit.apis.every((value) => value[1]),
    JSON.stringify(audit.apis),
  );
  assert.deepEqual(audit.network, []);
  assert(audit.gameplay);
});
