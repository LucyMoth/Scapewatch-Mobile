(() => {
  const ui = document.getElementById('ui-container');
  const icon = document.querySelector('.panel-tab-btn img').src;
  const state = { periods: [], toggles: [], searches: [], filters: [], actions: [], continued: 0 };
  window.fixtureNativeLedger = state;
  const create = (className, text, tag = 'div') => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function fitScroll(host) {
    for (const node of host.querySelectorAll('.ledger-sec-body')) {
      node.style.overflowY = 'auto';
      node.style.overflowY = node.scrollHeight - node.clientHeight > 6 ? 'auto' : 'hidden';
    }
  }

  function toggle(label, name, change, checked = false) {
    const node = create('ledger-toggle');
    node.append(
      create('bank-filter-btn-check' + (checked ? ' checked' : '')),
      create('', label, 'span'),
    );
    node.addEventListener('click', () => {
      const checked = node.firstChild.classList.toggle('checked');
      state.toggles.push(name);
      change?.(checked);
    });
    return node;
  }

  function section(name, kind, render, allToggle = false) {
    const node = create('ledger-sec ' + kind);
    const head = create('ledger-sec-h');
    const right = create('ledger-sec-right', undefined, 'span');
    const count = create(
      'ledger-cnt',
      name === 'Skills' ? '1/30 moved' : name === 'Loot' ? '2/2 shown' : '',
      'span',
    );
    const body = create('ledger-sec-body');
    const fill = (all = false) => {
      body.replaceChildren();
      const content = render(all);
      if (typeof content === 'string') body.innerHTML = content;
      else body.append(content);
      fitScroll(node);
    };
    if (allToggle) right.append(toggle('Show unchanged', name, fill));
    right.append(count);
    head.append(create('ledger-lbl', name, 'span'), right);
    node.append(head, body);
    fill();
    return node;
  }

  function loot(withControls, long = false) {
    const node = section('Loot', withControls ? 'ledger-loot' : 'ledger-sec-loot', () => {
      const groups = create('ledger-groups');
      for (const [title, count] of long
        ? [
            ['New Unlocks', 6],
            ['New Collections', 5],
            ['Items', 28],
            ['Spent', 8],
          ]
        : [
            ['Items', 1],
            ['Spent', 1],
          ])
        groups.append(window.fixtureLedgerLootGroup(title, count, title === 'Spent'));
      return groups;
    });
    if (!withControls) return node;
    const toolbar = create('bank-toolbar ledger-loot-bar');
    const search = create('bank-search', undefined, 'input');
    search.placeholder = 'Search loot...';
    search.addEventListener('input', () => state.searches.push(search.value));
    const all = create('bank-filter-btn active', 'All', 'button');
    all.addEventListener('click', () => state.filters.push('all'));
    const filters = create('bank-filter-menu-btn', undefined, 'button');
    filters.append(
      create('bank-filter-btn-check checked', undefined, 'span'),
      create('bank-filter-btn-label', 'Filters', 'span'),
    );
    filters.addEventListener('click', () => state.filters.push('filters'));
    toolbar.append(search, all, filters);
    node.insertBefore(toolbar, node.lastChild);
    return node;
  }

  window.fixtureNativeLedgerOpen = function ({ long = false } = {}) {
    window.fixtureOpenModal('ledger');
    const host = document.getElementById('tab-ledger');
    const header = document.querySelector('.modal-main > .modal-header');
    host.replaceChildren();
    document.querySelector('.header-name').textContent = 'Ledger';
    const previous = header.querySelector('.ledger-header-slot');
    previous?.remove();
    const slot = create('ledger-header-slot');
    slot.style.display = 'flex';
    header.insertBefore(slot, header.querySelector('.modal-close'));
    const top = create('ledger-top');
    const leftTop = create('ledger-top-left');
    leftTop.append(
      create('ledger-title', 'Welcome back, Adventurer'),
      create('ledger-sub', 'Away for 14m · Since 11:10 PM'),
    );
    const tabs = create('ledger-tabs');
    const opens = create('ledger-opens');
    opens.append(
      toggle('Open on login', 'login', undefined, true),
      toggle('Open after sleep', 'sleep', undefined, true),
    );
    tabs.append(opens);
    for (const [id, name] of [
      ['last', 'Since last active'],
      ['day', 'Today'],
      ['week', 'This week'],
      ['life', 'Lifetime'],
    ]) {
      const tab = create('ledger-tab' + (id === 'last' ? ' active' : ''), name);
      tab.dataset.period = id;
      tab.addEventListener('click', () => {
        state.periods.push(id);
        tabs
          .querySelectorAll('.ledger-tab')
          .forEach((node) => node.classList.toggle('active', node === tab));
        fitScroll(host);
      });
      tabs.append(tab);
    }
    top.append(leftTop, tabs);
    slot.append(top);
    state.top = top;
    state.parent = slot;
    const wrap = create('ledger');
    const body = create('ledger-body');
    const left = create('ledger-col ledger-col-left');
    const mid = create('ledger-col ledger-col-mid');
    const right = create('ledger-col ledger-col-right');
    const hero = create('ledger-sec ledger-hero');
    const heroBody = create('ledger-sec-body');
    const portrait = create('ledger-portrait');
    portrait.append(create('ledger-portrait-canvas', undefined, 'canvas'));
    const badges = create('ledger-badges');
    for (const value of ['326', '236,421']) {
      const badge = create('ledger-badge');
      badge.innerHTML = `<img src="${icon}" alt=""><span class="ledger-tn">${value}</span>`;
      badges.append(badge);
    }
    heroBody.append(portrait, create('ledger-name', 'Adventurer'), badges);
    hero.append(heroBody);
    left.append(hero, section('Milestones', 'ledger-miles', window.fixtureLedgerMilestones, true));
    mid.append(section('Skills', 'ledger-skills', window.fixtureLedgerTable, true));
    right.append(loot(true, long));
    body.append(left, mid, right);
    wrap.append(body);
    host.append(wrap);
    fitScroll(host);
  };

  window.fixtureNativeReceipt = function () {
    const overlay = create('ledger-return-overlay');
    const card = create('ledger-card');
    const head = create('ledger-card-head');
    const id = create('ledger-card-id');
    const portrait = create('ledger-card-portrait');
    portrait.append(create('ledger-portrait-canvas', undefined, 'canvas'));
    const titles = create('ledger-card-titles');
    titles.append(
      create('ledger-card-title', 'Welcome back,'),
      create('ledger-card-name', 'Adventurer'),
      create('ledger-card-sub', 'Away for 14m · Since 11:10 PM'),
    );
    id.append(portrait, titles);
    const badges = create('ledger-card-badges');
    for (const value of ['326', '236,421']) {
      const badge = create('ledger-badge');
      badge.innerHTML = `<img src="${icon}" alt=""><span class="ledger-tn">${value}</span>`;
      badges.append(badge);
    }
    head.append(id, badges);
    const compact = create('ledger-compact');
    const left = create('ledger-compact-left');
    const right = create('ledger-compact-right');
    left.append(
      head,
      section('Milestones', 'ledger-sec-miles', window.fixtureLedgerMilestones, true),
    );
    right.append(
      section('Skills', 'ledger-sec-skills', window.fixtureLedgerTable, true),
      loot(false),
    );
    compact.append(left, right);
    const foot = create('ledger-card-foot');
    const open = create('ledger-btn', 'Open Ledger', 'button');
    const cont = create('ledger-btn ledger-btn-primary', 'Continue', 'button');
    open.addEventListener('click', () => {
      overlay.remove();
      window.fixtureNativeLedgerOpen();
    });
    cont.addEventListener('click', () => {
      state.continued++;
      overlay.remove();
    });
    foot.append(open, cont);
    card.append(compact, foot);
    overlay.append(card);
    ui.append(overlay);
    fitScroll(card);
  };
})();
