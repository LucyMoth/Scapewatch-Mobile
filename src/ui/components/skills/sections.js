import { $ } from '../../dom.js';

export function createSkillSections() {
  let skillRoot;
  let skillMain;
  let lastSkillMode;

  function updateSkillSections() {
    const current = $('.skill-custom-tab');
    if (!current) {
      skillRoot = null;
      skillMain = null;
      lastSkillMode = null;
      return;
    }
    const main = current.querySelector('.main-layout');
    if (!main) return;
    const total = !!main.querySelector('.total-content, .skill-columns-section');
    const mode = total ? 'total' : 'individual';
    if (
      current === skillRoot &&
      main === skillMain &&
      mode === lastSkillMode &&
      current.querySelector('#sw-skill-tabs')
    )
      return;
    skillRoot = current;
    skillMain = main;
    lastSkillMode = mode;
    current.querySelector('#sw-skill-tabs')?.remove();
    const tabs = document.createElement('nav');
    tabs.id = 'sw-skill-tabs';
    tabs.setAttribute('aria-label', 'Skill customization sections');
    const sections = total
      ? [
          ['weights', 'Weights'],
          ['unlocks', 'Unlocks'],
          ['history', 'History'],
        ]
      : [
          [
            'activities',
            main.querySelector('#activities-column .column-title')?.textContent || 'Activities',
          ],
          ['nodes', main.querySelector('#nodes-column .column-title')?.textContent || 'Locations'],
          ['history', 'History'],
        ];
    const available = sections.filter(
      ([key]) => key !== 'history' || main.querySelector('.history-sidebar'),
    );
    if (!available.some(([key]) => key === current.dataset.swSkill))
      current.dataset.swSkill = available[0][0];
    available.forEach(([key, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.swSkill = key;
      button.textContent = text;
      button.setAttribute('aria-pressed', String(current.dataset.swSkill === key));
      button.addEventListener('click', () => {
        current.dataset.swSkill = key;
        tabs
          .querySelectorAll('button')
          .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.swSkill === key)));
        // A new section starts at its first entry instead of inheriting the
        // previous (possibly much longer) section's scroll position.
        const page = current.closest('.tab-content');
        if (page) page.scrollTop = 0;
        const body = current.closest('.modal-body');
        if (body) body.scrollTop = 0;
      });
      tabs.appendChild(button);
    });
    main.before(tabs);
    // Transpose the original flat reward grid into skill + rewards rows. Nodes
    // and listeners stay intact; only CSS grid coordinates are added.
    current.querySelectorAll('.unlocks-grid').forEach((grid) => {
      const count = grid.querySelectorAll('.grid-skill-header').length;
      if (!count) return;
      Array.from(grid.children).forEach((el, index) => {
        el.style.setProperty('--sw-unlock-row', String((index % count) + 1));
        el.style.setProperty('--sw-unlock-column', String(Math.floor(index / count) + 1));
      });
    });
  }

  function invalidate() {
    skillMain = null;
  }

  return { update: updateSkillSections, invalidate };
}
