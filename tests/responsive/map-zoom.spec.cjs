'use strict';

const { test, expect } = require('../support/game.cjs');
const { returnToWorld } = require('../support/navigation.cjs');
const { loadCameraGame } = require('../support/camera.cjs');
const { touch, doubleTapDrag } = require('../support/map-input.cjs');

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} one-hand map zoom`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await loadCameraGame(page);
      await page.evaluate(() => window.resetCamera());
    });

    for (const [name, delta, expected] of [
      ['up', -48, 0.6],
      ['down', 48, 1.4],
    ]) {
      test(`double tap and drag ${name} zooms through the original wheel handler without panning`, async ({
        page,
      }) => {
        const before = await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay));
        await doubleTapDrag(page, delta);
        const state = await page.evaluate(() => window.cameraState);
        expect(state.cameraZoom).toBe(expected);
        expect(state.wheelZooms).toHaveLength(4);
        expect(state.cameraFree).toBe(false);
        expect(state.cameraPans).toBe(0);
        expect(state.recenterClicks).toBe(0);
        expect(state.mapClicks).toBe(1);
        expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
          before,
        );
        expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
      });
    }

    test('ordinary map tap retains native touch handling without zooming', async ({ page }) => {
      const point = { x: 180, y: 180 };
      const cdp = await page.context().newCDPSession(page);
      await touch(cdp, 'touchStart', point);
      await touch(cdp, 'touchEnd');
      const state = await page.evaluate(() => window.cameraState);
      expect(state.cameraZoom).toBe(1);
      expect(state.wheelZooms).toEqual([]);
      expect(state.callbacks.map((entry) => entry.type)).toEqual(['touchstart', 'touchend']);
      expect(state.recenterClicks).toBe(0);
      expect(state.mapClicks).toBe(1);
      await cdp.detach();
    });

    test('UI and blocked scenes never start the one-hand zoom gesture', async ({ page }) => {
      await page.locator('#sw-nav [data-sw-view=tasks]').tap();
      await returnToWorld(page);
      await page.evaluate(() => document.body.classList.add('modal-open'));
      await doubleTapDrag(page, -48);
      const state = await page.evaluate(() => window.cameraState);
      expect(state.cameraZoom).toBe(1);
      expect(state.wheelZooms).toEqual([]);
      expect(state.recenterClicks).toBe(0);
    });
  });
}
