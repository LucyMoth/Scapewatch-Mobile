(function () {
  'use strict';
  const state = window.fixtureState;
  const imageSource = document.querySelector('.panel-tab-btn img').src;
  const header = document.querySelector('.modal-main > .modal-header');
  const host = document.getElementById('tab-unlocks');
  const views = ['Unlocks', 'Collections', 'Diary', 'Armory', 'Perks'];
  const nodes = {};
  state.unlocksViewClicks = [];
  state.collectionSectionClicks = [];
  state.collectionItemClicks = [];
  state.collectionIndicatorClicks = 0;
  state.unlockGridClicks = [];

  function create(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function image(cls, alt) {
    const element = create(cls, undefined, 'img');
    element.src = imageSource;
    element.alt = alt;
    return element;
  }
  function listen(element, callback) {
    element.addEventListener('click', callback);
    state.listeners.push({ el: element, type: 'click', fn: callback });
  }

  const rail = create('unlocks-header-slot');
  rail.style.display = 'none';
  const indicator = create('collections-indicator', 'Collections 80/2311 · 3.5%');
  indicator.style.display = 'none';
  listen(indicator, () => state.collectionIndicatorClicks++);
  header.insertBefore(rail, header.querySelector('.modal-close'));
  header.insertBefore(indicator, header.querySelector('.modal-close'));
  host.replaceChildren();

  function show(view) {
    window.fixtureOpenModal('unlocks');
    header.querySelector('.header-name').textContent = view;
    rail.style.display = 'flex';
    indicator.style.display = '';
    for (const [name, content] of Object.entries(nodes)) {
      content.style.display = name === view ? '' : 'none';
    }
    for (const button of rail.children) {
      button.classList.toggle('active', button.dataset.unlocksView === view);
    }
  }

  for (const view of views) {
    const button = create('processing-nav-btn');
    button.dataset.unlocksView = view;
    button.append(image('processing-nav-icon', view));
    listen(button, () => {
      state.unlocksViewClicks.push(view);
      show(view);
    });
    rail.append(button);
    const content = create('unlocks-content');
    content.style.display = 'none';
    content.dataset.unlocksContent = view;
    host.append(content);
    nodes[view] = content;
  }

  const unlocks = create('unlocks-grid-section');
  const unlockHeader = create('unlocks-grid-header');
  unlockHeader.append(image('unlocks-title-icon', ''), create('unlocks-grid-title', 'Unlocks'));
  const unlockGrid = create('unlocks-grid');
  const skillCount = 31;
  unlockGrid.style.gridTemplateColumns = 'repeat(' + skillCount + ', 56px)';
  for (let skill = 0; skill < skillCount; skill++) {
    const cell = create('grid-skill-header');
    cell.dataset.skill = String(skill);
    cell.append(image('', 'Skill ' + skill));
    unlockGrid.append(cell);
  }
  for (let reward = 0; reward < 14; reward++) {
    for (let skill = 0; skill < skillCount; skill++) {
      const cell = create('unlock-item ' + (reward > 2 ? 'locked' : 'unlocked'));
      cell.dataset.skill = String(skill);
      cell.dataset.reward = String(reward);
      cell.append(image('', 'Reward ' + skill + ':' + reward));
      listen(cell, () => state.unlockGridClicks.push([skill, reward]));
      unlockGrid.append(cell);
    }
  }
  unlocks.append(unlockHeader, unlockGrid);
  nodes.Unlocks.append(unlocks);
  window.fixtureUnlockGridNodes = Array.from(unlockGrid.children);

  const title = create('unlocks-grid-section');
  title.style.cssText =
    'padding:8px 12px;background:var(--bg-cell);border:1px solid var(--border-primary);border-radius:4px;display:flex;align-items:center;gap:8px;';
  title.append(
    image('unlocks-title-icon', ''),
    create('unlocks-grid-title', 'Collections 80/2311 · 3.5%'),
  );
  nodes.Collections.append(title);

  for (const [key, name] of [
    ['pets', 'Pets'],
    ['capes', 'Capes'],
  ]) {
    const section = create('collections-section');
    section.dataset.collSection = key;
    const sectionHeader = create('collections-section-header');
    const chevron = create('collections-chevron', '▼', 'span');
    sectionHeader.append(
      chevron,
      image('collections-section-icon', ''),
      create('collections-section-title', name + ' 0/62 · 0%', 'span'),
    );
    const sectionContent = create('collections-section-content');
    const row = create('collections-row');
    const body = create('collections-row-body');
    body.append(create('collections-row-name', name + ' 0/31 · 0%'));
    const slots = create('collections-slots');
    for (let index = 0; index < 31; index++) {
      const wrapper = create('collections-slot ' + (index === 0 ? 'unlocked' : 'locked'));
      const slot = create('inv-slot inv-s15');
      slot.append(image('', name + ' ' + index));
      listen(slot, () => state.collectionItemClicks.push(key + ':' + index));
      wrapper.append(slot, create('collections-rate-badge', '1/' + (index + 20)));
      slots.append(wrapper);
    }
    body.append(slots);
    row.append(body);
    sectionContent.append(row);
    section.append(sectionHeader, sectionContent);
    listen(sectionHeader, () => {
      state.collectionSectionClicks.push(key);
      const collapsed = sectionContent.style.display === 'none';
      sectionContent.style.display = collapsed ? '' : 'none';
      chevron.textContent = collapsed ? '▼' : '▶';
    });
    nodes.Collections.append(section);
  }

  window.fixtureUnlocksView = show;
  window.fixtureDiaryHost = nodes.Diary;
})();
