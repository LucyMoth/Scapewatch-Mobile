'use strict';

const { test, expect, screenshot } = require('./support/game.cjs');
const { loadRenderer } = require('./support/renderer.cjs');

function near(actual, expected, tolerance = 0.002) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

test.describe('Canvas rendering', () => {
  test.beforeEach(async ({ page }) => {
    await loadRenderer(page);
  });

  test('leaves global APIs, canvas prototypes and other canvases unchanged', async ({ page }) => {
    const result = await page.evaluate(() => {
      const other = document.createElement('canvas');
      other.width = 1236;
      other.height = 2745;
      const context = other.getContext('2d');
      context.setTransform(3, 0, 0, 3, 0, 0);
      return {
        apis: [
          'fetch',
          'WebSocket',
          'XMLHttpRequest',
          'setTimeout',
          'setInterval',
          'requestAnimationFrame',
          'cancelAnimationFrame',
        ].map((name) => [name, window[name] === window.rendererBefore[name]]),
        width: other.width,
        height: other.height,
        transform: context.getTransform().a,
        descriptors: {
          width:
            Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width').set ===
            window.rendererBefore.width.set,
          height:
            Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height').set ===
            window.rendererBefore.height.set,
          setTransform:
            CanvasRenderingContext2D.prototype.setTransform === window.rendererBefore.setTransform,
          save: CanvasRenderingContext2D.prototype.save === window.rendererBefore.save,
          restore: CanvasRenderingContext2D.prototype.restore === window.rendererBefore.restore,
          stroke: CanvasRenderingContext2D.prototype.stroke === window.rendererBefore.stroke,
        },
      };
    });
    for (const [name, unchanged] of result.apis) expect(unchanged, name).toBe(true);
    for (const [name, unchanged] of Object.entries(result.descriptors))
      expect(unchanged, name).toBe(true);
    expect(result.width).toBe(1236);
    expect(result.height).toBe(2745);
    expect(result.transform).toBe(3);
  });

  test('balanced backing dimensions retain logical drawing coordinates', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.__swRendering.setMode('balanced');
      const canvas = document.getElementById('game-canvas');
      canvas.width = 1236;
      canvas.height = 2745;
      const context = canvas.getContext('2d');
      context.setTransform(3, 0, 0, 3, 0, 0);
      context.fillStyle = 'red';
      context.fillRect(32, 40, 20, 10);
      const transform = context.getTransform();
      return {
        width: canvas.width,
        height: canvas.height,
        scaleX: transform.a,
        scaleY: transform.d,
        pixel: Array.from(
          context.getImageData(Math.round(transform.a * 40), Math.round(transform.d * 45), 1, 1)
            .data,
        ),
      };
    });
    expect(result.width).toBeGreaterThanOrEqual(616);
    expect(result.width).toBeLessThanOrEqual(618);
    expect(result.height).toBeGreaterThanOrEqual(1371);
    expect(result.height).toBeLessThanOrEqual(1374);
    expect(result.width * result.height).toBeLessThanOrEqual(1250000);
    near(result.scaleX, (3 * result.width) / 1236);
    near(result.scaleY, (3 * result.height) / 2745, 0.01);
    expect(result.pixel).toEqual([255, 0, 0, 255]);
    await screenshot(page, 'balanced-rendering');
  });

  test('nested physical-pixel identity transforms are not scaled twice', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.__swRendering.setMode('balanced');
      const canvas = document.getElementById('game-canvas');
      canvas.width = 1236;
      canvas.height = 2745;
      const context = canvas.getContext('2d');
      context.setTransform(3, 0, 0, 3, 0, 0);
      const before = context.getTransform();
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      const nested = context.getTransform();
      context.fillStyle = 'blue';
      context.fillRect(600, 1200, 6, 6);
      const pixel = Array.from(context.getImageData(602, 1202, 1, 1).data);
      context.restore();
      const after = context.getTransform();
      return {
        before: [before.a, before.d],
        nested: [nested.a, nested.d],
        after: [after.a, after.d],
        pixel,
      };
    });
    expect(result.nested).toEqual([1, 1]);
    expect(result.after).toEqual(result.before);
    expect(result.pixel).toEqual([0, 0, 255, 255]);
  });

  test('battery mode caps memory and original mode restores requested dimensions', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      window.__swRendering.setMode('battery');
      canvas.width = 1236;
      canvas.height = 2745;
      const battery = { width: canvas.width, height: canvas.height };
      window.__swRendering.setMode('original');
      canvas.width = 1236;
      canvas.height = 2745;
      const context = canvas.getContext('2d');
      context.setTransform(3, 0, 0, 3, 0, 0);
      return {
        battery,
        original: {
          width: canvas.width,
          height: canvas.height,
          transform: context.getTransform().a,
        },
      };
    });
    expect(result.battery.width).toBeLessThanOrEqual(412);
    expect(result.battery.height).toBeLessThanOrEqual(915);
    expect(result.battery.width * result.battery.height).toBeLessThanOrEqual(700000);
    expect(result.original).toEqual({ width: 1236, height: 2745, transform: 3 });
  });

  test('a large logical viewport stays within the balanced pixel budget', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.__swRendering.setMode('balanced');
      const canvas = document.getElementById('game-canvas');
      canvas.width = 2642;
      canvas.height = 5867;
      const context = canvas.getContext('2d');
      context.setTransform(2642 / 1920, 0, 0, 5867 / 4264, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        scaleX: context.getTransform().a,
        scaleY: context.getTransform().d,
      };
    });
    expect(result.width * result.height).toBeLessThanOrEqual(1250000);
    expect(result.width).toBeLessThan(1000);
    expect(result.height).toBeLessThan(1800);
    near(result.scaleX, result.width / 1920, 0.005);
    near(result.scaleY, result.height / 4264, 0.005);
  });

  test('repeated resizing does not accumulate transform scale', async ({ page }) => {
    const frames = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const context = canvas.getContext('2d');
      const frames = [];
      for (let frame = 0; frame < 100; frame++) {
        canvas.width = 1236;
        canvas.height = 2745;
        context.setTransform(3, 0, 0, 3, 0, 0);
        frames.push([
          canvas.width,
          canvas.height,
          context.getTransform().a,
          context.getTransform().d,
        ]);
      }
      return frames;
    });
    for (const frame of frames) expect(frame).toEqual(frames[0]);
  });

  test('mode changes refresh canvas dimensions after CSS viewport changes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('game-container');
      const canvas = document.getElementById('game-canvas');
      container.style.height = '232px';
      dispatchEvent(new Event('resize'));
      window.__swRendering.setMode('balanced');
      canvas.width = 1236;
      canvas.height = 2745;
      const short = { width: canvas.width, height: canvas.height };
      container.style.height = '915px';
      window.__swRendering.setMode('balanced');
      canvas.width = 1236;
      canvas.height = 2745;
      return { short, tall: { width: canvas.width, height: canvas.height } };
    });
    expect(result.tall.height).toBeGreaterThanOrEqual(1371);
    expect(result.tall.height).toBeLessThanOrEqual(1374);
    expect(result.tall.height).toBeGreaterThan(result.short.height * 2);
  });
});

test.describe('Icon loading', () => {
  test.beforeEach(async ({ page }) => {
    await loadRenderer(page, { fakeImages: true });
  });

  test('loads at most eight unique icons with two image handles in flight', async ({ page }) => {
    const result = await page.evaluate(() => {
      const urls = Array.from(
        { length: 200 },
        (_, index) => `${location.origin}/assets/icons/ui/test-${index}.png`,
      );
      window.__swRendering.preloadIcons(urls);
      window.__swRendering.preloadIcons(urls);
      const initial = window.fakeImages.filter((image) => image.src).length;
      for (let index = 0; index < 20; index++) {
        const image = window.fakeImages.find((image) => image.onload);
        if (!image) break;
        image.onload.call(image);
      }
      return {
        initial,
        total: window.fakeImages.filter((image) => image.src).length,
        unique: new Set(window.fakeImages.map((image) => image.src).filter(Boolean)).size,
      };
    });
    expect(result.initial).toBe(2);
    expect(result.total).toBe(8);
    expect(result.unique).toBe(8);
  });

  test('pagehide releases pending image callbacks', async ({ page }) => {
    const callbacks = await page.evaluate(() => {
      window.__swRendering.preloadIcons([`${location.origin}/assets/icons/ui/test-icon.png`]);
      const before = window.fakeImages.filter((image) => image.onload || image.onerror).length;
      dispatchEvent(new Event('pagehide'));
      const after = window.fakeImages.filter((image) => image.onload || image.onerror).length;
      return { before, after };
    });
    expect(callbacks.before).toBeGreaterThan(0);
    expect(callbacks.after).toBe(0);
  });
});

test('does not install on unrelated origins', async ({ page }) => {
  await loadRenderer(page, { origin: 'https://example.com' });
  expect(await page.evaluate(() => typeof window.__swRendering)).toBe('undefined');
});
