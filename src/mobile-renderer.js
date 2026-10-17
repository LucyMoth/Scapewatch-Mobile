import { isGamePage, PREFERENCE_KEYS } from './environment.js';
import { createRouteStroke } from './renderer/route-strokes.js';
import { createMapTiles } from './renderer/map-tiles.js';

export function initializeRenderer() {
  'use strict';
  if (!isGamePage() || window.__swRendering) return;
  const profiles = {
    balanced: { dpr: 1.5, pixels: 1250000 },
    high: { dpr: 2, pixels: 2500000 },
    battery: { dpr: 1, pixels: 700000 },
    original: null,
  };
  let preferred = 'balanced';
  try {
    const saved = localStorage.getItem(PREFERENCE_KEYS.renderer);
    if (saved in profiles) preferred = saved;
  } catch (_) {}
  let mode = preferred;
  let canvas;
  let context;
  let requestedWidth;
  let requestedHeight;
  let scale = 1;
  let depth = 0;
  let widthProperty;
  let heightProperty;
  let nativeTransform;
  let nativeSave;
  let nativeRestore;
  let nativeStroke;
  let nativeDrawImage;
  let mapTiles;
  let lastTransform;
  let attached = false;
  let width = innerWidth;
  let height = innerHeight;
  let startupObserver;
  const iconSeen = new Set();
  const iconPending = new Map();
  const iconQueue = [];
  let iconCompleted = 0;
  let iconPeak = 0;
  let pageActive = true;
  function geometry() {
    width = innerWidth;
    height = innerHeight;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
      resize();
    }
  }
  function applyTransform(args) {
    // The renderer's outer transform is logical-DPR. Map tiles temporarily use
    // identity inside save/restore with ALREADY raster-scaled coordinates.
    if (
      mode !== 'original' &&
      depth === 0 &&
      args.length === 6 &&
      args.every((value) => typeof value === 'number') &&
      args[1] === 0 &&
      args[2] === 0 &&
      args[0] > 0 &&
      args[3] > 0 &&
      Math.abs(args[0] - args[3]) < 0.001 &&
      args[4] === 0 &&
      args[5] === 0
    ) {
      lastTransform = args.slice();
      return nativeTransform(args[0] * scale, 0, 0, args[3] * scale, 0, 0);
    }
    if (depth === 0 && args.length === 6) lastTransform = args.slice();
    return nativeTransform(...args);
  }
  function resize() {
    if (!attached || !(requestedWidth > 0 && requestedHeight > 0)) return;
    const profile = profiles[mode];
    scale = profile
      ? Math.min(
          1,
          (width * profile.dpr) / requestedWidth,
          (height * profile.dpr) / requestedHeight,
          Math.sqrt(profile.pixels / (requestedWidth * requestedHeight)),
        )
      : 1;
    const w = Math.max(1, Math.floor(requestedWidth * scale));
    const h = Math.max(1, Math.floor(requestedHeight * scale));
    let changed = false;
    if (widthProperty.get.call(canvas) !== w) {
      widthProperty.set.call(canvas, w);
      changed = true;
    }
    if (heightProperty.get.call(canvas) !== h) {
      heightProperty.set.call(canvas, h);
      changed = true;
    }
    if (changed) {
      depth = 0;
      // Setting a native canvas dimension resets its entire 2D state. The
      // official renderer establishes state again on its next normal frame.
      if (lastTransform) applyTransform(lastTransform);
    }
  }
  function attach() {
    canvas = document.getElementById('game-canvas');
    if (!canvas || attached) return;
    context = canvas.getContext('2d');
    if (!context) return;
    widthProperty = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
    heightProperty = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
    requestedWidth = widthProperty.get.call(canvas);
    requestedHeight = heightProperty.get.call(canvas);
    nativeTransform = context.setTransform.bind(context);
    nativeSave = context.save.bind(context);
    nativeRestore = context.restore.bind(context);
    nativeStroke = context.stroke.bind(context);
    nativeDrawImage = context.drawImage.bind(context);
    try {
      Object.defineProperty(canvas, 'width', {
        configurable: true,
        get: () => widthProperty.get.call(canvas),
        set: (value) => {
          requestedWidth = Math.max(1, Math.floor(Number(value) || 1));
          resize();
        },
      });
      Object.defineProperty(canvas, 'height', {
        configurable: true,
        get: () => heightProperty.get.call(canvas),
        set: (value) => {
          requestedHeight = Math.max(1, Math.floor(Number(value) || 1));
          resize();
        },
      });
      context.setTransform = (...args) => applyTransform(args);
      context.save = () => {
        nativeSave();
        depth++;
      };
      context.restore = () => {
        nativeRestore();
        depth = Math.max(0, depth - 1);
      };
      context.stroke = createRouteStroke(context, {
        isOriginalUi: () =>
          mode === 'original' && !document.documentElement.classList.contains('sw-mobile'),
        viewportWidth: () => width,
      });
      mapTiles = createMapTiles(context, {
        quality: () => (mode === 'balanced' ? 'q95' : mode === 'high' ? 'q100' : null),
        capacity: () => (mode === 'high' ? 12 : 8),
      });
      context.drawImage = mapTiles.drawImage;
      attached = true;
      startupObserver?.disconnect();
      startupObserver = null;
      geometry();
    } catch (_) {
      delete canvas.width;
      delete canvas.height;
      context.setTransform = nativeTransform;
      context.save = nativeSave;
      context.restore = nativeRestore;
      context.stroke = nativeStroke;
      context.drawImage = nativeDrawImage;
      mapTiles?.suspend();
      attached = false;
      mode = 'original';
    }
  }
  function drainIcons() {
    if (!pageActive) return;
    while (iconPending.size < 2 && iconQueue.length) {
      const url = iconQueue.shift();
      const img = new Image();
      img.decoding = 'async';
      iconPending.set(url, img);
      iconPeak = Math.max(iconPeak, iconPending.size);
      const release = () => {
        img.onload = null;
        img.onerror = null;
        iconPending.delete(url);
        iconCompleted++;
        drainIcons();
      };
      img.onload = release;
      img.onerror = release;
      img.src = url;
    }
  }
  function preloadIcons(urls) {
    for (const value of urls) {
      if (iconSeen.size >= 8) break;
      let url;
      try {
        url = new URL(value, location.href);
      } catch (_) {
        continue;
      }
      // Warm only tiny official UI assets. Never preload maps, sprite atlases,
      // authenticated endpoints, or a full world cache.
      if (
        url.origin !== location.origin ||
        !/^\/assets\/icons\/(ui|skills)\/[a-z0-9_-]+\.png$/i.test(url.pathname) ||
        iconSeen.has(url.href)
      )
        continue;
      iconSeen.add(url.href);
      iconQueue.push(url.href);
    }
    drainIcons();
  }
  window.__swRendering = {
    setMode(next, persist = false) {
      if (!(next in profiles)) return;
      if (next !== mode) mapTiles?.reset();
      mode = next;
      if (persist) {
        preferred = next;
        try {
          localStorage.setItem(PREFERENCE_KEYS.renderer, next);
        } catch (_) {}
      }
      geometry();
    },
    preferred: () => preferred,
    preloadIcons,
    stats: () => ({
      mode,
      attached,
      requestedWidth,
      requestedHeight,
      logicalWidth: lastTransform?.[0] > 0 ? requestedWidth / lastTransform[0] : null,
      logicalHeight: lastTransform?.[3] > 0 ? requestedHeight / lastTransform[3] : null,
      width: canvas ? widthProperty?.get.call(canvas) : null,
      height: canvas ? heightProperty?.get.call(canvas) : null,
      scale,
      saveDepth: depth,
      preloadSeen: iconSeen.size,
      preloadPending: iconPending.size,
      preloadQueued: iconQueue.length,
      preloadCompleted: iconCompleted,
      preloadPeak: iconPeak,
      ...mapTiles?.stats(),
    }),
  };
  window.addEventListener('resize', geometry, { passive: true });
  window.addEventListener('pagehide', () => {
    pageActive = false;
    mapTiles?.suspend();
    iconQueue.length = 0;
    for (const img of iconPending.values()) {
      img.onload = null;
      img.onerror = null;
    }
    iconPending.clear();
    startupObserver?.disconnect();
  });
  window.addEventListener('pageshow', () => {
    pageActive = true;
    mapTiles?.resume();
    if (!attached) attach();
    geometry();
  });
  if (document.getElementById('game-canvas')) attach();
  else {
    startupObserver = new MutationObserver(() => {
      if (document.getElementById('game-canvas')) attach();
    });
    startupObserver.observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  }
}
