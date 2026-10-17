(() => {
  const map = window.fixtureMap;
  const column = document.querySelector('#unified-queue-panel .uq-col');
  const wrapper = column.parentNode;
  let columns = [column];
  let drag;
  let optionsEnabled = false;
  const wiredRows = new WeakSet();
  map.longPressCalls = [];

  function signature() {
    return map.queue.map((id) => `skill:${id}:${id}`);
  }
  function rows() {
    return Array.from(wrapper.querySelectorAll('.uq-row'));
  }
  function refreshDistances() {
    const order = [...map.queue];
    if (map.preview) order.splice(map.preview.toSlot, 0, order.splice(map.preview.fromSlot, 1)[0]);
    for (const row of rows()) {
      const index = order.indexOf(row.dataset.task);
      const from = map.nodes[index === 0 ? 'home' : order[index - 1]];
      const to = map.nodes[row.dataset.task];
      const distance = Math.round(Math.hypot(to.x - from.x, to.y - from.y));
      row.querySelector('.task-node .uq-name-text').textContent =
        `Destination ${map.queue.indexOf(row.dataset.task) + 1} (${distance})`;
    }
  }
  function paint() {
    const existing = rows();
    map.queue.forEach((id, index) => {
      const row = existing[index] || document.createElement('div');
      row.classList.add('uq-row', 'queue-slot-draggable');
      row.dataset.rowIndex = index;
      row.dataset.task = id;
      const icon = document.querySelector('.panel-tab-btn img').src;
      row.innerHTML = `<div class="icon-container uq-icon-container"><div class="icons-wrapper"><div class="icon-option selected"><img src="${icon}" alt="${id}"><span class="icon-qty">${(index + 1) * 14}</span><div class="icon-tooltip uq-tooltip"><div class="tt-name uq-tt-row"><span>Task ${id}</span></div><div class="tt-line uq-tt-row"><span>Destination ${index + 1}</span></div>${Array.from({ length: 8 }, (_, detail) => `<div class="tt-line" data-map-detail="${detail}">Native task detail ${detail + 1}: materials, rewards and the current quest objective.</div>`).join('')}</div></div></div></div><div class="task-details"><div class="task-name"><span class="uq-name-text">${id}</span></div><div class="task-node"><span class="uq-name-text">Destination ${index + 1}</span></div></div>`;
      if (document.getElementById('unified-queue-panel').classList.contains('popouts-pinned'))
        row.querySelector('.icon-container').classList.add('tap-open');
      const selected = row.querySelector('.selected');
      let hold;
      let start;
      function cancelHold() {
        clearTimeout(hold);
      }
      selected.addEventListener(
        'touchstart',
        (event) => {
          start = event.touches[0];
          hold = setTimeout(() => map.longPressCalls.push(id), 500);
        },
        { passive: true },
      );
      selected.addEventListener(
        'touchmove',
        (event) => {
          const point = event.touches[0];
          if (Math.hypot(point.clientX - start.clientX, point.clientY - start.clientY) > 10)
            cancelHold();
        },
        { passive: true },
      );
      selected.addEventListener('touchend', cancelHold);
      selected.addEventListener('touchcancel', cancelHold);
      if (optionsEnabled && index === 0) {
        const container = row.querySelector('.icon-container');
        const alternative = document.createElement('div');
        alternative.className = 'icon-option';
        alternative.dataset.optionIndex = '1';
        alternative.innerHTML = `<img src="${icon}" alt="Forage"><div class="icon-tooltip uq-tooltip"><div class="tt-name">Forage</div><div class="tt-line">Follow a new route to the forage destination.</div></div>`;
        alternative.addEventListener('click', () => {
          map.queue[index] = 'forage';
          map.optionCalls.push({ slotIndex: index, optionIndex: 1 });
          paint();
        });
        container.querySelector('.icons-wrapper').appendChild(alternative);
      }
      if (!wiredRows.has(row))
        row.addEventListener('pointerdown', (event) => {
          if (
            event.target.closest('.icon-container') ||
            (event.pointerType === 'mouse' && event.button !== 0)
          )
            return;
          drag = {
            fromSlot: index,
            x: event.clientX,
            y: event.clientY,
            queueSig: signature(),
            active: false,
            toSlot: index,
          };
        });
      wiredRows.add(row);
      const destination =
        columns[
          Math.min(
            columns.length - 1,
            Math.floor(index / Math.ceil(map.queue.length / columns.length)),
          )
        ];
      if (row.parentNode !== destination) destination.appendChild(row);
    });
    for (const row of existing.slice(map.queue.length)) row.remove();
    refreshDistances();
  }
  document.addEventListener(
    'click',
    (event) => {
      for (const container of wrapper.querySelectorAll('.icon-container')) {
        const inside = container.contains(event.target);
        if (container.classList.contains('tap-open')) {
          if (!inside) {
            container
              .querySelectorAll('.tap-preview')
              .forEach((option) => option.classList.remove('tap-preview'));
            if (
              !document.getElementById('unified-queue-panel').classList.contains('popouts-pinned')
            )
              container.classList.remove('tap-open');
          } else {
            const option = event.target.closest('.icon-option');
            if (!option) continue;
            if (option.classList.contains('tap-preview')) option.classList.remove('tap-preview');
            else {
              container
                .querySelectorAll('.tap-preview')
                .forEach((option) => option.classList.remove('tap-preview'));
              option.classList.add('tap-preview');
              event.preventDefault();
              event.stopPropagation();
            }
          }
        } else if (inside) {
          container.classList.add('tap-open');
          event.preventDefault();
          event.stopPropagation();
        }
      }
    },
    true,
  );
  document.addEventListener('pointermove', (event) => {
    if (!drag) return;
    if (JSON.stringify(drag.queueSig) !== JSON.stringify(signature())) {
      drag = map.preview = null;
      return;
    }
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 24) return;
    drag.active = true;
    const list = rows();
    list[drag.fromSlot]?.classList.add('qsdh-source');
    list.forEach((row) => row.classList.remove('qsdh-drop-above', 'qsdh-drop-below'));
    const target = list.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (target < 0) {
      map.preview = null;
      drag.toSlot = -1;
      refreshDistances();
      return;
    }
    const rect = list[target].getBoundingClientRect();
    const below = event.clientY >= rect.top + rect.height / 2;
    let index = target + Number(below);
    if (index > drag.fromSlot) index--;
    drag.toSlot = Math.max(0, Math.min(list.length - 1, index));
    list[target].classList.add(below ? 'qsdh-drop-below' : 'qsdh-drop-above');
    map.preview = { fromSlot: drag.fromSlot, toSlot: drag.toSlot };
    refreshDistances();
  });
  document.addEventListener('pointerup', () => {
    if (!drag) return;
    map.preview = null;
    const request = drag;
    drag = null;
    rows().forEach((row) =>
      row.classList.remove('qsdh-source', 'qsdh-drop-above', 'qsdh-drop-below'),
    );
    if (!request.active || request.toSlot < 0 || request.fromSlot === request.toSlot) {
      refreshDistances();
      return;
    }
    map.queue.splice(request.toSlot, 0, map.queue.splice(request.fromSlot, 1)[0]);
    map.reorderCalls.push({
      fromSlot: request.fromSlot,
      toSlot: request.toSlot,
      queueSig: request.queueSig,
    });
    paint();
  });
  document.addEventListener('pointercancel', () => {
    drag = map.preview = null;
    rows().forEach((row) =>
      row.classList.remove('qsdh-source', 'qsdh-drop-above', 'qsdh-drop-below'),
    );
    refreshDistances();
  });
  map.replaceQueue = function (queue) {
    drag = map.preview = null;
    map.queue = queue;
    paint();
  };
  map.setColumns = function (count) {
    columns = [column];
    wrapper.replaceChildren(column);
    for (let index = 1; index < count; index++) {
      const next = document.createElement('div');
      next.className = 'uq-col';
      wrapper.appendChild(next);
      columns.push(next);
    }
    paint();
  };
  map.enableOptions = function () {
    optionsEnabled = true;
    map.optionCalls = [];
    map.nodes.forage = { x: 280, y: 800 };
    paint();
  };
  paint();
})();
