'use strict';

const { expect, settle } = require('./game.cjs');

async function openAbout(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=about]').tap();
  await settle(page);
  const video = page.locator('#sw-about-video');
  await expect(video).toBeVisible();
  return video;
}

async function expectPlaying(video) {
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Boolean(element.videoWidth === 512 && element.currentTime > 0 && !element.paused),
      ),
    )
    .toBe(true);
  expect(await video.evaluate((element) => element.error)).toBeNull();
}

module.exports = { openAbout, expectPlaying };
