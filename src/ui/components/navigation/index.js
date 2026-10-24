import { $, all, visible } from '../../dom.js';
import { PREFERENCE_KEYS } from '../../../environment.js';
import { dock, dockRootSelector, dockSelector, gameMenu, labels } from './game-controls.js';
export function createNavigation({ state, setFlag, render, updateCombat, fullMap, dashboard }) {
  let toastTimer;
  function toast(message) {
    const node = $('#sw-toast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (node.hidden = true), 3200);
  }
  function closeModal() {
    const overlay = $('.modal-overlay');
    if (visible(overlay)) overlay.querySelector('.modal-close')?.click();
  }
  function choose(next) {
    setFlag('sw-notes', false);
    if (next === 'menu') {
      state.previousView = state.view === 'menu' ? state.previousView : state.view;
      state.view = state.view === 'menu' ? state.previousView : 'menu';
      render();
      return;
    }
    state.returnView = 'world';
    if (next !== 'world' && document.body.classList.contains('login-active')) {
      toast('Sign in to Scapewatch first.');
      return;
    }
    dashboard.close();
    if (next === 'bank') {
      const target = gameMenu('bank');
      if (!target) {
        toast('Bank is not available yet.');
        return;
      }
      const open = visible($('.modal-overlay')) && $('#tab-bank')?.classList.contains('active');
      fullMap.close();
      state.view = 'world';
      if (open) closeModal();
      else target.click();
      render();
      updateCombat();
      return;
    }
    closeModal();
    if (next === 'map') {
      if (state.view === 'map') {
        fullMap.close();
        state.view = 'world';
      } else if (fullMap.open()) state.view = 'map';
      render();
      updateCombat();
      return;
    }
    fullMap.close();
    if (next !== 'world' && state.view === next) {
      state.view = 'world';
      render();
      return;
    }
    if (['tasks', 'inventory', 'skills'].includes(next)) {
      const target = dock(next);
      if (!target) {
        toast('This panel is not available yet.');
        return;
      }
      if (!target.classList.contains('active')) target.click();
    }
    if (next === 'chat') {
      const panel = $('#chat-panel');
      if (!panel) {
        toast('Chat is not available yet.');
        return;
      }
      // A deliberate chat-navigation tap expands the original minimized chat.
      if (panel.classList.contains('chat-minimized'))
        panel.querySelector('.chat-toggle-btn')?.click();
    }
    state.view = next;
    render();
    updateCombat();
  }
  function update() {
    const secondary = ['skills', 'quests', 'diary', 'equipment', 'friends', 'barter'].includes(
      state.view,
    );
    const secondaryOpen = state.enabled && secondary && !visible($('.modal-overlay'));
    setFlag('sw-mobile', state.enabled);
    setFlag('sw-world', state.view === 'world' || state.view === 'menu');
    setFlag('sw-chat', state.view === 'chat');
    setFlag('sw-menu-open', state.enabled && state.view === 'menu');
    setFlag('sw-panel-open', state.enabled && !['world', 'menu'].includes(state.view));
    setFlag('sw-secondary-panel', secondaryOpen);
    $('#sw-secondary-header').hidden = !secondaryOpen;
    $('#sw-secondary-title').textContent = labels[state.view] || 'Panel';
    $('#sw-layout-toggle').textContent = state.enabled ? 'Original UI' : 'Mobile UI';
    $('#sw-layout-toggle').setAttribute('aria-pressed', String(state.enabled));
    $('#sw-menu').hidden = !state.enabled || state.view !== 'menu';
    const bankOpen =
      state.view !== 'menu' &&
      visible($('.modal-overlay')) &&
      $('#tab-bank')?.classList.contains('active');
    const activeView = bankOpen ? 'bank' : state.view;
    $('#sw-view-title').textContent =
      labels[activeView] || { world: 'World', chat: 'Chat', menu: 'Menu' }[activeView] || 'Panel';
    all('#sw-nav button').forEach((el) =>
      el.setAttribute('aria-current', el.dataset.swView === activeView ? 'page' : 'false'),
    );
  }
  function bindControls() {
    $('#sw-secondary-close').addEventListener('click', () => choose('world'));
    const nav = $('#sw-nav');
    [
      ['map', 'Map', '◎'],
      ['tasks', 'Tasks', '☷'],
      ['inventory', 'Bag', '▣'],
      ['bank', 'Bank', '▥'],
      ['chat', 'Chat', '☏'],
      ['menu', 'Menu', '☰'],
    ].forEach(([key, text, icon]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.swView = key;
      const glyph = document.createElement('span');
      glyph.className = 'sw-nav-icon';
      glyph.textContent = icon;
      glyph.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('span');
      caption.className = 'sw-nav-label';
      caption.textContent = text;
      button.append(glyph, caption);
      button.addEventListener('click', () => choose(key));
      nav.appendChild(button);
    });
    $('#sw-layout-toggle').addEventListener('click', () => {
      state.enabled = !state.enabled;
      if (!state.enabled && state.view === 'menu') state.view = state.previousView;
      try {
        localStorage.setItem(PREFERENCE_KEYS.layout, state.enabled ? 'mobile' : 'desktop');
      } catch (_) {}
      render();
    });
  }
  function handleDockClick(event) {
    const button = event.target.closest?.('.panel-tab-btn');
    if (button && button.closest(dockRootSelector)) {
      if (state.enabled) dashboard.close();
      reflectNativePanel(button.dataset.tab);
      render();
    }
  }
  function reflectNativePanel(preferred = state.view) {
    const active = all(dockSelector).filter((node) => node.classList.contains('active'));
    const selected = active.find((node) => node.dataset.tab === preferred) || active[0];
    state.view = selected?.dataset.tab || 'world';
  }
  function handleHealthBarClick(event) {
    // Reflect the native selection without issuing a second toggle/action.
    if (event.target.closest?.('.hp-bar')?.closest('#ui-container')) {
      if (state.enabled) dashboard.close();
      reflectNativePanel();
      render();
    }
  }
  function suspend() {
    clearTimeout(toastTimer);
  }
  return {
    update,
    bindControls,
    handleDockClick,
    handleHealthBarClick,
    closeModal,
    toast,
    suspend,
  };
}
