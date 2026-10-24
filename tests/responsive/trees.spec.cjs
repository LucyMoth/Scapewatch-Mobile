'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  expectReachable,
  expectWithin,
  viewportBounds,
  safeInsets,
} = require('../support/responsive.cjs');

async function loadTree(page, skill = 'Delve') {
  await loadGame(page, {
    scripts: ['game.js', 'trees/index.js'],
    beforeAdapter: (page) =>
      page.evaluate(
        ({ skill, insets }) => {
          for (const [edge, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
          window.fixtureTreeOpen(skill);
        },
        { skill, insets: safeInsets },
      ),
  });
}

async function geometry(page) {
  return page.locator('.rtv-root:visible').evaluate((root) => {
    const stage = root.querySelector('.rtv-stage');
    const fit = root.querySelector('.rtv-fit');
    const box = fit.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      x:
        (stage.scrollLeft +
          stage.clientWidth / 2 -
          Math.max(0, (stage.clientWidth - box.width) / 2)) /
        box.width,
      y:
        (stage.scrollTop +
          stage.clientHeight / 2 -
          Math.max(0, (stage.clientHeight - box.height) / 2)) /
        box.height,
      stage: { x: stageBox.x, y: stageBox.y, width: stageBox.width, height: stageBox.height },
    };
  });
}

async function expectAligned(page) {
  expect(
    await page.locator('.rtv-root:visible').evaluate((root) => {
      const svg = root.querySelector('svg');
      const matrix = svg.getScreenCTM();
      return Array.from(root.querySelectorAll('.rtv-hit')).every((hit) => {
        const node = svg.querySelector(`[data-fixture-node="${hit.dataset.fixtureNode}"]`);
        const center =
          node.tagName === 'circle'
            ? { x: node.cx.baseVal.value, y: node.cy.baseVal.value }
            : {
                x: (node.points[0].x + node.points[2].x) / 2,
                y: (node.points[0].y + node.points[2].y) / 2,
              };
        const point = new DOMPoint(center.x, center.y).matrixTransform(matrix);
        const box = hit.getBoundingClientRect();
        return (
          Math.abs(point.x - (box.left + box.width / 2)) < 1 &&
          Math.abs(point.y - (box.top + box.height / 2)) < 1
        );
      });
    }),
    'Native percentage hit targets remain exactly aligned with the SVG nodes',
  ).toBe(true);
  const current = await geometry(page);
  expect(current.width / current.height).toBeCloseTo(1000 / 600, 3);
}

async function dispatchTouch(cdp, type, points = []) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, index) => ({
      ...point,
      id: index + 1,
      radiusX: 4,
      radiusY: 4,
    })),
  });
}

async function pinch(page) {
  const { stage } = await geometry(page);
  const center = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await dispatchTouch(cdp, 'touchStart', [
    { x: center.x - 20, y: center.y },
    { x: center.x + 20, y: center.y },
  ]);
  for (const delta of [24, 32, 40, 50])
    await dispatchTouch(cdp, 'touchMove', [
      { x: center.x - delta, y: center.y },
      { x: center.x + delta, y: center.y },
    ]);
  await dispatchTouch(cdp, 'touchEnd');
  await cdp.detach();
  await settle(page);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} native talent trees`, () => {
    test.use({ viewport });

    for (const skill of ['Delve', 'Fortify']) {
      test(`${skill} fits, zooms and preserves original node allocation, refund and descriptions`, async ({
        page,
      }) => {
        await loadTree(page, skill);
        await expect(page.locator('.rtv-root:visible .rtv-meter .n')).toHaveText(['1', '0', '146']);
        const controls = page.locator('.rtv-root:visible .sw-tree-controls');
        await expect(controls.locator('.sw-tree-gesture-hint')).toContainText('Drag to explore');
        for (const button of await controls.locator('button').all())
          await expectReachable(page, button);
        await expectReachable(page, controls.locator('summary'));
        await controls.locator('[data-sw-tree-action=fit]').tap();
        const fit = await geometry(page);
        expect(fit.width).toBeLessThanOrEqual(fit.stage.width + 1);
        expect(fit.height).toBeLessThanOrEqual(fit.stage.height + 1);
        await expectAligned(page);
        await controls.locator('[data-sw-tree-action=in]').tap();
        await settle(page);
        expect((await geometry(page)).width).toBeGreaterThan(fit.width);
        await controls.locator('summary').tap();
        await expect(
          page.locator('.rtv-root:visible .sw-tree-bonuses .rtv-legend .row'),
        ).toHaveCount(11);
        await expectWithin(
          page.locator('.rtv-root:visible .rtv-legend'),
          await viewportBounds(page),
        );
        await screenshot(page, `${skill.toLowerCase()}-bonuses`);
        await controls.locator('summary').tap();
        const node = page.locator('.rtv-root:visible .rtv-hit').first();
        await node.scrollIntoViewIfNeeded();
        await node.tap();
        expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([
          `${skill}:allocate:1`,
        ]);
        await node.dispatchEvent('contextmenu', { button: 2 });
        expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([
          `${skill}:allocate:1`,
          `${skill}:refund:1`,
        ]);
        await node.dispatchEvent('mouseenter');
        const tip = page.locator('.rtv-root:visible .rtv-tip');
        await expect(tip).toHaveClass(/\bon\b/);
        await expectWithin(tip, await viewportBounds(page));
        expect(
          await tip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBe(true);
        await expect(tip).toContainText('Refunding an outer node returns its talent point.');
        expect(
          await tip.evaluate(
            (element) =>
              element.querySelector('.d').getBoundingClientRect().bottom <=
              element.getBoundingClientRect().bottom - 4,
          ),
          'The complete native description is visible in a short landscape tree',
        ).toBe(true);
        await expectAligned(page);
        await screenshot(page, `${skill.toLowerCase()}-zoomed`);
        await expectReachable(page, page.locator('.modal-close'));
        await page.locator('.modal-close').tap();
      });
    }

    test('real pinch and drag do not allocate, and the next native tap still works', async ({
      page,
    }) => {
      await loadTree(page);
      const before = await geometry(page);
      await pinch(page);
      const zoomed = await geometry(page);
      expect(zoomed.width).toBeGreaterThan(before.width * 2);
      await expectAligned(page);
      const node = page.locator('.rtv-root:visible .rtv-hit').first();
      await node.scrollIntoViewIfNeeded();
      const box = await node.boundingBox();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const cdp = await page.context().newCDPSession(page);
      await dispatchTouch(cdp, 'touchStart', [point]);
      for (const fraction of [0.25, 0.5, 0.75, 1])
        await dispatchTouch(cdp, 'touchMove', [
          { x: point.x - 45 * fraction, y: point.y - 24 * fraction },
        ]);
      await dispatchTouch(cdp, 'touchEnd');
      await cdp.detach();
      await settle(page);
      expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
      expect((await geometry(page)).x).not.toBe(zoomed.x);
      await node.scrollIntoViewIfNeeded();
      await node.tap();
      expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual(['Delve:allocate:1']);
      await expectAligned(page);
    });
  });
}

test('rotation and native redraw keep the zoomed center without allocating or refunding', async ({
  page,
}) => {
  await loadTree(page);
  await pinch(page);
  const before = await geometry(page);
  for (const viewport of [
    { width: 740, height: 360 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await settle(page);
    await expectAligned(page);
    const current = await geometry(page);
    expect(current.x).toBeCloseTo(before.x, 2);
    expect(current.y).toBeCloseTo(before.y, 2);
  }
  await page.evaluate(() => window.fixtureTreeRerender());
  await settle(page);
  await expect(page.locator('.rtv-root:visible .sw-tree-controls')).toHaveCount(1);
  const after = await geometry(page);
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.x).toBeCloseTo(before.x, 2);
  expect(after.y).toBeCloseTo(before.y, 2);
  await expectAligned(page);
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
});

test('Original UI and pagehide restore the exact native legend, fit styles and hit nodes', async ({
  page,
}) => {
  await loadTree(page);
  await pinch(page);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  const restored = () =>
    page.evaluate(() => {
      const original = window.fixtureTree.original;
      return (
        original.legend.parentNode === original.stage &&
        original.fit.style.cssText === original.fitStyle &&
        original.hits.every(
          (node, index) => node === original.fit.querySelectorAll('.rtv-hit')[index],
        ) &&
        original.svg === original.fit.querySelector('svg') &&
        !window.fixtureTree.root.classList.contains('sw-tree-root')
      );
    });
  expect(await restored()).toBe(true);
  await expect(page.locator('.sw-tree-controls')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await settle(page);
  await expect(page.locator('.rtv-root:visible .sw-tree-controls')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await restored()).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await settle(page);
  await expect(page.locator('.rtv-root:visible .sw-tree-controls')).toHaveCount(1);
  await expectAligned(page);
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
});

test('cancelled pinch and native subtree replacement never trigger a talent action', async ({
  page,
}) => {
  await loadTree(page);
  const { stage } = await geometry(page);
  const center = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await dispatchTouch(cdp, 'touchStart', [
    { x: center.x - 20, y: center.y },
    { x: center.x + 20, y: center.y },
  ]);
  await dispatchTouch(cdp, 'touchMove', [
    { x: center.x - 40, y: center.y },
    { x: center.x + 40, y: center.y },
  ]);
  await dispatchTouch(cdp, 'touchCancel');
  await page.evaluate(() => window.fixtureTreeRerender());
  await settle(page);
  await dispatchTouch(cdp, 'touchStart', [center]);
  await dispatchTouch(cdp, 'touchMove', [{ x: center.x - 30, y: center.y }]);
  await page.evaluate(() => window.fixtureTreeRerender());
  await dispatchTouch(cdp, 'touchEnd');
  await cdp.detach();
  await settle(page);
  await expectAligned(page);
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
  await page.locator('.rtv-hit').first().tap();
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual(['Delve:allocate:1']);
});

test('shared Unlocks panel keeps Delve and Fortify centers and zoom levels independent', async ({
  page,
}) => {
  await loadTree(page);
  await pinch(page);
  const delve = await geometry(page);
  await page.evaluate(() => window.fixtureTreeOpen('Fortify'));
  await settle(page);
  const fortify = await geometry(page);
  expect(fortify.width).toBeLessThan(delve.width / 2);
  await page.locator('.rtv-root:visible [data-sw-tree-action=in]').tap();
  await settle(page);
  const changedFortify = await geometry(page);
  await page.evaluate(() => window.fixtureTreeOpen('Delve'));
  await settle(page);
  const restoredDelve = await geometry(page);
  expect(restoredDelve.width).toBeCloseTo(delve.width, 1);
  expect(restoredDelve.x).toBeCloseTo(delve.x, 2);
  expect(restoredDelve.y).toBeCloseTo(delve.y, 2);
  await page.evaluate(() => window.fixtureTreeOpen('Fortify'));
  await settle(page);
  expect((await geometry(page)).width).toBeCloseTo(changedFortify.width, 1);
  await expectAligned(page);
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
});

test('leaving a tree by wrapper style change releases captures and restores the regular Unlocks page', async ({
  page,
}) => {
  await loadTree(page);
  const { stage } = await geometry(page);
  const center = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await dispatchTouch(cdp, 'touchStart', [
    { x: center.x - 20, y: center.y },
    { x: center.x + 20, y: center.y },
  ]);
  await dispatchTouch(cdp, 'touchMove', [
    { x: center.x - 40, y: center.y },
    { x: center.x + 40, y: center.y },
  ]);
  const captured = await page.evaluate(() => {
    const stage = window.fixtureTree.root.querySelector('.rtv-stage');
    return [...window.fixtureTree.pointerIds].filter((id) => stage.hasPointerCapture(id));
  });
  expect(captured).toHaveLength(2);
  await page.evaluate(() => window.fixtureTreeExit());
  await settle(page);
  expect(
    await page.locator('#tab-unlocks').evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe('auto');
  expect(
    await page
      .locator('.rtv-stage')
      .first()
      .evaluate(
        (element, captured) => captured.every((id) => !element.hasPointerCapture(id)),
        captured,
      ),
  ).toBe(true);
  await dispatchTouch(cdp, 'touchEnd');
  await cdp.detach();
  await page.evaluate(() => window.fixtureTreeOpen());
  await settle(page);
  await expectAligned(page);
  expect(await page.evaluate(() => window.fixtureTree.actions)).toEqual([]);
});
