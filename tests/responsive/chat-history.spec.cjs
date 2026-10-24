'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const { expectReachable } = require('../support/responsive.cjs');

async function loadHistory(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js'],
    beforeAdapter: (page) =>
      page.evaluate(() => {
        const area = document.querySelector('.chat-message-area');
        window.fixtureNativeChatRow = function (options) {
          const row = window.fixtureChatRow({ staff: false, world: false, ...options });
          if (options.sender && options.channel !== 'game' && !options.event)
            row.lastChild.className = 'chat-text';
          row
            .querySelector('.chat-sender-name')
            ?.addEventListener('click', () => window.fixtureSenderClicks.push(options.sender));
          return row;
        };
        window.fixtureSenderClicks = [];
        window.fixtureNativeHistory = [
          { sender: 'Alice', text: 'First line', staff: true },
          { sender: 'Alice', text: 'Second line' },
          { sender: 'Alice', text: 'New minute', timestamp: '00:52' },
          { sender: 'Alice', text: 'Different channel', timestamp: '00:52', channel: 'clan' },
          { sender: 'Alice', text: 'System event', timestamp: '00:52', channel: 'game' },
          { sender: 'Alice', text: 'Back to clan', timestamp: '00:52', channel: 'clan' },
          {
            sender: 'Alice',
            text: 'Named system event',
            timestamp: '00:52',
            channel: 'clan',
            event: true,
          },
          { sender: 'Alice', text: 'After named event', timestamp: '00:52', channel: 'clan' },
        ].map(window.fixtureNativeChatRow);
        area.replaceChildren(...window.fixtureNativeHistory);
        const label = document.querySelector('.chat-channel-label');
        const room = document.querySelector('.chat-room-pill');
        room.replaceChildren();
        const roomLabel = document.createElement('span');
        roomLabel.className = 'chat-room-pill-label';
        roomLabel.textContent = 'EN · W1';
        room.append(roomLabel, document.createTextNode(' ▾'));
        label.textContent = '[EN · W1]';
        label.style.color = '#88ccff';
        document.querySelector('[data-chat-filter=global]').style.color = '#88ccff';
        document.querySelector('[data-chat-filter=friends]').style.color = '#88ff88';
        window.fixtureChannelClicks = 0;
        label.addEventListener('click', () => {
          window.fixtureChannelClicks++;
          label.textContent = '[EN · W1]';
          label.style.color = '#88ccff';
        });
      }),
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} readable chat history`, () => {
    test.use({ viewport });

    test('messages flow evenly with timestamps and reserve badge space only when a badge exists', async ({
      page,
    }) => {
      await loadHistory(page);
      const preview = page.locator('#sw-mini-messages');
      await expect(preview).toContainText('After named event');
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      const rows = page.locator('.chat-message-area > .chat-message');
      await expect(rows).toHaveCount(8);
      await expect(rows.first().locator('.chat-badge-slot')).toBeVisible();
      for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
        await expect(rows.nth(index).locator('.chat-timestamp')).toHaveCSS('visibility', 'visible');
        await expect(rows.nth(index)).toHaveCSS('margin-top', '0px');
        await expect(rows.nth(index)).toHaveCSS('padding-top', '0px');
        await expect(rows.nth(index)).toHaveCSS('border-top-width', '0px');
      }
      await expect(rows.nth(1).locator('.chat-badge-slot')).toBeHidden();
      const timestamp = await rows.nth(1).locator('.chat-timestamp').boundingBox();
      const name = await rows.nth(1).locator('.chat-sender-name').boundingBox();
      expect(name.x - timestamp.x - timestamp.width).toBeLessThanOrEqual(8);
      const sender = rows.nth(1).locator('.chat-sender-name');
      await expect(sender).toBeVisible();
      await sender.tap();
      expect(await page.evaluate(() => window.fixtureSenderClicks)).toEqual(['Alice']);
      expect(
        await page.evaluate(() =>
          Array.from(document.querySelector('.chat-message-area').children).every(
            (row, index) => row === window.fixtureNativeHistory[index],
          ),
        ),
      ).toBe(true);
      expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
      await screenshot(page, 'chat-message-spacing');
    });

    test('duplicate room labels collapse while direct-message recipients retain their native click handler and draft', async ({
      page,
    }) => {
      await loadHistory(page);
      await page.locator('#sw-nav [data-sw-view=chat]').tap();
      const label = page.locator('.chat-channel-label');
      const room = page.locator('.chat-room-pill');
      const input = page.locator('.chat-input');
      await expect(label).toBeHidden();
      await expectReachable(page, room);
      await input.fill('Retained private draft');
      await page.evaluate(() => {
        document.querySelector('.chat-channel-label').textContent = '[Adventurer_With_Long_Name24]';
        document.querySelector('.chat-channel-label').style.color = '#88ff88';
      });
      await expect(label).toBeVisible();
      await expectReachable(page, label);
      await expectReachable(page, input);
      await page.evaluate(() => {
        document.querySelector('.chat-channel-label').textContent = '[EN · W1]';
      });
      await expect(label).toBeVisible();
      await label.tap();
      await expect(label).toBeHidden();
      await expect(input).toHaveValue('Retained private draft');
      expect(await page.evaluate(() => window.fixtureChannelClicks)).toBe(1);
      expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([]);
    });

    test('native history replacement and live sender changes preserve flowing native rows', async ({
      page,
    }) => {
      await loadHistory(page);
      await page.evaluate(() => {
        const area = document.querySelector('.chat-message-area');
        const fresh = area.cloneNode(false);
        window.fixtureNativeHistory = [
          { sender: 'Bob', text: 'New history' },
          { sender: 'Bob', text: 'A continuation' },
        ].map(window.fixtureNativeChatRow);
        fresh.append(...window.fixtureNativeHistory);
        area.replaceWith(fresh);
      });
      await settle(page);
      const row = page.locator('.chat-message-area .chat-message').nth(1);
      await expect(row.locator('.chat-timestamp')).toHaveCSS('visibility', 'visible');
      await row.locator('.chat-sender-name').evaluate((node) => {
        node.textContent = 'César';
      });
      await expect(row.locator('.chat-timestamp')).toHaveCSS('visibility', 'visible');
      await expect(page.locator('#sw-mini-messages')).toContainText('César: A continuation');
      expect(
        await page.evaluate(
          () =>
            document.querySelectorAll('.chat-message-area .chat-message')[1] ===
            window.fixtureNativeHistory[1],
        ),
      ).toBe(true);
    });

    test('Original UI restores native badge reservation and mobile spacing survives page restoration', async ({
      page,
    }) => {
      await loadHistory(page);
      const row = page.locator('.chat-message-area .chat-message').nth(1);
      const badge = row.locator('.chat-badge-slot');
      await expect(badge).toHaveCSS('display', 'none');
      await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
      await expect(badge).toHaveCSS('display', 'inline-block');
      await expect(page.locator('.sw-chat-channel-repeated')).toHaveCount(0);
      await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
      await expect(badge).toHaveCSS('display', 'none');
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      await expect(page.locator('.sw-chat-channel-repeated')).toHaveCount(0);
      await page.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
      );
      await expect(row.locator('.chat-timestamp')).toHaveCSS('visibility', 'visible');
      await expect(badge).toHaveCSS('display', 'none');
      expect(await page.evaluate(() => window.fixtureState.messages)).toEqual([]);
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });
  });
}
