'use strict';

const assert = require('node:assert/strict');
const { test, expect, loadGame, settle, screenshot } = require('./support/game.cjs');

function visibleRect(r, w, h) {
  assert(r, 'Element is visible');
  assert(
    r.x >= -1 && r.y >= -1 && r.x + r.width <= w + 1 && r.y + r.height <= h + 1,
    JSON.stringify({ rect: r, viewport: { w, h } }),
  );
}
async function countBodies(page) {
  return page
    .locator('.combat-encounter .panel-wrapper')
    .evaluateAll(
      (elements) =>
        elements.filter(
          (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0,
        ).length,
    );
}
async function userTap(page, selector) {
  await page.locator(selector).tap();
  await settle(page);
}

test.beforeEach(async ({ page }) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        window.fixtureCombatBaseline = {
          fetch,
          XMLHttpRequest,
          WebSocket,
          setTimeout,
          setInterval,
          requestAnimationFrame,
          cancelAnimationFrame,
          gameplay: JSON.stringify(window.fixtureState.gameplay),
        };
        window.fixtureScanAudit = { nav: 0, all: 0 };
        for (const proto of [Document.prototype, Element.prototype]) {
          const original = proto.querySelectorAll;
          proto.querySelectorAll = function (selector) {
            window.fixtureScanAudit.all++;
            if (/floating-tab-strip|panel-tab-btn\[data-tab\]|modal-tabs.*tab-btn/.test(selector))
              window.fixtureScanAudit.nav++;
            return original.call(this, selector);
          };
        }
      });
    },
  });
});

test('original pixel icons in navigation', async ({ page }) => {
  for (const [view, source] of [
    ['tasks', '#toggle-tasks img'],
    ['inventory', '#toggle-inventory img'],
    ['bank', '.floating-tab-btn[data-tab=bank] img'],
  ]) {
    const button = page.locator('#sw-nav [data-sw-view="' + view + '"]');
    assert.equal(await button.locator('img').count(), 1, view + ' carries image');
    assert.equal(
      await button.locator('img').getAttribute('src'),
      await page.locator(source).getAttribute('src'),
      view + ' uses original source',
    );
  }
  assert.equal(
    await page.locator('#sw-character-grid [data-sw-target=skills] img').getAttribute('src'),
    await page.locator('#toggle-skills img').getAttribute('src'),
    'Skills keeps its original icon in Menu',
  );
  for (const b of await page.locator('#sw-nav button').all()) {
    const r = await b.boundingBox();
    assert(r.width >= 44 && r.height >= 44, '44 px tap target');
  }
});

test('one combat body with retained original tabs', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureCombat());
  await settle(page);
  if (await page.locator('#sw-combat-toggle').count())
    await page.locator('#sw-combat-toggle').click();
  await settle(page);
  await expect(page.locator('#sw-combat-tabs [data-sw-combat]')).toHaveCount(2);
  assert.equal(await countBodies(page), 1, 'one actor panel visible');
  visibleRect(await page.locator('#sw-combat-tabs').boundingBox(), w, h);
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.combatTabClicks),
    [],
    'presentation tabs did not invoke game handlers',
  );
  await page.locator('#sw-combat-tabs [data-sw-combat="opponent"]').click();
  await settle(page);
  assert.equal(await countBodies(page), 1);
  await expect(page.locator('.mob-side')).toBeVisible();
  await expect(page.locator('.player-side')).toBeHidden();
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.combatTabClicks),
    [],
    'switching actors remains presentational',
  );
  await userTap(page, '.mob-side .panel-tab[data-tab="loot"]');
  assert.deepEqual(await page.evaluate(() => window.fixtureState.combatTabClicks), [
    ['mob', 'loot'],
  ]);
  await expect(page.locator('.mob-side [data-content="loot"]')).toBeVisible();
  await page.locator('.mob-side .loot-sub-tab').first().click();
  assert.equal(await page.evaluate(() => window.fixtureState.lootClicks), 1);
  await page.locator('.mob-side .loot-grid .inv-slot').last().scrollIntoViewIfNeeded();
  visibleRect(await page.locator('.mob-side .loot-grid .inv-slot').last().boundingBox(), w, h);
  await page.locator('#sw-combat-tabs [data-sw-combat="player"]').click();
  await settle(page);
  await expect(page.locator('.player-side')).toBeVisible();
  assert.equal(await countBodies(page), 1);
  await userTap(page, '.player-side .panel-tab[data-tab="equipment"]');
  assert.deepEqual(await page.evaluate(() => window.fixtureState.combatTabClicks), [
    ['mob', 'loot'],
    ['player', 'equipment'],
  ]);
  await expect(page.locator('.player-side [data-content="equipment"]')).toBeVisible();
  await page.locator('.player-side .paperdoll .inv-slot').first().click();
  assert.equal(await page.evaluate(() => window.fixtureState.equipmentClicks), 1);
  visibleRect(await page.locator('.player-side').boundingBox(), w, h);
  await screenshot(page, 'combat-equipment');
});

test('original combat collapse and rerender state', async ({ page }) => {
  await page.evaluate(() => window.fixtureCombat(true, true));
  await settle(page);
  assert.equal(
    await page.locator('#ce-player-panel').evaluate((el) => el.classList.contains('panel-hidden')),
    true,
    'adapter respects original collapse state',
  );
  assert.equal(
    await page.locator('#ce-mob-panel').evaluate((el) => el.classList.contains('panel-hidden')),
    true,
  );
  await page.evaluate(() => window.fixtureCombat(true, false));
  await settle(page);
  if (
    (await page.locator('#sw-combat-toggle').count()) &&
    (await page.locator('#sw-combat-toggle').isVisible())
  )
    await page.locator('#sw-combat-toggle').click();
  await settle(page);
  await page.locator('#sw-combat-tabs [data-sw-combat="player"]').click();
  await settle(page);
  await page.evaluate(() => window.fixtureCombatReplaceStats());
  await settle(page);
  assert.equal(
    await page.locator('#sw-combat-tabs').count(),
    1,
    'combat rerender does not duplicate actor strip',
  );
  await page.locator('.player-side .skill-row.selectable').first().scrollIntoViewIfNeeded();
  await page.locator('.player-side .skill-row.selectable').first().click();
  assert.equal(
    await page.evaluate(() => window.fixtureState.xpToggleClicks),
    1,
    'original XP handler retained',
  );
  await screenshot(page, 'combat-stats');
  await page.evaluate(() => window.fixtureCombat(false));
  await settle(page);
});

test('reroll popout stays in row and every option accessible', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="tasks"]').click();
  await settle(page);
  const row = page.locator('.uq-row[data-row-index="0"]');
  const container = row.locator('.icon-container');
  await userTap(page, '.uq-row[data-row-index="0"] .icon-option.selected');
  assert.equal(await container.evaluate((el) => el.classList.contains('tap-open')), true);
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.popoutChoices),
    [],
    'opening popout does not select task',
  );
  const wrapper = container.locator('.icons-wrapper');
  visibleRect(await wrapper.boundingBox(), w, h);
  const openBox = await wrapper.boundingBox();
  const rowBox = await row.boundingBox();
  assert(
    openBox.y + openBox.height <= rowBox.y + rowBox.height + 1,
    'expanded options remain inside row ' + JSON.stringify({ openBox, rowBox }),
  );
  const clip = await wrapper.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    overflowX: getComputedStyle(el).overflowX,
  }));
  assert(
    clip.scrollWidth <= clip.clientWidth + 1 || ['auto', 'scroll'].includes(clip.overflowX),
    'overflowing options are scrollable',
  );
  const choice = container.locator('.icon-option').nth(7);
  await choice.scrollIntoViewIfNeeded();
  visibleRect(await choice.boundingBox(), w, h);
  await choice.tap();
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.popoutChoices),
    [],
    'first option tap previews only',
  );
  await choice.tap();
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.popoutChoices),
    ['0:7'],
    'second tap invokes original task choice once',
  );
  const reroll = container.locator('.reroll-option[data-lane="slay"]');
  await reroll.scrollIntoViewIfNeeded();
  visibleRect(await reroll.boundingBox(), w, h);
  await reroll.tap();
  assert.equal(await page.evaluate(() => window.fixtureState.rerollClicks), 0);
  await reroll.tap();
  assert.equal(
    await page.evaluate(() => window.fixtureState.rerollClicks),
    1,
    'only confirmation tap rerolls',
  );
  await screenshot(page, 'reroll');
  // Bottom rows exercise clipping by the queue's scroll ancestor.
  const last = page.locator('.uq-row[data-row-index="9"]');
  await last.scrollIntoViewIfNeeded();
  await last.locator('.icon-option.selected').tap();
  await settle(page);
  visibleRect(await last.locator('.icons-wrapper').boundingBox(), w, h);
  await last.locator('.reroll-option').last().scrollIntoViewIfNeeded();
  visibleRect(await last.locator('.reroll-option').last().boundingBox(), w, h);
});

test('chat filters and labels do not overlap', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="chat"]').click();
  await settle(page);
  const boxes = await page.locator('.chat-filter-btn').evaluateAll((elements) =>
    elements.map((el) => {
      const label = el.querySelector('.chat-filter-label');
      const r = label.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return {
        text: label.textContent,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        button: { x: b.x, y: b.y, width: b.width, height: b.height },
        scroll: label.scrollWidth,
        client: label.clientWidth,
      };
    }),
  );
  for (const entry of boxes) {
    visibleRect(entry.button, w, h);
    assert(
      entry.button.width >= 44 && entry.button.height >= 44,
      'filter tap target ' + entry.text,
    );
    assert(
      entry.rect.x >= entry.button.x - 1 &&
        entry.rect.x + entry.rect.width <= entry.button.x + entry.button.width + 1,
      'label fits button ' + JSON.stringify(entry),
    );
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].rect;
      const b = boxes[j].rect;
      assert(
        !(
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
        ),
        'filter label overlap',
      );
    }
  await page.locator('.chat-filter-btn[data-chat-filter="proximity"]').click();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.filterClicks), ['proximity']);
  visibleRect(await page.locator('.chat-input').boundingBox(), w, h);
  await screenshot(page, 'chat');
});

test('hidden quest tab strip consumes no height', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureQuestCompact());
  await settle(page);
  const tabs = await page.locator('.modal-tabs').evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    display: getComputedStyle(el).display,
  }));
  assert.equal(tabs.display, 'none');
  assert.equal(tabs.height, 0, 'hidden tab strip stays zero height');
  const overlay = await page.locator('.modal-overlay').boundingBox();
  const header = await page.locator('.modal-header').boundingBox();
  assert(
    header.y - overlay.y <= 12,
    'no reserved blank row above quests ' + JSON.stringify({ overlay, header }),
  );
  visibleRect(await page.locator('.modal-close').boundingBox(), w, h);
  await page.locator('.modal-close').click();
  await page.evaluate(() => (document.querySelector('.modal-tabs').style.display = ''));
});

test('skill activities locations and history use separate mobile sections', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureSkillCustom('individual'));
  await settle(page);
  await expect(page.locator('#sw-skill-tabs button')).toHaveCount(3);
  await expect(page.locator('#activities-column')).toBeVisible();
  await expect(page.locator('#nodes-column')).toBeHidden();
  await expect(page.locator('.skill-custom-tab .history-sidebar')).toBeHidden();
  await screenshot(page, 'skill-activities');
  const button = page.locator('#activities-column .ctrl-btn').first();
  await button.scrollIntoViewIfNeeded();
  visibleRect(await button.boundingBox(), w, h);
  await button.click();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.activityControlClicks), [
    [0, 0, '-1'],
  ]);
  await page.locator('#sw-skill-tabs [data-sw-skill="nodes"]').click();
  await settle(page);
  await expect(page.locator('#activities-column')).toBeHidden();
  await expect(page.locator('#nodes-column')).toBeVisible();
  await screenshot(page, 'skill-locations');
  const last = page.locator('#nodes-column .node-row').last().locator('.ctrl-btn').last();
  await last.scrollIntoViewIfNeeded();
  visibleRect(await last.boundingBox(), w, h);
  await last.click();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.nodeControlClicks), [
    [11, 1, '1'],
  ]);
  await page.locator('#sw-skill-tabs [data-sw-skill="history"]').click();
  await settle(page);
  await expect(page.locator('.skill-custom-tab .history-sidebar')).toBeVisible();
  await expect(page.locator('#activities-column')).toBeHidden();
  await expect(page.locator('#nodes-column')).toBeHidden();
  await page.locator('.skill-custom-tab .history-row').last().scrollIntoViewIfNeeded();
  visibleRect(await page.locator('.skill-custom-tab .history-row').last().boundingBox(), w, h);
  await screenshot(page, 'skill-history');
});

test('skill weights and unlocks remain reachable after original content rerender', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureSkillCustom('individual'));
  await settle(page);
  await page.locator('#sw-skill-tabs [data-sw-skill=history]').click();
  await settle(page);
  await page.locator('.skill-custom-tab .history-row').last().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.fixtureSkillCustom('total'));
  await settle(page);
  assert.equal(
    await page.locator('#sw-skill-tabs').count(),
    1,
    'original content rerender has one section strip',
  );
  await expect(page.locator('#sw-skill-tabs button')).toHaveCount(3);
  await expect(page.locator('.skill-columns-section')).toBeVisible();
  await expect(page.locator('.unlocks-grid-section')).toBeHidden();
  await page.locator('#sw-skill-tabs [data-sw-skill="weights"]').click();
  await settle(page);
  assert.equal(
    await page.locator('.modal-body').evaluate((el) => el.scrollTop),
    0,
    'section tap resets retained history scroll',
  );
  assert.equal(await page.locator('#tab-skillcustom').evaluate((el) => el.scrollTop), 0);
  await screenshot(page, 'skill-weights');
  const first = page.locator('.skill-weight-row .ctrl-btn').first();
  await first.scrollIntoViewIfNeeded();
  visibleRect(await first.boundingBox(), w, h);
  const rect = await first.boundingBox();
  assert(rect.width >= 44 && rect.height >= 44);
  await first.click();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.skillWeightClicks), [
    ['skill-0-0', '-1'],
  ]);
  const last = page.locator('.skill-weight-row .ctrl-btn').last();
  await last.scrollIntoViewIfNeeded();
  visibleRect(await last.boundingBox(), w, h);
  await last.click();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.skillWeightClicks), [
    ['skill-0-0', '-1'],
    ['skill-2-8', '1'],
  ]);
  await page.locator('#sw-skill-tabs [data-sw-skill="unlocks"]').click();
  await settle(page);
  await expect(page.locator('.unlocks-grid-section')).toBeVisible();
  await expect(page.locator('.skill-columns-section')).toBeHidden();
  await page.locator('.unlock-item').last().scrollIntoViewIfNeeded();
  visibleRect(await page.locator('.unlock-item').last().boundingBox(), w, h);
  await screenshot(page, 'skill-unlocks');
  await page.locator('.skill-custom-tab .modal-close').click();
});

test('skill navbar first and last original icons avoid close button', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => {
    window.fixtureState.skillNavClicks = [];
    window.fixtureSkillCustom('individual');
  });
  await settle(page);
  for (const position of ['first', 'last']) {
    const icon = page.locator('.skill-custom-navbar .skill-custom-nav-icon')[position]();
    await icon.scrollIntoViewIfNeeded();
    const r = await icon.boundingBox();
    const close = await page.locator('.skill-custom-tab > .modal-close').boundingBox();
    visibleRect(r, w, h);
    assert(r.width >= 44 && r.height >= 44, 'original icon has44px tap target');
    assert(
      !(
        Math.min(r.x + r.width, close.x + close.width) - Math.max(r.x, close.x) > 1 &&
        Math.min(r.y + r.height, close.y + close.height) - Math.max(r.y, close.y) > 1
      ),
      'original icon is covered by close ' + JSON.stringify({ r, close }),
    );
    await icon.tap();
  }
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.skillNavClicks),
    [0, 19],
    'first and last original icon listeners fire once',
  );
  await screenshot(page, 'skill-navbar-last');
  await page.locator('.skill-custom-tab > .modal-close').click();
});

test('repetitive game mutations do not rescan navigation', async ({ page }) => {
  await settle(page);
  await page.evaluate(() => {
    window.fixtureScanAudit.nav = 0;
    window.fixtureScanAudit.all = 0;
  });
  await page.evaluate(async () => {
    const row = document.querySelector('.uq-row[data-row-index="5"]');
    for (let tick = 0; tick < 40; tick++) {
      const marker = document.createElement('span');
      marker.className = 'fixture-animation';
      marker.textContent = String(tick);
      row.append(marker);
      row.classList.toggle('fixture-ticking');
      marker.replaceWith(document.createElement('span'));
      row.lastChild.remove();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  });
  await page.waitForTimeout(350);
  const scans = await page.evaluate(() => ({ ...window.fixtureScanAudit }));
  assert(scans.nav <= 3, 'animation caused repeated nav scans ' + JSON.stringify(scans));
});

test('network APIs timers and game state retain identity', async ({ page }) => {
  const audit = await page.evaluate(() => ({
    apis: [
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'setTimeout',
      'setInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ].map((name) => [name, window[name] === window.fixtureCombatBaseline[name]]),
    network: window.fixtureState.networkCalls,
    gameplay:
      JSON.stringify(window.fixtureState.gameplay) === window.fixtureCombatBaseline.gameplay,
  }));
  assert(
    audit.apis.every((entry) => entry[1]),
    'original API identity ' + JSON.stringify(audit.apis),
  );
  assert.deepEqual(audit.network, []);
  assert(audit.gameplay, 'gameplay state unchanged');
});
