'use strict';

const { openSkills } = require('./support/navigation.cjs');
const { test, expect, read, BUNDLE, loadGame, settle } = require('./support/game.cjs');

test('Android bridge starts from a path-free HTTPS game origin', () => {
  const config = JSON.parse(read('capacitor.config.json'));
  const url = new URL(config.server.url);
  expect(url.protocol).toBe('https:');
  expect(config.server.url).toBe(url.origin);
  expect(config.android.useLegacyBridge).not.toBe(true);
});

for (const origin of [
  'https://store.steampowered.com',
  'https://scapewatch.com',
  'https://example.com',
]) {
  test(`origin guard excludes ${origin}`, async ({ page }) => {
    await loadGame(page, { origin });

    await expect(page.locator('#sw-shell')).toHaveCount(0);
    await expect(page.locator('#sw-mobile-style')).toHaveCount(0);
    expect(await page.evaluate(() => window.fixtureState.storageCalls)).toEqual([]);
  });
}

test('document-start injection and duplicate guard on alternate game origin', async ({ page }) => {
  await loadGame(page, {
    origin: 'https://alt.play.scapewatch.com',
    documentStart: true,
  });
  await page.addScriptTag({ content: BUNDLE });

  await expect(page.locator('#sw-shell')).toHaveCount(1);
  await expect(page.locator('#sw-mobile-style')).toHaveCount(1);
  await openSkills(page);
  await settle(page);
  expect(await page.evaluate(() => window.fixtureState.panelClicks.skills)).toBe(1);
});

test('embedded iframe guard', async ({ page }) => {
  await loadGame(page, { bundle: false });
  await page.evaluate((html) => {
    const frame = document.createElement('iframe');
    frame.srcdoc = html;
    document.body.append(frame);
  }, read('tests/fixtures/index.html'));

  const frame = page.frames().find((frame) => frame !== page.mainFrame());
  await frame.waitForLoadState();
  await frame.addScriptTag({ content: BUNDLE });
  await expect(frame.locator('#sw-shell')).toHaveCount(0);
});
