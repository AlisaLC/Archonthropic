#!/usr/bin/env bash
# Undo bin/setup.sh: stop the app and remove the hooks, shortcut and autostart entry.
# Your config (~/.config/archonthropic) is kept; delete that folder too if you like.
set -uo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/archonthropic"

remove_shortcut() { # $1 = keybinding id
  command -v gsettings >/dev/null || return 0
  local BASE=org.gnome.settings-daemon.plugins.media-keys
  local KEY=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/$1/
  local current new
  current=$(gsettings get $BASE custom-keybindings 2>/dev/null || true)
  if [[ "$current" == *"$KEY"* ]]; then
    new=$(python3 -c "import ast,sys; l=[k for k in ast.literal_eval(sys.argv[1].replace('@as ','')) if k!=sys.argv[2]]; print(l)" "$current" "$KEY")
    gsettings set $BASE custom-keybindings "$new"
    gsettings reset-recursively "$BASE.custom-keybinding:$KEY" 2>/dev/null
    echo "Removed keyboard shortcut ($1)"
  fi
}
# setup.sh uses this to clear the old name's shortcut
if [ "${1:-}" = --shortcut-only ]; then remove_shortcut "$2"; exit 0; fi

[ -f "$STATE/app.pid" ] && kill "$(cat "$STATE/app.pid")" 2>/dev/null && echo "Stopped Archonthropic"
node "$DIR/bin/install-hooks.js" --uninstall
rm -f ~/.config/autostart/archonthropic.desktop && echo "Removed autostart entry"
remove_shortcut archonthropic
rm -rf "$STATE"
echo "Archonthropic uninstalled."
