(() => {
  const ui = document.getElementById('ui-container');
  const fixture = window.fixtureState;
  const icon = document.querySelector('.panel-tab-btn img').src;
  const state = {
    enabled: true,
    activeTab: 'xp',
    revision: 0,
    notifySlay: false,
    actions: [],
    launcherClicks: 0,
    closeClicks: 0,
    minimizeClicks: 0,
    dragStarts: 0,
  };
  window.fixtureDashboard = state;
  function on(node, type, listener) {
    node.addEventListener(type, listener);
    fixture.listeners.push({ el: node, type, fn: listener });
  }
  const panel = document.createElement('div');
  panel.id = 'dashboard-panel';
  panel.className = 'dashboard-panel';
  panel.style.cssText = 'display:none;left:24px;top:96px;';
  panel.innerHTML =
    '<div class="dashboard-titlebar"><span class="dashboard-titlebar-label">Dashboard</span><span class="dashboard-titlebar-btns"><button class="dashboard-titlebar-btn dashboard-titlebar-min" data-tip="Minimize">−</button><button class="dashboard-titlebar-btn dashboard-titlebar-close" data-tip="Close">×</button></span></div><div class="dashboard-tabbar"></div><div class="dashboard-content"></div>';
  ui.append(panel);
  const tabs = [
    ['xp', 'XP'],
    ['queue', 'Queue'],
    ['slay', 'Slay'],
    ['drop', 'Drops'],
    ['food', 'Food'],
    ['log', 'Log'],
    ['pets', 'Pets'],
    ['raid', 'Raid'],
    ['loot', 'Loot'],
    ['barter', 'Barter'],
    ['quests', 'Quests'],
    ['scrolls', 'Scrolls'],
    ['goals', 'Goals'],
    ['settings', 'Settings'],
  ];
  function render() {
    const content = panel.querySelector('.dashboard-content');
    const scroll = content.scrollTop;
    content.innerHTML = window.fixtureDashboardMarkup(state.activeTab, icon, state);
    content.scrollTop = scroll;
    for (const button of panel.querySelectorAll('.dashboard-tab'))
      button.classList.toggle('active', button.dataset.tab === state.activeTab);
    for (const button of content.querySelectorAll('button')) {
      on(button, 'click', () => {
        const action =
          button.dataset.alt !== undefined
            ? 'alternative'
            : button.classList.contains('dash-goal-add')
              ? 'goal-add'
              : button.classList.contains('dash-goal-del')
                ? 'goal-delete'
                : button.classList.contains('dash-clear-btn')
                  ? 'clear-loot'
                  : button.dataset.rate
                    ? 'rate-' + button.dataset.rate
                    : button.dataset.move
                      ? 'move-' + button.dataset.move
                      : button.dataset.vis
                        ? 'visibility-' + button.dataset.vis
                        : button.dataset.data || button.textContent;
        state.actions.push(action);
        if (action === 'goal-add')
          state.goal = {
            skill: content.querySelector('.dash-goal-skill').value,
            level: content.querySelector('.dash-goal-target').value,
          };
        if (action === 'alternative') {
          const extra = document.createElement('div');
          extra.className = 'dash-q-alts';
          extra.innerHTML =
            '<div class="dash-q-alt"><span class="dash-q-alt-name">Craft ConcentratedPrecisionLongbow instead</span><span class="dash-q-alt-xp">+345,678</span></div>';
          button.after(extra);
        }
      });
    }
    for (const toggle of content.querySelectorAll('.dash-set-toggle')) {
      on(toggle, 'click', () => {
        state.notifySlay = !state.notifySlay;
        state.actions.push('notifySlay');
        render();
      });
    }
  }
  const tabbar = panel.querySelector('.dashboard-tabbar');
  for (const [id, name] of tabs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dashboard-tab';
    button.dataset.tab = id;
    button.textContent = name;
    on(button, 'click', () => {
      state.activeTab = id;
      panel.querySelector('.dashboard-content').scrollTop = 0;
      localStorage.setItem('scapewatch_dashboard_tab', id);
      render();
    });
    tabbar.append(button);
  }
  const launcher = document.createElement('div');
  launcher.className = 'floating-tab-btn dashboard-launcher';
  launcher.innerHTML = `<img class="floating-tab-icon" src="${icon}" alt="Dashboard"><span class="floating-tab-tooltip" data-tab="dashboard">Dashboard</span><span class="floating-tab-hotkey" data-tab="dashboard"></span>`;
  on(launcher, 'click', () => {
    state.launcherClicks++;
    if (!state.enabled) return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    render();
  });
  document.querySelector('.floating-tab-strip').append(launcher);
  for (const button of panel.querySelectorAll('.dashboard-titlebar-btn'))
    on(button, 'pointerdown', (event) => event.stopPropagation());
  on(panel.querySelector('.dashboard-titlebar-close'), 'click', (event) => {
    event.stopPropagation();
    state.closeClicks++;
    panel.style.display = 'none';
  });
  on(panel.querySelector('.dashboard-titlebar-min'), 'click', (event) => {
    event.stopPropagation();
    state.minimizeClicks++;
    const minimized = panel.classList.toggle('dashboard-minimized');
    localStorage.setItem('scapewatch_dashboard_min', minimized ? '1' : '0');
  });
  on(panel.querySelector('.dashboard-titlebar'), 'pointerdown', () => state.dragStarts++);
  window.fixtureDashboardRefresh = () => {
    state.revision++;
    render();
  };
  window.fixtureDashboardEnable = (enabled) => {
    state.enabled = enabled;
    launcher.classList.toggle('hidden', !enabled);
    if (!enabled) panel.style.display = 'none';
  };
  render();
})();
