(function () {
  'use strict';
  const { state, skills, node, on, slot, amount } = window.fixtureProcessingKit;
  function requirements(card, skill) {
    if (document.querySelector('.proc-recipe-info-pop')) {
      document.querySelector('.proc-recipe-info-pop').remove();
      return;
    }
    const pop = node('proc-recipe-info-pop');
    pop.style.left = '1500px';
    pop.style.top = card.getBoundingClientRect().top + 'px';
    pop.append(node('proc-recipe-info-title', 'Corrupted Ancient Precision Equipment'));
    pop.append(node('proc-recipe-info-line ok', 'Level 11 required'));
    pop.append(node('proc-recipe-info-line proc-recipe-info-head', 'Materials (have / need)'));
    for (let index = 0; index < 12; index++) {
      const row = node('proc-recipe-info-row ' + (index ? 'missing' : 'ok'));
      row.append(
        slot('bank-slot', 'Rare material ' + index),
        node('proc-recipe-info-name', 'A rare material with a long description ' + index, 'span'),
        node('proc-recipe-info-qty', '1,234 / 10,000', 'span'),
      );
      pop.append(row);
    }
    document.getElementById('ui-container').append(pop);
    const dismiss = () => {
      pop.remove();
      document.removeEventListener('click', dismiss, true);
    };
    setTimeout(() => document.addEventListener('click', dismiss, true), 0);
    state.processingActions.push([skill, 'requirements']);
  }
  for (const skill of ['smith', 'craft', 'imbue']) {
    const host = document.getElementById('tab-' + skill);
    const layout = node('proc-layout');
    const main = node('proc-main-layout');
    const sidebar = node('proc-tier-sidebar');
    const tiers = node('proc-tier-sidebar-scroll');
    const area = node('proc-recipes-area');
    const header = node('proc-recipes-header');
    const display = node('proc-recipes-material-display');
    const label = node('proc-mat-label', 'Copper');
    const materials = [
      'Copper',
      'Tin',
      'Iron',
      'Aluminium',
      'Mithril',
      'Titanium',
      'Adamant',
      'Runite',
      'Orichalcum',
    ];
    display.append(slot('proc-mat-slot', 'Copper'), label, node('proc-mat-bank', '145'));
    header.append(display, amount(skill));
    const scroll = node('proc-recipes-grid-scroll');
    const grid = node('proc-recipes-grid');
    for (let index = 0; index < materials.length; index++) {
      const row = node('proc-tier-row' + (index === 0 ? ' active' : index > 1 ? ' locked' : ''));
      const info = node('proc-tier-info');
      const name = node('proc-tier-mat-name', materials[index], 'span');
      const lock = node('proc-lock-icon', ' 🔒', 'span');
      lock.style.display = index > 1 ? '' : 'none';
      name.append(lock);
      info.append(
        name,
        node('proc-tier-level ' + (index > 1 ? 'needs' : 'has'), 'Lv' + (index * 10 || 1), 'span'),
      );
      row.append(
        node('proc-tier-badge', 'T' + index, 'span'),
        slot('proc-tier-mat-icon', materials[index]),
        info,
        node('proc-tier-bank-qty', index > 1 ? '' : String(145 - index * 50), 'span'),
      );
      on(row, 'click', () => {
        state.processingTiers.push([skill, index]);
        tiers
          .querySelectorAll('.proc-tier-row')
          .forEach((item) => item.classList.toggle('active', item === row));
        label.textContent = materials[index];
        grid
          .querySelectorAll('.proc-craft-btn')
          .forEach((button) => button.classList.toggle('disabled', index > 1));
      });
      tiers.append(row);
    }
    sidebar.append(node('proc-tier-sidebar-title', 'Material Tiers'), tiers);
    for (let index = 0; index < 12; index++) {
      const card = node('proc-recipe-card craftable');
      card.dataset.itemId = skill + '_' + index;
      if (index === 4) card.style.gridColumnStart = '1';
      const info = node('proc-recipe-info-btn', 'i');
      info.title = 'Requirements';
      on(info, 'click', (event) => {
        event.stopPropagation();
        requirements(card, skill);
      });
      const top = node('proc-recipe-card-top');
      const title = node('proc-recipe-item-info');
      title.append(
        node(
          'proc-recipe-item-name',
          index === 0 ? 'Corrupted Ancient Precision Equipment' : 'Copper equipment ' + index,
          'span',
        ),
        node('proc-recipe-slot-label', 'Mainhand', 'span'),
      );
      top.append(slot('', 'Equipment ' + index), title);
      const details = node('proc-recipe-details');
      const cost = node('proc-recipe-detail-row');
      cost.append(
        slot('proc-cost-slot', 'Copper', 12),
        node('proc-cost-plus', '+', 'span'),
        slot('proc-cost-slot', 'Gem', 1),
      );
      details.append(cost, node('proc-recipe-detail-row', '+25 XP per craft'));
      const button = node('proc-craft-btn', skills[skill], 'button');
      on(button, 'click', () => {
        if (!button.classList.contains('disabled')) state.processingActions.push([skill, index]);
      });
      card.append(info, top, details, button);
      grid.append(card);
    }
    scroll.append(grid);
    area.append(header, scroll);
    main.append(sidebar, area);
    layout.append(main);
    host.replaceChildren(layout);
  }
})();
