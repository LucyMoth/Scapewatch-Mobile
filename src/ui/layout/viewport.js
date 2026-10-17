import { $ } from '../dom.js';
import { isLandscapeDisplay } from '../platform/orientation.js';
export function createViewport({ root, state, setFlag, scheduleGeometry }) {
  let viewportMeta;
  let originalViewport;
  function syncViewportMeta() {
    const meta = $('meta[name="viewport"]');
    if (!meta) return;
    if (meta !== viewportMeta) {
      viewportMeta = meta;
      originalViewport = meta.getAttribute('content');
    }
    const content = state.enabled
      ? 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover'
      : originalViewport;
    if (meta.getAttribute('content') !== content) {
      if (content === null) meta.removeAttribute('content');
      else meta.setAttribute('content', content);
    }
  }
  function viewport() {
    syncViewportMeta();
    setFlag('sw-landscape', state.enabled && innerWidth >= 600 && isLandscapeDisplay());
    if (!state.enabled) return;
    const vv = window.visualViewport;
    // Android adjustResize and visualViewport both account for the on-screen keyboard.
    const h = `${Math.round(vv?.height || innerHeight)}px`;
    const w = `${Math.round(innerWidth)}px`;
    if (root.style.getPropertyValue('--sw-height') !== h) root.style.setProperty('--sw-height', h);
    if (root.style.getPropertyValue('--sw-width') !== w) root.style.setProperty('--sw-width', w);
    scheduleGeometry();
  }
  return { update: viewport };
}
