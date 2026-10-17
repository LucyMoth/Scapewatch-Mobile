const movementThreshold = 8;

export function createTreeGestures({ state, findEntry }) {
  let gesture;
  let suppressed;
  const point = (event) => ({ x: event.clientX, y: event.clientY });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function capture() {
    for (const id of gesture.points.keys()) {
      try {
        gesture.entry.stage.setPointerCapture(id);
      } catch (_) {}
    }
  }

  function startPan() {
    gesture.origin = [...gesture.points.values()][0];
    gesture.scroll = { x: gesture.entry.stage.scrollLeft, y: gesture.entry.stage.scrollTop };
  }

  function startPinch() {
    const [a, b] = [...gesture.points.values()];
    gesture.moved = true;
    gesture.distance = distance(a, b);
    gesture.zoom = gesture.entry.view.zoom;
    gesture.anchor = gesture.entry.worldAt(midpoint(a, b));
    capture();
  }

  function begin(event) {
    if (event.isPrimary) suppressed = null;
    const entry = findEntry(event.target);
    if (!state.enabled || state.suspended || !entry) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (gesture && gesture.entry !== entry) reset();
    gesture ||= { entry, points: new Map(), moved: false };
    gesture.points.set(event.pointerId, point(event));
    if (gesture.points.size === 1) startPan();
    else if (gesture.points.size === 2) startPinch();
    else reset();
  }

  function move(event) {
    if (!gesture?.points.has(event.pointerId)) return;
    if (
      !state.enabled ||
      state.suspended ||
      !gesture.entry.stage.isConnected ||
      !gesture.entry.stage.clientHeight
    ) {
      reset();
      return;
    }
    gesture.points.set(event.pointerId, point(event));
    const { entry } = gesture;
    if (gesture.points.size === 2) {
      const [a, b] = [...gesture.points.values()];
      if (gesture.distance > 0)
        entry.zoomAt(
          gesture.zoom * (distance(a, b) / gesture.distance),
          midpoint(a, b),
          gesture.anchor,
        );
    } else if (gesture.points.size === 1) {
      const current = point(event);
      if (!gesture.moved && distance(current, gesture.origin) < movementThreshold) return;
      if (!gesture.moved) {
        gesture.moved = true;
        capture();
      }
      entry.stage.scrollLeft = gesture.scroll.x + gesture.origin.x - current.x;
      entry.stage.scrollTop = gesture.scroll.y + gesture.origin.y - current.y;
      entry.saveCenter();
    }
    if (gesture.moved && event.cancelable) event.preventDefault();
  }

  function finish(event) {
    if (!gesture?.points.has(event.pointerId)) return;
    gesture.points.delete(event.pointerId);
    if (gesture.moved) suppressed = { entry: gesture.entry, until: Date.now() + 800 };
    if (gesture.points.size === 1) {
      startPan();
    } else if (!gesture.points.size) gesture = null;
  }

  function reset() {
    if (!gesture) return;
    if (gesture.moved) suppressed = { entry: gesture.entry, until: Date.now() + 800 };
    for (const id of gesture.points.keys()) {
      try {
        if (gesture.entry.stage.hasPointerCapture(id))
          gesture.entry.stage.releasePointerCapture(id);
      } catch (_) {}
    }
    gesture = null;
  }

  function consume(event) {
    if (!state.enabled || state.suspended) return;
    const pending =
      (gesture?.moved && gesture.entry.stage.contains(event.target)) ||
      (suppressed &&
        suppressed.until >= Date.now() &&
        suppressed.entry.stage.contains(event.target));
    if (!pending || (event.type === 'click' && event.detail === 0)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'click') suppressed = null;
  }

  function preventTouchScroll(event) {
    if (gesture?.moved && event.cancelable) event.preventDefault();
  }

  function wheel(event) {
    if (!state.enabled || state.suspended || !event.ctrlKey) return;
    const entry = findEntry(event.target);
    if (!entry) return;
    event.preventDefault();
    entry.zoomAt(entry.view.zoom * Math.exp(-event.deltaY * 0.01), point(event));
  }

  function bind() {
    document.addEventListener('pointerdown', begin, true);
    document.addEventListener('pointermove', move, { capture: true, passive: false });
    document.addEventListener('pointerup', finish, true);
    document.addEventListener('pointercancel', reset, true);
    document.addEventListener('click', consume, true);
    document.addEventListener('contextmenu', consume, true);
    document.addEventListener('touchmove', preventTouchScroll, { capture: true, passive: false });
    document.addEventListener('touchend', consume, { capture: true, passive: false });
    document.addEventListener('wheel', wheel, { capture: true, passive: false });
  }

  return { bind, reset };
}
