const { test, expect, settle } = require('../support/game.cjs');
const { loadMapGame } = require('../support/map.cjs');
const { touch } = require('../support/map-input.cjs');
const { expectReachable, safeInsets } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`Map uses a compact horizontal icon strip and labeled corner controls at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadMapGame(page, {
      beforeAdapter: async (page) =>
        page.evaluate((insets) => {
          const style = document.createElement('style');
          style.textContent = `:root { --safe-area-inset-top: ${insets.top}px; --safe-area-inset-right: ${insets.right}px; --safe-area-inset-bottom: ${insets.bottom}px; --safe-area-inset-left: ${insets.left}px; }`;
          document.head.appendChild(style);
        }, safeInsets),
    });
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    await settle(page);
    const queue = await page.locator('#unified-queue-panel').boundingBox();
    expect(queue.height).toBeLessThanOrEqual(112);
    const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(second.x).toBeGreaterThan(first.x + first.width);
    expect(second.y).toBe(first.y);
    await expect(page.locator('#unified-queue-panel .task-details').first()).toBeHidden();
    const count = cards.nth(0).locator('.sw-map-step');
    await expect(count).toHaveText('374');
    const countBounds = await count.boundingBox();
    const iconBounds = await cards.nth(0).locator('.icon-option.selected').boundingBox();
    expect(countBounds.y + countBounds.height).toBeLessThanOrEqual(iconBounds.y);
    const tools = page.locator('#sw-map-tools');
    const before = await tools.boundingBox();
    expect(before.height).toBeLessThanOrEqual(48);
    await expectReachable(page, page.locator('#sw-map-close'), { insets: safeInsets });
    await expectReachable(page, page.getByRole('button', { name: 'Map filters', exact: true }), {
      insets: safeInsets,
    });
    const portrait = viewport.width < viewport.height;
    if (portrait) {
      await expect(page.getByRole('region', { name: 'Route overview' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Route legend', exact: true })).toBeHidden();
    } else
      await expectReachable(page, page.getByRole('button', { name: 'Route legend', exact: true }), {
        insets: safeInsets,
      });
    const beforeToggles = await page.evaluate(() => window.fixtureMap.filterToggleCalls.length);
    await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Map filters', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      await page.evaluate(
        (before) => window.fixtureMap.filterToggleCalls.slice(before),
        beforeToggles,
      ),
    ).toEqual([{ key: 'mapFilterCollapsed', collapsed: false }]);
    if (portrait) {
      await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
      await expect(page.locator('#sw-map-route .map-legend-body')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureMap.filters.mapLegendCollapsed)).toBe(true);
      await page.locator('#sw-map-close').tap();
      await expect(page.locator('.map-legend-panel > .map-legend-body')).toHaveCount(1);
      await expect(page.locator('.sw-map-step')).toHaveCount(0);
      return;
    }
    await page.getByRole('button', { name: 'Route legend', exact: true }).tap();
    await expect(page.locator('.map-filter-body')).toBeHidden();
    await expect(page.locator('.map-legend-body')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Map filters', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(
      await page.evaluate(
        (before) => window.fixtureMap.filterToggleCalls.slice(before),
        beforeToggles,
      ),
    ).toEqual([
      { key: 'mapFilterCollapsed', collapsed: false },
      { key: 'mapLegendCollapsed', collapsed: false },
      { key: 'mapFilterCollapsed', collapsed: true },
    ]);
    await page.locator('#sw-map-close').tap();
    await expect(page.locator('.sw-map-step')).toHaveCount(0);
    await expect(page.locator('.map-filter-title')).not.toHaveAttribute('role');
  });
}

test('dragging an icon updates native step counters and restores ordinary bounds after every event', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const before = await cards.nth(0).locator('.sw-map-step').textContent();
  const source = await cards.nth(0).locator('.selected').boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  });
  await touch(cdp, 'touchMove', {
    x: target.x + target.width * 0.8,
    y: source.y + source.height / 2,
  });
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.preview))
    .toEqual({ fromSlot: 0, toSlot: 1 });
  await expect(cards.nth(0).locator('.sw-map-step')).not.toHaveText(before);
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll('.queue-slot-draggable')].some((row) =>
        Object.hasOwn(row, 'getBoundingClientRect'),
      ),
    ),
  ).toBe(false);
  const rect = await cards.nth(0).boundingBox();
  expect(rect.height).toBe(76);
  expect(rect.width).toBe(64);
  await touch(cdp, 'touchCancel');
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).toBeNull();
  await expect(cards.nth(0).locator('.sw-map-step')).toHaveText(before);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureMap.longPressCalls)).toEqual([]);
  await cdp.detach();
});

test('a stationary hold retains the native icon action without starting a reorder', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const rect = await page
    .locator('#unified-queue-panel .queue-slot-draggable .selected')
    .first()
    .boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.longPressCalls)).toEqual(['mine']);
  await touch(cdp, 'touchEnd');
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureMap.preview)).toBeNull();
  await cdp.detach();
});

test('dragging outside the strip clears the preview and leaves task order unchanged', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const source = await cards.nth(0).boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y: source.y + 12 });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y + 12 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).not.toBeNull();
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y - 40 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).toBeNull();
  await touch(cdp, 'touchEnd');
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureMap.queue)).toEqual([
    'mine',
    'smelt',
    'fish',
    'cook',
  ]);
  await cdp.detach();
});

test('holding a dragged icon at the strip edge reveals later tasks and commits through the native queue', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        const queue = Array.from({ length: 8 }, (_, index) => `task${index}`);
        queue.forEach((id, index) => {
          window.fixtureMap.nodes[id] = { x: 180 + index * 200, y: 400 };
        });
        window.fixtureMap.replaceQueue(queue);
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const source = await cards.nth(0).locator('.selected').boundingBox();
  const strip = page.locator('#unified-queue-panel .uq-rows');
  const viewport = await strip.boundingBox();
  const point = { x: viewport.x + viewport.width - 10, y: source.y + source.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y: point.y });
  await touch(cdp, 'touchMove', point);
  await expect.poll(() => strip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(200);
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview?.toSlot)).toBe(7);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await touch(cdp, 'touchEnd');
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.reorderCalls))
    .toEqual([
      {
        fromSlot: 0,
        toSlot: 7,
        queueSig: Array.from({ length: 8 }, (_, index) => `skill:task${index}:task${index}`),
      },
    ]);
  expect(await page.evaluate(() => window.fixtureMap.queue)).toEqual([
    'task1',
    'task2',
    'task3',
    'task4',
    'task5',
    'task6',
    'task7',
    'task0',
  ]);
  expect(await page.evaluate(() => window.fixtureMap.longPressCalls)).toEqual([]);
  await cdp.detach();
});

test('releasing above the strip cancels even when the last move had a valid reorder preview', async ({
  page,
}) => {
  await loadMapGame(page);
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const source = await cards.nth(0).boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y: source.y + 12 });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y + 12 });
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.preview))
    .toEqual({ fromSlot: 0, toSlot: 1 });
  await touch(cdp, 'touchEnd', { x: target.x + target.width * 0.8, y: source.y - 40 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).toBeNull();
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  expect(await page.evaluate(() => window.fixtureMap.queue)).toEqual([
    'mine',
    'smelt',
    'fish',
    'cook',
  ]);
  await cdp.detach();
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`native task details remain readable and retain outside dismissal at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadMapGame(page);
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    const icon = page.locator('#unified-queue-panel .queue-slot-draggable .selected').first();
    await icon.tap();
    const preview = page.locator('#unified-queue-panel .sw-map-focus .sw-task-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('.tt-name')).toHaveText('Task mine');
    const bounds = await preview.boundingBox();
    const strip = await page.locator('#unified-queue-panel').boundingBox();
    const tools = await page.locator('#sw-map-tools').boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(tools.y + tools.height);
    if (viewport.width < viewport.height) {
      expect(bounds.y).toBeGreaterThanOrEqual(strip.y + strip.height + 4);
      const navigation = await page.locator('#sw-nav').boundingBox();
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(navigation.y - 4);
    } else {
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(strip.y - 4);
      expect(bounds.height).toBeLessThanOrEqual(180);
    }
    const cdp = await page.context().newCDPSession(page);
    const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - 16 };
    await touch(cdp, 'touchStart', start);
    for (const distance of [20, 40, 60, 80, 110])
      await touch(cdp, 'touchMove', { x: start.x, y: start.y - distance });
    await touch(cdp, 'touchEnd');
    await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(preview).toBeVisible();
    expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
    expect(await page.evaluate(() => window.fixtureMap.mouseMoves)).toBe(0);
    const map = await page.locator('.map-overlay').boundingBox();
    await page.touchscreen.tap(
      map.x + map.width / 2,
      viewport.width < viewport.height
        ? map.y + map.height / 2
        : Math.max(tools.y + tools.height + 5, bounds.y - 8),
    );
    await expect(preview).toHaveCount(0);
    await cdp.detach();
  });
}

test('native pinned popouts stay compact on Map until one task is inspected and remain pinned after leaving', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        document.getElementById('unified-queue-panel').classList.add('popouts-pinned');
        window.fixtureMap.enableOptions();
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  await settle(page);
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  await expect(cards.nth(0).locator('[data-option-index="1"]')).toBeHidden();
  expect((await cards.nth(0).boundingBox()).width).toBe(64);
  await expect(page.locator('#unified-queue-panel .sw-task-preview').first()).toBeHidden();
  await cards.nth(0).locator('.selected').tap();
  await expect(cards.nth(0).locator('[data-option-index="1"]')).toBeVisible();
  await expect(cards.nth(0).locator('.sw-task-preview')).toBeVisible();
  await cards.nth(1).locator('.selected').tap();
  await expect(cards.nth(0).locator('[data-option-index="1"]')).toBeHidden();
  await expect(cards.nth(0).locator('.sw-task-preview')).toBeHidden();
  await expect(cards.nth(1).locator('.sw-task-preview')).toBeVisible();
  await page.locator('#sw-map-close').tap();
  await expect(page.locator('#unified-queue-panel')).toHaveClass(/popouts-pinned/);
  await expect(page.locator('#unified-queue-panel .sw-map-focus')).toHaveCount(0);
  for (const container of await cards.locator('.icon-container').all())
    await expect(container).toHaveClass(/tap-open/);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
});

test('a completed Map drag does not swallow the next native task tap after returning to Tasks', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) => page.evaluate(() => window.fixtureMap.enableOptions()),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const source = await cards.nth(0).locator('.selected').boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const y = source.y + source.height / 2;
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y });
  await touch(cdp, 'touchEnd');
  await expect.poll(() => page.evaluate(() => window.fixtureMap.reorderCalls.length)).toBe(1);
  await page.locator('#sw-map-close').tap();
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  const icon = cards.nth(0).locator('.icon-container');
  await expect(icon).not.toHaveClass(/tap-open/);
  await icon.locator('.selected').tap();
  await expect(icon).toHaveClass(/tap-open/);
  await icon.locator('[data-option-index="1"]').tap();
  await expect(icon.locator('[data-option-index="1"]')).toHaveClass(/tap-preview/);
  await icon.locator('[data-option-index="1"]').tap();
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.optionCalls))
    .toEqual([{ slotIndex: 0, optionIndex: 1 }]);
  expect(await page.evaluate(() => window.fixtureMap.queue[0])).toBe('forage');
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls.length)).toBe(1);
  await cdp.detach();
});

test('a drag hides a pinned task detail popup while the native route preview is active', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        document.getElementById('unified-queue-panel').classList.add('popouts-pinned');
        window.fixtureMap.enableOptions();
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  await cards.nth(0).locator('.selected').tap();
  await expect(cards.nth(0).locator('.sw-task-preview')).toBeVisible();
  const source = await cards.nth(0).locator('.selected').boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const y = source.y + source.height / 2;
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y });
  await expect(page.locator('#unified-queue-panel .sw-task-preview').first()).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).not.toBeNull();
  await touch(cdp, 'touchCancel');
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await cdp.detach();
});

test('fresh keyboard and option clicks stay native after a Map drag with no compatibility click', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        document.getElementById('unified-queue-panel').classList.add('popouts-pinned');
        window.fixtureMap.enableOptions();
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const source = await cards.nth(0).locator('.selected').boundingBox();
  const target = await cards.nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const y = source.y + source.height / 2;
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y });
  await touch(cdp, 'touchEnd');
  await expect.poll(() => page.evaluate(() => window.fixtureMap.reorderCalls.length)).toBe(1);
  const beforeFilter = await page.evaluate(
    () =>
      window.fixtureMap.filterToggleCalls.filter((call) => call.key === 'mapFilterCollapsed')
        .length,
  );
  await page.getByRole('button', { name: 'Map filters', exact: true }).tap();
  await expect(page.locator('.map-filter-panel')).not.toHaveClass(/collapsed/);
  expect(
    await page.evaluate(
      () =>
        window.fixtureMap.filterToggleCalls.filter((call) => call.key === 'mapFilterCollapsed')
          .length,
    ),
  ).toBe(beforeFilter + 1);
  await page.getByRole('button', { name: 'Map filters', exact: true }).press('Enter');
  await expect(page.locator('.map-filter-panel')).toHaveClass(/collapsed/);
  expect(
    await page.evaluate(
      () =>
        window.fixtureMap.filterToggleCalls.filter((call) => call.key === 'mapFilterCollapsed')
          .length,
    ),
  ).toBe(beforeFilter + 2);
  const icon = cards.nth(0).locator('.icon-container');
  await icon.locator('.selected').dispatchEvent('click', { detail: 0 });
  await expect(icon.locator('.selected')).toHaveClass(/tap-preview/);
  await expect(icon.locator('[data-option-index="1"]')).toBeVisible();
  await icon.locator('[data-option-index="1"]').tap();
  await expect(icon.locator('[data-option-index="1"]')).toHaveClass(/tap-preview/);
  expect(await page.evaluate(() => window.fixtureMap.optionCalls)).toEqual([]);
  await icon.locator('[data-option-index="1"]').tap();
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.optionCalls))
    .toEqual([{ slotIndex: 0, optionIndex: 1 }]);
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls.length)).toBe(1);
  await cdp.detach();
});

for (const [name, selector, panel] of [
  ['Menu', '#sw-nav [data-sw-view=menu]', '#sw-menu'],
  ['Bank', '#sw-nav [data-sw-view=bank]', '.modal-overlay'],
  ['Close', '#sw-map-close', '#task-display'],
]) {
  test(`the first ${name} tap after a Map reorder activates once`, async ({ page }) => {
    await loadMapGame(page);
    await page.locator('#sw-nav [data-sw-view=map]').tap();
    const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
    const source = await cards.nth(0).locator('.selected').boundingBox();
    const target = await cards.nth(1).boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const y = source.y + source.height / 2;
    await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y });
    await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y });
    await touch(cdp, 'touchEnd');
    await expect.poll(() => page.evaluate(() => window.fixtureMap.reorderCalls.length)).toBe(1);
    await page.locator(selector).tap();
    await expect(page.locator(panel)).toBeVisible();
    if (name === 'Menu') {
      await expect(page.locator('.map-overlay')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(0);
      await page.locator('#sw-layout-toggle').tap();
      await expect(page.locator('html')).not.toHaveClass(/\bsw-mobile\b/);
      await expect(page.locator('.sw-map-control')).toHaveCount(0);
      const before = await page.evaluate(() => window.fixtureMap.filterToggleCalls.length);
      await page.locator('.map-filter-title').tap();
      await expect(page.locator('.map-filter-panel')).not.toHaveClass(/collapsed/);
      expect(await page.evaluate(() => window.fixtureMap.filterToggleCalls.length)).toBe(
        before + 1,
      );
    } else {
      await expect(page.locator('.map-overlay')).toBeHidden();
      expect(await page.evaluate(() => window.fixtureMap.closeCalls)).toBe(1);
    }
    if (name === 'Bank')
      expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(1);
    await cdp.detach();
  });
}

test('moving outside a horizontally scrolled strip clears the native preview even when hidden rows have negative coordinates', async ({
  page,
}) => {
  await loadMapGame(page, {
    beforeAdapter: async (page) =>
      page.evaluate(() => {
        const queue = Array.from({ length: 8 }, (_, index) => `task${index}`);
        queue.forEach((id, index) => {
          window.fixtureMap.nodes[id] = { x: 180 + index * 200, y: 400 };
        });
        window.fixtureMap.replaceQueue(queue);
      }),
  });
  await page.locator('#sw-nav [data-sw-view=map]').tap();
  const strip = page.locator('#unified-queue-panel .uq-rows');
  const viewport = await strip.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const gutter = { x: viewport.x + viewport.width - 12, y: viewport.y + viewport.height - 12 };
  for (let swipe = 0; swipe < 2; swipe++) {
    await touch(cdp, 'touchStart', gutter);
    for (const distance of [12, 60, 120, 180])
      await touch(cdp, 'touchMove', { x: gutter.x - distance, y: gutter.y });
    await touch(cdp, 'touchEnd');
  }
  await expect
    .poll(() => strip.evaluate((element) => element.scrollLeft))
    .toBeGreaterThanOrEqual(280);
  await strip.evaluate((element) => {
    element.scrollLeft = 280;
  });
  const cards = page.locator('#unified-queue-panel .queue-slot-draggable');
  const hidden = await cards.nth(2).boundingBox();
  expect(hidden.x).toBeLessThan(-1);
  expect(hidden.x + hidden.width).toBeGreaterThan(-1);
  const source = await cards.nth(4).boundingBox();
  const target = await cards.nth(5).boundingBox();
  await touch(cdp, 'touchStart', { x: source.x + source.width / 2, y: source.y + 12 });
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y + 12 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).not.toBeNull();
  await touch(cdp, 'touchMove', { x: target.x + target.width * 0.8, y: source.y - 40 });
  await expect.poll(() => page.evaluate(() => window.fixtureMap.preview)).toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.fixtureMap.route))
    .toEqual(['home', ...Array.from({ length: 8 }, (_, index) => `task${index}`)]);
  await touch(cdp, 'touchEnd');
  expect(await page.evaluate(() => window.fixtureMap.reorderCalls)).toEqual([]);
  await cdp.detach();
});
