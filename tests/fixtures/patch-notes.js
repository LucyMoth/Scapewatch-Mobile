(function () {
  const notes = document.querySelector('.patch-notes-panel');
  const controls = document.createElement('div');
  controls.className = 'window-controls';
  const button = document.createElement('button');
  button.className = 'window-control-btn window-control-btn-patch-notes';
  button.textContent = 'Patch notes';
  window.fixturePatchNotes = { toggles: 0 };
  button.addEventListener('click', () => {
    window.fixturePatchNotes.toggles++;
    notes.style.display = notes.style.display === 'none' ? '' : 'none';
  });
  controls.append(button);
  document.getElementById('ui-container').append(controls);
})();
