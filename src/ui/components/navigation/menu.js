import { $, all } from '../../dom.js';
import { dockSelector, menuSelector, controlTab, label, updateNavIcons } from './game-controls.js';
import { getOrientationPreference, setOrientationPreference } from '../../platform/orientation.js';
import { menuGroups } from './menu-groups.js';
import { createMenuAssets } from './assets.js';
export function createMenu({
  state,
  setFlag,
  render,
  scheduleSync,
  toast,
  renderController,
  fullMap,
  dashboard,
  closeModal,
}) {
  let menuSignature = '';
  let sleepControl;
  let sleepName;
  const sleepObserver = new MutationObserver(syncSleep);
  const assets = createMenuAssets({ state });
  function syncSleep() {
    const original = $('.window-control-btn-sleep');
    const name = $('.ingame-hud-name');
    if (original !== sleepControl || name !== sleepName) {
      sleepObserver.disconnect();
      sleepControl = original;
      sleepName = name;
      if (original)
        sleepObserver.observe(original, { attributes: true, attributeFilter: ['disabled'] });
      if (name)
        sleepObserver.observe(name, { childList: true, characterData: true, subtree: true });
      sleepObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    const button = $('#sw-sleep-toggle');
    button.hidden =
      !original || document.body.classList.contains('login-active') || !name?.textContent.trim();
    button.disabled = !!original?.disabled;
  }
  function originalAction(kind, tab) {
    if (document.body.classList.contains('login-active')) {
      toast('Sign in to Scapewatch first.');
      return;
    }
    setFlag('sw-notes', false);
    if (kind === 'action' && tab === 'sleep') {
      const original = $('.window-control-btn-sleep');
      if (!original || original.disabled) {
        toast('Sleep is unavailable right now.');
        return;
      }
      closeModal();
      dashboard.close();
      fullMap.close();
      state.view = 'world';
      state.returnView = 'world';
      render();
      original.click();
      scheduleSync();
      return;
    }
    if (tab === 'dashboard') {
      dashboard.open();
      if (state.view === 'dashboard') state.returnView = 'menu';
      scheduleSync();
      return;
    }
    const selector = kind === 'dock' ? dockSelector : menuSelector;
    const original = all(selector).find((el) => el.dataset.tab === tab);
    if (!original) {
      toast('The game has changed this menu. Switch to the original layout.');
      return;
    }
    dashboard.close();
    state.returnView = 'menu';
    if (kind === 'dock') closeModal();
    fullMap.close();
    state.view = kind === 'dock' ? tab : 'world';
    if (kind !== 'dock' || !original.classList.contains('active')) original.click();
    render();
    scheduleSync();
  }
  function menuButton(original, kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sw-menu-item';
    const tab = controlTab(original);
    button.dataset.swTarget = tab;
    button.dataset.swKind = kind;
    const img = original.querySelector('img');
    if (img) {
      const icon = document.createElement('img');
      icon.src = img.src;
      icon.alt = '';
      button.appendChild(icon);
    }
    const text = document.createElement('span');
    text.textContent = label(original);
    button.appendChild(text);
    button.addEventListener('click', () => originalAction(kind, tab));
    return button;
  }
  function menuGroup(title, items) {
    const section = document.createElement('section');
    section.className = 'sw-menu-group';
    section.setAttribute('aria-label', title);
    const heading = document.createElement('h3');
    heading.className = 'sw-menu-heading';
    heading.textContent = title;
    const grid = document.createElement('div');
    grid.className = 'sw-menu-grid';
    grid.append(...items.map(({ original, kind }) => menuButton(original, kind)));
    section.append(heading, grid);
    return section;
  }
  function syncMenus() {
    syncSleep();
    const gameItems = all(menuSelector).filter((button) => button.dataset.tab !== 'bank');
    const dockItems = all(dockSelector).filter(
      (button) =>
        !['tasks', 'inventory'].includes(button.dataset.tab) &&
        !(
          ['quests', 'diary'].includes(button.dataset.tab) &&
          gameItems.some((item) => controlTab(item) === button.dataset.tab)
        ),
    );
    const signature = [...dockItems, ...gameItems]
      .map((el) => `${controlTab(el)}:${label(el)}:${el.querySelector('img')?.src || ''}`)
      .join('|');
    if (signature !== menuSignature) {
      menuSignature = signature;
      const items = [
        ...dockItems.map((original) => ({ original, kind: 'dock' })),
        ...gameItems.map((original) => ({ original, kind: 'game' })),
      ];
      const remaining = new Set(items);
      ['sw-character-grid', 'sw-game-grid', 'sw-settings-grid'].forEach((id) =>
        $(`#${id}`).replaceChildren(),
      );
      menuGroups.forEach(({ panel, title, tabs }) => {
        const selected = tabs.flatMap((tab) =>
          items.filter((item) => controlTab(item.original) === tab && remaining.has(item)),
        );
        selected.forEach((item) => remaining.delete(item));
        if (selected.length) $(`#${panel}`).appendChild(menuGroup(title, selected));
      });
      if (remaining.size) $('#sw-game-grid').appendChild(menuGroup('More', [...remaining]));
      $('#sw-menu-empty').hidden = !!(dockItems.length || gameItems.length);
    }
    all('.modal-tabs .tab-btn[data-tab]').forEach((el) => {
      const text = label(el);
      if (el.dataset.swLabel !== text) el.dataset.swLabel = text;
    });
    updateNavIcons(renderController);
    assets.schedule();
  }
  function bindControls() {
    $('#sw-sleep-toggle').addEventListener('click', () => originalAction('action', 'sleep'));
    $('#sw-nav [data-sw-view=menu]').addEventListener('click', () => {
      syncSleep();
      assets.schedule();
    });
    window.addEventListener('pagehide', assets.suspend);
    window.addEventListener('pageshow', assets.schedule);
    window.addEventListener('pagehide', () => {
      sleepObserver.disconnect();
      sleepControl = null;
      sleepName = null;
    });
    window.addEventListener('pageshow', syncSleep);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) assets.suspend();
      else assets.schedule();
    });
    all('[data-sw-menu-section]').forEach((button) =>
      button.addEventListener('click', () => {
        const section = button.dataset.swMenuSection;
        all('[data-sw-menu-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.swMenuPanel !== section;
        });
        all('[data-sw-menu-section]').forEach((tab) =>
          tab.setAttribute('aria-pressed', String(tab.dataset.swMenuSection === section)),
        );
        $('#sw-menu').scrollTop = 0;
        render();
      }),
    );
    bindOrientation();
    $('#sw-render-mode').value = renderController?.preferred() || 'original';
    $('#sw-render-mode').addEventListener('change', (event) =>
      renderController?.setMode(event.target.value, true),
    );
    $('#sw-notes-toggle').addEventListener('click', () => {
      const notes = $('.patch-notes-panel');
      if (!notes || notes.style.display === 'none') {
        toast('Patch notes are available on the login screen.');
        return;
      }
      state.view = 'world';
      render();
      setFlag('sw-notes', true);
      toast('Tap World or Menu to close patch notes.');
    });
  }
  async function bindOrientation() {
    const button = $('#sw-orientation-toggle');
    let current;
    try {
      current = await getOrientationPreference();
    } catch (_) {
      return;
    }
    if (!current.supported) return;
    function updateButton() {
      const next = current.orientation === 'portrait' ? 'Landscape' : 'Portrait';
      button.textContent = next;
      button.setAttribute('aria-label', `Switch to ${next.toLowerCase()}`);
    }
    updateButton();
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const next = current.orientation === 'portrait' ? 'landscape' : 'portrait';
        current = await setOrientationPreference(next);
      } catch (_) {
        toast('Could not change screen orientation.');
      } finally {
        updateButton();
        button.disabled = false;
      }
    });
  }
  return { sync: syncMenus, bindControls, updateSleep: syncSleep };
}
