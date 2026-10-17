export function createUnlocksLayout({ state }) {
  const grids = new Map();
  const properties = ['--sw-unlock-row', '--sw-unlock-column', '--sw-unlock-span'];
  const observer = new ResizeObserver(() => grids.forEach((entry, grid) => arrange(grid, entry)));

  function arrange(grid, entry) {
    const width = grid.clientWidth;
    if (!width) return;
    const rewards = Math.max(1, Math.min(8, Math.floor((width - 60) / 48)));
    const rows = Math.ceil((Math.ceil(entry.nodes.length / entry.headers) - 1) / rewards);
    grid.style.setProperty('--sw-unlock-columns', String(rewards + 1));
    entry.nodes.forEach((node, index) => {
      const skill = index % entry.headers;
      const reward = Math.floor(index / entry.headers) - 1;
      node.style.setProperty(
        '--sw-unlock-row',
        String(skill * rows + (reward < 0 ? 0 : Math.floor(reward / rewards)) + 1),
      );
      node.style.setProperty('--sw-unlock-column', String(reward < 0 ? 1 : (reward % rewards) + 2));
      node.style.setProperty('--sw-unlock-span', String(reward < 0 ? rows : 1));
    });
  }

  function restore(grid, entry) {
    observer.unobserve(grid);
    grid.classList.remove('sw-unlocks-grid');
    grid.style.removeProperty('--sw-unlock-columns');
    entry.nodes.forEach((node, index) => {
      properties.forEach((property, position) => {
        const value = entry.styles[index][position];
        if (value) node.style.setProperty(property, value);
        else node.style.removeProperty(property);
      });
      if (entry.unstyled.has(node) && !node.style.length) node.removeAttribute('style');
    });
    grids.delete(grid);
  }

  function update() {
    grids.forEach((entry, grid) => {
      if (
        !state.enabled ||
        state.suspended ||
        !grid.isConnected ||
        entry.nodes.length !== grid.children.length ||
        entry.nodes.some((node, index) => node !== grid.children[index])
      )
        restore(grid, entry);
    });
    if (!state.enabled || state.suspended) return;
    document.querySelectorAll('#tab-unlocks .unlocks-grid').forEach((grid) => {
      if (grids.has(grid)) return;
      const nodes = Array.from(grid.children);
      const headers = grid.querySelectorAll(':scope > .grid-skill-header').length;
      if (
        !headers ||
        nodes.length <= headers ||
        !nodes.slice(0, headers).every((node) => node.classList.contains('grid-skill-header'))
      )
        return;
      const entry = {
        nodes,
        headers,
        unstyled: new Set(nodes.filter((node) => !node.hasAttribute('style'))),
        styles: nodes.map((node) =>
          properties.map((property) => node.style.getPropertyValue(property)),
        ),
      };
      grids.set(grid, entry);
      grid.classList.add('sw-unlocks-grid');
      observer.observe(grid);
      arrange(grid, entry);
    });
  }

  function suspend() {
    grids.forEach((entry, grid) => restore(grid, entry));
  }

  return { update, suspend };
}
