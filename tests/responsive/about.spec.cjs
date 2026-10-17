'use strict';

const { test, expect, loadGame, screenshot } = require('../support/game.cjs');
const { openAbout, expectPlaying } = require('../support/about.cjs');
const { expectReachable, nativeSnapshot, safeInsets } = require('../support/responsive.cjs');

for (const viewport of [
  { width: 320, height: 700 },
  { width: 412, height: 915 },
  { width: 640, height: 300 },
  { width: 740, height: 360 },
]) {
  test(`About credits, video and social links stay readable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, {
      scripts: ['game.js', 'credits.js'],
      beforeAdapter: async (page) => {
        await page.evaluate((insets) => {
          for (const [side, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
        }, safeInsets);
      },
    });
    const before = await nativeSnapshot(page);
    const video = await openAbout(page);
    await expectPlaying(video);
    await expect(page.locator('.sw-about-author')).toHaveText(/\S/);
    await expect(page.locator('#sw-about p')).toHaveCount(0);
    await expect(page.locator('#sw-about-logo')).toHaveAttribute('src', /^data:image\/png;base64,/);
    expect(await page.locator('#sw-about-logo').evaluate((image) => image.naturalWidth)).toBe(512);
    for (const tab of await page.locator('.sw-menu-tabs button').all()) {
      await expectReachable(page, tab, { insets: safeInsets });
      expect(
        await tab.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          const button = element.getBoundingClientRect();
          return text.left >= button.left + 1 && text.right <= button.right - 1;
        }),
        'Menu section text fits its own button',
      ).toBe(true);
    }
    for (const link of await page.locator('.sw-about-social a').all())
      await expectReachable(page, link, { insets: safeInsets, scroll: true });
    await expectReachable(page, page.locator('#sw-about-credits'), {
      insets: safeInsets,
      scroll: true,
    });
    for (const selector of [
      '[aria-label="Scapewatch social links"]',
      '[aria-label="Scapewatch resources"]',
    ]) {
      const rows = await page.locator(`${selector} a`).evaluateAll((links) => {
        const rows = new Map();
        for (const link of links) {
          const top = Math.round(link.getBoundingClientRect().top);
          rows.set(top, (rows.get(top) || 0) + 1);
        }
        return [...rows.values()];
      });
      expect(rows, 'Official links remain three per row').toEqual(
        selector.includes('resources') ? [3, 3] : [3],
      );
    }
    const credits = await page.locator('#sw-about-credits').boundingBox();
    const resources = await page.locator('.sw-about-resources').boundingBox();
    expect(
      Math.abs(credits.width - resources.width),
      'Credits spans all three columns',
    ).toBeLessThan(2);
    expect(await nativeSnapshot(page), 'About changes no game actions or settings').toEqual(before);
    await screenshot(page, 'about-app');
  });
}

test('official links use the original website destinations', async ({ page }) => {
  await loadGame(page, { scripts: ['game.js', 'credits.js'] });
  await openAbout(page);
  for (const [label, url] of [
    ['Website', 'https://scapewatch.com/'],
    ['Discord', 'https://discord.gg/rBuXwzbzHn'],
    ['YouTube', 'https://www.youtube.com/@ScapeWatchYT'],
    ['Wiki', 'https://scapewatch.com/wiki'],
    ['Guide', 'https://scapewatch.com/guide'],
    ['Map', 'https://scapewatch.com/map'],
    ['Presskit', 'https://scapewatch.com/presskit'],
    ['Privacy', 'https://scapewatch.com/privacy-policy'],
    ['Terms', 'https://scapewatch.com/terms-of-service'],
  ]) {
    const link = page.locator('#sw-about').getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link.locator('svg')).toBeVisible();
  }
});

test('app navigation and credits follow native theme changes', async ({ page }) => {
  await loadGame(page, { scripts: ['game.js', 'credits.js'] });
  await openAbout(page);
  expect(
    await page.locator('#sw-shell').evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Chakra Petch');
  for (const palette of [
    {
      '--bg-dark': '#0e1c0e',
      '--bg-darkest': '#121a12',
      '--bg-panel': '#162b16',
      '--bg-cell': '#243a24',
      '--text-bright': '#88ff44',
      '--text-accent': '#7ab848',
      '--text-light': '#ccddcc',
    },
    {
      '--bg-dark': '#cce0cc',
      '--bg-darkest': '#c0d8c0',
      '--bg-panel': '#d8ead8',
      '--bg-cell': '#e4f0e4',
      '--text-bright': '#1a3a1a',
      '--text-accent': '#3a7a28',
      '--text-light': '#1e3a1e',
    },
  ]) {
    await page.evaluate((palette) => {
      for (const [property, value] of Object.entries(palette))
        document.documentElement.style.setProperty(property, value);
    }, palette);
    const expected = await page.evaluate(() => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const result = {};
      for (const name of [
        'bg-dark',
        'bg-panel',
        'bg-cell',
        'text-bright',
        'text-accent',
        'text-light',
      ]) {
        probe.style.color = `var(--${name})`;
        result[name] = getComputedStyle(probe).color;
      }
      probe.remove();
      return result;
    });
    await expect(page.locator('#sw-nav')).toHaveCSS('background-color', expected['bg-dark']);
    await expect(page.locator('#sw-nav [aria-current=page]')).toHaveCSS(
      'color',
      expected['text-bright'],
    );
    await expect(page.locator('#sw-menu')).toHaveCSS('background-color', expected['bg-panel']);
    await expect(page.locator('.sw-about-card').first()).toHaveCSS(
      'background-color',
      expected['bg-dark'],
    );
    await expect(
      page.locator('#sw-about [aria-label="Scapewatch social links"] a').first(),
    ).toHaveCSS('color', expected['text-light']);
    await page.locator('#sw-about-credits').tap();
    await expect(page.locator('.cc-credits-title')).toHaveCSS('color', expected['text-accent']);
    await page.locator('.cc-credits-close').tap();
    await page.locator('[data-sw-menu-section=display]').tap();
    await expect(page.locator('.sw-render-setting')).toHaveCSS(
      'background-color',
      expected['bg-dark'],
    );
    await expect(page.locator('#sw-notes-toggle')).toHaveCSS(
      'background-color',
      expected['bg-cell'],
    );
    await expect(page.locator('#sw-render-mode')).toHaveCSS('color', expected['text-light']);
    await page.locator('[data-sw-menu-section=character]').tap();
    await expect(page.locator('#sw-game-grid .sw-menu-item').first()).toHaveCSS(
      'background-color',
      expected['bg-cell'],
    );
    await page.locator('[data-sw-menu-section=about]').tap();
  }
});

for (const viewport of [
  { width: 320, height: 700 },
  { width: 740, height: 360 },
]) {
  test(`original credits keep every artist and link accessible at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadGame(page, {
      scripts: ['game.js', 'credits.js'],
      beforeAdapter: async (page) => {
        await page.evaluate((insets) => {
          for (const [side, value] of Object.entries(insets))
            document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `${value}px`);
          window.fixtureCreditsPopup = window.Credits.showPopup;
          window.fixtureCreditsCalls = 0;
          window.Credits.showPopup = function () {
            window.fixtureCreditsCalls++;
            return window.fixtureCreditsPopup.call(this);
          };
        }, safeInsets);
      },
    });
    await openAbout(page);
    const before = await nativeSnapshot(page);
    await page.locator('#sw-about-credits').tap();
    const dialog = page.getByRole('dialog', { name: 'Credits' });
    await expect(dialog).toBeVisible();
    await screenshot(page, 'about-credits');
    expect(await page.evaluate(() => window.fixtureCreditsCalls)).toBe(1);
    const actual = await dialog.locator('.credits-entry').evaluateAll((entries) =>
      entries.map((entry) => ({
        title: entry.querySelector('.credits-title').textContent,
        body: entry.querySelector('.credits-body').textContent,
        links: [...entry.querySelectorAll('a')].map((link) => ({
          label: link.textContent,
          url: link.getAttribute('href'),
        })),
      })),
    );
    const expected = await page.evaluate(() =>
      window.Credits.ENTRIES.map((entry) => ({ ...entry, links: entry.links || [] })),
    );
    expect(
      actual,
      'The box contains the current original credits without rewritten entries',
    ).toEqual(expected);
    for (const link of await dialog.locator('.credits-link').all())
      await expectReachable(page, link, { insets: safeInsets, scroll: true });
    await expectReachable(page, dialog.getByRole('button', { name: 'Close credits' }), {
      insets: safeInsets,
    });
    await dialog.getByRole('button', { name: 'Close credits' }).tap();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#sw-about')).toBeVisible();
    expect(await nativeSnapshot(page), 'Credits does not change gameplay or preferences').toEqual(
      before,
    );
  });
}

test('credits close when leaving About, switching to Original UI, or suspending the page', async ({
  page,
}) => {
  await loadGame(page, { scripts: ['game.js', 'credits.js'] });
  await openAbout(page);
  await page.locator('#sw-about-credits').tap();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
  await expect(page.locator('#sw-about')).toBeVisible();
  await page.locator('#sw-about-credits').tap();
  await page.locator('#sw-nav [data-sw-view=chat]').tap();
  await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
  await openAbout(page);
  await page.locator('#sw-about-credits').tap();
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
  await page.evaluate(() => document.getElementById('sw-layout-toggle').click());
  await openAbout(page);
  await page.locator('#sw-about-credits').tap();
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  await expect(page.locator('.cc-credits-overlay')).toHaveCount(0);
});

test('missing native credits keeps the original credits button unavailable', async ({ page }) => {
  await loadGame(page);
  await openAbout(page);
  await expect(page.locator('#sw-about-credits')).toBeDisabled();
});

test('social links keep the requested destinations and open a separate page without an opener', async ({
  page,
  context,
}) => {
  await loadGame(page);
  await openAbout(page);
  const author = await page.locator('.sw-about-author').innerText();
  const githubUrl = `https://github.com/${author}`;
  for (const [label, url] of [
    ['Bluesky', 'https://bsky.app/profile/mothhub.com'],
    ['GitHub', githubUrl],
    ['Telegram', 'https://t.me/lazylucy'],
  ]) {
    const link = page.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link.locator('svg')).toBeVisible();
  }
  await context.route('https://github.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Local link destination</p>' }),
  );
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'GitHub', exact: true }).tap();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toBe(githubUrl);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  expect(page.url()).toBe('https://play.scapewatch.com/');
  await popup.close();
});
