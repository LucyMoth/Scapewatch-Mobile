import { capturePlacement, restorePlacement } from '../../dom.js';

const sectionOrder = [
  'display',
  'audio',
  'chat',
  'queue',
  'combat-defaults',
  'raids',
  'map-nodes',
  'players',
  'effects',
  'performance',
  'account',
  'rich-presence',
  'window-controls',
  'hotkeys',
  'build',
];

export function createSettingsLayout({ state }) {
  let entry;

  function restore() {
    if (!entry) return;
    entry.observer.disconnect();
    for (const [row, value] of entry.rows) {
      row.classList.remove('sw-settings-original');
      value.note.remove();
      for (const [control, inert] of value.controls) {
        if (inert === null) control.removeAttribute('inert');
        else control.setAttribute('inert', inert);
      }
    }
    for (const placement of [...entry.placements].reverse())
      if (placement.node.isConnected) restorePlacement(placement);
    entry = null;
  }

  function adapt() {
    const host = entry.host;
    entry.placements = entry.placements.filter((placement) => placement.node.isConnected);
    for (const row of entry.rows.keys()) if (!row.isConnected) entry.rows.delete(row);
    const sections = Array.from(host.children).filter((node) =>
      node.classList.contains('settings-section'),
    );
    const ordered = [...sections].sort((a, b) => {
      const position = (node) => {
        const index = sectionOrder.indexOf(node.id.replace('settings-sec-', ''));
        return index < 0 ? sectionOrder.length : index;
      };
      return position(a) - position(b);
    });
    if (sections.some((node, index) => node !== ordered[index])) {
      for (const section of sections) {
        if (!entry.placements.some((placement) => placement.node === section))
          entry.placements.push(capturePlacement(section));
      }
      host.append(...ordered);
    }
    const nav = host.querySelector('.settings-header-nav');
    if (nav) {
      const buttons = Array.from(nav.children);
      const order = ordered.map((section) =>
        section.querySelector('.settings-section-header')?.textContent.trim(),
      );
      const sorted = [...buttons].sort(
        (a, b) => order.indexOf(a.textContent.trim()) - order.indexOf(b.textContent.trim()),
      );
      if (buttons.some((node, index) => node !== sorted[index])) {
        for (const button of buttons) {
          if (!entry.placements.some((placement) => placement.node === button))
            entry.placements.push(capturePlacement(button));
        }
        nav.append(...sorted);
      }
    }
    host.querySelectorAll('#settings-sec-display .settings-toggle-row').forEach((row) => {
      if (entry.rows.has(row)) return;
      const scaling = row.querySelector('.settings-scaling-btn');
      const hud = row.querySelector('input[type="range"][min="50"][max="150"][step="5"]');
      if (!scaling && !hud) return;
      const note = document.createElement('div');
      note.className = 'sw-settings-original-note';
      note.textContent = 'Original UI only. Mobile UI sizes these controls automatically.';
      const controls = Array.from(
        row.querySelectorAll('.settings-icon-size-control, .settings-quality-control'),
      ).map((control) => [control, control.getAttribute('inert')]);
      for (const [control] of controls) control.setAttribute('inert', '');
      row.classList.add('sw-settings-original');
      (row.querySelector('.settings-toggle-text') || row).append(note);
      entry.rows.set(row, { controls, note });
    });
  }

  function update() {
    const host = document.querySelector('#tab-settings');
    if (!state.enabled || state.suspended || host !== entry?.host) restore();
    if (!state.enabled || state.suspended || !host) return;
    if (!entry) {
      const observer = new MutationObserver(adapt);
      entry = { host, observer, placements: [], rows: new Map() };
      observer.observe(host, { childList: true, subtree: true });
    }
    adapt();
  }

  return { update, suspend: restore };
}
