import { $, hasChangedElement } from '../../dom.js';
import { PREFERENCE_KEYS } from '../../../environment.js';
import { readCommunityMessage } from './messages.js';

export function createChatPreview({ state, setFlag, scheduleGeometry, blockingOverlay }) {
  let chatObserver;
  let chatStructureObserver;
  let chatArea;
  let chatPanel;
  let chatContent;
  let chatFrame;
  let miniSignature = '';
  const chatPreferenceKey = PREFERENCE_KEYS.chat;
  let miniEnabled = true;
  try {
    miniEnabled = localStorage.getItem(chatPreferenceKey) !== 'off';
  } catch (_) {}

  function updateMiniVisibility() {
    const mini = $('#sw-mini-chat');
    if (!mini) return;
    const show =
      state.enabled &&
      miniEnabled &&
      state.view === 'world' &&
      !blockingOverlay() &&
      !!chatArea &&
      !!miniSignature;
    mini.hidden = !show;
    setFlag('sw-mini-chat-visible', show);
  }

  function updateMiniMessages() {
    chatFrame = null;
    const target = $('#sw-mini-messages');
    if (!target) return;
    const lines = [];
    if (chatArea)
      for (
        let row = chatArea.lastElementChild;
        row && lines.length < 5;
        row = row.previousElementSibling
      ) {
        if (!row.matches('.chat-message')) continue;
        const item = readCommunityMessage(row);
        if (item) lines.unshift(item);
      }
    const signature = lines.length ? JSON.stringify(lines) : '';
    if (signature !== miniSignature) {
      miniSignature = signature;
      target.replaceChildren(
        ...lines.map((item) => {
          const line = document.createElement('div');
          line.className = 'sw-mini-line';
          const name = document.createElement('span');
          name.className = 'sw-mini-name';
          name.textContent = item.name + ': ';
          if (item.color) name.style.color = item.color;
          const message = document.createElement('span');
          message.className = 'sw-mini-text';
          message.textContent = item.message;
          item.badges.forEach((badge) => {
            const icon = document.createElement('img');
            icon.className = 'sw-mini-badge';
            icon.src = badge.src;
            icon.alt = badge.alt;
            icon.decoding = 'async';
            line.appendChild(icon);
          });
          line.append(name, message);
          return line;
        }),
      );
    }
    updateMiniVisibility();
    scheduleGeometry();
  }

  function scheduleMiniMessages() {
    if (!chatFrame) chatFrame = requestAnimationFrame(updateMiniMessages);
  }

  function watchChat() {
    const panel = $('#chat-panel');
    const content = panel?.querySelector('.chat-content-wrap');
    const area = panel?.querySelector('.chat-message-area');
    if (panel !== chatPanel || content !== chatContent) {
      chatStructureObserver?.disconnect();
      chatPanel = panel;
      chatContent = content;
      if (panel) {
        chatStructureObserver = new MutationObserver((records) => {
          if (
            hasChangedElement(
              records,
              (node) =>
                node.matches('.chat-message-area, .chat-content-wrap') ||
                node.querySelector('.chat-message-area'),
            )
          )
            watchChat();
        });
        // Only replacements of the message container matter here. Message
        // content is handled by the narrow observer below.
        chatStructureObserver.observe(panel, { childList: true });
        if (content) chatStructureObserver.observe(content, { childList: true });
      }
    }
    if (area !== chatArea) {
      chatObserver?.disconnect();
      chatArea = area;
      if (area) {
        chatObserver = new MutationObserver(scheduleMiniMessages);
        chatObserver.observe(area, { childList: true });
      }
      scheduleMiniMessages();
    }
  }

  function bindSettings() {
    const chatToggle = $('#sw-mini-enabled');
    chatToggle.checked = miniEnabled;
    function setMiniEnabled(value) {
      miniEnabled = value;
      chatToggle.checked = value;
      try {
        localStorage.setItem(chatPreferenceKey, value ? 'on' : 'off');
      } catch (_) {}
      if (value) scheduleMiniMessages();
      updateMiniVisibility();
    }
    chatToggle.addEventListener('change', () => setMiniEnabled(chatToggle.checked));
  }

  function suspend() {
    chatObserver?.disconnect();
    chatStructureObserver?.disconnect();
    chatPanel = null;
    chatContent = null;
    chatArea = null;
    if (chatFrame) cancelAnimationFrame(chatFrame);
    chatFrame = null;
  }

  return {
    updateVisibility: updateMiniVisibility,
    watch: watchChat,
    bindSettings,
    suspend,
  };
}
