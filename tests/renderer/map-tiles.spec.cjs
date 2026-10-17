const { test, expect, read } = require('../support/game.cjs');
const { loadRenderer } = require('../support/renderer.cjs');

const tile = (index = 0) => `/assets/map/tiles_q10/tile_${index}_0.webp`;

async function setup(page, { hold = false } = {}) {
  await loadRenderer(page);
  const colors = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const context = canvas.getContext('2d');
    return ['red', 'lime', 'blue'].map((color) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1024, 1024);
      return canvas.toDataURL('image/png').split(',')[1];
    });
  });
  const held = [];
  const requests = [];
  await page.route('**/assets/**', (route) => {
    const url = route.request().url();
    const match = /tiles_(q95|q100)\//.exec(url);
    if (match) {
      requests.push(route.request());
      if (hold) {
        held.push(route);
        return;
      }
    }
    return route.fulfill({
      contentType: 'image/webp',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: Buffer.from(colors[match ? (match[1] === 'q95' ? 1 : 2) : 0], 'base64'),
    });
  });
  await page.addScriptTag({ content: read('tests/fixtures/renderer/map-tiles.js') });
  return {
    held,
    requests,
    async release(route) {
      await route.fulfill({ contentType: 'image/webp', body: Buffer.from(colors[1], 'base64') });
    },
  };
}

for (const mode of ['balanced', 'high']) {
  test(`${mode} upgrades visible tiles with native fallback and preserves drawing coordinates`, async ({
    page,
  }) => {
    const network = await setup(page, { hold: true });
    await page.evaluate(
      async ({ path, mode }) => {
        window.__swRendering.setMode(mode);
        document.cookie = 'fixture-session=private; SameSite=Lax';
        await window.fixtureTiles.load([path]);
      },
      { path: tile(), mode },
    );
    const before = await page.evaluate((path) => window.fixtureTiles.draw(path), tile());
    expect(before.pixel).toEqual([255, 0, 0, 255]);
    await expect.poll(() => network.held.length).toBe(1);
    expect(network.requests[0].url()).toBe(
      `https://play.scapewatch.com/assets/map/tiles_${mode === 'high' ? 'q100' : 'q95'}/tile_0_0.webp`,
    );
    expect(await network.requests[0].headerValue('cookie')).toBeNull();
    await network.release(network.held.shift());
    await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(1);
    const after = await page.evaluate((path) => window.fixtureTiles.draw(path), tile());
    expect(after.pixel).toEqual([0, 255, 0, 255]);
    expect(after.transform).toEqual(before.transform);
    const cropped = await page.evaluate(
      (path) => window.fixtureTiles.draw(path, { rect: [0, 0, 1024, 1024, 20, 30, 400, 400] }),
      tile(),
    );
    expect(cropped.pixel).toEqual([0, 255, 0, 255]);
    expect(cropped.transform).toEqual(before.transform);
    expect(network.requests).toHaveLength(1);
  });
}

test('only upgrades valid visible same-origin tiles on the game canvas', async ({ page }) => {
  const network = await setup(page);
  const paths = [
    tile(),
    `${tile()}?quality=high`,
    `${tile()}#tile`,
    '/assets/map/tiles_q10/tile_8_0.webp',
    '/assets/map/tiles_q70/tile_0_0.webp',
    '/assets/map/full_map_q20.webp',
    '/assets/icons/ui/combat.png',
    `https://example.com${tile()}`,
  ];
  await page.evaluate(async (paths) => {
    await window.fixtureTiles.load(paths);
    for (const path of paths.slice(1)) window.fixtureTiles.draw(path);
    window.fixtureTiles.draw(paths[0], { rect: [-1000, 0, 400, 400] });
    window.fixtureTiles.draw(paths[0], { rect: [20, 30, 80, 80] });
    window.fixtureTiles.draw(paths[0], { transform: [1, 0, 0, 1, -1000, 0] });
    window.fixtureTiles.draw(paths[0], { other: true });
    await new Promise(requestAnimationFrame);
  }, paths);
  expect(network.requests).toHaveLength(0);
  await page.evaluate(async (path) => {
    const canvas = document.getElementById('game-canvas');
    canvas.style.display = 'none';
    await new Promise(requestAnimationFrame);
    window.fixtureTiles.draw(path);
    await new Promise(requestAnimationFrame);
    canvas.style.display = '';
  }, tile());
  expect(network.requests).toHaveLength(0);
  await page.evaluate((path) => window.fixtureTiles.draw(path), tile());
  await expect.poll(() => network.requests.length).toBe(1);
});

for (const mode of ['balanced', 'high']) {
  const capacity = mode === 'high' ? 12 : 8;
  test(`${mode} bounds simultaneous requests and decoded tile memory`, async ({ page }) => {
    const network = await setup(page, { hold: true });
    const paths = Array.from(
      { length: capacity + 1 },
      (_, index) => `/assets/map/tiles_q10/tile_${(index % 8) - 4}_${Math.floor(index / 8)}.webp`,
    );
    await page.evaluate(
      async ({ paths, mode, capacity }) => {
        window.__swRendering.setMode(mode);
        await window.fixtureTiles.load(paths);
        window.fixtureTiles.drawMany(paths.slice(0, capacity));
      },
      { paths, mode, capacity },
    );
    await expect.poll(() => network.requests.length).toBe(2);
    expect(await page.evaluate(() => window.__swRendering.stats().tilePending)).toBe(2);
    for (let index = 0; index < capacity; index++) {
      await expect.poll(() => network.held.length).toBeGreaterThan(0);
      await network.release(network.held.shift());
    }
    await expect
      .poll(() => page.evaluate(() => window.__swRendering.stats().tileCached))
      .toBe(capacity);
    await page.evaluate((path) => window.fixtureTiles.draw(path), paths[capacity]);
    await expect.poll(() => network.held.length).toBe(1);
    await network.release(network.held.shift());
    await expect
      .poll(() => page.evaluate(() => window.__swRendering.stats().tileCompleted))
      .toBe(capacity + 1);
    const result = await page.evaluate(() => ({
      stats: window.__swRendering.stats(),
      closed: window.fixtureTileBitmaps.filter((bitmap) => bitmap.width === 0).length,
    }));
    expect(result.stats.tileCached).toBe(capacity);
    expect(result.stats.tilePeak).toBe(2);
    expect(result.closed).toBe(1);
    expect(network.requests).toHaveLength(capacity + 1);
  });
}

test('battery and original modes retain native tiles and clear upgrades', async ({ page }) => {
  const network = await setup(page);
  await page.evaluate(async (path) => {
    await window.fixtureTiles.load([path]);
    window.fixtureTiles.draw(path);
  }, tile());
  await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(1);
  for (const mode of ['battery', 'original']) {
    const result = await page.evaluate(
      async ({ path, mode }) => {
        window.__swRendering.setMode(mode);
        const frame = window.fixtureTiles.draw(path);
        await new Promise(requestAnimationFrame);
        return frame;
      },
      { path: tile(), mode },
    );
    expect(result.pixel).toEqual([255, 0, 0, 255]);
    expect(result.stats.tileCached).toBe(0);
    expect(result.stats.tileQuality).toBeNull();
  }
  expect(network.requests).toHaveLength(1);
  expect(await page.evaluate(() => window.fixtureTileBitmaps[0].width)).toBe(0);
});

test('unavailable upgrades preserve native pixels without retrying every frame', async ({
  page,
}) => {
  const network = await setup(page);
  await page.route('**/tiles_q95/**', (route) => {
    network.requests.push(route.request());
    return route.fulfill({ status: 404 });
  });
  await page.evaluate(async (path) => {
    await window.fixtureTiles.load([path]);
    window.fixtureTiles.draw(path);
  }, tile());
  await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileFailed)).toBe(1);
  const frames = await page.evaluate(async (path) => {
    const frames = [];
    for (let index = 0; index < 20; index++) {
      frames.push(window.fixtureTiles.draw(path).pixel);
      await new Promise(requestAnimationFrame);
    }
    return frames;
  }, tile());
  expect(network.requests).toHaveLength(1);
  for (const pixel of frames) expect(pixel).toEqual([255, 0, 0, 255]);
});

for (const action of ['mode', 'pagehide']) {
  test(`${action} cancels pending work and closes a late decoded tile`, async ({ page }) => {
    const network = await setup(page);
    await page.evaluate(async (path) => {
      await window.fixtureTiles.load([path]);
      window.fixtureHoldTileDecode = true;
      window.fixtureTiles.draw(path);
    }, tile());
    await expect
      .poll(() => page.evaluate(() => typeof window.fixtureReleaseTileDecode))
      .toBe('function');
    await page.evaluate((action) => {
      if (action === 'mode') window.__swRendering.setMode('high');
      else dispatchEvent(new Event('pagehide'));
      window.fixtureReleaseTileDecode();
      window.fixtureHoldTileDecode = false;
    }, action);
    await expect.poll(() => page.evaluate(() => window.fixtureTileBitmaps[0].width)).toBe(0);
    expect(await page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(0);
    expect(await page.evaluate(() => window.__swRendering.stats().tilePending)).toBe(0);
    if (action === 'pagehide') {
      await page.evaluate(async (path) => {
        window.fixtureTiles.draw(path);
        await new Promise(requestAnimationFrame);
      }, tile());
      expect(network.requests).toHaveLength(1);
      await page.evaluate(() => dispatchEvent(new Event('pageshow')));
    }
    await page.evaluate((path) => window.fixtureTiles.draw(path), tile());
    await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(1);
    expect(network.requests).toHaveLength(2);
  });
}

test('high resolution respects its pixel budget and older decoders retain native tiles', async ({
  page,
}) => {
  const network = await setup(page);
  const result = await page.evaluate(async (path) => {
    window.__swRendering.setMode('high');
    const canvas = document.getElementById('game-canvas');
    canvas.width = 2642;
    canvas.height = 5867;
    const dimensions = { width: canvas.width, height: canvas.height };
    await window.fixtureTiles.load([path]);
    window.createImageBitmap = undefined;
    const frame = window.fixtureTiles.draw(path);
    await new Promise(requestAnimationFrame);
    return { dimensions, frame };
  }, tile());
  expect(result.dimensions.width * result.dimensions.height).toBeLessThanOrEqual(2500000);
  expect(result.dimensions.width).toBeGreaterThan(618);
  expect(result.frame.pixel).toEqual([255, 0, 0, 255]);
  expect(network.requests).toHaveLength(0);
});

for (const crop of [2, 1.75]) {
  test(`${crop * 100}% world framing upgrades the visible center and skips cropped canvas edges`, async ({
    page,
  }) => {
    const network = await setup(page);
    await page.evaluate(
      async ({ paths, crop }) => {
        await window.fixtureTiles.load(paths);
        const canvas = document.getElementById('game-canvas');
        const inset = -(crop - 1) / 2;
        canvas.style.cssText = `position:absolute;left:${inset * 100}%;top:${inset * 100}%;width:${crop * 100}%;height:${crop * 100}%`;
        document.getElementById('game-container').style.overflow = 'clip';
        dispatchEvent(new Event('resize'));
        window.fixtureTiles.draw(paths[0], { rect: [0, 0, 125, 900] });
        window.fixtureTiles.draw(paths[1], { rect: [150, 225, 300, 450] });
      },
      { paths: [tile(), tile(1)], crop },
    );
    await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(1);
    expect(network.requests.map((request) => request.url())).toEqual([
      'https://play.scapewatch.com/assets/map/tiles_q95/tile_1_0.webp',
    ]);
    const pixel = await page.evaluate((path) => {
      window.fixtureTiles.draw(path, { rect: [150, 225, 300, 450] });
      return [
        ...document.getElementById('game-canvas').getContext('2d').getImageData(300, 400, 1, 1)
          .data,
      ];
    }, tile(1));
    expect(pixel).toEqual([0, 255, 0, 255]);
  });
}

test('backgrounding stops queued upgrades until the visible game draws again', async ({ page }) => {
  const network = await setup(page, { hold: true });
  const paths = [tile(), tile(1), tile(2), tile(3)];
  await page.evaluate(async (paths) => {
    await window.fixtureTiles.load(paths);
    window.fixtureTiles.drawMany(paths);
  }, paths);
  await expect.poll(() => network.requests.length).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => window.fixtureHidden,
    });
    window.fixtureHidden = true;
  });
  await network.release(network.held.shift());
  await network.release(network.held.shift());
  await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tilePending)).toBe(0);
  await page.evaluate(async (paths) => {
    window.fixtureTiles.drawMany(paths);
    await new Promise(requestAnimationFrame);
  }, paths);
  expect(network.requests).toHaveLength(2);
  expect(await page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(2);
  await page.evaluate((paths) => {
    window.fixtureHidden = false;
    window.fixtureTiles.drawMany(paths);
  }, paths);
  await expect.poll(() => network.requests.length).toBe(4);
  await network.release(network.held.shift());
  await network.release(network.held.shift());
  await expect.poll(() => page.evaluate(() => window.__swRendering.stats().tileCached)).toBe(4);
});
