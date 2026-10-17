import { visible } from '../../dom.js';
import { gameMenu } from '../navigation/game-controls.js';

const slots = {
  head: 'Head',
  cape: 'Cape',
  neck: 'Neck',
  ammo: 'Ammo',
  mainhand: 'Mainhand',
  body: 'Body',
  offhand: 'Offhand',
  hands: 'Gloves',
  belt: 'Belt',
  ring1: 'Ring (Main)',
  legs: 'Legs',
  ring2: 'Ring (Off)',
  special: 'Special',
};

export function createEquipmentPicker({ state, render, toast }) {
  const attributes = new Map();
  let picker;
  let observer;
  let selectedLoadout;

  function saveAttribute(node, name, value) {
    let saved = attributes.get(node);
    if (!saved) attributes.set(node, (saved = new Map()));
    if (!saved.has(name)) saved.set(name, node.getAttribute(name));
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function restoreAttributes() {
    for (const [node, saved] of attributes) {
      for (const [name, value] of saved) {
        if (value === null) node.removeAttribute(name);
        else node.setAttribute(name, value);
      }
    }
    attributes.clear();
  }

  function slotName(node) {
    return Object.keys(slots).find((name) => node.classList.contains(`slot-${name}`));
  }

  function setSearch(input, value) {
    if (!input?.isConnected || input.value === value) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function rememberLoadout(button) {
    const selector = button?.closest('.equipment-panel .loadout-sel');
    const family = selector?.querySelector('.loadout-sel-family.active')?.dataset.family;
    if (button?.dataset.loadout && family) {
      selectedLoadout = { id: button.dataset.loadout, family };
    }
  }

  function restore(close = false) {
    observer?.disconnect();
    observer = null;
    if (picker) {
      const current = picker;
      picker = null;
      current.tab.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
      );
      current.tab.classList.remove('sw-equipment-picker');
      current.overlay.classList.remove('sw-equipment-picker-open');
      current.title.remove();
      current.empty.remove();
      current.tab.querySelectorAll('.sw-equipment-option-name').forEach((node) => node.remove());
      if (current.tab.isConnected) {
        current.tab.querySelector('.bank-slot-filter-clear')?.click();
        current.filter?.isConnected && current.filter.click();
        setSearch(current.search, current.searchValue);
        if (current.slot) {
          current.tab.querySelector(`.paperdoll .slot-${current.slot}`)?.click();
        }
        if (current.advanced?.isConnected && current.advancedEnabled) current.advanced.click();
        if (current.scroll?.isConnected) {
          current.scroll.scrollTop = current.scrollTop;
          current.scroll.scrollLeft = current.scrollLeft;
        }
        if (close && current.tab.classList.contains('active') && visible(current.overlay)) {
          current.overlay.querySelector('.modal-close')?.click();
        }
      }
    }
    restoreAttributes();
  }

  function refreshOptions() {
    if (!picker) return;
    const options = Array.from(picker.tab.querySelectorAll('.bank-grid .bank-slot')).filter(
      (node) => !node.matches('.empty, .bank-placeholder') && visible(node),
    );
    for (const option of options) {
      if (option.querySelector('.sw-equipment-option-name')) continue;
      const label = document.createElement('span');
      label.className = 'sw-equipment-option-name';
      label.textContent = option.querySelector('img')?.alt || '';
      option.appendChild(label);
    }
    picker.empty.hidden = options.length > 0;
  }

  function open(slot) {
    const name = slotName(slot);
    const target = gameMenu('bank');
    rememberLoadout(document.querySelector('.equipment-panel .loadout-sel-slot.active'));
    if (!selectedLoadout) {
      toast('Select a loadout first.');
      return;
    }
    if (!name || !target) {
      toast('Equipment selection is not available yet.');
      return;
    }
    target.click();
    const tab = document.getElementById('tab-bank');
    const overlay = tab?.closest('.modal-overlay');
    if (!visible(overlay) || !tab?.classList.contains('active')) return;
    const selector = tab.querySelector('.equip-side .loadout-sel');
    const family = Array.from(selector?.querySelectorAll('.loadout-sel-family') || []).find(
      (node) => node.dataset.family === selectedLoadout.family,
    );
    family?.click();
    const loadout = Array.from(selector?.querySelectorAll('.loadout-sel-slot') || []).find(
      (node) => node.dataset.loadout === selectedLoadout.id,
    );
    if (!loadout) {
      overlay.querySelector('.modal-close')?.click();
      toast('This loadout is not available in Bank yet.');
      return;
    }
    loadout.click();
    const matching = tab?.querySelector(`.paperdoll .slot-${name}`);
    if (!matching || !visible(overlay) || !tab.classList.contains('active')) return;

    const search = tab.querySelector('.bank-search');
    const advanced = tab.querySelector('.bank-filter-btn-check.checked');
    const scroll = tab.closest('.modal-body');
    const title = document.createElement('div');
    title.className = 'sw-equipment-picker-title';
    title.textContent = `Choose ${slots[name]}`;
    const empty = document.createElement('p');
    empty.className = 'sw-equipment-picker-empty';
    empty.textContent = `No ${slots[name].toLowerCase()} equipment in your Bank.`;
    picker = {
      tab,
      overlay,
      title,
      empty,
      search,
      searchValue: search?.value || '',
      filter: tab.querySelector('.bank-filter-btn.active'),
      slot: slotName(tab.querySelector('.paperdoll .slot-filter-active') || document.body),
      advanced,
      advancedEnabled: !!advanced,
      scroll,
      scrollTop: scroll?.scrollTop || 0,
      scrollLeft: scroll?.scrollLeft || 0,
    };
    setSearch(search, '');
    tab.querySelector('.bank-filter-btn[data-filter=equipment]')?.click();
    advanced?.click();
    if (!matching.classList.contains('slot-filter-active')) matching.click();
    overlay.classList.add('sw-equipment-picker-open');
    tab.classList.add('sw-equipment-picker');
    overlay.querySelector('.modal-header')?.prepend(title);
    tab.querySelector('.bank-grid-scroll')?.appendChild(empty);
    const close = overlay.querySelector('.modal-close');
    if (close) saveAttribute(close, 'aria-label', 'Back to Equipment');
    slot.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: tab }));
    observer = new MutationObserver(refreshOptions);
    const grid = tab.querySelector('.bank-grid');
    if (grid) {
      observer.observe(grid, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
    refreshOptions();
    if (scroll) {
      scroll.scrollTop = 0;
      scroll.scrollLeft = 0;
    }
    render();
  }

  function update() {
    if (!state.enabled || state.suspended || document.body.classList.contains('login-active')) {
      restore(true);
      if (!state.enabled || document.body.classList.contains('login-active'))
        selectedLoadout = null;
      return;
    }
    for (const node of attributes.keys()) {
      if (!node.isConnected) attributes.delete(node);
    }
    rememberLoadout(document.querySelector('.equipment-panel .loadout-sel-slot.active'));
    if (
      picker &&
      (state.view !== 'equipment' ||
        !picker.tab.isConnected ||
        !picker.tab.classList.contains('active') ||
        !visible(picker.overlay))
    ) {
      restore(state.view === 'menu');
    }
    const doll = document.querySelector('.equipment-panel .equip-panel-paperdoll');
    if (!doll) return;
    // The native tooltip manager supports direct controls through this attribute.
    saveAttribute(doll, 'data-no-tap-first', '1');
    doll.querySelectorAll('.inv-slot').forEach((node) => {
      const name = slotName(node);
      if (!name) return;
      saveAttribute(node, 'role', 'button');
      saveAttribute(node, 'tabindex', '0');
      saveAttribute(node, 'aria-label', `Change ${slots[name]} equipment`);
    });
  }

  function bind() {
    document.addEventListener(
      'click',
      (event) => {
        if (!state.enabled || state.suspended || event.defaultPrevented) return;
        rememberLoadout(event.target.closest?.('.equipment-panel .loadout-sel-slot'));
      },
      { capture: true },
    );
    document.addEventListener('click', (event) => {
      if (!state.enabled || state.suspended || state.view !== 'equipment') return;
      const option = event.target.closest?.('.bank-grid .bank-slot:not(.empty, .bank-placeholder)');
      if (picker?.tab.contains(option) && !event.defaultPrevented) {
        restore(true);
        render();
        return;
      }
      const slot = event.target.closest?.('.equipment-panel .equip-panel-paperdoll .inv-slot');
      if (slot) open(slot);
    });
    document.addEventListener('keydown', (event) => {
      if (!state.enabled || state.suspended || state.view !== 'equipment') return;
      const slot = event.target.closest?.('.equipment-panel .equip-panel-paperdoll .inv-slot');
      if (slot && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        open(slot);
      }
    });
  }

  function back() {
    if (!picker) return false;
    const open =
      picker.tab.isConnected &&
      picker.tab.classList.contains('active') &&
      visible(picker.overlay) &&
      picker.overlay.getClientRects().length > 0 &&
      picker.tab.getClientRects().length > 0 &&
      getComputedStyle(picker.tab).visibility === 'visible';
    restore(open);
    render();
    return open;
  }

  return { update, bind, back, suspend: () => restore(true) };
}
