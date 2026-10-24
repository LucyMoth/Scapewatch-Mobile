// Native layout preference and bootstrap contract from game.74703fe3dc0c.js.
(function () {
  const override = /[?&]layout=(mobile|desktop|auto)\b/.exec(location.search);
  if (override) {
    if (override[1] === 'auto') localStorage.removeItem('scapewatch_layout');
    else localStorage.setItem('scapewatch_layout', override[1]);
  }
  const preference = localStorage.getItem('scapewatch_layout');
  const active = preference === 'mobile' || preference !== 'desktop';
  if (!active) return;
  document.documentElement.classList.add('mobile-layout');
  const shell = document.createElement('div');
  shell.id = 'm-shell';
  document.body.append(shell);
})();
