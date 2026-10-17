import { capturePlacement, hasChangedElement, restorePlacement } from '../../dom.js';

export function createLedgerLayout({ state }) {
  let placement;
  let modal;
  let observer;

  function restore() {
    if (placement?.node.isConnected) restorePlacement(placement);
    placement = null;
  }

  function watch() {
    const nextModal = document.querySelector('.modal-main');
    if (modal === nextModal) return;
    observer?.disconnect();
    modal = nextModal;
    if (!modal) return;
    observer = new MutationObserver((records) => {
      if (
        hasChangedElement(
          records,
          (node) =>
            node.matches('.ledger, .ledger-top, .ledger-header-slot') ||
            node.querySelector('.ledger-top'),
        )
      )
        update();
    });
    observer.observe(modal, { childList: true, subtree: true });
  }

  function suspend() {
    observer?.disconnect();
    modal = null;
    restore();
  }

  function update() {
    if (!state.enabled || state.suspended) {
      suspend();
      return;
    }
    watch();
    const ledger = document.querySelector('#tab-ledger .ledger');
    if (placement && placement.node.parentNode !== ledger) restore();
    if (!ledger || placement) return;
    const top = document.querySelector('.ledger-header-slot > .ledger-top');
    if (!top) return;
    placement = capturePlacement(top);
    ledger.prepend(top);
  }

  return { update, suspend };
}
