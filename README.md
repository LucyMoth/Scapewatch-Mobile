<p align="center">
  <img src="docs/assets/logo.svg" width="280" alt="Scapewatch logo">
</p>

<h1 align="center">Scapewatch Mobile</h1>

<p align="center">
  Scapewatch, with a touch-friendly interface for your phone.
</p>

<p align="center">
  <a href="https://github.com/LucyMoth/Scapewatch-Mobile/releases/tag/v1.0"><img src="https://img.shields.io/badge/release-v1.0-gold" alt="Release v1.0"></a>
  <img src="https://img.shields.io/badge/Android-7.0%2B-3DDC84?logo=android&logoColor=white" alt="Android 7.0 or newer">
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Built with Capacitor 8">
  <img src="https://img.shields.io/badge/iOS-planned-lightgrey?logo=apple" alt="iOS planned">
</p>

<p align="center">
  <a href="https://github.com/LucyMoth/Scapewatch-Mobile/releases/latest">Download for Android</a>
  · <a href="https://scapewatch.com/">Game website</a>
  · <a href="https://scapewatch.com/wiki">Wiki</a>
</p>

A third-party Android client for [Scapewatch](https://scapewatch.com/). It loads
the live game in a WebView and adds an interface designed for phones:

- Portrait and landscape layouts with a compact navigation dock.
- Touch map controls, including pinch and double-tap-and-drag zoom.
- A full world map with a draggable task queue and live route preview.
- Mobile layouts for inventory, equipment, crafting, combat and progress screens.

**Android v1.0 is available in [Releases](https://github.com/LucyMoth/Scapewatch-Mobile/releases/latest).**
An iOS build is planned; there is no iOS project or release yet.

Scapewatch and its original artwork are by PuzzleDrop and the credited artists.
The app's About screen includes the original credits and official game links.
This client is an independent project.

## Build and run

Install Node.js 24, JDK 21 and Android Studio with Android SDK 36, then run:

```sh
npm ci
npm run android:sync
npm run android:open
```

Run the app from Android Studio, or use `npm run android:build` to create a debug
APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Development

| Command                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Rebuild the UI bundle when its source changes |
| `npm run android:sync`  | Build the UI and copy it into Android         |
| `npm run android:build` | Sync the UI and build a debug APK             |
| `npm test`              | Build and run browser tests                   |
| `npm run test:ui`       | Open Playwright's test interface              |
| `npm run check`         | Run lint, formatting checks and browser tests |

Install the test browser with `npx playwright install chromium` before running
browser tests. See [development](docs/development.md) for SDK setup and the daily
edit/build cycle, and [testing](docs/testing.md) for test commands.

## Source layout

| Folder               | Contents                                            |
| -------------------- | --------------------------------------------------- |
| `src/ui/components/` | Screen components, with JavaScript and CSS together |
| `src/ui/layout/`     | Shared sizing and layout                            |
| `src/renderer/`      | Map rendering helpers                               |
| `android/`           | Android app, WebView setup and native tests         |
| `tests/`             | Browser tests, fixtures and test helpers            |
| `docs/`              | Developer documentation                             |

[Architecture](docs/architecture.md) explains startup and the component folders.
[Orientation](docs/orientation.md) covers rotation and its current limitations.
