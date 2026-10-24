const filterHeaders = new Map([
  ['.bank-filter-menu', '.bank-filter-head'],
  ['.potions-filter-menu', '.potions-filter-header'],
  ['.chat-category-menu', '.chat-category-title'],
]);

export function createDialogLayout({ state }) {
  const controls = new Map();

  function dismissFilter() {
    // Use the game's outside-dismiss handlers so their state and listeners
    // are cleared along with the visible sheet.
    document.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: [],
        changedTouches: [],
        targetTouches: [],
      }),
    );
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function restore() {
    for (const [button, saved] of controls) {
      if (saved.added) button.remove();
      else {
        button.textContent = saved.text;
        for (const [name, value] of saved.attributes) {
          if (value === null) button.removeAttribute(name);
          else button.setAttribute(name, value);
        }
        button.removeEventListener('keydown', saved.keydown);
      }
    }
    controls.clear();
  }

  function update() {
    if (!state.enabled || state.suspended) {
      restore();
      return;
    }
    for (const button of controls.keys()) {
      if (!button.isConnected) controls.delete(button);
    }
    for (const [menu, head] of filterHeaders) {
      for (const sheet of document.querySelectorAll(menu)) {
        const header = sheet.querySelector(head);
        if (!header || header.querySelector('.sw-filter-close')) continue;
        const native = header.querySelector('.m-menu-x');
        const button = native || document.createElement('button');
        const saved = {
          added: !native,
          text: button.textContent,
          attributes: ['class', 'aria-label'].map((name) => [name, button.getAttribute(name)]),
        };
        controls.set(button, saved);
        button.classList.add('sw-filter-close');
        button.textContent = 'Close';
        button.setAttribute('aria-label', 'Close filters');
        if (!native) {
          button.type = 'button';
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            dismissFilter();
          });
          header.append(button);
        }
      }
    }
    for (const button of document.querySelectorAll('.cc-credits-close')) {
      if (controls.has(button)) continue;
      const saved = {
        text: button.textContent,
        attributes: ['role', 'tabindex', 'aria-label'].map((name) => [
          name,
          button.getAttribute(name),
        ]),
        keydown(event) {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          button.click();
        },
      };
      controls.set(button, saved);
      button.setAttribute('aria-label', 'Close credits');
      if (button.tagName !== 'BUTTON') {
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
        button.addEventListener('keydown', saved.keydown);
      }
    }
  }

  return { update, suspend: restore };
}
