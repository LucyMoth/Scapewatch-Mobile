# Architecture

The Android app uses Capacitor to display Scapewatch in a WebView. It loads the
live game, then adds the JavaScript and CSS built from `src/` to provide the
mobile interface. The game continues to handle gameplay, accounts and networking.

## Startup

1. `MainActivity` restores the saved orientation and sets up `MobileUiInjector`.
2. Capacitor opens the game. The injector loads `mobile-ui.js` on the supported
   game pages, with a page-load fallback for WebViews without early injection.
3. `src/index.js` starts the renderer and calls `initializeMobileUi()`.
4. `src/ui/index.js` creates the navigation, screen components and layout
   observers, then attaches the mobile shell from `src/ui/shell.html`.

Injection is limited to the top-level game pages at `play.scapewatch.com` and
`alt.play.scapewatch.com`.

`build.mjs` bundles JavaScript, HTML, CSS and About assets into
`dist/mobile-ui.js`. `npm run android:sync` copies the bundle into the Android
app. JavaScript and CSS changes need another sync and Android build to reach an
installed app.

## Where to edit

| File or folder                                     | Purpose                                                         |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `src/environment.js`                               | Game URLs and preference keys                                   |
| `src/ui/index.js`                                  | Component setup and shared updates                              |
| `src/ui/lifecycle.js`                              | Watching game elements and handling page suspension/restoration |
| `src/ui/dom.js`                                    | DOM queries, element placement and observer helpers             |
| `src/ui/layout/`                                   | Viewport size, measured geometry and shared layout styles       |
| `src/styles/index.css`                             | CSS entry point; import order affects the cascade               |
| `src/mobile-renderer.js`                           | Canvas sizing and rendering quality                             |
| `src/renderer/route-strokes.js`                    | Keeping map trails visible at mobile scales                     |
| `src/renderer/map-tiles.js`                        | Loading higher-quality visible map tiles with a bounded cache   |
| `android/app/src/main/java/com/scapewatch/mobile/` | WebView setup and orientation plugin                            |

## UI components

JavaScript and styles for each feature live in `src/ui/components/`.

| Feature                                       | Folder            |
| --------------------------------------------- | ----------------- |
| Dock and Menu                                 | `navigation/`     |
| Combat                                        | `combat/`         |
| Chat                                          | `chat/`           |
| Task queue and previews                       | `tasks/`          |
| Skills                                        | `skills/`         |
| Bank                                          | `bank/`           |
| Equipment picker                              | `equipment/`      |
| Quests                                        | `quests/`         |
| Barter                                        | `barter/`         |
| Hiscores                                      | `hiscores/`       |
| Crafting and brewing                          | `processing/`     |
| Raids                                         | `raids/`          |
| Dashboard                                     | `dashboard/`      |
| Ledger                                        | `ledger/`         |
| Settings                                      | `settings/`       |
| Appearance                                    | `appearance/`     |
| Delve and Fortify trees                       | `trees/`          |
| World camera, gestures and HUD                | `world/`          |
| Full map and task reordering                  | `world/full-map/` |
| About and credits                             | `about/`          |
| Popups, item details, collections and unlocks | `dialogs/`        |
| Login screens                                 | `authentication/` |

## Layout and game controls

Most screens rearrange or restyle the game's existing HTML. Buttons keep their
game handlers. Components that move elements record their previous positions
with the helpers in `dom.js` and restore them when leaving Mobile UI. This keeps
the Original UI option usable.

Portrait uses a bottom dock. Landscape uses a side rail and places reading
panels beside the world. Shared measurements in `src/ui/layout/geometry.js`
provide space for the HUD, chat and current task. Component styles handle the
contents of each panel. Keep imports in `src/styles/index.css` in order when
editing styles.

Map gestures forward to the game's camera and zoom controls. Full-map task
dragging adapts the horizontal strip to the game's existing reorder handlers.
The renderer adjusts canvas size and transforms while keeping input coordinates
aligned with the game.

The renderer upgrades visible map tiles from the game's public assets. Balanced
uses High map detail, High uses Perfect detail, and Battery and Original retain
the native tiles. Pending loads and decoded images are bounded; missing tiles
keep their native fallback. Menu backgrounds warm in small batches while idle.

The UI watches game elements for updates. Components disconnect observers and
restore moved elements on suspension; page restoration reconnects them. See
[testing](testing.md) for layout, input and restoration tests.

## Android and orientation

Android-specific code lives in `android/`. The UI requests orientation through
`src/ui/platform/orientation.js` and the Android `OrientationPlugin`.
[Orientation](orientation.md) explains the saved setting, responsive layout and
alternate-world limitation.

Android Back calls `navigation/back.js` to dismiss the current popup, selection
or screen before allowing the normal system action. Item actions invoke the
existing game controls after checking that the inspected item is still current.
