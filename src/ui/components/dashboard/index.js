import { $ } from '../../dom.js';

export function createDashboard({ state, setFlag, render, fullMap, closeModal, toast }) {
  let panel;
  const observer = new MutationObserver(update);

  function nativeVisible() {
    return !!panel?.isConnected && panel.style.display !== 'none';
  }

  function restoreContent() {
    if (panel?.classList.contains('dashboard-minimized'))
      panel.querySelector('.dashboard-titlebar-min')?.click();
  }

  function open() {
    updatePanel();
    const launcher = $('.floating-tab-strip .dashboard-launcher');
    if (!panel || !launcher) {
      toast('Dashboard is not available yet.');
      return;
    }
    if (launcher.classList.contains('hidden')) {
      toast('Enable Dashboard in the game settings first.');
      return;
    }
    closeModal();
    fullMap.close();
    if (!nativeVisible()) launcher.click();
    if (!nativeVisible()) {
      toast('Enable Dashboard in the game settings first.');
      return;
    }
    restoreContent();
    state.view = 'dashboard';
    render();
  }

  function close() {
    if (nativeVisible()) panel.querySelector('.dashboard-titlebar-close')?.click();
  }

  function updatePanel() {
    const next = $('.dashboard-panel');
    if (next === panel) return;
    observer.disconnect();
    panel = next;
    if (panel && !state.suspended)
      observer.observe(panel, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function update() {
    if (state.suspended) return;
    updatePanel();
    const login = document.body.classList.contains('login-active');
    if (login) close();
    const active = nativeVisible() && !login;
    if (state.enabled && active && !['dashboard', 'menu'].includes(state.view)) {
      fullMap.close();
      state.view = 'dashboard';
      render();
      return;
    }
    if (!active && state.view === 'dashboard') {
      state.view = 'world';
      render();
      return;
    }
    const screen = state.enabled && state.view === 'dashboard' && active;
    setFlag('sw-dashboard', screen);
    if (screen) restoreContent();
  }

  function bind() {
    window.addEventListener(
      'pointerdown',
      (event) => {
        if (!state.enabled || state.suspended || state.view !== 'dashboard') return;
        if (event.target.closest?.('.dashboard-titlebar') && !event.target.closest('button'))
          event.stopPropagation();
      },
      true,
    );
  }

  function suspend() {
    observer.disconnect();
    panel = null;
  }

  return { open, close, update, bind, suspend };
}
