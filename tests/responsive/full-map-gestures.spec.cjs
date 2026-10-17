'use strict';

const { test, expect, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { touch, startDoubleTap } = require('../support/map-input.cjs');

async function mapPoint(page) {
  const rect = await page.locator('.map-overlay').boundingBox();
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  expect(
    await page.evaluate(
      ({ x, y }) => Boolean(document.elementFromPoint(x, y).closest('.map-overlay')),
      point,
    ),
  ).toBe(true);
  return point;
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test.describe(`${viewport.width}x${viewport.height} full map input`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await loadMapGame(page);
      await page.locator('#sw-nav [data-sw-view=map]').tap();
      await settle(page);
    });

    test('one finger pans in native coordinates and cancellation releases the native drag', async ({
      page,
    }) => {
      const point = await mapPoint(page);
      const width = (await page.locator('.map-overlay').boundingBox()).width;
      const cdp = await page.context().newCDPSession(page);
      await touch(cdp, 'touchStart', point);
      await touch(cdp, 'touchMove', { x: point.x + 24, y: point.y + 12 });
      await touch(cdp, 'touchCancel');
      const native = await page.evaluate(() => ({
        offset: window.fixtureMap.offset,
        moves: window.fixtureMap.mouseMoves,
        drag: window.fixtureMap.drag,
        zoom: window.fixtureMap.zoom,
        orders: window.fixtureMap.reorderCalls,
      }));
      expect(native.moves).toBeGreaterThan(0);
      expect(native.offset.x).toBeCloseTo((24 * 1920) / width, 1);
      expect(native.offset.y).toBeCloseTo((12 * 1920) / width, 1);
      expect(native.drag).toBeNull();
      expect(native.zoom).toBe(1);
      expect(native.orders).toEqual([]);
      await cdp.detach();
    });

    test('pinch uses the existing full-map wheel zoom and hands back to one-finger pan', async ({
      page,
    }) => {
      const point = await mapPoint(page);
      const cdp = await page.context().newCDPSession(page);
      const fingers = (spread) => [
        { x: point.x - spread, y: point.y, id: 1, radiusX: 4, radiusY: 4 },
        { x: point.x + spread, y: point.y, id: 2, radiusX: 4, radiusY: 4 },
      ];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(20) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(40) });
      await expect
        .poll(() => page.evaluate(() => window.fixtureMap.zoom))
        .toBeCloseTo(1.15 ** 4, 5);
      const calls = await page.evaluate(() => window.fixtureMap.wheelCalls);
      expect(calls).toHaveLength(4);
      expect(calls.every((entry) => entry.deltaY === -1)).toBe(true);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [fingers(40)[1]],
      });
      expect(await page.evaluate(() => window.fixtureMap.drag)).not.toBeNull();
      const before = await page.evaluate(() => window.fixtureMap.mouseMoves);
      await touch(cdp, 'touchMove', { x: point.x - 16, y: point.y });
      await touch(cdp, 'touchEnd');
      expect(await page.evaluate(() => window.fixtureMap.mouseMoves)).toBeGreaterThan(before);
      expect(await page.evaluate(() => window.fixtureMap.drag)).toBeNull();
      expect(await page.evaluate(() => window.fixtureMap.wheelCalls.length)).toBe(4);
      await cdp.detach();
    });

    test('double-tap and drag zooms the full map without panning or reordering tasks', async ({
      page,
    }) => {
      const point = await mapPoint(page);
      const rect = await page.locator('.map-overlay').boundingBox();
      const anchor = {
        x: ((Math.trunc(point.x) - rect.x) * 1920) / rect.width,
        y: ((Math.trunc(point.y) - rect.y) * 1080) / rect.height,
      };
      const cdp = await page.context().newCDPSession(page);
      await startDoubleTap(cdp, point);
      for (const delta of [12, 24, 36, 48])
        await touch(cdp, 'touchMove', { x: point.x, y: point.y + delta });
      await touch(cdp, 'touchEnd');
      expect(await page.evaluate(() => window.fixtureMap.zoom)).toBeCloseTo(1.15 ** 4, 5);
      for (const call of await page.evaluate(() => window.fixtureMap.wheelCalls)) {
        expect(call.x).toBeCloseTo(anchor.x, 1);
        expect(call.y).toBeCloseTo(anchor.y, 1);
      }
      expect(await page.evaluate(() => window.fixtureMap.mouseMoves)).toBe(0);
      expect(await page.evaluate(() => window.fixtureMap.drag)).toBeNull();
      expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
      await cdp.detach();
    });
  });
}
