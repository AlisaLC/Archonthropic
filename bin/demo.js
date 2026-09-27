#!/usr/bin/env node
// Fakes a few Claude Code sessions that cycle through every state, so you can
// preview the companions without real sessions. Ctrl+C removes them.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_DIR = process.env.ARCHONTHROPIC_DIR
  || path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'archonthropic', 'sessions');
const count = Math.max(1, Math.min(12, parseInt(process.argv[2], 10) || 4));
const SCRIPT = [
  ['ready', ''], ['thinking', ''], ['reading', 'main.js'], ['bash', 'npm test'], ['editing', 'characters.js'],
  ['thinking', ''], ['permission', 'Bash · rm -rf node_modules'], ['web', 'docs.anthropic.com'], ['agent', 'Explore the codebase'],
  ['question', ''], ['planning', ''], ['compacting', ''], ['done', ''],
];
const projects = ['archonthropic', 'teyvat-api', 'mondstadt-web', 'liyue-infra', 'inazuma-ml', 'sumeru-docs',
  'fontaine-app', 'natlan-cli', 'snezhnaya-db', 'dotfiles', 'blog', 'playground'];

fs.mkdirSync(STATE_DIR, { recursive: true });
const sessions = Array.from({ length: count }, (_, i) => ({
  session_id: `demo-${i}`, cwd: `/tmp/demo/${projects[i]}`, project: projects[i],
  step: (i * 3) % SCRIPT.length, started_at: Date.now(), pid: process.pid,
}));

function write(s) {
  const [state, detail] = SCRIPT[s.step % SCRIPT.length];
  const now = Date.now();
  const d = { ...s, state, detail, prompt: 'make the tests pass and tidy up the README', state_since: now, updated_at: now };
  delete d.step;
  fs.writeFileSync(path.join(STATE_DIR, `${s.session_id}.json`), JSON.stringify(d));
}

sessions.forEach(write);
sessions.forEach((s, i) => setTimeout(function next() {
  s.step++;
  write(s);
  setTimeout(next, 4000 + Math.random() * 3000);
}, 1500 * i + 4000));

const cleanup = () => {
  for (const s of sessions) fs.rmSync(path.join(STATE_DIR, `${s.session_id}.json`), { force: true });
  process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
console.log(`Demo: ${count} fake sessions cycling through states. Ctrl+C to stop.`);
