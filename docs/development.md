# Development

## Setup

Use Node.js 24 (`.nvmrc`), JDK 21 and Android SDK 36. Install the JavaScript
dependencies with `npm ci` and open Android Studio with `npm run android:open`.
Select JDK 21 as the Gradle JDK. Gradle's daemon settings also select JDK 21 for
command-line builds.

Android Studio writes the SDK location to the ignored
`android/local.properties` file. For command-line setup, set `ANDROID_HOME` to
your SDK directory instead.

## Edit and build

Start in the relevant `src/ui/components/` folder. The
[component map](architecture.md#ui-components) lists the screens. Shared sizing
lives in `src/ui/layout/`; the mobile shell is `src/ui/shell.html`.

```sh
npm run dev
```

Watch mode rebuilds imported JavaScript, HTML and CSS into `dist/mobile-ui.js`.
The build uses esbuild and includes a source map. Changing the connection retry
page, `src/index.html`, requires a fresh `npm run build`.

For live layout checks without rebuilding Android, open a separate browser:

```sh
npx playwright install chromium
npm run dev:browser
```

Sign in normally in that browser. Keep `npm run dev` running in another terminal;
reload the game after an edit to use the latest local UI. Reloading replaces the
whole UI so event handlers from an older bundle cannot accumulate. Browser menus
and game actions still use the live account.
If sign-in opens a new game tab, reload that tab once after returning to the game
to apply the local UI.

The browser starts at 412 × 915 with touch enabled. It keeps its login in a
separate temporary profile, outside the repository. Set `SW_TEST_PROFILE` to an
external folder to choose a persistent profile. The Playwright VS Code extension
can run the fixture tests; other local tools can attach to the live browser at
`http://127.0.0.1:9226` with `chromium.connectOverCDP`. Set `SW_DEBUG_PORT` if that
port is occupied. Close the browser or press Ctrl+C to stop it.

To put a change in the Android app:

```sh
npm run android:build
```

This rebuilds the UI, syncs it through Capacitor and assembles a debug APK at
`android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a device or
run the project from Android Studio. Release signing is configured separately;
keep signing keys outside Git.

For a signed release, set `SCAPEWATCH_KEYSTORE`, `SCAPEWATCH_STORE_PASSWORD`,
`SCAPEWATCH_KEY_ALIAS` and `SCAPEWATCH_KEY_PASSWORD`, then run
`npm run android:release`. The APK is written to
`android/app/build/outputs/apk/release/`. Without those variables, Gradle produces
an unsigned release APK. Keep the signing key and its passwords backed up;
future updates must use the same key.
Debug and public release builds use different keys; switching between them
requires uninstalling the installed build first.

Release builds minify the UI bundle and omit source maps. Development builds
keep inline source maps for debugging.

## Style and checks

Prettier formats the source; ESLint checks JavaScript and Playwright usage.

```sh
npm run format
npm run lint
npm run check
```

Keep CSS imports in `src/styles/index.css` in their existing order. Reuse game
controls and their hidden/disabled states when changing a screen. Check that
long content stays reachable, buttons remain easy to tap and Original UI still
works. [Testing](testing.md) covers browser and device checks.

## App configuration

`capacitor.config.json` sets the game URL and allowed navigation. The Android
package is `com.scapewatch.mobile`. Presentation preferences use the
`sw_mobile_*` keys in `src/environment.js`.
The wrapper selects the native game's `scapewatch_layout=desktop` preference
before startup, so only one mobile layout manages the original game controls.

The Landscape/Portrait control is beside Original UI in Menu. Its Android
implementation and current alternate-world limitation are documented in
[orientation](orientation.md).
