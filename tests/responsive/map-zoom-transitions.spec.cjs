'use strict';

const { test, expect, settle } = require('../support/game.cjs');
const { returnToWorld } = require('../support/navigation.cjs');
const { loadCameraGame } = require('../support/camera.cjs');
const { clearMapPoint: point, touch, startDoubleTap } = require('../support/map-input.cjs');

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} zoom gesture transitions`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await loadCameraGame(page);
      await page.evaluate(() => window.resetCamera());
    });

    test('adding a second finger hands over to native pinch without a wheel zoom', async ({
      page,
    }) => {
      const cdp = await page.context().newCDPSession(page);
      await startDoubleTap(cdp);
      const fingers = (spread) => [
        { ...point, id: 1, radiusX: 4, radiusY: 4 },
        { ...point, x: point.x + spread, id: 2, radiusX: 4, radiusY: 4 },
      ];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(24) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(48) });
      await touch(cdp, 'touchEnd');
      await settle(page);
      const state = await page.evaluate(() => window.cameraState);
      expect(state.cameraZoom).toBe(2);
      expect(state.cameraMoves).toBe(1);
      expect(state.wheelZooms).toEqual([]);
      expect(state.recenterClicks).toBe(1);
      expect(
        state.callbacks.some((entry) => entry.type === 'touchstart' && entry.touches === 2),
      ).toBe(true);
      await cdp.detach();
    });

    test('cancelling a zoom gesture leaves the next single-finger map drag native', async ({
      page,
    }) => {
      const cdp = await page.context().newCDPSession(page);
      await startDoubleTap(cdp);
      await touch(cdp, 'touchMove', { ...point, y: point.y + 12 });
      await touch(cdp, 'touchCancel');
      await touch(cdp, 'touchStart', point);
      for (const delta of [12, 24, 42, 66])
        await touch(cdp, 'touchMove', { ...point, x: point.x + delta });
      await touch(cdp, 'touchEnd');
      await settle(page);
      const state = await page.evaluate(() => window.cameraState);
      expect(state.cameraZoom).toBe(1.1);
      expect(state.wheelZooms).toHaveLength(1);
      expect(state.recenterClicks).toBe(1);
      expect(state.cameraPans).toBeGreaterThan(0);
      expect(state.cameraFree).toBe(true);
      await cdp.detach();
    });

    test('navigation between taps cancels the pending double-tap gesture', async ({ page }) => {
      const cdp = await page.context().newCDPSession(page);
      await touch(cdp, 'touchStart', point);
      await touch(cdp, 'touchEnd');
      await page.locator('#sw-nav [data-sw-view=inventory]').tap();
      await returnToWorld(page);
      await touch(cdp, 'touchStart', point);
      for (const delta of [12, 24, 42, 66])
        await touch(cdp, 'touchMove', { ...point, x: point.x + delta });
      await touch(cdp, 'touchEnd');
      await settle(page);
      const state = await page.evaluate(() => window.cameraState);
      expect(state.wheelZooms).toEqual([]);
      expect(state.recenterClicks).toBe(1);
      expect(state.cameraPans).toBeGreaterThan(0);
      await cdp.detach();
    });
  });
}
