(function () {
  const source = document.querySelector('.panel-tab-btn img').src;
  const state = (window.fixtureReview = { filters: [], closes: [], scrap: 0, loadouts: [] });
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  }
  window.fixtureReviewInventory = function () {
    const bag = document.getElementById('bag-panel');
    for (const [index, slot] of Array.from(bag.children).entries()) {
      slot.classList.toggle('empty', index > 1);
      slot.style.gridRow = String(Math.floor(index / 4) + 1);
      slot.style.gridColumn = String((index % 4) + 1);
    }
    window.fixtureReviewBagNodes = Array.from(bag.children);
    const row = node('bank-scrap-row');
    const slot = node('inv-slot bank-scrap-slot');
    const image = node('', '', 'img');
    image.src = source;
    image.alt = 'Scrap ore';
    slot.append(image, node('inv-qty', '∞'));
    slot.addEventListener('click', () => state.scrap++);
    row.append(slot);
    const grid = document.querySelector('#tab-bank .bank-grid');
    grid.before(row);
    window.fixtureReviewScrap = { row, parent: row.parentElement, next: row.nextSibling };
  };
  window.fixtureReviewFilter = function (kind = 'bank', native = false) {
    const classes = {
      bank: ['bank-filter-menu', 'bank-filter-head'],
      potions: ['potions-filter-menu', 'potions-filter-header'],
      chat: ['chat-category-menu', 'chat-category-title'],
    };
    const [menuClass, headClass] = classes[kind];
    const menu = node(menuClass);
    const head = node(headClass, kind + ' filters');
    const reset = node('', 'Show all', 'button');
    reset.addEventListener('click', (event) => {
      event.stopPropagation();
      state.filters.push('reset');
    });
    head.append(reset);
    const check = node('bank-filter-row', 'Equipment');
    check.addEventListener('click', (event) => {
      event.stopPropagation();
      state.filters.push(kind);
    });
    const body = node('bank-filter-body');
    body.append(check);
    for (let i = 0; i < 24; i++) body.append(node('bank-filter-row', 'Option ' + i));
    menu.append(head, body);
    function close() {
      menu.remove();
      state.closes.push(kind);
      for (const name of ['touchstart', 'mousedown', 'click'])
        document.removeEventListener(name, outside, true);
    }
    function outside(event) {
      if (!menu.contains(event.target)) close();
    }
    for (const name of ['touchstart', 'mousedown', 'click'])
      document.addEventListener(name, outside, true);
    if (native) {
      const closeButton = node('m-menu-x', '✕', 'button');
      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        close();
      });
      head.append(closeButton);
    }
    document.getElementById('ui-container').append(menu);
  };
  window.fixtureReviewCredits = function () {
    const overlay = node('cc-credits-overlay');
    const dialog = node('cc-credits-dialog');
    const head = node('cc-credits-header');
    const close = node('cc-credits-close', '✕');
    close.addEventListener('click', () => {
      state.closes.push('credits');
      overlay.remove();
    });
    head.append(node('cc-credits-title', 'Credits'), close);
    const body = node('cc-credits-body');
    for (let i = 0; i < 30; i++) body.append(node('credits-body', 'Original artist credit ' + i));
    dialog.append(head, body);
    overlay.append(dialog);
    document.body.append(overlay);
  };
  window.fixtureReviewPvp = function () {
    const status = document.querySelector('.pvp-status');
    status.children[1].classList.add('pvp-bad');
    const equip = document.querySelector('#tab-bank .equip-side');
    const selector = node('loadout-sel');
    const family = node('loadout-sel-family', 'PvP', 'button');
    family.dataset.family = 'pvp';
    const slots = node('loadout-sel-slots');
    family.addEventListener('click', () => {
      slots.replaceChildren();
      for (let i = 1; i <= 6; i++) {
        const option = node('loadout-sel-slot', 'PvP loadout ' + i, 'button');
        option.dataset.loadout = 'pvp_' + i;
        option.addEventListener('click', () => state.loadouts.push(option.dataset.loadout));
        slots.append(option);
      }
    });
    selector.append(family, slots);
    equip.replaceChildren(selector, node('equip-title', 'Loadout'));
  };
})();
