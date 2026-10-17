import { capturePlacement, hasChangedElement, restorePlacement } from '../../dom.js';
import { createTreeGestures } from './gestures.js';

const minimumZoom = 1;
const maximumZoom = 12;
const zoomStep = 1.4;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function createTreeLayout({ state }) {
  const entries = new Map();
  const views = new WeakMap();
  let modal;
  let observer;
  const gestures = createTreeGestures({ state, findEntry });

  function findEntry(target) {
    const stage = target.closest?.('.rtv-stage');
    const entry = entries.get(stage?.closest('.rtv-root'));
    return entry?.stage === stage && stage.clientHeight > 0 ? entry : null;
  }

  function restore(entry) {
    entry.resize?.disconnect();
    entry.tipObserver?.disconnect();
    entry.stage?.removeEventListener('scroll', entry.saveCenter);
    if (entry.legend?.isConnected) restorePlacement(entry.legendPlacement);
    entry.controls?.remove();
    entry.root.style.removeProperty('--sw-tree-legend-height');
    entry.root.classList.remove('sw-tree-root');
    for (const name of ['width', 'height', 'pad-y'])
      entry.fit?.style.removeProperty(`--sw-tree-${name}`);
    for (const name of ['left', 'top', 'width', 'height'])
      entry.root.style.removeProperty(`--sw-tree-tip-${name}`);
  }

  function suspend() {
    gestures.reset();
    observer?.disconnect();
    modal = null;
    for (const entry of entries.values()) restore(entry);
    entries.clear();
  }

  function controls(entry) {
    const bar = document.createElement('div');
    bar.className = 'sw-tree-controls';
    bar.setAttribute('aria-label', 'Tree view');
    for (const [action, label, text] of [
      ['out', 'Zoom out', '−'],
      ['in', 'Zoom in', '+'],
      ['fit', 'Fit tree', 'Fit'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.swTreeAction = action;
      button.setAttribute('aria-label', label);
      button.textContent = text;
      button.addEventListener('click', () => {
        gestures.reset();
        if (action === 'fit') {
          entry.view.centerX = 0.5;
          entry.view.centerY = 0.5;
          entry.view.zoom = minimumZoom;
          entry.layout();
        } else entry.zoomAt(entry.view.zoom * (action === 'in' ? zoomStep : 1 / zoomStep));
      });
      bar.append(button);
    }
    const details = document.createElement('details');
    details.className = 'sw-tree-bonuses';
    details.open = entry.view.bonuses;
    const summary = document.createElement('summary');
    summary.textContent = 'Bonuses';
    details.append(summary);
    details.addEventListener('toggle', () => {
      entry.view.bonuses = details.open;
    });
    bar.append(details);
    return bar;
  }

  function attach(root) {
    const view = views.get(root) || { zoom: 2, centerX: 0.5, centerY: 0.5, bonuses: false };
    views.set(root, view);
    const entry = { root, view };
    entry.saveCenter = () => {
      if (!entry.width || !entry.height || !entry.stage.clientHeight) return;
      view.centerX = clamp(
        (entry.stage.scrollLeft + entry.stage.clientWidth / 2 - entry.padX) / entry.width,
        0,
        1,
      );
      view.centerY = clamp(
        (entry.stage.scrollTop + entry.stage.clientHeight / 2 - entry.padY) / entry.height,
        0,
        1,
      );
    };
    entry.worldAt = (point) => {
      const box = entry.fit.getBoundingClientRect();
      return { x: (point.x - box.left) / box.width, y: (point.y - box.top) / box.height };
    };
    entry.positionTip = () => {
      if (!entry.tip?.isConnected || !entry.stage.clientHeight) return;
      const stage = entry.stage.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      const available = Math.max(0, stage.bottom - rootBox.top - 16);
      const height = Math.min(entry.tip.scrollHeight + 4, available);
      const top = Math.max(rootBox.top + 8, Math.min(stage.top + 8, stage.bottom - height - 8));
      root.style.setProperty('--sw-tree-tip-top', `${top}px`);
      root.style.setProperty('--sw-tree-tip-height', `${available}px`);
    };
    entry.layout = (point, anchor) => {
      const { stage, fit } = entry;
      if (!stage?.clientWidth || !stage.clientHeight || !fit?.isConnected) return;
      const box = fit.querySelector('svg')?.viewBox.baseVal;
      if (!box?.width || !box.height) return;
      const scale = Math.min(stage.clientWidth / box.width, stage.clientHeight / box.height);
      entry.width = box.width * scale * view.zoom;
      entry.height = box.height * scale * view.zoom;
      entry.padX = Math.max(0, (stage.clientWidth - entry.width) / 2);
      entry.padY = Math.max(0, (stage.clientHeight - entry.height) / 2);
      fit.style.setProperty('--sw-tree-width', `${entry.width}px`);
      fit.style.setProperty('--sw-tree-height', `${entry.height}px`);
      fit.style.setProperty('--sw-tree-pad-y', `${entry.padY}px`);
      const bounds = stage.getBoundingClientRect();
      const focal = point
        ? { x: point.x - bounds.left, y: point.y - bounds.top }
        : { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
      const world = anchor || { x: view.centerX, y: view.centerY };
      stage.scrollLeft = entry.padX + world.x * entry.width - focal.x;
      stage.scrollTop = entry.padY + world.y * entry.height - focal.y;
      entry.saveCenter();
      for (const [name, value] of Object.entries({
        left: bounds.left + 8,
        width: Math.max(0, stage.clientWidth - 16),
      }))
        root.style.setProperty(`--sw-tree-tip-${name}`, `${value}px`);
      root.style.setProperty(
        '--sw-tree-legend-height',
        `${Math.max(0, stage.clientHeight - 16)}px`,
      );
      entry.positionTip();
      entry.controls.querySelector('[data-sw-tree-action=out]').disabled = view.zoom <= minimumZoom;
      entry.controls.querySelector('[data-sw-tree-action=in]').disabled = view.zoom >= maximumZoom;
    };
    entry.zoomAt = (zoom, point, anchor) => {
      const next = clamp(zoom, minimumZoom, maximumZoom);
      if (next === view.zoom) return;
      const world = anchor || (point ? entry.worldAt(point) : null);
      view.zoom = next;
      entry.layout(point, world);
    };
    entries.set(root, entry);
    return entry;
  }

  function refresh(entry) {
    const stage = entry.root.querySelector('.rtv-stage');
    const fit = stage?.querySelector('.rtv-fit');
    if (!stage || !fit) return;
    if (entry.stage !== stage) {
      gestures.reset();
      restore(entry);
      entry.stage = stage;
      entry.fit = fit;
      entry.tip = fit.querySelector('.rtv-tip');
      if (entry.tip) {
        entry.tipObserver = new MutationObserver(entry.positionTip);
        entry.tipObserver.observe(entry.tip, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
      }
      entry.legend = stage.querySelector('.rtv-legend');
      entry.legendPlacement = entry.legend ? capturePlacement(entry.legend) : null;
      entry.controls = controls(entry);
      entry.root.insertBefore(entry.controls, stage);
      if (entry.legend) entry.controls.querySelector('.sw-tree-bonuses').append(entry.legend);
      stage.addEventListener('scroll', entry.saveCenter, { passive: true });
      entry.resize = new ResizeObserver(() => entry.layout());
      entry.resize.observe(stage);
    }
    entry.root.classList.add('sw-tree-root');
    entry.layout();
  }

  function update() {
    if (!state.enabled || state.suspended) {
      suspend();
      return;
    }
    const nextModal = document.querySelector('.modal-main');
    if (nextModal !== modal) {
      observer?.disconnect();
      modal = nextModal;
      if (modal) {
        observer = new MutationObserver((records) => {
          const changedView = records.some(
            (record) => record.type === 'attributes' && record.target.matches('.rtv-wrap'),
          );
          if (changedView) gestures.reset();
          if (
            changedView ||
            hasChangedElement(
              records,
              (node) =>
                node.matches('.rtv-root, .rtv-stage') ||
                node.querySelector('.rtv-root, .rtv-stage'),
            )
          )
            update();
        });
        observer.observe(modal, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style'],
        });
      }
    }
    for (const [root, entry] of entries) {
      if (!root.isConnected) {
        restore(entry);
        entries.delete(root);
      }
    }
    for (const root of document.querySelectorAll('.rtv-root'))
      refresh(entries.get(root) || attach(root));
  }

  function bind() {
    gestures.bind();
    window.addEventListener('resize', () => {
      gestures.reset();
      update();
    });
  }

  return { update, bind, suspend };
}
