export function createMapTiles(context, { quality, capacity }) {
  const drawImage = context.drawImage.bind(context);
  const cache = new Map();
  const pending = new Map();
  const failed = new Set();
  const container = context.canvas.closest('#game-container');
  let candidates = new Map();
  let visible = new Map();
  let queue = [];
  let frame;
  let bounds;
  let active = true;
  let generation = 0;
  let completed = 0;
  let peak = 0;

  function reset() {
    generation++;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    bounds = undefined;
    for (const entry of pending.values()) entry.abort.abort();
    pending.clear();
    for (const bitmap of cache.values()) bitmap.close();
    cache.clear();
    failed.clear();
    candidates.clear();
    visible.clear();
    queue = [];
  }

  function drain() {
    if (!active || document.hidden || !quality()) return;
    while (pending.size < 2 && queue.length) {
      const url = queue.shift();
      if (!visible.has(url) || pending.has(url) || cache.has(url) || failed.has(url)) continue;
      const entry = { abort: new AbortController(), generation };
      pending.set(url, entry);
      peak = Math.max(peak, pending.size);
      fetch(url, {
        credentials: 'omit',
        cache: 'force-cache',
        redirect: 'error',
        signal: entry.abort.signal,
      })
        .then((response) => {
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
            throw new Error('Map tile unavailable');
          return response.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (entry.generation !== generation || !active) {
            bitmap.close();
            return;
          }
          if (bitmap.width !== 1024 || bitmap.height !== 1024) {
            bitmap.close();
            failed.add(url);
            return;
          }
          cache.set(url, bitmap);
          completed++;
          while (cache.size > capacity()) {
            const oldest = cache.keys().next().value;
            cache.get(oldest).close();
            cache.delete(oldest);
          }
        })
        .catch(() => {
          if (entry.generation === generation) failed.add(url);
        })
        .finally(() => {
          if (entry.generation !== generation) return;
          pending.delete(url);
          drain();
        });
    }
  }

  function startFrame() {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      bounds = undefined;
      visible = candidates;
      candidates = new Map();
      queue = [...visible.keys()].filter(
        (value) => !cache.has(value) && !pending.has(value) && !failed.has(value),
      );
      drain();
    });
  }

  function viewBounds() {
    if (bounds) return bounds;
    const rect = context.canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0))
      return (bounds = { left: 0, right: 0, top: 0, bottom: 0 });
    const clip = container?.getBoundingClientRect() || rect;
    const x = context.canvas.width / rect.width;
    const y = context.canvas.height / rect.height;
    bounds = {
      left: Math.max(0, (Math.max(0, clip.left) - rect.left) * x),
      right: Math.min(context.canvas.width, (Math.min(innerWidth, clip.right) - rect.left) * x),
      top: Math.max(0, (Math.max(0, clip.top) - rect.top) * y),
      bottom: Math.min(context.canvas.height, (Math.min(innerHeight, clip.bottom) - rect.top) * y),
    };
    return bounds;
  }

  function tileUrl(image, args) {
    if (
      !active ||
      document.hidden ||
      !quality() ||
      typeof createImageBitmap !== 'function' ||
      !(image instanceof HTMLImageElement) ||
      !image.complete ||
      image.naturalWidth !== 1024 ||
      image.naturalHeight !== 1024 ||
      !context.canvas.isConnected
    )
      return;
    let url;
    try {
      url = new URL(image.src, location.href);
    } catch (_) {
      return;
    }
    const match = /^\/assets\/map\/tiles_q10\/tile_(-?\d+)_(-?\d+)\.webp$/.exec(url.pathname);
    if (
      url.origin !== location.origin ||
      (image.currentSrc && image.currentSrc !== url.href) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      !match ||
      String(Number(match[1])) !== match[1] ||
      String(Number(match[2])) !== match[2] ||
      Number(match[1]) < -8 ||
      Number(match[1]) > 7 ||
      Number(match[2]) < -5 ||
      Number(match[2]) > 4
    )
      return;
    let rect;
    if (args.length === 2) rect = [...args, image.naturalWidth, image.naturalHeight];
    else if (args.length === 4) rect = args;
    else if (args.length === 8) rect = args.slice(4);
    if (!rect || !rect.every(Number.isFinite)) return;
    const [x, y, width, height] = rect;
    if (!(width > 0 && height > 0)) return;
    const transform = context.getTransform();
    const points = [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ].map(([x, y]) => [
      transform.a * x + transform.c * y + transform.e,
      transform.b * x + transform.d * y + transform.f,
    ]);
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    startFrame();
    const view = viewBounds();
    if (!(view.right > view.left && view.bottom > view.top)) return;
    const left = Math.max(view.left, Math.min(...xs));
    const right = Math.min(view.right, Math.max(...xs));
    const top = Math.max(view.top, Math.min(...ys));
    const bottom = Math.min(view.bottom, Math.max(...ys));
    // Tiny zoomed-out tiles gain little from decoding a large working set.
    if (
      right - left < 192 ||
      bottom - top < 192 ||
      (right - left) * (bottom - top) <
        ((view.right - view.left) * (view.bottom - view.top)) / capacity()
    )
      return;
    url.pathname = url.pathname.replace('/tiles_q10/', `/tiles_${quality()}/`);
    return url.href;
  }

  return {
    drawImage(image, ...args) {
      const url = tileUrl(image, args);
      if (url) {
        if (candidates.size < capacity() || candidates.has(url)) candidates.set(url, true);
        const bitmap = cache.get(url);
        if (bitmap) {
          cache.delete(url);
          cache.set(url, bitmap);
          return drawImage(bitmap, ...args);
        }
      }
      return drawImage(image, ...args);
    },
    reset,
    suspend() {
      active = false;
      reset();
    },
    resume() {
      active = true;
    },
    stats: () => ({
      tileQuality: quality(),
      tileCached: cache.size,
      tilePending: pending.size,
      tileQueued: queue.length,
      tileCompleted: completed,
      tileFailed: failed.size,
      tilePeak: peak,
    }),
  };
}
