(() => {
  function stats(values) {
    return `<div class="dash-row">${values.map(([label, value]) => `<div class="dash-cell"><div class="dash-cell-val">${value}</div><div class="dash-cell-label">${label}</div></div>`).join('')}</div>`;
  }
  function skill(name, icon, extra = '') {
    return `<div class="dash-skill-row active"><img class="dash-skill-icon" src="${icon}" alt=""><div class="dash-skill-main"><div class="dash-skill-top"><span class="dash-skill-name">${name}</span><span class="dash-skill-lv">Lv 119</span></div><div class="dash-bar"><div class="dash-bar-fill" style="width:93%"></div></div></div><div class="dash-skill-stats"><div class="dash-skill-gained">+1,234,567</div><div class="dash-skill-rate">82,456/hr</div></div>${extra}</div>`;
  }
  function queue(name, index) {
    return `<div class="dash-q-row"><div class="dash-q-top"><span class="dash-q-left"><span class="dash-q-name">${index + 1}. ${name}</span><span class="dash-tag dash-tag-low">Low mat</span></span><span class="dash-q-xp">+234,567</span></div><div class="dash-q-sub"><span>Remote Battlefrost Quarry (12,345)</span><span>87% · 1h 24m</span></div><div class="dash-q-rate"><span>↗ ~23,456/hr</span><span>▲ 25,678/hr</span></div><button class="dash-q-alts-btn" data-alt="${index}">2 alternatives</button></div>`;
  }
  window.fixtureDashboardMarkup = function (tab, icon, state) {
    if (tab === 'xp') {
      return (
        stats([
          ['Total Level', '1,234'],
          ['Total XP', `7,654,${321 + state.revision}`],
          ['XP/hr', '123,456'],
        ]) +
        '<div class="dash-near"><span>Close to leveling:</span><span class="dash-near-skill">Precision Ranged Accuracy <span class="dash-near-pct">(93%)</span></span></div><div class="dash-subtle">XP this session <span class="dash-subtle-timer">(1:23:45)</span></div>' +
        `<div class="dash-skill-list">${['Precision Ranged Accuracy', 'Concentrated Arcane Surge', 'Vigor', 'Dodge', 'Fortify', 'Cook'].map((name) => skill(name, icon)).join('')}<div class="dash-skill-row total"><div class="dash-skill-main"><span class="dash-skill-name">Total</span></div><div class="dash-skill-stats"><div class="dash-skill-gained">+2,345,678</div><div class="dash-skill-rate">123,456/hr</div></div></div></div>`
      );
    }
    if (tab === 'queue') {
      return (
        stats([
          ['Tasks', '7'],
          ['Fights', '3'],
          ['Walk', '12,345'],
          ['Time', '7h 23m'],
        ]) +
        '<div class="dash-warn">⚠ <span><strong>Battlefrost ore</strong> runs out in <strong>18m</strong></span></div><div class="dash-q-info"><span>Master <strong>Battlefrost</strong></span><span>Credits <strong>1,234</strong></span></div>' +
        `<div class="dash-skill-list">${['Gather 110 squats at Pinegap Trail', 'Slay Corrupted Ancient Armoured Rage Slime', 'Craft ConcentratedPrecisionLongbow', 'Explore the distant northern settlement'].map(queue).join('')}</div>`
      );
    }
    if (tab === 'goals') {
      return (
        '<div class="dash-goal-form"><select class="dash-goal-skill"><option value="vigor">Vigor</option><option value="sight">Sight</option></select><input class="dash-goal-target" type="number" value="120"><button class="dash-goal-add" type="button">Set</button></div>' +
        `<div class="dash-skill-list"><div class="dash-goal-row"><img class="dash-skill-icon" src="${icon}" alt=""><div class="dash-skill-main"><div class="dash-skill-top"><span class="dash-skill-name">Precision Ranged Accuracy goal</span><span class="dash-skill-lv">Lv 120</span></div><div class="dash-bar"><div class="dash-bar-fill" style="width:93%"></div></div></div><button class="dash-goal-del" data-goal="sight" type="button">×</button></div></div>`
      );
    }
    if (tab === 'settings') {
      return (
        '<div class="dash-set-label">Refresh rate</div><div class="dash-set-seg"><button class="dash-seg-btn" data-rate="slow">Slow</button><button class="dash-seg-btn active" data-rate="normal">Normal</button><button class="dash-seg-btn" data-rate="fast">Fast</button></div><div class="dash-set-label">Notifications</div>' +
        `<div class="dash-set-toggle" data-toggle="notifySlay"><span>Notify when a Slay task finishes</span><span class="dash-switch${state.notifySlay ? ' on' : ''}"></span></div>` +
        '<div class="dash-set-slider" data-slider="notifyVolume"><div class="dash-set-slider-top"><span>Notification volume</span><span class="dash-set-slider-val">60%</span></div><input type="range" min="0" max="1" step="0.1" value="0.6"></div><div class="dash-set-label">Tabs</div>' +
        ['XP', 'Queue', 'Slay', 'Food', 'Goals']
          .map(
            (name) =>
              `<div class="dash-tabcfg-row"><span class="dash-tabcfg-name">${name}</span><button class="dash-tabcfg-btn" data-move="up">▲</button><button class="dash-tabcfg-btn" data-move="down">▼</button><button class="dash-tabcfg-btn on" data-vis="${name.toLowerCase()}">Shown</button></div>`,
          )
          .join('') +
        '<div class="dash-set-label">Data</div><div class="dash-set-data"><button class="dash-data-btn" data-data="export">Export</button><button class="dash-data-btn" data-data="import">Import</button><button class="dash-data-btn" data-data="reset">Reset</button></div>'
      );
    }
    if (tab === 'loot') {
      return (
        stats([
          ['Sources', '3'],
          ['Items', '12,345'],
          ['GP', '6,543,210'],
          ['GP/hr', '87,654'],
        ]) +
        '<div class="dash-loot-head"><input class="dash-drop-search dash-loot-search" placeholder="Filter loot..."><button class="dash-clear-btn">Clear</button></div><div class="dash-loot-groups">' +
        ['Corrupted Ancient Armoured Rage Slime', 'Battlefrost crafting rewards']
          .map(
            (name) =>
              `<div class="dash-loot-group"><div class="dash-loot-group-head">${name}</div><div class="dash-loot-grid">${Array.from({ length: 6 }, () => `<div class="dash-loot-cell"><img class="dash-loot-icon" src="${icon}" alt=""><span class="dash-loot-qty">×12,345</span></div>`).join('')}</div></div>`,
          )
          .join('') +
        '</div>'
      );
    }
    if (tab === 'raid') {
      return (
        '<div class="dash-raid-live-title">Live raid · The distant frozen citadel</div>' +
        stats([
          ['Wave', '34'],
          ['Time', '23:45'],
          ['Damage', '1,234,567'],
        ]) +
        `<div class="dash-skill-list">${['Adventurer', 'A_Player_With_A_Long_Name', 'PrecisionLongbowSpecialist', 'Battlefrost'].map((name) => `<div class="dash-raid-dps"><div class="dash-raid-dps-fill" style="width:72%"></div><span class="dash-raid-dps-name">${name}</span><span class="dash-raid-dps-share">72%</span><span class="dash-raid-dps-dmg">123,456</span></div>`).join('')}</div><div class="dash-raid-rank-top">Best loadout: Concentrated Longbow <span class="dash-raid-rank-toggle" data-raid-rank="citadel">top 5</span></div>`
      );
    }
    if (tab === 'food') {
      return (
        stats([
          ['Healing', '12,345'],
          ['Remaining', '234'],
          ['Life', '32/32'],
        ]) +
        `<div class="dash-skill-list">${['Battlefrost crab', 'Concentrated recovery stew', 'Roasted northern salmon'].map((name) => `<div class="dash-food-row"><span class="dash-food-name">${name}</span><span class="dash-food-ct">×123</span><span class="dash-food-hp">+1,234</span><span class="dash-food-avg">avg 18</span></div>`).join('')}</div>`
      );
    }
    if (tab === 'pets') {
      return (
        stats([
          ['Collected', '12'],
          ['Shiny', '3'],
          ['Total', '62'],
        ]) +
        `<div class="dash-skill-list">${['All Skills', 'Precision Ranged Accuracy', 'Concentrated Arcane Surge'].map((name) => `<div class="dash-pet-row"><img class="dash-pet-icon" src="${icon}" alt=""><span class="dash-pet-name">${name}</span><span class="dash-pet-pips"><span class="dash-pip on">●</span><span class="dash-pip shiny">●</span></span><span class="dash-pet-eta">~123.4h</span></div>`).join('')}</div>`
      );
    }
    if (tab === 'log') {
      return `<div class="dash-skill-list">${Array.from({ length: 12 }, (_, index) => `<div class="dash-log-row"><span class="dash-log-dot">●</span><span class="dash-log-text">Collected rewards at the distant Battlefrost quarry entrance ${index + 1}</span><span class="dash-log-ago">23m ago</span></div>`).join('')}</div>`;
    }
    if (tab === 'drop') {
      return `<input class="dash-drop-search" placeholder="Search an item..."><div class="dash-drop-results"><div class="dash-drop-card"><div class="dash-q-top"><span class="dash-q-name">Concentrated precision longbow</span><span class="dash-drop-top-right"><span class="dash-q-xp">1/12,345</span><button class="dash-pin-btn">★</button></span></div><div class="dash-drop-src">Corrupted Ancient Armoured Rage Slime</div><div class="dash-q-sub"><span>Chance by 12,345 kills</span><span>63%</span></div></div></div>`;
    }
    if (tab === 'barter') {
      return (
        stats([
          ['Bought', '12,345'],
          ['Sold', '23,456'],
          ['GP', '345,678'],
        ]) +
        '<div class="dash-barter-filter"><div class="dash-set-seg dash-barter-seg"><button class="dash-seg-btn">All</button><button class="dash-seg-btn">Buy</button><button class="dash-seg-btn">Sell</button></div><input class="dash-drop-search dash-barter-search" placeholder="Filter..."></div>' +
        `<div class="dash-skill-list">${[0, 1, 2].map((index) => queue('Buy northern Battlefrost crafting materials', index)).join('')}</div>`
      );
    }
    return (
      stats([
        ['Active', '7'],
        ['Progress', '93%'],
        ['ETA', '1h 23m'],
      ]) +
      `<div class="dash-skill-list">${['Progress at remote Battlefrost quarry entrance', 'Gathering tasks at Pinegap Trail', 'Return to the northern settlement'].map(queue).join('')}</div>`
    );
  };
})();
