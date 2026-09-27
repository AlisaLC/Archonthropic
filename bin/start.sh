#!/usr/bin/env bash
# Launch Archonthropic in the background (detached from the terminal).
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
LOG="${XDG_STATE_HOME:-$HOME/.local/state}/archonthropic/app.log"
mkdir -p "$(dirname "$LOG")"
cd "$DIR" || exit 1
# A plain background command (not `a && b &`) so no subshell keeps the caller's stdout open.
setsid nohup "$DIR/node_modules/.bin/electron" . --no-sandbox --ozone-platform=x11 >"$LOG" 2>&1 < /dev/null &
