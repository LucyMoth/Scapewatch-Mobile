(() => {
  const ui = document.getElementById('ui-container');
  const container = document.createElement('div');
  container.className = 'celebration-container';
  ui.appendChild(container);
  const icon = document.querySelector('.panel-tab-btn img').src;

  window.fixtureCelebration = (type) => {
    container.replaceChildren();
    const card = document.createElement('div');
    if (type === 'task') {
      card.className = 'celeb-task';
      card.innerHTML = '<div class="celeb-task-text">Task Complete!</div>';
    } else if (type === 'quest') {
      card.className = 'celeb-quest-step';
      card.innerHTML = `<div class="celeb-quest-step-title">Quest Step Complete!</div><div class="celeb-skill-row"><img class="celeb-icon" src="${icon}" alt="Quest"><span class="celeb-quest-step-sub">A journey through the distant frozen mountains — 12 / 18</span></div>`;
    } else {
      card.className = 'celeb-levelup';
      card.innerHTML = `<div class="celeb-title">LEVEL UP!</div><div class="celeb-skill-row"><img class="celeb-icon" src="${icon}" alt="Vigor"><span class="celeb-level-text">Vigor 119</span></div>`;
    }
    container.appendChild(card);
    return card;
  };
})();
