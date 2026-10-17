import { capturePlacement, restorePlacement } from '../../dom.js';

export function createAppearanceLayout({ state }) {
  let creator;
  let placement;

  function restore() {
    restorePlacement(placement);
    creator = null;
    placement = null;
  }

  function update() {
    const next = document.querySelector('#tab-customize .character-creator');
    if (!state.enabled || state.suspended || next !== creator) restore();
    if (!state.enabled || state.suspended || !next || creator) return;
    const layers = next.querySelector('.cc-layers-summary');
    const center = next.querySelector('.creator-center');
    if (!layers || !center) return;
    creator = next;
    placement = capturePlacement(layers);
    center.appendChild(layers);
  }

  return { update, suspend: restore };
}
