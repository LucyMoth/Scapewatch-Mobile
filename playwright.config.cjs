const { defineConfig } = require('@playwright/test');

const uiSuites = ['navigation.spec.cjs', 'combat.spec.cjs', 'layout.spec.cjs', 'dialogs.spec.cjs'];
const phones = [
  { name: 'small-phone', viewport: { width: 320, height: 700 } },
  { name: 'phone', viewport: { width: 360, height: 740 } },
  { name: 'large-phone', viewport: { width: 412, height: 915 } },
  { name: 'landscape', viewport: { width: 740, height: 360 } },
];

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 6_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.SW_BROWSER || undefined,
      args: ['--disable-dev-shm-usage'],
    },
  },
  projects: [
    ...phones.map(({ name, viewport }) => ({
      name,
      testMatch: uiSuites,
      testIgnore: '**/responsive/**',
      use: { viewport },
    })),
    {
      name: 'short-phone',
      testMatch: 'layout.spec.cjs',
      use: { viewport: { width: 320, height: 460 } },
    },
    {
      name: 'origins',
      testMatch: 'origins.spec.cjs',
      use: { viewport: { width: 360, height: 740 } },
    },
    {
      name: 'responsive',
      testMatch: 'responsive/**/*.spec.cjs',
      use: { viewport: { width: 360, height: 740 } },
    },
    { name: 'gestures', testMatch: 'gestures.spec.cjs' },
    {
      name: 'renderer',
      testMatch: ['renderer.spec.cjs', 'renderer/**/*.spec.cjs'],
      use: { viewport: { width: 412, height: 915 } },
    },
  ],
});
