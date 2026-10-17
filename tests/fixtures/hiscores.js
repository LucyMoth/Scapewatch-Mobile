(function () {
  'use strict';
  const state = window.fixtureState;
  state.hiscoreActions = [];
  const tab = document.querySelector('#tab-hiscores');
  const source = document.querySelector('.panel-tab-btn img').src;
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  }
  const toggle = node('hs-mode-toggle');
  for (const name of ['Players', 'Clans']) {
    const button = node('qp-toggle-btn', name);
    button.addEventListener('click', () => state.hiscoreActions.push(['mode', name]));
    toggle.append(button);
  }
  const layout = node('hiscores-layout');
  const categories = node('hs-categories');
  categories.append(node('hs-cat-title', 'Hiscores'));
  const leaderboard = node('hs-leaderboard');
  const controls = node('hs-controls');
  function results(category) {
    leaderboard.replaceChildren(node('hs-lb-title', category));
    const table = node('hs-table hs-lb-table', '', 'table');
    const head = document.createElement('tr');
    for (const [cls, text] of [
      ['rank-col', 'Rank'],
      ['name-col', 'Name'],
      ['level-col', 'Total Level'],
      ['xp-col', 'Total XP'],
    ])
      head.append(node(cls, text, 'th'));
    table.append(head);
    for (let i = 0; i < 15; i++) {
      const row = document.createElement('tr');
      const name = node('name-col', '', 'td');
      name.append(node('hs-row-tag', '[MOTH]'));
      const player = node('hs-row-name', 'LongAdventurerName' + i);
      player.addEventListener('click', () => state.hiscoreActions.push(['player', i]));
      name.append(player);
      row.append(
        node('rank-col', String(i + 1), 'td'),
        name,
        node('level-col', '1,234', 'td'),
        node('xp-col', '10,234,567,890', 'td'),
      );
      table.append(row);
    }
    const pages = node('hs-pagination');
    for (const name of ['Previous', 'Next']) {
      const button = node('', name, 'button');
      button.addEventListener('click', () => state.hiscoreActions.push(['page', name]));
      pages.append(button);
    }
    leaderboard.append(table, pages);
  }
  for (const text of [
    'Overall',
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
  ]) {
    const button = node('hs-cat-item');
    const image = document.createElement('img');
    image.src = source;
    image.alt = text;
    button.append(image, node('', text, 'span'));
    button.addEventListener('click', () => {
      state.hiscoreActions.push(['category', text]);
      results(text);
    });
    categories.append(button);
  }
  for (const text of ['Name', 'Rank']) {
    const section = node('hs-search-section');
    const input = node('hs-search-input', '', 'input');
    input.placeholder = text === 'Name' ? 'Username' : 'Rank';
    const search = node('hs-search-btn', 'Search', 'button');
    search.addEventListener('click', () => state.hiscoreActions.push([text, input.value]));
    section.append(node('', 'Search by ' + text, 'label'), input, search);
    controls.append(section);
  }
  const own = node('hs-your-rank-btn', 'View Your Rank', 'button');
  own.addEventListener('click', () => state.hiscoreActions.push(['own']));
  controls.append(own);
  layout.append(categories, leaderboard, controls);
  tab.replaceChildren(toggle, layout);
  results('Overall');
})();
