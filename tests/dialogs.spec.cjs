'use strict';

const assert = require('node:assert/strict');
const { returnToWorld } = require('./support/navigation.cjs');
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

test.beforeEach(async ({ page }) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => window.fixtureChatSeed());
    },
  });
});

test('welcome-back ledger has bounded card readable scroll and original Continue', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureWelcomeBack());
  await settle(page);
  bounds(await page.locator('.ledger-card').boundingBox(), w, h);
  for (const selector of ['.ledger-compact-left', '.ledger-compact-right']) {
    const r = await page.locator(selector).boundingBox();
    assert(
      r.x >= 0 && r.x + r.width <= w + 1,
      'ledger column does not overflow horizontally ' + JSON.stringify(r),
    );
  }
  await expect(page.locator('.ledger-card .ledger-table tbody tr')).toHaveCount(30);
  await expect(page.locator('.ledger-card .ledger-slot')).toHaveCount(35);
  await screenshot(page, 'welcome-back-top');
  const numeric = page.locator('.ledger-card .ledger-table tbody tr').last().locator('td').last();
  await numeric.scrollIntoViewIfNeeded();
  bounds(await numeric.boundingBox(), w, h);
  assert.equal(await numeric.textContent(), '+1,246');
  const loot = page.locator('.ledger-card .ledger-slot').last();
  await loot.scrollIntoViewIfNeeded();
  bounds(await loot.boundingBox(), w, h);
  await loot.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.ledgerSlotClicks), [34]);
  const cont = page.locator('.ledger-card .ledger-btn-primary');
  await cont.scrollIntoViewIfNeeded();
  bounds(await cont.boundingBox(), w, h);
  await screenshot(page, 'welcome-back-loot-bottom');
  await cont.tap();
  assert.equal(await page.evaluate(() => window.fixtureState.ledgerContinue), 1);
  await expect(page.locator('.ledger-return-overlay')).toHaveCount(0);
});

test('full Ledger preserves all seven columns and last loot item', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureLedger());
  await settle(page);
  bounds(await page.locator('.modal-close').boundingBox(), w, h);
  await page.locator('.ledger-tab').last().tap();
  assert.equal(await page.evaluate(() => window.fixtureState.ledgerFilter), 1);
  const cells = page.locator('.ledger-table tbody tr').last().locator('td');
  assert.equal(await cells.count(), 7);
  await cells.last().scrollIntoViewIfNeeded();
  bounds(await cells.last().boundingBox(), w, h);
  assert.equal(await cells.last().textContent(), '+1,246');
  const loot = page.locator('.ledger-slot').last();
  await loot.scrollIntoViewIfNeeded();
  bounds(await loot.boundingBox(), w, h);
  await loot.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.ledgerSlotClicks), [34]);
  await screenshot(page, 'ledger-loot-bottom');
  await page.locator('.modal-close').tap();
});

test('Customize preview categories and last slot controls remain original and reachable', async ({
  page,
}) => {
  const { width: w, height: h } = page.viewportSize();
  await page.evaluate(() => window.fixtureCustomize());
  await settle(page);
  await screenshot(page, 'customize-top');
  for (const selector of ['.creator-preview', '.creator-sidebar', '.creator-center']) {
    const r = await page.locator(selector).boundingBox();
    assert(
      r.x >= 0 && r.x + r.width <= w + 1,
      'creator part does not overflow horizontally ' + JSON.stringify({ selector, r }),
    );
  }
  await page.locator('.cc-dir-btns button').last().scrollIntoViewIfNeeded();
  await page.locator('.cc-dir-btns button').last().tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.creatorDirections), [3]);
  await page.locator('.cc-save-btn').first().scrollIntoViewIfNeeded();
  bounds(await page.locator('.cc-save-btn').first().boundingBox(), w, h);
  await page.locator('.cc-save-btn').first().tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.creatorActions), ['Save']);
  const category = page.locator('.creator-sidebar .cat-btn').last();
  await category.scrollIntoViewIfNeeded();
  bounds(await category.boundingBox(), w, h);
  await category.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.creatorCategory), [11]);
  const select = page.locator('.cc-slot-row select').last();
  await select.scrollIntoViewIfNeeded();
  bounds(await select.boundingBox(), w, h);
  await select.selectOption('long');
  assert.deepEqual(await page.evaluate(() => window.fixtureState.creatorSelect), [[13, 'long']]);
  const arrow = page.locator('.cc-slot-row .cc-slot-arrow').last();
  bounds(await arrow.boundingBox(), w, h);
  await arrow.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.creatorSelect), [
    [13, 'long'],
    [13, 'next'],
  ]);
  await screenshot(page, 'customize-last-slot');
  await page.locator('.modal-close').tap();
});

test('top task previews do not cover original choice or reroll controls', async ({ page }) => {
  const { width: w, height: h } = page.viewportSize();
  await page.locator('#sw-nav [data-sw-view="tasks"]').tap();
  await settle(page);
  const row = page.locator('.uq-row[data-row-index="0"]');
  const container = row.locator('.icon-container');
  await container.locator('.icon-option.selected').tap();
  await settle(page);
  const choice = container.locator('.icon-option').nth(1);
  await choice.scrollIntoViewIfNeeded();
  await choice.tap();
  await settle(page);
  assert.deepEqual(
    await page.evaluate(() => window.fixtureState.popoutChoices),
    [],
    'preview still requires confirmation',
  );
  const tooltipRects = await page
    .locator('.icon-tooltip,.global-tooltip,.sw-task-preview')
    .evaluateAll((nodes) =>
      nodes
        .filter(
          (node) =>
            getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height > 0,
        )
        .map((node) => {
          const r = node.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            className: node.className,
            id: node.id,
          };
        }),
    );
  const optionRects = await container.locator('.icon-option,.reroll-option').evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  for (const tip of tooltipRects) {
    bounds(tip, w, h);
    assert(
      optionRects.every((option) => !overlaps(tip, option)),
      'preview obscures an original option ' + JSON.stringify(tip),
    );
  }
  await screenshot(page, 'top-task-preview');
  await choice.tap();
  assert.deepEqual(await page.evaluate(() => window.fixtureState.popoutChoices), ['0:1']);
  const reroll = container.locator('.reroll-option').first();
  await reroll.scrollIntoViewIfNeeded();
  await reroll.tap();
  await settle(page);
  await reroll.tap();
  assert.equal(await page.evaluate(() => window.fixtureState.rerollClicks), 1);
  await page.locator('.uq-controls .uq-credits').scrollIntoViewIfNeeded();
  await page.locator('.uq-controls .uq-credits').tap();
  await settle(page);
  await screenshot(page, 'global-task-tooltip');
  const global = page.locator('.global-tooltip');
  if (await global.isVisible()) {
    bounds(await global.boundingBox(), w, h);
    assert(
      !overlaps(await global.boundingBox(), await row.boundingBox()),
      'global tooltip avoids first task row',
    );
  }
  await page.evaluate(() => window.fixtureGlobalTaskTooltip(false));
  await returnToWorld(page);
});
