import { $, all } from '../dom.js';
export function createGeometry({ root, state }) {
  let geometryFrame;
  let geometryResizeObserver;
  let geometryStateObserver;
  let geometryTargets = [];
  function liveHeight(node) {
    if (!node || !node.isConnected || getComputedStyle(node).visibility === 'hidden') return 0;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? Math.ceil(rect.height) : 0;
  }
  function setMeasure(name, value) {
    const next = `${value}px`;
    if (root.style.getPropertyValue(name) !== next) root.style.setProperty(name, next);
  }
  function measureGeometry() {
    geometryFrame = null;
    if (state.suspended || !state.enabled) return;
    const camera = $('.recenter-camera-btn');
    const panel = $('.active-potions-panel');
    const pill = $('.active-potions-pill');
    const task = $('.floating-current-task');
    const combatHud = $('.combat-encounter:not(.chalk-board) .combat-hud');
    const fortressLeave = $('.gauntlet-leave-btn');
    const hp = $(':is(#ui-container, #hud-layer) > .hp-bar') || $('.hp-bar');
    const hud = $('.ingame-hud');
    const mini = $('#sw-mini-chat');
    setMeasure('--sw-hp-height', liveHeight(hp));
    setMeasure(
      '--sw-raid-height',
      Math.max(liveHeight($('.raid-contrib-hud')), liveHeight($('.gauntlet-hud'))),
    );
    setMeasure('--sw-camera-height', liveHeight(camera));
    setMeasure('--sw-potions-height', Math.max(liveHeight(panel), liveHeight(pill)));
    setMeasure('--sw-task-height', liveHeight(task));
    setMeasure(
      '--sw-combat-hud-height',
      Math.max(liveHeight(combatHud), liveHeight(fortressLeave)),
    );
    setMeasure('--sw-mini-height', liveHeight(mini));
    setMeasure(
      '--sw-hud-bottom',
      liveHeight(hud) ? Math.ceil(hud.getBoundingClientRect().bottom) : 0,
    );
  }
  function scheduleGeometry() {
    if (!state.suspended && !geometryFrame) geometryFrame = requestAnimationFrame(measureGeometry);
  }
  function watchGeometry(force = false) {
    if (state.suspended) return;
    const targets = all(
      '.recenter-camera-btn, .active-potions-panel, .active-potions-pill, .floating-current-task, .combat-encounter:not(.chalk-board) .combat-hud, .raid-contrib-hud, .gauntlet-hud, .gauntlet-leave-btn, .hp-bar, .ingame-hud, #sw-mini-chat',
    );
    if (
      !force &&
      targets.length === geometryTargets.length &&
      targets.every((node, i) => node === geometryTargets[i])
    )
      return;
    geometryResizeObserver?.disconnect();
    geometryStateObserver?.disconnect();
    geometryTargets = targets;
    // Observe the sizes and visibility of a few stable HUD elements. Numeric
    // tick text, progress fills and world animation are never subtree-observed.
    if (typeof ResizeObserver !== 'undefined') {
      geometryResizeObserver = new ResizeObserver(scheduleGeometry);
      targets.forEach((node) => geometryResizeObserver.observe(node));
    }
    const visibilityState = new WeakMap();
    const signature = (node) =>
      `${node.hidden}|${node.style.display}|${node.style.visibility}|${node.className}`;
    targets.forEach((node) => visibilityState.set(node, signature(node)));
    geometryStateObserver = new MutationObserver((records) => {
      let changed = false;
      for (const node of new Set(records.map((record) => record.target))) {
        const next = signature(node);
        if (next !== visibilityState.get(node)) {
          visibilityState.set(node, next);
          changed = true;
        }
      }
      if (changed) scheduleGeometry();
    });
    targets.forEach((node) =>
      geometryStateObserver.observe(node, {
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      }),
    );
    scheduleGeometry();
  }
  function suspend() {
    if (geometryFrame) cancelAnimationFrame(geometryFrame);
    geometryFrame = null;
    geometryResizeObserver?.disconnect();
    geometryStateObserver?.disconnect();
    geometryTargets = [];
  }
  return { schedule: scheduleGeometry, watch: watchGeometry, suspend };
}
