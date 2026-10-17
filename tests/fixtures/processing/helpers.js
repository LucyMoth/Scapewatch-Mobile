(function () {
  'use strict';
  const state = window.fixtureState;
  const source = document.querySelector('.panel-tab-btn img').src;
  const skills = { smith: 'Smith', craft: 'Craft', imbue: 'Imbue', brew: 'Brew', alms: 'Alms' };
  Object.assign(state, {
    processingSkills: [],
    processingTiers: [],
    processingAmounts: [],
    processingActions: [],
    brewFilters: [],
    almsControls: [],
  });
  function node(cls, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function on(element, type, handler) {
    element.addEventListener(type, handler);
    state.listeners.push({ el: element, type, fn: handler });
  }
  function image(alt) {
    const element = node('', undefined, 'img');
    element.src = source;
    element.alt = alt;
    return element;
  }
  function slot(cls, name, count = 1) {
    const element = node('inv-slot ' + cls);
    element.dataset.itemId = name;
    element.append(image(name));
    if (count > 1) element.append(node('inv-qty', String(count), 'span'));
    element.append(node('inv-tier-label', 'T0', 'span'));
    return element;
  }
  function amount(skill) {
    const control = node('proc-amount-control');
    const input = node('proc-amount-input', undefined, 'input');
    input.type = 'number';
    input.min = '0';
    input.value = '1';
    on(input, 'input', () => {
      state.processingAmounts.push([skill, input.value]);
      input.style.width = Math.max(3, input.value.length) + 'ch';
    });
    control.append(node('proc-amount-label', 'Amount:'), input);
    for (const text of ['½ MAX', 'MAX', 'RESET']) {
      const button = node(
        text === 'RESET' ? 'proc-amount-reset-btn' : 'proc-amount-max-btn',
        text,
        'button',
      );
      on(button, 'click', () => {
        state.processingAmounts.push([skill, text]);
        button.classList.toggle('active');
        if (text === 'RESET') input.value = '1';
      });
      control.append(button);
    }
    return control;
  }
  const header = document.querySelector('.modal-header');
  const stats = node('header-stats');
  stats.append(node('', 'Level 11', 'span'), node('', '5,034 XP', 'span'), node('', '', 'span'));
  header.querySelector('.header-info-group').append(stats);
  const navigation = node('processing-nav');
  navigation.style.display = 'none';
  for (const [skill, name] of Object.entries(skills)) {
    const button = node('processing-nav-btn');
    button.dataset.tab = skill;
    const icon = image(name);
    icon.className = 'processing-nav-icon';
    button.append(icon, node('processing-nav-tooltip', name, 'span'));
    on(button, 'click', () => {
      state.processingSkills.push(skill);
      window.fixtureProcessing(skill);
    });
    navigation.append(button);
  }
  header.insertBefore(navigation, header.querySelector('.modal-close'));
  const xp = node('header-xp-bar');
  xp.append(node('header-xp-bar-fill'), node('header-xp-bar-label', '583 xp to level 12', 'span'));
  header.after(xp);
  const nativeOpen = window.fixtureOpenModal;
  window.fixtureProcessing = function (skill = 'smith') {
    nativeOpen(skill);
    navigation.style.display = skills[skill] ? 'flex' : 'none';
    stats.style.display = skills[skill] ? '' : 'none';
    xp.style.display = skills[skill] && skill !== 'alms' ? '' : 'none';
    navigation.querySelectorAll('[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === skill);
    });
    if (['smith', 'craft', 'imbue'].includes(skill)) {
      const style = { smith: 'Melee', craft: 'Ranged', imbue: 'Magic' }[skill];
      header.querySelector('.header-name').textContent =
        skills[skill] + ' — ' + style + ' Equipment';
    }
    document.querySelectorAll('.proc-recipe-info-pop').forEach((pop) => pop.remove());
  };
  window.fixtureProcessingKit = { state, skills, node, on, image, slot, amount };
})();
