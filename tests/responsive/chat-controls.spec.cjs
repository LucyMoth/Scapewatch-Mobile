'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} native chat controls`, () => {
    test.use({ viewport });

    test('A− and A+ resize history while the composer stays stable and collapse is hidden', async ({
      page,
    }) => {
      await loadGame(page, { scripts: ['game.js', 'combat.js'] });
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      const panel = page.locator('#chat-panel');
      const history = panel.locator('.chat-message-area');
      const input = panel.locator('.chat-input');
      const room = panel.locator('.chat-room-pill');
      const label = panel.locator('.chat-channel-label');
      const smaller = panel.locator('.chat-font-btn').filter({ hasText: 'A−' });
      const larger = panel.locator('.chat-font-btn').filter({ hasText: 'A+' });
      await input.fill('A retained chat draft');
      const inputBefore = await input.boundingBox();
      const roomBefore = await room.boundingBox();
      const listeners = await page.evaluate(() => window.fixtureState.listeners.length);
      await expect(panel.locator('.chat-toggle-btn')).toBeHidden();
      for (const control of [smaller, larger, ...(await panel.locator('.chat-filter-btn').all())]) {
        await expectReachable(page, control);
      }
      await expect(history).toHaveCSS('font-size', '16px');
      await larger.tap();
      await expect(history).toHaveCSS('font-size', '18px');
      await larger.tap();
      await expect(history).toHaveCSS('font-size', '20px');
      await smaller.tap();
      await expect(history).toHaveCSS('font-size', '18px');
      await smaller.tap();
      await expect(history).toHaveCSS('font-size', '16px');
      await settle(page);
      await expect(input).toHaveCSS('font-size', '16px');
      await expect(label).toHaveCSS('font-size', '13px');
      await expect(input).toHaveValue('A retained chat draft');
      expect(await input.boundingBox()).toEqual(inputBefore);
      expect(await room.boundingBox()).toEqual(roomBefore);
      expect(await page.evaluate(() => window.fixtureState.chatFontClicks)).toEqual([2, 2, -2, -2]);
      expect(await page.evaluate(() => window.fixtureState.listeners.length)).toBe(listeners);
      expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
        await page.evaluate(() => window.fixtureOriginalGameplay),
      );
      await screenshot(page, 'native-chat-font-controls');
    });

    test('long direct-message recipients wrap inside their clickable label and leave the composer usable', async ({
      page,
    }) => {
      await loadGame(page, {
        scripts: ['game.js', 'combat.js'],
        beforeAdapter: (page) =>
          page.evaluate(() => {
            const label = document.querySelector('.chat-channel-label');
            label.textContent = '[Adventurer_With_Long_Name24]';
            window.fixtureLongDmLabel = label;
            window.fixtureChatChannelClicks = 0;
            label.addEventListener('click', () => {
              window.fixtureChatChannelClicks++;
              label.textContent = '[World]';
            });
          }),
      });
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      const panel = page.locator('#chat-panel');
      const label = panel.locator('.chat-channel-label');
      const input = panel.locator('.chat-input');
      await expect(label).toHaveText('[Adventurer_With_Long_Name24]');
      await expectReachable(page, label);
      await expectReachable(page, input);
      expect(
        await label.evaluate((label) => {
          const box = label.getBoundingClientRect();
          const input = document.querySelector('.chat-input').getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(label);
          return (
            label === window.fixtureLongDmLabel &&
            box.right <= input.left &&
            Array.from(range.getClientRects()).every(
              (line) => line.left >= box.left - 1 && line.right <= box.right + 1,
            )
          );
        }),
        'Every recipient text line stays inside its original clickable label and clears the input',
      ).toBe(true);
      await input.fill('A retained direct-message draft');
      await label.tap();
      await expect(label).toHaveText('[World]');
      expect(await page.evaluate(() => window.fixtureChatChannelClicks)).toBe(1);
      await expect(input).toHaveValue('A retained direct-message draft');
      await input.press('Enter');
      expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([
        'A retained direct-message draft',
      ]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}
