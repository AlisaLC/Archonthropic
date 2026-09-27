#!/usr/bin/env bash
# Show/hide all companions at once (bind this to a keyboard shortcut).
# Starts genshinclaude if it isn't running yet.
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
PID_FILE="${XDG_STATE_HOME:-$HOME/.local/state}/genshinclaude/app.pid"
if [ -f "$PID_FILE" ] && kill -USR2 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi
exec "$DIR/bin/start.sh"
