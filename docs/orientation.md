# Portrait and landscape

The button beside Original UI in Menu switches orientation. It says Landscape
in portrait mode and Portrait in landscape mode. Portrait is the default.
Android saves the accepted setting and restores it before loading the game;
the UI mirrors it in `sw_mobile_orientation`.

## Implementation

| Location                                   | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `MainActivity` and `OrientationPreference` | Apply and save the Android setting                   |
| `OrientationPlugin`                        | Handle requests from the game page through Capacitor |
| `src/ui/platform/orientation.js`           | Read and request the setting from JavaScript         |
| `src/ui/components/navigation/menu.js`     | Show the button and any request error                |
| `src/ui/layout/` and component CSS         | Arrange controls for the display size                |
| `src/mobile-renderer.js`                   | Resize the canvas while keeping input aligned        |

Android requests `userPortrait` or `userLandscape`. The Activity handles
orientation and size changes without normally replacing the WebView.
CSS uses display orientation for layout and the visual viewport for available
space, so opening the keyboard in portrait does not select landscape styles.
Landscape at widths of at least 600px uses a side rail and reading panels.

## WebView support

The button requires the modern Capacitor bridge and a WebView with
`WEB_MESSAGE_LISTENER` support. It is hidden in an ordinary browser or with a
legacy bridge configuration. Requests are restricted to the supported HTTPS
game pages.

`OrientationPlugin.load()` removes Capacitor's Java-interface fallback when
modern support is enabled. Keep this check: the plugin relies on the modern
listener's main-frame restriction to reject iframe calls.

Keep `server.url` as an origin with no trailing slash or path. Capacitor uses it
as a listener origin rule. The bridge currently starts only on
`play.scapewatch.com`, so the orientation button is hidden in the alternate
world. The saved Android orientation and mobile UI still apply there.

## Checking changes

Test repeated rotation in World, Map, Tasks, Bag, Bank, Chat, Menu and dialogs.
Check that the session, selected panel, chat draft and game activity survive.
Use short screens and an open keyboard to check scrolling and button access.

On Android, also check the saved setting after relaunch and background/resume,
system insets, WebView recreation and alternate-world navigation. Verify that
the bridge works on the main game page and rejects iframe orientation calls.
Browser coverage is in `tests/responsive/orientation*.spec.cjs` and the related
layout, rotation and gesture tests.

A future iOS wrapper can implement the same JavaScript orientation API. There
is no iOS project yet.
