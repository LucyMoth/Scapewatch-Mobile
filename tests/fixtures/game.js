/* Offline, representative DOM built from official Scapewatch client classes.
 * No credentials, gameplay connection, or live accounts are used in QA. */
(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const icon =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="5" fill="#aa8245"/><path d="M8 24L24 8M8 8L24 24" stroke="#fff1bd" stroke-width="3"/></svg>',
    );
  const state = (window.fixtureState = {
    listeners: [],
    panelClicks: {},
    modalClicks: {},
    skillClicks: 0,
    inventoryClicks: 0,
    taskControlClicks: 0,
    closeClicks: 0,
    messages: [],
    loginClicks: 0,
    patchNotesClicks: 0,
    networkCalls: [],
    storageCalls: [],
    gameplay: {
      hp: 100,
      gold: 1500,
      queue: ['mine_ore', 'smelt_ore'],
      inventory: [{ id: 101, count: 10 }],
    },
  });
  window.fixtureOriginalGameplay = JSON.stringify(state.gameplay);
  window.fetch = function () {
    state.networkCalls.push(['fetch', ...arguments]);
    return Promise.reject(new Error('No live network in QA'));
  };
  window.XMLHttpRequest = function () {
    state.networkCalls.push(['XMLHttpRequest']);
    throw new Error('No live network in QA');
  };
  window.WebSocket = function () {
    state.networkCalls.push(['WebSocket', ...arguments]);
    throw new Error('No live network in QA');
  };
  const storageProto = Storage.prototype;
  ['getItem', 'setItem', 'removeItem', 'clear'].forEach((key) => {
    const orig = storageProto[key];
    storageProto[key] = function () {
      state.storageCalls.push([key, ...arguments]);
      return orig.apply(this, arguments);
    };
  });
  const visual = new EventTarget();
  visual.width = innerWidth;
  visual.height = innerHeight;
  visual.offsetTop = 0;
  visual.offsetLeft = 0;
  visual.pageTop = 0;
  visual.pageLeft = 0;
  visual.scale = 1;
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual });
  window.fixtureKeyboard = function (height) {
    visual.height = height;
    visual.width = innerWidth;
    visual.dispatchEvent(new Event('resize'));
    visual.dispatchEvent(new Event('scroll'));
  };
  function create(cls, text, tag = 'div') {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function img(alt) {
    const e = document.createElement('img');
    e.src = icon;
    e.alt = alt;
    return e;
  }
  function listen(el, type, fn) {
    el.addEventListener(type, fn);
    state.listeners.push({ el, type, fn });
  }
  const panels = [
    'tasks',
    'skills',
    'quests',
    'inventory',
    'diary',
    'equipment',
    'friends',
    'barter',
  ];
  const panelNodes = {};
  const panelBar = create('panel-tab-bar');
  const names = {
    tasks: 'Tasks',
    skills: 'Skills',
    quests: 'Quests',
    inventory: 'Inventory',
    diary: 'Diary Achievements',
    equipment: 'Equipment',
    friends: 'Friends',
    barter: 'Barter',
  };
  panels.forEach((id) => {
    const tab = create('panel-tab-btn');
    tab.id = 'toggle-' + id;
    tab.dataset.tab = id;
    tab.append(img(names[id]));
    const tooltip = create('panel-tab-tooltip', names[id], 'span');
    tooltip.dataset.name = names[id];
    tooltip.dataset.tab = id;
    tab.append(tooltip);
    tab.append(create('panel-tab-dot'));
    tab.append(create('panel-tab-hotkey'));
    listen(tab, 'click', () => {
      state.panelClicks[id] = (state.panelClicks[id] || 0) + 1;
      const opening = panelNodes[id].style.display === 'none';
      panels.forEach((key) => {
        panelNodes[key].style.display = 'none';
        panelBar.querySelector('[data-tab="' + key + '"]').classList.remove('active');
      });
      if (opening) {
        panelNodes[id].style.display =
          id === 'skills' || id === 'inventory' ? 'grid' : id === 'tasks' ? 'flex' : 'block';
        tab.classList.add('active');
      }
    });
    panelBar.append(tab);
    const panel = create(id === 'tasks' ? 'uq-panel uq-d-normal' : id + '-panel');
    panel.id =
      id === 'inventory' ? 'bag-panel' : id === 'tasks' ? 'unified-queue-panel' : id + '-panel';
    panel.style.display = 'none';
    panelNodes[id] = panel;
    if (id === 'skills') {
      for (let i = 0; i < 30; i++) {
        const cell = create('skill-cell');
        cell.dataset.skillId = 'skill_' + i;
        cell.append(img('Mining'));
        cell.append(create('skill-level', String(10 + i)));
        listen(cell, 'click', () => state.skillClicks++);
        panel.append(cell);
      }
    } else if (id === 'inventory') {
      for (let i = 0; i < 28; i++) {
        const slot = create('inv-slot');
        slot.dataset.slotIndex = i;
        slot.style.gridRow = Math.floor(i / 4) + 1;
        slot.style.gridColumn = (i % 4) + 1;
        slot.append(img(i % 2 ? 'Iron ore' : 'Logs'));
        slot.append(create('inv-count', String(10 + i)));
        listen(slot, 'click', () => state.inventoryClicks++);
        panel.append(slot);
      }
    } else if (id === 'tasks') {
      const current = create('uq-row uq-current');
      const currentDetails = create('task-details');
      currentDetails.append(create('task-name', 'Mining iron ore'));
      currentDetails.append(create('task-node', 'Mossy Hollow'));
      current.append(img('Iron ore'));
      current.append(currentDetails);
      panel.append(current);
      const rows = create('uq-rows');
      const col = create('uq-col');
      for (let i = 0; i < 10; i++) {
        const slot = create('uq-row');
        slot.dataset.rowIndex = i;
        slot.dataset.lane = 'skill';
        slot.append(img('Queue task'));
        const details = create('task-details');
        details.append(create('task-name', 'Queued task ' + (i + 1)));
        details.append(create('task-node', 'Mossy Hollow'));
        slot.append(details);
        const reroll = create('uq-reroll', '↻');
        listen(reroll, 'click', () => state.taskControlClicks++);
        slot.append(reroll);
        col.append(slot);
      }
      rows.append(col);
      panel.append(rows);
      const controls = create('uq-controls');
      const stop = create('ctrl-btn', 'Stop', 'button');
      listen(stop, 'click', () => state.taskControlClicks++);
      controls.append(stop);
      controls.append(create('ctrl-btn', 'Reroll', 'button'));
      panel.append(controls);
    } else if (id === 'equipment') {
      panel.append(create('equip-panel-tabs', 'Melee · Ranged · Magic'));
      const doll = create('equip-panel-paperdoll');
      for (let i = 0; i < 9; i++) {
        const slot = create('inv-slot');
        slot.append(img('Equipment'));
        doll.append(slot);
      }
      panel.append(doll);
      panel.append(create('equip-panel-stats', 'Accuracy 20\nDefence 18\nMax hit 12'));
    } else if (id === 'quests') {
      for (let i = 0; i < 8; i++) {
        const slot = create('quest-slot quest-slot-active');
        slot.append(create('quest-slot-name', 'A longer quest name ' + (i + 1)));
        slot.append(create('quest-slot-progress', 'Collect 10 of 30 logs'));
        panel.append(slot);
      }
    } else {
      panel.append(create('diary-header', names[id]));
      for (let i = 0; i < 8; i++)
        panel.append(create('diary-row', 'A useful status row ' + (i + 1)));
    }
    ui.append(panel);
  });
  ui.append(panelBar);
  const hud = create('ingame-hud');
  hud.innerHTML =
    '<div class="ingame-hud-row ingame-hud-info"><span class="ingame-hud-name">Mobile Adventurer</span><span class="ingame-hud-state">Mining</span></div><div class="ingame-hud-row ingame-hud-online"><span class="ingame-hud-online-total">123 Online</span></div>';
  ui.append(hud);
  const task = create('floating-current-task');
  task.id = 'task-display';
  const taskInner = create('float-task-inner');
  taskInner.append(img('Iron ore'));
  const detail = create('float-details');
  detail.append(create('float-task-name', 'Mining iron ore'));
  detail.append(create('float-task-node', 'Mossy Hollow'));
  taskInner.append(detail);
  task.append(taskInner);
  ui.append(task);
  const chat = create('chat-panel');
  chat.id = 'chat-panel';
  chat.style.width = '580px';
  chat.style.height = '220px';
  const contentWrap = create('chat-content-wrap');
  chat.append(contentWrap);
  const messageArea = create('chat-message-area');
  for (let i = 0; i < 20; i++) {
    const message = create(
      'chat-message',
      '[World] Adventurer: A readable message on a phone ' + (i + 1),
    );
    message.style.color = 'var(--text-light)';
    messageArea.append(message);
  }
  contentWrap.append(messageArea);
  const inputRow = create('chat-input-row');
  inputRow.append(create('chat-channel-label', '[World]'));
  const wrap = create('chat-input-wrap');
  const input = create('chat-input', '', 'input');
  input.type = 'text';
  input.placeholder = 'Type a message...';
  wrap.append(input);
  inputRow.append(wrap);
  inputRow.append(create('chat-room-pill', 'EN'));
  contentWrap.append(inputRow);
  listen(input, 'keydown', (event) => {
    if (event.key === 'Enter' && input.value.trim()) {
      state.messages.push(input.value);
      input.value = '';
    }
  });
  const filters = create('chat-filter-bar');
  const fonts = create('chat-font-group');
  state.chatFontSize = 16;
  state.chatFontClicks = [];
  for (const [label, delta] of [
    ['A−', -2],
    ['A+', 2],
  ]) {
    const button = create('chat-font-btn', label);
    listen(button, 'click', () => {
      state.chatFontClicks.push(delta);
      state.chatFontSize = Math.max(10, Math.min(24, state.chatFontSize + delta));
      for (const element of [messageArea, input, inputRow.querySelector('.chat-channel-label')])
        element.style.fontSize = state.chatFontSize + 'px';
    });
    fonts.append(button);
  }
  filters.append(fonts);
  ['all', 'global', 'proximity', 'friends', 'clan', 'game'].forEach((id) => {
    const e = create('chat-filter-btn active');
    e.dataset.chatFilter = id;
    e.append(create('chat-filter-label', id));
    filters.append(e);
  });
  filters.append(create('chat-toggle-btn', '▼'));
  chat.append(filters);
  ui.append(chat);
  const navIds = [
    'bank',
    'skillcustom',
    'quests',
    'mobs',
    'pvp',
    'smith',
    'craft',
    'imbue',
    'brew',
    'alms',
    'unlocks',
    'collections',
    'diary',
    'delvetree',
    'fortifytree',
    'raid',
    'clan',
    'hiscores',
    'settings',
    'customize',
    'ledger',
  ];
  const navNames = {
    bank: 'Bank',
    skillcustom: 'Skills',
    quests: 'Quests',
    mobs: 'Combat',
    pvp: 'PvP',
    smith: 'Smith',
    craft: 'Craft',
    imbue: 'Imbue',
    brew: 'Brew',
    alms: 'Alms',
    unlocks: 'Unlocks',
    collections: 'Collections',
    diary: 'Diary',
    delvetree: 'Delve tree',
    fortifytree: 'Fortify tree',
    raid: 'Raids',
    clan: 'Clan',
    hiscores: 'Hiscores',
    settings: 'Settings',
    customize: 'Customize',
    ledger: 'Ledger',
  };
  const overlay = create('modal-overlay');
  overlay.style.display = 'none';
  const modal = create('modal-container');
  overlay.append(modal);
  const tabs = create('modal-tabs');
  modal.append(tabs);
  const main = create('modal-main');
  modal.append(main);
  const header = create('modal-header');
  header.append(create('header-left'));
  header.firstChild.append(create('header-icon', '✦'));
  const headerInfo = create('header-info-group');
  const headerName = create('header-name', 'Bank');
  headerInfo.append(headerName);
  header.firstChild.append(headerInfo);
  const close = create('modal-close', '×', 'button');
  listen(close, 'click', () => {
    state.closeClicks++;
    overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
  header.append(close);
  main.append(header);
  const body = create('modal-body');
  main.append(body);
  navIds.forEach((id) => {
    const tab = create('tab-btn');
    tab.dataset.tab = id;
    tab.append(img(navNames[id]));
    const tooltip = create('tab-tooltip', navNames[id], 'span');
    tooltip.dataset.name = navNames[id];
    tab.append(tooltip);
    tabs.append(tab);
    listen(tab, 'click', () => openModal(id));
    const content = create('tab-content' + (id === 'bank' ? ' active' : ''));
    content.id = 'tab-' + id;
    if (id === 'bank') {
      const layout = create('bank-layout');
      const side = create('bank-side');
      const toolbar = create('bank-toolbar');
      const search = create('bank-search', '', 'input');
      search.type = 'search';
      search.placeholder = 'Search bank';
      toolbar.append(search);
      toolbar.append(create('bank-sort-btn', 'Sort', 'button'));
      side.append(toolbar);
      const scroll = create('bank-grid-scroll');
      const grid = create('bank-grid');
      for (let i = 0; i < 70; i++) {
        const slot = create('inv-slot bank-slot');
        slot.append(img('Stored item'));
        slot.append(create('inv-count', String(i + 1)));
        grid.append(slot);
      }
      scroll.append(grid);
      side.append(scroll);
      layout.append(side);
      const equip = create('equip-side');
      equip.append(create('section-title', 'Equipment'));
      for (let i = 0; i < 9; i++) {
        const slot = create('inv-slot');
        slot.append(img('Equipment'));
        equip.append(slot);
      }
      layout.append(equip);
      content.append(layout);
    } else if (id === 'quests') {
      const layout = create('quest-layout');
      const list = create('quest-list-side');
      list.append(create('quest-list-toolbar', 'Quests'));
      const scroll = create('quest-list-scroll');
      for (let i = 0; i < 25; i++) {
        const row = create('quest-row');
        row.append(create('quest-row-name', 'Quest ' + i));
        scroll.append(row);
      }
      list.append(scroll);
      layout.append(list);
      const side = create('quest-detail-side');
      side.append(create('quest-detail-title', 'The traveller’s request'));
      for (let i = 0; i < 30; i++)
        side.append(
          create(
            'quest-detail-desc',
            'This is representative detail text that should remain readable and scrollable.',
          ),
        );
      layout.append(side);
      content.append(layout);
    } else {
      for (let i = 0; i < 35; i++) {
        const row = create('settings-row');
        row.append(create('settings-label', 'Option ' + (i + 1)));
        row.append(create('settings-value', 'Choose', 'button'));
        content.append(row);
      }
    }
    body.append(content);
  });
  ui.append(overlay);
  function openModal(id) {
    state.modalClicks[id] = (state.modalClicks[id] || 0) + 1;
    headerName.textContent = navNames[id];
    header.style.display = id === 'skillcustom' ? 'none' : '';
    const creatorControls = header.querySelector('.cc-header-controls');
    if (creatorControls) creatorControls.style.display = id === 'customize' ? 'flex' : 'none';
    const unlocksControls = header.querySelector('.unlocks-header-slot');
    if (unlocksControls) unlocksControls.style.display = id === 'unlocks' ? 'flex' : 'none';
    const ledgerControls = header.querySelector('.ledger-header-slot');
    if (ledgerControls) ledgerControls.style.display = id === 'ledger' ? 'flex' : 'none';
    const collections = header.querySelector('.collections-indicator');
    if (collections) collections.style.display = id === 'unlocks' || id === 'mobs' ? '' : 'none';
    body
      .querySelectorAll('.tab-content')
      .forEach((e) => e.classList.toggle('active', e.id === 'tab-' + id));
    tabs
      .querySelectorAll('.tab-btn')
      .forEach((e) => e.classList.toggle('active', e.dataset.tab === id));
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
  function buildNav() {
    const strip = create('floating-tab-strip');
    const toggle = create('floating-tab-toggle', '◀');
    strip.append(toggle);
    navIds.forEach((id) => {
      const tab = create('floating-tab-btn');
      tab.dataset.tab = id;
      tab.append(img(navNames[id]));
      const tooltip = create('floating-tab-tooltip', navNames[id], 'span');
      tooltip.dataset.name = navNames[id];
      tab.append(tooltip);
      const badge = create('floating-tab-hotkey');
      tab.append(badge);
      listen(tab, 'click', () => openModal(id));
      strip.append(tab);
    });
    return strip;
  }
  ui.append(buildNav());
  const login = create('login-screen');
  login.style.display = 'none';
  login.append(create('login-bg-canvas', '', 'canvas'));
  login.append(create('login-vignette'));
  const area = create('login-area');
  const hero = create('login-hero');
  const logo = img('Scapewatch');
  logo.className = 'login-logo';
  hero.append(logo);
  area.append(hero);
  const box = create('login-box');
  const form = create('login-form');
  form.id = 'login-form';
  const steam = create('login-btn login-btn-steam', 'Sign in with Steam', 'button');
  steam.id = 'login-btn-steam';
  listen(steam, 'click', () => state.loginClicks++);
  form.append(steam);
  const world = create('login-world-picker');
  world.append(create('login-world-label', 'Choose a world'));
  world.append(create('login-world-btn selected', 'Europe', 'button'));
  form.append(world);
  box.append(form);
  const signup = create('login-signup');
  signup.style.display = 'none';
  signup.append(create('login-signup-title', 'Choose your display name', 'h2'));
  signup.append(
    create('login-signup-blurb', 'Letters, numbers, and underscores. 3 to 24 characters.'),
  );
  const signupInput = create('login-signup-input', '', 'input');
  signupInput.id = 'login-signup-input';
  signup.append(signupInput);
  const submit = create('login-btn login-btn-steam login-btn-submit', 'Create account', 'button');
  signup.append(submit);
  box.append(signup);
  area.append(box);
  login.append(area);
  login.append(create('login-version-block', 'Client QA · Server QA'));
  login.append(create('screen-tip', 'This is an offline UI fixture.'));
  ui.append(login);
  const notes = create('patch-notes-panel');
  notes.style.display = 'none';
  const notesHeader = create('patch-notes-header');
  notesHeader.append(create('patch-notes-title', 'Patch Notes', 'h3'));
  const notesNav = create('patch-notes-nav');
  const prev = create('patch-notes-arrow patch-notes-prev', '‹', 'button');
  listen(prev, 'click', () => state.patchNotesClicks++);
  notesNav.append(prev);
  notesNav.append(create('patch-notes-arrow patch-notes-next', '›', 'button'));
  notesHeader.append(notesNav);
  notes.append(notesHeader);
  notes.append(create('patch-notes-body', 'Official release notes remain in their original DOM.'));
  ui.append(notes);
  window.fixtureLogin = function (value, signupMode = false) {
    document.body.classList.toggle('login-active', value);
    login.style.display = value ? 'flex' : 'none';
    signup.style.display = signupMode ? '' : 'none';
    form.style.display = signupMode ? 'none' : 'flex';
    notes.style.display = value ? '' : 'none';
  };
  window.fixtureRerenderNav = function () {
    ui.querySelector('.floating-tab-strip').replaceWith(buildNav());
  };
  window.fixtureOpenModal = openModal;
  window.fixtureRender = function () {
    const ratio = Math.min(innerWidth / 1920, innerHeight / 1080);
    ui.style.width = '1920px';
    ui.style.height = '1080px';
    ui.style.zoom = String(ratio);
    ui.style.transform = 'none';
    ui.style.transformOrigin = 'top left';
    visual.width = innerWidth;
    visual.height = innerHeight;
    visual.dispatchEvent(new Event('resize'));
  };
  window.fixtureRender();
  addEventListener('resize', window.fixtureRender);
  window.fixtureReady = true;
})();
