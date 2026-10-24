import { isGamePage } from './environment.js';

export function prepareGameLayout() {
  if (!isGamePage()) return false;
  if (window.__swLayoutReloadPending) return false;
  try {
    // The wrapper adapts the desktop controls. Starting both phone layouts
    // would let two controllers move and hide the same game panels.
    const url = new URL(window.location.href);
    if (/[?&]layout=(mobile|auto)\b/.test(url.search)) {
      url.searchParams.set('layout', 'desktop');
      window.history.replaceState(window.history.state, '', url);
    }
    localStorage.setItem('scapewatch_layout', 'desktop');
    if (localStorage.getItem('scapewatch_layout') !== 'desktop') return false;
  } catch (_) {
    return false;
  }

  // Older WebViews may inject after the game's phone controller starts.
  // Reload with its supported preference instead of dismantling live UI.
  if (
    document.documentElement?.classList.contains('mobile-layout') ||
    document.getElementById('m-shell')
  ) {
    window.__swLayoutReloadPending = true;
    window.location.reload();
    return false;
  }
  return true;
}
