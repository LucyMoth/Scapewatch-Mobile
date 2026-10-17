'use strict';

const { test, expect, settle, screenshot } = require('./support/game.cjs');
const { loadCameraGame } = require('./support/camera.cjs');

function near(actual, expected, tolerance = 0.01) {
  expect(
    Math.abs(actual - expected),
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  ).toBeLessThanOrEqual(tolerance);
}

async function centerOfCanvas(page) {
  await page.evaluate(() => window.resetCamera());
  await settle(page);
  return page.evaluate(() => {
    const candidates = [{ x: innerWidth / 2, y: innerHeight / 2 }];
    for (let y = 160; y < innerHeight - 160; y += 30)
      for (let x = 90; x < innerWidth - 90; x += 30) candidates.push({ x, y });
    for (const point of candidates) {
      // Chromium's touch hit test may expand onto adjacent controls even when
      // elementFromPoint(center) is the canvas. Keep a clear surrounding patch.
      if (
        [
          [0, 0],
          [-80, 0],
          [80, 0],
          [0, -60],
          [0, 60],
          [-60, -45],
          [60, -45],
          [-60, 45],
          [60, 45],
        ].every(
          ([dx, dy]) => document.elementFromPoint(point.x + dx, point.y + dy)?.id === 'game-canvas',
        )
      )
        return point;
    }
    return null;
  });
}
async function nativePinch(page, cdp, point, kind, allowCamera = false) {
  await page.evaluate((value) => window.resetCamera(value), allowCamera);
  const before = await page.evaluate(() => window.snapshotCamera());
  if (kind === 'synthesizePinchGesture') {
    await cdp.send('Input.synthesizePinchGesture', {
      ...point,
      scaleFactor: 1.65,
      relativeSpeed: 400,
      gestureSourceType: 'touch',
    });
  } else {
    const fingers = (spread) => [
      { x: point.x - spread, y: point.y, id: 1, radiusX: 5, radiusY: 5 },
      { x: point.x + spread, y: point.y, id: 2, radiusX: 5, radiusY: 5 },
    ];
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: fingers(24),
    });
    for (const spread of [30, 38, 48, 60]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: fingers(spread),
      });
      await page.waitForTimeout(25);
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  }
  await settle(page);
  const after = await page.evaluate(() => window.snapshotCamera());
  return { kind, point, before, after };
}
async function nativeSingleTouch(page, cdp, point, swipe = false) {
  await page.evaluate(() => window.resetCamera());
  const before = await page.evaluate(() => window.snapshotCamera());
  const finger = (delta) => [{ x: point.x + delta, y: point.y, id: 1, radiusX: 5, radiusY: 5 }];
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: finger(0),
  });
  if (swipe)
    for (const delta of [12, 24, 42, 66]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: finger(delta),
      });
      await page.waitForTimeout(25);
    }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await settle(page);
  return {
    kind: swipe ? 'trusted one-finger swipe' : 'trusted one-finger tap',
    point,
    before,
    after: await page.evaluate(() => window.snapshotCamera()),
  };
}
function stableBounds(before, after) {
  near(after.scale, before.scale);
  near(after.viewport.width, before.viewport.width);
  near(after.viewport.height, before.viewport.height);
  for (const selector of ['#sw-shell', '#sw-nav', '#game-canvas']) {
    if (!before.rects[selector]) continue;
    for (const key of ['x', 'y', 'width', 'height'])
      near(after.rects[selector][key], before.rects[selector][key]);
  }
}

test.describe('Native pinch calibration', () => {
  test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });

  for (const kind of ['synthesizePinchGesture', 'dispatchTouchEvent']) {
    test(`${kind} reproduces browser zoom on an unrestricted page`, async ({ page }) => {
      await loadCameraGame(page, { mobile: false });
      const cdp = await page.context().newCDPSession(page);
      const result = await nativePinch(page, cdp, { x: 206, y: 450 }, kind, true);
      const trustedMoves = result.after.trusted.filter(
        (event) => event.type === 'touchmove' && event.touches === 2,
      );
      test.info().annotations.push({
        type: 'calibration',
        description: `${trustedMoves.length} trusted moves; viewport scale ${result.before.scale} -> ${result.after.scale}`,
      });
      test.skip(
        result.after.scale <= result.before.scale + 0.01,
        'Chromium did not reproduce native viewport zoom; prevention assertions only establish stable layout and touch propagation.',
      );
      expect(trustedMoves.length).toBeGreaterThan(0);
      expect(result.after.scale).toBeGreaterThan(result.before.scale + 0.01);
    });
  }
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 412, height: 915 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} gestures`, () => {
    test.use({ viewport, deviceScaleFactor: 2 });
    test.beforeEach(async ({ page }) => {
      await loadCameraGame(page);
    });

    test('uses native visual viewport and locked mobile viewport metadata', async ({ page }) => {
      const value = await page.evaluate(() => ({
        native: visualViewport instanceof VisualViewport,
        meta: document.querySelector('meta[name=viewport]').content,
        nav: !!document.querySelector('#sw-nav'),
      }));
      expect(value.native && value.nav, JSON.stringify(value)).toBeTruthy();
      expect(/user-scalable\s*=\s*(?:no|0)/i.test(value.meta), value.meta).toBeTruthy();
    });
    test('UI two-finger events retain native behavior without changing game camera', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        return ['touchstart', 'touchmove'].map((type) =>
          window.dispatchSyntheticTouch('#sw-nav', type, 2),
        );
      });
      value.forEach((event) => {
        expect(event.prevented).toBe(false);
        expect(event.dispatchResult).toBe(true);
      });
      expect(await page.evaluate(() => window.cameraState.recenterClicks)).toBe(0);
    });
    test('cancelable three-finger world canvas start suppresses browser default', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        return window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 3);
      });
      expect(value.prevented).toBe(true);
      expect(value.dispatchResult).toBe(false);
    });
    test('original game camera zoom responds after canceled two-finger canvas start', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        const start = window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2, true, 24);
        const move = window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
        const end = window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return {
          start,
          move,
          end,
          state: window.snapshotCamera(),
          identity: Object.keys(window.originalCameraHandlers).every(
            (k) => window.originalCameraHandlers[k] === window.cameraHandlersBefore[k],
          ),
        };
      });
      expect(value.identity).toBe(true);
      expect(value.start.prevented).toBe(true);
      expect(!value.move.prevented && !value.end.prevented).toBeTruthy();
      expect(value.state.cameraFree).toBe(true);
      expect(value.state.recenterClicks, 'Original Roam Map handler is invoked exactly once').toBe(
        1,
      );
      expect(
        value.state.callbacks[0].cameraFree,
        'Original camera mode is entered before native touchstart handler runs',
      ).toBeTruthy();
      near(value.state.cameraZoom, 2);
      expect(value.state.cameraMoves).toBe(1);
      expect(value.state.callbacks.map((e) => e.type)).toEqual([
        'touchstart',
        'touchmove',
        'touchend',
      ]);
      expect(value.state.callbacks[0].prevented).toBeTruthy();
      expect(!value.state.callbacks[1].prevented).toBeTruthy();
    });
    test('one-finger touches uncancelable multi-touch and touchend keep propagation', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        const one = ['touchstart', 'touchmove'].map((type) =>
          window.dispatchSyntheticTouch('#game-canvas', type, 1),
        );
        const uncancelable = ['touchstart', 'touchmove'].map((type) =>
          window.dispatchSyntheticTouch('#game-canvas', type, 2, false),
        );
        const end = window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return {
          one,
          uncancelable,
          end,
          callbacks: window.cameraState.callbacks.length,
        };
      });
      [...value.one, ...value.uncancelable, value.end].forEach((e) => {
        expect(e.prevented).toBe(false);
        expect(e.dispatchResult).toBe(true);
      });
      expect(value.callbacks).toBe(5);
    });
    test('ordinary one-finger canvas tap leaves original follow camera unchanged', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        const start = window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 1, true, 24);
        const end = window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return { start, end, state: window.snapshotCamera() };
      });
      expect(!value.start.prevented && !value.end.prevented).toBeTruthy();
      expect(value.state.recenterClicks).toBe(0);
      expect(value.state.cameraFree).toBe(false);
      expect(value.state.cameraPans).toBe(0);
      expect(value.state.callbacks.map((e) => e.type)).toEqual(['touchstart', 'touchend']);
    });
    test('small one-finger canvas motion stays below roam threshold', async ({ page }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 1, true, 24);
        window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 1, true, 36);
        window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return window.snapshotCamera();
      });
      expect(value.recenterClicks).toBe(0);
      expect(value.cameraFree).toBe(false);
      expect(value.cameraPans).toBe(0);
    });
    test('direct one-finger swipe enters original roam and replays start before native pan', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 1, true, 24);
        window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 1, true, 64);
        window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return window.snapshotCamera();
      });
      expect(value.recenterClicks).toBe(1);
      expect(value.cameraFree).toBe(true);
      expect(value.cameraPans).toBe(1);
      near(value.cameraPan.x, -40);
      near(value.cameraPan.y, 0);
      const starts = value.callbacks.filter((e) => e.type === 'touchstart');
      expect(starts.length).toBe(2);
      expect(
        !starts[0].cameraFree && starts[1].cameraFree,
        'Saved native start must replay after entering roam',
      ).toBeTruthy();
      expect(value.callbacks.map((e) => e.type)).toEqual([
        'touchstart',
        'touchstart',
        'touchmove',
        'touchend',
      ]);
    });
    test('original recenter returns follow and subsequent ordinary tap stays in follow', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        window.resetCamera();
        window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2, true, 24);
        window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
        window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        const before = window.snapshotCamera();
        document.querySelector('.recenter-camera-btn').click();
        const following = window.snapshotCamera();
        window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 1, true, 24);
        window.dispatchSyntheticTouch('#game-canvas', 'touchend', 0);
        return { before, following, after: window.snapshotCamera() };
      });
      expect(value.before.cameraFree).toBe(true);
      expect(value.before.recenterClicks).toBe(1);
      expect(value.following.cameraFree).toBe(false);
      expect(value.following.recenterClicks).toBe(2);
      expect(value.after.cameraFree).toBe(false);
      expect(value.after.recenterClicks).toBe(2);
      expect(value.after.cameraPans).toBe(0);
    });
    test('trusted CDP ordinary canvas tap keeps follow camera', async ({ page }) => {
      const point = await centerOfCanvas(page);
      expect(point, 'No exposed canvas tap point').toBeTruthy();
      const cdp = await page.context().newCDPSession(page);
      const item = await nativeSingleTouch(page, cdp, point);
      stableBounds(item.before, item.after);
      expect(item.after.recenterClicks).toBe(0);
      expect(item.after.cameraFree).toBe(false);
      expect(item.after.cameraPans).toBe(0);
      expect(item.after.trusted.some((event) => event.type === 'touchstart')).toBeTruthy();
    });
    test('trusted CDP direct canvas swipe enters original roam and pans', async ({ page }) => {
      const point = await centerOfCanvas(page);
      expect(point, 'No exposed canvas swipe point').toBeTruthy();
      const cdp = await page.context().newCDPSession(page);
      const item = await nativeSingleTouch(page, cdp, point, true);
      stableBounds(item.before, item.after);
      expect(item.after.recenterClicks).toBe(1);
      expect(item.after.cameraFree).toBe(true);
      expect(item.after.cameraPans).toBeGreaterThan(0);
      expect(item.after.cameraPan.x).toBeGreaterThanOrEqual(60);
      expect(item.after.trusted.some((event) => event.type === 'touchmove')).toBeTruthy();
    });
    for (const target of ['UI', 'canvas']) {
      for (const kind of ['synthesizePinchGesture', 'dispatchTouchEvent']) {
        test(`${kind} on ${target} keeps UI bounds and browser scale`, async ({ page }) => {
          const point =
            target === 'canvas'
              ? await centerOfCanvas(page)
              : await page.locator('#sw-nav').evaluate((el) => {
                  const r = el.getBoundingClientRect();
                  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
                });
          expect(point, 'No exposed game-canvas test point found').toBeTruthy();
          const cdp = await page.context().newCDPSession(page);
          const item = await nativePinch(page, cdp, point, kind);
          stableBounds(item.before, item.after);
          const moves = item.after.trusted.filter(
            (event) => event.type === 'touchmove' && event.touches === 2,
          );
          if (!moves.length)
            test.info().annotations.push({
              type: 'browser limitation',
              description: `${kind} on ${target} emitted no trusted two-finger move; the synthetic touch tests cover propagation.`,
            });
          if (target === 'canvas' && moves.length) {
            expect(
              item.after.cameraMoves > 0,
              'Original canvas camera move callback did not run',
            ).toBeTruthy();
            expect(
              Math.abs(item.after.cameraZoom - 1) > 0.1,
              'Original canvas camera zoom did not change',
            ).toBeTruthy();
            expect(item.after.recenterClicks).toBe(1);
            expect(item.after.cameraFree).toBe(true);
          }
          if (target === 'UI') expect(item.after.recenterClicks).toBe(0);
          await screenshot(page, `${kind}-${target}`);
        });
      }
    }
    test('synthetic pinch leaves shell layout timer network and gameplay APIs unchanged', async ({
      page,
    }) => {
      const before = await page.evaluate(() => window.snapshotCamera());
      await page.evaluate(() => {
        window.dispatchSyntheticTouch('#sw-nav', 'touchstart', 2);
        window.dispatchSyntheticTouch('#sw-nav', 'touchmove', 2, true, 80);
        window.dispatchSyntheticTouch('#sw-nav', 'touchend', 0);
      });
      const after = await page.evaluate(() => window.snapshotCamera());
      stableBounds(before, after);
      const value = await page.evaluate(() => ({
        apis: [
          'fetch',
          'XMLHttpRequest',
          'WebSocket',
          'setTimeout',
          'setInterval',
          'requestAnimationFrame',
          'cancelAnimationFrame',
        ].map((k) => [k, window[k] === window.originalGameState[k]]),
        game: JSON.stringify(window.fixtureState.gameplay) === window.originalGameState.gameplay,
        network: window.fixtureState.networkCalls.length,
        canvasIdentity: document.getElementById('game-canvas') === window.originalGameState.canvas,
        handlers: Object.keys(window.originalCameraHandlers)
          .map((k) => [k, window.originalCameraHandlers[k] === window.cameraHandlersBefore[k]])
          .concat([['recenter', window.originalRecenterHandler === window.recenterHandlerBefore]]),
      }));
      value.apis
        .concat(value.handlers)
        .forEach(([key, same]) => expect(same, key + ' identity changed').toBeTruthy());
      expect(value.game && value.canvasIdentity).toBeTruthy();
      expect(value.network).toBe(0);
    });
    test('roam-idle canvas keeps browser gestures disabled in mobile layout', async ({ page }) => {
      const value = await page.evaluate(() => {
        document.body.classList.add('roam-idle');
        const result = getComputedStyle(document.getElementById('game-canvas')).touchAction;
        document.body.classList.remove('roam-idle');
        return result;
      });
      expect(value).toBe('none');
    });
    for (const view of ['tasks', 'chat', 'menu']) {
      test(`${view} navigation blocks automatic world camera activation`, async ({ page }) => {
        await page.locator('#sw-nav [data-sw-view="' + view + '"]').click();
        await settle(page);
        const value = await page.evaluate(() => {
          window.resetCamera();
          window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2);
          window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
          return window.snapshotCamera();
        });
        expect(value.recenterClicks).toBe(0);
        expect(value.cameraFree).toBe(false);
        expect(value.cameraMoves).toBe(0);
        expect(value.callbacks.length === 2).toBeTruthy();
      });
    }
    for (const blocker of ['login', 'modal', 'ledger']) {
      test(`${blocker} overlay blocks automatic world camera activation`, async ({ page }) => {
        await page.evaluate((kind) => {
          if (kind === 'login') window.fixtureLogin(true);
          else if (kind === 'modal') window.fixtureOpenModal('bank');
          else {
            const node = document.createElement('div');
            node.className = 'ledger-return-overlay';
            node.id = 'gesture-blocker';
            node.style.display = 'flex';
            document.getElementById('ui-container').append(node);
          }
        }, blocker);
        await settle(page);
        const value = await page.evaluate(() => {
          window.resetCamera();
          window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2);
          window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
          return window.snapshotCamera();
        });
        expect(value.recenterClicks).toBe(0);
        expect(value.cameraFree).toBe(false);
        expect(value.cameraMoves).toBe(0);
      });
    }
    test('hidden disabled and non-roam original controls never receive synthetic clicks', async ({
      page,
    }) => {
      const value = await page.evaluate(() => {
        const button = document.querySelector('.recenter-camera-btn');
        const out = [];
        for (const kind of ['hidden', 'disabled', 'combat']) {
          window.resetCamera();
          if (kind === 'hidden') button.style.display = 'none';
          if (kind === 'disabled') button.disabled = true;
          if (kind === 'combat') button.classList.remove('roam');
          window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2);
          out.push({
            kind,
            recenterClicks: window.cameraState.recenterClicks,
            cameraFree: window.cameraState.cameraFree,
          });
          button.style.display = '';
          button.disabled = false;
        }
        window.resetCamera();
        return out;
      });
      value.forEach((v) => {
        expect(v.recenterClicks, v.kind).toBe(0);
        expect(v.cameraFree, v.kind).toBe(false);
      });
    });
    test('already-free camera retains original mode without toggling follow', async ({ page }) => {
      const value = await page.evaluate(() => {
        window.resetCamera(true);
        window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2, true, 24);
        window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
        return window.snapshotCamera();
      });
      expect(value.recenterClicks).toBe(0);
      expect(value.cameraFree).toBe(true);
      near(value.cameraZoom, 2);
    });
    test('Original UI restores exact viewport metadata and native canvas event defaults', async ({
      page,
    }) => {
      await page.locator('#sw-nav [data-sw-view="menu"]').click();
      await page.locator('#sw-layout-toggle').click();
      await settle(page);
      const value = await page.evaluate(() => {
        window.resetCamera();
        const start = window.dispatchSyntheticTouch('#game-canvas', 'touchstart', 2);
        const move = window.dispatchSyntheticTouch('#game-canvas', 'touchmove', 2, true, 48);
        return {
          meta: document.querySelector('meta[name=viewport]').getAttribute('content'),
          originalMeta: window.originalGameState.viewportMeta,
          mobile: document.documentElement.classList.contains('sw-mobile'),
          start,
          move,
          state: window.snapshotCamera(),
        };
      });
      expect(value.meta).toBe(value.originalMeta);
      expect(value.mobile).toBe(false);
      expect(!value.start.prevented && !value.move.prevented).toBeTruthy();
      expect(value.state.recenterClicks).toBe(0);
    });
  });
}
