'use strict';
// Spawn-list editor: tick the characters new sessions may get, then Save.
// Nothing changes until Save; an empty list means everyone can spawn.
const { ROSTER, ELEMENTS, drawCharacter } = window.Archonthropic;

const $ = (id) => document.getElementById(id);
const byName = [...ROSTER].sort((a, b) => a.name.localeCompare(b.name));
const picked = new Set();
let element = null; // element filter, or null for all
let show = 'all';   // all | in | out

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const matches = (c, q) => !q || norm(c.name).includes(q) || c.id.includes(q) || norm(c.element) === q;

function visible() {
  const q = norm($('q').value);
  return byName.filter((c) => (!element || c.element === element) && matches(c, q)
    && (show === 'all' || (show === 'in') === picked.has(c.id)));
}

// ---------------------------------------------------------------- build once

const cards = new Map();
for (const c of byName) {
  const el = document.createElement('div');
  el.className = 'card';
  el.style.setProperty('--c', ELEMENTS[c.element]);
  el.innerHTML = `${drawCharacter(c, 'ready', { fx: '' })}<div class="name">${c.name}</div><div class="el">${c.element}</div><div class="tick"></div>`;
  el.addEventListener('click', () => toggle(c.id));
  cards.set(c.id, el);
}

$('elements').innerHTML = [['', 'All elements'], ...Object.keys(ELEMENTS).map((e) => [e, e])]
  .map(([e, label]) => `<button class="chip${e ? '' : ' on'}" data-el="${e}" style="--c:${ELEMENTS[e] || 'var(--accent)'}">${e ? '<i></i>' : ''}${label}</button>`).join('');
$('elements').addEventListener('click', (ev) => {
  const b = ev.target.closest('.chip');
  if (!b) return;
  element = b.dataset.el || null;
  for (const x of $('elements').children) x.classList.toggle('on', x === b);
  render();
});

$('show').addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  show = b.dataset.show;
  for (const x of $('show').children) x.classList.toggle('on', x === b);
  render();
});

$('picked').addEventListener('click', (ev) => {
  const b = ev.target.closest('.pill');
  if (b) toggle(b.dataset.id);
});

// ---------------------------------------------------------------- render

function toggle(id) {
  if (picked.has(id)) picked.delete(id); else picked.add(id);
  render();
}

function render() {
  const list = visible();
  const grid = $('grid');
  grid.replaceChildren(...list.map((c) => cards.get(c.id)));
  if (!list.length) grid.innerHTML = '<div class="empty">No characters match.</div>';
  for (const [id, el] of cards) { el.classList.toggle('in', picked.has(id)); el.classList.remove('first'); }
  // Enter toggles the top result while searching; mark it so that's discoverable.
  if ($('q').value && list.length) cards.get(list[0].id).classList.add('first');

  // Small lists get a row of removable pills, so the whole selection is visible at a glance.
  const chosen = byName.filter((c) => picked.has(c.id));
  $('picked').innerHTML = chosen.length && chosen.length <= 24
    ? `<span class="label">Your list:</span>${chosen.map((c) =>
      `<button class="pill" data-id="${c.id}" style="--c:${ELEMENTS[c.element]}" title="Remove">${c.name}<b>×</b></button>`).join('')}`
    : '';

  const n = picked.size;
  $('status').innerHTML = n === 0 ? 'Nobody selected: <strong>everyone</strong> can spawn'
    : n === ROSTER.length ? `<strong>All ${n}</strong> characters can spawn`
    : `<strong>${n}</strong> of ${ROSTER.length} can spawn`;
  $('add-shown').disabled = !list.some((c) => !picked.has(c.id));
  $('remove-shown').disabled = !list.some((c) => picked.has(c.id));
  $('clear').disabled = n === 0;
}

// ---------------------------------------------------------------- actions

$('q').addEventListener('input', render);
$('add-shown').addEventListener('click', () => { for (const c of visible()) picked.add(c.id); render(); });
$('remove-shown').addEventListener('click', () => { for (const c of visible()) picked.delete(c.id); render(); });
$('clear').addEventListener('click', () => { picked.clear(); render(); });
$('cancel').addEventListener('click', () => window.spawn.close());
const save = () => window.spawn.save(picked.size ? ROSTER.filter((c) => !picked.has(c.id)).map((c) => c.id) : []);
$('save').addEventListener('click', save);

document.addEventListener('keydown', (ev) => {
  const q = $('q');
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'Enter')) { ev.preventDefault(); save(); return; }
  if (ev.key === '/' && document.activeElement !== q) { ev.preventDefault(); q.focus(); q.select(); return; }
  if (ev.key === 'Escape') {
    if (q.value) { q.value = ''; render(); } else window.spawn.close();
    return;
  }
  if (ev.key === 'Enter' && document.activeElement === q && q.value) {
    const top = visible()[0];
    if (top) { toggle(top.id); q.select(); }
  }
});

window.spawn.get().then(({ banned }) => {
  for (const c of ROSTER) if (!banned.includes(c.id)) picked.add(c.id);
  render();
});
