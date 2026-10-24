(function () {
  'use strict';
  const ui = document.getElementById('ui-container');
  const state = window.fixtureState;
  Object.assign(state, { sleepClicks: 0, wakeClicks: 0, defaultsClose: 0, defaultsApply: 0 });
  function el(cls, text, tag = 'div') {
    const node = document.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const moon =
    '<svg viewBox="0 0 24 24" width="240" height="240" fill="currentColor"><path d="M12.3 2.1a9.9 9.9 0 100 19.8 9.9 9.9 0 006.9-2.8 7.7 7.7 0 01-6.9-17z"/></svg>';
  function sleep(show) {
    let overlay = ui.querySelector('.sleep-overlay');
    if (!overlay) {
      overlay = el('sleep-overlay');
      const scene = el('sleep-scene');
      const image = el('sleep-moon');
      image.innerHTML = moon;
      scene.append(image, el('sleep-char'));
      const status = el('sleep-status');
      status.style.visibility = 'hidden';
      const wake = el('sleep-wake-btn', 'Wake Up');
      wake.addEventListener('click', () => {
        if (!state.holdWake) {
          sleep(false);
          return;
        }
        state.wakeClicks++;
        document.body.classList.remove('sleeping');
        overlay.classList.add('waking');
      });
      overlay.append(
        scene,
        el('sleep-timer', 'Sleeping for 01:23:45'),
        el('sleep-note', 'Your character is still playing. Offline time is not being used.'),
        status,
        wake,
      );
      ui.append(overlay);
    }
    overlay.style.display = show ? 'flex' : 'none';
    document.body.classList.toggle('sleeping', show);
    state[show ? 'sleepClicks' : 'wakeClicks']++;
  }
  window.fixtureHoldWake = function () {
    state.holdWake = true;
  };
  window.fixtureFinishWake = function () {
    const overlay = ui.querySelector('.sleep-overlay');
    overlay.classList.remove('waking');
    overlay.classList.add('leaving');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('leaving');
    }, 1500);
  };
  window.fixtureWindowControls = function () {
    ui.querySelector('.window-controls')?.remove();
    const controls = el('window-controls');
    const button = el('window-control-btn window-control-btn-sleep', undefined, 'button');
    button.dataset.tutorial = 'window-sleep';
    button.innerHTML = moon;
    button.querySelector('svg').setAttribute('width', '20');
    button.querySelector('svg').setAttribute('height', '20');
    button.append(el('tooltip window-control-tooltip', 'Sleep'));
    button.addEventListener('click', () => sleep(!document.body.classList.contains('sleeping')));
    controls.append(button);
    (document.getElementById('hud-layer') || ui).append(controls);
  };
  window.fixtureCombatDefaults = function () {
    ui.querySelector('.cd-popup-overlay')?.remove();
    const overlay = el('cd-popup-overlay');
    overlay.dataset.tutorial = 'combat-defaults-popup';
    const card = el('cd-popup');
    const bar = el('cd-popup-bar');
    const close = el('cd-popup-close', '✕');
    const dismiss = () => {
      state.defaultsClose++;
      overlay.remove();
      document.removeEventListener('keydown', escape, true);
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    };
    close.addEventListener('click', dismiss);
    bar.append(el('cd-popup-title', 'Auto Loadout'), close);
    const body = el('cd-popup-body');
    const content = el('combat-defaults-wrap');
    content.append(
      el(
        'settings-toggle-desc',
        'Select each loadout you want to use, and pick which skills you want to train. Apply sets every slay mob to its weakest loadout.',
      ),
      el('settings-subheading', 'Loadouts to use (pick any combination)'),
    );
    for (const family of ['Melee', 'Range', 'Magic']) {
      content.append(el('combat-defaults-fam-label', family));
      const row = el('combat-defaults-btn-row');
      for (const name of ['First', 'Second', 'Third', 'Fourth']) {
        const option = el('combat-defaults-btn', family + ' ' + name, 'button');
        option.addEventListener('click', () => option.classList.toggle('active'));
        row.append(option);
      }
      content.append(row);
    }
    content.append(el('settings-subheading', 'Set All XP Focus'));
    const focus = el('combat-defaults-btn-row');
    for (const label of ['Accuracy', 'Strength', 'Balanced']) {
      const option = el('combat-defaults-btn', label, 'button');
      option.addEventListener('click', () => {
        focus.querySelectorAll('button').forEach((node) => node.classList.remove('active'));
        option.classList.add('active');
      });
      focus.append(option);
    }
    const apply = el('combat-defaults-apply-btn', 'Apply to All Mobs', 'button');
    apply.addEventListener('click', () => state.defaultsApply++);
    content.append(focus, apply);
    body.append(content);
    card.append(bar, body);
    overlay.append(card);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) dismiss();
    });
    document.addEventListener('keydown', escape, true);
    ui.append(overlay);
  };
  window.fixtureSteamPrompt = function () {
    ui.querySelector('.steam-prompt-overlay')?.remove();
    Object.assign(state, { steamLater: 0, steamNever: 0, steamLinks: [] });
    const overlay = el('steam-prompt-overlay');
    const card = el('steam-prompt-card');
    const hero = el('steam-prompt-hero');
    const source = document.querySelector('.panel-tab-btn img').src;
    const icon = document.createElement('img');
    icon.src = source;
    icon.alt = 'Total level';
    hero.append(icon);
    const headline = el('steam-prompt-headline', 'Congratulations on total level ');
    headline.append(el('steam-prompt-level', '678', 'span'), document.createTextNode('!'));
    const deco = el('steam-prompt-deco');
    for (let index = 0; index < 6; index++) {
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      deco.append(image);
    }
    card.append(
      hero,
      headline,
      deco,
      el(
        'steam-prompt-note',
        'Thank you so much for being a part of Scapewatch. As a solo developer, there is nothing better than watching players genuinely enjoy something I built, and your feedback along the way has meant a great deal. I am so glad you are here.',
        'p',
      ),
      el('steam-prompt-signoff', '- Puzzle Drop', 'p'),
    );
    for (const [label, text] of [
      ['Please Wishlist on Steam now: ', 'Scapewatch on Steam'],
      ['And Please Review Scapewatch now: ', 'Review Scapewatch'],
    ]) {
      const line = el('steam-prompt-line', label, 'p');
      const link = el('steam-prompt-storelink', text, 'a');
      link.href = 'https://store.steampowered.com/';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        state.steamLinks.push(text);
      });
      line.append(link);
      card.append(line);
    }
    const buttons = el('steam-prompt-buttons');
    const later = el('steam-prompt-btn steam-prompt-btn-later', 'Later', 'button');
    later.addEventListener('click', () => {
      state.steamLater++;
      overlay.style.display = 'none';
    });
    const never = el('steam-prompt-btn steam-prompt-btn-never', "Don't ask again", 'button');
    never.addEventListener('click', () => state.steamNever++);
    buttons.append(later, never);
    card.append(buttons);
    overlay.append(card);
    ui.append(overlay);
  };
  window.fixtureWindowControls();
})();
