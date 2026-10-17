window.fixtureEquipmentPicker = function () {
  const icon = document.querySelector('#tab-bank .bank-slot img').src;
  const create = (className, text, tag = 'div') => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const image = (label) => {
    const node = document.createElement('img');
    node.src = icon;
    node.alt = label;
    return node;
  };
  const positions = [
    'head',
    'cape',
    'neck',
    'ammo',
    'mainhand',
    'body',
    'offhand',
    'hands',
    'belt',
    'ring1',
    'legs',
    'ring2',
    'special',
  ];
  const items = [
    { id: 'iron_helm', name: 'Iron helm', slot: 'head', qty: 1 },
    { id: 'mystic_helm', name: 'Mystic enchanted helm', slot: 'head', qty: 2 },
    { id: 'copper_helm', name: 'Copper helm', slot: 'head', qty: 0 },
    { id: 'longbow', name: 'Precision longbow', slot: 'mainhand', family: 'range', qty: 1 },
    { id: 'dagger', name: 'Copper dagger', slot: 'mainhand', family: 'melee', qty: 1 },
    { id: 'gloves', name: 'Protective leather gloves', slot: 'hands', qty: 1 },
    { id: 'logs', name: 'Oak logs', type: 'raw', qty: 100 },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `helm_${index}`,
      name: `Reinforced helm ${index + 1}`,
      slot: 'head',
      qty: 1,
    })),
  ];
  const state = (window.fixtureEquipment = {
    actions: [],
    filter: 'all',
    search: '',
    slot: null,
    advanced: false,
    loadout: 'bow',
    family: 'range',
    visibleFamily: 'range',
    bankLoadout: 'bow',
    bankFamily: 'range',
    bankSelectorLoadout: 'bow',
    bankVisibleFamily: 'range',
    bankSelections: [],
    equipped: { head: 'iron_helm', mainhand: 'longbow' },
  });
  const panel = document.querySelector('.equipment-panel');
  panel.replaceChildren();
  const tabs = create('equip-panel-tabs');
  const selector = create('loadout-sel equip-panel-loadout-sel');
  const families = create('loadout-sel-families');
  const familyLoadouts = {
    melee: ['stab', 'slash', 'crush'],
    range: ['bow', 'crossbow', 'range_2', 'range_3', 'range_4', 'range_5'],
    magic: ['staff'],
    pvp: ['pvp'],
  };
  for (const family of ['melee', 'range', 'magic', 'pvp']) {
    const button = create(
      'loadout-sel-family' + (family === 'range' ? ' active' : ''),
      '',
      'button',
    );
    button.dataset.family = family;
    button.append(image(family), document.createTextNode(family));
    button.firstChild.className = 'loadout-sel-family-icon';
    button.addEventListener('click', () => {
      state.visibleFamily = family;
      state.actions.push(['family', family]);
      families.querySelectorAll('button').forEach((node) => {
        node.classList.toggle('active', node === button);
      });
      renderLoadouts();
    });
    families.append(button);
  }
  const loadouts = create('loadout-sel-slots');
  function renderLoadouts() {
    loadouts.replaceChildren();
    for (const loadout of familyLoadouts[state.visibleFamily]) {
      const button = create(
        'loadout-sel-slot' + (loadout === state.loadout ? ' active' : ''),
        '',
        'button',
      );
      button.dataset.loadout = loadout;
      button.append(image(loadout), create('loadout-sel-slot-label', loadout));
      button.firstChild.className = 'loadout-sel-slot-icon';
      button.addEventListener('click', () => {
        if (state.loadout === loadout) return;
        state.loadout = loadout;
        state.family = state.visibleFamily;
        state.bankLoadout = loadout;
        state.bankFamily = state.family;
        state.actions.push(['loadout', loadout]);
        renderLoadouts();
      });
      loadouts.append(button);
    }
  }
  renderLoadouts();
  selector.append(families, loadouts);
  const statsToggle = create('equip-panel-tab equip-panel-view-toggle', '⚔', 'button');
  tabs.append(selector, statsToggle);
  const doll = create('equip-panel-paperdoll');
  const stats = create('equip-panel-stats', 'Stats');
  stats.style.display = 'none';
  statsToggle.addEventListener('click', () => {
    const open = stats.style.display === 'none';
    stats.style.display = open ? '' : 'none';
    doll.style.display = open ? 'none' : '';
    state.actions.push(['stats', open]);
  });
  panel.append(tabs, doll, stats);
  const grid = document.querySelector('#tab-bank .bank-grid');
  grid.replaceChildren();
  const toolbar = document.querySelector('#tab-bank .bank-toolbar');
  const search = toolbar.querySelector('.bank-search');
  toolbar.replaceChildren(search);
  const clear = create('bank-slot-filter-clear', '× Head', 'button');
  clear.style.display = 'none';
  const paperdoll = create('paperdoll');
  const equip = document.querySelector('#tab-bank .equip-side');
  const display = create('equip-display');
  display.append(create('equip-title', 'Bow'), paperdoll);
  const bankSelector = create('loadout-sel loadout-sel');
  equip.replaceChildren(bankSelector, display);

  function renderBankSelector() {
    const families = create('loadout-sel-families');
    const loadouts = create('loadout-sel-slots');
    bankSelector.replaceChildren(families, loadouts);
    for (const family of Object.keys(familyLoadouts)) {
      const button = create(
        'loadout-sel-family' + (family === state.bankVisibleFamily ? ' active' : ''),
        family,
        'button',
      );
      button.dataset.family = family;
      button.addEventListener('click', () => {
        if (state.bankVisibleFamily === family) return;
        state.bankVisibleFamily = family;
        renderBankSelector();
      });
      families.append(button);
    }
    for (const loadout of familyLoadouts[state.bankVisibleFamily]) {
      const button = create(
        'loadout-sel-slot' + (loadout === state.bankSelectorLoadout ? ' active' : ''),
        loadout,
        'button',
      );
      button.dataset.loadout = loadout;
      button.addEventListener('click', () => {
        if (state.bankSelectorLoadout === loadout) return;
        state.bankSelectorLoadout = loadout;
        state.bankLoadout = loadout;
        state.bankFamily = state.bankVisibleFamily;
        state.bankSelections.push(loadout);
        renderBankSelector();
        renderEquipment();
      });
      loadouts.append(button);
    }
  }
  renderBankSelector();

  function applyFilters() {
    for (const node of grid.querySelectorAll('.bank-slot[data-item-id]')) {
      const item = items.find((item) => item.id === node.dataset.itemId);
      const matches =
        (state.filter === 'all' ||
          (state.filter === 'equipment' ? !!item.slot : item.type === state.filter)) &&
        (!state.slot ||
          (item.slot === state.slot &&
            (state.slot !== 'mainhand' || item.family === state.bankFamily))) &&
        item.name.toLowerCase().includes(state.search.toLowerCase()) &&
        (!state.advanced || item.qty > 1);
      node.style.display = matches ? '' : 'none';
    }
  }

  function slotFilters() {
    clear.style.display = state.slot ? '' : 'none';
    paperdoll.querySelectorAll('.inv-slot').forEach((node) => {
      node.classList.toggle(
        'slot-filter-active',
        !!state.slot && node.classList.contains(`slot-${state.slot}`),
      );
    });
    applyFilters();
  }

  function renderEquipment() {
    paperdoll.replaceChildren();
    for (const position of positions) {
      const selected = items.find((item) => item.id === state.equipped[position]);
      const slot = doll.querySelector(`.slot-${position}`) || create(`inv-slot slot-${position}`);
      slot.classList.toggle('empty', !selected);
      const icon = image(selected?.name || position);
      icon.className = selected ? 'equip-panel-item-img' : 'equip-panel-sil';
      const tip = create('tooltip');
      tip.append(create('tt-name', selected?.name || position));
      slot.replaceChildren(icon, tip);
      doll.append(slot);
      const bankSlot = slot.cloneNode(true);
      bankSlot.addEventListener('click', () => {
        state.slot = state.slot === position ? null : position;
        slotFilters();
      });
      paperdoll.append(bankSlot);
    }
    slotFilters();
  }
  clear.addEventListener('click', () => {
    state.slot = null;
    slotFilters();
  });
  toolbar.append(clear);
  search.addEventListener('input', () => {
    state.search = search.value;
    applyFilters();
  });
  for (const filter of ['all', 'raw', 'equipment']) {
    const button = create(
      'bank-filter-btn' + (filter === 'all' ? ' active' : ''),
      filter,
      'button',
    );
    button.dataset.filter = filter;
    button.addEventListener('click', () => {
      state.filter = filter;
      toolbar.querySelectorAll('.bank-filter-btn').forEach((node) => {
        node.classList.toggle('active', node === button);
      });
      applyFilters();
    });
    toolbar.append(button);
  }
  const advanced = create('bank-filter-menu-btn', '', 'button');
  const check = create('bank-filter-btn-check');
  advanced.append(check);
  check.addEventListener('click', () => {
    state.advanced = !state.advanced;
    check.classList.toggle('checked', state.advanced);
    applyFilters();
  });
  toolbar.append(advanced);
  function addItem(item) {
    const slot = create('inv-slot bank-slot' + (item.qty ? '' : ' bank-placeholder'));
    slot.dataset.itemId = item.id;
    slot.dataset.bankIndex = items.indexOf(item);
    slot.append(image(item.name), create('inv-qty', String(item.qty), 'span'));
    const tip = create('tooltip');
    tip.append(create('tt-name', item.name), create('tt-line', 'Native equipment effects'));
    slot.append(tip);
    slot.addEventListener('click', () => {
      if (item.slot && item.qty > 0) {
        state.actions.push(['equip', state.bankLoadout, item.slot, item.id]);
        state.equipped[item.slot] = item.id;
        renderEquipment();
      }
    });
    grid.append(slot);
  }
  items.forEach(addItem);
  grid.append(create('inv-slot empty bank-slot'));
  renderEquipment();
  window.fixtureEquipmentNativeNodes = Array.from(grid.children);
  window.fixtureEquipmentSearch = search;
  window.fixtureEquipmentRefresh = renderEquipment;
  window.fixtureEquipmentBankLoadout = function (loadout, family) {
    state.bankLoadout = loadout;
    state.bankFamily = family;
    state.bankSelectorLoadout = loadout;
    state.bankVisibleFamily = family;
    renderBankSelector();
    renderEquipment();
  };
  window.fixtureEquipmentAdd = function () {
    const item = { id: 'new_cape', name: 'New acquired cape', slot: 'cape', qty: 1 };
    items.push(item);
    addItem(item);
    applyFilters();
  };
};
