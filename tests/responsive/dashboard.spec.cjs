'use strict';

const { test, expect, loadGame, settle, screenshot } = require('../support/game.cjs');
const {
  expectReachable,
  expectWithin,
  safeInsets,
  viewportBounds,
} = require('../support/responsive.cjs');
const { touch } = require('../support/map-input.cjs');

async function loadDashboard(page, prepare) {
  await loadGame(page, {
    scripts: [
      'game.js',
      'combat.js',
      'dialogs.js',
      'layout.js',
      'dashboard/content.js',
      'dashboard/index.js',
    ],
    beforeAdapter: (page) =>
      page.evaluate(
        ({ insets, prepare }) => {
          window.fixtureWorldScene({ combat: false, footer: 'compact' });
          for (const [edge, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${edge}`, `${value}px`);
          if (prepare === 'minimized') document.querySelector('.dashboard-titlebar-min').click();
          if (prepare === 'disabled') window.fixtureDashboardEnable(false);
          if (prepare === 'missing') document.querySelector('.dashboard-panel').remove();
        },
        { insets: safeInsets, prepare },
      ),
  });
}

async function openDashboard(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=character]').tap();
  await page.locator('#sw-character-grid [data-sw-target=dashboard]').tap();
  await settle(page);
  await expect(page.locator('html')).toHaveClass(/\bsw-dashboard\b/);
}

async function selectTab(page, tab) {
  const button = page.locator(`.dashboard-tab[data-tab=${tab}]`);
  await button.scrollIntoViewIfNeeded();
  await button.tap();
  await expect(button).toHaveClass(/active/);
}

for (const viewport of [
  { width: 320, height: 700 },
  { width: 360, height: 740 },
  { width: 740, height: 360 },
  { width: 915, height: 412 },
]) {
  test.describe(`${viewport.width}x${viewport.height} native Dashboard screen`, () => {
    test.use({ viewport });

    test('native tabs remain a single reachable strip and all overview sections fit', async ({
      page,
    }) => {
      await loadDashboard(page);
      await openDashboard(page);
      await expect(page.locator('#sw-nav button')).toHaveCount(6);
      const panel = page.locator('.dashboard-panel');
      const box = await expectWithin(panel, await viewportBounds(page, safeInsets));
      const nav = await page.locator('#sw-nav').boundingBox();
      expect(
        viewport.width > viewport.height ? box.x + box.width : box.y + box.height,
      ).toBeLessThanOrEqual(viewport.width > viewport.height ? nav.x : nav.y);
      await expect(page.locator('.dashboard-titlebar-min')).toBeHidden();
      const tabbar = await page.locator('.dashboard-tabbar').boundingBox();
      expect(tabbar.height).toBeLessThanOrEqual(68);
      const ids = await page
        .locator('.dashboard-tab')
        .evaluateAll((tabs) => tabs.map((tab) => tab.dataset.tab));
      await page.evaluate(() => {
        window.fixtureDashboardPicks = [];
        document.querySelectorAll('.dashboard-tab').forEach((tab) => {
          tab.addEventListener('click', () => window.fixtureDashboardPicks.push(tab.dataset.tab));
        });
      });
      for (const tab of await page.locator('.dashboard-tab').all()) {
        const id = await tab.getAttribute('data-tab');
        await tab.scrollIntoViewIfNeeded();
        await expectReachable(page, tab, { insets: safeInsets });
        const rect = await tab.boundingBox();
        expect(rect.y).toBeGreaterThanOrEqual(tabbar.y);
        expect(rect.y + rect.height).toBeLessThanOrEqual(tabbar.y + tabbar.height);
        await tab.tap();
        expect(await page.evaluate(() => window.fixtureDashboard.activeTab)).toBe(id);
        expect(
          await page
            .locator('.dashboard-content')
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
      }
      expect(await page.evaluate(() => window.fixtureDashboardPicks)).toEqual(ids);
      await selectTab(page, 'xp');
      const rows = await page.locator('.dash-skill-row').all();
      const first = await rows[0].boundingBox();
      const second = await rows[1].boundingBox();
      if (viewport.width > viewport.height) {
        expect(second.x).toBeGreaterThan(first.x + first.width - 1);
        expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
      } else expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
      await expect(panel.locator('.dash-cell-label')).toHaveText([
        'Total Level',
        'Total XP',
        'XP/hr',
      ]);
      for (const value of await panel.locator('.dash-cell-val').all()) {
        expect(
          await value.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getClientRects().length;
          }),
          'Summary numbers stay readable on one line',
        ).toBe(1);
      }
      await screenshot(page, 'dashboard-xp-overview');
      await selectTab(page, 'queue');
      const alt = page.locator('.dash-q-alts-btn').first();
      await expectReachable(page, alt, { insets: safeInsets, scroll: true });
      await alt.tap();
      await expect(page.locator('.dash-q-alts')).toBeVisible();
      expect(await page.evaluate(() => window.fixtureDashboard.actions)).toEqual(['alternative']);
      await screenshot(page, 'dashboard-queue-overview');
      expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
    });

    test('native goals, settings and close actions retain readable touch targets', async ({
      page,
    }) => {
      await loadDashboard(page);
      await openDashboard(page);
      await selectTab(page, 'goals');
      for (const control of await page.locator('.dash-goal-form > *').all())
        await expectReachable(page, control, { insets: safeInsets });
      await page.locator('.dash-goal-skill').selectOption('sight');
      await page.locator('.dash-goal-target').fill('125');
      await page.locator('.dash-goal-add').tap();
      expect(await page.evaluate(() => window.fixtureDashboard.goal)).toEqual({
        skill: 'sight',
        level: '125',
      });
      await expectReachable(page, page.locator('.dash-goal-del'), {
        insets: safeInsets,
        scroll: true,
      });
      await page.locator('.dash-goal-del').tap();
      await selectTab(page, 'settings');
      const toggle = page.locator('.dash-set-toggle');
      await expectReachable(page, toggle, { insets: safeInsets, scroll: true });
      await toggle.tap();
      await expect(page.locator('.dash-switch')).toHaveClass(/on/);
      await expectReachable(page, page.locator('.dash-set-slider input'), {
        insets: safeInsets,
        scroll: true,
      });
      for (const control of await page.locator('.dash-tabcfg-row').last().locator('button').all())
        await expectReachable(page, control, { insets: safeInsets, scroll: true });
      const down = page.locator('.dash-tabcfg-row').last().locator('[data-move=down]');
      await down.tap();
      expect(await page.evaluate(() => window.fixtureDashboard.actions)).toEqual([
        'goal-add',
        'goal-delete',
        'notifySlay',
        'move-down',
      ]);
      await screenshot(page, 'dashboard-native-settings');
      const close = page.locator('.dashboard-titlebar-close');
      await expectReachable(page, close, { insets: safeInsets });
      await close.tap();
      await settle(page);
      await expect(page.locator('html')).not.toHaveClass(/\bsw-dashboard\b/);
      await expect(page.locator('#sw-view-title')).toHaveText('World');
      await expect(page.locator('.dashboard-panel')).toBeHidden();
      expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(1);
    });
  });
}

test('minimized native Dashboard opens restored and titlebar touch leaves desktop position untouched', async ({
  page,
}) => {
  await loadDashboard(page, 'minimized');
  await openDashboard(page);
  await expect(page.locator('.dashboard-panel')).not.toHaveClass(/dashboard-minimized/);
  expect(await page.evaluate(() => window.fixtureDashboard.minimizeClicks)).toBe(2);
  const label = await page.locator('.dashboard-titlebar-label').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const point = { x: label.x + label.width / 2, y: label.y + label.height / 2 };
  await touch(cdp, 'touchStart', point);
  await touch(cdp, 'touchMove', { x: point.x + 80, y: point.y + 40 });
  await touch(cdp, 'touchEnd');
  await cdp.detach();
  expect(await page.evaluate(() => window.fixtureDashboard.dragStarts)).toBe(0);
  expect(
    await page
      .locator('.dashboard-panel')
      .evaluate((el) => ({ left: el.style.left, top: el.style.top })),
  ).toEqual({ left: '24px', top: '96px' });
});

test('Dashboard Menu round-trip, native refresh and rotation retain the selected native tab', async ({
  page,
}) => {
  await loadDashboard(page);
  await openDashboard(page);
  await selectTab(page, 'loot');
  for (const viewport of [
    { width: 740, height: 360 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.fixtureDashboardRefresh());
    await settle(page);
    await expectWithin(page.locator('.dashboard-panel'), await viewportBounds(page, safeInsets));
    await expect(page.locator('.dashboard-tab[data-tab=loot]')).toHaveClass(/active/);
    expect(
      await page
        .locator('.dashboard-content')
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  }
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await expect(page.locator('.dashboard-panel')).toBeHidden();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await expect(page.locator('.dashboard-panel')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureDashboard.launcherClicks)).toBe(1);
  expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(0);
  await page.locator('#sw-nav [data-sw-view=tasks]').tap();
  await expect(page.locator('.dashboard-panel')).toBeHidden();
  await expect(page.locator('#unified-queue-panel')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(1);
});

test('Bank to Dashboard to Bank uses each original action once', async ({ page }) => {
  await loadDashboard(page);
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  await openDashboard(page);
  await expect(page.locator('.modal-overlay')).toBeHidden();
  await expect(page.locator('#sw-nav [data-sw-view=bank]')).toHaveAttribute(
    'aria-current',
    'false',
  );
  await page.locator('#sw-nav [data-sw-view=bank]').tap();
  await expect(page.locator('.dashboard-panel')).toBeHidden();
  await expect(page.locator('#tab-bank')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureState.modalClicks.bank)).toBe(2);
  expect(await page.evaluate(() => window.fixtureDashboard.launcherClicks)).toBe(1);
  expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(1);
});

for (const control of ['health', 'dock']) {
  test(`native ${control} selection closes Dashboard and opens Tasks once`, async ({ page }) => {
    await loadDashboard(page);
    await openDashboard(page);
    if (control === 'health') await page.locator('.hp-bar').tap();
    else await page.locator('#toggle-tasks').evaluate((el) => el.click());
    await settle(page);
    await expect(page.locator('.dashboard-panel')).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/\bsw-dashboard\b/);
    await expect(page.locator('#unified-queue-panel')).toBeVisible();
    await expect(page.locator('#sw-nav [data-sw-view=tasks]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(1);
    expect(await page.evaluate(() => window.fixtureState.panelClicks.tasks)).toBe(1);
    expect(await page.evaluate(() => window.fixtureState.hpNativeClicks)).toBe(
      control === 'health' ? 1 : 0,
    );
    expect(await page.evaluate(() => JSON.stringify(window.fixtureState.gameplay))).toBe(
      await page.evaluate(() => window.fixtureOriginalGameplay),
    );
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('Original UI native selection keeps the floating Dashboard open', async ({ page }) => {
  await loadDashboard(page);
  await openDashboard(page);
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await page.locator('#toggle-tasks').tap();
  await settle(page);
  await expect(page.locator('.dashboard-panel')).toBeVisible();
  await expect(page.locator('#unified-queue-panel')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(0);
  expect(await page.evaluate(() => window.fixtureState.panelClicks.tasks)).toBe(1);
  expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
});

for (const prepare of ['disabled', 'missing']) {
  test(`native ${prepare} Dashboard availability is respected`, async ({ page }) => {
    await loadDashboard(page, prepare);
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
    await page.locator('#sw-character-grid [data-sw-target=dashboard]').tap();
    await expect(page.locator('#sw-toast')).toContainText(
      prepare === 'disabled' ? 'Enable Dashboard' : 'not available',
    );
    await expect(page.locator('html')).not.toHaveClass(/\bsw-dashboard\b/);
    expect(await page.evaluate(() => window.fixtureDashboard.enabled)).toBe(prepare !== 'disabled');
    expect(await page.evaluate(() => window.fixtureState.networkCalls)).toEqual([]);
  });
}

test('Original UI and cached page restoration retain native Dashboard identity and handlers', async ({
  page,
}) => {
  await loadDashboard(page);
  await openDashboard(page);
  await selectTab(page, 'queue');
  await page.evaluate(() => {
    window.fixtureDashboardNode = document.querySelector('.dashboard-panel');
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await settle(page);
  await expect(page.locator('.dashboard-panel')).toBeVisible();
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('#sw-layout-toggle').tap();
  await expect(page.locator('.dashboard-titlebar-min')).toBeVisible();
  expect(
    await page.locator('.dashboard-titlebar').evaluate((el) => getComputedStyle(el).height),
  ).toBe('24px');
  expect(
    await page.evaluate(
      () => window.fixtureDashboardNode === document.querySelector('.dashboard-panel'),
    ),
  ).toBe(true);
  await page.locator('.dashboard-titlebar-min').evaluate((el) => el.click());
  expect(await page.evaluate(() => window.fixtureDashboard.minimizeClicks)).toBe(1);
  await page.locator('#sw-layout-toggle').tap();
  await settle(page);
  await expect(page.locator('.dashboard-panel')).not.toHaveClass(/dashboard-minimized/);
  await expect(page.locator('.dashboard-tab[data-tab=queue]')).toHaveClass(/active/);
  await page.locator('.dashboard-titlebar-close').tap();
  await settle(page);
  await expect(page.locator('#sw-view-title')).toHaveText('World');
  expect(await page.evaluate(() => window.fixtureDashboard.closeClicks)).toBe(1);
});
