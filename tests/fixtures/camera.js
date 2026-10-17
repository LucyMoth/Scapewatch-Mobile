(() => {
  Object.defineProperty(window, 'visualViewport', window.nativeViewportDescriptor);
  const canvas = document.getElementById('game-canvas');
  window.originalGameState = {
    fetch,
    XMLHttpRequest,
    WebSocket,
    setTimeout,
    setInterval,
    requestAnimationFrame,
    cancelAnimationFrame,
    gameplay: JSON.stringify(window.fixtureState.gameplay),
    canvas,
    viewportMeta: document.querySelector('meta[name=viewport]').getAttribute('content'),
  };
  const recenter = document.createElement('button');
  recenter.className = 'recenter-camera-btn roam';
  recenter.textContent = 'Roam Map';
  recenter.style.cssText = 'position:absolute;left:12px;bottom:80px;pointer-events:auto;';
  document.getElementById('ui-container').append(recenter);
  window.cameraState = {
    cameraZoom: 1,
    cameraMoves: 0,
    cameraFree: false,
    cameraPan: { x: 0, y: 0 },
    cameraPans: 0,
    recenterClicks: 0,
    previousDistance: null,
    previousPoint: null,
    callbacks: [],
    captured: [],
    trusted: [],
    wheelZooms: [],
    mapClicks: 0,
  };
  function originalRecenter() {
    window.cameraState.recenterClicks++;
    window.cameraState.cameraFree = !window.cameraState.cameraFree;
    recenter.classList.toggle('roam', !window.cameraState.cameraFree);
    recenter.textContent = window.cameraState.cameraFree ? 'Follow' : 'Roam Map';
    document.body.classList.toggle('roam-idle', !window.cameraState.cameraFree);
  }
  recenter.addEventListener('click', originalRecenter);
  window.originalRecenterHandler = originalRecenter;
  window.recenterHandlerBefore = originalRecenter;
  function distance(touches) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    );
  }
  function originalGameStart(event) {
    window.cameraState.callbacks.push({
      type: event.type,
      touches: event.touches.length,
      prevented: event.defaultPrevented,
      trusted: event.isTrusted,
      cameraFree: window.cameraState.cameraFree,
    });
    if (event.touches.length === 2 && window.cameraState.cameraFree)
      window.cameraState.previousDistance = distance(event.touches);
    if (event.touches.length === 1 && window.cameraState.cameraFree)
      window.cameraState.previousPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
  }
  function originalGameMove(event) {
    window.cameraState.callbacks.push({
      type: event.type,
      touches: event.touches.length,
      prevented: event.defaultPrevented,
      trusted: event.isTrusted,
    });
    if (
      event.touches.length === 2 &&
      window.cameraState.cameraFree &&
      window.cameraState.previousDistance
    ) {
      const next = distance(event.touches);
      window.cameraState.cameraZoom *= next / window.cameraState.previousDistance;
      window.cameraState.previousDistance = next;
      window.cameraState.cameraMoves++;
    }
    if (
      event.touches.length === 1 &&
      window.cameraState.cameraFree &&
      window.cameraState.previousPoint
    ) {
      const next = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      window.cameraState.cameraPan.x += next.x - window.cameraState.previousPoint.x;
      window.cameraState.cameraPan.y += next.y - window.cameraState.previousPoint.y;
      window.cameraState.previousPoint = next;
      window.cameraState.cameraPans++;
    }
  }
  function originalGameEnd(event) {
    window.cameraState.callbacks.push({
      type: event.type,
      touches: event.touches.length,
      prevented: event.defaultPrevented,
      trusted: event.isTrusted,
    });
    if (event.touches.length < 2) window.cameraState.previousDistance = null;
    if (!event.touches.length) window.cameraState.previousPoint = null;
  }
  window.originalCameraHandlers = {
    touchstart: originalGameStart,
    touchmove: originalGameMove,
    touchend: originalGameEnd,
  };
  Object.entries(window.originalCameraHandlers).forEach(([type, handler]) =>
    canvas.addEventListener(type, handler, { passive: false }),
  );
  window.cameraHandlersBefore = { ...window.originalCameraHandlers };
  function originalWheelZoom(event) {
    event.preventDefault();
    window.cameraState.wheelZooms.push(event.deltaY);
    const step = event.deltaY > 0 ? -0.1 : 0.1;
    window.cameraState.cameraZoom = Math.max(
      0.1,
      Math.min(5, Math.round((window.cameraState.cameraZoom + step) * 100) / 100),
    );
  }
  canvas.addEventListener('wheel', originalWheelZoom, { passive: false });
  window.originalWheelZoom = originalWheelZoom;
  canvas.addEventListener('click', () => window.cameraState.mapClicks++);
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    window.addEventListener(
      type,
      (event) => {
        const item = {
          type,
          touches: event.touches.length,
          prevented: event.defaultPrevented,
          cancelable: event.cancelable,
          trusted: event.isTrusted,
          target: event.target.id || event.target.className || event.target.tagName,
        };
        window.cameraState.captured.push(item);
        if (event.isTrusted) window.cameraState.trusted.push(item);
      },
      { passive: true },
    );
  }
  window.resetCamera = function (allowCamera = false) {
    canvas.dispatchEvent(
      new TouchEvent('touchend', {
        touches: [],
        targetTouches: [],
        changedTouches: [],
        bubbles: true,
        cancelable: true,
      }),
    );
    window.cameraState.cameraZoom = 1;
    window.cameraState.cameraMoves = 0;
    window.cameraState.previousDistance = null;
    window.cameraState.previousPoint = null;
    window.cameraState.cameraPan = { x: 0, y: 0 };
    window.cameraState.cameraPans = 0;
    window.cameraState.cameraFree = allowCamera;
    window.cameraState.recenterClicks = 0;
    recenter.classList.toggle('roam', !allowCamera);
    recenter.textContent = allowCamera ? 'Follow' : 'Roam Map';
    document.body.classList.toggle('roam-idle', !allowCamera);
    window.cameraState.callbacks.length = 0;
    window.cameraState.captured.length = 0;
    window.cameraState.trusted.length = 0;
    window.cameraState.wheelZooms.length = 0;
    window.cameraState.mapClicks = 0;
  };
  window.snapshotCamera = function () {
    const rects = {};
    for (const selector of ['#sw-shell', '#sw-nav', '#game-canvas', '#unified-queue-panel']) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const r = element.getBoundingClientRect();
      rects[selector] = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return {
      scale: visualViewport.scale,
      viewport: {
        width: visualViewport.width,
        height: visualViewport.height,
      },
      rects,
      cameraZoom: window.cameraState.cameraZoom,
      cameraMoves: window.cameraState.cameraMoves,
      cameraFree: window.cameraState.cameraFree,
      cameraPan: { ...window.cameraState.cameraPan },
      cameraPans: window.cameraState.cameraPans,
      recenterClicks: window.cameraState.recenterClicks,
      callbacks: window.cameraState.callbacks.slice(),
      trusted: window.cameraState.trusted.slice(),
    };
  };
  window.dispatchSyntheticTouch = function (selector, type, count, cancelable = true, spread = 32) {
    const target = document.querySelector(selector);
    const rect = target.getBoundingClientRect();
    const x = Math.max(5, Math.min(innerWidth - 5, rect.x + rect.width / 2));
    const y = Math.max(5, Math.min(innerHeight - 5, rect.y + Math.min(rect.height / 2, 200)));
    const touches = Array.from(
      { length: count },
      (_, i) =>
        new Touch({
          identifier: i + 1,
          target,
          clientX: x + (i === 0 ? -spread : spread),
          clientY: y,
          pageX: x + (i === 0 ? -spread : spread),
          pageY: y,
        }),
    );
    const event = new TouchEvent(type, {
      touches,
      targetTouches: touches,
      changedTouches: touches,
      bubbles: true,
      cancelable,
    });
    const dispatchResult = target.dispatchEvent(event);
    return {
      dispatchResult,
      prevented: event.defaultPrevented,
      cancelable,
      touches: count,
    };
  };
})();
