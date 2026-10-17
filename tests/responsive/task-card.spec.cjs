'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  safeInsets,
  expectReachable,
  expectWithin,
  viewportBounds,
} = require('../support/responsive.cjs');
const { touch } = require('../support/map-input.cjs');
const { returnToWorld } = require('../support/navigation.cjs');

async function loadWorld(page, combat) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
    beforeAdapter: (page) =>
      page.evaluate(
        ({ insets, combat }) => {
          window.fixtureWorldScene({
            combat,
            footer: combat ? 'detailed' : 'compact',
            raid: false,
          });
          document.querySelector('.ingame-hud-info').click();
          document.querySelector('.ingame-hud-f2p').style.display = 'none';
          for (const [edge, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
        },
        { insets: safeInsets, combat },
      ),
  });
}

test('native combat action visibility and Original UI layout remain authoritative', async ({
  page,
}) => {
  await loadWorld(page, true);
  const task = page.locator('.floating-current-task');
  await page.evaluate(() => {
    const task = document.querySelector('.floating-current-task');
    task.classList.remove('combat-expanded');
    task.querySelector('.float-combat-info').style.display = 'none';
    task.querySelector('.float-combat-toggles').style.display = 'none';
  });
  await settle(page);
  for (const control of await page.locator('.float-combat-col, .float-toggle-pill').all())
    await expect(control).toBeHidden();
  const card = await task.boundingBox();
  const summary = await page.locator('.float-task-inner').boundingBox();
  expect(card.height - summary.height).toBeLessThanOrEqual(2);
  await page.evaluate(() => {
    const task = document.querySelector('.floating-current-task');
    task.classList.add('combat-expanded');
    task.querySelector('.float-combat-info').style.display = '';
    task.querySelector('.float-combat-toggles').style.display = '';
  });
  await settle(page);
  for (const control of await page.locator('.float-combat-col, .float-toggle-pill').all())
    await expectReachable(page, control, { insets: safeInsets });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  expect(await task.evaluate((element) => getComputedStyle(element).display)).toBe('block');
  expect(
    await page
      .locator('.float-combat-info')
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe('flex');
  expect(
    await page.locator('.ingame-hud-info').evaluate((element) => getComputedStyle(element).display),
  ).toBe('block');
  await page.locator('#sw-layout-toggle').tap();
  await returnToWorld(page);
  await settle(page);
  expect(await task.evaluate((element) => getComputedStyle(element).display)).toBe('grid');
  expect(await task.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
    true,
  );
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

for (const viewport of [
  { width: 320, height: 460 },
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} whole task card`, () => {
    test.use({ viewport });

    test('collapsed player status fills its touch row without a blank row underneath', async ({
      page,
    }) => {
      await loadWorld(page, false);
      const hud = page.locator('.ingame-hud');
      const info = page.locator('.ingame-hud-info');
      const box = await expectWithin(hud, await viewportBounds(page, safeInsets));
      expect(box.height).toBeLessThanOrEqual(48);
      await expectReachable(page, info, { insets: safeInsets });
      const name = await page.locator('.ingame-hud-name').boundingBox();
      const state = await page.locator('.ingame-hud-state').boundingBox();
      expect(state.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
      expect(box.y + box.height - state.y - state.height).toBeLessThanOrEqual(9);
      await info.tap();
      await settle(page);
      await expect(page.locator('.ingame-hud-online')).toBeVisible();
      await expectReachable(page, page.locator('.ingame-hud-world'), {
        insets: safeInsets,
        scroll: true,
      });
      await page.locator('.ingame-hud-world').tap();
      expect(await page.evaluate(() => window.fixtureState.hudWorld)).toBe(1);
      await info.tap();
      await settle(page);
      await expect(page.locator('.ingame-hud-online')).toBeHidden();
      expect((await hud.boundingBox()).height).toBeLessThanOrEqual(48);
      await screenshot(page, 'collapsed-filled-player-status');
    });

    test('summary and long native combat controls remain visible together and do not scroll', async ({
      page,
    }) => {
      await loadWorld(page, true);
      await page.evaluate(() => {
        const controls = document.querySelectorAll('.float-combat-col');
        controls[0].textContent = 'Loadout: ConcentratedPrecisionRangedLongbow';
        controls[1].textContent = 'Training: ExtendedAccuracySpecialization';
      });
      await settle(page);
      const task = page.locator('.floating-current-task');
      const card = await expectWithin(task, await viewportBounds(page, safeInsets));
      const summary = await page.locator('.float-task-inner').boundingBox();
      expect(summary.y).toBeGreaterThanOrEqual(card.y);
      expect(
        await task.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true);
      for (const control of await page.locator('.float-combat-col, .float-toggle-pill').all()) {
        await expectReachable(page, control, { insets: safeInsets });
        const box = await control.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(summary.y + summary.height);
        expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height + 1);
        expect(
          await control.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const rect = element.getBoundingClientRect();
            return [...range.getClientRects()].every(
              (text) =>
                text.left >= rect.left - 1 &&
                text.right <= rect.right + 1 &&
                text.top >= rect.top - 1 &&
                text.bottom <= rect.bottom + 1,
            );
          }),
          'Every action label fits its visible cell',
        ).toBe(true);
      }
      const cdp = await page.context().newCDPSession(page);
      const point = { x: card.x + card.width / 2, y: card.y + card.height - 8 };
      await touch(cdp, 'touchStart', point);
      for (const delta of [12, 24, 48])
        await touch(cdp, 'touchMove', { ...point, y: point.y - delta });
      await touch(cdp, 'touchEnd');
      await cdp.detach();
      expect(await task.evaluate((element) => element.scrollTop)).toBe(0);
      expect(await task.boundingBox()).toEqual(card);
      for (const control of await page.locator('.float-combat-col, .float-toggle-pill').all())
        await control.tap();
      expect(await page.evaluate(() => window.fixtureState.v4FooterActions)).toEqual([
        'loadout',
        'training',
        'auto',
      ]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      await screenshot(page, 'whole-native-combat-task-card');
    });
  });
}
