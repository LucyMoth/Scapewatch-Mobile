/* Public login DOM families, with local handlers and no authentication requests. */
(function () {
  'use strict';
  const state = window.fixtureState;
  const login = document.querySelector('.login-screen');
  state.authWorldClicks = [];
  state.authSocialClicks = [];

  function node(className, text, tag = 'div') {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function listen(element, handler) {
    element.addEventListener('click', handler);
    state.listeners.push({ el: element, type: 'click', fn: handler });
  }

  const logo = login.querySelector('.login-logo');
  logo.src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="190"><text x="320" y="110" text-anchor="middle" fill="#ffd24a" font-size="72">Scapewatch</text></svg>',
    );
  const picker = login.querySelector('.login-world-picker');
  const mount = node('');
  mount.id = 'login-world-picker-mount';
  picker.replaceWith(mount);
  mount.append(picker);
  picker.replaceChildren(node('login-world-label', 'Choose a world'));
  const row = node('login-world-row');
  for (const [index, name] of ['Europe', 'America', 'Asia', 'Oceania', 'New World'].entries()) {
    const button = node('login-world-btn' + (index === 0 ? ' selected' : ''), '', 'button');
    button.type = 'button';
    button.append(
      node('login-world-name', name, 'span'),
      node('login-world-count', `${120 + index * 35} / 1000`, 'span'),
    );
    listen(button, () => {
      state.authWorldClicks.push(name);
      for (const choice of row.children) choice.classList.toggle('selected', choice === button);
    });
    row.append(button);
  }
  picker.append(row);

  const social = node('login-social');
  for (const name of ['Steam', 'Discord', 'Wiki']) {
    const link = node('login-social-link', name, 'a');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', 'currentColor');
    icon.append(circle);
    link.prepend(icon);
    link.href = '#' + name.toLowerCase();
    listen(link, (event) => {
      event.preventDefault();
      state.authSocialClicks.push(name);
    });
    social.append(link);
  }
  const online = node('login-online');
  online.append(node('login-online-dot'), node('', '872 online', 'span'));
  login.append(social, online);
  const tip = login.querySelector('.screen-tip');
  window.fixtureAuthenticationTip = (text) => (tip.textContent = text);
  window.fixtureAuthenticationTip('Did you know? You can choose a world before signing in.');
  window.fixtureAuthenticationNodes = {
    steam: login.querySelector('#login-btn-steam'),
    worlds: [...row.children],
    social: [...social.children],
    tip,
    input: login.querySelector('#login-signup-input'),
  };
})();
