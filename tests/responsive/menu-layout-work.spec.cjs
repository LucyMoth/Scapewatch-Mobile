'use strict';

const { test, expect, loadGame, settle } = require('../support/game.cjs');

test('Bank navigation applies its final presentation once and retains one native action', async ({
  page,
}) => {
  await loadGame(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  const result = await page.evaluate(() => {
    const setAttribute = Element.prototype.setAttribute;
    let updates = 0;
    Element.prototype.setAttribute = function (name, ...args) {
      if (name === 'aria-current' && this.matches('#sw-nav button')) updates++;
      return setAttribute.call(this, name, ...args);
    };
    try {
      document.querySelector('#sw-nav [data-sw-view=bank]').click();
      const opened = {
        updates,
        menuHidden: document.querySelector('#sw-menu').hidden,
        title: document.querySelector('#sw-view-title').textContent,
        nativeClicks: window.fixtureState.modalClicks.bank,
      };
      updates = 0;
      document.querySelector('#sw-nav [data-sw-view=bank]').click();
      return {
        opened,
        closed: {
          updates,
          title: document.querySelector('#sw-view-title').textContent,
          nativeClicks: window.fixtureState.modalClicks.bank,
        },
        buttons: document.querySelectorAll('#sw-nav button').length,
      };
    } finally {
      Element.prototype.setAttribute = setAttribute;
    }
  });
  expect(result.opened).toEqual({
    updates: result.buttons,
    menuHidden: true,
    title: 'Bank',
    nativeClicks: 1,
  });
  expect(result.closed).toEqual({ updates: result.buttons, title: 'World', nativeClicks: 1 });
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

async function loadUnlocks(page) {
  await loadGame(page, {
    scripts: ['game.js', 'collections.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        const grid = document.querySelector('#tab-unlocks .unlocks-grid');
        const children = Object.getOwnPropertyDescriptor(Element.prototype, 'children');
        const setProperty = CSSStyleDeclaration.prototype.setProperty;
        window.fixtureUnlocksWork = { children: 0, positions: 0 };
        Object.defineProperty(Element.prototype, 'children', {
          ...children,
          get() {
            if (this === grid) window.fixtureUnlocksWork.children++;
            return children.get.call(this);
          },
        });
        CSSStyleDeclaration.prototype.setProperty = function (name, ...args) {
          if (name.startsWith('--sw-unlock-')) window.fixtureUnlocksWork.positions++;
          return setProperty.call(this, name, ...args);
        };
      });
    },
  });
}

test('unrelated menu taps reuse Unlocks layout without traversing its cached cells', async ({
  page,
}) => {
  await loadUnlocks(page);
  const result = await page.evaluate(() => {
    window.fixtureUnlocksWork = { children: 0, positions: 0 };
    for (let index = 0; index < 4; index++) {
      document.querySelector('#sw-nav [data-sw-view=menu]').click();
      document.querySelector('#sw-menu [data-sw-target=quests]').click();
    }
    return window.fixtureUnlocksWork;
  });
  expect(result).toEqual({ children: 0, positions: 0 });
  expect(await page.evaluate(() => window.fixtureState.modalClicks.quests)).toBe(4);
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

test('Unlocks height changes retain coordinates while column changes recalculate them', async ({
  page,
}) => {
  await loadUnlocks(page);
  await page.evaluate(() => window.fixtureUnlocksView('Unlocks'));
  await settle(page);
  const before = await page.locator('.sw-unlocks-grid').evaluate((grid) => {
    window.fixtureUnlocksWork = { children: 0, positions: 0 };
    const columns = grid.style.getPropertyValue('--sw-unlock-columns');
    grid.style.paddingBottom = '9px';
    return columns;
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.evaluate(() => window.fixtureUnlocksWork.positions)).toBe(0);
  await page.locator('.sw-unlocks-grid').evaluate((grid) => {
    grid.style.width = '160px';
  });
  await expect
    .poll(() =>
      page
        .locator('.sw-unlocks-grid')
        .evaluate((grid) => grid.style.getPropertyValue('--sw-unlock-columns')),
    )
    .not.toBe(before);
  expect(await page.evaluate(() => window.fixtureUnlocksWork.positions)).toBeGreaterThan(0);
});

test('native Unlocks child replacement invalidates only that grid and restores native styles', async ({
  page,
}) => {
  await loadUnlocks(page);
  await page.evaluate(() => window.fixtureUnlocksView('Unlocks'));
  await settle(page);
  await page.locator('.sw-unlocks-grid').evaluate((grid) => {
    const cell = document.createElement('div');
    cell.className = 'unlock-item';
    cell.style.setProperty('--sw-unlock-row', '999');
    cell.textContent = 'New native reward';
    grid.append(cell);
  });
  const cell = page.locator('#tab-unlocks .unlock-item').filter({ hasText: 'New native reward' });
  await expect
    .poll(() => cell.evaluate((node) => node.style.getPropertyValue('--sw-unlock-row')))
    .not.toBe('999');
  await page.evaluate(() => {
    document.querySelector('#sw-nav [data-sw-view=menu]').click();
    document.querySelector('#sw-layout-toggle').click();
  });
  await expect(page.locator('#tab-unlocks .sw-unlocks-grid')).toHaveCount(0);
  expect(await cell.evaluate((node) => node.style.getPropertyValue('--sw-unlock-row'))).toBe('999');
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});
