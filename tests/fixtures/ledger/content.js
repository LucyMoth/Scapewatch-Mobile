(() => {
  const icon = document.querySelector('.panel-tab-btn img').src;
  const names = [
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
    'Slay',
    'Vigor',
    'Delve',
    'Fortify',
    'Luck',
    'Alms',
    'Fish',
    'Cook',
    'Mine',
    'Smith',
    'Forage',
    'Craft',
    'Invoke',
    'Imbue',
    'Farm',
    'Brew',
    'Plunder',
    'Barter',
    'Bard',
    'Discover',
  ];
  const zero = '<span class="ledger-zero">—</span>';
  const signed = (value) => `<span class="ledger-up ledger-tn">${value}</span>`;

  function row(name, index, unchanged = false) {
    const level = index === 0 ? '32' : '30';
    const xp = index === 11 ? '+662' : zero;
    return `<tr class="ledger-skill-row${unchanged ? ' quiet' : ''}"><td class="ledger-td-icon"><img src="${icon}" alt=""><div class="tooltip"><div class="tt-name">${name}</div><div class="tt-line ledger-tt-num">${xp}</div><div class="tt-line ledger-tt-num">236,421</div></div></td><td class="ledger-td-name">${name}</td><td class="ledger-td-num ledger-td-level ledger-tn">${level}</td><td class="ledger-td-num">${zero}</td><td class="ledger-td-num">${xp}</td><td class="ledger-td-num">${zero}</td><td class="ledger-td-num">${zero}</td></tr>`;
  }

  window.fixtureLedgerTable = function (all = false) {
    const rows = all
      ? names.map((name, index) => row(name, index, index !== 11)).join('')
      : row('Vigor', 11);
    return (
      '<table class="ledger-table"><thead><tr><th class="ledger-th-skill" colspan="2">Skill</th>' +
      ['Level', 'Levels', 'XP', 'Tasks', 'Credits']
        .map((label) => `<th class="ledger-th-num">${label}</th>`)
        .join('') +
      `</tr></thead><tbody>${rows}</tbody><tfoot><tr class="ledger-total-row"><td class="ledger-td-icon"><img src="${icon}" alt=""></td><td class="ledger-td-name">Total</td><td class="ledger-td-num ledger-tn">326</td><td class="ledger-td-num">${zero}</td><td class="ledger-td-num">${signed('+662')}</td><td class="ledger-td-num">${zero}</td><td class="ledger-td-num">${zero}</td></tr></tfoot></table>`
    );
  };

  window.fixtureLedgerMilestones = function (all = false) {
    const values = [
      ['XP gained', '+662'],
      ['Steps taken', '+637'],
    ];
    if (all)
      for (const name of [
        'Levels gained',
        'Unlocks',
        'Collections',
        'Diary steps',
        'Scrolls completed',
        'Tasks done',
        'Slay tasks',
        'Kills',
        'Deaths',
        'Fortress clears',
        'Dungeon clears',
        'Quests completed',
        'Gold',
        'Food eaten',
        'Teleports',
      ])
        values.push([name, zero]);
    return values
      .map(
        ([name, value]) =>
          `<div class="ledger-row${value === zero ? ' quiet' : ''}"><img src="${icon}" alt=""><span class="ledger-row-k">${name}</span><span class="ledger-row-v ledger-tn">${value === zero ? zero : signed(value)}</span><div class="tooltip"><div class="tt-name">${name}</div><div class="tt-line ledger-tt-num">${value}</div></div></div>`,
      )
      .join('');
  };

  window.fixtureLedgerLootGroup = function (title, count, used = false) {
    const group = document.createElement('div');
    group.className = 'ledger-group';
    group.innerHTML = `<div class="ledger-group-h${title.startsWith('New') ? ' is-new' : ''}"><span>${title}</span><span class="cnt">${count}</span></div><div class="bank-grid ledger-lootgrid"></div>`;
    const grid = group.querySelector('.ledger-lootgrid');
    for (let index = 0; index < count; index++) {
      const slot = document.createElement('div');
      slot.className =
        'inv-slot inv-s15 ledger-slot ' + (used ? 'ledger-slot-used' : 'ledger-slot-gain');
      slot.dataset.itemId = `ledger-item-${index}`;
      slot.innerHTML = `<img src="${icon}" alt="Collected item ${index}"><span class="inv-qty">${used ? '−' : '+'}${index ? '99,999' : '2'}</span><div class="tooltip"><div class="tt-name">Collected item ${index}</div></div>`;
      slot.addEventListener('click', () =>
        window.fixtureNativeLedger.actions.push(`${title}:${index}`),
      );
      grid.append(slot);
    }
    return group;
  };
})();
