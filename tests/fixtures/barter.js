(function () {
  'use strict';
  const state = window.fixtureState;
  state.barterActions = [];
  const panel = document.querySelector('#barter-panel');
  const source = document.querySelector('.panel-tab-btn img').src;
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  }
  const header = node('barter-header');
  const title = node('barter-title-wrap');
  title.append(node('barter-title', 'BARTER'), node('barter-header-gold', '15,739'));
  title.append(node('barter-header-budget', '119'));
  const reroll = node('barter-reroll-btn', '↻', 'button');
  reroll.addEventListener('click', () => state.barterActions.push(['reroll']));
  header.append(title, reroll);
  panel.replaceChildren(header);
  for (let i = 0; i < 6; i++) {
    const row = node('barter-slot-row' + (i === 1 ? ' barter-slot-locked' : ''));
    const icon = node('barter-slot-icon');
    const slot = node('inv-slot');
    const image = document.createElement('img');
    image.src = source;
    image.alt = 'Boots';
    slot.append(image);
    icon.append(slot);
    const info = node('barter-slot-info');
    info.append(node('barter-price', '63'), node('barter-mod-label', '140%'));
    const controls = node('barter-slot-controls');
    const quantity = node('barter-qty-wrap');
    const label = node('barter-qty-label', '1');
    const input = node('barter-qty-input', '', 'input');
    input.type = 'range';
    input.min = '1';
    input.max = '100';
    input.value = '1';
    input.addEventListener('input', () => (label.textContent = input.value));
    quantity.append(label, input);
    const buttons = node('barter-btn-col');
    for (const action of ['Buy', 'Charm']) {
      const button = node('barter-btn barter-' + action.toLowerCase() + '-btn', action, 'button');
      button.addEventListener('click', () => state.barterActions.push([i, action, input.value]));
      buttons.append(button);
    }
    controls.append(quantity, buttons);
    row.append(node('barter-slot-type', 'EQP'), icon, info, controls);
    panel.append(row);
  }
  const consumed = node('barter-consumed-overlay');
  consumed.style.display = 'none';
  panel.append(consumed);
})();
