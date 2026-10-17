export function createMenuAssets({ state }) {
  const assets = new Map();
  const pending = new Set();
  const queue = [];
  let cancelIdle;

  function active() {
    return (
      state.enabled &&
      !state.suspended &&
      !document.hidden &&
      !document.body.classList.contains('login-active')
    );
  }

  function drain() {
    if (!active()) return;
    while (pending.size < 2 && queue.length) {
      const url = queue.shift();
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      assets.set(url, image);
      pending.add(url);
      image.onload = image.onerror = () => {
        image.onload = image.onerror = null;
        pending.delete(url);
        drain();
      };
      image.src = url;
    }
  }

  function warm() {
    cancelIdle = null;
    if (!active() || state.view !== 'menu') return;
    // These CSS backgrounds otherwise start loading when Monsters first opens.
    // Warm only the first screen, without requesting every mob or sprite atlas.
    for (const node of document.querySelectorAll('#tab-mobs .mob-row-icon')) {
      if (assets.size + queue.length >= 4) break;
      const value = node.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
      if (!value) continue;
      let url;
      try {
        url = new URL(value, location.href);
      } catch (_) {
        continue;
      }
      if (
        url.origin !== location.origin ||
        !/^\/assets\/mobs\/bg\/[a-z0-9_-]+\.png$/i.test(url.pathname) ||
        url.search ||
        assets.has(url.href) ||
        queue.includes(url.href)
      )
        continue;
      queue.push(url.href);
    }
    drain();
  }

  function schedule() {
    if (cancelIdle || !active() || state.view !== 'menu' || assets.size >= 4) return;
    if (window.requestIdleCallback) {
      const id = requestIdleCallback(warm, { timeout: 1500 });
      cancelIdle = () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(warm, 150);
      cancelIdle = () => clearTimeout(id);
    }
  }

  function suspend() {
    cancelIdle?.();
    cancelIdle = null;
    for (const url of pending) {
      const image = assets.get(url);
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      assets.delete(url);
    }
    pending.clear();
    queue.length = 0;
  }

  return { schedule, suspend };
}
