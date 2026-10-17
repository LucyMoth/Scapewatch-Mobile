(function () {
  'use strict';
  const { state, node, on, slot, amount } = window.fixtureProcessingKit;
  const layout = node('brew-layout');
  const area = node('brew-recipes-area');
  const header = node('brew-recipes-header');
  const filters = node('brew-style-filters');
  const scroll = node('brew-recipes-scroll');
  for (const style of [
    'all',
    'melee',
    'ranged',
    'magic',
    'defensive',
    'movement',
    'life',
    'discovery',
  ]) {
    const filter = node('brew-style-tab' + (style === 'all' ? ' active' : ''));
    filter.dataset.style = style;
    if (style !== 'all') filter.append(node('style-dot dot-' + style));
    filter.append(
      node('brew-style-tab-name', style.charAt(0).toUpperCase() + style.slice(1), 'span'),
    );
    on(filter, 'click', () => {
      state.brewFilters.push(style);
      filters
        .querySelectorAll('.brew-style-tab')
        .forEach((item) => item.classList.toggle('active', item === filter));
      scroll.querySelectorAll('.brew-recipe-card').forEach((card) => {
        card.style.display = style === 'all' || card.dataset.style === style ? '' : 'none';
      });
    });
    filters.append(filter);
  }
  header.append(filters, amount('brew'));
  for (let tier = 0; tier < 3; tier++) {
    const divider = node('brew-tier-divider');
    divider.append(
      node('brew-tier-level ' + (tier > 1 ? 'needs' : 'has'), 'Lv' + (tier * 10 || 1), 'span'),
      node('brew-tier-line'),
    );
    const grid = node('brew-recipes-grid');
    for (const style of ['melee', 'magic', 'discovery']) {
      const card = node('brew-recipe-card ' + (tier > 1 ? 'locked' : 'brewable'));
      card.dataset.style = style;
      card.dataset.itemId = style + '_' + tier;
      const top = node('brew-card-top');
      const info = node('brew-card-info');
      info.append(
        node('brew-card-name', 'Ancient ' + style + ' potion', 'span'),
        node('brew-card-sub', style, 'span'),
      );
      top.append(slot('', style), info);
      const details = node('brew-card-details');
      const cost = node('brew-detail-row');
      cost.append(
        slot('brew-cost-slot', 'Unfinished potion'),
        node('proc-cost-plus', '+', 'span'),
        slot('brew-cost-slot', 'Dust'),
      );
      details.append(cost, node('brew-detail-row', '+54 XP per potion'));
      const button = node('brew-btn' + (tier > 1 ? ' disabled' : ''), 'Brew', 'button');
      on(button, 'click', () => {
        if (!button.classList.contains('disabled'))
          state.processingActions.push(['brew', style, tier]);
      });
      card.append(top, details, button);
      grid.append(card);
    }
    scroll.append(divider, grid);
  }
  area.append(header, scroll);
  layout.append(area);
  document.getElementById('tab-brew').replaceChildren(layout);
})();
