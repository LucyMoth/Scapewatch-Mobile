export function createQuestLayout({ state }) {
  const layouts = new Map();

  function restore(layout, entry) {
    entry.observer.disconnect();
    layout.classList.remove('sw-quest-detail');
    entry.button.remove();
    layouts.delete(layout);
  }

  function showDetail(layout) {
    layout.classList.add('sw-quest-detail');
    layout.querySelector('.quest-detail-side').scrollTop = 0;
  }

  function reflectSelection(layout, entry, entered = false) {
    if (!state.enabled || state.suspended || !layout.isConnected) return;
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
      const entry = { button, tab, observer, shown: false, title: '', id: null };
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
