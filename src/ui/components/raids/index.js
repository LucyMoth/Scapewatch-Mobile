import { capturePlacement, hasChangedElement, restorePlacement } from '../../dom.js';

export function createRaidLayout({ state }) {
  let host;
  let observer;
  const equipment = new Map();
  const requirements = new Map();

  function restoreEquipment(entry) {
    for (const placement of [...entry.placements].reverse()) {
      if (placement.node.isConnected) restorePlacement(placement);
    }
    entry.details.remove();
  }

  function suspend() {
    observer?.disconnect();
    for (const entry of equipment.values()) restoreEquipment(entry);
    equipment.clear();
    for (const details of requirements.values()) details.remove();
    requirements.clear();
    host = null;
  }

  function addEquipment(row) {
    const parts = [
      row.querySelector('.raid-row-paperdoll'),
      row.querySelector('.raid-row-equip-stats'),
    ].filter(Boolean);
    const previous = equipment.get(row);
    if (previous && parts.length && parts.every((part) => previous.details.contains(part))) return;
    if (previous) {
      restoreEquipment(previous);
      equipment.delete(row);
    }
    if (!parts.length) return;
    const placements = parts.map(capturePlacement);
    const details = document.createElement('details');
    details.className = 'sw-raid-equipment';
    const summary = document.createElement('summary');
    summary.textContent = 'Equipment details';
    const name = row.querySelector('.raid-row-name')?.textContent.trim();
    if (name) summary.setAttribute('aria-label', `Equipment details for ${name}`);
    details.append(summary);
    parts[0].before(details);
    details.append(...parts);
    equipment.set(row, { details, placements });
  }

  function updateRequirements(row) {
    const lines = Array.from(row.querySelectorAll('.raid-browse-join.disabled .tooltip .tt-line'))
      .map((line) => line.textContent.trim())
      .filter(Boolean);
    let details = requirements.get(row);
    if (!lines.length) {
      details?.remove();
      requirements.delete(row);
      return;
    }
    if (!details) {
      details = document.createElement('details');
      details.className = 'sw-raid-requirements';
      const summary = document.createElement('summary');
      summary.textContent = 'Requirements not met';
      details.append(summary, document.createElement('div'));
      row.append(details);
      requirements.set(row, details);
    }
    const text = lines.join('\n');
    if (details.lastChild.textContent !== text) details.lastChild.textContent = text;
  }

  function update() {
    if (!state.enabled || state.suspended) {
      suspend();
      return;
    }
    const next = document.querySelector('#tab-raid');
    if (next !== host) {
      suspend();
      host = next;
      if (host) {
        observer = new MutationObserver((records) => {
          if (
            hasChangedElement(
              records,
              (node) =>
                node.matches(
                  '.raid-party-row-item, .raid-browse-row, .raid-row-paperdoll, .raid-row-equip-stats, .raid-content',
                ) || node.querySelector('.raid-party-row-item, .raid-browse-row'),
            )
          )
            update();
        });
        observer.observe(host, { childList: true, subtree: true });
      }
    }
    if (!host) return;
    for (const [row, entry] of equipment) {
      if (!row.isConnected) {
        entry.details.remove();
        equipment.delete(row);
      }
    }
    for (const [row, details] of requirements) {
      if (!row.isConnected) {
        details.remove();
        requirements.delete(row);
      }
    }
    host.querySelectorAll('.raid-party-row-item:not(.empty)').forEach(addEquipment);
    host.querySelectorAll('.raid-browse-row').forEach(updateRequirements);
  }

  return { update, suspend };
}
