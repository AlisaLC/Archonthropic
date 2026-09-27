#!/usr/bin/env bash
# Registers a GNOME keyboard shortcut that shows/hides all companions.
# Usage: bin/install-shortcut.sh ['<Super><Shift>g']
set -euo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
BINDING="${1:-<Super><Shift>g}"
BASE=org.gnome.settings-daemon.plugins.media-keys
KEY=/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/archontropic/
SCHEMA="$BASE.custom-keybinding:$KEY"

current=$(gsettings get $BASE custom-keybindings)
if [[ "$current" != *"$KEY"* ]]; then
  if [[ "$current" == "@as []" || "$current" == "[]" ]]; then new="['$KEY']"; else new="${current%]}, '$KEY']"; fi
  gsettings set $BASE custom-keybindings "$new"
fi
gsettings set "$SCHEMA" name 'Toggle Archontropic companions'
gsettings set "$SCHEMA" command "$DIR/bin/toggle.sh"
gsettings set "$SCHEMA" binding "$BINDING"
echo "Bound $BINDING -> $DIR/bin/toggle.sh"
