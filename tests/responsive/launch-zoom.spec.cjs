'use strict';

const { test, expect, settle } = require('../support/game.cjs');
const { loadCameraGame } = require('../support/camera.cjs');

test('native wheel input before initialization keeps the user camera choice', async ({ page }) => {
  await loadStartingGame(page);
  await page.evaluate(() => document.body.classList.remove('login-active'));
  await page.mouse.move(180, 180);
  await page.mouse.wheel(0, -1);
  await expect.poll(() => page.evaluate(() => window.cameraState.cameraZoom)).toBe(1.1);
  await page.evaluate(() => {
    document.querySelector('.hp-bar-text').textContent = '30 / 30';
  });
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.cameraZoom)).toBe(1.1);
  expect(await page.evaluate(() => window.cameraState.wheelZooms.length)).toBe(1);
});

test('choosing Original UI during startup suppresses later launch framing', async ({ page }) => {
  await loadStartingGame(page);
  await page.evaluate(() => document.body.classList.remove('login-active'));
  await page.locator('[data-sw-view="menu"]').click();
  await page.locator('#sw-layout-toggle').click();
  await page.evaluate(() => {
    document.querySelector('.hp-bar-text').textContent = '30 / 30';
  });
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
  await page.locator('#sw-layout-toggle').click();
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
});

test('a saved Original UI preference keeps launch framing disabled after returning to Mobile UI', async ({
  page,
}) => {
  await loadCameraGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem('sw_mobile_ui', 'desktop');
        document.body.classList.add('login-active');
        const health = document.createElement('div');
        health.className = 'hp-bar';
        health.innerHTML = '<span class="hp-bar-text">0 / 0</span>';
        document.getElementById('ui-container').append(health);
      });
    },
  });
  await page.evaluate(() => {
    document.body.classList.remove('login-active');
    document.querySelector('.hp-bar-text').textContent = '30 / 30';
  });
  await page.locator('#sw-layout-toggle').click();
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
});

async function loadStartingGame(page) {
  await loadCameraGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        document.body.classList.add('login-active');
        const health = document.createElement('div');
        health.className = 'hp-bar';
        health.innerHTML = '<span class="hp-bar-text">0 / 0</span>';
        document.getElementById('ui-container').append(health);
      });
    },
  });
  await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    canvas.width = Math.round((innerWidth / scale) * 2);
    canvas.height = Math.round((innerHeight / scale) * 2);
    canvas.getContext('2d').setTransform(2, 0, 0, 2, 0, 0);
  });
}

for (const [viewport, zoom] of [
  [{ width: 360, height: 740 }, 4.4],
  [{ width: 740, height: 360 }, 3.2],
]) {
  test.describe(`${viewport.width}x${viewport.height} launch camera`, () => {
    test.use({ viewport });

    test('waits for initialized health, zooms closer once, and retains user zoom through rotation', async ({
      page,
    }) => {
      await loadStartingGame(page);
      await page.evaluate(() => document.body.classList.remove('login-active'));
      await settle(page);
      expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
      const gameplay = await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay));
      await page.evaluate(() => {
        document.querySelector('.hp-bar-text').textContent = '30 / 30';
      });
      await expect.poll(() => page.evaluate(() => window.cameraState.cameraZoom)).toBe(zoom);
      const bounds = await page.locator('#game-canvas').boundingBox();
      expect(bounds.width).toBe(viewport.width * 2);
      expect(bounds.height).toBe(viewport.height * 2);
      expect(bounds.x + bounds.width / 2).toBe(viewport.width / 2);
      expect(bounds.y + bounds.height / 2).toBe(viewport.height / 2);
      await page.locator('#game-canvas').dispatchEvent('wheel', { deltaY: -1 });
      expect(await page.evaluate(() => window.cameraState.cameraZoom)).toBeCloseTo(zoom + 0.1, 5);
      expect(await page.evaluate(() => window.cameraState.recenterClicks)).toBe(0);
      expect(await page.evaluate(() => window.cameraState.cameraFree)).toBe(false);
      await page.locator('#game-canvas').dispatchEvent('wheel', { deltaY: 1 });
      const selected = await page.evaluate(() => window.cameraState.cameraZoom);
      const calls = await page.evaluate(() => window.cameraState.wheelZooms.length);
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await page.evaluate(() => {
        document.querySelector('.hp-bar-text').textContent = '23 / 30';
      });
      await settle(page);
      expect(await page.evaluate(() => window.cameraState.cameraZoom)).toBe(selected);
      expect(await page.evaluate(() => window.cameraState.wheelZooms.length)).toBe(calls);
      expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
        gameplay,
      );
    });
  });
}

test('restored native combat keeps its camera instead of receiving a launch zoom', async ({
  page,
}) => {
  await loadStartingGame(page);
  await page.evaluate(() => {
    document.body.classList.remove('login-active');
    const combat = document.createElement('div');
    combat.className = 'combat-encounter';
    document.getElementById('ui-container').append(combat);
    document.querySelector('.recenter-camera-btn').classList.add('combat-active');
    window.cameraState.cameraZoom = 2.6;
    document.querySelector('.hp-bar-text').textContent = '30 / 30';
  });
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.cameraZoom)).toBe(2.6);
  expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
  await page.evaluate(() => {
    document.querySelector('.combat-encounter').style.display = 'none';
    document.querySelector('.recenter-camera-btn').classList.remove('combat-active');
    document.querySelector('.hp-bar-text').textContent = '20 / 30';
  });
  await settle(page);
  expect(await page.evaluate(() => window.cameraState.cameraZoom)).toBe(2.6);
  expect(await page.evaluate(() => window.cameraState.wheelZooms)).toEqual([]);
});
