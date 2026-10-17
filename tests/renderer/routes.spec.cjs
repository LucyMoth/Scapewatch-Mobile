const { test, expect, read, screenshot } = require('../support/game.cjs');
const { loadRenderer } = require('../support/renderer.cjs');

for (const viewport of [
  { width: 412, height: 915 },
  { width: 915, height: 412 },
]) {
  test.describe(`Movement routes at ${viewport.width}×${viewport.height}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await loadRenderer(page);
      await page.addScriptTag({ content: read('tests/fixtures/renderer/routes.js') });
    });

    for (const mode of ['balanced', 'battery']) {
      test(`${mode} keeps moving and queued routes visible without changing native state`, async ({
        page,
      }) => {
        const frames = await page.evaluate((mode) => {
          const storage = JSON.stringify(localStorage);
          const frames = {};
          for (const kind of ['local', 'queue']) {
            frames[kind] = window.renderRouteFixture(kind, { mode });
            frames[`${kind}Hidden`] = window.renderRouteFixture(kind, {
              mode,
              showPlayerPath: false,
            });
          }
          frames.idle = window.renderRouteFixture('local', { mode, state: 'idle' });
          frames.empty = window.renderRouteFixture('queue', { mode, queued: false });
          frames.storageUnchanged = storage === JSON.stringify(localStorage);
          window.renderRouteFixture('queue', { mode });
          return frames;
        }, mode);
        for (const kind of ['local', 'queue']) {
          expect(frames[kind].yellowPixels).toBeGreaterThan(200);
          expect(frames[kind].lineWidth).toBe(1);
          expect(frames[kind].dash).toEqual([]);
          expect(frames[kind].stats.saveDepth).toBe(0);
          expect(frames[kind].stats.logicalWidth).toBeCloseTo(1920, 0);
          expect(frames[kind].stats.logicalHeight).toBeCloseTo(
            (1920 * viewport.height) / viewport.width,
            0,
          );
          expect(frames[kind].settings).toEqual({ thickness: 2.5, showPlayerPath: true });
          expect(frames[`${kind}Hidden`].yellowPixels).toBe(0);
          expect(frames[kind].transform).toEqual(frames[`${kind}Hidden`].transform);
        }
        expect(frames.idle.yellowPixels).toBe(0);
        expect(frames.empty.yellowPixels).toBe(0);
        expect(frames.storageUnchanged).toBe(true);
        await screenshot(page, `${mode}-routes`);
      });
    }

    test('original UI and solid strokes preserve native line widths', async ({ page }) => {
      const pixels = await page.evaluate(() => {
        const original = window.renderRouteFixture('local', { mode: 'original' });
        const originalThick = window.renderRouteFixture('local', {
          mode: 'original',
          thickness: 6,
        });
        const solid = window.renderRouteFixture('local', {
          mode: 'balanced',
          pattern: 'solid',
        });
        const solidThick = window.renderRouteFixture('local', {
          mode: 'balanced',
          pattern: 'solid',
          thickness: 6,
        });
        return { original, originalThick, solid, solidThick };
      });
      expect(pixels.original.yellowPixels).toBeGreaterThan(0);
      expect(pixels.originalThick.yellowPixels).toBeGreaterThan(pixels.original.yellowPixels * 2);
      expect(pixels.solidThick.yellowPixels).toBeGreaterThan(pixels.solid.yellowPixels * 2);
      for (const frame of Object.values(pixels)) expect(frame.lineWidth).toBe(1);
    });
  });
}

test('restores a native route stroke after invalid arguments throw', async ({ page }) => {
  await loadRenderer(page);
  const result = await page.evaluate(() => {
    const context = document.getElementById('game-canvas').getContext('2d');
    context.lineWidth = 0.1;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.setLineDash([12, 8]);
    let threw = false;
    try {
      context.stroke({});
    } catch (_) {
      threw = true;
    }
    return { threw, width: context.lineWidth, dash: context.getLineDash() };
  });
  expect(result.threw).toBe(true);
  expect(result.width).toBeCloseTo(0.1);
  expect(result.dash).toEqual([12, 8]);
});

test('mobile UI retains visible routes at original resolution and restores native UI strokes', async ({
  page,
}) => {
  await loadRenderer(page);
  await page.addScriptTag({ content: read('tests/fixtures/renderer/routes.js') });
  const frames = await page.evaluate(() => {
    const storage = JSON.stringify(localStorage);
    const original = window.renderRouteFixture('local', { mode: 'original' });
    document.documentElement.classList.add('sw-mobile');
    const mobile = window.renderRouteFixture('local', { mode: 'original' });
    document.documentElement.classList.remove('sw-mobile');
    const restored = window.renderRouteFixture('local', { mode: 'original' });
    return {
      original,
      mobile,
      restored,
      storageUnchanged: storage === JSON.stringify(localStorage),
    };
  });
  expect(frames.mobile.yellowPixels).toBeGreaterThan(frames.original.yellowPixels * 2);
  expect(frames.restored.yellowPixels).toBe(frames.original.yellowPixels);
  for (const frame of [frames.original, frames.mobile, frames.restored]) {
    expect(frame.lineWidth).toBe(1);
    expect(frame.dash).toEqual([]);
    expect(frame.stats.saveDepth).toBe(0);
    expect(frame.transform).toEqual(frames.original.transform);
    expect(frame.settings).toEqual({ thickness: 2.5, showPlayerPath: true });
  }
  expect(frames.storageUnchanged).toBe(true);
});
