const { expect, settle } = require('./game.cjs');

async function returnToWorld(page) {
  const close = page.locator('.modal-overlay .modal-close').first();
  if (await close.isVisible()) await close.tap();
  const panelClose = page.locator('#sw-secondary-close');
  if (await panelClose.isVisible()) await panelClose.tap();
  if (await page.locator('html').evaluate((root) => root.classList.contains('sw-notes')))
    await page.locator('#sw-nav [data-sw-view=menu]').tap();
  // Closing Menu may reveal a retained sheet; tapping its active tab closes it.
  for (let step = 0; step < 2; step++) {
    const active = page.locator('#sw-nav button[aria-current=page]');
    if (!(await active.count())) break;
    await active.tap();
    await settle(page);
  }
  await expect(page.locator('#sw-view-title')).toHaveText('World');
}

async function openSkills(page) {
  await page.locator('#sw-nav [data-sw-view=menu]').tap();
  await page.locator('[data-sw-menu-section=character]').tap();
  await page.locator('#sw-character-grid [data-sw-target=skills]').tap();
  await settle(page);
}

module.exports = { returnToWorld, openSkills };
