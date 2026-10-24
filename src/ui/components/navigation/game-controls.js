import { all } from '../../dom.js';
export const labels = {
  tasks: 'Tasks',
  inventory: 'Bag',
  skills: 'Skills',
  quests: 'Quests',
  diary: 'Diary',
  equipment: 'Equipment',
  friends: 'Friends',
  barter: 'Barter',
  bank: 'Bank',
  skillcustom: 'Skill setup',
  mobs: 'Monsters',
  pvp: 'PvP',
  smith: 'Smith',
  craft: 'Craft',
  imbue: 'Imbue',
  brew: 'Brew',
  alms: 'Alms',
  unlocks: 'Unlocks',
  raid: 'Raids',
  clan: 'Clan',
  hiscores: 'Hiscores',
  settings: 'Settings',
  customize: 'Appearance',
  ledger: 'Ledger',
  delvetree: 'Delve',
  fortifytree: 'Fortify',
  dashboard: 'Dashboard',
  map: 'Map',
};
export const dockRootSelector = ':is(#ui-container, #hud-layer) > .panel-tab-bar';
export const dockSelector = `${dockRootSelector} .panel-tab-btn[data-tab]`;
export const menuSelector =
  '.floating-tab-strip .floating-tab-btn[data-tab], .floating-tab-strip .dashboard-launcher';
export function controlTab(el) {
  return el.dataset.tab || (el.classList.contains('dashboard-launcher') ? 'dashboard' : '');
}
export function dock(tab) {
  return all(dockSelector).find((el) => el.dataset.tab === tab);
}
export function gameMenu(tab) {
  return all(menuSelector).find((el) => el.dataset.tab === tab);
}
export function label(el) {
  return (
    labels[controlTab(el)] ||
    el.querySelector('img')?.alt ||
    el.querySelector('.floating-tab-tooltip, .tab-tooltip')?.textContent?.trim() ||
    el.dataset.tab
  );
}
export function updateNavIcons(renderController) {
  const fallbacks = {
    world: '/assets/icons/ui/map.png',
    map: '/assets/icons/ui/map.png',
    tasks: '/assets/icons/ui/tasks.png',
    inventory: '/assets/icons/ui/inventory.png',
    bank: '/assets/icons/ui/bank.png',
    skills: '/assets/icons/skills/levels.png',
    chat: '/assets/icons/ui/chat.png',
    menu: '/assets/icons/ui/settings.png',
  };
  const paths = [];
  all('#sw-nav button').forEach((button) => {
    const key = button.dataset.swView;
    const original = (dock(key) || gameMenu(key))?.querySelector('img');
    const url = original?.src || new URL(fallbacks[key], location.href).href;
    const glyph = button.querySelector('.sw-nav-icon');
    if (glyph.dataset.url !== url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.decoding = 'async';
      glyph.replaceChildren(img);
      glyph.dataset.url = url;
    }
    paths.push(url);
  });
  renderController?.preloadIcons(paths);
}
