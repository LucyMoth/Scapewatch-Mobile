import { all, hasChangedElement } from '../../dom.js';

const rowSelector = '.uq-row, .task-row, .queue-slot, .current-task-slot';
const containerSelector = `:is(${rowSelector}) .icon-container`;

export function createTaskPreviews() {
  let taskFrame;
  let taskRoots = [];
  const taskObservers = [];
  const taskPreviewState = new Map();

  function taskPreviewSource(container) {
    if (!container.classList.contains('tap-open')) return null;
    return (
      container.querySelector('.tap-preview .icon-tooltip') ||
      container.querySelector('.icon-option.selected .icon-tooltip')
    );
  }

  function updateTaskPreviews() {
    taskFrame = null;
    for (const [container, state] of taskPreviewState)
      if (!container.isConnected) {
        state.observer.disconnect();
        taskPreviewState.delete(container);
      }
    all(containerSelector).forEach((container) => {
      const row = container.closest(rowSelector);
      const source = taskPreviewSource(container);
      let mirror = Array.from(row.children).find((child) =>
        child.classList.contains('sw-task-preview'),
      );
      if (!source) {
        mirror?.remove();
        row.classList.remove('sw-preview-inline');
        taskPreviewState.get(container)?.observer?.disconnect();
        taskPreviewState.delete(container);
        return;
      }
      let state = taskPreviewState.get(container);
      if (!mirror) {
        mirror = document.createElement('div');
        mirror.className = 'sw-task-preview';
        container.after(mirror);
      }
      if (!state || state.source !== source || !state.observer) {
        state?.observer?.disconnect();
        const observer = new MutationObserver(scheduleTaskPreviews);
        observer.observe(source, { childList: true, subtree: true, characterData: true });
        state = { source, observer, signature: null };
        taskPreviewState.set(container, state);
      }
      const signature = source.innerHTML;
      if (state.signature !== signature) {
        state.signature = signature;
        const copy = source.cloneNode(true);
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        mirror.replaceChildren(...Array.from(copy.childNodes));
      }
      row.classList.add('sw-preview-inline');
    });
  }

  function scheduleTaskPreviews() {
    if (!taskFrame) taskFrame = requestAnimationFrame(updateTaskPreviews);
  }

  function watchTaskPreviews(force = false) {
    const roots = all(`${rowSelector}, .uq-rows, .uq-col, .tasks-panel, .slay-tasks-panel`);
    if (
      !force &&
      roots.length === taskRoots.length &&
      roots.every((node, i) => node === taskRoots[i])
    )
      return;
    taskObservers.splice(0).forEach((observer) => observer.disconnect());
    taskRoots = roots;
    const attachContainers = () => {
      all(containerSelector).forEach((container) => {
        const observer = new MutationObserver((records) => {
          if (
            records.some((record) => record.type === 'attributes') ||
            hasChangedElement(records, (node) =>
              node.matches('.icons-wrapper, .icon-option, .reroll-option'),
            )
          )
            scheduleTaskPreviews();
        });
        observer.observe(container, {
          attributes: true,
          attributeFilter: ['class'],
          childList: true,
          subtree: true,
        });
        taskObservers.push(observer);
      });
    };
    roots.forEach((node) => {
      const observer = new MutationObserver((records) => {
        if (
          hasChangedElement(
            records,
            (child) =>
              child.matches(`${rowSelector}, .icon-container`) ||
              child.querySelector('.icon-container'),
          )
        ) {
          watchTaskPreviews(true);
          scheduleTaskPreviews();
        }
      });
      observer.observe(node, { childList: true });
      taskObservers.push(observer);
    });
    attachContainers();
    scheduleTaskPreviews();
  }

  function suspend() {
    if (taskFrame) cancelAnimationFrame(taskFrame);
    taskFrame = null;
    taskObservers.splice(0).forEach((observer) => observer.disconnect());
    taskRoots = [];
    for (const state of taskPreviewState.values()) state.observer.disconnect();
    taskPreviewState.clear();
  }

  return { watch: watchTaskPreviews, suspend };
}
