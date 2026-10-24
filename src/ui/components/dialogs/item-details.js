import { visible } from '../../dom.js';
import { gameMenu } from '../navigation/game-controls.js';

export function createItemDetails({ state }) {
  const selector = '.global-tooltip.sw-item-details';
  const nodeSelector = '.global-tooltip.node-style';
  const triggers =
    '.potion-row, .inv-slot:not(.empty), .paperdoll .inv-slot.empty, .loot-slot, .potion-stats-toggle-wrap, .equip-compare-toggle-wrap, .spirit-stats-toggle-wrap, .gearcalc-launch-wrap';
  let activeTrigger;
  let touchTrigger;
  let observedTip;
  const actions = new WeakMap();
  const tooltipObserver = new MutationObserver(updateActions);

  function enabled() {
    return state.enabled && !state.suspended;
  }

  function keepDetailsOpen(event) {
    if (!enabled()) return;
    if (event.target.closest?.(`${selector}, ${nodeSelector}`)) {
      // Native tap-outside dismissal runs on document. Let the browser scroll
      // the details without treating that touch as a tap outside the HUD row.
      event.stopPropagation();
    } else {
      touchTrigger = null;
      markDetails(event);
      touchTrigger = activeTrigger?.closest('[data-no-tap-first]') ? null : activeTrigger;
    }
  }

  function markDetails(event) {
    if (!enabled() || event.target.closest?.('.global-tooltip')) return;
    watchTooltip();
    const trigger = event.target.closest?.(triggers);
    if (touchTrigger && trigger !== touchTrigger) {
      event.stopPropagation();
      return;
    }
    activeTrigger = trigger?.querySelector('.tooltip') ? trigger : null;
    if (activeTrigger) rememberAction(activeTrigger);
    document.querySelector('.global-tooltip')?.classList.toggle('sw-item-details', !!activeTrigger);
    if (activeTrigger) positionDetails();
  }

  function rememberAction(trigger) {
    if (!trigger.matches('.bank-slot:not(.empty, .bank-placeholder)')) return;
    const source = trigger.querySelector('.tooltip');
    const hint = source?.textContent.match(
      /(?:left-)?click to (equip|drink|use|open|consume|finish)\b/i,
    );
    const name = hint?.[1].toLowerCase();
    if (name) actions.set(trigger, { item: itemIdentity(trigger), name });
  }

  function itemIdentity(trigger) {
    const name = trigger.querySelector('.tooltip .tt-name')?.textContent.trim();
    const image = trigger.querySelector(':scope > img');
    const tier = trigger.querySelector('.inv-tier-label, .inv-label')?.textContent.trim() || '';
    if (!name || !image?.getAttribute('src')) return null;
    return JSON.stringify([name, image.src, tier]);
  }

  function actionable(trigger) {
    if (
      !trigger.isConnected ||
      !Array.from(trigger.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)
    )
      return false;
    for (let node = trigger; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        node.hidden ||
        style.display === 'none' ||
        style.visibility !== 'visible' ||
        style.opacity === '0' ||
        node.matches('[disabled], [aria-disabled=true], .disabled, .bank-placeholder')
      )
        return false;
    }
    return true;
  }

  function actionFor(trigger) {
    if (trigger.matches('[disabled], [aria-disabled=true], .disabled, .bank-placeholder')) return;
    if (trigger.closest('.sw-equipment-picker .bank-grid')) return 'Equip';
    const saved = actions.get(trigger);
    if (saved && saved.item === itemIdentity(trigger)) {
      return saved.name[0].toUpperCase() + saved.name.slice(1);
    }
    if (trigger.matches('.bank-slot')) {
      if (trigger.querySelector('.tt-equip-table')) return 'Equip';
      if (trigger.querySelector('.tt-potion-boost')) return 'Drink';
    }
    if (trigger.closest('#bag-panel') && bankItem(trigger)) return 'View in Bank';
  }

  function bankItem(trigger) {
    const identity = itemIdentity(trigger);
    if (!identity) return;
    const matches = Array.from(document.querySelectorAll('#tab-bank .bank-grid .bank-slot')).filter(
      (slot) =>
        itemIdentity(slot) === identity &&
        !slot.matches('.empty, .bank-placeholder, .disabled, [disabled], [aria-disabled=true]'),
    );
    return matches.length === 1 ? matches[0] : undefined;
  }

  function updateActions() {
    if (!enabled() || !activeTrigger?.isConnected) return;
    const tip = document.querySelector(selector);
    if (!tip || tip.querySelector('.sw-item-actions')) return;
    const bar = document.createElement('div');
    bar.className = 'sw-item-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', back);
    bar.append(close);
    const label = actionFor(activeTrigger);
    if (label) {
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = label;
      action.className = 'sw-item-action';
      const trigger = activeTrigger;
      const identity = itemIdentity(trigger);
      const itemId = trigger.dataset.itemId;
      action.addEventListener('click', () => {
        if (!enabled() || activeTrigger !== trigger) return;
        if (
          !actionable(trigger) ||
          identity !== itemIdentity(trigger) ||
          itemId !== trigger.dataset.itemId ||
          actionFor(trigger) !== label
        ) {
          back();
          return;
        }
        action.disabled = true;
        if (label === 'View in Bank') {
          back();
          gameMenu('bank')?.click();
          const item = bankItem(trigger);
          if (item && actionable(item)) {
            item.scrollIntoView({ block: 'nearest' });
            item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            touchTrigger = activeTrigger;
          }
        } else {
          trigger.click();
          back();
        }
      });
      bar.append(action);
    }
    tip.append(bar);
  }

  function watchTooltip() {
    const tip = document.querySelector('.global-tooltip');
    if (tip === observedTip) return;
    tooltipObserver.disconnect();
    observedTip = tip;
    if (tip) tooltipObserver.observe(tip, { childList: true });
  }

  function positionDetails() {
    if (!enabled() || !activeTrigger?.isConnected) return;
    const tip = document.querySelector(selector);
    const nav = document.querySelector('#sw-nav');
    if (!tip || !nav) return;
    const dock = nav.getBoundingClientRect();
    const health = document.querySelector('.hp-bar')?.getBoundingClientRect();
    const overlay = activeTrigger.closest('.modal-overlay, .ledger-return-overlay, .ledger-night');
    const header = overlay
      ?.querySelector('.modal-header, .ledger-card-head, .ledger-night-top')
      ?.getBoundingClientRect();
    const footer = overlay
      ?.querySelector('.ledger-card-foot, .ledger-night-actions')
      ?.getBoundingClientRect();
    const top = Math.max(
      8,
      health?.height ? health.bottom + 8 : 8,
      (overlay?.getBoundingClientRect().top || 0) + 8,
      header?.height ? header.bottom + 8 : 8,
    );
    const dockBottom = document.documentElement.classList.contains('sw-landscape')
      ? dock.bottom - 8
      : dock.top - 8;
    const bottom = Math.min(dockBottom, footer?.height ? footer.top : dockBottom);
    const trigger = activeTrigger.getBoundingClientRect();
    const above = Math.max(0, trigger.top - top);
    const below = Math.max(0, bottom - trigger.bottom);
    const height = Math.min(400, Math.max(above, below));
    const y = below >= above ? trigger.bottom : trigger.top - height;
    tip.style.setProperty('--sw-item-top', `${Math.max(top, y)}px`);
    tip.style.setProperty('--sw-item-max-height', `${height}px`);
  }

  function dismissDetails(relatedTarget) {
    // The singleton lives outside the UI root. Forward its departure to the
    // original trigger so the game's tooltip manager clears its own state.
    const trigger = activeTrigger;
    const touched = !!touchTrigger;
    activeTrigger = null;
    touchTrigger = null;
    const tip = document.querySelector(selector);
    tip?.querySelector('.sw-item-actions')?.remove();
    tip?.classList.remove('sw-item-details');
    const origin = trigger?.isConnected ? trigger : document.getElementById('ui-container');
    if (trigger || tip)
      origin?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget }));
    if (touched) {
      // Recent touches suppress native mouseout dismissal. Use its touch-outside
      // handler on the containing UI, without dispatching a gameplay click.
      let outside = trigger?.isConnected ? trigger.parentElement : null;
      while (outside?.closest(triggers)) outside = outside.parentElement;
      (outside || document.getElementById('ui-container'))?.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [],
        }),
      );
    }
    if (tip) tip.style.display = 'none';
  }

  function back() {
    const node = document.querySelector(nodeSelector);
    const nodeOpen = visible(node);
    if (nodeOpen) {
      document.body.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [],
          targetTouches: [],
          changedTouches: [],
        }),
      );
      node.style.display = 'none';
    }
    const open = visible(document.querySelector(selector));
    dismissDetails(document.body);
    return nodeOpen || open;
  }

  function handleMouseOut(event) {
    if (!enabled()) return;
    if (touchTrigger && event.isTrusted) {
      event.stopPropagation();
      return;
    }
    if (event.relatedTarget?.closest?.(selector)) {
      if (event.target.closest?.(triggers)) event.stopPropagation();
    } else if (event.target.closest?.(selector)) {
      dismissDetails(event.relatedTarget);
    }
  }

  function bind() {
    window.addEventListener('touchstart', keepDetailsOpen, { capture: true, passive: true });
    window.addEventListener('mouseover', markDetails, { capture: true });
    window.addEventListener('mouseout', handleMouseOut, { capture: true });
    window.addEventListener('click', (event) => {
      if (
        enabled() &&
        !event.defaultPrevented &&
        activeTrigger?.contains(event.target) &&
        !actionable(activeTrigger)
      )
        back();
    });
    watchTooltip();
    const resize = () => requestAnimationFrame(positionDetails);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.addEventListener(
      'scroll',
      (event) => {
        if (event.target.contains?.(activeTrigger)) positionDetails();
      },
      { capture: true, passive: true },
    );
  }

  function suspend() {
    back();
    tooltipObserver.disconnect();
    observedTip = null;
  }

  return { bind, back, suspend };
}
