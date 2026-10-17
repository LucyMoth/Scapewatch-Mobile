(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const state = window.fixtureState;
  const icon = document.querySelector('.panel-tab-btn img').src;
  state.raidHudActions = [];

  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function action(cls, label, key, callback) {
    const element = node(cls, label, 'button');
    const handler = () => {
      state.raidHudActions.push(key);
      callback?.();
    };
    element.addEventListener('click', handler);
    state.listeners.push({ el: element, type: 'click', fn: handler });
    return element;
  }
  function specials(cls) {
    const row = node('raid-contrib-specials ' + cls);
    row.append(node('raid-contrib-spec-caption', 'loot chance', 'span'));
    for (const tier of ['t1', 't2', 't3', 't4', 't5', 'c', 'c7']) {
      const pill = node('raid-contrib-spec-pill spec-' + tier, undefined, 'span');
      pill.append(node('spec-pill-label', '-', 'span'), node('tooltip', 'Special drops'));
      row.append(pill);
    }
    return row;
  }
  function collapse(host) {
    const button = action('hud-collapse-btn', undefined, 'collapse', () =>
      host.classList.toggle('hud-collapsed'),
    );
    button.innerHTML =
      '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 6 L8 10 L12 6"/></svg>';
    return button;
  }
  function contributionRow(cls, name, percentage, amount) {
    const row = node('raid-contrib-row ' + cls);
    const wrap = node(
      'raid-contrib-barwrap' + (cls.includes('progress') ? ' raid-contrib-barwrap-progress' : ''),
    );
    const fill = node('raid-contrib-barfill');
    fill.style.width = '50%';
    const label = node('raid-contrib-label');
    label.append(
      node('raid-contrib-name', name, 'span'),
      node('raid-contrib-pct', percentage, 'span'),
      node('raid-contrib-dmg', amount, 'span'),
    );
    wrap.append(fill, label);
    row.append(wrap);
    return row;
  }
  function combatHud() {
    const hud = node('raid-contrib-hud hud-collapsed');
    const tabs = node('raid-contrib-tabs');
    const damage = node('raid-contrib-dps');
    damage.append(
      contributionRow('raid-contrib-progress', 'Highroot Expedition [2/7]', '0:26', '20.8%'),
      specials(''),
    );
    const rows = node('raid-contrib-rows');
    for (let index = 0; index < 5; index++)
      rows.append(
        contributionRow(
          index === 0 ? 'is-self' : '',
          index === 0 ? 'Adventurer' : '[C] Adventurer (Ranged loadout)',
          '20.0%',
          '12,345',
        ),
      );
    damage.append(rows);
    const recap = node('raid-contrib-recap');
    recap.style.display = 'none';
    const columns = node('raid-recap-cols');
    for (const type of ['stats', 'loot']) {
      const column = node('raid-recap-col-' + type);
      column.append(node('raid-recap-header', type === 'stats' ? 'Session recap' : 'Loot'));
      for (let index = 0; index < 6; index++) {
        const row = node('raid-recap-stat');
        row.append(
          node('raid-recap-stat-label', type === 'stats' ? 'Damage dealt' : 'Gold coins'),
          node('raid-recap-stat-value', '12,345'),
        );
        column.append(row);
      }
      columns.append(column);
    }
    recap.append(columns);
    for (const label of ['DPS Current', 'DPS Total', 'Recap']) {
      const button = action('raid-contrib-tab', label, label, () => {
        damage.style.display = label === 'Recap' ? 'none' : '';
        recap.style.display = label === 'Recap' ? '' : 'none';
        for (const tab of tabs.children) tab.classList.toggle('active', tab === button);
      });
      tabs.append(button);
    }
    hud.append(tabs, collapse(hud), damage, recap);
    return hud;
  }
  function fortressBar(mirrored) {
    const wrap = node('gauntlet-hud-barwrap' + (mirrored ? ' mirrored upcoming' : ''));
    const fill = node('gauntlet-hud-barfill');
    fill.style.width = '70%';
    wrap.append(fill, node('gauntlet-hud-barval', mirrored ? '33 / 33' : '10 / 10', 'span'));
    return wrap;
  }
  function fortressHud() {
    const hud = node('gauntlet-hud');
    const charge = node('gauntlet-hud-chargewrap');
    charge.append(node('gauntlet-hud-chargefill'));
    hud.append(
      node('gauntlet-hud-header', 'The Fortress · Upcoming: Wave 1 in 1:55 · Survived 0'),
      charge,
    );
    for (const label of ['Health', 'Melee Force', 'Range Force', 'Magic Force', 'Defense']) {
      const row = node('gauntlet-hud-row');
      row.append(fortressBar(false), node('gauntlet-hud-statlabel', label), fortressBar(true));
      hud.append(row);
    }
    hud.append(specials('gauntlet-hud-rares'));
    const footer = node('gauntlet-hud-footer');
    for (const role of ['fish', 'mine', 'forage', 'invoke', 'farm']) {
      const column = node('gauntlet-foot-col');
      const pill = node('gauntlet-foot-pill');
      pill.dataset.role = role;
      for (let index = 0; index < 2; index++) {
        const image = node('gauntlet-foot-pill-icon', undefined, 'img');
        image.src = icon;
        image.alt = role;
        pill.append(image);
      }
      const click = () => {
        state.raidHudActions.push('role:' + role);
        footer
          .querySelectorAll('.gauntlet-foot-pill')
          .forEach((element) => element.classList.toggle('active', element === pill));
      };
      pill.addEventListener('click', click);
      state.listeners.push({ el: pill, type: 'click', fn: click });
      const roster = node('gauntlet-foot-roster');
      const sprite = node('gauntlet-foot-sprite');
      const canvas = node('', undefined, 'canvas');
      canvas.width = 28;
      canvas.height = 34;
      sprite.append(canvas);
      roster.append(sprite);
      column.append(pill, roster);
      footer.append(column);
    }
    hud.append(footer, collapse(hud));
    return hud;
  }
  const raid = combatHud();
  const fortress = fortressHud();
  const leave = action('btn-end-combat gauntlet-leave-btn', 'Leave Fortress', 'leave-fortress');
  for (const element of [raid, fortress, leave]) {
    element.style.display = 'none';
    ui.append(element);
  }
  const end = document.querySelector('.combat-hud .btn-end-combat');
  const endClick = () => state.raidHudActions.push('end-combat');
  end.addEventListener('click', endClick);
  state.listeners.push({ el: end, type: 'click', fn: endClick });
  window.fixtureActiveRaid = function (kind) {
    document.querySelector('.modal-overlay').style.display = 'none';
    document.body.classList.remove('modal-open');
    document.querySelector('.floating-current-task').style.display = kind ? 'none' : '';
    raid.style.display = kind === 'combat' ? '' : 'none';
    fortress.style.display = kind === 'fortress' ? '' : 'none';
    leave.style.display = kind === 'fortress' ? '' : 'none';
    window.fixtureCombat(kind === 'combat', true);
    end.style.display = kind === 'combat' ? '' : 'none';
  };
  window.fixtureRaidHudNodes = Array.from(
    ui.querySelectorAll('.raid-contrib-hud, .raid-contrib-hud *, .gauntlet-hud, .gauntlet-hud *'),
  );
})();
