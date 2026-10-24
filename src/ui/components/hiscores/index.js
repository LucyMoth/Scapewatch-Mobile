export function createHiscoresLayout({ state }) {
  let categories;
  let control;
  let select;
  let observer;
  let entries = [];

  function restore() {
    observer?.disconnect();
    observer = null;
    control?.remove();
    control = null;
    categories = null;
    entries = [];
  }

  function refresh() {
    entries = Array.from(categories.querySelectorAll('.hs-cat-item'));
    const options = entries.map((node, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent =
        node.querySelector('span')?.textContent.trim() || node.textContent.trim();
      option.disabled = node.classList.contains('disabled');
      option.selected = node.classList.contains('active');
      return option;
    });
    select.replaceChildren(...options);
  }

  function update() {
    const next = document.querySelector('#tab-hiscores .hs-categories');
    if (!state.enabled || state.suspended || next !== categories) restore();
    if (!state.enabled || state.suspended || !next || categories) return;
    categories = next;
    control = document.createElement('label');
    control.className = 'sw-hs-category';
    const title = document.createElement('span');
    title.textContent = 'Ranking category';
    select = document.createElement('select');
    select.setAttribute('aria-label', 'Ranking category');
    select.addEventListener('change', () => {
      const entry = entries[Number(select.value)];
      if (entry?.isConnected && !entry.classList.contains('disabled')) entry.click();
    });
    control.append(title, select);
    categories.before(control);
    refresh();
    observer = new MutationObserver(refresh);
    observer.observe(categories, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  return { update, suspend: restore };
}
