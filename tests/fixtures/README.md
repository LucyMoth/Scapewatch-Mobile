# Game fixtures

These files provide game markup and local event handlers for browser tests.
They use fixed data and never connect to the game server. `style.css` and
`unified-queue.css` come from the Scapewatch client; keep their attribution and
embedded notices.

Load fixtures through `tests/support/game.cjs`. The base setup uses `game.js`,
`combat.js`, `dialogs.js` and `layout.js` in that order. Screen tests add the
files they need in the `scripts` option to `loadGame()`.

- `camera.js` and `camera-hit.js`: camera gestures and canvas hit testing.
- `collections.js` and `diary.js`: progress screens; load after `game.js`.
- `buffs.js` and `consumables.js`: combat buffs and item descriptions.
- `map/`: full-map controls, task dragging and route updates.
- `renderer/routes.js`: movement and queue trails with fixed waypoints.
- `processing/`, `ledger/`, `dashboard/` and `trees/`: larger screen fixtures.

Keep fixture event order close to the game when it affects the feature being
tested. For example, buff setup creates the camera before the potion controls.
A fixture can check an interaction locally; use an installed app to verify the
same flow with the live game.
