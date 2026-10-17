import { all } from '../../../dom.js';

export function createMapQueue() {
  const forwarded = new WeakSet();
  const labels = new Map();
  let panel;
  let active = false;
  let drag;
  let frame;
  let suppressClick = false;
  let focused;
  const observer = new MutationObserver(updateLabels);

  function rows() {
    return all('#unified-queue-panel .queue-slot-draggable');
  }

  function focus(row) {
    if (focused === row) return;
    focused?.classList.remove('sw-map-focus');
    focused = row;
    focused?.classList.add('sw-map-focus');
  }

  function updateLabels() {
    if (!active || !panel) return;
    for (const row of labels.keys()) {
      if (!row.isConnected) labels.delete(row);
    }
    for (const row of panel.querySelectorAll('.uq-row')) {
      const name = row.querySelector('.task-name')?.textContent.trim() || '';
      const node = row.querySelector('.task-node .uq-name-text, .task-node')?.textContent || '';
      const distance = node.match(/\(([\d,]+)\)\s*$/)?.[1];
      let label = row.querySelector('.sw-map-step');
      if (!label) {
        label = document.createElement('span');
        label.className = 'sw-map-step';
        row.prepend(label);
        if (!labels.has(row)) labels.set(row, row.getAttribute('aria-label'));
      }
      const text = distance || (row.classList.contains('uq-current') ? 'Now' : '—');
      if (label.textContent !== text) label.textContent = text;
      const description = [name, node].filter(Boolean).join(' · ');
      if (row.getAttribute('aria-label') !== description)
        row.setAttribute('aria-label', description);
      label.classList.toggle('sw-map-distance', Boolean(distance));
      label.title = distance ? `${distance} steps` : name;
    }
  }

  function withinStrip(event) {
    const bounds = panel?.querySelector('.uq-rows')?.getBoundingClientRect();
    return (
      bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    );
  }

  function forward(target, event) {
    const placements = rows().map((row) => ({
      row,
      own: Object.getOwnPropertyDescriptor(row, 'getBoundingClientRect'),
      rect: row.getBoundingClientRect(),
    }));
    const outsideCoordinate =
      placements.reduce((left, { rect }) => Math.min(left, rect.left), 0) - 1;
    const next = new PointerEvent(event.type, {
      bubbles: true,
      cancelable: true,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      button: event.button,
      buttons: event.buttons,
      clientX: event.clientY,
      clientY:
        event.type === 'pointermove' && !withinStrip(event) ? outsideCoordinate : event.clientX,
    });
    forwarded.add(next);
    // The native reorder handler compares vertical row bounds. Present the
    // horizontal axis only for this synchronous event, leaving all geometry
    // and the game's own drag, preview and queue handlers intact afterwards.
    try {
      for (const { row, rect } of placements) {
        row.getBoundingClientRect = () => new DOMRect(rect.y, rect.x, rect.height, rect.width);
      }
      target.dispatchEvent(next);
    } finally {
      for (const { row, own } of placements) {
        if (own) Object.defineProperty(row, 'getBoundingClientRect', own);
        else delete row.getBoundingClientRect;
      }
    }
  }

  function cancel() {
    suppressClick = false;
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    if (!drag) return;
    const event = new PointerEvent('pointercancel', { bubbles: true, pointerId: drag.id });
    forwarded.add(event);
    document.dispatchEvent(event);
    drag = null;
  }

  function currentDrag() {
    return (
      active &&
      drag?.row.isConnected &&
      panel.contains(drag.row) &&
      (!drag.icon || drag.icon.isConnected)
    );
  }

  function scrollDrag() {
    frame = null;
    if (!drag?.moved) return;
    if (!currentDrag()) {
      cancel();
      return;
    }
    const scroller = panel.querySelector('.uq-rows');
    const bounds = scroller.getBoundingClientRect();
    const point = drag.point;
    if (
      point.clientY < bounds.top ||
      point.clientY > bounds.bottom ||
      point.clientX < bounds.left ||
      point.clientX > bounds.right
    )
      return;
    const delta = point.clientX < bounds.left + 24 ? -6 : point.clientX > bounds.right - 24 ? 6 : 0;
    const before = scroller.scrollLeft;
    scroller.scrollLeft += delta;
    if (scroller.scrollLeft === before) return;
    forward(document, point);
    frame = requestAnimationFrame(scrollDrag);
  }

  function begin(event) {
    if (forwarded.has(event)) return;
    if (event.isTrusted && event.isPrimary) suppressClick = false;
    if (!active) return;
    if (event.target.closest?.('#unified-queue-panel .sw-task-preview')) {
      event.stopPropagation();
      return;
    }
    if (!event.target.closest?.('#unified-queue-panel .uq-row')) focus(null);
    if (!event.isPrimary) {
      cancel();
      return;
    }
    if (event.button !== 0) return;
    const row = event.target.closest?.('#unified-queue-panel .queue-slot-draggable:not(.uq-empty)');
    if (!row || event.target.closest('.icon-option:not(.selected), .reroll-option')) return;
    cancel();
    suppressClick = false;
    drag = {
      id: event.pointerId,
      row,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      start: event,
      icon: event.target.closest('.icon-option.selected'),
    };
    // A tap or stationary hold retains the icon's native option/long-press
    // handlers. Only a drag hands over to the row's native reorder handler.
    if (drag.icon) return;
    event.stopImmediatePropagation();
    forward(row, event);
  }

  function move(event) {
    if (forwarded.has(event) || !drag || event.pointerId !== drag.id) return;
    if (!currentDrag()) {
      cancel();
      return;
    }
    event.stopImmediatePropagation();
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 24) {
      drag.moved = true;
      focus(null);
      if (drag.icon) {
        const cancelIcon = new PointerEvent('pointercancel', { bubbles: true, pointerId: drag.id });
        forwarded.add(cancelIcon);
        drag.icon.dispatchEvent(cancelIcon);
        forward(drag.row, drag.start);
      }
    }
    if (drag.moved && event.cancelable) event.preventDefault();
    if (!drag.icon || drag.moved) forward(document, event);
    drag.point = event;
    if (drag.moved && !frame) frame = requestAnimationFrame(scrollDrag);
  }

  function end(event) {
    if (forwarded.has(event) || !drag || event.pointerId !== drag.id) return;
    if (drag.icon && !drag.moved) {
      drag = null;
      return;
    }
    event.stopImmediatePropagation();
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    suppressClick = drag.moved;
    if (!currentDrag() || !withinStrip(event)) cancel();
    else {
      focus(null);
      forward(document, event);
      drag = null;
    }
  }

  function update(enabled) {
    active = enabled;
    const next = enabled ? document.getElementById('unified-queue-panel') : null;
    if (next !== panel) {
      cancel();
      observer.disconnect();
      panel = next;
      if (panel) observer.observe(panel, { childList: true, subtree: true, characterData: true });
    }
    if (active) updateLabels();
    else {
      suppressClick = false;
      focus(null);
      for (const [row, label] of labels) {
        row.querySelector('.sw-map-step')?.remove();
        if (label === null) row.removeAttribute('aria-label');
        else row.setAttribute('aria-label', label);
      }
      labels.clear();
    }
  }

  function bind() {
    window.addEventListener('pointerdown', begin, true);
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener(
      'touchmove',
      (event) => {
        // Cancel the browser's pan gesture as well as the pointer movement;
        // otherwise its first subsequent tap can be consumed as a scroll stop.
        if (
          active &&
          drag?.moved &&
          drag.start.pointerType === 'touch' &&
          event.touches.length === 1 &&
          event.cancelable
        )
          event.preventDefault();
      },
      { capture: true, passive: false },
    );
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    window.addEventListener(
      'click',
      (event) => {
        if (!active) return;
        if (event.detail === 0) suppressClick = false;
        if (suppressClick && event.target.closest?.('#unified-queue-panel')) {
          suppressClick = false;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (event.target.closest?.('#unified-queue-panel .sw-task-preview')) {
          event.stopPropagation();
          return;
        }
        focus(event.target.closest?.('#unified-queue-panel .uq-row') || null);
      },
      true,
    );
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') cancel();
    });
  }

  return { update, bind, suspend: () => update(false) };
}
