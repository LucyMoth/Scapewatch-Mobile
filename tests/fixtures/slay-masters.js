(function () {
  'use strict';
  const layout = document.querySelector('#tab-mobs .mob-layout');
  const detail = layout.querySelector('.mob-detail-side');
  const source = document.querySelector('.panel-tab-btn img').src;
  const state = window.fixtureState;
  state.masterActions = [];
  const node = (cls, text, tag = 'div') => {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  };
  const board = node('slay-masters-board');
  const stats = node('slay-unlocks-bar');
  for (const [label, value] of [
    ['Tasks Completed: ', '45'],
    ['Reroll Credits: ', '525'],
  ]) {
    const item = node('unlock-item', label);
    item.append(node('val', value, 'span'));
    stats.append(item);
  }
  const tiers = node('slay-tiers-container');
  const panels = [];
  let current = 0;
  const refresh = () => {
    panels.forEach((panel, index) => {
      panel.classList.toggle('selected-master', index === current);
      const action = panel.querySelector('.get-task-btn');
      action.classList.toggle('disabled', index === current || index === 2);
      action.textContent =
        index === current ? 'Current Master' : index === 2 ? 'Req. Lv 50' : 'Assign Master';
    });
  };
  for (const [index, name] of ['Valthor', 'Seraphine', 'Karnak'].entries()) {
    const row = node('tier-row tier-' + ['feeble', 'dire', 'savage'][index]);
    const panel = node('master-panel');
    const label = node('master-name-line', name + ' ');
    label.append(
      node('range', index === 0 ? '(1–30)' : index === 1 ? '(30–50)' : '(50–70)', 'span'),
    );
    const portrait = node('master-portrait');
    const image = document.createElement('img');
    image.src = source;
    image.alt = name;
    image.style.width = image.style.height = '100%';
    portrait.append(image);
    const assign = () => {
      if (current === index || index === 2) return;
      current = index;
      state.masterActions.push(index);
      refresh();
    };
    portrait.addEventListener('click', assign);
    const action = node('get-task-btn', '', 'button');
    action.addEventListener('click', assign);
    panel.append(label, portrait, action);
    panels.push(panel);
    const cards = node('mob-cards-scroll');
    for (const [target, targetName] of [
      'Feeble Acid Slime',
      'Dire Mushroom',
      'A long encounter name with requirements',
    ].entries()) {
      const card = node('mob-card' + (target === 2 ? ' locked' : ''));
      card.append(node('mob-card-level', 'Lv ' + (1 + index * 30)));
      card.append(node('mob-card-name', targetName));
      const sprite = node('mob-card-sprite');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      sprite.append(canvas);
      const style = node('mob-card-style');
      const styleImage = document.createElement('img');
      styleImage.src = source;
      styleImage.alt = 'Melee';
      style.append(styleImage);
      card.append(sprite, style, node('mob-card-chance', target === 2 ? '' : '8%'));
      card.addEventListener('click', () => {
        state.masterActions.push(['target', index, target]);
        layout.querySelectorAll('.mob-row:not(.slay-masters-row)')[target].click();
      });
      cards.append(card);
    }
    row.append(panel, cards);
    tiers.append(row);
  }
  refresh();
  board.append(stats, tiers);
  const row = node('mob-row slay-masters-row', 'Slay Masters');
  row.addEventListener('click', () => detail.replaceChildren(board));
  layout.querySelector('.mob-list-scroll').prepend(row);
  window.fixtureSlayBoard = board;
  window.fixtureSlayNodes = Array.from(board.querySelectorAll('.master-panel, .mob-card'));
  window.fixtureShowSlayMasters = () => {
    window.fixtureSelection();
    row.click();
  };
})();
