import { $, visible } from '../../dom.js';

export function createPlayerStatus({ state }) {
  const initialized = new WeakSet();
  let name;
  const observer = new MutationObserver(update);

  function update() {
    if (!state.enabled || state.suspended) {
      suspend();
      return;
    }
    const next = $('.ingame-hud-name');
    if (next !== name) {
      observer.disconnect();
      name = next;
      if (name) observer.observe(name, { childList: true, characterData: true, subtree: true });
    }
    const ready =
      !!name?.textContent.trim() &&
      visible($('.hp-bar')) &&
      !document.body.classList.contains('login-active');
    document.documentElement.classList.toggle('sw-world-ready', ready);
    if (!ready) return;
    const info = $('.ingame-hud-info');
    if (!info || initialized.has(info)) return;
    initialized.add(info);
    if (info.classList.contains('expanded')) info.click();
  }

  function suspend() {
    observer.disconnect();
    name = null;
    document.documentElement.classList.remove('sw-world-ready');
  }

  return { update, suspend };
}
