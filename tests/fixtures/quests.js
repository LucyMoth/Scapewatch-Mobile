(function () {
  'use strict';
  const state = window.fixtureState;
  state.questSelections = [];
  state.questActions = [];
  let selectedQuest;
  let activeFilter = 'all';
  const tab = document.querySelector('#tab-quests');
  const source = document.querySelector('.panel-tab-btn img').src;
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text) element.textContent = text;
    return element;
  }
  const layout = node('quest-layout');
  const list = node('quest-list-side');
  const toolbar = node('quest-list-toolbar');
  const search = node('quest-search', '', 'input');
  search.placeholder = 'Search quests...';
  toolbar.append(search);
  for (const [filter, text] of [
    ['all', 'All'],
    ['available', 'Available'],
    ['progress', 'In Progress'],
    ['completed', 'Completed'],
    ['locked', 'Locked'],
  ]) {
    const button = node('quest-filter-btn' + (filter === 'all' ? ' active' : ''), text, 'button');
    button.dataset.filter = filter;
    button.addEventListener('click', () => {
      activeFilter = filter;
      toolbar
        .querySelectorAll('.quest-filter-btn')
        .forEach((option) => option.classList.toggle('active', option.dataset.filter === filter));
      renderRows(selectedQuest);
    });
    toolbar.append(button);
  }
  const sort = node('quest-sort-row');
  sort.append(node('quest-sort-label', 'Sort:'));
  for (const text of ['Level Req', 'Steps', 'Name A-Z'])
    sort.append(node('quest-sort-btn', text, 'button'));
  const scroll = node('quest-list-scroll');
  const detail = node('quest-detail-side');
  detail.append(node('no-selection', 'Select a quest to view details'));
  list.append(toolbar, sort, scroll);
  layout.append(list, detail);
  tab.replaceChildren(layout);

  function showDetail(index) {
    selectedQuest = index;
    const header = node('quest-detail-header');
    header.append(
      node('quest-detail-title', 'Sandscale Burnt Supper ' + index),
      node(
        'quest-detail-desc',
        'Bring fresh catch before the boats land, then return to the cook.',
      ),
    );
    const requirements = node('quest-reqs-section');
    const group = node('quest-reqs-group');
    group.append(
      node('quest-reqs-label', 'Level Requirements'),
      node('quest-req-item', 'Cook Lv 20'),
    );
    requirements.append(group);
    const content = node('quest-detail-content');
    const steps = node('quest-steps-col');
    steps.append(node('quest-steps-header', 'Steps'));
    const stepList = node('quest-steps-list');
    for (const [step, text] of [
      'Meet the cook at Sandscale Bay and discover what fresh ingredients are needed',
      'Pull fresh crab from the pool',
      'Cook the catch on the spit',
      'Run supper back to the cook',
    ].entries()) {
      const row = node('quest-step');
      const body = node('quest-step-body');
      body.append(node('quest-step-text', text));
      row.append(node('quest-step-num', String(step + 1)), body);
      stepList.append(row);
    }
    steps.append(stepList);
    const dialogue = node('quest-dialogue-col');
    dialogue.append(node('quest-dialogue-header', 'Dialogue'));
    const dialogueScroll = node('quest-dialogue-scroll');
    for (let i = 0; i < 8; i++)
      dialogueScroll.append(
        node('quest-dialogue-text', 'The cook waits by the harbour. Take the path past the boats.'),
      );
    dialogue.append(dialogueScroll);
    content.append(steps, dialogue);
    const bottom = node('quest-bottom-bar');
    const rewards = node('quest-rewards-section');
    rewards.append(node('quest-rewards-label', 'Rewards:'));
    const xp = node('quest-reward-xp-list');
    xp.append(node('quest-reward-xp', '+9,100 Cook'), node('quest-reward-xp', '+9,100 Alms'));
    const items = node('quest-reward-items');
    for (let i = 0; i < 3; i++) {
      const slot = node('inv-slot');
      const image = document.createElement('img');
      image.src = source;
      image.alt = 'Crab';
      slot.append(image);
      items.append(slot);
    }
    rewards.append(xp, items);
    const actions = node('quest-actions');
    const begin = node('quest-btn quest-btn-begin', 'Begin Quest', 'button');
    begin.addEventListener('click', () => state.questActions.push(index));
    actions.append(begin);
    bottom.append(rewards, actions);
    detail.replaceChildren(header, requirements, content, bottom);
    renderRows(index);
  }

  function renderRows(selected) {
    scroll.replaceChildren();
    for (let i = 0; i < 30; i++) {
      const status = window.fixtureQuestStatuses?.[i] || 'available';
      if (
        activeFilter !== 'all' &&
        (activeFilter === 'progress'
          ? !['active', 'claimable'].includes(status)
          : activeFilter !== status)
      )
        continue;
      const row = node('quest-row status-' + status + (i === selected ? ' selected' : ''));
      row.dataset.questId = String(i);
      const info = node('quest-row-info');
      info.append(node('quest-row-name', 'Sandscale Burnt Supper ' + i));
      info.append(node('quest-row-reqs', 'Cook 20'));
      const meta = node('quest-row-meta');
      meta.append(node('quest-step-badge', '4 steps'));
      row.append(node('quest-status-dot'), info, meta);
      row.addEventListener('click', () => {
        state.questSelections.push(i);
        showDetail(i);
      });
      scroll.append(row);
    }
  }
  renderRows();
  window.fixtureQuestRows = () => renderRows(selectedQuest);
  window.fixtureQuestLayout = layout;
  window.fixtureQuestLink = function (index) {
    showDetail(index);
    window.fixtureOpenModal('quests');
  };
  window.fixtureQuestRefresh = function () {
    if (selectedQuest !== undefined) showDetail(selectedQuest);
  };
  window.fixtureQuestTutorial = showDetail;
})();
