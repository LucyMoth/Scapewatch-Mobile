import { all, capturePlacement, restorePlacement } from '../../../dom.js';
import { PREFERENCE_KEYS } from '../../../../environment.js';

export function createMapControls() {
  const placements = [];
  const titles = new Map();
  let legend;
  let defaultsApplied = false;
  try {
    defaultsApplied = localStorage.getItem(PREFERENCE_KEYS.mapDefaults) === '1';
  } catch (_) {}

  function attach(plane, host, route) {
    for (const node of all('.map-filter-panel, .map-legend-panel, .map-recenter-btn')) {
      if (node.parentNode === host || !plane.contains(node)) continue;
      placements.push(capturePlacement(node));
      host.appendChild(node);
      const title = node.querySelector('.map-filter-title, .map-legend-title');
      if (!title || titles.has(title)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sw-map-control ${node.matches('.map-filter-panel') ? 'sw-map-filter-control' : 'sw-map-legend-control'}`;
      button.setAttribute(
        'aria-label',
        node.matches('.map-filter-panel') ? 'Map filters' : 'Route legend',
      );
      title.before(button);
      button.setAttribute('aria-expanded', String(!node.classList.contains('collapsed')));
      const expand = () => {
        button.setAttribute('aria-expanded', String(!node.classList.contains('collapsed')));
        if (node.classList.contains('collapsed')) return;
        for (const other of host.querySelectorAll('.map-filter-panel, .map-legend-panel')) {
          if (other !== node && !other.classList.contains('collapsed'))
            other.querySelector('.map-filter-title, .map-legend-title')?.click();
        }
      };
      title.addEventListener('click', expand);
      button.addEventListener('click', () => title.click());
      titles.set(title, { button, expand });
    }
    if (route && !legend) {
      const body = host.querySelector('.map-legend-body');
      if (body) {
        legend = capturePlacement(body);
        route.appendChild(body);
      }
    } else if (!route) restoreLegend();
  }

  function restoreLegend() {
    if (!legend) return;
    restorePlacement(legend);
    legend = null;
  }

  function restore() {
    restoreLegend();
    for (const [title, { button, expand }] of titles) {
      title.removeEventListener('click', expand);
      button.remove();
    }
    titles.clear();
    placements.splice(0).reverse().forEach(restorePlacement);
  }

  function applyDefaults() {
    if (defaultsApplied) return;
    const rows = all('.map-filter-panel .map-filter-row');
    if (rows.length !== 6) return;
    // The native filter order is Friends, Task route, All nodes, Quest steps,
    // Terrain, Weather. Use their original handlers, including persistence.
    for (const index of [1, 4]) {
      const checkbox = rows[index].querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) checkbox.click();
    }
    for (const panel of all('.map-filter-panel, .map-legend-panel')) {
      if (!panel.classList.contains('collapsed'))
        panel.querySelector('.map-filter-title, .map-legend-title')?.click();
    }
    defaultsApplied = true;
    try {
      localStorage.setItem(PREFERENCE_KEYS.mapDefaults, '1');
    } catch (_) {}
  }

  return { attach, restore, applyDefaults };
}
