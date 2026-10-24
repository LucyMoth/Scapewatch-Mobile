export function createMobSelectionLayout({ state }) {
  const layouts = new Map();
  const detailLayouts = new WeakSet();

  function restore(layout, entry) {
    entry.observer.disconnect();
    entry.masters.forEach((master, row) => {
      master.button.remove();
      row.classList.remove('sw-slay-tier', 'sw-slay-targets-open');
    });
    entry.button.remove();
    layout.classList.remove('sw-mob-layout', 'sw-mob-detail');
    layouts.delete(layout);
  }

  function updateMasters(layout, entry) {
    entry.masters.forEach((master, row) => {
      if (!layout.contains(row)) {
        master.button.remove();
        row.classList.remove('sw-slay-tier', 'sw-slay-targets-open');
        entry.masters.delete(row);
      }
    });
    layout.querySelectorAll('.slay-masters-board .tier-row').forEach((row) => {
      const panel = row.querySelector('.master-panel');
      if (!panel) return;
      let master = entry.masters.get(row);
      const selected = panel.classList.contains('selected-master');
      if (!master) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sw-slay-targets-toggle';
        master = { button, selected: false };
        button.addEventListener('click', () => {
          const open = row.classList.toggle('sw-slay-targets-open');
          button.setAttribute('aria-expanded', String(open));
        });
        panel.append(button);
        row.classList.add('sw-slay-tier');
        entry.masters.set(row, master);
        entry.observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
      }
      if (selected && !master.selected) row.classList.add('sw-slay-targets-open');
      master.selected = selected;
      const count = row.querySelectorAll('.mob-card').length;
      const label = 'Possible targets (' + count + ')';
      if (master.button.textContent !== label) master.button.textContent = label;
      master.button.setAttribute(
        'aria-expanded',
        String(row.classList.contains('sw-slay-targets-open')),
      );
    });
  }

  function showList(layout, entry) {
    detailLayouts.delete(layout);
    layout.classList.remove('sw-mob-detail');
    const scroll = layout.querySelector('.mob-list-scroll');
    if (scroll) scroll.scrollTop = entry.scrollTop;
  }

  function showDetail(layout) {
    detailLayouts.add(layout);
    layout.classList.add('sw-mob-detail');
    const detail = layout.querySelector('.mob-detail-side');
    if (detail) detail.scrollTop = 0;
  }

  function reflectSelection(layout, entry) {
    if (!state.enabled || state.suspended || !layout.isConnected) return;
    updateMasters(layout, entry);
    const title = layout.querySelector('.mob-encounter-name')?.textContent.trim() || '';
    const shown = !!layout.getClientRects().length && entry.tab.classList.contains('active');
    if (title && shown && (title !== entry.title || !entry.shown)) showDetail(layout);
    entry.title = title;
    entry.shown = shown;
  }

  function update() {
    layouts.forEach((entry, layout) => {
      if (!state.enabled || state.suspended || !layout.isConnected) restore(layout, entry);
    });
    if (!state.enabled || state.suspended) return;
    document.querySelectorAll('#tab-mobs .mob-layout').forEach((layout) => {
      if (layouts.has(layout) || !layout.querySelector('.mob-detail-side')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sw-mob-back';
      button.textContent = '‹ Mobs';
      const tab = layout.closest('#tab-mobs');
      const observer = new MutationObserver(() => reflectSelection(layout, entry));
      const entry = {
        button,
        tab,
        observer,
        title: '',
        shown: false,
        scrollTop: 0,
        masters: new Map(),
      };
      button.addEventListener('click', () => showList(layout, entry));
      layout.prepend(button);
      layout.classList.add('sw-mob-layout');
      if (detailLayouts.has(layout)) showDetail(layout);
      layouts.set(layout, entry);
      observer.observe(layout, { childList: true, subtree: true });
      const attributes = { attributes: true, attributeFilter: ['class', 'style', 'hidden'] };
      observer.observe(tab, attributes);
      const overlay = tab.closest('.modal-overlay');
      if (overlay) observer.observe(overlay, attributes);
      reflectSelection(layout, entry);
    });
  }

  function back() {
    const layout = document.querySelector('#tab-mobs.active .sw-mob-detail');
    if (
      !state.enabled ||
      state.suspended ||
      document.documentElement.classList.contains('sw-landscape') ||
      !layout?.getClientRects().length
    )
      return false;
    showList(layout, layouts.get(layout));
    return true;
  }

  function bind() {
    document.addEventListener(
      'click',
      (event) => {
        if (!state.enabled || state.suspended || event.target.closest?.('.mob-row-map-icon'))
          return;
        const row = event.target.closest?.('#tab-mobs .mob-row');
        const layout = row?.closest('.mob-layout');
        if (!layout) return;
        if (!layouts.has(layout)) update();
        const entry = layouts.get(layout);
        if (!entry) return;
        entry.scrollTop = layout.querySelector('.mob-list-scroll')?.scrollTop || 0;
        queueMicrotask(() => {
          if (state.enabled && !state.suspended && layouts.has(layout)) showDetail(layout);
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
