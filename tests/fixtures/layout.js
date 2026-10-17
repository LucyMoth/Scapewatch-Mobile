(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const state = window.fixtureState;
  const icon = document.querySelector('.panel-tab-btn img').src;
  Object.assign(state, {
    v4LoadoutFamilies: [],
    v4LoadoutChoices: [],
    v4CombatUtilities: [],
    v4LootChoices: [],
    v4FooterActions: [],
    v4RaidEnd: 0,
    hpNativeClicks: 0,
  });
  function node(cls, text, tag = 'div') {
    const el = document.createElement(tag);
    el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function image(cls, alt) {
    const el = node(cls, undefined, 'img');
    el.src = icon;
    el.alt = alt;
    return el;
  }
  function on(el, type, fn) {
    el.addEventListener(type, fn);
    state.listeners.push({ el, type, fn });
  }
  function table() {
    const t = node('stats-table', undefined, 'table');
    t.innerHTML =
      '<thead><tr><th>Type</th><th>Attack</th><th>Defence</th><th>Strength</th></tr></thead><tbody>' +
      ['Stab', 'Slash', 'Crush', 'Ranged', 'Magic']
        .map(
          (name) =>
            '<tr><td>' +
            name +
            '</td><td class="stat-pos">+12,345</td><td class="stat-pos">+9,876</td><td class="str-cell">+1,234</td></tr>',
        )
        .join('') +
      '</tbody>';
    return t;
  }
  function richStats(content, side) {
    const names = {
      player: 'Adventurer_With_Long_Name_24',
      mob: 'Corrupted Ancient Armoured Rage Slime T12',
    };
    content.querySelector('.panel-name').textContent = names[side];
    content.querySelector('.panel-level').textContent = 'Lvl. 120';
    const labels = [
      'ATTACK STYLE',
      'ATTACK SPEED',
      'MAXIMUM HIT',
      'ACCURACY',
      'CRITICAL CHANCE',
      'CRITICAL DAMAGE',
    ];
    const values = ['Precise Ranged', '1.05s', '12,345', '98.75%', '42.5%', '345.6%'];
    content.querySelectorAll('.derived-item').forEach((item, index) => {
      item.querySelector('.derived-label').textContent = labels[index];
      item.querySelector('.derived-value').textContent = values[index];
    });
    const skillNames = [
      'Life',
      'Spirit',
      'Melee Accuracy',
      'Melee Strength',
      'Ranged Accuracy',
      'Ranged Strength',
      'Magic Accuracy',
      'Magic Strength',
      'Damage Avoidance',
      'Damage Defence',
    ];
    content.querySelectorAll('.skill-row').forEach((row, index) => {
      row.querySelector('.skill-name').textContent = skillNames[index];
      row.querySelector('.skill-val').textContent = String(199 + index);
    });
    const equip = content.querySelector('.equip-stats-panel');
    equip.replaceChildren(
      node('stats-weapon-line', 'Weapon: Corrupted Ancient Longbow'),
      node('stats-style-line', 'Style: Precise Ranged · Speed: 1.05s · Max Hit: 12,345'),
      table(),
    );
    if (side === 'player')
      for (const [cls, label] of [
        ['potion-stats-toggle-wrap', 'Potion boosts'],
        ['spirit-stats-toggle-wrap', 'Spirit modifier'],
        ['gearcalc-launch-wrap', 'Extended combat calculator'],
      ]) {
        const control = node(cls);
        control.append(image(cls.replace('-wrap', ''), label));
        const tooltip = node('tooltip');
        tooltip.append(node('tt-name', label));
        control.append(tooltip);
        on(control, 'click', (event) => {
          event.stopPropagation();
          state.v4CombatUtilities.push(label);
        });
        equip.append(control);
      }
  }
  function enrichCombat() {
    for (const side of ['player', 'mob'])
      richStats(
        document.querySelector(
          (side === 'player' ? '#ce-player-panel' : '#ce-mob-panel') + ' [data-content="stats"]',
        ),
        side,
      );
    const equipment = document.querySelector('#ce-player-panel [data-content="equipment"]');
    equipment.querySelector(':scope > .panel-header')?.remove();
    const header = node('panel-header');
    header.append(
      node('panel-name', 'Adventurer_With_Long_Name_24'),
      node('panel-level', 'Lvl. 120'),
    );
    equipment.prepend(header);
    const menu = equipment.querySelector('.loadout-dropdown-menu');
    const selector = node('loadout-sel combat-loadout-sel');
    const families = node('loadout-sel-families');
    const slots = node('loadout-sel-slots');
    for (const name of ['Melee', 'Ranged', 'Magic']) {
      const b = node('loadout-sel-family', undefined, 'button');
      b.dataset.family = name.toLowerCase();
      b.append(image('loadout-sel-family-icon', name), document.createTextNode(name));
      on(b, 'click', (event) => {
        event.stopPropagation();
        state.v4LoadoutFamilies.push(name);
      });
      families.append(b);
    }
    for (let i = 0; i < 4; i++) {
      const b = node('loadout-sel-slot', undefined, 'button');
      b.dataset.loadout = 'ranged_' + i;
      b.append(
        image('loadout-sel-slot-icon', 'Loadout'),
        node('loadout-sel-slot-label', 'Long precision loadout ' + (i + 1), 'span'),
      );
      on(b, 'click', (event) => {
        event.stopPropagation();
        state.v4LoadoutChoices.push(i);
        menu.style.display = 'none';
      });
      slots.append(b);
    }
    selector.append(families, slots);
    menu.replaceChildren(selector);
    const bonuses = equipment.querySelector('.equip-stats-panel');
    bonuses.replaceChildren(
      node('stats-weapon-line', 'Weapon: Corrupted Ancient Longbow'),
      node('stats-style-line', 'Ranged precision loadout'),
      table(),
    );
    const loot = document.querySelector('#ce-mob-panel [data-content="loot"]');
    loot.replaceChildren(
      node('loot-tab-header', 'Loot from Corrupted Ancient Armoured Rage Slime'),
    );
    const tabs = node('loot-sub-tabs');
    const received = node('v4-loot-received');
    const drops = node('v4-loot-drops');
    drops.style.display = 'none';
    for (const [name, target] of [
      ['Received', received],
      ['Drop Table', drops],
    ]) {
      const b = node('loot-sub-tab', name, 'button');
      on(b, 'click', () => {
        state.lootClicks++;
        received.style.display = target === received ? '' : 'none';
        drops.style.display = target === drops ? '' : 'none';
      });
      tabs.append(b);
    }
    loot.append(tabs);
    for (const [target, offset] of [
      [received, 0],
      [drops, 100],
    ]) {
      const grid = node('loot-grid');
      for (let i = 0; i < 36; i++) {
        const slot = node('inv-slot');
        slot.dataset.itemId = String(offset + i);
        slot.append(image('', 'Loot ' + i), node('inv-count', String(12345 + i)));
        on(slot, 'click', () => state.v4LootChoices.push(offset + i));
        grid.append(slot);
      }
      target.append(grid);
    }
    loot.append(received, drops);
    const hud = document.querySelector('.combat-hud');
    hud.querySelector('.ce-kill-count').textContent = 'Kills: 12,345';
    const end = hud.querySelector('.btn-end-combat');
    end.style.display = '';
    end.textContent = 'End Combat';
    if (!end.dataset.v4Handled) {
      end.dataset.v4Handled = 'true';
      on(end, 'click', () => state.v4RaidEnd++);
    }
  }
  function bar(kind, left, middle, right) {
    const el = node('float-bar');
    const fill = node('float-bar-fill ' + kind + '-fill');
    fill.style.width = '58%';
    const text = node('float-bar-text');
    text.append(
      node('', left, 'span'),
      node('bar-center', middle, 'span'),
      node('', right, 'span'),
    );
    el.append(fill, text);
    return el;
  }
  window.fixtureActiveTask = function (mode = 'detailed') {
    const task = document.getElementById('task-display');
    task.replaceChildren();
    task.classList.toggle('combat-expanded', mode === 'detailed');
    const inner = node('float-task-inner');
    const art = node('float-icon');
    art.append(image('float-icon-img', 'Rage slime'));
    const details = node('float-details');
    details.append(
      node('float-task-name', 'Corrupted Ancient Armoured Rage Slime'),
      node('float-task-node', 'Battlefrost Quarry · Route 12,345'),
      bar('task', '12,345', '58%', '21,000'),
      bar('level', 'Lv 119', '58%', 'Lv 120'),
    );
    inner.append(art, details);
    task.append(inner);
    if (mode === 'detailed') {
      const info = node('float-combat-info');
      for (const [key, text] of [
        ['loadout', 'Loadout: Precise Ranged Longbow'],
        ['training', 'Training: Ranged Accuracy'],
      ]) {
        const control = node('float-combat-col', text, 'span');
        on(control, 'click', (event) => {
          event.stopPropagation();
          state.v4FooterActions.push(key);
        });
        info.append(control);
      }
      task.append(info);
      const toggles = node('float-combat-toggles');
      const auto = node('float-toggle-pill', 'Auto Loadout: ON', 'button');
      on(auto, 'click', (event) => {
        event.stopPropagation();
        state.v4FooterActions.push('auto');
      });
      toggles.append(auto);
      task.append(toggles);
    }
  };
  window.fixturePlayerHealth = function (height = 44) {
    let hp = document.querySelector('.hp-bar');
    if (!hp) {
      hp = node('hp-bar');
      const fill = node('hp-bar-fill');
      const content = node('hp-bar-content');
      content.append(image('hp-bar-icon', 'Life'), node('hp-bar-text', '123,456 / 234,567'));
      hp.append(fill, content);
      ui.append(hp);
      on(hp, 'click', () => {
        state.hpNativeClicks++;
        document.getElementById('toggle-tasks').click();
      });
    }
    hp.style.setProperty('height', height + 'px', 'important');
    return hp;
  };
  window.fixtureWorldScene = function ({
    combat = true,
    footer = 'detailed',
    hud = true,
    potions = 'collapsed',
    raid = true,
  } = {}) {
    if (hud) window.fixtureHudDetailed(true);
    window.fixtureActiveTask(footer);
    window.fixturePlayerHealth();
    window.fixtureCombat(combat, false);
    if (combat) {
      enrichCombat();
      document.querySelector('.btn-end-combat').style.display = raid ? '' : 'none';
    }
    const panel = document.querySelector('.active-potions-panel');
    const pill = document.querySelector('.active-potions-pill');
    if (panel && pill) {
      panel.style.display = potions === 'expanded' ? '' : 'none';
      pill.style.display = potions === 'expanded' ? 'none' : '';
    }
    const recenter = document.querySelector('.recenter-camera-btn');
    if (recenter) {
      recenter.style.cssText = 'left:50%;bottom:80px;top:99px;transform:translateX(-50%);';
      recenter.classList.toggle('combat-active', combat);
      recenter.classList.toggle('roam', !combat);
    }
  };
  window.fixtureResizeHud = function (tick) {
    window.fixtureActiveTask(tick % 2 ? 'detailed' : 'compact');
    window.fixturePlayerHealth(tick % 3 ? 44 : 56);
    const hud = document.querySelector('.ingame-hud');
    const info = hud?.querySelector('.ingame-hud-info');
    const online = hud?.querySelector('.ingame-hud-online');
    if (info && online) {
      info.classList.toggle('expanded', tick % 2 === 0);
      online.style.display = tick % 2 === 0 ? '' : 'none';
      hud.querySelector('.ingame-hud-state').textContent =
        tick % 3
          ? 'Gathering at Battlefrost Quarry'
          : 'Moving to the remote Battlefrost quarry entrance';
    }
    const panel = document.querySelector('.active-potions-panel');
    const pill = document.querySelector('.active-potions-pill');
    if (panel && pill) {
      panel.style.display = tick % 2 ? '' : 'none';
      pill.style.display = tick % 2 ? 'none' : '';
      panel.style.top = 120 + tick * 3 + 'px';
      panel.style.right = tick * 5 + 'px';
    }
    const recenter = document.querySelector('.recenter-camera-btn');
    if (recenter) {
      recenter.style.top = 90 + tick * 2 + 'px';
      recenter.style.left = 180 + tick + 'px';
      recenter.style.transform = 'translateX(-50%)';
    }
  };
  window.fixtureCommunityChat = function () {
    const area = document.querySelector('.chat-message-area');
    area.replaceChildren();
    const messages = [
      { sender: 'OldPlayer', text: 'Oldest message', staff: true },
      { sender: 'Alice', text: 'Hello world', staff: true },
      { sender: 'Bob', text: 'A short chat message', staff: false },
      { sender: 'César', text: '¡Buenas noches!', channel: 'proximity', staff: true },
      { sender: 'Daria', text: 'Friend message', channel: 'friends', staff: false },
      { sender: 'Eryn', text: 'Clan message', channel: 'clan', staff: true },
      { sender: 'Frida', text: '<img src=x onerror=alert(1)>', staff: true },
      { sender: 'SystemEvent', text: 'Game event not copied', channel: 'game', staff: true },
      { sender: 'MutedUser', text: 'Hidden message not copied', staff: true, hidden: true },
      { text: 'Server notice without a sender', staff: false },
    ];
    for (const message of messages) {
      const row = window.fixtureChatRow(message);
      const badge = row.querySelector('.chat-badge-slot');
      if (badge.firstChild) {
        const wrap = node('chat-staff-crown-wrap');
        const original = badge.firstChild;
        wrap.append(original);
        const tip = node('tooltip');
        tip.append(node('tt-name', 'Official existing badge'));
        wrap.append(tip);
        badge.append(wrap);
      }
      if (message.hidden) row.style.display = 'none';
      area.append(row);
    }
    window.fixtureOriginalChatBadges = Array.from(area.querySelectorAll('.chat-badge-slot img'));
  };
  window.fixtureLayoutReady = true;
})();
