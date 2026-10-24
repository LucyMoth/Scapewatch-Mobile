import { $ } from '../../../dom.js';
import { dock } from '../../navigation/game-controls.js';
import { createMapControls } from './controls.js';
import { fitMapPlane } from './geometry.js';
import { createMapQueue } from './queue.js';

export function createFullMap({ state, setFlag, render, toast }) {
  const controls = createMapControls();
  const queue = createMapQueue();
  let area;
  let host;
  let route;
  let canvas;
  let frame;
  let observingBody = false;
  const observer = new MutationObserver(schedule);
  const bodyObserver = new MutationObserver(schedule);

  function install() {
    if (host) return;
    const ui = $('#ui-container');
    if (!ui) return;
    const surface = document.createElement('div');
    surface.id = 'sw-map-surface';
    area = document.createElement('div');
    area.id = 'sw-map-area';
    surface.appendChild(area);
    route = document.createElement('section');
    route.id = 'sw-map-route';
    route.setAttribute('aria-label', 'Route overview');
    const heading = document.createElement('h2');
    heading.textContent = 'Route';
    route.appendChild(heading);
    surface.appendChild(route);
    host = document.createElement('div');
    host.id = 'sw-map-tools';
    const close = document.createElement('button');
    close.type = 'button';
    close.id = 'sw-map-close';
    close.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    close.setAttribute('aria-label', 'Close map and return to world');
    close.addEventListener('click', () => {
      closeMap();
      state.view = 'world';
      render();
    });
    host.appendChild(close);
    ui.append(surface, host);
  }

  function open() {
    const action = $('.window-control-btn-map');
    if (!action || !$('.map-overlay')) {
      toast('The world map is not available yet.');
      return false;
    }
    const tasks = dock('tasks');
    if (tasks && !tasks.classList.contains('active')) tasks.click();
    if (!document.body.classList.contains('map-active')) action.click();
    controls.applyDefaults();
    return document.body.classList.contains('map-active');
  }

  function closeMap() {
    if (document.body.classList.contains('map-active')) $('.window-control-btn-map')?.click();
  }

  function update() {
    if (state.suspended) return;
    watchBody();
    if (document.body.classList.contains('login-active')) closeMap();
    const active = state.enabled && document.body.classList.contains('map-active');
    setFlag('sw-map', active);
    const portrait =
      active && !document.documentElement.classList.contains('sw-landscape') && innerHeight >= 560;
    setFlag('sw-map-route-layout', portrait);
    queue.update(active);
    if (!active) {
      controls.restore();
      if (state.view === 'map' && state.enabled) {
        state.view = 'world';
        render();
      }
      return;
    }
    install();
    const plane = $('.map-overlay');
    if (!plane || !host) return;
    controls.attach(plane, host, portrait ? route : null);
    if (!['map', 'menu'].includes(state.view)) {
      state.view = 'map';
      render();
      return;
    }
    const next = plane.querySelector('.map-overlay-canvas');
    if (next !== canvas) {
      observer.disconnect();
      canvas = next;
      if (canvas)
        observer.observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
    }
    const bounds = fitMapPlane(plane, area);
    if (bounds && portrait) {
      const root = document.documentElement;
      root.style.setProperty('--sw-map-queue-top', `${bounds.bottom + 8}px`);
      root.style.setProperty(
        '--sw-map-route-top',
        `calc(${bounds.bottom + 16}px + var(--sw-map-queue-height))`,
      );
    }
  }

  function schedule() {
    if (state.suspended || frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      update();
    });
  }

  function bind() {
    install();
    queue.bind();
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    watchBody();
  }

  function watchBody() {
    if (observingBody || !document.body) return;
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    observingBody = true;
  }

  function suspend() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    observer.disconnect();
    bodyObserver.disconnect();
    observingBody = false;
    canvas = null;
    queue.suspend();
  }

  return { open, close: closeMap, update, bind, suspend };
}
