'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { openAbout, expectPlaying } = require('../support/about.cjs');
const { nativeSnapshot } = require('../support/responsive.cjs');

test('bundled animation loads only for About, loops silently, and pauses when the panel closes', async ({
  page,
}) => {
  await loadGame(page);
  const video = page.locator('#sw-about-video');
  expect(await video.getAttribute('src')).toBeNull();
  const before = await nativeSnapshot(page);
  await openAbout(page);
  await expectPlaying(video);
  const media = await video.evaluate((element) => ({
    source: element.src.startsWith('data:video/webm;base64,'),
    loop: element.loop,
    muted: element.muted,
    inline: element.playsInline,
    duration: element.duration,
    width: element.videoWidth,
    height: element.videoHeight,
  }));
  expect(media).toEqual({
    source: true,
    loop: true,
    muted: true,
    inline: true,
    duration: 1.834,
    width: 512,
    height: 512,
  });
  let previous = await video.evaluate((element) => element.currentTime);
  await expect
    .poll(async () => {
      const current = await video.evaluate((element) => element.currentTime);
      const looped = current < previous;
      previous = current;
      return looped;
    })
    .toBe(true);
  await page.locator('[data-sw-menu-section=character]').tap();
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(true);
  await page.locator('[data-sw-menu-section=about]').tap();
  await expectPlaying(video);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(true);
  expect(
    await nativeSnapshot(page),
    'About playback changes no game actions or preferences',
  ).toEqual(before);
});

test('page suspension pauses the animation and resume reuses the same About panel', async ({
  page,
}) => {
  await loadGame(page);
  const video = await openAbout(page);
  await expectPlaying(video);
  const before = await nativeSnapshot(page);
  await video.evaluate((element) => {
    window.fixtureAboutVideo = element;
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  });
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(true);
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await settle(page);
  await expectPlaying(video);
  expect(await video.evaluate((element) => element === window.fixtureAboutVideo)).toBe(true);
  await expect(page.locator('#sw-about')).toHaveCount(1);
  await expect(page.locator('#sw-about-video')).toHaveCount(1);
  expect(await nativeSnapshot(page), 'Resuming About retains the native game state').toEqual(
    before,
  );
});
