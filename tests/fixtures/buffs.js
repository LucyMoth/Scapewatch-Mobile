(function () {
  'use strict';
  window.fixtureCombatBuffs = function ({ cameraHidden = false } = {}) {
    window.fixtureWorldScene({ footer: 'compact' });
    const camera = document.querySelector('.recenter-camera-btn');
    const pill = document.querySelector('.active-potions-pill');
    camera.textContent = 'Recenter Camera';
    camera.classList.remove('roam');
    camera.classList.add('combat-active');
    camera.style.display = cameraHidden ? 'none' : '';
    camera.parentNode.insertBefore(camera, pill);
  };
})();
