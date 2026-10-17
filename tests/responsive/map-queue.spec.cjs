const { test, expect, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { touch } = require('../support/map-input.cjs');

async function rowPoint(page, index, fraction = 0.5) {
  const row = page.locator('#unified-queue-panel .queue-slot-draggable').nth(index);
  const rect = await row.boundingBox();
  return { x: rect.x + rect.width * fraction, y: rect.y + rect.height / 2 };
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`trusted task dragging previews the route then commits one native reorder at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadMapGame(page);
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    await settle(page);
    const bitmap = await page
      .locator('.map-overlay-canvas')
      .evaluate((canvas) => canvas.toDataURL());
    const source = await rowPoint(page, 0);
    const target = await rowPoint(page, 1, 0.8);
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', source);
    for (const fraction of [0.25, 0.5, 0.75, 1])
      await touch(cdp, 'touchMove', {
        x: source.x + (target.x - source.x) * fraction,
        y: source.y,
      });
    await expect
      .poll(() => page.evaluate(() => window.fixtureMap.route))
      .toEqual(['home', 'smelt', 'mine', 'fish', 'cook']);
    await expect
      .poll(() => page.locator('.map-overlay-canvas').evaluate((canvas) => canvas.toDataURL()))
      .not.toBe(bitmap);
    expect(await page.evaluate(() => window.fixtureMap.queue)).toEqual([
      'mine',
      'smelt',
      'fish',
      'cook',
    ]);
    expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
    await touch(cdp, 'touchEnd');
    await cdp.detach();
    await expect
      .poll(() => page.evaluate(() => window.fixtureMap.reorderCalls))
      .toEqual([
        {
          fromSlot: 0,
          toSlot: 1,
          queueSig: ['skill:mine:mine', 'skill:smelt:smelt', 'skill:fish:fish', 'skill:cook:cook'],
        },
      ]);
    expect(await page.evaluate(() => window.fixtureMap.queue)).toEqual([
      'smelt',
      'mine',
      'fish',
      'cook',
    ]);
    await expect
      .poll(() => page.evaluate(() => window.fixtureMap.route))
      .toEqual(['home', 'smelt', 'mine', 'fish', 'cook']);
    expect(await page.evaluate(() => window.fixtureMap.mouseMoves)).toBe(0);
    expect(await page.evaluate(() => window.fixtureMap.wheelCalls)).toEqual([]);
  });
}

test('Map flattens two native queue columns into one horizontal strip without changing the collapsed preference', async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        window.fixtureMap.setColumns(2);
        document
          .getElementById('unified-queue-panel')
          .classList.add('uq-collapsed', 'popouts-pinned');
        localStorage.setItem('scapewatch_unifiedQueueCollapsed', '1');
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await settle(page);
  const points = [];
  for (let index = 0; index < 4; index++) points.push(await rowPoint(page, index));
  for (let index = 1; index < points.length; index++)
    expect(points[index].x).toBeGreaterThan(points[index - 1].x);
  await expect(page.locator('#unified-queue-panel .task-details').nth(1)).toBeHidden();
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', points[0]);
  const target = await rowPoint(page, 3, 0.8);
  await touch(cdp, 'touchMove', { x: target.x, y: points[0].y });
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.queue))
    .toEqual(['smelt', 'fish', 'cook', 'mine']);
  expect(await page.evaluate(() => localStorage.getItem('scapewatch_unifiedQueueCollapsed'))).toBe(
    '1',
  );
  await page.locator('#sw-map-close').tap();
  await expect(page.locator('#unified-queue-panel')).toHaveClass(/uq-collapsed/);
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  await expect(page.locator('#unified-queue-panel .task-details').nth(1)).toBeHidden();
});

test('the horizontal scroll gutter reaches the last task without reordering or panning the map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await settle(page);
  const wrap = page.locator('#unified-queue-panel .uq-rows');
  const rect = await wrap.boundingBox();
  const point = { x: rect.x + rect.width - 20, y: rect.y + rect.height - 12 };
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', point);
  for (const delta of [12, 24, 40, 60, 80])
    await touch(cdp, 'touchMove', { ...point, x: point.x - delta });
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  await expect.poll(() => wrap.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const last = await page
    .locator('#unified-queue-panel .queue-slot-draggable')
    .last()
    .boundingBox();
  expect(last.x + last.width).toBeLessThanOrEqual(rect.x + rect.width + 1);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureMap.mouseMoves)).toBe(0);
});

test('queue advancement cancels a pending drag instead of committing stale task indices', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cdp = await page.context().newCDPSession(page);
  const source = await rowPoint(page, 0);
  const target = await rowPoint(page, 1, 0.8);
  await touch(cdp, 'touchStart', source);
  await touch(cdp, 'touchMove', target);
  await page.evaluate(() => window.fixtureMap.replaceQueue(['smelt', 'fish', 'cook']));
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.route))
    .toEqual(['home', 'smelt', 'fish', 'cook']);
});

test('opening a native task popout preserves its option handler and updates the Map route', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) => page.evaluate(() => window.fixtureMap.enableOptions()),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const icon = page.locator('#unified-queue-panel .queue-slot-draggable .icon-container').first();
  await expect(icon.locator('[data-option-index="1"]')).toBeHidden();
  await icon.locator('.selected').tap();
  await expect(icon).toHaveClass(/tap-open/);
  await expect(icon.locator('[data-option-index="1"]')).toBeVisible();
  await icon.locator('[data-option-index="1"]').tap();
  await expect(icon.locator('[data-option-index="1"]')).toHaveClass(/tap-preview/);
  expect(await page.evaluate(() => window.fixtureMap.optionCalls)).toEqual([]);
  await icon.locator('[data-option-index="1"]').tap();
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.route))
    .toEqual(['home', 'forage', 'smelt', 'fish', 'cook']);
  expect(await page.evaluate(() => window.fixtureMap.optionCalls)).toEqual([
    { slotIndex: 0, optionIndex: 1 },
  ]);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
});
