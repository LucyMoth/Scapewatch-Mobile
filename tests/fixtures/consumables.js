window.fixtureConsumableDetails = function () {
  const ui = document.getElementById('ui-container');
  const panel = document.querySelector('.active-potions-body');
  panel.replaceChildren();
  const tip = document.querySelector('.global-tooltip');
  tip.style.display = 'none';
  let active;
  let suppressClick = false;
  window.fixtureConsumables = { shown: 0, dismissed: 0 };

  for (const kind of ['food', 'melee']) {
    const row = document.createElement('div');
    row.className = 'potion-row';
    row.dataset.style = kind;
    row.innerHTML = `<span class="potion-row-stat">${kind}</span><span class="potion-row-count">193 Remaining</span>`;
    const source = document.createElement('div');
    source.className = 'tooltip';
    const grid = document.createElement('div');
    grid.className = 'potion-tt-grid';
    if (kind === 'food') {
      grid.innerHTML =
        '<div class="potion-tt-line potion-tt-total"><span class="potion-tt-total-label">Total Healing:</span><div class="potion-tt-stat"><span class="potion-tt-stat-val">+1,641,000</span> ♥</div><span class="potion-tt-count">176,000 Remaining</span></div>';
      grid.firstElementChild.style.color = 'var(--text-bright)';
    }
    for (let index = 0; index < 12; index++) {
      const line = document.createElement('div');
      line.className = 'potion-tt-line';
      line.style.color = index === 0 ? 'var(--text-bright)' : 'var(--text-gold)';
      line.innerHTML = `<img class="potion-tt-icon" alt=""><span class="potion-tt-tier">T${index}</span><span class="potion-tt-name">${kind === 'food' ? 'Roasted Battlefrost River Crab' : 'Concentrated Defensive Combat Potion'} ${index}</span><div class="potion-tt-stat"><span class="potion-tt-stat-val">+${index + 18}</span><img class="potion-tt-stat-icon" alt="Life"></div><span class="potion-tt-count">${index + 193},000 ${kind === 'food' ? 'Remaining' : 'Attacks'}</span>`;
      grid.appendChild(line);
    }
    source.append(grid);
    row.append(source);
    panel.append(row);
  }

  const item = document.createElement('div');
  item.className = 'inv-slot';
  item.id = 'fixture-consumable-item';
  item.style.cssText =
    'position:fixed;left:8px;top:240px;width:44px;height:44px;pointer-events:auto';
  item.innerHTML =
    '<div class="tooltip"><div class="tt-name">Spirit restoration potion</div><div class="tt-line tt-potion-boost">Restores spirit based on maximum spirit.</div>' +
    Array.from(
      { length: 14 },
      (_, index) =>
        `<div class="tt-line">Effect ${index}: restores spirit and describes its duration and available charges.</div>`,
    ).join('') +
    '</div>';
  ui.append(item);

  ui.addEventListener('mouseover', (event) => {
    const row = event.target.closest('.potion-row, .inv-slot');
    if (!row) return;
    active = row;
    tip.innerHTML = row.querySelector('.tooltip').innerHTML;
    Object.assign(tip.style, {
      display: 'block',
      left: '400px',
      top: '900px',
      transform: 'scale(0.5)',
    });
    window.fixtureConsumables.shown++;
  });
  ui.addEventListener('mouseout', (event) => {
    if (active && !active.contains(event.relatedTarget)) {
      active = null;
      tip.style.display = 'none';
      window.fixtureConsumables.dismissed++;
    }
  });
  document.addEventListener(
    'touchstart',
    (event) => {
      const row = event.target.closest('.potion-row, .inv-slot');
      if (!row) {
        if (active) window.fixtureConsumables.dismissed++;
        active = null;
        tip.style.display = 'none';
        suppressClick = false;
      } else suppressClick = active !== row;
    },
    true,
  );
  document.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );
};
