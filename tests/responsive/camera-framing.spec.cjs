const { test, expect, settle, screenshot } = require('../support/game.cjs');
const { loadCameraGame } = require('../support/camera.cjs');
const { expectReachable } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`closer world framing retains native node and actor coordinates and battle framing at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadCameraGame(page, {
      scripts: ['game.js', 'camera.js', 'camera-hit.js'],
      beforeAdapter: (page) =>
        page.evaluate(() => {
          window.nativeCanvasBounds = document
            .getElementById('game-canvas')
            .getBoundingClientRect()
            .toJSON();
        }),
    });
    const scene = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const nativeScale = Math.min(innerWidth / 1920, innerHeight / 1080);
      const width = Math.round(innerWidth / nativeScale);
      const height = Math.round(innerHeight / nativeScale);
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext('2d');
      context.setTransform(2, 0, 0, 2, 0, 0);
      const actor = { x: width / 2 + 80, y: height / 2 };
      context.fillStyle = '#55cc99';
      context.fillRect(actor.x - 12, actor.y - 12, 24, 24);
      const bounds = canvas.getBoundingClientRect();
      return {
        actor,
        point: {
          x: bounds.x + (actor.x * bounds.width) / width,
          y: bounds.y + (actor.y * bounds.height) / height,
        },
        logical: { width, height },
        dimensions: window.__swRendering.stats(),
      };
    });
    expect(scene.dimensions.width * scene.dimensions.height).toBeLessThanOrEqual(1250000);
    expect(scene.dimensions.logicalWidth).toBe(scene.logical.width);
    expect(scene.dimensions.logicalHeight).toBe(scene.logical.height);
    await page.touchscreen.tap(scene.point.x, scene.point.y);
    const selected = await page.evaluate(() => window.cameraHits.at(-1));
    expect(selected.x).toBeCloseTo(scene.actor.x, -1);
    expect(selected.y).toBeCloseTo(scene.actor.y, -1);
    await page.evaluate((point) => {
      document.getElementById('game-canvas').dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: point.x,
          clientY: point.y,
        }),
      );
    }, scene.point);
    const actor = await page.evaluate(() => window.cameraHits.at(-1));
    expect(Math.abs(actor.x - scene.actor.x)).toBeLessThan(
      scene.logical.width / (viewport.width * 2),
    );
    expect(Math.abs(actor.y - scene.actor.y)).toBeLessThan(
      scene.logical.height / (viewport.height * 2),
    );
    await expectReachable(page, page.locator('.player-ctx-menu button'));
    const framing = await page.locator('#game-canvas').boundingBox();
    await page.locator('.player-ctx-menu button').evaluate((button) => button.scrollIntoView());
    expect(
      await page
        .locator('#game-container')
        .evaluate((container) => ({ top: container.scrollTop, left: container.scrollLeft })),
    ).toEqual({ top: 0, left: 0 });
    expect(await page.locator('#game-canvas').boundingBox()).toEqual(framing);
    await screenshot(page, 'closer-world-actor');
    await page.evaluate(() => {
      document.querySelector('.player-ctx-menu').style.display = 'none';
      document.querySelector('.recenter-camera-btn').classList.add('combat-active');
    });
    await settle(page);
    const battle = await page.locator('#game-canvas').boundingBox();
    expect(battle).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    await page.evaluate(() =>
      document.querySelector('.recenter-camera-btn').classList.remove('combat-active'),
    );
    const world = await page.locator('#game-canvas').boundingBox();
    expect(world.width).toBe(viewport.width * 2);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    const original = await page.locator('#game-canvas').boundingBox();
    const restored = await page.evaluate(() => window.nativeCanvasBounds);
    expect(original).toEqual({
      x: restored.x,
      y: restored.y,
      width: restored.width,
      height: restored.height,
    });
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
      await page.evaluate(() => window.fixtureOriginalGameplay),
    );
  });
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`combat raids enlarge the native battle and retain actor hit coordinates at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadCameraGame(page, {
      scripts: ['game.js', 'camera.js', 'camera-hit.js', 'combat.js', 'raid-hud.js'],
      beforeAdapter: (page) =>
        page.evaluate(() => {
          window.nativeRaidCanvasBounds = document
            .getElementById('game-canvas')
            .getBoundingClientRect()
            .toJSON();
          window.fixtureActiveRaid('combat');
          document.querySelector('.recenter-camera-btn').classList.add('combat-active');
        }),
    });
    const scale = viewport.width > viewport.height ? 1.2 : 1.75;
    const scene = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const nativeScale = Math.min(innerWidth / 1920, innerHeight / 1080);
      const width = Math.round(innerWidth / nativeScale);
      const height = Math.round(innerHeight / nativeScale);
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext('2d');
      context.setTransform(2, 0, 0, 2, 0, 0);
      const actor = { x: width / 2 - 82 * 2.2, y: height / 2 + 40 };
      for (const row of [0, 1, -1, 2, -2]) {
        context.fillStyle = '#55cc99';
        context.fillRect(
          actor.x - 32 * 2.2,
          actor.y + row * 64 * 2.2 - 32 * 2.2,
          64 * 2.2,
          64 * 2.2,
        );
        context.fillStyle = '#cc7755';
        context.fillRect(
          actor.x + 164 * 2.2 - 32 * 2.2,
          actor.y + row * 64 * 2.2 - 32 * 2.2,
          64 * 2.2,
          64 * 2.2,
        );
      }
      const bounds = canvas.getBoundingClientRect();
      return {
        actor,
        point: {
          x: bounds.x + (actor.x * bounds.width) / width,
          y: bounds.y + (actor.y * bounds.height) / height,
        },
        canvas: bounds.toJSON(),
        dimensions: window.__swRendering.stats(),
      };
    });
    expect(scene.canvas.width).toBeCloseTo(viewport.width * scale, 1);
    expect(scene.canvas.height).toBeCloseTo(viewport.height * scale, 1);
    expect(scene.dimensions.width * scene.dimensions.height).toBeLessThanOrEqual(1250000);
    const partyHalfHeight = (160 * 2.2 * scene.canvas.height) / scene.dimensions.logicalHeight;
    expect(scene.point.y - partyHalfHeight).toBeGreaterThan(0);
    expect(scene.point.y + partyHalfHeight).toBeLessThan(viewport.height);
    await page.touchscreen.tap(scene.point.x, scene.point.y);
    const selected = await page.evaluate(() => window.cameraHits.at(-1));
    expect(selected.x).toBeCloseTo(scene.actor.x, -1);
    expect(selected.y).toBeCloseTo(scene.actor.y, -1);
    if (viewport.width > viewport.height) {
      const raid = await page.locator('.raid-contrib-hud').boundingBox();
      expect(scene.point.x).toBeGreaterThan(0);
      expect(scene.point.x + (164 * 2.2 * scale * viewport.height) / 1080).toBeLessThan(raid.x);
    }
    await screenshot(page, 'closer-raid-formation');
    const hud = await page.locator('.raid-contrib-hud').boundingBox();
    await page.locator('#sw-combat-toggle').tap();
    expect(await page.locator('#game-canvas').boundingBox()).toEqual({
      x: scene.canvas.x,
      y: scene.canvas.y,
      width: scene.canvas.width,
      height: scene.canvas.height,
    });
    await page.locator('#sw-combat-close').tap();
    expect(await page.locator('.raid-contrib-hud').boundingBox()).toEqual(hud);
    await page.evaluate(() => {
      document.querySelector('.raid-contrib-hud').style.display = 'none';
    });
    const ordinaryBattle = await page.locator('#game-canvas').boundingBox();
    expect(ordinaryBattle).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    await page.evaluate(() => {
      document.querySelector('.recenter-camera-btn').classList.remove('combat-active');
      window.fixtureActiveRaid(null);
    });
    const world = await page.locator('#game-canvas').boundingBox();
    expect(world.width).toBe(viewport.width * 2);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-layout-toggle').tap();
    const original = await page.locator('#game-canvas').boundingBox();
    const restored = await page.evaluate(() => window.nativeRaidCanvasBounds);
    expect(original).toEqual({
      x: restored.x,
      y: restored.y,
      width: restored.width,
      height: restored.height,
    });
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    expect(await page.evaluate(() => window.fixtureState.raidHudActions)).toEqual([]);
  });
}
