import { capturePlacement, restorePlacement } from '../../dom.js';

export function createBankLayout({ state }) {
  let toolbar;
  let categories;
  let tools;
  const placements = [];

  function move(node, host) {
    placements.push(capturePlacement(node));
    host.appendChild(node);
  }

  function restore() {
    placements.splice(0).reverse().forEach(restorePlacement);
    categories?.remove();
    tools?.remove();
    toolbar = null;
  }

  function update() {
    const nextToolbar = document.querySelector('#tab-bank .bank-toolbar');
    if (!state.enabled || state.suspended || nextToolbar !== toolbar) restore();
    if (!state.enabled || state.suspended || !nextToolbar || toolbar) return;
    const filters = Array.from(nextToolbar.querySelectorAll('.bank-filter-btn'));
    const actions = Array.from(
      nextToolbar.querySelectorAll('.bank-mode-btn, .bank-sort-btn, .bank-filter-menu-btn'),
    );
    if (!filters.length && !actions.length) return;
    toolbar = nextToolbar;

    categories = document.createElement('div');
    categories.className = 'sw-bank-categories';
    categories.setAttribute('aria-label', 'Bank categories');
    tools = document.createElement('details');
    tools.className = 'sw-bank-tools';
    const summary = document.createElement('summary');
    summary.textContent = 'Bank tools';
    const body = document.createElement('div');
    body.className = 'sw-bank-tools-body';
    tools.append(summary, body);
    toolbar.append(categories, tools);
    filters.forEach((node) => move(node, categories));
    actions.forEach((node) => move(node, body));
    if (!filters.length) categories.hidden = true;
  }

  return { update, suspend: restore };
}
