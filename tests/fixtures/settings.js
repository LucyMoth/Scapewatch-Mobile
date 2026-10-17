(function () {
  'use strict';
  const state = window.fixtureState;
  state.settingsChanges = [];
  state.settingsJumps = [];
  state.settingsPreviews = [];

  function create(cls, text, tag = 'div') {
    const node = document.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function listen(node, type, callback) {
    node.addEventListener(type, callback);
    state.listeners.push({ el: node, type, fn: callback });
  }
  function text(label, description) {
    const node = create('settings-toggle-text');
    node.append(
      create('settings-toggle-label', label),
      create('settings-toggle-desc', description),
    );
    return node;
  }
  window.fixtureSettings = function () {
    window.fixtureOpenModal('settings');
    const host = document.getElementById('tab-settings');
    host.replaceChildren();
    const searchBar = create('settings-search-bar');
    const nav = create('settings-header-nav');
    searchBar.append(nav);
    const searchWrap = create('settings-search-wrap');
    const search = create('settings-search-input', undefined, 'input');
    search.placeholder = 'Search settings...';
    const clear = create('settings-search-clear', '✕', 'span');
    clear.style.display = 'none';
    searchWrap.append(search, clear);
    searchBar.append(searchWrap);
    host.append(searchBar);
    const names = [
      'Build',
      'Account',
      'Display',
      'Audio',
      'Map Nodes',
      'Players',
      'Rich Presence',
      'Effects',
      'Window Controls',
      'Performance',
      'Queue',
      'Combat Defaults',
      'Raids',
      'Hotkeys',
      'Chat',
    ];
    const sections = [];
    for (const name of names) {
      const section = create('settings-section');
      section.id = 'settings-sec-' + name.toLowerCase().replace(/\s+/g, '-');
      section.append(create('settings-section-header', name));
      const jump = create('settings-nav-btn', name, 'button');
      listen(jump, 'click', () => {
        state.settingsJumps.push(name);
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.append(jump);
      const row = create('settings-toggle-row');
      row.append(
        text(
          'Show ' + name,
          'A native preference for ' + name + ' which keeps its existing game settings handler.',
        ),
      );
      const toggle = create('settings-switch on');
      toggle.append(create('settings-switch-knob'));
      listen(toggle, 'click', () => {
        toggle.classList.toggle('on');
        state.settingsChanges.push([name, toggle.classList.contains('on')]);
      });
      row.append(toggle);
      section.append(row);
      if (name === 'Display') {
        const quality = create('settings-toggle-row');
        quality.append(
          text(
            'Map Quality',
            'Locked to Low in the browser. Install the Steam client for higher tiers.',
          ),
        );
        const levels = create('settings-icon-size-control');
        for (const label of ['Low', 'Medium', 'High', 'Perfect']) {
          const button = create(
            'settings-icon-size-btn settings-map-quality-row' +
              (label === 'Low' ? ' active' : ' disabled'),
            label,
            'button',
          );
          button.disabled = label !== 'Low';
          levels.append(button);
        }
        quality.append(levels);
        section.append(quality);
      }
      if (name === 'Display' || name === 'Map Nodes') {
        section.append(create('settings-subheading', 'Skill Node Labels'));
        const fontRow = create('settings-toggle-row');
        fontRow.append(text('Font Size', 'Size of skill node label text in pixels'));
        const controls = create('settings-quality-control');
        const slider = create('settings-quality-slider', undefined, 'input');
        slider.type = 'range';
        slider.min = 10;
        slider.max = 28;
        slider.value = 18;
        const badge = create('settings-quality-badge', '18px');
        listen(slider, 'input', () => {
          badge.textContent = slider.value + 'px';
          state.settingsChanges.push([name + ' font', slider.value]);
        });
        controls.append(slider, badge);
        fontRow.append(controls);
        section.append(fontRow);
        const scaling = create('settings-toggle-row');
        scaling.append(text('Scaling', 'How the game fills a window that is not 16:9.'));
        const modes = create('settings-icon-size-control');
        for (const mode of ['Fill (UI edges)', 'Fill (UI stays)', 'Black bars']) {
          const button = create(
            'settings-icon-size-btn settings-map-quality-row settings-scaling-btn',
            mode,
            'button',
          );
          listen(button, 'click', () => state.settingsChanges.push(['scaling', mode]));
          modes.append(button);
        }
        scaling.append(modes);
        section.append(scaling);
      }
      if (name === 'Audio') {
        for (const sound of ['Task completed', 'Raid attacks', 'Global chat']) {
          const soundRow = create('settings-toggle-row');
          soundRow.append(text(sound, 'Tap play to hear this sound.'));
          const controls = create('settings-sound-controls');
          const play = create('settings-sound-preview', '▶', 'button');
          listen(play, 'click', () => state.settingsPreviews.push(sound));
          const soundToggle = create('settings-switch on');
          soundToggle.append(create('settings-switch-knob'));
          controls.append(play, soundToggle);
          soundRow.append(controls);
          section.append(soundRow);
        }
      }
      if (name === 'Hotkeys') {
        const hotkeyRow = create('settings-toggle-row settings-hotkey-row');
        const grip = create('settings-hotkey-grip', '⠇⠇', 'span');
        const icon = create('settings-hotkey-icon', '◇', 'span');
        const binding = create('settings-quality-badge settings-hotkey-bind-btn', 'B');
        listen(binding, 'click', () => state.settingsChanges.push(['hotkey', 'Bank']));
        hotkeyRow.append(grip, icon, text('Bank', ''), binding);
        section.append(hotkeyRow);
      }
      sections.push(section);
      host.append(section);
    }
    function filter() {
      const query = search.value.trim().toLowerCase();
      clear.style.display = query ? '' : 'none';
      for (const section of sections) {
        let visible = 0;
        for (const child of section.children) {
          if (child.classList.contains('settings-section-header')) continue;
          const match = !query || child.textContent.toLowerCase().includes(query);
          child.style.display = match ? '' : 'none';
          if (match) visible++;
        }
        section.style.display = visible ? '' : 'none';
      }
    }
    listen(search, 'input', filter);
    listen(clear, 'click', () => {
      search.value = '';
      filter();
      search.focus();
    });
    window.fixtureSettingsNodes = Array.from(host.querySelectorAll('*'));
  };
})();
