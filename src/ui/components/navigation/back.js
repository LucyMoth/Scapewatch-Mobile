import { $, all } from '../../dom.js';

export function createBackNavigation({
  state,
  setFlag,
  render,
  fullMap,
  dashboard,
  combat,
  about,
  itemDetails,
  equipment,
  quests,
  mobSelection,
}) {
  let navigating = false;

  function displayed(node) {
    return !!(node?.isConnected && node.getClientRects().length);
  }

  function returnTo(view) {
    state.returnView = 'world';
    fullMap.close();
    dashboard.close();
    state.view = view;
    render();
  }

  function navigateBack() {
    const confirmation = $('.ctx-confirm-overlay');
    if (displayed(confirmation)) {
      confirmation.querySelector('.ctx-confirm-no')?.click();
      return true;
    }
    if (itemDetails.back()) return true;
    const receipt = $('.ledger-return-overlay .ledger-card-foot .ledger-btn-primary');
    if (displayed(receipt)) {
      receipt.click();
      return true;
    }
    if (all('.ledger-night, .sleep-overlay').some(displayed)) return true;
    if (about.back()) return true;
    const credits = $('.cc-credits-overlay .cc-credits-close');
    if (displayed(credits)) {
      credits.click();
      return true;
    }
    const combatDefaults = $('.cd-popup-overlay .cd-popup-close');
    if (displayed(combatDefaults)) {
      combatDefaults.click();
      return true;
    }
    const popup = all(
      '.world-switcher, .player-ctx-menu, .chat-room-menu, .chat-category-menu, .ingame-hud-offline-pop, .bank-consume-menu, .bank-filter-menu, .potions-filter-menu',
    ).find(displayed);
    if (popup) {
      document.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [],
          targetTouches: [],
          changedTouches: [],
          bubbles: true,
          cancelable: true,
        }),
      );
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }
    if (state.view === 'menu') {
      state.view = state.previousView;
      render();
      return true;
    }
    const calculator = $('.gc-modal-overlay .gc-modal-close');
    if (displayed(calculator)) {
      calculator.click();
      return true;
    }
    if (quests.back() || mobSelection.back() || equipment.back()) return true;
    const close = $('.modal-overlay .modal-close');
    if (displayed(close)) {
      const view = state.view === 'world' ? state.returnView : state.view;
      close.click();
      state.view = view;
      state.returnView = 'world';
      render();
      return true;
    }
    if (state.view !== 'world') {
      returnTo(state.returnView);
      return true;
    }
    if (combat.back()) return true;
    if (document.documentElement.classList.contains('sw-notes')) {
      setFlag('sw-notes', false);
      return true;
    }
    const info = $('.ingame-hud-info.expanded');
    if (displayed(info)) {
      info.click();
      return true;
    }
    return false;
  }

  function back() {
    if (!state.enabled || state.suspended || navigating) return false;
    navigating = true;
    try {
      return navigateBack();
    } finally {
      navigating = false;
    }
  }

  function bind() {
    window.__swMobileBack = back;
    document.addEventListener(
      'keydown',
      (event) => {
        if (!event.defaultPrevented && event.key === 'Escape' && back()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    document.addEventListener('click', (event) => {
      if (
        state.view === 'world' &&
        event.target.closest?.('.modal-close, .dashboard-titlebar-close') &&
        !displayed($('.modal-overlay'))
      )
        state.returnView = 'world';
    });
  }

  return { bind, back };
}
