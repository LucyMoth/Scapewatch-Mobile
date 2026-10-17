import { $, visible } from '../../dom.js';
import { zoomMap } from './zoom.js';

const defaultZoom = 1;
const minimumLaunchZoom = 2.6;
const maximumLaunchZoom = 4.4;
const nativeZoomStep = 0.1;

export function createInitialZoom({ state }) {
  let applied = false;
  let health;
  let frame;
  const observer = new MutationObserver(update);

  function ready() {
    // Login hides before game_init. The native HP label starts at 0 / 0 and
    // receives its real maximum only after the game can accept camera input.
    const maximum = health?.textContent.split('/')[1]?.replace(/[,.\s]/g, '');
    return (
      state.enabled &&
      !state.suspended &&
      !document.body.classList.contains('login-active') &&
      Number(maximum) > 0
    );
  }

  function stop() {
    applied = true;
    suspend();
  }

  function apply() {
    frame = null;
    if (!ready()) return;
    const canvas = $('#game-canvas');
    if (!canvas) return;
    const combat = $('.combat-encounter:not(.chalk-board)');
    if (visible(combat) || $('.recenter-camera-btn.combat-active')) {
      stop();
      return;
    }
    const logicalWidth = window.__swRendering?.stats().logicalWidth;
    const bounds = canvas.getBoundingClientRect();
    const width = bounds.width;
    if (!(width > 0)) return;
    const viewportScale = (logicalWidth || width) / width;
    const target = Math.min(maximumLaunchZoom, Math.max(minimumLaunchZoom, viewportScale * 2.1));
    const steps = Math.ceil(target / nativeZoomStep) - defaultZoom / nativeZoomStep;
    stop();
    for (let remaining = steps; remaining > 0; remaining -= 8)
      zoomMap(canvas, Math.min(8, remaining), {
        x: bounds.x + width / 2,
        y: bounds.y + bounds.height / 2,
      });
  }

  function update() {
    if (applied || state.suspended) return;
    if (!state.enabled) {
      stop();
      return;
    }
    const next = $('.hp-bar-text');
    if (next !== health) {
      observer.disconnect();
      health = next;
      if (health) observer.observe(health, { childList: true, characterData: true, subtree: true });
    }
    if (ready() && !frame) {
      // Let the native frame establish its logical canvas size and restore any
      // saved combat camera before applying the launch view.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(apply);
      });
    }
  }

  function suspend() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    observer.disconnect();
    health = null;
  }

  return { update, stop, suspend };
}
