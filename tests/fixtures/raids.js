(function () {
  'use strict';
  const state = window.fixtureState;
  const icon = document.querySelector('.panel-tab-btn img').src;
  state.raidActions = [];

  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function image(cls, alt) {
    const element = node(cls, undefined, 'img');
    element.src = icon;
    element.alt = alt;
    return element;
  }
  function action(cls, label, key, callback) {
    const element = node(cls, label);
    const handler = () => {
      if (element.classList.contains('disabled') || element.classList.contains('readonly')) return;
      state.raidActions.push(key);
      callback?.(element);
    };
    element.addEventListener('click', handler);
    state.listeners.push({ el: element, type: 'click', fn: handler });
    return element;
  }
  function loadout() {
    const selector = node('loadout-sel raid-loadout-sel');
    const families = node('loadout-sel-families');
    const slots = node('loadout-sel-slots');
    for (const name of ['Melee', 'Ranged', 'Magic']) {
      const button = action('loadout-sel-family', name, 'loadout:' + name);
      button.prepend(image('loadout-sel-family-icon', ''));
      families.append(button);
    }
    for (let index = 0; index < 6; index++) {
      const button = action('loadout-sel-slot', undefined, 'loadout-slot:' + index);
      button.append(image('loadout-sel-slot-icon', 'Loadout ' + index));
      slots.append(button);
    }
    selector.append(families, slots);
    return selector;
  }
  function lobbyRow(kind, index) {
    const row = node('raid-browse-row' + (index === 0 ? ' mine' : ''));
    const host = node('raid-browse-host has-name');
    host.append(
      node('raid-browse-lobbyname', 'A friendly party with a longer lobby name'),
      node('raid-browse-hostsub', 'hosted by Adventurer_With_A_Long_Name'),
    );
    const difficulty = node(
      'raid-browse-diff tier-ancient',
      kind === 'Dungeon' ? '[T5] Ancient' : '[G] Fortress',
    );
    difficulty.append(node('raid-browse-minlvl', 'Min Lv 90'));
    if (kind === 'Fortress') difficulty.append(node('raid-browse-minmode', 'unique roles'));
    const count = node('raid-browse-count', '3/5');
    count.append(node('raid-browse-friends', 'Friends'));
    const actions = node('raid-browse-actions');
    if (index === 0) {
      actions.append(
        action('raid-browse-join raid-browse-continue', 'Continue', 'continue', () =>
          window.fixtureRaids('lobby'),
        ),
        action('raid-browse-join raid-browse-leave', 'Leave', 'leave'),
      );
    } else {
      actions.append(
        action('raid-browse-join raid-browse-peek', 'Peek', 'peek', () =>
          window.fixtureRaids('peek'),
        ),
        action('raid-browse-join' + (index === 2 ? ' disabled' : ''), 'Join', 'join'),
      );
    }
    row.append(
      image('raid-browse-icon', ''),
      host,
      difficulty,
      count,
      node('raid-browse-status in-lobby', 'In Lobby'),
      actions,
    );
    return row;
  }
  function browser(content) {
    const section = node('raid-browse-section');
    const columns = node('raid-browse-columns');
    for (const kind of ['Dungeon', 'Fortress']) {
      const column = node(
        'raid-browse-col raid-browse-col-' + (kind === 'Dungeon' ? 'dungeon' : 'skilling'),
      );
      const header = node('raid-browse-col-header');
      const readout = node('raid-colhdr-side raid-colhdr-readout');
      readout.append(
        node('raid-colhdr-avg', kind === 'Dungeon' ? 'Avg Lv 99' : 'Best Role Lv 99'),
        node('raid-colhdr-skill-grid', '99 · 99'),
      );
      const title = node(
        'raid-colhdr-title',
        kind + ' Raids (' + (kind === 'Dungeon' ? 'Combat' : 'Skilling') + ')',
      );
      title.prepend(image('raid-col-header-icon', ''));
      const selector = node(
        'raid-colhdr-side' + (kind === 'Dungeon' ? ' raid-colhdr-loadout' : ''),
      );
      if (kind === 'Dungeon') selector.append(loadout());
      header.append(readout, title, selector);
      const sorting = node('raid-browse-sortrow');
      sorting.append(node('raid-browse-sortlabel', 'Sort:'));
      for (const label of kind === 'Dungeon'
        ? ['Min Lv', 'Difficulty', 'Party']
        : ['Min Lv', 'Party']) {
        sorting.append(
          action('raid-browse-sortbtn', label, 'sort:' + label, (button) =>
            button.classList.toggle('active'),
          ),
        );
      }
      sorting.append(
        action('clan-action-btn raid-browse-create', 'Create Lobby', 'create:' + kind, () =>
          window.fixtureRaids(kind === 'Dungeon' ? 'lobby' : 'fortress'),
        ),
        action('clan-action-btn raid-browse-refresh', 'Refresh', 'refresh:' + kind),
      );
      const list = node('raid-browse-list');
      for (let index = 0; index < 4; index++) list.append(lobbyRow(kind, index));
      column.append(header, sorting, list);
      columns.append(column);
    }
    section.append(columns);
    content.append(section);
  }
  function partyRow(index, fortress) {
    const row = node(
      'raid-party-row-item' + (index === 0 ? ' self host' : index === 4 ? ' empty' : ''),
    );
    if (index === 4) {
      row.append(
        node('raid-party-empty-label', 'Empty slot'),
        action('raid-clone-add-btn', 'Clone Self', 'clone'),
        node('raid-clone-add-hint', 'Fills your best open role'),
      );
      return row;
    }
    const info = node('raid-row-info');
    info.append(
      node('raid-row-name', 'Adventurer_With_A_Long_Name'),
      node('raid-row-info-line', 'Combat 99 · Slay 99 · Delve 99'),
      node('raid-row-info-line raid-row-respawn-line', 'Respawn -3s · KC 12345'),
    );
    if (!fortress && index === 0) {
      const style = node('raid-row-style-col');
      style.append(loadout());
      info.append(style);
    }
    const portrait = node('raid-row-spritecol');
    const sprite = node('raid-row-sprite');
    const canvas = node('', undefined, 'canvas');
    canvas.width = 152;
    canvas.height = 156;
    sprite.append(canvas);
    portrait.append(sprite);
    const stats = node('raid-row-stats');
    const skills = node('raid-row-skill-grid' + (fortress ? ' raid-gauntlet-skill-grid' : ''));
    for (let skill = 0; skill < (fortress ? 5 : 12); skill++) {
      if (fortress) {
        const role = action('raid-role-skill-row clickable', undefined, 'role:' + skill);
        role.append(node('raid-role-arrows', '▲'));
        for (let pair = 0; pair < 2; pair++) {
          const cell = node('raid-row-skill-cell');
          cell.append(image('', 'Skill'), node('raid-row-skill-lvl', '99'));
          role.append(cell);
        }
        skills.append(role);
      } else {
        const cell = node('raid-row-skill-cell');
        cell.append(
          image('', 'Skill'),
          node('raid-row-skill-lvl', '99'),
          node('raid-skill-talent-bonus', '+18'),
        );
        skills.append(cell);
      }
    }
    stats.append(skills);
    row.append(info, portrait, stats);
    if (fortress) {
      const movement = node('raid-role-skill-row raid-gauntlet-move-row');
      movement.append(node('raid-role-arrows'));
      const vigor = node('raid-row-skill-cell');
      vigor.append(image('', 'Vigor'), node('', '99', 'span'));
      const potion = node('raid-row-skill-cell raid-gauntlet-move-potion');
      potion.append(image('', 'Movement potion'), node('', '+25%', 'span'));
      movement.append(vigor, potion);
      skills.append(movement);
      const preview = node('raid-row-gauntlet-preview');
      const items = node('raid-gauntlet-pv-items');
      for (const label of ['Raw material', 'Processed material']) {
        if (items.children.length) items.append(node('raid-gauntlet-pv-arrow', '→', 'span'));
        const item = node('inv-slot inv-s10');
        item.append(image('', label));
        items.append(item);
      }
      preview.append(
        items,
        node('raid-gauntlet-pv-line', 'Processed fortress supplies'),
        node('raid-gauntlet-pv-line raid-gauntlet-pv-value', '+123 Melee Force each'),
      );
      const strengths = node('raid-row-gauntlet-strengths');
      for (const label of ['Mine', 'Smith', 'Misc']) {
        const block = node('raid-gauntlet-str-block');
        const title = node('raid-gauntlet-str-head');
        title.append(image('', label), node('', label, 'span'));
        block.append(
          title,
          node('raid-gauntlet-str-line', '-1.25s duration'),
          node('raid-gauntlet-str-line', '+25% double'),
        );
        strengths.append(block);
      }
      row.append(preview, strengths, node('raid-row-unpicked raid-row-nextrun', 'Next run: Mine'));
      if (index > 0) row.append(action('raid-party-kick', 'Kick', 'kick:' + index));
      return row;
    }
    const doll = node('raid-row-paperdoll paperdoll');
    for (let slot = 0; slot < 12; slot++) {
      const item = node('inv-slot inv-s10');
      item.append(image('', 'Equipment'));
      doll.append(item);
    }
    const equipment = node('raid-row-equip-stats');
    equipment.append(node('raid-row-equip-style', 'Precision Ranged'));
    const table = node('raid-row-equip-table', undefined, 'table');
    table.innerHTML =
      '<thead><tr><th></th><th>ATK</th><th>DEF</th><th>STR</th><th>CRIT</th></tr></thead><tbody>' +
      ['Stab', 'Slash', 'Crush', 'Range', 'Magic']
        .map(
          (name) =>
            '<tr><td><img src="' +
            icon +
            '" alt=""> ' +
            name +
            '</td><td>+12345</td><td>+9876</td><td>+2345</td><td>45.0%</td></tr>',
        )
        .join('') +
      '</tbody>';
    equipment.append(table);
    row.append(doll, equipment);
    if (index > 0) row.append(action('raid-party-kick', 'Kick', 'kick:' + index));
    return row;
  }
  function lobby(content, fortress) {
    const grid = node('raid-lobby-grid');
    const left = node('raid-lobby-col raid-lobby-col-left');
    const right = node('raid-lobby-col raid-lobby-col-right');
    const difficulty = node('raid-diff-section');
    const choices = node('raid-diff-row');
    for (const label of fortress
      ? ['The Fortress']
      : ['Feeble', 'Dire', 'Savage', 'Fell', 'Ancient', 'Chaos']) {
      const button = action(
        'raid-diff-btn' + (label === 'Chaos' ? ' disabled' : ''),
        undefined,
        'difficulty:' + label,
        (element) => element.classList.add('selected'),
      );
      const text = node('raid-diff-text');
      text.append(
        node('raid-diff-name', label),
        node(
          'raid-diff-req',
          fortress ? 'Endless skilling raid. Feed your army, survive the waves' : 'Lv 90',
        ),
      );
      button.append(image('raid-diff-master', ''), text);
      choices.append(button);
    }
    difficulty.append(node('raid-section-label', 'Difficulty'), choices);
    const controls = node('raid-ctrl-grid');
    const invites = node('raid-ctrl-col raid-ctrl-col-left');
    const inviteRow = node('raid-invite-row');
    const input = node('settings-input raid-invite-input', undefined, 'input');
    input.placeholder = 'Player name';
    inviteRow.append(input, action('clan-action-btn', 'Invite', 'invite'));
    const lists = node('raid-invite-lists');
    for (let index = 0; index < 8; index++)
      lists.append(
        action('raid-invite-listrow', 'FriendlyPlayer_' + index + ' · Invite', 'friend:' + index),
      );
    invites.append(node('raid-section-label', 'Invite friends'), inviteRow, lists);
    const management = node('raid-ctrl-col raid-ctrl-col-right');
    const name = node('raid-name-row');
    const edit = node('raid-name-edit');
    const nameInput = node('settings-input raid-name-input', undefined, 'input');
    nameInput.value = 'A friendly party';
    edit.append(nameInput);
    name.append(edit);
    const actions = node('raid-action-row');
    for (const [label, cls] of [
      ['Start Raid', 'raid-start-btn'],
      ['End Lobby', 'raid-end-btn'],
      ['Open', 'raid-open-toggle'],
      ['◂ Lobbies', 'raid-browse-back-btn'],
    ])
      actions.append(
        action(
          'clan-action-btn ' + cls,
          label,
          label,
          label === '◂ Lobbies' ? () => window.fixtureRaids('browser') : undefined,
        ),
      );
    const drops = node('raid-droptable');
    drops.append(node('raid-section-label', 'Drop table'));
    const tierRow = node('raid-rare-tier-row');
    for (let tier = 1; tier <= 5; tier++)
      tierRow.append(action('raid-rare-tier-btn', 'T' + tier, 'drop-tier:' + tier));
    drops.append(tierRow);
    management.append(name, actions, drops);
    controls.append(invites, management);
    left.append(difficulty, controls);
    const party = node('raid-party-section');
    const members = node('raid-party-list');
    for (let index = 0; index < 5; index++) members.append(partyRow(index, fortress));
    party.append(node('raid-section-label', 'Party · 4/5'), members);
    right.append(party);
    grid.append(left, right);
    content.append(grid);
  }
  window.fixtureRaids = function (view = 'browser') {
    window.fixtureOpenModal('raid');
    const host = document.getElementById('tab-raid');
    host.replaceChildren();
    const tabs = node('raid-subtab-bar');
    tabs.append(
      action('qp-toggle-btn active raid-subtab-btn', 'Open Raid Lobbies', 'browse', () =>
        window.fixtureRaids('browser'),
      ),
    );
    const content = node('raid-content');
    host.append(tabs, content);
    if (view === 'browser') browser(content);
    else if (view === 'peek') {
      const section = node('raid-browse-section raid-peek-section');
      const header = node('raid-browse-header');
      header.append(
        action('clan-action-btn', 'Back', 'peek-back', () => window.fixtureRaids('browser')),
        node('raid-browse-title', 'A friendly party · Ancient'),
        action('clan-action-btn raid-peek-join-btn', 'Join', 'peek-join'),
      );
      const party = node('raid-party-list raid-peek-party');
      party.append(partyRow(1, false));
      section.append(header, party);
      content.append(section);
    } else lobby(content, view === 'fortress');
    window.fixtureRaidNodes = Array.from(host.querySelectorAll('*'));
  };
})();
