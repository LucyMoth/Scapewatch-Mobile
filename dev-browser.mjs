import { chromium } from '@playwright/test';
import { watchFile, unwatchFile } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bundle = new URL('dist/mobile-ui.js', import.meta.url);
const profile = process.env.SW_TEST_PROFILE || join(tmpdir(), 'scapewatch-mobile-browser');
const port = Number(process.env.SW_DEBUG_PORT || 9226);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('SW_DEBUG_PORT must be a port between 1024 and 65535.');
}
await readFile(bundle);
await mkdir(profile, { recursive: true, mode: 0o700 });
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  args: ['--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`],
});
const sessions = new Map();
const installs = new WeakMap();
let updates = Promise.resolve();

function install(page) {
  if (installs.has(page)) return installs.get(page);
  const pending = (async () => {
    const session = await context.newCDPSession(page);
    await session.send('Page.enable');
    const entry = { session, updates: Promise.resolve() };
    sessions.set(page, entry);
    page.on('close', () => sessions.delete(page));
    await update(entry);
  })();
  installs.set(page, pending);
  return pending;
}

function update(entry) {
  entry.updates = entry.updates
    .catch(() => {})
    .then(async () => {
      const source = await readFile(bundle, 'utf8');
      if (entry.identifier) {
        await entry.session.send('Page.removeScriptToEvaluateOnNewDocument', {
          identifier: entry.identifier,
        });
        entry.identifier = null;
      }
      const result = await entry.session.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `${source}\n//# sourceURL=${bundle.href}`,
      });
      entry.identifier = result.identifier;
    });
  return entry.updates;
}

context.on('page', (page) => install(page).catch((error) => console.error(error.message)));
for (const page of context.pages()) await install(page);
watchFile(bundle, { interval: 1000 }, (current, previous) => {
  if (!current.size || current.mtimeMs === previous.mtimeMs) return;
  updates = updates
    .then(async () => {
      for (const entry of sessions.values()) await update(entry);
      console.log('Local UI rebuilt. Reload the game to apply it.');
    })
    .catch((error) => console.error(error.message));
});
context.on('close', () => unwatchFile(bundle));
process.on('SIGINT', () => context.close());
process.on('SIGTERM', () => context.close());
const page = context.pages()[0] || (await context.newPage());
await page.goto('https://play.scapewatch.com/', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
});
console.log(`Mobile test browser: http://127.0.0.1:${port}`);
console.log(
  'Sign in in the browser. Run npm run dev in another terminal, then reload after edits.',
);
