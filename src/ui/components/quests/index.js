import { PREFERENCE_KEYS } from '../../../environment.js';

export function createQuestLayout({ state }) {
  const layouts = new Map();
  const filters = ['continue', 'all', 'available', 'progress', 'completed', 'locked'];
  let filter = 'continue';
  let applyingFilter = false;
  try {
    const saved = localStorage.getItem(PREFERENCE_KEYS.questFilter);
    if (filters.includes(saved)) filter = saved;
  } catch (_) {}

  function filterButton(layout, value) {
    return layout.querySelector(`.quest-filter-btn[data-filter="${value}"]`);
  }

  function applyFilter(layout, entry) {
    const native = filter === 'continue' ? 'all' : filter;
    const button = filterButton(layout, native);
    if (!button) return;
    if (entry.filter !== native) {
      applyingFilter = true;
      button.click();
      applyingFilter = false;
      entry.filter = native;
    }
    layout.classList.toggle('sw-quest-continue', filter === 'continue');
    entry.continueButton.classList.toggle('active', filter === 'continue');
    button.classList.toggle('active', filter !== 'continue');
  }

  function restore(layout, entry) {
    entry.observer.disconnect();
    layout.classList.remove('sw-quest-detail', 'sw-quest-continue');
    entry.button.remove();
    entry.continueButton.remove();
    entry.empty.remove();
    if (layout.isConnected && entry.originalFilter !== entry.filter) {
      applyingFilter = true;
      filterButton(layout, entry.originalFilter)?.click();
      applyingFilter = false;
    } else if (layout.isConnected)
      filterButton(layout, entry.originalFilter)?.classList.add('active');
    layouts.delete(layout);
  }

  function showDetail(layout) {
    layout.classList.add('sw-quest-detail');
    layout.querySelector('.quest-detail-side').scrollTop = 0;
  }

  function reflectSelection(layout, entry, entered = false) {
    if (!state.enabled || state.suspended || !layout.isConnected) return;
    applyFilter(layout, entry);
    const title = layout.querySelector('.quest-detail-title')?.textContent.trim() || '';
    const id = layout.querySelector('.quest-row.selected')?.dataset.questId;
    const shown = !!layout.getClientRects().length && entry.tab.classList.contains('active');
    const changed = title !== entry.title || (id && entry.id && id !== entry.id);
    if (title && shown && (changed || entered || !entry.shown)) showDetail(layout);
    else if (!title) layout.classList.remove('sw-quest-detail');
    entry.id = id || (title === entry.title ? entry.id : null);
    entry.title = title;
    entry.shown = shown;
  }

  function update() {
    layouts.forEach((entry, layout) => {
      if (!state.enabled || state.suspended || !layout.isConnected) restore(layout, entry);
    });
    if (!state.enabled || state.suspended) return;
    document.querySelectorAll('#tab-quests .quest-layout').forEach((layout) => {
      if (layouts.has(layout)) return;
      const detail = layout.querySelector('.quest-detail-side');
      if (!detail) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sw-quest-back';
      button.textContent = '‹ Quests';
      button.addEventListener('click', () => layout.classList.remove('sw-quest-detail'));
      layout.insertBefore(button, layout.firstChild);
      const tab = layout.closest('#tab-quests');
      const overlay = tab.closest('.modal-overlay');
      const continueButton = document.createElement('button');
      continueButton.type = 'button';
      continueButton.className = 'quest-filter-btn';
      continueButton.dataset.swQuestFilter = 'continue';
      continueButton.textContent = 'Continue';
      continueButton.title = 'In progress and available quests';
      const toolbar = layout.querySelector('.quest-list-toolbar');
      toolbar?.insertBefore(continueButton, toolbar.querySelector('.quest-filter-btn'));
      const empty = document.createElement('div');
      empty.className = 'sw-quest-empty';
      empty.setAttribute('role', 'status');
      empty.textContent =
        'No quests to continue. Choose All to browse completed and locked quests.';
      const list = layout.querySelector('.quest-list-side');
      list?.insertBefore(empty, list.querySelector('.quest-list-scroll'));
      const observer = new MutationObserver((records) => {
        const entered = records.some(
          (record) =>
            (record.target === overlay && record.attributeName === 'style') ||
            (record.target === tab &&
              record.attributeName === 'class' &&
              !record.oldValue?.split(/\s+/).includes('active')),
        );
        reflectSelection(layout, entry, entered);
      });
      const originalFilter =
        layout.querySelector('.quest-filter-btn.active')?.dataset.filter || 'all';
      const entry = {
        button,
        tab,
        observer,
        continueButton,
        empty,
        originalFilter,
        filter: originalFilter,
        shown: false,
        title: '',
        id: null,
      };
      layouts.set(layout, entry);
      observer.observe(layout, { childList: true, subtree: true });
      const attributes = {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
        attributeOldValue: true,
      };
      observer.observe(tab, attributes);
      if (overlay) observer.observe(overlay, attributes);
      reflectSelection(layout, entry);
    });
  }

  function back() {
    const layout = document.querySelector('#tab-quests.active .sw-quest-detail');
    if (
      !state.enabled ||
      state.suspended ||
      document.documentElement.classList.contains('sw-landscape') ||
      !layout?.getClientRects().length
    )
      return false;
    layout.classList.remove('sw-quest-detail');
    return true;
  }

  function bind() {
    document.addEventListener(
      'click',
      (event) => {
        if (!state.enabled || state.suspended) return;
        const option = event.target.closest?.('#tab-quests .quest-filter-btn');
        if (option && !applyingFilter) {
          const value = option.dataset.swQuestFilter || option.dataset.filter;
          if (filters.includes(value)) {
            filter = value;
            try {
              localStorage.setItem(PREFERENCE_KEYS.questFilter, filter);
            } catch (_) {}
            const layout = option.closest('.quest-layout');
            const entry = layouts.get(layout);
            if (entry) {
              if (value !== 'continue') entry.filter = value;
              queueMicrotask(() => {
                if (layouts.has(layout)) applyFilter(layout, entry);
              });
            }
          }
        }
        const row = event.target.closest?.('#tab-quests .quest-row');
        if (!row) return;
        const layout = row.closest('.quest-layout');
        queueMicrotask(() => {
          if (!state.enabled || state.suspended || !layout.isConnected) return;
          if (!layouts.has(layout)) update();
          if (!layouts.has(layout)) return;
          showDetail(layout);
        });
      },
      true,
    );
  }

  function suspend() {
    layouts.forEach((entry, layout) => restore(layout, entry));
  }

  return { update, bind, back, suspend };
}
