(() => {
  const canvas = document.getElementById('game-canvas');
  const menu = document.createElement('div');
  menu.className = 'player-ctx-menu';
  menu.style.display = 'none';
  menu.innerHTML = '<div class="ctx-menu-name">Nearby player</div><button>Inspect</button>';
  document.getElementById('ui-container').appendChild(menu);
  window.cameraHits = [];
  // Native click, actor long-press and hover use logical dimensions divided
  // by the canvas's actual client bounds before performing world hit tests.
  const hit = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const dimensions = window.__swRendering.stats();
    const x = ((event.clientX - bounds.x) * dimensions.logicalWidth) / bounds.width;
    const y = ((event.clientY - bounds.y) * dimensions.logicalHeight) / bounds.height;
    window.cameraHits.push({ type: event.type, x, y });
    if (event.type === 'contextmenu') {
      event.preventDefault();
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.style.display = '';
    }
  };
  canvas.addEventListener('click', hit);
  canvas.addEventListener('contextmenu', hit);
  window.nativeHitHandler = hit;
})();
