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

The Landscape/Portrait control is beside Original UI in Menu. Its Android
implementation and current alternate-world limitation are documented in
[orientation](orientation.md).
