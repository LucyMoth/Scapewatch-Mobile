(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.querySelector('.panel-tab-btn img').src;
  const style = document.createElement('style');
  style.textContent = `
.rtv-wrap{flex:1 1 0;min-height:0;}
.rtv-root{position:relative;width:100%;height:100%;display:flex;flex-direction:column;color:var(--text-light);}
.rtv-hud{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;flex:none;padding:8px 14px 0;margin-bottom:8px;}
.rtv-title{display:flex;align-items:center;gap:10px;}
.rtv-title img{width:26px;height:26px;image-rendering:pixelated;}
.rtv-title h3{font-size:16px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-gold);margin:0;}
.rtv-title span{display:block;font-size:10px;letter-spacing:.14em;color:var(--text-muted);}
.rtv-meters{display:flex;align-items:center;gap:12px;}
.rtv-meter{text-align:center;}
.rtv-meter .n{font-size:19px;font-weight:700;color:#fff;line-height:1;}
.rtv-meter .n.g{color:var(--text-gold);}
.rtv-meter .n.c{color:#d68bff;}
.rtv-meter .l{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);}
.rtv-hint{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);text-align:right;}
.rtv-hint b{color:var(--text-gold);}
.rtv-stage{position:relative;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse 62% 62% at 50% 50%,var(--bg-panel) 0%,var(--bg-darkest) 72%);overflow:hidden;}
.rtv-fit{position:relative;height:100%;max-width:100%;}
.rtv-fit svg{display:block;width:100%;height:100%;}
.rtv-hit{position:absolute;transform:translate(-50%,-50%);cursor:pointer;}
.rtv-tip{position:absolute;z-index:50;pointer-events:none;min-width:180px;max-width:250px;padding:12px 14px;background:linear-gradient(180deg,var(--bg-panel),var(--bg-dark));border:2px solid var(--tipc,var(--border-secondary));box-shadow:0 0 22px rgba(0,0,0,.7);opacity:0;transition:opacity .1s;font-size:12px;}
.rtv-tip.on{opacity:1;}
.rtv-tip .h{font-size:16px;font-weight:700;color:#fff;margin-bottom:5px;}
.rtv-tip .d{font-size:13px;color:var(--text-bright);line-height:1.45;}
.rtv-legend{position:absolute;top:10px;left:12px;z-index:5;pointer-events:none;text-align:left;font-size:12px;line-height:1.65;}
.rtv-legend .row .vl{color:var(--text-gold);font-weight:600;}
.rtv-legend .row.off{opacity:.38;}
.rtv-legend .row.off .vl{color:var(--text-muted);font-weight:400;}
`;
  document.head.append(style);
  const state = { actions: [], rendered: 0, pointerIds: new Set() };
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target.closest('.rtv-stage')) state.pointerIds.add(event.pointerId);
    },
    true,
  );
  window.fixtureTree = state;
  const trees = new Map();
  const nodes = Array.from({ length: 16 }, (_, index) => {
    const angle = (index * Math.PI) / 8;
    const radius = index === 0 ? 70 : index % 2 ? 230 : 170;
    return {
      id: index + 1,
      x: 450 + Math.sin(angle) * radius,
      y: 260 + Math.cos(angle) * radius,
      tier: index % 3 ? 'small' : 'medium',
    };
  });

  function svgNode(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }

  function render(root, skill) {
    state.rendered++;
    root.replaceChildren();
    const hud = document.createElement('div');
    hud.className = 'rtv-hud';
    hud.innerHTML = `<div class="rtv-title"><img src="${icon}" alt="${skill}"><div><h3>${skill}</h3><span>${skill === 'Delve' ? 'Combat' : 'Skilling'} Raid Mastery</span></div></div><div class="rtv-meters"><div class="rtv-meter"><div class="n">1</div><div class="l">Spent</div></div><div class="rtv-meter"><div class="n g">0</div><div class="l">Points Left</div></div><div class="rtv-meter"><div class="n c">146</div><div class="l">Reroll Credits</div></div></div><div class="rtv-hint"><b>Left</b> allocate<br><b>Right</b> refund (3)</div>`;
    const stage = document.createElement('div');
    stage.className = 'rtv-stage';
    const fit = document.createElement('div');
    fit.className = 'rtv-fit';
    fit.style.aspectRatio = '1000 / 600';
    const svg = svgNode('svg', { viewBox: '-50 -40 1000 600' });
    for (const node of nodes) {
      svg.append(
        svgNode('line', {
          x1: 450,
          y1: 260,
          x2: node.x,
          y2: node.y,
          stroke: '#7a6a3a',
          'stroke-width': '2.5',
        }),
      );
      const shape =
        node.tier === 'small'
          ? svgNode('circle', { cx: node.x, cy: node.y, r: 9 })
          : svgNode('polygon', {
              points: `${node.x},${node.y - 15} ${node.x + 15},${node.y} ${node.x},${node.y + 15} ${node.x - 15},${node.y}`,
            });
      for (const [name, value] of Object.entries({
        fill: 'none',
        stroke: '#c8a83e',
        'stroke-width': '2.5',
        'data-fixture-node': node.id,
      }))
        shape.setAttribute(name, value);
      svg.append(shape);
    }
    const tip = document.createElement('div');
    tip.className = 'rtv-tip';
    tip.innerHTML = '<div class="h"></div><div class="d"></div>';
    fit.append(svg, tip);
    stage.append(fit);
    const legend = document.createElement('div');
    legend.className = 'rtv-legend';
    for (const value of [
      '+0 level',
      '+0 min hit',
      '+1 max hit',
      '+0% crit chance',
      '+0% crit damage',
      '+0% attack speed',
      '+0% corrupt chance',
      '+0% combat XP',
      '+0% Slay XP',
      '+0% Delve XP',
      '+0% XP (all skills)',
    ])
      legend.innerHTML += `<div class="row${value === '+1 max hit' ? '' : ' off'}"><span class="vl">${value}</span></div>`;
    stage.append(legend);
    for (const node of nodes) {
      const hit = document.createElement('div');
      hit.className = 'rtv-hit';
      hit.dataset.fixtureNode = node.id;
      const diameter = (node.tier === 'small' ? 9 : 15) * 2 + 14;
      Object.assign(hit.style, {
        left: `${((node.x + 50) / 1000) * 100}%`,
        top: `${((node.y + 40) / 600) * 100}%`,
        width: `${(diameter / 1000) * 100}%`,
        height: `${(diameter / 600) * 100}%`,
      });
      hit.addEventListener('mouseenter', () => {
        tip.querySelector('.h').textContent = '+1 maximum hit';
        tip.querySelector('.d').textContent =
          'Increases your maximum combat hit. Allocate the connecting node first. Refunding an outer node returns its talent point.';
        Object.assign(tip.style, { left: '82%', top: '80%', transform: 'translateX(-100%)' });
        tip.style.setProperty('--tipc', '#FFD700');
        tip.classList.add('on');
      });
      hit.addEventListener('mouseleave', () => tip.classList.remove('on'));
      hit.addEventListener('click', (event) => {
        event.preventDefault();
        state.actions.push(`${skill}:allocate:${node.id}`);
      });
      hit.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        state.actions.push(`${skill}:refund:${node.id}`);
      });
      fit.append(hit);
    }
    root.append(hud, stage);
    state.root = root;
    state.original = {
      fit,
      stage,
      legend,
      fitStyle: fit.style.cssText,
      hits: Array.from(fit.querySelectorAll('.rtv-hit')),
      svg,
    };
  }

  window.fixtureTreeOpen = function (skill = 'Delve') {
    window.fixtureOpenModal('unlocks');
    const host = document.getElementById('tab-unlocks');
    const header = document.querySelector('.modal-main > .modal-header');
    {
      const slot = header.querySelector('.unlocks-header-slot') || document.createElement('div');
      slot.replaceChildren();
      slot.style.display = 'flex';
      slot.className = 'unlocks-header-slot';
      for (const [id, name] of [
        ['unlocks', 'Unlocks'],
        ['collections', 'Collections'],
        ['diary', 'Diary'],
        ['delvetree', 'Delve'],
        ['fortifytree', 'Fortify'],
      ]) {
        const button = document.createElement('div');
        button.className = 'processing-nav-btn';
        button.dataset.tab = id;
        button.innerHTML = `<img class="processing-nav-icon" src="${icon}" alt="${name}"><span class="processing-nav-tooltip">${name}</span>`;
        if (name === 'Delve' || name === 'Fortify')
          button.addEventListener('click', () => window.fixtureTreeOpen(name));
        slot.append(button);
      }
      const stats = header.querySelector('.collections-indicator') || document.createElement('div');
      stats.style.display = '';
      stats.className = 'collections-indicator';
      stats.textContent = 'Collections 84/2311 3.6%';
      header.insertBefore(slot, header.querySelector('.modal-close'));
      header.insertBefore(stats, header.querySelector('.modal-close'));
    }
    if (!trees.size) {
      host.style.cssText = 'padding:12px 16px;overflow-y:auto;overflow-x:auto;height:100%;';
      host.replaceChildren();
      for (const name of ['Unlocks', 'Collections', 'Diary']) {
        const wrap = document.createElement('div');
        wrap.dataset.fixtureView = name;
        wrap.style.display = 'none';
        wrap.textContent = name;
        host.append(wrap);
      }
      for (const name of ['Delve', 'Fortify']) {
        const wrap = document.createElement('div');
        wrap.className = 'rtv-wrap';
        const root = document.createElement('div');
        root.className = 'rtv-root';
        wrap.append(root);
        host.append(wrap);
        trees.set(name, root);
        render(root, name);
      }
    }
    for (const wrap of host.querySelectorAll('[data-fixture-view]')) wrap.style.display = 'none';
    for (const [name, root] of trees) root.parentNode.style.display = name === skill ? '' : 'none';
    host.style.padding = '0';
    host.style.overflow = 'hidden';
    document.querySelector('.header-name').textContent = skill + ' Tree';
    render(trees.get(skill), skill);
  };
  window.fixtureTreeExit = function () {
    const host = document.getElementById('tab-unlocks');
    for (const root of trees.values()) root.parentNode.style.display = 'none';
    host.querySelector('[data-fixture-view=Unlocks]').style.display = '';
    host.style.padding = '12px 16px';
    host.style.overflow = 'auto';
    document.querySelector('.header-name').textContent = 'Unlocks';
  };
  window.fixtureTreeRerender = function () {
    render(state.root, state.root.querySelector('.rtv-title h3').textContent);
  };
})();
