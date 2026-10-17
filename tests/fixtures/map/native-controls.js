(() => {
  const map = window.fixtureMap;
  const context = map.canvas.getContext('2d');
  let frame;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('scapewatch_settings') || '{}');
  } catch (_) {}
  Object.assign(map.filters, saved);

  map.paint = function () {
    context.clearRect(0, 0, 1920, 1080);
    map.element.querySelector('img').style.display = map.filters.mapShowTerrain ? '' : 'none';
    const ids = [...map.queue];
    if (map.preview) ids.splice(map.preview.toSlot, 0, ids.splice(map.preview.fromSlot, 1)[0]);
    map.route = ['home', ...ids];
    const legend = document.querySelector('.map-legend-body');
    if (legend.dataset.route !== ids.join(',')) {
      legend.dataset.route = ids.join(',');
      legend.innerHTML = ids
        .map(
          (id, index) =>
            `<div class="map-legend-entry"><span class="map-legend-label">${index + 1}. ${id}</span></div>`,
        )
        .join('');
      const animate = document.createElement('div');
      animate.className = 'map-legend-animate';
      animate.textContent = 'Animate';
      animate.addEventListener('click', () => {
        map.animateCalls = (map.animateCalls || 0) + 1;
        animate.classList.toggle('active');
      });
      legend.prepend(animate);
    }
    if (!map.filters.mapShowTaskRoute) return;
    context.save();
    context.setLineDash([12, 8]);
    context.lineWidth = 10;
    context.lineCap = context.lineJoin = 'round';
    for (let index = 1; index < map.route.length; index++) {
      const from = map.nodes[map.route[index - 1]];
      const to = map.nodes[map.route[index]];
      context.strokeStyle = index === 1 ? '#ffd24a' : '#4ad2ff';
      context.beginPath();
      context.moveTo(map.offset.x + from.x * map.zoom, map.offset.y + from.y * map.zoom);
      context.lineTo(map.offset.x + to.x * map.zoom, map.offset.y + to.y * map.zoom);
      context.stroke();
    }
    context.restore();
  };
  function draw() {
    if (!map.visible) return;
    map.paint();
    frame = requestAnimationFrame(draw);
  }
  function applyView() {
    map.element.querySelector('img').style.transform =
      `translate(${map.offset.x}px,${map.offset.y}px) scale(${map.zoom})`;
    document.querySelector('.map-recenter-btn').style.display =
      map.zoom === 1 && map.offset.x === 0 && map.offset.y === 0 ? 'none' : '';
  }
  map.action.addEventListener('click', () => {
    map.visible = !map.visible;
    map.element.style.display = map.visible ? '' : 'none';
    document.body.classList.toggle('map-active', map.visible);
    if (map.visible) {
      map.openCalls++;
      map.zoom = 1;
      map.offset = { x: 0, y: 0 };
      applyView();
      draw();
    } else {
      map.closeCalls++;
      map.preview = null;
      cancelAnimationFrame(frame);
    }
  });
  const filters = [
    'mapShowFriends',
    'mapShowTaskRoute',
    'mapShowAllNodes',
    'mapShowQuestSteps',
    'mapShowTerrain',
    'mapShowWeather',
  ];
  const labels = [
    'Friends',
    'Task route',
    'All nodes',
    'Show current quest steps',
    'Show terrain',
    'Weather',
  ];
  filters.forEach((key, index) => {
    const row = document.createElement('label');
    row.className = 'map-filter-row';
    row.innerHTML = `<input type="checkbox" class="map-filter-checkbox"><span class="map-filter-label">${labels[index]}</span>`;
    const input = row.querySelector('input');
    map.filters[key] = input.checked = saved[key] ?? (index === 0 || index === 5);
    input.addEventListener('change', () => {
      map.filters[key] = input.checked;
      localStorage.setItem('scapewatch_settings', JSON.stringify(map.filters));
    });
    map.element.querySelector('.map-filter-body').appendChild(row);
  });
  for (const [index, panel] of map.originalControls.slice(0, 2).entries()) {
    const key = index === 0 ? 'mapFilterCollapsed' : 'mapLegendCollapsed';
    panel.classList.toggle('collapsed', saved[key] === true);
    panel.querySelector('.map-filter-title, .map-legend-title').addEventListener('click', () => {
      map.filters[key] = panel.classList.toggle('collapsed');
      map.filterToggleCalls.push({ key, collapsed: map.filters[key] });
      localStorage.setItem('scapewatch_settings', JSON.stringify(map.filters));
    });
  }
  map.element.addEventListener('mousedown', (event) => {
    if (
      event.button === 0 &&
      !event.target.closest('.map-filter-panel,.map-legend-panel,.map-recenter-btn')
    )
      map.drag = { x: event.clientX, y: event.clientY, ox: map.offset.x, oy: map.offset.y };
  });
  document.addEventListener('mousemove', (event) => {
    if (!map.drag || !map.visible) return;
    const rect = map.element.getBoundingClientRect();
    const scale = 1920 / rect.width;
    map.offset = {
      x: map.drag.ox + (event.clientX - map.drag.x) * scale,
      y: map.drag.oy + (event.clientY - map.drag.y) * scale,
    };
    map.mouseMoves++;
    applyView();
  });
  document.addEventListener('mouseup', () => (map.drag = null));
  map.element.addEventListener(
    'wheel',
    (event) => {
      if (!map.visible || event.target.closest('.map-filter-panel,.map-legend-panel')) return;
      event.preventDefault();
      const rect = map.element.getBoundingClientRect();
      const x = ((event.clientX - rect.x) * 1920) / rect.width;
      const y = ((event.clientY - rect.y) * 1080) / rect.height;
      const next = Math.max(0.6, Math.min(6, map.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const factor = next / map.zoom;
      map.offset = { x: x - (x - map.offset.x) * factor, y: y - (y - map.offset.y) * factor };
      map.zoom = next;
      map.wheelCalls.push({ deltaY: event.deltaY, x, y });
      applyView();
    },
    { passive: false },
  );
  map.originalControls[2].addEventListener('click', () => {
    map.recenterCalls++;
    map.zoom = 1;
    map.offset = { x: 0, y: 0 };
    applyView();
  });
})();
