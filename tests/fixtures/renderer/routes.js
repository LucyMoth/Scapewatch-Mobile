(() => {
  const points = [
    { x: 100, y: 180 },
    { x: 400, y: 300 },
    { x: 800, y: 420 },
  ];
  const canvas = document.getElementById('game-canvas');
  const context = canvas.getContext('2d');

  // Preserve the public client's route eligibility and canvas drawing sequence.
  // Waypoints are fixed so this fixture needs neither private state nor a server.
  function drawPath({ zoom, thickness, pattern }) {
    context.save();
    context.strokeStyle = '#ffd24a';
    context.lineWidth = thickness / zoom;
    context.setLineDash(pattern === 'route' ? [12 / zoom, 8 / zoom] : []);
    context.lineDashOffset = 0;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
  }

  window.renderRouteFixture = function (
    kind,
    {
      mode = 'balanced',
      zoom = 1.6,
      thickness = 2.5,
      pattern = 'route',
      showPlayerPath = true,
      state = 'moving',
      queued = true,
    } = {},
  ) {
    window.__swRendering.setMode(mode);
    const logicalWidth = 1920;
    const logicalHeight = (logicalWidth * innerHeight) / innerWidth;
    const nativeDpr = Math.max(1, Math.min(3, Math.sqrt(15500000 / logicalWidth / logicalHeight)));
    canvas.width = Math.round(logicalWidth * nativeDpr);
    canvas.height = Math.round(logicalHeight * nativeDpr);
    context.setTransform(nativeDpr, 0, 0, nativeDpr, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    context.save();
    context.scale(zoom, zoom);

    // Native map tiles use physical pixels inside an identity save/restore pass.
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#08080f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    if (showPlayerPath && (kind === 'queue' ? queued : state === 'moving'))
      drawPath({ zoom, thickness, pattern });
    context.restore();

    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let yellowPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 180 && data[index + 1] > 120 && data[index + 2] < 140) yellowPixels++;
    }
    const transform = context.getTransform();
    return {
      yellowPixels,
      lineWidth: context.lineWidth,
      dash: context.getLineDash(),
      transform: [transform.a, transform.d],
      stats: window.__swRendering.stats(),
      settings: { thickness, showPlayerPath },
    };
  };
})();
