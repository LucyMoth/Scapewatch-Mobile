'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');
const { expectWithin, viewportBounds, safeInsets } = require('../support/responsive.cjs');
const { touch } = require('../support/map-input.cjs');

for (const viewport of [
  { width: 320, height: 460 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
]) {
  test(`Location details scroll above navigation at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, {
      scripts: ['game.js', 'combat.js', 'dialogs.js', 'layout.js'],
      beforeAdapter: (page) =>
        page.evaluate((insets) => {
          window.fixtureWorldScene({ combat: false, footer: 'compact' });
          for (const [side, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
        }, safeInsets),
    });
    await page.evaluate(() => {
      const tip = document.querySelector('.global-tooltip');
      tip.classList.add('node-style');
      tip.style.cssText = 'display:block;left:-500px;top:900px;width:800px;transform:scale(1.8)';
      tip.innerHTML =
        '<div class="tt-name">Duneridge Hearth</div><div class="tt-line tt-bank-line">Nearest bank: Duneridge Expedition Outpost Bank (81)</div><div class="tt-section-label">Cook</div>' +
        Array.from(
          { length: 20 },
          (_, i) =>
            `<div class="tt-act-row"><span class="tt-act-lv">Lv ${i * 5 + 1}</span><span class="tt-act-name">Recipe ${i + 1}</span></div>`,
        ).join('');
      window.fixtureLocationHtml = tip.innerHTML;
      window.fixtureLocationDismisses = 0;
      document.addEventListener('touchstart', (event) => {
        if (tip.contains(event.target)) return;
        tip.style.display = 'none';
        window.fixtureLocationDismisses++;
      });
    });
    await settle(page);
    const tip = page.locator('.global-tooltip.node-style');
    const box = await expectWithin(tip, await viewportBounds(page, safeInsets));
    expect(await tip.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
      Math.ceil(box.width),
    );
    const dock = await page.locator('#sw-nav').boundingBox();
    if (viewport.width > viewport.height) expect(box.x + box.width).toBeLessThanOrEqual(dock.x);
    else expect(box.y + box.height).toBeLessThanOrEqual(dock.y);
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2;
    await touch(cdp, 'touchStart', { x, y: box.y + box.height - 24 });
    for (const fraction of [0.25, 0.5, 0.75, 1])
      await touch(cdp, 'touchMove', {
        x,
        y: box.y + box.height - 24 - (box.height - 60) * fraction,
      });
    await touch(cdp, 'touchEnd');
    await cdp.detach();
    await expect(tip).toBeVisible();
    expect(await tip.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.fixtureLocationDismisses)).toBe(0);
    const last = tip.locator('.tt-act-row').last();
    await last.scrollIntoViewIfNeeded();
    await expectWithin(last, await viewportBounds(page, safeInsets));
    expect(await tip.innerHTML()).toBe(await page.evaluate(() => window.fixtureLocationHtml));
    expect(await page.evaluate(() => window.__swMobileBack())).toBe(true);
    await expect(tip).toBeHidden();
    expect(await page.evaluate(() => window.fixtureLocationDismisses)).toBe(1);
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}
