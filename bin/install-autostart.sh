#!/usr/bin/env bash
# Start Archontropic automatically when you log in (remove the file to undo).
DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/archontropic.desktop <<DESKTOP
[Desktop Entry]
Type=Application
Name=Archontropic
Comment=Genshin companions for your Claude Code sessions
Exec=$DIR/bin/start.sh
X-GNOME-Autostart-enabled=true
DESKTOP
echo "Autostart installed: ~/.config/autostart/archontropic.desktop"
