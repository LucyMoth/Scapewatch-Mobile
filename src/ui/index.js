import shellMarkup from './shell.html';
import { isGamePage, PREFERENCE_KEYS } from '../environment.js';
import { $, blockingOverlay } from './dom.js';
import { createUiLifecycle } from './lifecycle.js';
import { createGeometry } from './layout/geometry.js';
import { createViewport } from './layout/viewport.js';
import { createNavigation } from './components/navigation/index.js';
import { createMenu } from './components/navigation/menu.js';
import { createCombatDetails } from './components/combat/details.js';
import { createChatPreview } from './components/chat/preview.js';
import { createTaskPreviews } from './components/tasks/previews.js';
import { createSkillSections } from './components/skills/sections.js';
import { labelLedgerValues } from './components/ledger/labels.js';
import { createMapGestures } from './components/world/gestures.js';
import { createInitialZoom } from './components/world/initial-zoom.js';
import { aboutMarkup, createAbout } from './components/about/index.js';
import { createFullMap } from './components/world/full-map/index.js';
import { createFullMapGestures } from './components/world/full-map-gestures.js';
import { createItemDetails } from './components/dialogs/item-details.js';
import { createBankLayout } from './components/bank/index.js';
import { createDashboard } from './components/dashboard/index.js';
import { createLedgerLayout } from './components/ledger/index.js';
import { createAppearanceLayout } from './components/appearance/index.js';
import { createUnlocksLayout } from './components/dialogs/unlocks.js';
import { createTreeLayout } from './components/trees/index.js';
import { createEquipmentPicker } from './components/equipment/picker.js';
import { createQuestLayout } from './components/quests/index.js';
import { createBackNavigation } from './components/navigation/back.js';
import { createPlayerStatus } from './components/world/player-status.js';
import { createSettingsLayout } from './components/settings/index.js';
import { createDialogLayout } from './components/dialogs/controls.js';
import { createHiscoresLayout } from './components/hiscores/index.js';
import { createPvpLayout } from './components/combat/pvp.js';

export function initializeMobileUi(css) {
  'use strict';
  if (!isGamePage()) return;
  if (document.getElementById('sw-mobile-style') || window.__swMobileInstalled) return;
  window.__swMobileInstalled = true;

  // Document-start injection can precede the root element.
  function install() {
    const root = document.documentElement;
    const state = {
      enabled: true,
      view: 'world',
      previousView: 'world',
      returnView: 'world',
      suspended: false,
    };
    let syncTimer;
    try {
      state.enabled = localStorage.getItem(PREFERENCE_KEYS.layout) !== 'desktop';
    } catch (_) {}

    const style = document.createElement('style');
    style.id = 'sw-mobile-style';
    style.textContent = css;
    (document.head || root).appendChild(style);

    function setFlag(name, value) {
      if (root.classList.contains(name) !== value) root.classList.toggle(name, value);
    }

    const renderController = window.__swRendering;
    const geometry = createGeometry({ root, state });
    const viewport = createViewport({ root, state, setFlag, scheduleGeometry: geometry.schedule });
    const initialZoom = createInitialZoom({ state });
    const gestures = createMapGestures({ state, blockingOverlay, onInteraction: initialZoom.stop });
    const fullMapGestures = createFullMapGestures({ state, blockingOverlay });
    const itemDetails = createItemDetails({ state });
    const dialogs = createDialogLayout({ state });
    const bank = createBankLayout({ state });
    const ledger = createLedgerLayout({ state });
    const appearance = createAppearanceLayout({ state });
    const unlocks = createUnlocksLayout({ state });
    const trees = createTreeLayout({ state });
    const quests = createQuestLayout({ state });
    const settings = createSettingsLayout({ state });
    const hiscores = createHiscoresLayout({ state });
    const playerStatus = createPlayerStatus({ state });
    const combat = createCombatDetails({ state, setFlag, scheduleGeometry: geometry.schedule });
    const fullMap = createFullMap({
      state,
      setFlag,
      render,
      toast: (message) => navigation.toast(message),
    });
    const dashboard = createDashboard({
      state,
      setFlag,
      render,
      fullMap,
      closeModal: () => navigation.closeModal(),
      toast: (message) => navigation.toast(message),
    });
    const navigation = createNavigation({
      state,
      setFlag,
      render,
      updateCombat: combat.update,
      fullMap,
      dashboard,
    });
    const equipment = createEquipmentPicker({ state, render, toast: navigation.toast });
    const pvp = createPvpLayout({ state, toast: navigation.toast });
    const menu = createMenu({
      state,
      setFlag,
      render,
      scheduleSync,
      toast: navigation.toast,
      renderController,
      fullMap,
      dashboard,
      closeModal: navigation.closeModal,
    });
    const chat = createChatPreview({
      state,
      setFlag,
      scheduleGeometry: geometry.schedule,
      blockingOverlay,
    });
    const tasks = createTaskPreviews();
    const skills = createSkillSections();
    const about = createAbout({ state });
    const backNavigation = createBackNavigation({
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
    });
    const lifecycle = createUiLifecycle({
      state,
      skills,
      combat,
      chat,
      menu,
      render,
      scheduleSync,
    });

    function updatePanels() {
      navigation.update();
      menu.updateSleep();
      dialogs.update();
      bank.update();
      equipment.update();
      ledger.update();
      appearance.update();
      unlocks.update();
      trees.update();
      quests.update();
      settings.update();
      hiscores.update();
      pvp.update();
      playerStatus.update();
      dashboard.update();
    }

    function render() {
      gestures.reset();
      fullMapGestures.reset();
      if (!state.enabled) itemDetails.suspend();
      updatePanels();
      viewport.update();
      fullMap.update();
      renderController?.setMode(state.enabled ? renderController.preferred() : 'original');
      combat.update();
      chat.updateVisibility();
      initialZoom.update();
      about.update();
    }

    function sync() {
      if (!$('#sw-shell')) return;
      lifecycle.sync();
      updatePanels();
      fullMap.update();
      skills.update();
      labelLedgerValues();
      combat.update();
      chat.watch();
      tasks.watch();
      geometry.watch();
      initialZoom.update();
      chat.updateVisibility();
      about.update();
      if (
        document.body.classList.contains('login-active') &&
        state.view !== 'world' &&
        state.view !== 'menu'
      ) {
        state.view = 'world';
        render();
      }
    }

    function scheduleSync() {
      if (!syncTimer)
        syncTimer = setTimeout(() => {
          syncTimer = null;
          sync();
        }, 100);
    }

    function start() {
      if (!document.body || $('#sw-shell')) return;
      const shell = document.createElement('div');
      shell.id = 'sw-shell';
      shell.innerHTML = shellMarkup;
      document.body.appendChild(shell);
      $('#sw-menu').insertAdjacentHTML('beforeend', aboutMarkup);

      navigation.bindControls();
      menu.bindControls();
      chat.bindSettings();
      combat.bindControls();
      lifecycle.start();
      gestures.bind();
      fullMapGestures.bind();
      itemDetails.bind();
      equipment.bind();
      fullMap.bind();
      dashboard.bind();
      trees.bind();
      quests.bind();
      about.bind();
      backNavigation.bind();

      document.addEventListener('click', (event) => {
        navigation.handleDockClick(event);
        combat.handleNativeClick(event);
        navigation.handleHealthBarClick(event);
        scheduleSync();
      });
      window.addEventListener('resize', viewport.update);
      window.addEventListener('orientationchange', viewport.update);
      window.screen.orientation?.addEventListener('change', viewport.update);
      window.visualViewport?.addEventListener('resize', viewport.update);
      window.addEventListener('pagehide', () => {
        navigation.suspend();
        bank.suspend();
        equipment.suspend();
        ledger.suspend();
        appearance.suspend();
        unlocks.suspend();
        trees.suspend();
        quests.suspend();
        settings.suspend();
        playerStatus.suspend();
        hiscores.suspend();
        pvp.suspend();
        itemDetails.suspend();
        dialogs.suspend();
        dashboard.suspend();
        clearTimeout(syncTimer);
        syncTimer = null;
        gestures.reset();
        fullMapGestures.reset();
        fullMap.suspend();
        initialZoom.suspend();
        about.suspend();
        state.suspended = true;
        geometry.suspend();
        lifecycle.suspend();
        chat.suspend();
        tasks.suspend();
      });
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          state.suspended = false;
          lifecycle.resume();
          sync();
        }
      });
      render();
      sync();
    }

    start();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}
