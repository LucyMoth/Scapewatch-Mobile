import { $ } from '../../dom.js';

export function createPlayerStatus({ state }) {
  const initialized = new WeakSet();

  function update() {
    if (!state.enabled || state.suspended) return;
    const info = $('.ingame-hud-info');
    if (!info || initialized.has(info)) return;
    initialized.add(info);
    if (info.classList.contains('expanded')) info.click();
  }

  return { update };
}
