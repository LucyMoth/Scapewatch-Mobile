import { $, all, visible } from '../../dom.js';
export function createCombatDetails({ state, setFlag, scheduleGeometry }) {
  let combatSide = 'player';
  let combatDetails = false;
  let combatNode;
  function updateCombat() {
    const combat = $('.combat-encounter:not(.chalk-board)');
    const active =
      state.enabled &&
      state.view === 'world' &&
      visible(combat) &&
      !document.body.classList.contains('login-active') &&
      !document.body.classList.contains('modal-open');
    if (combat !== combatNode) {
      combatNode = combat;
      combatDetails = false;
    }
    if (!combat || !visible(combat)) combatDetails = false;
    const tabs = $('#sw-combat-tabs');
    if (!tabs) return;
    tabs.hidden = !active || !combatDetails;
    $('#sw-combat-toggle').hidden = !active || combatDetails;
    setFlag('sw-combat-player', active && combatSide === 'player');
    setFlag('sw-combat-opponent', active && combatSide === 'opponent');
    setFlag('sw-combat-details', active && combatDetails);
    all('#sw-combat-tabs [data-sw-combat]').forEach((button) =>
      button.setAttribute('aria-selected', String(button.dataset.swCombat === combatSide)),
    );
    scheduleGeometry();
  }
  function openNativeCombatPanel() {
    const combat = $('.combat-encounter:not(.chalk-board)');
    if (!state.enabled || state.view !== 'world' || !visible(combat)) return;
    const panel = combat.querySelector(
      combatSide === 'player' ? '#ce-player-panel' : '#ce-mob-panel',
    );
    if (!panel?.classList.contains('panel-hidden')) return;
    // Remembered/closed native panels also hide their tabs. A deliberate
    // Details/subject tap opens the original selected tab through its original
    // UI handler, rather than overriding its hidden/content classes.
    const wrapper = panel.closest('.panel-wrapper');
    (
      wrapper?.querySelector('.panel-tab.active') ||
      wrapper?.querySelector('.panel-tab[data-tab="stats"]')
    )?.click();
  }
  function bindControls() {
    $('#sw-combat-toggle').addEventListener('click', () => {
      combatDetails = true;
      openNativeCombatPanel();
      updateCombat();
    });
    $('#sw-combat-close').addEventListener('click', () => {
      combatDetails = false;
      updateCombat();
    });
    all('#sw-combat-tabs [data-sw-combat]').forEach((button) =>
      button.addEventListener('click', () => {
        combatSide = button.dataset.swCombat;
        openNativeCombatPanel();
        updateCombat();
      }),
    );
  }
  function handleNativeClick(event) {
    const combatTab = event.target.closest?.('.combat-encounter .panel-tab');
    if (state.enabled && combatDetails && combatTab) {
      const panel = combatTab.closest('.panel-wrapper')?.querySelector('.combat-panel');
      if (panel?.classList.contains('panel-hidden')) {
        combatDetails = false;
        updateCombat();
      }
    }
  }
  function back() {
    if (!combatDetails) return false;
    combatDetails = false;
    updateCombat();
    return true;
  }
  return { update: updateCombat, bindControls, handleNativeClick, back };
}
