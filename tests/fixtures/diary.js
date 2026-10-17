(function () {
  'use strict';
  const state = window.fixtureState;
  const host = window.fixtureDiaryHost;
  state.diaryStepperClicks = [];
  state.diaryCardClicks = [];
  function create(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function listen(element, type, callback) {
    element.addEventListener(type, callback);
    state.listeners.push({ el: element, type, fn: callback });
  }
  const summary = create('diary-modal-summary');
  summary.innerHTML =
    '<span class="diary-modal-title">Diary Achievements</span>' +
    '<span class="diary-modal-sub">132 / 2611 Diaries (5%)</span>' +
    '<div class="diary-bar diary-all-bar"><div class="diary-bar-fill" style="width:5%"></div></div>' +
    '<div class="diary-modal-help">Each bank location has a diary covering every nearby activity and combat encounter. Fill it to 20/40/60/80/100% to earn free node weight (tier 1 to 5). Use the stepper on a location to push all of its nodes that far in Skill Customization at no skill-credit cost. Nodes you already paid to push further are left untouched.</div>' +
    '<input type="text" class="diary-modal-search" placeholder="Search locations or activities…">';
  const grid = create('diary-modal-grid');
  for (const name of ['Archrest', 'Battlefrost', 'Timberchill Yard', 'Valley of Giants']) {
    const card = create('diary-modal-card diary-row');
    card.dataset.bankId = name;
    card.innerHTML =
      '<div class="diary-row-top"><span class="diary-bank-name">' +
      name +
      '</span><span class="diary-bank-count">4/46</span></div>' +
      '<div class="diary-bar"><div class="diary-bar-fill" style="width:8%"></div></div>' +
      '<div class="diary-row-meta"><span class="diary-tier-badge tier-0">Tier 0</span><span class="diary-tier-reward">No bonus yet</span></div>' +
      '<div class="diary-modal-bulk"><div class="diary-bulk-labels"><span class="diary-bulk-label">Nearby nodes</span><span class="diary-bulk-avgdist">Average distance 20</span></div>' +
      '<div class="diary-bulk-stepper"><div class="diary-bulk-btn minus" data-dir="-1">−</div><span class="diary-bulk-val">0</span><div class="diary-bulk-btn plus" data-dir="1">+</div><div class="diary-bulk-reset">Reset</div></div></div>' +
      '<div class="diary-steps" style="display:none"><div class="diary-step">Gathering activity</div></div>';
    listen(card, 'click', (event) => {
      const stepper = event.target.closest('.diary-bulk-btn, .diary-bulk-reset');
      if (stepper) {
        state.diaryStepperClicks.push([name, stepper.dataset.dir || 'reset']);
        return;
      }
      state.diaryCardClicks.push(name);
      const details = card.querySelector('.diary-steps');
      details.style.display = details.style.display === 'none' ? '' : 'none';
    });
    grid.append(card);
  }
  listen(summary.querySelector('input'), 'input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    for (const card of grid.children) {
      card.style.display = card.dataset.bankId.toLowerCase().includes(query) ? '' : 'none';
    }
  });
  host.append(summary, grid);
})();
