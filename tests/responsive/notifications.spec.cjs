'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');

async function loadNotifications(page) {
  await loadGame(page, {
    scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js', 'notifications.js'],
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        window.fixtureWorldScene();
        window.fixtureCommunityChat();
      }),
  });
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test(`native celebration banners stay compact at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadNotifications(page);
    for (const type of ['task', 'level', 'quest']) {
      await page.evaluate((type) => {
        const card = window.fixtureCelebration(type);
        card.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = 1200;
        });
      }, type);
      const card = page.locator('.celebration-container > div');
      const bounds = await card.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.height).toBeLessThan(120);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      const health = await page.locator('.hp-bar').boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(health.y + health.height);
      expect(bounds.y + bounds.height).toBeLessThan(viewport.height - 60);
      expect(await card.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe(
        'none',
      );
      await screenshot(page, `notification-${type}`);
    }
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await expect(page.locator('#sw-menu')).toBeVisible();
  });
}

test('Original UI restores native celebration sizing and notification preferences', async ({
  page,
}) => {
  await loadNotifications(page);
  await page.evaluate(() => {
    window.fixtureCelebration('task');
    document.body.classList.add('hide-notif-bg');
  });
  await expect(page.locator('.celeb-task')).toHaveCSS('padding', '0px');
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  await expect(page.locator('.celebration-container')).toHaveCSS('width', '800px');
  await expect(page.locator('.celeb-task-text')).toHaveCSS('font-size', '56px');
  await expect(page.locator('body')).toHaveClass(/hide-notif-bg/);
});
