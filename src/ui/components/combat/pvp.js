export function createPvpLayout({ state, toast }) {
  let panel;
  let observer;
  const warnings = new Map();

  function restore() {
    observer?.disconnect();
    observer = null;
    panel = null;
    warnings.forEach((node) => node.remove());
    warnings.clear();
  }

  function openLoadout(id) {
    if (!state.enabled || state.suspended) return;
    const bank = document.querySelector('#sw-nav [data-sw-view=bank]');
    if (!bank) return;
    bank.click();
    const tab = document.getElementById('tab-bank');
    const selector = tab?.querySelector('.equip-side .loadout-sel');
    selector?.querySelector('.loadout-sel-family[data-family=pvp]')?.click();
    const loadout = Array.from(selector?.querySelectorAll('.loadout-sel-slot') || []).find(
      (node) => node.dataset.loadout === id,
    );
    if (!loadout) {
      toast('Choose the PvP loadout in Bank.');
      return;
    }
    loadout.click();
    tab.querySelector('.equip-title')?.scrollIntoView({ block: 'start' });
  }

  function refresh() {
    for (const [row, controls] of warnings) {
      if (!row.isConnected || !row.contains(controls) || !row.classList.contains('pvp-bad')) {
        controls.remove();
        warnings.delete(row);
      }
    }
    const pairs = { Attacker: [1, 2], Defender: [3, 4], Clan: [5, 6] };
    for (const row of panel.querySelectorAll('.pvp-pair-row.pvp-bad')) {
      if (warnings.has(row)) continue;
      const name = row.textContent.match(/^(Attacker|Defender|Clan) \(1 & 2\):/)?.[1];
      if (!name) continue;
      const controls = document.createElement('div');
      controls.className = 'sw-pvp-loadout-actions';
      pairs[name].forEach((number, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `Manage ${name} ${index + 1}`;
        button.addEventListener('click', () => openLoadout(`pvp_${number}`));
        controls.append(button);
      });
      warnings.set(row, controls);
      row.append(controls);
    }
  }

  function update() {
    const next = document.querySelector('#tab-pvp .pvp-left');
    if (!state.enabled || state.suspended || next !== panel) restore();
    if (!state.enabled || state.suspended || !next || panel) return;
    panel = next;
    refresh();
    observer = new MutationObserver(refresh);
    observer.observe(panel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  return { update, suspend: restore };
}
