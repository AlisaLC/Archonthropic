// Usage: electron --no-sandbox --ozone-platform=x11 tools/readme-shots.js
// Renders the README images into docs/: the real strip fed with fake sessions (a still and an animated
// GIF, which needs ffmpeg), a state grid, Paimon's moods, the full roster and the spawn-list window.
// Everything is offscreen.
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function snap(win, name) {
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, name), img.toPNG());
  console.log('wrote', `docs/${name}`);
}

function offscreen(width, height, preload) {
  return new BrowserWindow({
    width, height, show: false, useContentSize: true, enableLargerThanScreen: true,
    webPreferences: { offscreen: true, contextIsolation: true, ...(preload && { preload }) },
  });
}

// A static page from tools/, sized to its content.
async function page(file, query, width, name) {
  const w = offscreen(width, 800);
  await w.loadFile(path.join(__dirname, file), { search: query });
  await wait(500);
  const h = await w.webContents.executeJavaScript('document.body.scrollHeight');
  w.setContentSize(width, h);
  await wait(400);
  await snap(w, name);
}

// The strip itself, fed through the real preload with fake sessions and system stats.
// Paimon on top, then three sessions: one column with no gap (see layout() in renderer.js).
const STRIP_W = 440, STRIP_H = 56 + 218 + 4 + 3 * 196 + 8;
async function stripWindow() {
  const w = offscreen(STRIP_W, STRIP_H, path.join(ROOT, 'src', 'preload.js'));
  await w.loadFile(path.join(ROOT, 'src', 'renderer', 'index.html'));
  await w.webContents.insertCSS(`html, body { background: radial-gradient(120% 80% at 20% 10%, #3b3563 0%, #221f38 55%, #161425 100%) !important; }`);
  return w;
}

const G = 2 ** 30;
const sysStats = (cpu, state, culprit) => ({
  cpu, cpuNow: cpu + 3, load: [cpu / 12.7, 5.4, 4.87], cores: 8,
  mem: { used: 18.2 * G, total: 31.2 * G, pct: 58.3, swapUsed: 0.4 * G, swapTotal: 8 * G },
  disks: [{ mount: '/', used: 301 * G, total: 468 * G, pct: 64.3 }],
  uptime: 3 * 86400 + 4 * 3600, top: { byCpu: [], byMem: null }, mood: { state, culprit },
});

const MIN = 60e3;
const session = (id, project, prompt, extra) => ({
  session_id: id, cwd: `~/code/${project}`, project, prompt,
  started_at: Date.now() - 42 * MIN, state_since: Date.now() - 2 * MIN, ...extra,
});

async function strip() {
  const w = await stripWindow();
  const now = Date.now(), s = session;
  const list = [
    { characterId: 'furina', stateKey: 'done', session: s('7c1e9a40', 'blog', 'fix the broken RSS feed') },
    { characterId: 'hutao', stateKey: 'bash', session: s('b83f2d11', 'teyvat-api', 'make the tests pass', { detail: 'Run the test suite', state_since: now - 12e3 }) },
    { characterId: 'raiden', stateKey: 'permission', session: s('e2915c3b', 'inazuma-ml', 'clean up the old checkpoints and retrain', { detail: 'Bash · rm -rf checkpoints/old', state_since: now - 38e3 }) },
  ];
  w.webContents.send('update', { list, hidden: false });
  w.webContents.send('sys', sysStats(78, 'strained', 'cpu'));
  await wait(900);
  // Hover Raiden (the one asking for permission) to show her card.
  await w.webContents.executeJavaScript(`[...document.querySelectorAll('.slot:not(.sys)')][2].dispatchEvent(new MouseEvent('mouseenter'))`);
  await wait(500);
  await snap(w, 'strip.png');
}

// The strip over ~11s: three sessions arrive and work through their states while Paimon's mood follows
// the load. Frames are captured in real time and ffmpeg turns them into a looping GIF.
async function stripGif() {
  const w = await stripWindow();
  const A = session('4ad09e72', 'sumeru-docs', 'add a search page'),
    B = session('b83f2d11', 'teyvat-api', 'make the tests pass'),
    C = session('e2915c3b', 'inazuma-ml', 'clean up the old checkpoints and retrain');
  const who = new Map([[A, 'nahida'], [B, 'hutao'], [C, 'raiden']]);
  const state = new Map();
  const set = (s, stateKey, detail = '') => { state.set(s, { stateKey, detail, since: Date.now() }); };
  const push = () => w.webContents.send('update', {
    hidden: false,
    list: [...state].map(([s, { stateKey, detail, since }]) =>
      ({ characterId: who.get(s), stateKey, session: { ...s, detail, state_since: since } })),
  });
  const sys = (...a) => () => w.webContents.send('sys', sysStats(...a));
  const script = [
    [0, sys(18, 'calm')],
    [400, () => set(A, 'thinking')],
    [1000, () => set(B, 'ready')],
    [1600, () => set(C, 'thinking')],
    [2600, () => { set(A, 'reading', 'search.js'); set(B, 'bash', 'npm test'); }],
    [2800, sys(58, 'busy')],
    [4200, () => { set(A, 'editing', 'search.js'); set(C, 'permission', 'Bash · rm -rf checkpoints/old'); }],
    [4400, sys(84, 'strained', 'cpu')],
    [6000, () => set(B, 'done')],
    [7000, () => { set(C, 'bash', 'rm -rf checkpoints/old'); set(A, 'thinking'); }],
    [8400, () => { set(A, 'done'); set(C, 'web', 'pytorch.org'); }],
    [8600, sys(46, 'busy')],
    [9800, () => set(C, 'done')],
    [10000, sys(21, 'calm')],
  ];
  const END = 11200, frames = fs.mkdtempSync(path.join(os.tmpdir(), 'archonthropic-gif-'));
  const t0 = Date.now(), shots = [];
  let next = 0;
  while (Date.now() - t0 < END) {
    const t = Date.now() - t0;
    let changed = false;
    while (next < script.length && script[next][0] <= t) { script[next++][1](); changed = true; }
    if (changed) push();
    const img = await w.webContents.capturePage();
    const file = path.join(frames, `${String(shots.length).padStart(4, '0')}.png`);
    fs.writeFileSync(file, img.toPNG());
    shots.push({ file, t: Date.now() - t0 });
    await wait(Math.max(0, 1000 / 15 - (Date.now() - t0 - t)));
  }
  // Each frame lasts until the next one was taken, so uneven capture times don't change the pace.
  const list = shots.map((s, i) => `file '${s.file}'\nduration ${(((shots[i + 1]?.t ?? END) - s.t) / 1000).toFixed(3)}`);
  fs.writeFileSync(path.join(frames, 'list.txt'), `${list.join('\n')}\nfile '${shots.at(-1).file}'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(frames, 'list.txt'),
    '-vf', 'fps=15,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    '-loop', '0', path.join(OUT, 'strip.gif')]);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', `docs/strip.gif (${shots.length} frames)`);
}

// The spawn-list window, with a few characters left out.
async function spawnList() {
  ipcMain.handle('spawn:get', () => ({ banned: ['aloy', 'lumine', 'kachina', 'jahoda', 'dori', 'sucrose'] }));
  const w = offscreen(900, 680, path.join(ROOT, 'src', 'spawn-preload.js'));
  w.setBackgroundColor('#1f1c2e');
  await w.loadFile(path.join(ROOT, 'src', 'renderer', 'spawn.html'));
  await wait(900);
  await snap(w, 'spawn-list.png');
}

process.on('unhandledRejection', (e) => { console.error(e); app.exit(1); });

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await strip();
  await stripGif();
  await page('gallery.html', '?c=raiden,nahida,hutao,furina&s=80', 70 + 14 * 82 + 20, 'states.png');
  await page('roster.html', '?paimon', 4 * 100 + 28, 'paimon.png');
  await page('roster.html', '?state=ready&cols=9', 9 * 100 + 28, 'roster.png');
  await spawnList();
  app.quit();
});
