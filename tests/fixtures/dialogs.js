(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const state = window.fixtureState;
  const source = document.querySelector('.panel-tab-btn img').src;
  Object.assign(state, {
    ledgerContinue: 0,
    ledgerOpen: 0,
    ledgerFilter: 0,
    ledgerSlotClicks: [],
    creatorCategory: [],
    creatorSelect: [],
    creatorDirections: [],
    creatorActions: [],
    creatorPackClicks: [],
    creatorOutfitClicks: [],
    hudExpand: 0,
    hudWorld: 0,
    hudOffline: 0,
    potionExpand: 0,
    potionCollapse: 0,
    recenterClicks: 0,
  });
  function el(cls, text, tag = 'div') {
    const node = document.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function img(cls, alt) {
    const node = el(cls, undefined, 'img');
    node.src = source;
    node.alt = alt;
    return node;
  }
  function on(node, event, fn) {
    node.addEventListener(event, fn);
    state.listeners.push({ el: node, type: event, fn });
  }
  function section(title, cls, body) {
    const node = el('ledger-sec ' + cls);
    const head = el('ledger-sec-h');
    head.append(el('ledger-lbl', title), el('ledger-cnt', '35 shown'));
    node.append(head, body);
    return node;
  }
  function miles() {
    const body = el('ledger-sec-body');
    for (let i = 0; i < 18; i++) {
      const row = el('ledger-row');
      row.append(
        img('', 'Milestone'),
        el('ledger-row-k', 'Gathered resources ' + i),
        el('ledger-row-v', '+12,345'),
      );
      body.append(row);
    }
    return section('Milestones', 'ledger-sec-miles', body);
  }
  function skills() {
    const body = el('ledger-sec-body');
    const table = el('ledger-table', undefined, 'table');
    table.innerHTML =
      '<thead><tr><th class="ledger-th-skill" colspan="2">Skill</th>' +
      ['Level', 'Levels', 'XP', 'Tasks', 'Credits']
        .map((label) => '<th class="ledger-th-num">' + label + '</th>')
        .join('') +
      '</tr></thead><tbody></tbody><tfoot><tr class="ledger-total-row"><td class="ledger-td-icon"></td><td class="ledger-td-name">Total</td>' +
      ['999', '+12', '+12,345,678', '+1,234', '+1,246']
        .map((value) => '<td class="ledger-td-num">' + value + '</td>')
        .join('') +
      '</tr></tfoot>';
    const tbody = table.querySelector('tbody');
    for (let i = 0; i < 30; i++) {
      const row = el('ledger-skill-row', undefined, 'tr');
      row.innerHTML =
        '<td class="ledger-td-icon"></td><td class="ledger-td-name">' +
        (i === 29 ? 'Discover' : 'Gathering skill ' + i) +
        '</td><td class="ledger-td-num ledger-td-level ledger-tn">99</td><td class="ledger-td-num">+12</td><td class="ledger-td-num">+12,345,678</td><td class="ledger-td-num">+1,234</td><td class="ledger-td-num">+1,246</td>';
      row.firstChild.append(img('', 'Skill ' + i));
      tbody.append(row);
    }
    body.append(table);
    return section('Skills', 'ledger-sec-skills ledger-skills', body);
  }
  function loot() {
    const body = el('ledger-sec-body');
    const groups = el('ledger-groups');
    const group = el('ledger-group');
    group.append(el('ledger-group-h', 'Items · 35'));
    const grid = el('bank-grid ledger-lootgrid');
    for (let i = 0; i < 35; i++) {
      const slot = el('inv-slot bank-slot ledger-slot');
      slot.dataset.itemId = String(1000 + i);
      slot.append(img('', 'Loot ' + i), el('inv-qty', String(100000 + i)));
      on(slot, 'click', () => state.ledgerSlotClicks.push(i));
      grid.append(slot);
    }
    group.append(grid);
    groups.append(group);
    body.append(groups);
    return section('Loot', 'ledger-sec-loot ledger-loot', body);
  }
  window.fixtureWelcomeBack = function () {
    document.querySelector('.ledger-return-overlay')?.remove();
    const overlay = el('ledger-return-overlay');
    const card = el('ledger-card');
    const compact = el('ledger-compact');
    const left = el('ledger-compact-left');
    const right = el('ledger-compact-right');
    const head = el('ledger-card-head');
    const id = el('ledger-card-id');
    const portrait = el('ledger-card-portrait');
    portrait.append(el('ledger-portrait-canvas', undefined, 'canvas'));
    const titles = el('ledger-card-titles');
    titles.append(
      el('ledger-card-title', 'Welcome back,'),
      el('ledger-card-name', 'AdventurerWithALongPlayerName'),
      el('ledger-card-sub', 'While you were away for 12h 34m'),
    );
    id.append(portrait, titles);
    head.append(id, el('ledger-card-badges', 'Total levels 999 · +12 · XP +12,345,678'));
    left.append(head, miles());
    right.append(skills(), loot());
    compact.append(left, right);
    card.append(compact);
    const foot = el('ledger-card-foot');
    const open = el('ledger-btn', 'Open Ledger', 'button');
    const cont = el('ledger-btn ledger-btn-primary', 'Continue', 'button');
    on(open, 'click', () => {
      state.ledgerOpen++;
      overlay.remove();
      window.fixtureLedger();
    });
    on(cont, 'click', () => {
      state.ledgerContinue++;
      overlay.remove();
    });
    foot.append(open, cont);
    card.append(foot);
    overlay.append(card);
    ui.append(overlay);
    return overlay;
  };
  window.fixtureLedger = function () {
    window.fixtureOpenModal('ledger');
    const host = document.getElementById('tab-ledger');
    host.replaceChildren();
    const wrap = el('ledger');
    const top = el('ledger-top');
    const leftTop = el('ledger-top-left');
    leftTop.append(el('ledger-title', 'The Ledger'), el('ledger-sub', 'This session · 12h 34m'));
    top.append(leftTop);
    const tabs = el('ledger-tabs');
    for (const label of ['Now', 'Last', 'All']) {
      const tab = el('ledger-tab', label);
      on(tab, 'click', () => state.ledgerFilter++);
      tabs.append(tab);
    }
    top.append(tabs);
    let slot = document.querySelector('.modal-main > .modal-header .ledger-header-slot');
    if (!slot) {
      slot = el('ledger-header-slot');
      document.querySelector('.modal-main > .modal-header').append(slot);
    }
    slot.replaceChildren(top);
    slot.style.display = 'flex';
    const body = el('ledger-body');
    const left = el('ledger-col ledger-col-left');
    const mid = el('ledger-col ledger-col-mid');
    const right = el('ledger-col ledger-col-right');
    const heroBody = el('ledger-sec-body');
    heroBody.append(el('ledger-name', 'Adventurer'), el('ledger-badges', 'Total level 999'));
    left.append(section('Character', 'ledger-hero', heroBody), miles());
    mid.append(skills());
    right.append(loot());
    body.append(left, mid, right);
    wrap.append(body);
    host.append(wrap);
  };
  window.fixtureCustomize = function () {
    window.fixtureOpenModal('customize');
    const ledgerSlot = document.querySelector('.ledger-header-slot');
    if (ledgerSlot) ledgerSlot.style.display = 'none';
    const host = document.getElementById('tab-customize');
    host.replaceChildren();
    const modalHeader = document.querySelector('.modal-main > .modal-header');
    modalHeader.querySelector('.cc-header-controls')?.remove();
    const headerControls = el('cc-header-controls');
    headerControls.style.display = 'flex';
    const outfit = el('cc-outfit-controls');
    outfit.append(el('', 'Outfit:', 'label'));
    const outfitSelect = el('cc-outfit-select', undefined, 'select');
    outfitSelect.innerHTML =
      '<option>Load outfit...</option><option>Saved adventuring outfit</option>';
    outfit.append(outfitSelect);
    for (const label of ['💾', '🗑']) {
      const action = el('cc-outfit-btn', label, 'button');
      on(action, 'click', () => state.creatorOutfitClicks.push(label));
      outfit.append(action);
    }
    headerControls.append(outfit, el('cc-lpc-credit', 'LPC Credit for sprites!', 'a'));
    modalHeader.insertBefore(headerControls, modalHeader.querySelector('.modal-close'));
    const creator = el('character-creator creator-layout');
    const preview = el('creator-preview');
    preview.append(el('', 'Preview', 'h3'));
    const canvasWrap = el('cc-canvas-wrap');
    canvasWrap.style.width = '192px';
    canvasWrap.style.height = '192px';
    const canvas = el('', undefined, 'canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.width = '192px';
    canvas.style.height = '192px';
    canvasWrap.append(canvas);
    preview.append(canvasWrap);
    const dirs = el('cc-dir-btns');
    ['↑', '←', '↓', '→'].forEach((name, index) => {
      const button = el('', name, 'button');
      button.dataset.d = String(index);
      on(button, 'click', () => state.creatorDirections.push(index));
      dirs.append(button);
    });
    preview.append(dirs);
    const play = el('cc-play-btn', '⏸ Pause', 'button');
    on(play, 'click', () => state.creatorActions.push('pause'));
    preview.append(play);
    const save = el('cc-save-area');
    const lockBanner = el('cc-preview-lock');
    lockBanner.style.display = 'none';
    save.append(lockBanner);
    for (const name of ['Save', 'Random', 'Defaults']) {
      const button = el('cc-save-btn', name, 'button');
      on(button, 'click', () => state.creatorActions.push(name));
      save.append(button);
    }
    preview.append(save);
    window.fixtureCreatorLock = function () {
      const saveButton = save.querySelector('.cc-save-btn');
      saveButton.disabled = true;
      saveButton.classList.add('is-locked');
      lockBanner.style.display = '';
      lockBanner.replaceChildren(
        el(
          'cc-preview-lock-msg',
          'Previewing Supporter Pack items. Get the pack on Steam to save this look.',
        ),
      );
      const actions = el('cc-preview-lock-btns');
      const buy = el('cc-preview-lock-btn buy', 'Get on Steam ↗', 'button');
      const remove = el('cc-preview-lock-btn', 'Remove pack items', 'button');
      on(buy, 'click', () => state.creatorPackClicks.push('Supporter Pack'));
      on(remove, 'click', () => {
        state.creatorActions.push('Remove pack items');
        saveButton.disabled = false;
        saveButton.classList.remove('is-locked');
        lockBanner.style.display = 'none';
      });
      actions.append(buy, remove);
      lockBanner.append(actions);
    };
    const summary = el('cc-layers-summary');
    summary.append(el('cc-ls-title', 'Render Layers'));
    for (let i = 0; i < 12; i++)
      summary.append(el('cc-ls-row', 'Layer ' + i + ' · Original sprite clothing'));
    preview.append(summary);
    creator.append(preview);
    const sidebar = el('creator-sidebar');
    [
      'Body',
      'Head',
      'Hair',
      'Torso',
      'Legs',
      'Feet',
      'Hands',
      'Mainhand',
      'Offhand',
      'Cape',
      'Badge',
      'Sleep',
    ].forEach((name, index) => {
      const button = el('cat-btn' + (!index ? ' active' : ''), undefined, 'button');
      button.append(el('icon', '◇', 'span'), el('lbl', name, 'span'));
      on(button, 'click', () => state.creatorCategory.push(index));
      sidebar.append(button);
    });
    creator.append(sidebar);
    const center = el('creator-center');
    const area = el('cc-slots-area');
    const packs = el('cc-pack-banner');
    for (const [index, name] of ['Base Game', 'Supporter Pack', 'Wings Pack'].entries()) {
      const card = el('cc-pack-card ' + (index ? 'buyable' : 'owned'));
      const text = el('cc-pack-text');
      text.append(
        el('cc-pack-title', name),
        el('cc-pack-status', '31 slots, 1289 options, +16 hrs offline time'),
        el('cc-pack-blurb', 'Clothing and appearance options for your character'),
      );
      const cue = el('cc-pack-cue', index ? 'Get on Steam ↗' : '✓ Owned on Steam', 'button');
      on(cue, 'click', (event) => {
        event.stopPropagation();
        state.creatorPackClicks.push(name);
      });
      on(card, 'click', () => state.creatorPackClicks.push(name));
      card.append(img('cc-pack-icon', ''), text, cue);
      packs.append(card);
    }
    area.append(packs);
    for (let i = 0; i < 14; i++) {
      const group = el('cc-slot-group');
      group.append(el('cc-slot-label', 'Equipment appearance slot ' + i));
      const row = el('cc-slot-row');
      const before = el('cc-slot-arrow', '‹', 'button');
      const after = el('cc-slot-arrow', '›', 'button');
      on(before, 'click', () => state.creatorSelect.push([i, 'previous']));
      on(after, 'click', () => state.creatorSelect.push([i, 'next']));
      const select = el('', undefined, 'select');
      select.innerHTML =
        '<option value="base">Original outfit</option><option value="long">A very long alternative cosmetic name</option>';
      on(select, 'change', () => state.creatorSelect.push([i, select.value]));
      row.append(before, select, after);
      group.append(row);
      const variant = el('cc-variant-row');
      variant.append(el('cc-variant-label', 'Color'), el('', undefined, 'select'));
      variant.lastChild.innerHTML = '<option>Default</option><option>Blue</option>';
      group.append(variant);
      area.append(group);
    }
    center.append(area);
    creator.append(center);
    host.append(creator);
  };
  window.fixtureChatRow = function ({
    sender,
    text,
    channel = 'global',
    timestamp = '00:51',
    world = true,
    staff = true,
  }) {
    const row = el('chat-message chat-msg-' + channel);
    row.dataset.channel = channel;
    row.style.color = channel === 'game' ? '#8fc7f0' : '#ffffff';
    row.append(el('chat-timestamp', '[' + timestamp + '] ', 'span'));
    if (world) row.append(el('chat-world-tag', 'W2 ', 'span'));
    const badge = el('chat-badge-slot', undefined, 'span');
    if (staff) badge.append(img('chat-staff-crown', 'Staff badge'));
    row.append(badge);
    if (sender) row.append(el('chat-sender-name', sender, 'span'));
    else row.append(img('chat-game-icon', 'Loot icon'));
    row.append(el('', (sender ? ': ' : '') + text, 'span'));
    return row;
  };
  window.fixtureChatSeed = function () {
    const area = document.querySelector('.chat-message-area');
    area.replaceChildren();
    [
      { sender: 'OldPlayer', text: 'An older line excluded by the three-line limit' },
      { sender: 'Alice', text: 'Hello world' },
      {
        sender: 'Bob',
        text: 'A long community message that wraps gracefully on a narrow phone without timestamps or badge icons',
      },
      { sender: 'SystemEvent', text: 'Game event not copied', channel: 'game' },
      { sender: 'César', text: '¡Buenas noches!' },
      { text: 'A global server event without a sender' },
    ].forEach((message) => area.append(window.fixtureChatRow(message)));
  };
  window.fixtureChatAppend = function (sender, text, channel = 'global') {
    document
      .querySelector('.chat-message-area')
      .append(window.fixtureChatRow({ sender, text, channel }));
  };
  window.fixtureChatReplaceArea = function () {
    const current = document.querySelector('.chat-message-area');
    const fresh = current.cloneNode(false);
    current.replaceWith(fresh);
    window.fixtureChatSeed();
  };
  window.fixtureHudDetailed = function (expanded = true) {
    document.querySelector('.ingame-hud')?.remove();
    document.querySelector('.active-potions-pill')?.remove();
    document.querySelector('.active-potions-panel')?.remove();
    document.querySelector('.recenter-camera-btn')?.remove();
    const hud = el('ingame-hud');
    const info = el('ingame-hud-row ingame-hud-info' + (expanded ? ' expanded' : ''));
    info.append(
      el('ingame-hud-caret', '', 'span'),
      el('ingame-hud-name', 'Adventurer_With_A_Long_Name', 'span'),
      el('ingame-hud-sep', '·', 'span'),
      el('ingame-hud-state state-acting', 'Gathering at Battlefrost Quarry', 'span'),
      el('ingame-hud-f2p', 'FREE TO PLAY', 'span'),
    );
    hud.append(info);
    const online = el('ingame-hud-row ingame-hud-online');
    online.style.display = expanded ? '' : 'none';
    const total = el('ingame-hud-online-total');
    total.append(
      el('ingame-hud-dot', '', 'span'),
      el('', '1,234', 'b'),
      el('ingame-hud-online-label', 'Online', 'span'),
    );
    online.append(total);
    const world = el('ingame-hud-world');
    world.append(el('', 'World 2', 'span'), el('ingame-hud-chev', '▼', 'span'));
    on(world, 'click', (event) => {
      event.stopPropagation();
      state.hudWorld++;
    });
    online.append(world);
    const offline = el('ingame-hud-offline', '12h 34m');
    on(offline, 'click', (event) => {
      event.stopPropagation();
      state.hudOffline++;
    });
    online.append(offline);
    hud.append(online);
    on(info, 'click', () => {
      state.hudExpand++;
      info.classList.toggle('expanded');
      online.style.display = info.classList.contains('expanded') ? '' : 'none';
    });
    ui.append(hud);
    const pill = el('active-potions-pill');
    pill.append(
      el('active-potions-pill-chev', '◀', 'span'),
      img('active-potions-pill-icon', 'Show potions'),
    );
    const panel = el('active-potions-panel');
    panel.style.display = 'none';
    const body = el('active-potions-body');
    for (let i = 0; i < 4; i++) {
      const row = el('potion-row');
      row.dataset.style = ['melee', 'defensive', 'movement', 'teleport'][i];
      const wrap = el('potion-row-icon-wrap');
      wrap.append(img('potion-row-icon', 'Potion ' + i));
      const stat = el('potion-row-stat');
      stat.append(
        el(
          i === 3 ? 'potion-row-stat-name' : 'potion-row-stat-val',
          i === 3 ? 'Perfect Crystal' : '+30%',
          'span',
        ),
      );
      if (i !== 3) stat.append(img('potion-row-stat-icon', 'Potion bonus'));
      const count = el('potion-row-count');
      count.append(
        el('potion-row-count-num', '12,345', 'span'),
        el('potion-row-count-unit', i === 3 ? 'teleports' : 'attacks', 'span'),
      );
      row.append(wrap, stat, count);
      body.append(row);
    }
    panel.append(body);
    on(pill, 'click', () => {
      state.potionExpand++;
      pill.style.display = 'none';
      panel.style.display = '';
    });
    on(panel, 'click', () => {
      state.potionCollapse++;
      panel.style.display = 'none';
      pill.style.display = '';
    });
    ui.append(pill, panel);
    const recenter = el('recenter-camera-btn roam', 'Roam Map', 'button');
    on(recenter, 'click', () => state.recenterClicks++);
    ui.append(recenter);
  };
  const global = el('tooltip global-tooltip');
  global.style.display = 'none';
  document.body.append(global);
  window.fixtureGlobalTaskTooltip = function (show = true) {
    global.innerHTML =
      '<div class="tt-name">Reroll task preview</div><div class="tt-line uq-tt-wrap">An original global tooltip cloned from a nested .tooltip source. Its mobile details must not obscure top row task choices.</div>';
    global.style.cssText =
      'display:' +
      (show ? 'block' : 'none') +
      ';left:8px;top:85px;transform:scale(.3);transform-origin:top left;';
  };
  const controls = document.querySelector('.uq-controls');
  const credits = el('uq-credits', '68 credits');
  const tip = el('tooltip');
  tip.innerHTML =
    '<div class="tt-name">Task credits</div><div class="tt-line">Rerolls spend credits; the next tap still targets the original control.</div>';
  credits.append(tip);
  on(credits, 'click', () => window.fixtureGlobalTaskTooltip(true));
  controls.append(credits);
  window.fixtureDialogsReady = true;
})();
