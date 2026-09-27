#!/usr/bin/env bash
# Undo bin/setup.sh: stop the app and remove the hooks, shortcut and autostart entry.
# Your config (~/.config/genshinclaude) and custom sprites are kept; delete that folder too if you like.
set -uo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/genshinclaude"

[ -f "$STATE/app.pid" ] && kill "$(cat "$STATE/app.pid")" 2>/dev/null && echo "Stopped genshinclaude"
node "$DIR/bin/install-hooks.js" --uninstall
rm -f ~/.config/autostart/genshinclaude.desktop && echo "Removed autostart entry"

if command -v gsettings >/dev/null; then
  BASE=org.gnome.settings-daemon.plugins.media-keys
  KEY=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/genshinclaude/
  current=$(gsettings get $BASE custom-keybindings 2>/dev/null || true)
  if [[ "$current" == *"$KEY"* ]]; then
    new=$(python3 -c "import ast,sys; l=[k for k in ast.literal_eval(sys.argv[1].replace('@as ','')) if k!=sys.argv[2]]; print(l)" "$current" "$KEY")
    gsettings set $BASE custom-keybindings "$new"
    gsettings reset-recursively "$BASE.custom-keybinding:$KEY" 2>/dev/null
    echo "Removed keyboard shortcut"
  fi
fi
rm -rf "$STATE"
echo "genshinclaude uninstalled."
