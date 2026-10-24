'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable, expectWithin, viewportBounds } = require('../support/responsive.cjs');

async function world(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
    beforeAdapter: (page) =>
      page.evaluate(() => {
        window.fixtureWorldScene({ combat: false, footer: 'compact', potions: 'expanded' });
        window.fixtureCommunityChat();
        const guide = document.createElement('div');
        guide.className = 'tutorial-checklist';
        guide.innerHTML =
          '<div class="tutorial-checklist-header"><span class="tutorial-checklist-title">How to Scapewatch</span></div><div class="tutorial-checklist-list">' +
          Array.from(
            { length: 6 },
            (_, i) =>
              `<div class="tutorial-checklist-row"><span class="tutorial-checklist-mark">✓</span><span class="tutorial-checklist-name">Getting started: step ${i + 1}</span></div>`,
          ).join('') +
          '</div>';
        document.getElementById('ui-container').append(guide);
        for (const name of ['xp-drops-container', 'loot-drop-zone', 'celebration-container']) {
          const zone = document.createElement('div');
          zone.className = name;
          zone.textContent = '+1';
          document.body.append(zone);
        }
      }),
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test(`World HUD keeps native player and potion controls compact at ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await world(page);
    const player = page.locator('.ingame-hud');
    const potions = page.locator('.active-potions-panel');
    const guide = page.locator('.tutorial-checklist');
    await expectReachable(page, page.locator('.ingame-hud-info'));
    await expect(player).toBeVisible();
    await expect(potions).toBeVisible();
    await expect(guide).toBeVisible();
    const guideBox = await expectWithin(guide, await viewportBounds(page));
    for (const panel of [potions, player]) {
      const box = await panel.boundingBox();
      expect(
        guideBox.x + guideBox.width <= box.x ||
          box.x + box.width <= guideBox.x ||
          guideBox.y + guideBox.height <= box.y ||
          box.y + box.height <= guideBox.y,
      ).toBe(true);
    }
    const mini = page.locator('#sw-mini-chat');
    await expect(mini).toBeVisible();
    await potions.tap();
    await expect(potions).toBeHidden();
    const pill = page.locator('.active-potions-pill');
    await expectReachable(page, pill);
    const box = await expectWithin(pill, await viewportBounds(page));
    expect(box.width).toBe(44);
    expect(box.height).toBe(44);
    await pill.tap();
    await expect(potions).toBeVisible();
    await settle(page);
    expect(
      await page.evaluate(() =>
        parseFloat(document.documentElement.style.getPropertyValue('--sw-mini-height')),
      ),
    ).toBeGreaterThan(0);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    await expect(player).toBeVisible();
    await expect(potions).toBeVisible();
    await expect(guide).toBeVisible();
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('World HUD waits for character data and follows logout and native replacement', async ({
  page,
}) => {
  await world(page);
  await page.locator('.ingame-hud-name').evaluate((node) => (node.textContent = ''));
  await expect(page.locator('.ingame-hud')).toBeHidden();
  await expect(page.locator('.active-potions-panel')).toBeHidden();
  await page.locator('.ingame-hud-name').evaluate((node) => (node.textContent = 'Adventurer'));
  await expect(page.locator('.ingame-hud')).toBeVisible();
  await page.evaluate(() => window.fixtureLogin(true));
  await expect(page.locator('.ingame-hud')).toBeHidden();
  await page.evaluate(() => window.fixtureLogin(false));
  await expect(page.locator('.ingame-hud')).toBeVisible();
  await page.evaluate(() => window.fixtureHudDetailed(true));
  await expect(page.locator('.ingame-hud-info')).not.toHaveClass(/expanded/);
  await page.evaluate(() =>
    window.fixtureWorldScene({ combat: true, footer: 'detailed', potions: 'expanded' }),
  );
  await settle(page);
  await expect(page.locator('.active-potions-panel')).toBeVisible();
});

test('no World HUD is visible before the first character name arrives', async ({ page }) => {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
    beforeAdapter: (page) =>
      page.evaluate(() => {
        window.fixtureWorldScene({ combat: false });
        document.querySelector('.ingame-hud-name').textContent = '';
      }),
  });
  await expect(page.locator('.ingame-hud')).toBeHidden();
  await expect(page.locator('.active-potions-pill')).toBeHidden();
  await page.locator('.ingame-hud-name').evaluate((node) => (node.textContent = 'Adventurer'));
  await expect(page.locator('.ingame-hud')).toBeVisible();
  await expect(page.locator('.active-potions-pill')).toBeVisible();
});

test('Gain animations stay behind menus and return after hidden overlays', async ({ page }) => {
  await world(page);
  const gains = page.locator('.xp-drops-container');
  await expect(gains).toBeVisible();
  await page.evaluate(() => {
    const prompt = document.createElement('div');
    prompt.className = 'steam-prompt-overlay';
    prompt.style.display = 'none';
    document.body.append(prompt);
  });
  await expect(gains).toBeVisible();
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  await expect(gains).toBeHidden();
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  await expect(gains).toBeVisible();
  await page.evaluate(
    () => (document.querySelector('.steam-prompt-overlay').style.display = 'flex'),
  );
  await expect(gains).toBeHidden();
  await page.evaluate(
    () => (document.querySelector('.steam-prompt-overlay').style.display = 'none'),
  );
  await expect(gains).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
