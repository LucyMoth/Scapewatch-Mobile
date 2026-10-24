import { capturePlacement, restorePlacement } from '../../dom.js';

export function createBankLayout({ state }) {
  let toolbar;
  let categories;
  let tools;
  let scrap;
  let scrapDetails;
  let scrapPlacement;
  let bag;
  let bagSummary;
  let bagGuide;
  let bagObserver;
  const placements = [];

  function move(node, host) {
    placements.push(capturePlacement(node));
    host.appendChild(node);
  }

  function restoreScrap() {
    if (scrapPlacement?.node.isConnected) restorePlacement(scrapPlacement);
    scrapDetails?.remove();
    scrap = null;
    scrapDetails = null;
    scrapPlacement = null;
  }

  function updateScrap() {
    const row = document.querySelector('#tab-bank .bank-scrap-row');
    if (row !== scrap) restoreScrap();
    if (!row || scrap) return;
    scrap = row;
    scrapPlacement = capturePlacement(row);
    scrapDetails = document.createElement('details');
    scrapDetails.className = 'sw-bank-scrap';
    const summary = document.createElement('summary');
    summary.textContent = 'Scrap materials';
    const note = document.createElement('p');
    note.textContent = '∞ materials are always available. Filler processing grants half XP.';
    row.before(scrapDetails);
    scrapDetails.append(summary, note, row);
  }

  function restoreBag() {
    bagObserver?.disconnect();
    bagObserver = null;
    bagSummary?.remove();
    bagGuide?.remove();
    bag = null;
  }

  function updateBagCount() {
    const slots = Array.from(bag.querySelectorAll(':scope > .inv-slot'));
    const base = slots.filter((node) => !node.classList.contains('bag-slot-overlay'));
    const used = base.filter((node) => !node.classList.contains('empty')).length;
    const overflow = slots.filter(
      (node) => node.classList.contains('bag-slot-overlay') && !node.classList.contains('empty'),
    ).length;
    const count = `${used} / ${base.length} slots${overflow ? ` · ${overflow} overflow` : ''}`;
    if (bagSummary.lastChild.textContent !== count) bagSummary.lastChild.textContent = count;
    const guidance =
      used || overflow
        ? 'Tap an item to inspect it. Open Bank to manage or equip stored items.'
        : 'Your Bag is empty. Loot appears here as you play; open Bank to manage stored items.';
    if (bagGuide.textContent !== guidance) bagGuide.textContent = guidance;
  }

  function updateBag() {
    const next = document.getElementById('bag-panel');
    if (next !== bag) restoreBag();
    if (!next || bag) return;
    bag = next;
    bagSummary = document.createElement('div');
    bagSummary.className = 'sw-bag-summary';
    const title = document.createElement('h2');
    title.textContent = 'Bag';
    bagSummary.append(title, document.createElement('span'));
    bagGuide = document.createElement('p');
    bagGuide.className = 'sw-bag-guide';
    bag.prepend(bagSummary);
    bag.append(bagGuide);
    updateBagCount();
    bagObserver = new MutationObserver(updateBagCount);
    bagObserver.observe(bag, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function restore() {
    placements.splice(0).reverse().forEach(restorePlacement);
    categories?.remove();
    tools?.remove();
    toolbar = null;
    restoreScrap();
    restoreBag();
  }

  function update() {
    const nextToolbar = document.querySelector('#tab-bank .bank-toolbar');
    if (!state.enabled || state.suspended || nextToolbar !== toolbar) restore();
    if (!state.enabled || state.suspended) return;
    updateScrap();
    updateBag();
    if (!nextToolbar || toolbar) return;
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
