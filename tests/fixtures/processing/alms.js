(function () {
  'use strict';
  const { state, node, on, slot, image } = window.fixtureProcessingKit;
  const layout = node('alms-layout');
  const donate = node('alms-donate-pane');
  const card = node('alms-skill-card');
  const bubble = node('alms-skill-bubble');
  bubble.append(image('Alms'), node('skill-level', '11', 'span'));
  card.append(
    bubble,
    node('alms-xp-text', '4,123 / 5,000 XP'),
    node('alms-xp-text', '877 xp to level 12'),
  );
  const section = node('alms-input-section');
  const row = node('alms-input-row');
  const input = node('alms-gold-input', undefined, 'input');
  input.type = 'text';
  input.placeholder = '0';
  on(input, 'input', () => state.almsControls.push(input.value));
  for (const text of ['-5%', '+5%']) {
    const button = node('alms-nudge-btn', text, 'button');
    on(button, 'click', () => state.almsControls.push(text));
    row.append(button);
  }
  row.insertBefore(input, row.lastChild);
  const presets = node('alms-presets');
  for (const text of ['25%', '50%', '75%', 'All']) {
    const button = node('alms-preset-btn', text, 'button');
    on(button, 'click', () => state.almsControls.push(text));
    presets.append(button);
  }
  section.append(node('alms-input-label', 'Gold to Donate'), row, presets);
  const preview = node('alms-preview');
  preview.append(node('alms-preview-title', 'Donation Preview'));
  for (const [label, value] of [
    ['Gold Spent', '10,000'],
    ['Alms XP Gained', '+12,456'],
    ['New Level', '12'],
  ]) {
    const entry = node('alms-preview-row');
    entry.append(node('preview-label', label, 'span'), node('preview-val', value, 'span'));
    preview.append(entry);
  }
  const confirm = node('alms-confirm-btn', 'Donate Gold', 'button');
  on(confirm, 'click', () => state.processingActions.push(['alms', input.value]));
  donate.append(
    card,
    node('alms-divider'),
    node('alms-gold-display', 'Bank Gold: 100,000'),
    section,
    preview,
    confirm,
    node('alms-info', 'Donating gold awards Alms XP and unlocks rewards.'),
  );
  const path = node('alms-path');
  const header = node('alms-path-header');
  const title = node('');
  title.append(
    node('alms-path-title', 'Alms Path'),
    node('alms-path-next', 'Next unlock: Lv 12 · 877 gold'),
  );
  const controls = node('alms-path-controls');
  for (const text of ['Claim All', 'All', 'Perks', 'Rewards', 'Needs']) {
    const button = node(
      text === 'Claim All' ? 'alms-path-claim-btn alms-path-claim-all' : 'alms-path-filter',
      text,
      'button',
    );
    on(button, 'click', () => state.almsControls.push(text));
    controls.append(button);
  }
  header.append(title, controls);
  const list = node('alms-path-list');
  for (let level = 1; level < 13; level++) {
    const entry = node('alms-path-row reached' + (level === 11 ? ' current' : ''));
    const perks = node('alms-path-perks');
    const perk = node('alms-path-perk active');
    const icon = node('alms-path-perk-icon');
    icon.append(image('Food Saver'));
    const text = node('alms-path-perk-text');
    text.append(
      node('alms-path-perk-name', 'Food Saver +10%'),
      node('alms-path-perk-sub', 'Available now'),
    );
    perk.append(icon, text);
    perks.append(perk);
    const reward = node('alms-path-reward claim');
    const info = node('alms-path-reward-info');
    info.append(
      node('alms-path-reward-name', 'A rare reward with a long name'),
      node('alms-path-reward-status', 'Ready'),
    );
    const claim = node('alms-path-claim-btn', 'Claim', 'button');
    on(claim, 'click', () => state.almsControls.push(['claim', level]));
    reward.append(info, slot('alms-path-reward-slot', 'Reward'), claim);
    entry.append(node('alms-path-node', String(level)), perks, reward);
    list.append(entry);
  }
  path.append(header, list, node('alms-path-legend', 'Active · Needs · Preview · Locked'));
  layout.append(donate, path);
  document.getElementById('tab-alms').replaceChildren(layout);
})();
