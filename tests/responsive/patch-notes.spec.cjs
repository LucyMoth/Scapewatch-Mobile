'use strict';

const { test, expect, loadGame } = require('../support/game.cjs');

async function openNotes(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-menu [data-sw-menu-section=display]').tap();
  await page.locator('#sw-notes-toggle').tap();
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`Patch notes open through the native control while logged in at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, { scripts: ['game.js', 'patch-notes.js'] });
    const panel = page.locator('.patch-notes-panel');
    await expect(panel).toBeHidden();
    await openNotes(page);
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.fixturePatchNotes.toggles)).toBe(1);
    await page.locator('.patch-notes-prev').tap();
    expect(await page.evaluate(() => window.fixtureState.patchNotesClicks)).toBe(1);
    expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
    await expect(panel).toBeHidden();
    await openNotes(page);
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.fixturePatchNotes.toggles)).toBe(1);
    expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
    await page.locator('.window-control-btn-patch-notes').evaluate((button) => button.click());
    await openNotes(page);
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.fixturePatchNotes.toggles)).toBe(3);
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('missing native Patch notes controls retain the existing unavailable message', async ({
  page,
}) => {
  await loadGame(page);
  await openNotes(page);
  await expect(page.locator('#sw-toast')).toHaveText(
    'Patch notes are available on the login screen.',
  );
  await expect(page.locator('.patch-notes-panel')).toBeHidden();
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
