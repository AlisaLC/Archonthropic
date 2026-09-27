#!/usr/bin/env node
// Claude Code hook: records what a session is doing into a small JSON file that
// the overlay app watches. Must be fast, silent on stdout, and never fail.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_DIR = process.env.ARCHONTHROPIC_DIR
  || path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'archonthropic', 'sessions');

const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead']);
const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
const WEB_TOOLS = new Set(['WebFetch', 'WebSearch']);
const AGENT_TOOLS = new Set(['Task', 'Agent']);

function clip(s, n = 70) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function toolDetail(name, input = {}) {
  if (name === 'Bash') return clip(input.description || input.command);
  if (input.file_path || input.notebook_path) return path.basename(input.file_path || input.notebook_path);
  if (name === 'Grep') return clip(`/${input.pattern}/`);
  if (name === 'Glob') return clip(input.pattern);
  if (name === 'WebFetch') { try { return new URL(input.url).host; } catch { return clip(input.url); } }
  if (name === 'WebSearch') return clip(input.query);
  if (AGENT_TOOLS.has(name)) return clip(input.description || input.subagent_type);
  if (name.startsWith('mcp__')) return name.split('__').slice(1).join(' › ');
  return '';
}

function toolState(name) {
  if (name === 'Bash') return 'bash';
  if (EDIT_TOOLS.has(name)) return 'editing';
  if (READ_TOOLS.has(name)) return 'reading';
  if (WEB_TOOLS.has(name)) return 'web';
  if (AGENT_TOOLS.has(name)) return 'agent';
  if (name === 'AskUserQuestion' || name === 'ExitPlanMode') return 'question';
  if (name === 'TodoWrite') return 'planning';
  return 'tool';
}

// Walk up the process tree to find the long-lived `claude` process, so the app
// can drop the character when the session dies without a SessionEnd event.
function findClaudePid() {
  let pid = process.ppid;
  for (let i = 0; i < 8 && pid > 1; i++) {
    try {
      const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
      if (cmd.some((a) => /(^|\/)claude(\.js|\.exe)?$/.test(a))) return pid;
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      pid = parseInt(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1], 10);
    } catch { return null; }
  }
  return null;
}

function main(raw) {
  const ev = JSON.parse(raw || '{}');
  const id = String(ev.session_id || '').replace(/[^\w-]/g, '');
  if (!id) return;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const file = path.join(STATE_DIR, `${id}.json`);

  if (ev.hook_event_name === 'SessionEnd') {
    fs.rmSync(file, { force: true });
    return;
  }

  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

  let state = prev.state || 'ready';
  let detail = '';
  const tool = ev.tool_name || '';

  switch (ev.hook_event_name) {
    case 'SessionStart':
      state = ev.source === 'compact' ? 'thinking' : 'ready';
      break;
    case 'UserPromptSubmit':
      state = 'thinking';
      detail = clip(ev.prompt, 60);
      break;
    case 'PreToolUse':
      state = toolState(tool);
      detail = toolDetail(tool, ev.tool_input);
      break;
    case 'PostToolUse':
      state = 'thinking';
      break;
    case 'Notification': {
      const type = ev.notification_type || '';
      const msg = ev.message || '';
      if (type === 'permission_prompt' || /permission/i.test(msg)) {
        state = 'permission';
        const what = msg.replace(/^Claude needs your permission to use\s*/i, '');
        if (prev.state === 'permission') detail = prev.detail || '';
        else detail = clip(prev.detail && what.length < 30 ? `${what} · ${prev.detail}` : what || prev.detail);
      } else if (type === 'idle_prompt' || /waiting for your input/i.test(msg)) {
        state = prev.state === 'idle' ? 'idle' : 'done';
        detail = prev.detail || '';
      } else {
        return; // other notifications (auth etc.) don't change the mood
      }
      break;
    }
    case 'Stop':
      state = 'done';
      break;
    case 'PreCompact':
      state = 'compacting';
      break;
    default:
      return;
  }

  const now = Date.now();
  const next = {
    session_id: id,
    cwd: ev.cwd || prev.cwd || '',
    project: path.basename(ev.cwd || prev.cwd || '') || '~',
    state,
    detail,
    tool: ev.hook_event_name === 'PreToolUse' ? tool : '',
    prompt: ev.hook_event_name === 'UserPromptSubmit' ? clip(ev.prompt, 120) : (prev.prompt || ''),
    started_at: prev.started_at || now,
    state_since: state === prev.state && detail === prev.detail ? (prev.state_since || now) : now,
    updated_at: now,
    pid: prev.pid || findClaudePid(),
  };
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next));
  fs.renameSync(tmp, file);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => {
  try { main(buf); } catch (e) {
    try { fs.appendFileSync(path.join(STATE_DIR, '..', 'hook-errors.log'), `${new Date().toISOString()} ${e.stack}\n`); } catch {}
  }
  process.exit(0);
});
setTimeout(() => process.exit(0), 3000).unref();
