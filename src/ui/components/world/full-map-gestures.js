import { createDragZoom } from './drag-zoom.js';
import { zoomMap } from './zoom.js';

const excludedControls =
  '.map-filter-panel, .map-legend-panel, .map-recenter-btn, #unified-queue-panel';
const zoomFactor = 1.15;

export function createFullMapGestures({ state, blockingOverlay }) {
  const dragZoom = createDragZoom();
  let gesture;

  function mouse(target, type, point) {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
        clientX: point?.clientX || 0,
        clientY: point?.clientY || 0,
      }),
    );
  }

  function clearGesture() {
    if (gesture?.kind === 'pan') mouse(document, 'mouseup');
    gesture = null;
  }

  function reset() {
    clearGesture();
    dragZoom.reset();
  }

  function available() {
    return state.enabled && !state.suspended && state.view === 'map' && !blockingOverlay();
  }

  function spread(touches) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    );
  }

  function begin(event) {
    const map = event.target.closest?.('.map-overlay');
    if (!available() || !map || event.target.closest?.(excludedControls)) {
      reset();
      return;
    }
    clearGesture();
    if (dragZoom.begin(event)) return;
    if (event.touches.length === 1) {
      gesture = { kind: 'pan', map };
      mouse(map, 'mousedown', event.touches[0]);
    } else if (event.touches.length === 2) {
      gesture = { kind: 'pinch', map, distance: spread(event.touches) };
    }
    if (gesture && event.cancelable) event.preventDefault();
  }

  function move(event) {
    if (!available()) {
      reset();
      return;
    }
    if (dragZoom.move(event)) return;
    if (!gesture) return;
    if (!gesture.map.isConnected) {
      reset();
      return;
    }
    if (gesture.kind === 'pan' && event.touches.length === 1) {
      mouse(document, 'mousemove', event.touches[0]);
    } else if (gesture.kind === 'pinch' && event.touches.length === 2) {
      const distance = spread(event.touches);
      if (!(distance > 0 && gesture.distance > 0)) return;
      const steps = Math.trunc(Math.log(distance / gesture.distance) / Math.log(zoomFactor));
      const count = Math.min(8, Math.abs(steps));
      zoomMap(gesture.map, steps, {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
      });
      gesture.distance *= zoomFactor ** (count * Math.sign(steps));
    } else {
      reset();
      return;
    }
    if (event.cancelable) event.preventDefault();
  }

  function end(event) {
    const map = gesture?.map;
    dragZoom.end(event);
    clearGesture();
    if (map && available() && event.touches.length === 1) {
      gesture = { kind: 'pan', map };
      mouse(map, 'mousedown', event.touches[0]);
    }
  }

  function bind() {
    document.addEventListener('touchstart', begin, { capture: true, passive: false });
    document.addEventListener('touchmove', move, { capture: true, passive: false });
    document.addEventListener('touchend', end, { capture: true, passive: false });
    document.addEventListener('touchcancel', reset, { capture: true, passive: true });
  }

  return { bind, reset };
}
