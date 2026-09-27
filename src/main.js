'use strict';
// Archonthropic — a strip of chibi companions on the right edge of a monitor,
// one per live Claude Code session. The hook (hooks/archonthropic-hook.js) writes
// <session>.json files; we watch them and render everything in one window.

const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, clipboard } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROSTER, STATES, ELEMENTS } = require('./characters');

// X11 (XWayland) so the window can be positioned and kept above others on GNOME Wayland.
app.commandLine.appendSwitch('ozone-platform', 'x11');
app.commandLine.appendSwitch('enable-transparent-visuals');

const BASE_DIR = path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'archonthropic');
const STATE_DIR = process.env.ARCHONTHROPIC_DIR || path.join(BASE_DIR, 'sessions');
const PID_FILE = path.join(BASE_DIR, 'app.pid');
const CONFIG_DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'archonthropic');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Carry settings over from the project's old names.
(function migrate() {
  for (const oldName of ['archontropic', 'genshinclaude']) {
    const old = path.join(path.dirname(CONFIG_DIR), oldName);
    const from = path.join(old, 'config.json');
    try { if (fs.existsSync(from) && !fs.existsSync(CONFIG_FILE)) fs.cpSync(from, CONFIG_FILE); } catch {}
  }
})();

// display: "secondary" (first non-primary monitor, falls back to primary), "primary", or a display index.
// systemMonitor: Paimon at the top of the strip reporting CPU / memory / disk; disks: mount points she watches.
// banned: character ids never handed out to new sessions.
const DEFAULTS = { display: 'secondary', scale: 1, idleAfterMinutes: 5, assignments: {}, systemMonitor: true, disks: ['/'], banned: [] };
function loadConfig() {
  let raw;
  try { raw = fs.readFileSync(CONFIG_FILE, 'utf8'); } catch { return structuredClone(DEFAULTS); }
  let saved;
  try { saved = JSON.parse(raw); } catch (e) {
    // Don't let the next save wipe a file the user can still fix by hand.
    console.warn(`config.json is not valid JSON (${e.message}); using defaults, original kept as config.json.bad`);
    try { fs.copyFileSync(CONFIG_FILE, `${CONFIG_FILE}.bad`); } catch {}
    return structuredClone(DEFAULTS);
  }
  const c = { ...structuredClone(DEFAULTS), ...(saved && typeof saved === 'object' ? saved : {}) };
  // A hand-edited file can hold anything; fall back per key rather than crash on it later.
  const ok = {
    display: (v) => v === 'primary' || v === 'secondary' || Number.isInteger(v),
    scale: (v) => typeof v === 'number' && v >= 0.25 && v <= 4,
    idleAfterMinutes: (v) => typeof v === 'number' && v >= 0,
    assignments: (v) => v && typeof v === 'object' && !Array.isArray(v),
    systemMonitor: (v) => typeof v === 'boolean',
    disks: (v) => Array.isArray(v) && v.every((d) => typeof d === 'string'),
    banned: (v) => Array.isArray(v) && v.every((d) => typeof d === 'string'),
  };
  for (const [k, valid] of Object.entries(ok)) if (!valid(c[k])) c[k] = structuredClone(DEFAULTS[k]);
  return c;
}
const config = loadConfig();
const saveConfig = () => {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = `${CONFIG_FILE}.${process.pid}.tmp`; // write + rename, so a crash never leaves half a file
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
  fs.renameSync(tmp, CONFIG_FILE);
};

// Wide enough for the hover card left of the leftmost column; grows when sessions need more columns.
let stripWidth = Math.round(430 * config.scale);

/** @type {Map<string, {id: string, data: any, characterId: string, stateKey: string}>} */
const sessions = new Map();
let win = null;
let tray = null;
let hidden = false;

// ---------------------------------------------------------------- sessions

function isAlive(d) {
  if (d.pid) {
    try { process.kill(d.pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
  }
  return Date.now() - d.updated_at < 12 * 3600e3;
}

function effectiveState(d) {
  const idleAfter = config.idleAfterMinutes * 60e3;
  if ((d.state === 'done' || d.state === 'ready') && Date.now() - d.state_since > idleAfter) return 'idle';
  return STATES[d.state] ? d.state : 'tool';
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Characters new sessions may get (everyone, if the user banned the whole roster).
function spawnPool() {
  const pool = ROSTER.filter((c) => !config.banned.includes(c.id));
  return pool.length ? pool : ROSTER;
}

// A project keeps the character it had last time; otherwise the project path picks a free one from the pool.
function assignCharacter(d) {
  const taken = new Set([...sessions.values()].map((s) => s.characterId));
  const pool = spawnPool();
  const pref = pool.some((c) => c.id === config.assignments[d.cwd]) ? config.assignments[d.cwd] : null;
  if (pref && !taken.has(pref)) return pref;
  const start = hash(d.cwd || d.session_id) % pool.length;
  let pick = pool[start].id;
  for (let i = 0; i < pool.length; i++) {
    const c = pool[(start + i) % pool.length];
    if (!taken.has(c.id)) { pick = c.id; break; }
  }
  if (!pref && d.cwd && !d.cwd.startsWith(os.tmpdir())) { config.assignments[d.cwd] = pick; saveConfig(); }
  return pick;
}

const BOOT_TIME = (() => {
  try { return +fs.readFileSync('/proc/stat', 'utf8').match(/^btime (\d+)/m)[1] * 1000; } catch { return 0; }
})();
const isClaudeCmd = (pid) => {
  try { return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').some((a) => /(^|\/)claude(\.js)?$/.test(a)); } catch { return false; }
};
const procStat = (pid) => {
  const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
  const f = s.slice(s.lastIndexOf(')') + 2).split(' '); // f[0] = state, f[1] = ppid, f[19] = starttime
  return { state: f[0], ppid: +f[1], start: BOOT_TIME + (+f[19] / 100) * 1000 };
};

// Sessions that were already running before the hooks existed (or that are sitting idle)
// have no state file yet. Find them from /proc so they still get a character.
function discoverProcesses() {
  const found = [];
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name) || !isClaudeCmd(name)) continue;
    try {
      const st = procStat(name);
      if (st.state === 'T' || st.state === 't' || st.state === 'Z') continue; // suspended (Ctrl+Z) or dead
      let p = st.ppid, nested = false; // skip `claude -p` runs launched by another session
      for (let i = 0; i < 10 && p > 1 && !nested; i++) { nested = isClaudeCmd(p); p = procStat(p).ppid; }
      if (nested) continue;
      const cwd = fs.readlinkSync(`/proc/${name}/cwd`);
      found.push({
        session_id: `pid-${name}`, cwd, project: path.basename(cwd) || '~', state: 'idle', detail: '',
        prompt: '', started_at: st.start, state_since: st.start, updated_at: st.start, pid: +name, discovered: true,
      });
    } catch {}
  }
  return found;
}

// Sweeping /proc reads every process's command line, so it runs every few seconds rather than on
// every hook write; in between, the last result is reused minus the processes that have exited.
const DISCOVER_EVERY = 5000;
let found = [], foundAt = 0;
function discovered() {
  if (Date.now() - foundAt >= DISCOVER_EVERY) {
    try { found = discoverProcesses(); } catch { found = []; }
    foundAt = Date.now();
  } else {
    found = found.filter(isAlive);
  }
  return found;
}

function scan() {
  let files = [];
  try { files = fs.readdirSync(STATE_DIR).filter((f) => f.endsWith('.json')); } catch {}
  const seen = new Set();
  const records = [];
  for (const f of files) {
    const full = path.join(STATE_DIR, f);
    let d;
    try { d = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { continue; }
    if (!d.session_id) continue;
    if (!isAlive(d)) { fs.rmSync(full, { force: true }); continue; }
    records.push(d);
  }
  const known = new Set(records.map((d) => d.pid));
  records.push(...discovered().filter((d) => !known.has(d.pid)));
  for (const d of records) {
    seen.add(d.session_id);
    let s = sessions.get(d.session_id);
    if (!s) {
      s = { id: d.session_id };
      // a discovered session that just fired its first hook keeps its character
      const twin = d.pid && [...sessions.values()].find((o) => o.data.pid === d.pid);
      s.characterId = twin ? twin.characterId : assignCharacter(d);
      if (twin) sessions.delete(twin.id);
      sessions.set(d.session_id, s);
    }
    s.data = d;
    s.stateKey = effectiveState(d);
  }
  for (const id of [...sessions.keys()]) if (!seen.has(id)) sessions.delete(id);
  push();
  refreshTray();
}

let lastPayload = '';
function push(force = false) {
  if (!win || win.isDestroyed() || !win.ready) return;
  const list = [...sessions.values()]
    .sort((a, b) => a.data.started_at - b.data.started_at || a.id.localeCompare(b.id))
    .map((s) => ({ session: s.data, characterId: s.characterId, stateKey: s.stateKey }));
  const json = JSON.stringify({ list, hidden });
  if (json === lastPayload && !force) return;
  lastPayload = json;
  win.webContents.send('update', { list, hidden });
}

// ---------------------------------------------------------------- system stats (Paimon)

let prevCpu = null;
let prevProcs = new Map(); // pid -> cpu ticks
const cpuHistory = [];
let sysStats = null;
let sysDetail = false; // Paimon's card is open, so the busiest / biggest process lists are wanted
const NCORES = os.cpus().length;

function readCpu() {
  const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
  const idle = f[3] + (f[4] || 0);
  return { idle, total: f.reduce((a, b) => a + b, 0) };
}

function readMem() {
  const m = {};
  for (const l of fs.readFileSync('/proc/meminfo', 'utf8').split('\n')) {
    const x = l.match(/^(\w+):\s+(\d+)/);
    if (x) m[x[1]] = +x[2] * 1024;
  }
  return { total: m.MemTotal, used: m.MemTotal - m.MemAvailable, swapTotal: m.SwapTotal, swapUsed: m.SwapTotal - m.SwapFree };
}

// Busiest processes since the last sample (by CPU ticks) and the biggest one by resident memory.
function readProcs(totalDelta) {
  const now = new Map();
  const list = [];
  const page = 4096;
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const s = fs.readFileSync(`/proc/${name}/stat`, 'utf8');
      const comm = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
      const f = s.slice(s.lastIndexOf(')') + 2).split(' ');
      const ticks = +f[11] + +f[12];
      now.set(name, ticks);
      const prev = prevProcs.get(name);
      list.push({ name: comm, cpu: prev === undefined || !totalDelta ? 0 : ((ticks - prev) / totalDelta) * 100, rss: +f[21] * page });
    } catch {}
  }
  prevProcs = now;
  const byCpu = [...list].sort((a, b) => b.cpu - a.cpu).slice(0, 3).filter((p) => p.cpu >= 0.5);
  const byMem = [...list].sort((a, b) => b.rss - a.rss)[0];
  return { byCpu, byMem };
}

function sampleSystem() {
  try {
    const cpu = readCpu();
    let cpuPct = 0, totalDelta = 0;
    if (prevCpu) {
      totalDelta = cpu.total - prevCpu.total;
      cpuPct = totalDelta > 0 ? (1 - (cpu.idle - prevCpu.idle) / totalDelta) * 100 : 0;
    }
    prevCpu = cpu;
    cpuHistory.push(cpuPct);
    if (cpuHistory.length > 3) cpuHistory.shift(); // smooth over ~6s so a single spike doesn't panic her
    const cpuAvg = cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length;
    // Nobody is looking: keep only the (cheap) CPU baseline warm, so Paimon is accurate the moment she's back.
    if (!config.systemMonitor || hidden) { prevProcs = new Map(); pushSys(); return; }
    const mem = readMem();
    const disks = [];
    for (const mount of config.disks) {
      try {
        const st = fs.statfsSync(mount);
        const total = st.blocks * st.bsize, free = st.bavail * st.bsize;
        disks.push({ mount, total, used: total - free, pct: (1 - free / total) * 100 });
      } catch {}
    }
    // Walking every process is the expensive part, and only the hover card shows it.
    const top = sysDetail ? readProcs(totalDelta / NCORES) : (prevProcs = new Map(), { byCpu: [], byMem: null });
    sysStats = {
      cpu: cpuAvg, cpuNow: cpuPct, load: os.loadavg(), cores: NCORES,
      mem: { ...mem, pct: (mem.used / mem.total) * 100 },
      disks, uptime: os.uptime(), top,
    };
    sysStats.mood = sysMood(sysStats);
  } catch (e) { console.warn('system stats:', e.message); }
  pushSys();
}

// The worst metric decides Paimon's mood; `culprit` picks the emoji she shows.
const LEVELS = ['calm', 'busy', 'strained', 'critical'];
const THRESHOLDS = { cpu: [40, 75, 92], mem: [65, 82, 93], disk: [85, 92, 97] };
function sysMood(s) {
  const level = (v, t) => t.filter((x) => v >= x).length;
  const worstDisk = Math.max(0, ...s.disks.map((d) => d.pct));
  const scores = { cpu: level(s.cpu, THRESHOLDS.cpu), mem: level(s.mem.pct, THRESHOLDS.mem), disk: level(worstDisk, THRESHOLDS.disk) };
  const culprit = Object.keys(scores).reduce((a, b) => (scores[b] > scores[a] ? b : a));
  return { state: LEVELS[scores[culprit]], culprit: scores[culprit] ? culprit : null };
}

let lastSys = '';
function pushSys() {
  if (!win || win.isDestroyed() || !win.ready) return;
  const payload = config.systemMonitor ? sysStats : null;
  const json = JSON.stringify(payload);
  if (json === lastSys) return;
  lastSys = json;
  win.webContents.send('sys', payload);
}

// ---------------------------------------------------------------- window

function targetDisplay() {
  const all = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  if (typeof config.display === 'number' && all[config.display]) return all[config.display];
  if (config.display === 'primary') return primary;
  return all.find((d) => d.id !== primary.id) || primary;
}

function stripBounds() {
  const wa = targetDisplay().workArea;
  const width = Math.min(stripWidth, wa.width);
  return { x: wa.x + wa.width - width, y: wa.y, width, height: wa.height };
}

function createWindow() {
  win = new BrowserWindow({
    ...stripBounds(),
    // A "dock" window: stays above normal windows through Mutter's dock layer, out of the dock/alt-tab,
    // and never always-on-top. Mutter won't focus a new window that an always-on-top window overlaps,
    // so an above-state strip made full-screen windows on this monitor (e.g. Telegram's photo viewer)
    // open in the background.
    type: 'dock', transparent: true, backgroundColor: '#00000000', frame: false, hasShadow: false,
    resizable: false, alwaysOnTop: false, skipTaskbar: true, show: false, title: 'Archonthropic',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, backgroundThrottling: false,
      zoomFactor: config.scale,
    },
  });
  win.setShape([{ x: 0, y: 0, width: 1, height: 1 }]); // click-through until the renderer reports its shape
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    win.ready = true;
    // Mark it unfocusable before it's first mapped, so GNOME never gives it focus (not even at startup).
    refuseFocus(() => {
      if (win.isDestroyed()) return;
      win.show();
      win.setFocusable(false);
      win.setVisibleOnAllWorkspaces(true);
    });
    push(true);
    lastSys = '';
    pushSys();
  });
  win.on('closed', () => { win = null; });
}

// Electron's setFocusable(false) doesn't set WM_HINTS on X11, so GNOME still treats the strip as a window
// that can hold keyboard focus: it grabbed focus at startup, swallowing your first keystrokes.
// Set the ICCCM input hint to false (flags = InputHint, input = 0) so it's never focused.
function refuseFocus(then) {
  const handle = win.getNativeWindowHandle();
  const xid = handle.length >= 8 ? Number(handle.readBigUInt64LE(0)) : handle.readUInt32LE(0);
  require('child_process').execFile('python3', [path.join(__dirname, '..', 'bin', 'x11-nofocus.py'), String(xid)],
    (err) => { if (err) console.warn('could not set WM_HINTS:', err.message); then(); });
}

function reposition() {
  if (win && !win.isDestroyed()) win.setBounds(stripBounds());
}

function setHidden(v) {
  hidden = v;
  push();
  refreshTray(true);
}
const toggle = () => setHidden(!hidden);

// Renderer reports where the visible bits are; everything else stays click-through.
ipcMain.on('shape', (_e, rects) => {
  if (!win || win.isDestroyed()) return;
  const r = (rects || []).filter((x) => x.width > 0 && x.height > 0);
  const k = config.scale; // renderer reports CSS px; the window is zoomed by scale
  win.setShape(r.length ? r.map((x) => ({ x: Math.floor(x.x * k), y: Math.floor(x.y * k), width: Math.ceil(x.width * k), height: Math.ceil(x.height * k) })) : [{ x: 0, y: 0, width: 1, height: 1 }]);
});

// Renderer asks for more room when sessions spill into another column (CSS px).
ipcMain.on('width', (_e, w) => {
  const px = Math.round(Number(w) * config.scale);
  if (!Number.isFinite(px) || px <= 0 || px === stripWidth) return;
  stripWidth = px;
  reposition();
});

ipcMain.on('sys-detail', (_e, on) => {
  if (sysDetail === !!on) return;
  sysDetail = !!on;
  if (sysDetail) readProcs(0); // baseline, so the next sample has per-process deltas
});

ipcMain.on('menu', (_e, id) => {
  if (id === 'sys' && win) { Menu.buildFromTemplate(commonMenu()).popup({ window: win }); return; }
  const s = sessions.get(id);
  if (!s || !win) return;
  const ch = ROSTER.find((c) => c.id === s.characterId);
  const inUse = new Set([...sessions.values()].map((o) => o.characterId));
  Menu.buildFromTemplate([
    { label: `${ch.name} — ${s.data.project}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Change character',
      submenu: byElement(spawnPool(), (c) => ({
        label: inUse.has(c.id) && c.id !== s.characterId ? `${c.name} (on screen)` : c.name,
        type: 'radio', checked: c.id === s.characterId,
        click: () => {
          s.characterId = c.id;
          if (s.data.cwd) { config.assignments[s.data.cwd] = c.id; saveConfig(); }
          push();
        },
      })),
    },
    { label: 'Copy project path', click: () => clipboard.writeText(s.data.cwd || '') },
    { type: 'separator' },
    ...commonMenu(),
  ]).popup({ window: win });
});

// One submenu per element, so the long roster stays browsable.
function byElement(list, item) {
  return Object.keys(ELEMENTS)
    .map((el) => ({ label: el, submenu: list.filter((c) => c.element === el).sort((a, b) => a.name.localeCompare(b.name)).map(item) }))
    .filter((m) => m.submenu.length);
}

// Replace the ban list. Banned characters leave every project and live session that had them.
function setBanned(list) {
  config.banned = [...new Set(list)].filter((id) => ROSTER.some((c) => c.id === id));
  if (config.banned.length >= ROSTER.length) config.banned = []; // an empty spawn list means everyone
  for (const [cwd, cid] of Object.entries(config.assignments)) if (config.banned.includes(cid)) delete config.assignments[cwd];
  for (const s of sessions.values()) {
    if (!config.banned.includes(s.characterId)) continue;
    s.characterId = null;
    s.characterId = assignCharacter(s.data);
  }
  saveConfig();
  push();
}

// The spawn-list editor: a small searchable window for choosing who new sessions can get.
let spawnWin = null;
function openSpawnList() {
  if (spawnWin && !spawnWin.isDestroyed()) { spawnWin.show(); spawnWin.focus(); return; }
  spawnWin = new BrowserWindow({
    width: 900, height: 680, minWidth: 560, minHeight: 420, title: 'Archonthropic · Spawn list',
    backgroundColor: '#1f1c2e', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'spawn-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  spawnWin.setMenu(null);
  spawnWin.loadFile(path.join(__dirname, 'renderer', 'spawn.html'));
  spawnWin.once('ready-to-show', () => spawnWin.show());
  spawnWin.on('closed', () => { spawnWin = null; });
}
ipcMain.handle('spawn:get', () => ({ banned: config.banned }));
ipcMain.on('spawn:set', (e, banned) => {
  if (!spawnWin || e.sender !== spawnWin.webContents || !Array.isArray(banned)) return;
  setBanned(banned);
  spawnWin.close();
});
ipcMain.on('spawn:close', (e) => { if (spawnWin && e.sender === spawnWin.webContents) spawnWin.close(); });


// ---------------------------------------------------------------- tray

function trayIcon() {
  // A little four-pointed primogem-style star, drawn pixel by pixel.
  const n = 32, buf = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = Math.abs(x - 15.5) / 15.5, v = Math.abs(y - 15.5) / 15.5;
      const k = Math.sqrt(u) + Math.sqrt(v);
      const i = (y * n + x) * 4; // BGRA
      if (k < 1) { buf[i] = 140 + (u + v) * 60; buf[i + 1] = 200 - (u + v) * 60; buf[i + 2] = 255; buf[i + 3] = 255; }
      else if (k < 1.08) { buf[i] = 60; buf[i + 1] = 70; buf[i + 2] = 120; buf[i + 3] = 200; }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}

function commonMenu() {
  const displays = screen.getAllDisplays();
  return [
    { label: hidden ? 'Show companions' : 'Hide companions', click: toggle },
    {
      label: 'System monitor (Paimon)', type: 'checkbox', checked: config.systemMonitor,
      click: () => { config.systemMonitor = !config.systemMonitor; saveConfig(); sampleSystem(); refreshTray(true); },
    },
    {
      label: 'Monitor',
      submenu: [
        { label: 'Secondary', type: 'radio', checked: config.display === 'secondary', click: () => { config.display = 'secondary'; saveConfig(); reposition(); } },
        { label: 'Primary', type: 'radio', checked: config.display === 'primary', click: () => { config.display = 'primary'; saveConfig(); reposition(); } },
        ...displays.map((d, i) => ({
          label: `Display ${i + 1} (${d.bounds.width}×${d.bounds.height} at ${d.bounds.x},${d.bounds.y})`, type: 'radio',
          checked: config.display === i, click: () => { config.display = i; saveConfig(); reposition(); },
        })),
      ],
    },
    { label: 'Spawn list…', click: openSpawnList },
    { type: 'separator' },
    { label: 'Quit Archonthropic', click: () => app.quit() },
  ];
}

let lastTrayKey = '';
let trayTimer = null, trayBuiltAt = 0;
const TRAY_EVERY = 3000;
// The rows show each session's state, which changes on nearly every tool call, and every rebuild ships
// the whole menu to the desktop shell. So rebuild at most every few seconds, always ending on the latest.
function refreshTray(now = false) {
  if (!tray) return;
  if (now) { clearTimeout(trayTimer); trayTimer = null; lastTrayKey = ''; buildTray(); return; }
  if (trayTimer) return;
  const wait = trayBuiltAt + TRAY_EVERY - Date.now();
  if (wait > 0) { trayTimer = setTimeout(() => { trayTimer = null; refreshTray(); }, wait); return; }
  buildTray();
}
function buildTray() {
  const rows = [...sessions.values()].map((s) => {
    const ch = ROSTER.find((c) => c.id === s.characterId);
    return `${ch.name} · ${s.data.project} — ${STATES[s.stateKey].label}`;
  });
  const key = JSON.stringify([rows, config.display, hidden, config.systemMonitor]);
  if (key === lastTrayKey) return;
  lastTrayKey = key;
  trayBuiltAt = Date.now();
  const waiting = [...sessions.values()].filter((s) => STATES[s.stateKey].attention).length;
  tray.setToolTip(`${sessions.size} session(s)${waiting ? `, ${waiting} waiting for you` : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    ...(rows.length ? rows.map((label) => ({ label, enabled: false })) : [{ label: 'No Claude Code sessions yet', enabled: false }]),
    { type: 'separator' },
    ...commonMenu(),
  ]));
}

// ---------------------------------------------------------------- boot

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // `electron . --toggle` against a running instance flips visibility (bin/toggle.sh prefers SIGUSR2).
  app.on('second-instance', (_e, argv) => { if (argv.includes('--toggle')) toggle(); });
  process.on('SIGUSR2', toggle);
  app.on('window-all-closed', (e) => e.preventDefault());
  app.on('will-quit', () => { try { fs.rmSync(PID_FILE, { force: true }); } catch {} });

  app.whenReady().then(() => {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, String(process.pid));
    try { tray = new Tray(trayIcon()); } catch (e) { console.warn('tray unavailable:', e.message); }
    createWindow();
    scan();
    let pending = null;
    fs.watch(STATE_DIR, () => { clearTimeout(pending); pending = setTimeout(scan, 40); });
    setInterval(scan, 1500); // liveness + done→idle transitions
    sampleSystem();
    setInterval(sampleSystem, 2000);
    for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, reposition);
  });
}
