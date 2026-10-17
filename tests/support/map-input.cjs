'use strict';

const { expect, settle } = require('./game.cjs');
const clearMapPoint = { x: 180, y: 180 };

async function touch(cdp, type, point) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: point ? [{ ...point, id: 1, radiusX: 4, radiusY: 4 }] : [],
  });
}

async function startDoubleTap(cdp, point = clearMapPoint) {
  await touch(cdp, 'touchStart', point);
  await touch(cdp, 'touchEnd');
  await touch(cdp, 'touchStart', point);
}

async function doubleTapDrag(page, delta) {
  const point = clearMapPoint;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y).id, point)).toBe(
    'game-canvas',
  );
  const cdp = await page.context().newCDPSession(page);
  await startDoubleTap(cdp, point);
  for (const fraction of [0.25, 0.5, 0.75, 1])
    await touch(cdp, 'touchMove', { ...point, y: point.y + delta * fraction });
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  await settle(page);
}

module.exports = { clearMapPoint, touch, startDoubleTap, doubleTapDrag };
