(() => {
  const ui = document.getElementById('ui-container');
  const state = window.fixtureNativeLedger;
  const node = (className, text) => {
    const element = document.createElement('div');
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  state.nightWakes = 0;
  state.nightSleeps = 0;
  window.fixtureNativeNightReceipt = function () {
    window.fixtureNativeReceipt();
    const receipt = ui.querySelector('.ledger-return-overlay');
    const night = node('ledger-night');
    const card = node('ledger-night-card');
    card.style.display = 'contents';
    const top = node('ledger-night-top ledger-night-fade');
    top.append(node('ledger-night-title', 'While you slept'));
    const body = node('ledger-night-body');
    body.style.bottom = '700px';
    const left = node('ledger-night-col ledger-night-col-left');
    const stack = node('ledger-night-stack');
    const scene = node('sleep-scene');
    const moon = node('sleep-moon');
    moon.innerHTML = document.querySelector('.window-control-btn-sleep svg').outerHTML;
    moon.querySelector('svg').setAttribute('width', '240');
    moon.querySelector('svg').setAttribute('height', '240');
    scene.append(moon, node('sleep-char'));
    stack.append(
      scene,
      node('sleep-timer', 'Slept for 01:23:45'),
      node('sleep-note', 'Your character is still playing. Offline time is not being used.'),
      node('sleep-status'),
    );
    left.append(stack, receipt.querySelector('.ledger-sec-miles'));
    const mid = node('ledger-night-col ledger-night-col-mid');
    mid.append(receipt.querySelector('.ledger-sec-skills'));
    const right = node('ledger-night-col ledger-night-col-right');
    right.append(receipt.querySelector('.ledger-sec-loot'));
    body.append(left, mid, right);
    const actions = node('ledger-night-actions');
    actions.style.top = '700px';
    const wake = node('sleep-wake-btn', 'Wake Up');
    wake.addEventListener('click', (event) => {
      event.stopPropagation();
      state.nightWakes++;
      night.classList.add('ledger-night-leaving');
      setTimeout(() => night.remove(), 1500);
    });
    const open = node('ledger-night-open ledger-night-fade', 'Open Ledger');
    open.addEventListener('click', (event) => {
      event.stopPropagation();
      night.remove();
      window.fixtureNativeLedgerOpen();
    });
    const sleep = node('ledger-night-open ledger-night-fade', 'Sleep');
    sleep.addEventListener('click', (event) => {
      event.stopPropagation();
      state.nightSleeps++;
      night.classList.add('ledger-night-returning');
      setTimeout(() => {
        night.remove();
        document.querySelector('.window-control-btn-sleep').click();
      }, 750);
    });
    actions.append(wake, open, sleep);
    card.append(top, body, actions);
    night.append(card);
    receipt.remove();
    ui.append(night);
  };
})();
