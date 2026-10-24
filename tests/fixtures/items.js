window.fixtureItemDetails = function () {
  const ui = document.getElementById('ui-container');
  let tip = document.querySelector('.global-tooltip');
  let active;
  let suppressClick = false;
  let lastTouchAt = 0;
  const triggers =
    '.inv-slot, .loot-slot, .potion-row, .potion-stats-toggle-wrap, .equip-compare-toggle-wrap, .spirit-stats-toggle-wrap, .gearcalc-launch-wrap';
  window.fixtureItems = { actions: [], dismissed: 0 };

  function content(name) {
    return (
      `<div class="tt-name">${name}</div><div class="tt-line">Tier 4 · Ranged weapon</div><div class="tt-line">Click to equip</div>` +
      '<table class="tt-equip-table"><thead><tr><th></th><th>Attack</th><th>Defense</th><th>Strength</th></tr></thead><tbody>' +
      ['Stab', 'Slash', 'Crush', 'Range', 'Magic']
        .map((style) => `<tr><td>${style}</td><td>+120</td><td>+30</td><td>+48</td></tr>`)
        .join('') +
      '</tbody></table><div class="tt-special-desc">Deals additional damage after consecutive attacks. The effect remains active until you change loadout.</div>' +
      Array.from(
        { length: 14 },
        (_, index) =>
          `<div class="tt-line tt-wrap">Detail ${index}: Increased precision improves this weapon’s effective combat strength and available effects.</div>`,
      ).join('')
    );
  }

  function prepare(slot, name) {
    if (slot.matches('.bank-slot')) {
      delete slot.dataset.itemId;
      slot.dataset.bankIndex = '0';
    } else slot.dataset.itemId = 'precision_longbow';
    const source = document.createElement('div');
    source.className = 'tooltip';
    source.innerHTML = content(name);
    slot.append(source);
    const quantity = slot.querySelector('.inv-count, .inv-qty');
    quantity.className = 'inv-qty';
    quantity.textContent = slot.classList.contains('ledger-slot') ? '+99,999' : '99,999';
    slot.addEventListener('click', () => window.fixtureItems.actions.push(name));
  }

  prepare(document.querySelector('#tab-bank .bank-slot'), 'Battlefrost precision longbow');
  window.fixturePrepareAwayLoot = function () {
    const slot = document.querySelector('.ledger-return-overlay .ledger-slot');
    prepare(slot, 'Newly acquired precision longbow');
  };
  ui.addEventListener('mouseover', (event) => {
    const trigger = event.target.closest(triggers);
    const source = trigger?.querySelector('.tooltip');
    if (!source) return;
    active = trigger;
    tip.innerHTML = source.innerHTML;
    tip.classList.remove('node-style');
    Object.assign(tip.style, {
      display: 'block',
      left: '1000px',
      top: '900px',
      transform: 'scale(0.2)',
    });
  });
  ui.addEventListener('mouseout', (event) => {
    if (active && Date.now() - lastTouchAt >= 1500 && !active.contains(event.relatedTarget)) {
      active = null;
      tip.style.display = 'none';
      window.fixtureItems.dismissed++;
    }
  });
  document.addEventListener(
    'touchstart',
    (event) => {
      lastTouchAt = Date.now();
      const trigger = event.target.closest?.(triggers);
      if (!trigger) {
        if (active) window.fixtureItems.dismissed++;
        active = null;
        tip.style.display = 'none';
        suppressClick = false;
      } else {
        suppressClick =
          !trigger.closest('[data-no-tap-first]') &&
          !!trigger.querySelector('.tooltip') &&
          active !== trigger;
      }
    },
    true,
  );
  window.fixtureReplaceTooltip = function () {
    const next = tip.cloneNode(false);
    next.className = 'tooltip global-tooltip';
    next.style.display = 'none';
    tip.replaceWith(next);
    tip = next;
    active = null;
    suppressClick = false;
  };
  document.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );
};

window.fixtureBankControls = function () {
  const toolbar = document.querySelector('#tab-bank .bank-toolbar');
  const search = toolbar.querySelector('.bank-search');
  toolbar.replaceChildren(search);
  window.fixtureBank = { filters: [], modes: [], search: [], utilities: [] };
  search.addEventListener('input', () => window.fixtureBank.search.push(search.value));
  for (const [id, label] of Object.entries({
    all: 'All',
    raw: 'Raw',
    processed: 'Processed',
    equipment: 'Equipment',
    potion: 'Potions',
    scrolls: 'Scrolls',
  })) {
    const button = document.createElement('button');
    button.className = 'bank-filter-btn' + (id === 'all' ? ' active' : '');
    button.dataset.filter = id;
    button.textContent = label;
    button.addEventListener('click', () => {
      toolbar
        .querySelectorAll('.bank-filter-btn')
        .forEach((element) => element.classList.toggle('active', element === button));
      window.fixtureBank.filters.push(id);
    });
    toolbar.append(button);
  }
  for (const label of ['Sort', 'Swap', 'Insert', 'Filters', 'Remove placeholders']) {
    const button = document.createElement('button');
    button.className = label === 'Filters' ? 'bank-filter-menu-btn' : 'bank-mode-btn';
    button.textContent = label;
    button.addEventListener('click', () => window.fixtureBank.modes.push(label));
    toolbar.append(button);
  }
  window.fixtureOriginalBankNodes = Array.from(toolbar.children);
  const equip = document.querySelector('#tab-bank .equip-side');
  equip.replaceChildren();
  const display = document.createElement('div');
  display.className = 'equip-display';
  const title = document.createElement('div');
  title.className = 'equip-title';
  title.textContent = 'Precision ranged loadout';
  const paperdoll = document.createElement('div');
  paperdoll.className = 'paperdoll';
  for (const position of ['head', 'cape', 'neck', 'ammo', 'mainhand', 'body', 'offhand', 'hands']) {
    const slot = document.createElement('div');
    slot.className = `inv-slot slot-${position}`;
    slot.innerHTML = `<img alt="${position}">`;
    paperdoll.append(slot);
  }
  display.append(title, paperdoll);
  equip.append(display);
  const stats = document.createElement('div');
  stats.className = 'equip-stats-panel';
  stats.innerHTML =
    '<div class="stats-weapon-line">Weapon: Corrupted precision longbow</div><div class="stats-style-line">Style: Precise Ranged · Speed: 1.05s · Max Hit: 12,345</div><table class="stats-table"><thead><tr><th></th><th>Attack</th><th>Defense</th><th>Strength</th></tr></thead><tbody>' +
    ['Stab', 'Slash', 'Crush', 'Range', 'Magic']
      .map((style) => `<tr><td>${style}</td><td>+120</td><td>+30</td><td>+48</td></tr>`)
      .join('') +
    '</tbody></table>';
  for (const [kind, label] of Object.entries({
    'potion-stats-toggle': 'Potion boosts',
    'equip-compare-toggle': 'Compare equipment',
    'spirit-stats-toggle': 'Spirit modifier',
    'gearcalc-launch': 'Extended combat calculator',
  })) {
    const wrap = document.createElement('div');
    wrap.className = `${kind}-wrap`;
    wrap.innerHTML = `<img class="${kind}" alt="${label}"><div class="tooltip"><div class="tt-name">${label}</div><div class="tt-line">View ${label.toLowerCase()} in equipment statistics</div></div>`;
    wrap.addEventListener('click', () => window.fixtureBank.utilities.push(kind));
    stats.append(wrap);
  }
  equip.append(stats);
};

window.fixtureBankFilterMenu = function () {
  const menu = document.createElement('div');
  menu.className = 'bank-filter-menu';
  menu.style.cssText = 'left:900px;top:700px';
  menu.innerHTML =
    '<div class="bank-filter-head">Item filters</div><div class="bank-filter-body"><div class="bank-filter-cols"></div></div>';
  const columns = menu.querySelector('.bank-filter-cols');
  for (const title of ['Items', 'Materials', 'Equipment']) {
    const column = document.createElement('div');
    column.innerHTML = `<div class="bank-filter-section">${title}</div>`;
    for (let index = 0; index < 8; index++) {
      const row = document.createElement('div');
      row.className = 'bank-filter-row';
      row.innerHTML = `<span class="bank-filter-label">${title} filter ${index}</span><span class="bank-filter-check checked"></span>`;
      column.append(row);
    }
    columns.append(column);
  }
  document.getElementById('ui-container').append(menu);
  const dismiss = (event) => {
    if (menu.contains(event.target)) return;
    menu.remove();
    document.removeEventListener('touchstart', dismiss, true);
  };
  document.addEventListener('touchstart', dismiss, true);
};
