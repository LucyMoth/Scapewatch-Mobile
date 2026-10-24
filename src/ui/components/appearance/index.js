import { capturePlacement, hasChangedElement, restorePlacement } from '../../dom.js';

export function createAppearanceLayout({ state }) {
  let creator;
  let observer;
  const sections = [];

  function restore() {
    observer?.disconnect();
    for (const { placement, details } of sections.reverse()) {
      if (placement.node.isConnected) restorePlacement(placement);
      details.remove();
    }
    sections.length = 0;
    creator = null;
  }

  function collapse(node, title, parent) {
    if (!node || sections.some(({ placement }) => placement.node === node)) return;
    const placement = capturePlacement(node);
    const details = document.createElement('details');
    details.className = 'sw-appearance-details';
    const summary = document.createElement('summary');
    summary.textContent = title;
    details.append(summary);
    node.before(details);
    details.append(node);
    if (parent) parent.append(details);
    sections.push({ placement, details });
  }

  function update() {
    const next = document.querySelector('#tab-customize .character-creator');
    if (!state.enabled || state.suspended || next !== creator) restore();
    if (!state.enabled || state.suspended || !next) return;
    const center = next.querySelector('.creator-center');
    if (!center) return;
    creator = next;
    for (let index = sections.length - 1; index >= 0; index--) {
      if (!sections[index].placement.node.isConnected) {
        sections[index].details.remove();
        sections.splice(index, 1);
      }
    }
    collapse(next.querySelector('.cc-pack-banner'), 'Appearance packs');
    collapse(next.querySelector('.cc-layers-summary'), 'Render layers', center);
    if (!observer) {
      observer = new MutationObserver((records) => {
        if (
          hasChangedElement(
            records,
            (node) =>
              node.matches('.cc-pack-banner, .cc-layers-summary') ||
              node.querySelector('.cc-pack-banner, .cc-layers-summary'),
          )
        )
          update();
      });
    }
    observer.observe(creator, { childList: true, subtree: true });
  }

  return { update, suspend: restore };
}
