import { $, hasChangedElement } from './dom.js';
export function createUiLifecycle({ state, skills, combat, chat, menu, render, scheduleSync }) {
  let menusDirty = true;
  let structureDirty = true;
  let dockRoot;
  let menuRoot;
  const navObservers = [];
  const structureObservers = [];
  let bodyObserver;
  let uiObserver;
  let shellObserver;
  let combatObserver;
  let ui;
  let modalOpen = document.body.classList.contains('modal-open');
  function watchStructure() {
    structureDirty = false;
    const newDock = $('#ui-container > .panel-tab-bar');
    const newMenu = $('.floating-tab-strip');
    if (newDock !== dockRoot || newMenu !== menuRoot) {
      navObservers.splice(0).forEach((observer) => observer.disconnect());
      dockRoot = newDock;
      menuRoot = newMenu;
      menusDirty = true;
      [dockRoot, menuRoot, $('.modal-tabs')].filter(Boolean).forEach((node) => {
        const observer = new MutationObserver((records) => {
          if (records.some((record) => record.type === 'childList' && record.target === node)) {
            menusDirty = true;
            scheduleSync();
          }
        });
        observer.observe(node, { childList: true });
        navObservers.push(observer);
      });
    }
    structureObservers.splice(0).forEach((observer) => observer.disconnect());
    const modalBody = $('.modal-body');
    const customTab = $('#tab-skillcustom');
    [modalBody, customTab].filter(Boolean).forEach((node) => {
      const observer = new MutationObserver((records) => {
        if (
          hasChangedElement(
            records,
            (el) =>
              el.matches(
                '.skill-custom-tab, .main-layout, .total-content, .history-sidebar, .columns-container, .column, .skill-columns-section',
              ) || el.querySelector('.main-layout'),
          )
        ) {
          skills.invalidate();
          scheduleSync();
        }
      });
      observer.observe(node, { childList: true, subtree: true });
      structureObservers.push(observer);
    });
    combatObserver?.disconnect();
    const combatElement = $('.combat-encounter:not(.chalk-board)');
    if (combatElement) {
      combatObserver = new MutationObserver(combat.update);
      combatObserver.observe(combatElement, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
  }
  function sync() {
    if (structureDirty) watchStructure();
    if (menusDirty) {
      menusDirty = false;
      menu.sync();
    }
  }
  function start() {
    // Watch structural roots; animated HUD text and progress don't need a menu scan.
    bodyObserver = new MutationObserver(() => {
      const nextModalOpen = document.body.classList.contains('modal-open');
      if (nextModalOpen !== modalOpen) {
        modalOpen = nextModalOpen;
        scheduleSync();
      }
      if (document.body.classList.contains('modal-open') && state.view === 'chat') {
        state.view = 'world';
        render();
      }
      combat.update();
      chat.updateVisibility();
      if (document.body.classList.contains('login-active')) scheduleSync();
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    ui = $('#ui-container');
    if (ui) {
      uiObserver = new MutationObserver(() => {
        structureDirty = true;
        scheduleSync();
      });
      uiObserver.observe(ui, { childList: true });
    }
    shellObserver = new MutationObserver((records) => {
      if (hasChangedElement(records, (node) => node.id !== 'sw-shell')) scheduleSync();
    });
    shellObserver.observe(document.body, { childList: true });
  }
  function suspend() {
    navObservers.forEach((observer) => observer.disconnect());
    dockRoot = null;
    menuRoot = null;
    structureObservers.forEach((observer) => observer.disconnect());
    bodyObserver?.disconnect();
    uiObserver?.disconnect();
    combatObserver?.disconnect();
    shellObserver?.disconnect();
  }
  function resume() {
    structureDirty = true;
    menusDirty = true;
    watchStructure();
    if (ui) uiObserver?.observe(ui, { childList: true });
    bodyObserver?.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    shellObserver?.observe(document.body, { childList: true });
  }
  return { start, sync, suspend, resume };
}
