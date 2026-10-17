# Testing

Browser tests use Playwright with local game fixtures. They run without a game
account and block external requests. Install Chromium once, then run the suite:

```sh
npx playwright install chromium
npm test
```

## Running a smaller set

```sh
npm test -- --project landscape
npm test -- tests/responsive/equipment.spec.cjs
npm test -- --grep 'combat details'
npm run test:gestures
npm run test:renderer
npm run test:ui
```

Set `SW_BROWSER` to a Chromium executable to use an existing browser install.
`npm run check` also runs ESLint and checks formatting.

## Test folders

- `tests/*.spec.cjs`: navigation, combat, dialogs, layout, gestures and rendering.
- `tests/responsive/`: individual screens and portrait/landscape changes.
- `tests/renderer/`: map trail rendering.
- `tests/support/`: shared loading, input and measurement helpers.
- `tests/fixtures/`: game markup and local event handlers used by the tests.

`playwright.config.cjs` defines the viewport sizes and test projects. Tests
cover control behavior as well as layout: selecting equipment, reordering
tasks, scrolling descriptions and returning to Original UI. Each test sets up
its own state. Two browser zoom calibration cases may skip when Chromium cannot
reproduce page zoom; the report gives the reason.

## Failures and Android checks

Use `npm run test:report` to open the browser report. Failed tests keep
screenshots and traces in `test-results/`; the HTML report is in
`playwright-report/`.

Run Android unit tests and lint with:

```sh
cd android
./gradlew testDebugUnitTest lintDebug
```

Before shipping, test an installed APK for login, keyboard/insets, rotation,
background/resume, map gestures, task reordering and Original UI. Check changed
screens with real account data, including long lists and descriptions. Browser
fixtures and a successful build cannot verify those device interactions.
