'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectReachable, expectWithin, viewportBounds } = require('../support/responsive.cjs');

async function loadRaids(page, view = 'lobby') {
  await loadGame(page, {
    scripts: ['game.js', 'raids.js'],
    beforeAdapter: (page) =>
      page.evaluate((view) => {
        window.fixtureRaids(view);
        window.fixtureRaidEquipmentClicks = 0;
        window.fixtureRaidGearPlacements = Array.from(
          document.querySelectorAll('.raid-row-paperdoll, .raid-row-equip-stats'),
        ).map((node) => ({ node, parent: node.parentNode, next: node.nextSibling }));
        document.querySelector('.raid-row-paperdoll .inv-slot')?.addEventListener('click', () => {
          window.fixtureRaidEquipmentClicks++;
        });
        for (const action of document.querySelectorAll('.raid-browse-join.disabled')) {
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip';
          tooltip.innerHTML =
            '<div class="tt-line">Requires Slay Lv 50</div><div class="tt-line">Your loadout needs Avg Lv 90+ and a T9+ weapon</div>';
          action.append(tooltip);
        }
      }, view),
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} readable raid details`, () => {
    test.use({ viewport });

    test('party gear is optional while player controls and native inspection stay reachable', async ({
      page,
    }) => {
      await loadRaids(page);
      const first = page.locator('.raid-party-row-item.self');
      const details = first.locator('.sw-raid-equipment');
      await expect(page.locator('.sw-raid-equipment')).toHaveCount(4);
      await expect(details).not.toHaveAttribute('open');
      await expect(first.locator('.raid-row-paperdoll')).toBeHidden();
      const summary = details.locator('summary');
      await expectReachable(page, summary, { scroll: true });
      const before = await first.boundingBox();
      await summary.tap();
      await expect(first.locator('.raid-row-paperdoll')).toBeVisible();
      const slot = first.locator('.raid-row-paperdoll .inv-slot').first();
      await expectReachable(page, slot, { scroll: true });
      await slot.tap();
      expect(await page.evaluate(() => window.fixtureRaidEquipmentClicks)).toBe(1);
      await expectReachable(page, summary, { scroll: true });
      await summary.tap();
      expect((await first.boundingBox()).height).toBe(before.height);
      expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual([]);
      expect(
        await page.evaluate(() => window.fixtureRaidNodes.every((node) => node.isConnected)),
      ).toBe(true);
    });

    test('browser qualification is readable without activating Join and sort actions form two rows', async ({
      page,
    }) => {
      await loadRaids(page, 'browser');
      const column = page.locator('.raid-browse-col-dungeon');
      const sorts = await column.locator('.raid-browse-sortbtn').all();
      const first = await sorts[0].boundingBox();
      for (const sort of sorts) {
        const box = await sort.boundingBox();
        expect(box.y).toBe(first.y);
      }
      const create = await column.locator('.raid-browse-create').boundingBox();
      const refresh = await column.locator('.raid-browse-refresh').boundingBox();
      expect(create.y).toBe(refresh.y);
      expect(create.y).toBeGreaterThanOrEqual(first.y + first.height);
      const details = column.locator('.sw-raid-requirements');
      await expectReachable(page, details.locator('summary'), { scroll: true });
      await details.locator('summary').tap();
      await expect(details).toContainText('Requires Slay Lv 50');
      await expect(details).toContainText('Your loadout needs Avg Lv 90+ and a T9+ weapon');
      await expectWithin(details, await viewportBounds(page));
      expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}

test('Original UI and cached pages restore native raid gear placement and row rebuilds stay single', async ({
  page,
}) => {
  await loadRaids(page);
  const restored = () =>
    page.evaluate(() =>
      window.fixtureRaidGearPlacements.every(
        ({ node, parent, next }) => node.parentNode === parent && node.nextSibling === next,
      ),
    );
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await restored()).toBe(true);
  await expect(page.locator('.sw-raid-equipment')).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await settle(page);
  await expect(page.locator('.sw-raid-equipment')).toHaveCount(4);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  expect(await restored()).toBe(true);
  await expect(page.locator('.sw-raid-equipment')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await settle(page);
  await page.evaluate(() => window.fixtureRaids('lobby'));
  await settle(page);
  await expect(page.locator('.sw-raid-equipment')).toHaveCount(4);
  await expect(page.locator('.sw-raid-equipment .sw-raid-equipment')).toHaveCount(0);
  await page.evaluate(() => window.fixtureRaids('fortress'));
  await settle(page);
  await expect(page.locator('.sw-raid-equipment')).toHaveCount(0);
  await expect(page.locator('.raid-role-skill-row.clickable')).toHaveCount(20);
  expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual([]);
});
