'use strict';
const { ROSTER, STATES, PAIMON, SYS_STATES, ELEMENTS, drawCharacter } = window.Archontropic;
const strip = document.getElementById('strip');
const card = document.getElementById('card');

const SLOT_W = 136, SLOT_H = 192, GAP = 4, MARGIN = 8;
/** @type {Map<string, {el: HTMLElement, item: any, drawnKey: string}>} */
const slots = new Map();
let hidden = false;
let hoverId = null;
const SYS_H = 218;
// Keep Paimon below a maximized window's title bar so its minimize/maximize/close buttons stay clickable.
const SYS_TOP = 56;
/** @type {{el: HTMLElement, stats: any, drawnKey: string} | null} */
let sys = null;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const gib = (b) => `${(b / 2 ** 30).toFixed(b >= 100 * 2 ** 30 ? 0 : 1)} GiB`;
const pct = (v) => `${Math.round(v)}%`;
const barColor = (v, t) => (v >= t[2] ? '#ff5d73' : v >= t[1] ? '#f4b860' : v >= t[0] ? '#6fc3ff' : '#7fd1a8');
const T = { cpu: [40, 75, 92], mem: [65, 82, 93], disk: [85, 92, 97] }; // keep in sync with main.js THRESHOLDS
const CULPRIT_FX = { cpu: 'emoji:🔥', mem: 'emoji:🧠', disk: 'emoji:💾' };

function makeSlot(id) {
  const el = document.createElement('div');
  el.className = 'slot enter';
  el.innerHTML = `<div class="sprite-wrap"><div class="aura"></div><div class="sprite"></div></div>
    <div class="label"><div class="proj"></div><div class="state"></div></div>`;
  el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
  el.addEventListener('mouseenter', () => { hoverId = id; renderCard(); });
  el.addEventListener('mouseleave', () => { if (hoverId === id) { hoverId = null; renderCard(); } });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); window.api.send('menu', id); });
  strip.appendChild(el);
  return { el, item: null, drawnKey: '' };
}

function renderSlot(slot) {
  const { session: s, characterId, stateKey, sprite } = slot.item;
  const ch = ROSTER.find((c) => c.id === characterId) || ROSTER[0];
  const st = STATES[stateKey] || STATES.ready;
  const el = slot.el;
  el.style.setProperty('--accent', st.color);
  el.classList.toggle('attention', !!st.attention);

  const key = `${ch.id}|${stateKey}|${sprite || ''}`;
  if (key !== slot.drawnKey) {
    slot.drawnKey = key;
    el.querySelector('.sprite').innerHTML = sprite
      ? `<img class="custom" src="${esc(sprite)}"><div class="fx-overlay">${drawCharacter(ch, stateKey, { fxOnly: true })}</div>`
      : drawCharacter(ch, stateKey);
  }
  // After the first ~20s of "done", calm the hopping down to a gentle bob.
  const stage = el.querySelector('.stage');
  if (stage) stage.classList.toggle('calm', stateKey === 'done' && Date.now() - s.state_since > 20000);

  el.querySelector('.proj').textContent = s.project;
  el.querySelector('.state').textContent = s.detail ? `${st.label}: ${s.detail}` : st.label;
}

// ---------------------------------------------------------------- Paimon (system monitor)

function renderSys(stats) {
  if (!stats) {
    if (sys) { sys.el.remove(); sys = null; if (hoverId === 'sys') hoverId = null; }
    return;
  }
  if (!sys) {
    const el = document.createElement('div');
    el.className = 'slot sys enter';
    el.innerHTML = `<div class="sprite-wrap"><div class="aura"></div><div class="sprite"></div></div>
      <div class="label"><div class="proj">Paimon</div><div class="gauges"></div></div>`;
    el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
    el.addEventListener('mouseenter', () => { hoverId = 'sys'; renderCard(); });
    el.addEventListener('mouseleave', () => { if (hoverId === 'sys') { hoverId = null; renderCard(); } });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); window.api.send('menu', 'sys'); });
    strip.appendChild(el);
    sys = { el, stats: null, drawnKey: '' };
  }
  sys.stats = stats;
  const { state, culprit } = stats.mood;
  const st = SYS_STATES[state];
  const fx = st.fx && culprit && state !== 'critical' ? CULPRIT_FX[culprit] : undefined;
  sys.el.style.setProperty('--accent', st.color);
  sys.el.classList.toggle('attention', !!st.attention);
  const key = `${state}|${fx}`;
  if (key !== sys.drawnKey) {
    sys.drawnKey = key;
    sys.el.querySelector('.sprite').innerHTML = drawCharacter(PAIMON, state, { fx });
  }
  const disk = stats.disks.reduce((a, d) => (!a || d.pct > a.pct ? d : a), null);
  const rows = [['CPU', stats.cpu, T.cpu], ['RAM', stats.mem.pct, T.mem], ...(disk ? [['Disk', disk.pct, T.disk]] : [])];
  sys.el.querySelector('.gauges').innerHTML = rows.map(([k, v, t]) =>
    `<div class="gauge"><span class="gk">${k}</span><span class="bar"><i style="width:${Math.min(100, v).toFixed(1)}%;background:${barColor(v, t)}"></i></span><span class="gv">${pct(v)}</span></div>`).join('');
  if (hoverId === 'sys') renderCard();
}

function sysCard() {
  const s = sys.stats;
  const st = SYS_STATES[s.mood.state];
  card.style.setProperty('--accent', st.color);
  card.style.setProperty('--elem', ELEMENTS[PAIMON.element]);
  const top = s.top.byCpu.map((p) => `${esc(p.name)} ${pct(p.cpu)}`).join(', ');
  return `
    <div class="name"><span class="elem"></span>Paimon · system</div>
    <div class="row"><span class="k">Mood</span><span class="v"><span class="st">${esc(st.label)}</span></span></div>
    <div class="row"><span class="k">CPU</span><span class="v">${pct(s.cpuNow)} now · load ${s.load.map((l) => l.toFixed(2)).join(' ')} · ${s.cores} cores</span></div>
    <div class="row"><span class="k">Memory</span><span class="v">${gib(s.mem.used)} / ${gib(s.mem.total)} (${pct(s.mem.pct)})${s.mem.swapTotal ? ` · swap ${gib(s.mem.swapUsed)}` : ''}</span></div>
    ${s.disks.map((d) => `<div class="row"><span class="k">Disk</span><span class="v">${esc(d.mount)} ${gib(d.used)} / ${gib(d.total)} (${pct(d.pct)})</span></div>`).join('')}
    ${top ? `<div class="row"><span class="k">Busiest</span><span class="v">${top}</span></div>` : ''}
    ${s.top.byMem ? `<div class="row"><span class="k">Biggest</span><span class="v">${esc(s.top.byMem.name)} ${gib(s.top.byMem.rss)}</span></div>` : ''}
    <div class="row"><span class="k">Uptime</span><span class="v">${ago(s.uptime * 1000)}</span></div>
    <div class="hint">right-click for options</div>`;
}

function layout() {
  // Paimon owns the top of the first column; sessions stack up from the bottom beneath her.
  if (sys) { sys.el.style.right = `${MARGIN}px`; sys.el.style.top = `${SYS_TOP}px`; }
  const fit = (h) => Math.max(1, Math.floor((h - MARGIN) / (SLOT_H + GAP)));
  const firstCol = fit(window.innerHeight - (sys ? SYS_TOP + SYS_H + GAP : 0));
  const perCol = fit(window.innerHeight);
  [...slots.values()].forEach((slot, i) => {
    const col = i < firstCol ? 0 : 1 + Math.floor((i - firstCol) / perCol);
    const row = i < firstCol ? i : (i - firstCol) % perCol;
    slot.el.style.right = `${MARGIN + col * (SLOT_W + GAP)}px`;
    slot.el.style.bottom = `${MARGIN + row * (SLOT_H + GAP)}px`;
  });
}

function renderCard() {
  const slot = hoverId === 'sys' ? sys : hoverId && slots.get(hoverId);
  if (!slot || hidden) {
    card.classList.remove('show');
    reportShape();
    return;
  }
  if (slot === sys) card.innerHTML = sysCard();
  else card.innerHTML = sessionCard(slot);
  const wasShown = card.classList.contains('show');
  card.classList.add('show');
  const r = slot.el.getBoundingClientRect();
  card.style.left = `${Math.max(4, r.left - card.offsetWidth - 6)}px`;
  card.style.top = `${Math.min(window.innerHeight - card.offsetHeight - 4, Math.max(4, r.top + 20))}px`;
  if (!wasShown) reportShape();
}

function sessionCard(slot) {
  const { session: s, characterId, stateKey } = slot.item;
  const ch = ROSTER.find((c) => c.id === characterId) || ROSTER[0];
  const st = STATES[stateKey] || STATES.ready;
  card.style.setProperty('--accent', st.color);
  card.style.setProperty('--elem', ELEMENTS[ch.element]);
  return `
    <div class="name"><span class="elem"></span>${esc(ch.name)}</div>
    <div class="row"><span class="k">Doing</span><span class="v"><span class="st">${esc(st.label)}</span>${s.detail ? ` — ${esc(s.detail)}` : ''}</span></div>
    <div class="row"><span class="k">For</span><span class="v">${ago(Date.now() - s.state_since)}</span></div>
    <div class="row"><span class="k">Project</span><span class="v">${esc(s.cwd || s.project)}</span></div>
    ${s.prompt ? `<div class="row"><span class="k">Asked</span><span class="v">“${esc(s.prompt)}”</span></div>` : ''}
    <div class="row"><span class="k">Session</span><span class="v">${esc(s.session_id.slice(0, 8))} · up ${ago(Date.now() - s.started_at)}</span></div>
    <div class="hint">right-click to change character</div>`;
}

// Only the characters (and the card) catch the mouse; the rest of the strip is click-through.
let lastShape = '';
function reportShape() {
  // Layout boxes, not getBoundingClientRect(): the enter/pop animations scale elements, and a shape
  // measured mid-animation would clip the card's border until the next report.
  const box = (el, [t, r, b, l] = [0, 0, 0, 0]) => {
    const x = Math.max(0, el.offsetLeft - l), y = Math.max(0, el.offsetTop - t);
    return { x, y, width: el.offsetLeft + el.offsetWidth + r - x, height: el.offsetTop + el.offsetHeight + b - y };
  };
  const rects = [];
  if (!hidden) {
    for (const slot of [...slots.values(), ...(sys ? [sys] : [])]) rects.push(box(slot.el));
    if (card.classList.contains('show')) rects.push(box(card, [12, 18, 24, 18])); // room for the drop shadow
  }
  const json = JSON.stringify(rects);
  if (json !== lastShape) { lastShape = json; window.api.send('shape', rects); }
}

window.api.onUpdate(({ list, hidden: h }) => {
  hidden = h;
  strip.classList.toggle('hidden', hidden);
  const ids = new Set(list.map((x) => x.session.session_id));
  for (const [id, slot] of slots) if (!ids.has(id)) { slot.el.remove(); slots.delete(id); }
  // rebuild the Map in the order main sent (stable: oldest session at the bottom)
  const ordered = new Map();
  for (const item of list) {
    const id = item.session.session_id;
    const slot = slots.get(id) || makeSlot(id);
    slot.item = item;
    ordered.set(id, slot);
    renderSlot(slot);
  }
  slots.clear();
  for (const [id, slot] of ordered) slots.set(id, slot);
  if (hoverId && hoverId !== 'sys' && !slots.has(hoverId)) hoverId = null;
  layout();
  renderCard();
  setTimeout(reportShape, 450); // after the slide transition settles
  reportShape();
});

setInterval(() => {
  for (const slot of slots.values()) if (slot.item) renderSlot(slot);
  if (hoverId) renderCard();
}, 1000);
window.api.onSys((stats) => {
  const had = !!sys;
  renderSys(stats);
  if (had !== !!sys) { layout(); setTimeout(reportShape, 450); reportShape(); }
});

window.addEventListener('resize', () => { layout(); setTimeout(reportShape, 450); });
