(function () {
  'use strict';
  window.fixtureSettingsDisplay = function () {
    window.fixtureSettings();
    const host = document.querySelector('#tab-settings');
    const language = () => {
      const picker = document.createElement('select');
      picker.className = 'sw-lang-picker';
      picker.innerHTML = '<option value="en">English</option><option value="sv">Svenska</option>';
      picker.addEventListener('change', () =>
        window.fixtureState.settingsChanges.push(['language', picker.value]),
      );
      return picker;
    };
    host.querySelector('.settings-search-bar').prepend(language());
    const row = document.createElement('div');
    row.className = 'settings-account-row';
    row.append(language());
    host.querySelector('#settings-sec-build').append(row);
    const hud = document.createElement('div');
    hud.className = 'settings-toggle-row';
    hud.innerHTML =
      '<div class="settings-toggle-text"><div class="settings-toggle-label">HUD Size</div><div class="settings-toggle-desc">Make the in-game HUD smaller or bigger.</div></div><div class="settings-quality-control"><input class="settings-quality-slider" type="range" min="50" max="150" step="5" value="85"><div class="settings-quality-badge">85%</div></div>';
    hud
      .querySelector('input')
      .addEventListener('input', (event) =>
        window.fixtureState.settingsChanges.push(['HUD Size', event.target.value]),
      );
    host.querySelector('#settings-sec-display').append(hud);
    window.fixtureDisplayNodes = Array.from(host.querySelectorAll('*'));
    window.fixtureOriginalSettingsOrder = Array.from(host.children)
      .filter((node) => node.classList.contains('settings-section'))
      .map((node) => node.id);
  };
})();
