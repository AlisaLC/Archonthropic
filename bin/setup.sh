#!/usr/bin/env bash
# One-shot install: dependencies, Claude Code hooks, toggle shortcut, autostart, and launch.
# Usage: bin/setup.sh [--no-shortcut] [--no-autostart] [--shortcut '<Super><Shift>g']
set -euo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
cd "$DIR"

SHORTCUT=1 AUTOSTART=1 BINDING='<Super><Shift>g'
while [ $# -gt 0 ]; do
  case "$1" in
    --no-shortcut) SHORTCUT=0 ;;
    --no-autostart) AUTOSTART=0 ;;
    --shortcut) BINDING="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$1"; }

[ "$(uname -s)" = Linux ] || { echo "genshinclaude only runs on Linux for now." >&2; exit 1; }
command -v node >/dev/null || { echo "Node.js 20+ is required (https://nodejs.org or nvm)." >&2; exit 1; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node.js 20+ is required (found $(node -v))." >&2; exit 1; }
[ -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" ] || echo "note: ~/.claude not found; run Claude Code once first, or the hooks go into a fresh settings file."

step "Installing Electron"
npm install --no-fund --no-audit

step "Adding hooks to Claude Code settings"
node bin/install-hooks.js

if [ "$SHORTCUT" = 1 ]; then
  if command -v gsettings >/dev/null && gsettings list-schemas | grep -q settings-daemon.plugins.media-keys; then
    step "Binding the show/hide shortcut"
    bin/install-shortcut.sh "$BINDING"
  else
    echo "(no GNOME keyboard settings found: bind a shortcut to $DIR/bin/toggle.sh in your desktop's settings)"
  fi
fi

if [ "$AUTOSTART" = 1 ]; then
  step "Starting at login"
  bin/install-autostart.sh
fi

step "Launching"
PID_FILE="${XDG_STATE_HOME:-$HOME/.local/state}/genshinclaude/app.pid"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")"; sleep 1 # restart so it picks up the new code
fi
bin/start.sh
echo "Done! Your companions appear on the right edge of your second monitor (or your only one) as Claude Code sessions run."
echo "Sessions that were already open may need a restart to pick up the hooks."
