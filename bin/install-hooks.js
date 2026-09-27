#!/usr/bin/env node
// Adds (or with --uninstall removes) the genshinclaude hooks in ~/.claude/settings.json.
// Existing hooks are left untouched; a timestamped backup is written first.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
const HOOK = path.resolve(__dirname, '..', 'hooks', 'claude-hook.js');
const MARKER = 'genshinclaude';
const EVENTS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'Notification', 'Stop', 'PreCompact'];
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse']);

const uninstall = process.argv.includes('--uninstall');
const settings = fs.existsSync(SETTINGS) ? JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) : {};

if (fs.existsSync(SETTINGS)) {
  const backup = `${SETTINGS}.genshinclaude-backup-${Date.now()}`;
  fs.copyFileSync(SETTINGS, backup);
  console.log(`Backed up settings to ${backup}`);
}

settings.hooks = settings.hooks || {};
// Always strip our old entries first so re-running is idempotent.
for (const [event, groups] of Object.entries(settings.hooks)) {
  settings.hooks[event] = groups
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !String(h.command || '').includes(MARKER)) }))
    .filter((g) => g.hooks.length > 0);
  if (settings.hooks[event].length === 0) delete settings.hooks[event];
}

if (!uninstall) {
  // Absolute node path: hooks may run without nvm/pyenv shims on PATH.
  const command = `"${process.execPath}" "${HOOK}"`;
  for (const event of EVENTS) {
    const group = { hooks: [{ type: 'command', command, timeout: 5 }] };
    if (TOOL_EVENTS.has(event)) group.matcher = '*';
    (settings.hooks[event] = settings.hooks[event] || []).push(group);
  }
}
if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
console.log(uninstall
  ? 'Removed genshinclaude hooks.'
  : `Installed genshinclaude hooks for: ${EVENTS.join(', ')}\nNew Claude Code sessions will show up as characters.`);
