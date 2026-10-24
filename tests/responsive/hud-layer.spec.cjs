'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { openSkills } = require('../support/navigation.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function wrapHud(page) {
  await page.evaluate(() => {
    const ui = document.getElementById('ui-container');
    const hud = document.createElement('div');
    hud.id = 'hud-layer';
    hud.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;zoom:1.4;--playable-center-x:686px';
    for (const node of [...ui.children]) {
      if (
        node.matches(
          '.uq-panel, .skills-panel, .inventory-panel, .quests-panel, .diary-panel, .equipment-panel, .friends-panel, .barter-panel, .panel-tab-bar, .floating-tab-strip, .hp-bar, .ingame-hud, .floating-current-task, .chat-panel, .active-potions-panel, .active-potions-pill',
        )
      ) {
        node.style.pointerEvents = 'auto';
        hud.append(node);
      }
    }
    ui.prepend(hud);
    const switchBack = document.createElement('button');
    switchBack.className = 'm-switch-back';
    switchBack.textContent = 'Phone layout';
    document.body.append(switchBack);
  });
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`HUD layer keeps dock sheets and native actions usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, { beforeAdapter: wrapHud });
    await expect(page.locator('#hud-layer > .panel-tab-bar')).toBeHidden();
    await expect(page.locator('#hud-layer > .floating-tab-strip')).toBeHidden();
    await expect(page.locator('.m-switch-back')).toBeHidden();
    expect(await page.locator('#hud-layer').evaluate((node) => getComputedStyle(node).zoom)).toBe(
      '1',
    );
    for (const [view, selector] of [
      ['tasks', '#unified-queue-panel'],
      ['inventory', '#bag-panel'],
    ]) {
      const button = page.locator(`#sw-nav [data-sw-view=${view}]`);
      await button.tap();
      const panel = page.locator(selector);
      await expect(panel).toBeVisible();
      const rect = await panel.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate((key) => window.fixtureState.panelClicks[key], view)).toBe(1);
      await button.tap();
      await expect(panel).toBeHidden();
    }
    await openSkills(page);
    await expect(page.locator('#hud-layer > #skills-panel')).toBeVisible();
    await expectReachable(page, page.locator('#sw-secondary-close'));
    const header = await page.locator('#sw-secondary-header').boundingBox();
    const panel = await page.locator('#skills-panel').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    await page.locator('#sw-secondary-close').tap();
    await expect(page.locator('#skills-panel')).toBeHidden();
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });

  test(`HUD layer supports native navigation replacement and Original UI at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, { beforeAdapter: wrapHud });
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.evaluate(() => {
      window.fixtureRerenderNav();
      const button = document.createElement('button');
      button.className = 'floating-tab-btn';
      button.dataset.tab = 'future-feature';
      button.textContent = 'Future feature';
      button.onclick = () => window.fixtureState.futureClicks++;
      window.fixtureState.futureClicks = 0;
      document.querySelector('#hud-layer > .floating-tab-strip').append(button);
    });
    const future = page.locator('#sw-menu [data-sw-target=future-feature]');
    await expect(future).toBeVisible();
    await future.tap();
    expect(await page.evaluate(() => window.fixtureState.futureClicks)).toBe(1);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    expect(await page.locator('#hud-layer').evaluate((node) => getComputedStyle(node).zoom)).toBe(
      '1.4',
    );
    await expect(page.locator('#hud-layer > .panel-tab-bar')).toBeVisible();
    await expect(page.locator('.m-switch-back')).toBeHidden();
    await page
      .locator('#hud-layer > .panel-tab-bar .panel-tab-btn[data-tab=skills]')
      .evaluate((button) => button.click());
    await page.locator('#sw-layout-toggle').tap();
    await expect(page.locator('#sw-secondary-title')).toHaveText('Skills');
    await expect(page.locator('#skills-panel')).toBeVisible();
    const previous = await page.locator('#sw-view-title').textContent();
    await page.evaluate(() => {
      const encounter = document.createElement('div');
      encounter.className = 'combat-encounter';
      encounter.innerHTML =
        '<div class="panel-tab-bar"><button class="panel-tab-btn" data-tab="tasks">Player</button></div>';
      document.getElementById('ui-container').append(encounter);
      encounter.querySelector('button').click();
    });
    await settle(page);
    await expect(page.locator('#sw-view-title')).toHaveText(previous);
  });
}

test('HUD layer retains the full-map task strip and restores the native queue', async ({
  page,
}) => {
  await loadMapGame(page, { beforeAdapter: wrapHud });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await expect(page.locator('html')).toHaveClass(/\bsw-map\b/);
  const queue = page.locator('#hud-layer > #unified-queue-panel');
  await expect(queue).toBeVisible();
  const rect = await queue.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(360);
  await page.locator('#sw-map-close').tap();
  await expect(page.locator('html')).not.toHaveClass(/\bsw-map\b/);
  await expect(queue).toBeHidden();
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  await expect(queue).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
