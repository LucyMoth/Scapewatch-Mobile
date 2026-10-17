(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const state = window.fixtureState;
  const icon = document.querySelector('.panel-tab-btn img').src;
  Object.assign(state, {
    combatTabClicks: [],
    xpToggleClicks: 0,
    equipmentClicks: 0,
    loadoutClicks: 0,
    lootClicks: 0,
    popoutChoices: [],
    rerollClicks: 0,
    filterClicks: [],
  });
  function node(cls, text, tag = 'div') {
    const el = document.createElement(tag);
    el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function img(cls, alt) {
    const el = node(cls, undefined, 'img');
    el.src = icon;
    el.alt = alt;
    return el;
  }
  function on(el, event, fn) {
    el.addEventListener(event, fn);
    state.listeners.push({ el, type: event, fn });
  }
  const encounter = node('combat-encounter');
  encounter.style.display = 'none';
  const combat = { player: { hidden: false, tab: 'stats' }, mob: { hidden: false, tab: 'stats' } };
  function stats(name, self) {
    const content = node('panel-content active');
    content.dataset.content = 'stats';
    const header = node('panel-header');
    header.append(node('panel-name', name), node('panel-level', 'Lvl. 12'));
    content.append(header);
    const grid = node('derived-grid');
    [
      ['Atk Style', 'Melee_1'],
      ['Atk Speed', '1.9s'],
      ['Max Hit', '10'],
      ['Accuracy', '65%'],
      ['Crit Chance', '5.5%'],
      ['Crit Damage', '120.5%'],
    ].forEach(([label, value]) => {
      const cell = node('derived-item');
      cell.append(node('derived-label', label), node('derived-value', value));
      grid.append(cell);
    });
    content.append(grid, node('section-header', 'Combat Skills'));
    const skills = node('skill-grid');
    [
      'Life',
      'Spirit',
      'Strike',
      'Heft',
      'Sight',
      'Draw',
      'Focus',
      'Surge',
      'Dodge',
      'Defend',
    ].forEach((name, i) => {
      const row = node('skill-row' + (self && [2, 3].includes(i) ? ' selectable' : ''));
      row.dataset.skill = name.toLowerCase();
      row.append(
        img('skill-icon', name),
        node('skill-name', name),
        node('skill-val', String(12 + i)),
      );
      on(row, 'click', () => {
        if (row.classList.contains('selectable')) state.xpToggleClicks++;
      });
      skills.append(row);
    });
    content.append(skills);
    const equip = node('equip-stats-panel');
    equip.append(
      node('stats-weapon-line', 'Weapon: Iron dagger'),
      node('stats-style-line', 'Style: Melee 1 · Speed: 1.9s · Max Hit: 10'),
    );
    const table = node('stats-table', undefined, 'table');
    table.innerHTML =
      '<thead><tr><th>Type</th><th>Attack</th><th>Defence</th><th>Strength</th></tr></thead><tbody>' +
      ['Stab', 'Slash', 'Crush', 'Range', 'Magic']
        .map((n) => '<tr><td>' + n + '</td><td>12</td><td>8</td><td>3</td></tr>')
        .join('') +
      '</tbody>';
    equip.append(table);
    content.append(equip);
    return content;
  }
  for (const [side, name, second, glyph] of [
    ['player', 'Adventurer', 'equipment', '⚔️'],
    ['mob', 'Feeble Rage Slime', 'loot', '💰'],
  ]) {
    const wrapper = node('panel-wrapper ' + (side === 'player' ? 'player-side' : 'mob-side'));
    const tabs = node(
      'panel-tab-bar ' + (side === 'player' ? 'player-tabs' : 'mob-tabs') + ' visible',
    );
    tabs.dataset.panel = side;
    [
      ['stats', '📊'],
      [second, glyph],
    ].forEach(([key, glyph]) => {
      const tab = node('panel-tab' + (key === 'stats' ? ' active' : ''), glyph);
      tab.dataset.panel = side;
      tab.dataset.tab = key;
      tab.style.touchAction = 'manipulation';
      tabs.append(tab);
    });
    wrapper.append(tabs);
    const panel = node('combat-panel');
    panel.id = side === 'player' ? 'ce-player-panel' : 'ce-mob-panel';
    panel.append(stats(name, side === 'player'));
    const content = node('panel-content');
    content.dataset.content = second;
    if (side === 'player') {
      const dropdown = node('loadout-dropdown');
      const trigger = node('loadout-dropdown-trigger', 'Melee 1 ▾');
      dropdown.append(trigger);
      const menu = node('loadout-dropdown-menu');
      menu.style.display = 'none';
      ['Melee 1', 'Melee 2', 'Ranged', 'Magic'].forEach((name) => {
        const option = node('loadout-dropdown-option', name);
        on(option, 'click', () => state.loadoutClicks++);
        menu.append(option);
      });
      dropdown.append(menu);
      on(trigger, 'click', () => {
        dropdown.classList.toggle('open');
        menu.style.display = dropdown.classList.contains('open') ? 'block' : 'none';
      });
      content.append(dropdown);
      const doll = node('paperdoll');
      for (let i = 0; i < 9; i++) {
        const slot = node('inv-slot');
        slot.append(img('', 'Equipment ' + i));
        on(slot, 'click', () => state.equipmentClicks++);
        doll.append(slot);
      }
      content.append(
        doll,
        node('equip-stats-panel', 'Equipment bonuses: Attack 12 · Defence 8 · Strength 3'),
      );
    } else {
      content.append(node('loot-tab-header', 'Loot'));
      const sub = node('loot-sub-tabs');
      ['Received', 'Possible', 'Session'].forEach((label) => {
        const tab = node('loot-sub-tab', label);
        on(tab, 'click', () => state.lootClicks++);
        sub.append(tab);
      });
      content.append(sub);
      const grid = node('loot-grid');
      for (let i = 0; i < 24; i++) {
        const slot = node('inv-slot');
        slot.append(img('', 'Loot ' + i), node('inv-count', String(i + 1)));
        grid.append(slot);
      }
      content.append(grid);
    }
    panel.append(content);
    wrapper.append(panel);
    encounter.append(wrapper);
    on(wrapper, 'click', (event) => {
      const tab = event.target.closest('.panel-tab');
      if (!tab) return;
      state.combatTabClicks.push([side, tab.dataset.tab]);
      if (combat[side].hidden) {
        combat[side].hidden = false;
        combat[side].tab = tab.dataset.tab;
      } else if (tab.classList.contains('active')) combat[side].hidden = true;
      else combat[side].tab = tab.dataset.tab;
      syncCombat();
    });
  }
  const hud = node('combat-hud');
  hud.append(node('ce-kill-count', 'Kills: 0'));
  const end = node('btn-end-combat', 'End Combat', 'button');
  end.style.display = 'none';
  hud.append(end);
  encounter.append(hud);
  ui.append(encounter);
  function syncCombat() {
    for (const side of ['player', 'mob']) {
      const wrapper = encounter.querySelector(
        '.' + (side === 'player' ? 'player-side' : 'mob-side'),
      );
      wrapper.querySelector('.combat-panel').classList.toggle('panel-hidden', combat[side].hidden);
      wrapper.querySelector('.panel-tab-bar').classList.toggle('visible', !combat[side].hidden);
      wrapper
        .querySelectorAll('.panel-tab')
        .forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === combat[side].tab));
      wrapper
        .querySelectorAll('.panel-content')
        .forEach((content) =>
          content.classList.toggle('active', content.dataset.content === combat[side].tab),
        );
    }
  }
  window.fixtureCombat = function (show = true, hidden = false) {
    encounter.style.display = show ? '' : 'none';
    for (const side of ['player', 'mob']) {
      combat[side].hidden = hidden;
      combat[side].tab = 'stats';
    }
    syncCombat();
  };
  window.fixtureCombatReplaceStats = function () {
    const old = encounter.querySelector('.player-side [data-content=stats]');
    old.replaceWith(stats('Adventurer', true));
    syncCombat();
  };
  // Original TouchHelpers.tapToggleClass capture semantics (touch only).
  function tapToggle(container) {
    document.addEventListener(
      'click',
      (event) => {
        const inside = container.contains(event.target);
        if (container.classList.contains('tap-open')) {
          if (!inside) {
            container
              .querySelectorAll('.tap-preview')
              .forEach((el) => el.classList.remove('tap-preview'));
            container.classList.remove('tap-open');
            return;
          }
          const child = event.target.closest('.icon-option, .reroll-option');
          if (child) {
            if (child.classList.contains('tap-preview')) {
              child.classList.remove('tap-preview');
              return;
            }
            container
              .querySelectorAll('.tap-preview')
              .forEach((el) => el.classList.remove('tap-preview'));
            child.classList.add('tap-preview');
            event.stopPropagation();
            event.preventDefault();
          }
        } else if (inside) {
          container.classList.add('tap-open');
          event.stopPropagation();
          event.preventDefault();
        }
      },
      true,
    );
  }
  document.querySelectorAll('#unified-queue-panel .uq-row').forEach((row) => {
    const old = row.querySelector(':scope > img');
    old?.remove();
    row.querySelector(':scope > .uq-reroll')?.remove();
    const container = node('icon-container uq-icon-container');
    const wrapper = node('icons-wrapper');
    const lane = node('uq-lane');
    wrapper.append(lane);
    const first = row.dataset.rowIndex ?? 'current';
    for (let choice = 0; choice < 8; choice++) {
      const option = node('icon-option' + (choice === 0 ? ' selected' : ''));
      option.dataset.choice = first + ':' + choice;
      option.append(img('', 'Task ' + choice), node('icon-qty', String(64 + choice)));
      const tip = node('icon-tooltip');
      tip.append(
        node('tt-name', '[T1] Kill ' + (64 + choice) + ' Feeble Rage Slimes'),
        node(
          'tt-line uq-tt-wrap',
          'Reroll and choose a task option. This text should wrap without hiding the original buttons.',
        ),
      );
      option.append(tip);
      on(option, 'click', (event) => {
        event.stopPropagation();
        state.popoutChoices.push(option.dataset.choice);
        wrapper
          .querySelectorAll('.icon-option')
          .forEach((el) => el.classList.toggle('selected', el === option));
      });
      wrapper.append(option);
    }
    for (const kind of ['skill', 'slay']) {
      const reroll = node('reroll-option uq-reroll');
      reroll.dataset.lane = kind;
      reroll.append(img('', 'Reroll ' + kind), node('uq-reroll-glyph', '↻'));
      const tip = node('icon-tooltip');
      tip.append(
        node('tt-name', 'Reroll ' + kind + ' (5 credits)'),
        node('tt-line', '68 available'),
      );
      reroll.append(tip);
      on(reroll, 'click', (event) => {
        event.stopPropagation();
        state.rerollClicks++;
      });
      wrapper.append(reroll);
    }
    container.append(wrapper);
    row.prepend(container);
    tapToggle(container);
  });
  const filters = document.querySelector('.chat-filter-bar');
  const filterLabels = ['All', 'EN · W2', 'Proximity', 'Friends', 'Clan', 'Game'];
  const filterColors = ['#ffffff', '#ffffff', '#ffff00', '#00ff00', '#d99bea', '#8fc7f0'];
  filters.querySelectorAll('.chat-filter-btn').forEach((el, index) => {
    el.style.color = filterColors[index];
    el.querySelector('.chat-filter-label').textContent = filterLabels[index];
    on(el, 'click', () => state.filterClicks.push(el.dataset.chatFilter));
  });
  document.querySelector('.chat-channel-label').style.color = '#ffffff';
  // The original quest navigation strip can be hidden by the game's group mode.
  window.fixtureQuestCompact = function () {
    window.fixtureOpenModal('quests');
    document.querySelector('.modal-tabs').style.display = 'none';
  };
  window.fixtureQuestFull = function () {
    window.fixtureOpenModal('quests');
    document.querySelector('.modal-tabs').style.display = '';
  };
  Object.assign(state, {
    skillWeightClicks: [],
    activityControlClicks: [],
    nodeControlClicks: [],
    skillNavClicks: [],
  });
  window.fixtureSkillCustom = function (view = 'individual') {
    window.fixtureOpenModal('skillcustom');
    const host = document.getElementById('tab-skillcustom');
    host.replaceChildren();
    const custom = node('skill-custom-tab');
    const close = node('modal-close', '×', 'button');
    on(close, 'click', () => {
      document.querySelector('.modal-overlay').style.display = 'none';
      document.body.classList.remove('modal-open');
    });
    custom.append(close);
    const nav = node('skill-custom-navbar');
    nav.style.display = view === 'total' ? 'none' : '';
    for (let i = 0; i < 20; i++) {
      const tab = node('skill-custom-nav-icon');
      tab.append(img('', 'Skill ' + i));
      on(tab, 'click', () => state.skillNavClicks.push(i));
      nav.append(tab);
    }
    custom.append(nav);
    const header = node('modal-header');
    const left = node('header-left');
    left.append(img('header-icon', 'Mining'));
    const info = node('header-info');
    info.append(
      node('header-name', view === 'individual' ? 'Mining' : 'Total Level'),
      node('header-stats', 'Level 12 · 325/1,000 XP'),
    );
    left.append(info);
    const credits = node('header-mid-left');
    credits.append(
      node('cred-display', 'Credits: 68'),
      node('tasks-completed-text', 'Tasks completed: 14'),
    );
    const right = node('header-right');
    right.append(node('skill-weight-label', 'Configure task weights'));
    header.append(left, credits, right);
    custom.append(header);
    const main = node('main-layout');
    const history = node('history-sidebar');
    history.append(node('history-title', 'Mining History'));
    const hs = node('history-scroll');
    for (let i = 0; i < 30; i++) hs.append(node('history-row', '#' + i + ' · Completed a task'));
    history.append(hs);
    main.append(history);
    const columns = node('columns-container');
    main.append(columns);
    custom.append(main);
    host.append(custom);
    if (view === 'individual') {
      for (const kind of ['activities', 'nodes']) {
        const column = node('column');
        column.id = kind + '-column';
        column.append(node('column-header', kind === 'activities' ? 'Activities' : 'Locations'));
        const scroll = node('column-scroll');
        for (let i = 0; i < 12; i++) {
          const row = node(kind === 'activities' ? 'activity-row' : 'node-row');
          if (kind === 'activities') {
            const info = node('activity-info');
            info.append(
              node('activity-level', 'Lv ' + i),
              img('activity-item-icon', 'Ore'),
              node('activity-name', 'Mining a very long original activity name ' + i),
              node('activity-chance', '25%'),
              node('activity-qty-range', '1–100'),
            );
            row.append(info);
          } else {
            const info = node('node-info');
            const name = node('node-name-wrap');
            name.append(node('node-name', 'Longha mountain mining location ' + i));
            info.append(
              name,
              node('node-bank', 'Kindleholm Inn'),
              node('node-dist', '245m'),
              node('node-chance', '15%'),
            );
            row.append(info);
          }
          const controls = node('row-controls');
          for (let group = 0; group < 2; group++) {
            const cg = node('control-group');
            for (const dir of ['-1', '1']) {
              const button = node('ctrl-btn', dir === '1' ? '+' : '−');
              button.dataset.dir = dir;
              button.dataset.tipAction = group ? 'Quantity' : 'Weight';
              on(button, 'click', () =>
                state[kind === 'activities' ? 'activityControlClicks' : 'nodeControlClicks'].push([
                  i,
                  group,
                  dir,
                ]),
              );
              cg.append(button);
            }
            controls.append(cg);
          }
          row.append(controls);
          scroll.append(row);
        }
        column.append(scroll);
        columns.append(column);
      }
    } else {
      const total = node('total-content');
      const section = node('skill-columns-section');
      section.append(node('skill-columns-title', 'Skill Weighting'));
      const grid = node('skill-columns-grid');
      for (let col = 0; col < 3; col++) {
        const column = node('skill-col');
        const header = node('skill-col-header');
        header.append(
          node('sch-lv', 'Level'),
          node('sch-skill', 'Skill'),
          node('sch-pct', '%'),
          node('sch-weight', 'Weight'),
        );
        column.append(header);
        const body = node('skill-col-body');
        for (let i = 0; i < 9; i++) {
          const row = node('skill-weight-row clickable');
          row.append(node('swr-level', String(i + 10)));
          const skill = node('swr-skill');
          skill.append(
            img('swr-skill-icon', 'Skill'),
            node('swr-skill-name', 'Skill ' + col + '-' + i),
          );
          row.append(skill, node('swr-pct', '5%'));
          const weight = node('swr-weight');
          weight.append(node('control-emoji', '⚖️'));
          for (const dir of ['-1', '1']) {
            const button = node('ctrl-btn', dir === '1' ? '+' : '−');
            button.dataset.skill = 'skill-' + col + '-' + i;
            button.dataset.dir = dir;
            on(button, 'click', () => state.skillWeightClicks.push([button.dataset.skill, dir]));
            weight.append(button);
          }
          row.append(weight);
          body.append(row);
        }
        column.append(body);
        grid.append(column);
      }
      section.append(grid);
      total.append(section);
      const unlocks = node('unlocks-grid-section');
      unlocks.append(node('unlocks-grid-title', 'Unlocks & Rewards'));
      const rewards = node('unlocks-grid');
      for (let i = 0; i < 25; i++) {
        const cell = node('unlock-item');
        cell.append(img('', 'Reward ' + i));
        rewards.append(cell);
      }
      unlocks.append(rewards);
      total.append(unlocks);
      columns.append(total);
    }
  };
  window.fixtureCombatReady = true;
})();
