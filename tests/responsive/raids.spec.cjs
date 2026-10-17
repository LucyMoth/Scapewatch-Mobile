'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function expectFitted(page) {
  expect(
    await page.locator('#tab-raid').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    'Raids fits without horizontal page scrolling',
  ).toBe(true);
  expect(
    await page.evaluate(() => window.fixtureRaidNodes.every((node) => node.isConnected)),
    'Original raid nodes stay connected',
  ).toBe(true);
  expect(await page.locator('#game-container').evaluate((node) => node.scrollTop)).toBe(0);
  await expectReachable(page, page.locator('.modal-close'));
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} raids`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await loadGame(page, {
        scripts: ['game.js', 'raids.js'],
        beforeAdapter: (page) => page.evaluate(() => window.fixtureRaids()),
      });
    });

    test('Lobby browser fits both raid types and preserves native sorting, refresh and qualification', async ({
      page,
    }) => {
      await expectFitted(page);
      await expect(page.locator('.raid-browse-col')).toHaveCount(2);
      const dungeon = page.locator('.raid-browse-col-dungeon');
      for (const selector of [
        '.raid-browse-sortbtn',
        '.raid-browse-create',
        '.raid-browse-refresh',
      ]) {
        for (const action of await dungeon.locator(selector).all())
          await expectReachable(page, action, { scroll: true });
      }
      await dungeon.locator('.raid-browse-sortbtn').nth(1).tap();
      await dungeon.locator('.raid-browse-refresh').tap();
      const available = dungeon
        .locator('.raid-browse-row')
        .nth(1)
        .locator('.raid-browse-join')
        .last();
      await expectReachable(page, available, { scroll: true });
      await available.tap();
      const blocked = dungeon.locator('.raid-browse-join.disabled');
      await blocked.scrollIntoViewIfNeeded();
      await blocked.tap();
      expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual([
        'sort:Difficulty',
        'refresh:Dungeon',
        'join',
      ]);
      const fortress = page.locator('.raid-browse-col-skilling .raid-browse-create');
      await expectReachable(page, fortress, { scroll: true });
      await screenshot(page, 'raid-browser');
      await fortress.tap();
      await settle(page);
      await expect(page.locator('.raid-diff-name')).toHaveText('The Fortress');
      await expectFitted(page);
    });

    test('Party, loadout and lobby actions form a readable page with intact native handlers', async ({
      page,
    }) => {
      await page.locator('.raid-browse-continue').first().tap();
      await settle(page);
      await expectFitted(page);
      const actions = page.locator('.raid-action-row');
      const party = page.locator('.raid-party-section');
      const invites = page.locator('.raid-ctrl-col-left');
      const actionBounds = await actions.boundingBox();
      const partyBounds = await party.boundingBox();
      const inviteBounds = await invites.boundingBox();
      expect(actionBounds.y + actionBounds.height).toBeLessThanOrEqual(partyBounds.y);
      expect(partyBounds.y + partyBounds.height).toBeLessThanOrEqual(inviteBounds.y);
      const difficulty = page.locator('.raid-diff-btn').nth(1);
      await expectReachable(page, difficulty, { scroll: true });
      await difficulty.tap();
      const start = page.locator('.raid-start-btn');
      await expectReachable(page, start, { scroll: true });
      await start.tap();
      const kick = page.locator('.raid-party-kick').first();
      await expectReachable(page, kick, { scroll: true });
      await kick.tap();
      const lastInvite = page.locator('.raid-invite-listrow').last();
      await expectReachable(page, lastInvite, { scroll: true });
      await lastInvite.tap();
      const drops = page.locator('.raid-rare-tier-btn').last();
      await expectReachable(page, drops, { scroll: true });
      await drops.tap();
      expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual([
        'continue',
        'difficulty:Dire',
        'Start Raid',
        'kick:1',
        'friend:7',
        'drop-tier:5',
      ]);
      await expectFitted(page);
      await page.locator('.raid-party-row-item.self').scrollIntoViewIfNeeded();
      await screenshot(page, 'raid-party');
    });

    test('Fortress roles and Peek remain reachable and Original UI restores desktop sizing', async ({
      page,
    }) => {
      await page.evaluate(() => window.fixtureRaids('fortress'));
      await settle(page);
      await expectFitted(page);
      await expect(page.locator('.raid-row-gauntlet-preview')).toHaveCount(4);
      await expect(page.locator('.raid-row-gauntlet-strengths')).toHaveCount(4);
      await expect(page.locator('.raid-row-paperdoll')).toHaveCount(0);
      const role = page.locator('.raid-party-row-item.self .raid-role-skill-row.clickable').last();
      await expectReachable(page, role, { scroll: true });
      await role.tap();
      expect(await page.evaluate(() => window.fixtureState.raidActions)).toEqual(['role:4']);
      await page.evaluate(() => window.fixtureRaids('peek'));
      await settle(page);
      await expectFitted(page);
      const back = page.locator('.raid-peek-section .raid-browse-header .clan-action-btn').first();
      await expectReachable(page, back, { scroll: true });
      await back.tap();
      await settle(page);
      await page.locator('#sw-nav [data-sw-view=menu]').tap();
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
      expect(
        await page
          .locator('.raid-browse-row')
          .first()
          .evaluate((node) => getComputedStyle(node).display),
      ).toBe('flex');
      expect(
        await page.locator('.raid-content').evaluate((node) => getComputedStyle(node).overflow),
      ).toBe('hidden');
      expect(
        await page.evaluate(() => window.fixtureRaidNodes.every((node) => node.isConnected)),
      ).toBe(true);
    });
  });
}
