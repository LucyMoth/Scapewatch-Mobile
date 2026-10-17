(function () {
  'use strict';
  const state = window.fixtureState;
  state.selectionActions = [];
  const source = document.querySelector('.panel-tab-btn img').src;
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  }
  function action(cls, label, key) {
    const button = node(cls, label);
    button.addEventListener('click', () => state.selectionActions.push(key));
    return button;
  }
  const header = document.querySelector('.modal-header');
  const stats = node('header-stats');
  stats.append(node('', 'Life: 40/40'), node('', 'Spirit: 16/16'));
  stats.append(action('slay-weights-link', 'Slay Task Weights', 'weights'));
  header.querySelector('.header-info-group').append(stats);
  const navigation = node('processing-nav');
  for (const [id, name] of [
    ['mobs', 'Mob Selection'],
    ['pvp', 'PvP'],
  ]) {
    const button = node('processing-nav-btn');
    button.dataset.tab = id;
    const image = node('processing-nav-icon', '', 'img');
    image.src = source;
    image.alt = name;
    button.append(image, node('processing-nav-tooltip', name, 'span'));
    button.addEventListener('click', () => window.fixtureSelection(id));
    navigation.append(button);
  }
  header.insertBefore(navigation, header.querySelector('.modal-close'));
  const indicator = node('collections-indicator', '126/2311 5.5%');
  header.insertBefore(indicator, header.querySelector('.modal-close'));
  const mobs = document.querySelector('#tab-mobs');
  const layout = node('mob-layout');
  const list = node('mob-list-side');
  const toolbar = node('mob-list-toolbar');
  const search = node('mob-search', '', 'input');
  search.placeholder = 'Search mobs...';
  toolbar.append(search);
  const scroll = node('mob-list-scroll');
  const detail = node('mob-detail-side');
  detail.append(node('no-selection', 'Select a mob to view details'));
  for (let i = 0; i < 18; i++) {
    const row = node('mob-row');
    const map = action('mob-row-map-icon', '◎', ['map', i]);
    map.addEventListener('click', (event) => event.stopPropagation());
    const icon = node('mob-row-icon');
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    icon.append(sprite);
    const name = node('mob-row-name');
    name.append(node('mob-row-tier', 'Feeble'), node('mob-row-subname', 'Acid Slime ' + i));
    name.append(node('mob-row-level', 'Slay 1 · HP 20'));
    row.append(map, icon, name);
    row.addEventListener('click', () => {
      state.selectionActions.push(['mob', i]);
      const top = node('mob-detail-top');
      const info = node('mob-info-panel');
      info.append(node('mob-encounter-name', 'Feeble Acid Slime ' + i));
      info.append(node('mob-encounter-level', 'Slay 1 · HP 20'));
      const units = node('mob-unit-row');
      for (let unit = 0; unit < 4; unit++) {
        const item = node('mob-unit-item');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        item.append(canvas, node('mob-unit-name', 'Acid Slime'), node('mob-unit-level', 'HP 20'));
        units.append(item);
      }
      const derived = node('mob-derived-grid');
      for (const text of ['Life', 'Strike', 'Heft', 'Defend']) {
        const item = node('mob-derived-item');
        item.append(node('mob-derived-label', text), node('mob-derived-value', '20'));
        derived.append(item);
      }
      const columns = node('mob-two-col');
      const skills = node('mob-col-left');
      skills.append(node('mob-section-header', 'Combat Skills'));
      const equipment = node('mob-col-right');
      const table = node('mob-equip-table', '', 'table');
      for (const text of ['Equipment', 'Accuracy', 'Strength']) {
        const row = document.createElement('tr');
        row.append(node('', text, 'td'), node('', '20', 'td'), node('', '10', 'td'));
        table.append(row);
      }
      equipment.append(table);
      columns.append(skills, equipment);
      info.append(units, derived, columns);
      const config = node('mob-config-panel');
      config.append(action('fight-btn', 'Fight', ['fight', i]));
      top.append(info, config);
      detail.replaceChildren(top);
    });
    scroll.append(row);
  }
  list.append(toolbar, scroll);
  layout.append(list, detail);
  mobs.replaceChildren(layout);

  const pvp = document.querySelector('#tab-pvp');
  const pvpLayout = node('pvp-layout');
  const toggle = node('pvp-toggle');
  for (const name of ['1v1 PvP', 'Clan PvP'])
    toggle.append(action('qp-toggle-btn', name, ['mode', name]));
  const columns = node('pvp-cols');
  const left = node('pvp-left');
  left.append(node('pvp-section-title', 'Your PvP Loadouts'));
  const loadout = node('loadout-sel');
  for (const [cls, names] of [
    ['loadout-sel-families', ['Melee', 'Range', 'Magic']],
    [
      'loadout-sel-slots',
      ['Attacker 1', 'Attacker 2', 'Defender 1', 'Defender 2', 'Clan 1', 'Clan 2'],
    ],
  ]) {
    const buttons = node(cls);
    for (const name of names)
      buttons.append(
        action(cls === 'loadout-sel-families' ? 'loadout-sel-family' : 'loadout-sel-slot', name, [
          'loadout',
          name,
        ]),
      );
    loadout.append(buttons);
  }
  left.append(loadout);
  left.append(
    node(
      'pvp-hint',
      'Equip weapons and armor onto these loadouts from the Bank. Attacker 1 & 2 must wield different weapon types.',
    ),
  );
  left.append(node('pvp-balance-row', '331 bloodcoins'));
  const status = node('pvp-status');
  status.append(
    node('pvp-pair-row', 'Attacker (1 & 2): Ready'),
    node('pvp-pair-row', 'Defender (1 & 2): Same weapon type'),
  );
  left.append(status);
  const right = node('pvp-right');
  right.append(node('pvp-section-title', 'Players'));
  const table = node('hs-table', '', 'table');
  for (let i = 0; i < 12; i++) {
    const row = document.createElement('tr');
    row.append(node('', '1', 'td'), node('', 'A longer adventurer name ' + i, 'td'));
    const actions = node('', '', 'td');
    actions.append(action('pvp-btn pvp-attack-btn', 'Attack', ['attack', i]));
    row.append(actions);
    table.append(row);
  }
  right.append(table);
  columns.append(left, right);
  pvpLayout.append(toggle, columns);
  pvp.replaceChildren(pvpLayout);
  const open = window.fixtureOpenModal;
  window.fixtureSelection = function (id = 'mobs') {
    open(id);
    navigation.style.display = 'flex';
    stats.style.display = id === 'mobs' ? '' : 'none';
  };
})();
