(() => {
  const ui = document.getElementById('ui-container');
  const element = document.createElement('div');
  element.className = 'map-overlay';
  element.style.display = 'none';
  element.innerHTML = `<div class="map-overlay-bg"></div>
    <img class="map-overlay-img" alt="World terrain" style="width:1920px;height:1080px;left:0;top:0">
    <canvas class="map-overlay-canvas" width="1920" height="1080"></canvas>
    <div class="map-filter-panel"><div class="map-filter-title"><span>World Map</span><span class="map-filter-caret"></span></div>
      <div class="map-filter-body"><div class="map-filter-distance">Route distance: 0</div>
        <input class="map-filter-search" placeholder="Search nodes..."></div></div>
    <div class="map-legend-panel"><div class="map-legend-title"><span>Route legend</span><span class="map-filter-caret"></span></div><div class="map-legend-body"></div></div>
    <button class="map-recenter-btn" style="display:none">Recenter Map</button>`;
  const image = element.querySelector('img');
  image.src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#314a40"/><path d="M60 170L770 100L1500 150L1810 870L400 920Z" fill="#897a47"/><path d="M100 150L900 400L1700 900" fill="none" stroke="#b7a466" stroke-width="10"/></svg>',
    );
  ui.appendChild(element);
  const action = document.createElement('button');
  action.className = 'window-control-btn window-control-btn-map';
  action.textContent = 'World Map';
  action.style.display = 'none';
  ui.appendChild(action);
  window.fixtureMap = {
    element,
    action,
    canvas: element.querySelector('canvas'),
    zoom: 1,
    offset: { x: 0, y: 0 },
    visible: false,
    drag: null,
    openCalls: 0,
    closeCalls: 0,
    recenterCalls: 0,
    mouseMoves: 0,
    wheelCalls: [],
    filters: {},
    preview: null,
    reorderCalls: [],
    originalControls: Array.from(
      element.querySelectorAll('.map-filter-panel, .map-legend-panel, .map-recenter-btn'),
    ),
    originalTitles: Array.from(element.querySelectorAll('.map-filter-title, .map-legend-title')),
    filterToggleCalls: [],
    queue: ['mine', 'smelt', 'fish', 'cook'],
    nodes: {
      home: { x: 100, y: 140 },
      mine: { x: 460, y: 240 },
      smelt: { x: 1150, y: 740 },
      fish: { x: 1500, y: 200 },
      cook: { x: 1740, y: 900 },
    },
  };
})();
