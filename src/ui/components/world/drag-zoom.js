import { zoomMap } from './zoom.js';

export function createDragZoom() {
  let tap;
  let previousTap;
  let drag;

  function consume(event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function reset() {
    tap = previousTap = drag = null;
  }

  function begin(event) {
    if (event.touches.length !== 1) {
      reset();
      return false;
    }
    const touch = event.touches[0];
    const now = performance.now();
    if (
      previousTap?.canvas === event.target &&
      now - previousTap.time <= 300 &&
      Math.hypot(touch.clientX - previousTap.x, touch.clientY - previousTap.y) <= 24
    ) {
      drag = {
        canvas: event.target,
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        previousY: touch.clientY,
      };
      tap = previousTap = null;
      consume(event);
      return true;
    }
    previousTap = null;
    tap = {
      canvas: event.target,
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      time: now,
    };
    return false;
  }

  function move(event) {
    const touch = event.touches[0];
    if (drag) {
      if (
        event.target !== drag.canvas ||
        event.touches.length !== 1 ||
        touch.identifier !== drag.identifier
      ) {
        reset();
        return false;
      }
      const distance = Math.round((touch.clientY - drag.previousY) * 1000) / 1000;
      const steps = Math.trunc(distance / 12);
      if (steps) {
        zoomMap(drag.canvas, steps, drag);
        drag.previousY += Math.max(-8, Math.min(8, steps)) * 12;
      }
      consume(event);
      return true;
    }
    if (
      tap &&
      (event.touches.length !== 1 ||
        touch.identifier !== tap.identifier ||
        Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 12)
    )
      tap = null;
    return false;
  }

  function end(event) {
    if (drag) {
      reset();
      consume(event);
      return;
    }
    if (tap && event.touches.length === 0 && performance.now() - tap.time <= 250)
      previousTap = { ...tap, time: performance.now() };
    tap = null;
  }

  return { begin, move, end, reset };
}
