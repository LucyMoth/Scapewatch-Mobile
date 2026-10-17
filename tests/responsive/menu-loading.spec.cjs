'use strict';

const { test, expect, loadGame } = require('../support/game.cjs');

test('native rebuilt menu content receives its mobile layout before the click returns', async ({
  page,
}) => {
  await loadGame(page, {
    scripts: ['game.js', 'quests.js'],
    beforeAdapter: async (page) => {
      await page.evaluate(() => {
        const source = document.querySelector('.quest-layout').cloneNode(true);
        document
          .querySelector('.floating-tab-strip [data-tab=quests]')
          .addEventListener('click', () => {
            document.querySelector('.quest-layout').replaceWith(source.cloneNode(true));
          });
      });
    },
  });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  const immediate = await page.evaluate(() => {
    document.querySelector('#sw-menu [data-sw-target=quests]').click();
    return {
      backButtons: document.querySelectorAll('#tab-quests .sw-quest-back').length,
      menuHidden: document.querySelector('#sw-menu').hidden,
      nativeClicks: window.fixtureState.modalClicks.quests,
    };
  });
  expect(immediate).toEqual({ backButtons: 1, menuHidden: true, nativeClicks: 1 });
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

async function loadMenuAssets(page, { login = false } = {}) {
  await loadGame(page, {
    beforeAdapter: async (page) => {
      await page.evaluate((login) => {
        if (login) window.fixtureLogin(true);
        const callbacks = new Map();
        let nextId = 0;
        window.requestIdleCallback = (callback) => {
          callbacks.set(++nextId, callback);
          return nextId;
        };
        window.cancelIdleCallback = (id) => callbacks.delete(id);
        window.fixtureRunIdle = () => {
          for (const [id, callback] of callbacks) {
            callbacks.delete(id);
            callback({ timeRemaining: () => 30, didTimeout: false });
          }
        };
        window.fixtureMenuImages = [];
        window.Image = function () {
          const image = {
            removeAttribute(name) {
              if (name === 'src') this.cancelledSrc = this.src;
              delete this[name];
            },
          };
          window.fixtureMenuImages.push(image);
          return image;
        };
        const tab = document.querySelector('#tab-mobs');
        for (const path of [
          'https://unrelated.example/assets/mobs/bg/remote.png',
          '/api/private.png',
          '/assets/mobs/bg/zero.png?private=1',
          '/assets/mobs/bg/one.png',
          '/assets/mobs/bg/one.png',
          '/assets/mobs/bg/two.png',
          '/assets/mobs/bg/three.png',
          '/assets/mobs/bg/four.png',
          '/assets/mobs/bg/five.png',
        ]) {
          const node = document.createElement('div');
          node.className = 'mob-row-icon';
          node.style.backgroundImage = `url("${path}")`;
          tab.append(node);
        }
      }, login);
    },
  });
}

test('menu warms four native mob backgrounds at idle with at most two in flight', async ({
  page,
}) => {
  await loadMenuAssets(page);
  const images = () =>
    page.evaluate(() =>
      window.fixtureMenuImages
        .filter((image) => image.src?.includes('/assets/mobs/bg/'))
        .map((image) => ({
          src: image.src,
          pending: !!image.onload,
          priority: image.fetchPriority,
        })),
    );
  expect(await images()).toEqual([]);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  expect(await images(), 'Opening Menu does not load assets in its click handler').toEqual([]);
  await page.evaluate(() => window.fixtureRunIdle());
  expect(await images()).toEqual([
    { src: 'https://play.scapewatch.com/assets/mobs/bg/one.png', pending: true, priority: 'low' },
    { src: 'https://play.scapewatch.com/assets/mobs/bg/two.png', pending: true, priority: 'low' },
  ]);
  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) {
      const image = window.fixtureMenuImages.find(
        (image) => image.src?.includes('/assets/mobs/bg/') && image.onload,
      );
      image.onload();
    }
  });
  expect((await images()).map((image) => image.src)).toEqual(
    ['one', 'two', 'three', 'four'].map(
      (name) => `https://play.scapewatch.com/assets/mobs/bg/${name}.png`,
    ),
  );
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.evaluate(() => window.fixtureRunIdle());
  expect(await images()).toHaveLength(4);
  expect(await page.evaluate(() => window.fixtureState.modalClicks)).toEqual({});
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

test('menu asset warmup waits for login and releases pending callbacks on pagehide', async ({
  page,
}) => {
  await loadMenuAssets(page, { login: true });
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.evaluate(() => window.fixtureRunIdle());
  const pending = () =>
    page.evaluate(
      () =>
        window.fixtureMenuImages.filter(
          (image) => image.src?.includes('/assets/mobs/bg/') && image.onload,
        ).length,
    );
  expect(await pending()).toBe(0);
  await page.evaluate(() => window.fixtureLogin(false));
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.evaluate(() => window.fixtureRunIdle());
  expect(await pending()).toBe(2);
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  expect(await pending()).toBe(0);
  expect(
    await page.evaluate(
      () =>
        window.fixtureMenuImages.filter((image) => image.cancelledSrc?.includes('/assets/mobs/bg/'))
          .length,
    ),
  ).toBe(2);
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    window.fixtureRunIdle();
  });
  expect(await pending()).toBe(2);
});
