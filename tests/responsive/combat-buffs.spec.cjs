'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  expectReachable,
  expectWithin,
  viewportBounds,
  safeInsets,
} = require('../support/responsive.cjs');

function overlaps(first, second) {
  return (
    Math.min(first.x + first.width, second.x + second.width) > Math.max(first.x, second.x) + 1 &&
    Math.min(first.y + first.height, second.y + second.height) > Math.max(first.y, second.y) + 1
  );
}

async function loadCombatBuffs(page, cameraHidden = false) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js', 'buffs.js'],
    beforeAdapter: (page) =>
      page.evaluate((cameraHidden) => {
        window.fixtureCombatBuffs({ cameraHidden });
      }, cameraHidden),
  });
}

async function expectSeparateReturn(page, insets) {
  const camera = page.locator('.recenter-camera-btn');
  const panel = page.locator('.active-potions-panel');
  const bounds = await viewportBounds(page, insets);
  const cameraBounds = await expectWithin(camera, bounds);
  const panelBounds = await expectWithin(panel, bounds);
  expect(overlaps(cameraBounds, panelBounds), 'Expanded buffs clear the native return target').toBe(
    false,
  );
  await expectReachable(page, camera, { insets });
  await expectReachable(page, panel, { insets });
}

for (const viewport of [
  { width: 320, height: 460 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} expanded combat buffs`, () => {
    test.use({ viewport });

    test('a newly shown native return button is unobscured before geometry updates', async ({
      page,
    }) => {
      await loadCombatBuffs(page, true);
      expect(
        await page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--sw-camera-height'),
        ),
      ).toBe('0px');
      const immediate = await page.evaluate(() => {
        const camera = document.querySelector('.recenter-camera-btn');
        const panel = document.querySelector('.active-potions-panel');
        camera.style.display = '';
        document.querySelector('.active-potions-pill').click();
        const cameraRect = camera.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const hit = document.elementFromPoint(
          cameraRect.x + cameraRect.width / 2,
          cameraRect.y + cameraRect.height / 2,
        );
        return {
          camera: {
            x: cameraRect.x,
            y: cameraRect.y,
            width: cameraRect.width,
            height: cameraRect.height,
          },
          panel: {
            x: panelRect.x,
            y: panelRect.y,
            width: panelRect.width,
            height: panelRect.height,
          },
          returnIsUnobscured: hit === camera || camera.contains(hit),
        };
      });
      expect(
        overlaps(immediate.camera, immediate.panel),
        'The first layout already reserves the return slot',
      ).toBe(false);
      expect(immediate.returnIsUnobscured).toBe(true);
      await settle(page);
      await expectSeparateReturn(page);
      await page.locator('.recenter-camera-btn').tap();
      expect(await page.evaluate(() => window.fixtureState.recenterClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.potionCollapse)).toBe(0);
      await page.locator('.active-potions-panel').tap();
      await expect(page.locator('.active-potions-pill')).toBeVisible();
      await expectReachable(page, page.locator('.active-potions-pill'));
      expect(await page.evaluate(() => window.fixtureState.potionExpand)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.potionCollapse)).toBe(1);
      await screenshot(page, 'combat-buffs-return-recovered');
    });

    test('expanded buffs keep combat navigation, native return and the final row reachable', async ({
      page,
    }) => {
      await loadCombatBuffs(page);
      const insets = viewport.height > 500 || viewport.width >= 600 ? safeInsets : {};
      await page.evaluate((insets) => {
        for (const [edge, value] of Object.entries(insets)) {
          document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
        }
      }, insets);
      await settle(page);
      await page.locator('#sw-combat-toggle').tap();
      const listenerCount = await page.evaluate(() => window.fixtureState.listeners.length);
      await page.locator('.active-potions-pill').tap();
      await settle(page);
      await expectSeparateReturn(page, insets);
      for (const control of await page.locator('#sw-combat-tabs button').all()) {
        await expectReachable(page, control, { insets });
      }
      await expectReachable(page, page.locator('.btn-end-combat'), { insets });
      const lastCount = page.locator('.active-potions-panel .potion-row-count').last();
      await lastCount.scrollIntoViewIfNeeded();
      await expectWithin(lastCount, await viewportBounds(page, insets));
      expect(
        await lastCount.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return document
            .querySelector('.active-potions-panel')
            .contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }),
      ).toBe(true);
      await screenshot(page, 'combat-expanded-buffs-return');
      await page.locator('.active-potions-panel').tap();
      await expect(page.locator('.active-potions-pill')).toBeVisible();
      await page.locator('#sw-combat-close').tap();
      await expect(page.locator('#sw-combat-toggle')).toBeVisible();
      await expectReachable(page, page.locator('.recenter-camera-btn'), { insets });
      expect(await page.evaluate(() => window.fixtureState.listeners.length)).toBe(listenerCount);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
        await page.evaluate(() => window.fixtureOriginalGameplay),
      );
    });
  });
}
