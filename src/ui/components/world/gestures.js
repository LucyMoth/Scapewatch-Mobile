import { $, visible } from '../../dom.js';
import { createDragZoom } from './drag-zoom.js';
export function createMapGestures({ state, blockingOverlay, onInteraction }) {
  const dragZoom = createDragZoom();
  let pendingMapTouch = null;
  let replayingMapTouch = false;
  function beginMapGesture(event) {
    if (replayingMapTouch) return;
    pendingMapTouch = null;
    if (
      !state.enabled ||
      state.view !== 'world' ||
      event.target.id !== 'game-canvas' ||
      blockingOverlay()
    ) {
      dragZoom.reset();
      return;
    }
    if (event.isTrusted) onInteraction?.();
    if (dragZoom.begin(event)) return;
    const roam = $('.recenter-camera-btn.roam');
    if (event.touches.length === 1) {
      // A normal map tap must retain the original follow/selection behavior.
      if (visible(roam) && !roam.disabled)
        pendingMapTouch = { canvas: event.target, touch: event.touches[0] };
    } else if (event.touches.length > 1) {
      if (visible(roam) && !roam.disabled) roam.click();
      if (event.cancelable) event.preventDefault();
    }
  }
  function moveMapGesture(event) {
    if (!state.enabled || state.view !== 'world' || blockingOverlay()) {
      reset();
      return;
    }
    if (dragZoom.move(event)) {
      pendingMapTouch = null;
      return;
    }
    const pending = pendingMapTouch;
    if (!pending) return;
    if (
      !state.enabled ||
      state.view !== 'world' ||
      event.target !== pending.canvas ||
      event.touches.length !== 1 ||
      blockingOverlay()
    ) {
      pendingMapTouch = null;
      return;
    }
    const touch = event.touches[0];
    if (
      touch.identifier !== pending.touch.identifier ||
      Math.hypot(touch.clientX - pending.touch.clientX, touch.clientY - pending.touch.clientY) < 30
    )
      return;
    pendingMapTouch = null;
    const roam = $('.recenter-camera-btn.roam');
    if (!visible(roam) || roam.disabled) return;
    // The original mobile start handler skipped follow mode. Only after an
    // actual drag, enter native Roam and initialize that original camera
    // handler from the saved finger start. The current move then pans natively.
    roam.click();
    if (roam.classList.contains('roam')) return;
    if (event.cancelable) event.preventDefault();
    replayingMapTouch = true;
    try {
      pending.canvas.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [pending.touch],
          targetTouches: [pending.touch],
          changedTouches: [pending.touch],
        }),
      );
    } finally {
      replayingMapTouch = false;
    }
  }
  function reset() {
    pendingMapTouch = null;
    dragZoom.reset();
  }
  function endMapGesture(event) {
    pendingMapTouch = null;
    dragZoom.end(event);
  }
  function handleWheel(event) {
    if (
      event.isTrusted &&
      state.enabled &&
      state.view === 'world' &&
      event.target.id === 'game-canvas' &&
      !blockingOverlay()
    )
      onInteraction?.();
  }
  function bind() {
    document.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    document.addEventListener('touchstart', beginMapGesture, { capture: true, passive: false });
    document.addEventListener('touchmove', moveMapGesture, { capture: true, passive: false });
    document.addEventListener('touchend', endMapGesture, { capture: true, passive: false });
    document.addEventListener('touchcancel', reset, { capture: true, passive: true });
  }
  return { bind, reset };
}
