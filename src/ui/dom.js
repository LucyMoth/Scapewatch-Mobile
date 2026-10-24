export const $ = (selector) => document.querySelector(selector);
export const all = (selector) => Array.from(document.querySelectorAll(selector));
export function capturePlacement(node) {
  return { node, parent: node.parentNode, next: node.nextSibling };
}
export function restorePlacement(placement) {
  if (!placement?.parent.isConnected) return;
  const { node, parent, next } = placement;
  parent.insertBefore(node, next?.parentNode === parent ? next : null);
}
export function hasChangedElement(records, predicate) {
  return records.some((record) =>
    [...record.addedNodes, ...record.removedNodes].some(
      (node) => node.nodeType === 1 && predicate(node),
    ),
  );
}
export function visible(el) {
  return !!(el && el.isConnected && getComputedStyle(el).display !== 'none');
}
export function blockingOverlay() {
  return (
    document.body.classList.contains('login-active') ||
    document.body.classList.contains('modal-open') ||
    all(
      '.ledger-return-overlay, .ledger-night, .sleep-overlay, .gc-modal-overlay, .cc-overlay, .chest-overlay, .cd-popup-overlay, .steam-prompt-overlay',
    ).some(visible)
  );
}
