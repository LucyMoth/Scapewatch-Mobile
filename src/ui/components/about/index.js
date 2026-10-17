import { $ } from '../../dom.js';
import panelMarkup from './panel.html';
import animation from './blink.webm';
import logo from './logo.png';

export const aboutMarkup = panelMarkup;

export function createAbout({ state }) {
  let creditsOverlay;

  function closeCredits() {
    if (creditsOverlay?.isConnected)
      creditsOverlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    creditsOverlay?.remove();
    creditsOverlay = undefined;
  }

  function openCredits() {
    if (!state.enabled || state.suspended || typeof window.Credits?.showPopup !== 'function')
      return;
    window.Credits.showPopup();
    creditsOverlay = $('.cc-credits-overlay');
    if (!creditsOverlay) return;
    creditsOverlay.classList.add('sw-about-credits');
    // The native UI and the mobile menu use separate stacking contexts.
    document.body.appendChild(creditsOverlay);
    const dialog = creditsOverlay.querySelector('.cc-credits-dialog');
    const title = creditsOverlay.querySelector('.cc-credits-title');
    const close = creditsOverlay.querySelector('.cc-credits-close');
    if (title) title.id = 'sw-about-credits-heading';
    if (dialog) {
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'sw-about-credits-heading');
    }
    if (close) {
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', 'Close credits');
      close.tabIndex = 0;
      close.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          close.click();
        }
      });
      close.focus({ preventScroll: true });
    }
  }

  function update() {
    const video = $('#sw-about-video');
    if (!video) return;
    const active =
      state.enabled &&
      !state.suspended &&
      state.view === 'menu' &&
      !document.hidden &&
      !$('#sw-about').hidden &&
      !$('#sw-menu').hidden;
    const image = $('#sw-about-logo');
    if (image && !image.hasAttribute('src')) image.src = logo;
    const credits = $('#sw-about-credits');
    if (credits) credits.disabled = typeof window.Credits?.showPopup !== 'function';
    if (!active) {
      video.pause();
      closeCredits();
      return;
    }
    if (!video.hasAttribute('src')) video.src = animation;
    if (video.paused) video.play()?.catch(() => {});
  }

  function bind() {
    document.addEventListener('visibilitychange', update);
    $('#sw-about-credits').addEventListener('click', openCredits);
  }

  function suspend() {
    $('#sw-about-video')?.pause();
    closeCredits();
  }

  function back() {
    if (!creditsOverlay?.isConnected) return false;
    closeCredits();
    return true;
  }

  return { bind, update, suspend, back };
}
