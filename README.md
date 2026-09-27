# genshinclaude

Chibi Genshin companions that show what each Claude Code session is doing. They line up on
the right edge of your secondary monitor. Each live session gets its own character, and the
character's expression tracks the session:

| State | Looks like |
|---|---|
| Thinking | eyes up, thought bubble with dots |
| Running bash | `> <` determined face, terminal bubble (label shows the command's description) |
| Editing / Reading / Web / Subagent / Planning / Tool | focused face + ✏️ 🔍 🌐 📨 📝 🔧 bubble |
| **Needs permission** | wide eyes, sweat, red **!**, jumping, glowing aura |
| **Has a question** (AskUserQuestion / plan approval) | worried, orange **?** |
| **Done · your turn** | ^▽^ happy, sparkles, cheering |
| Idle (done for 5+ min) | asleep, Zzz |
| Compacting | dizzy spiral eyes |

Hover a character to see the project path, the last prompt and how long it's been in that state.
Right-click it to swap characters. The choice is remembered per project directory.

**Paimon** floats at the top of the strip and watches the machine: mini gauges for CPU, RAM and
disk, and a mood set by whichever is worst. She's calm below 40% CPU / 65% RAM / 85% disk, focused
when busy, sweating with a 🔥 / 🧠 / 💾 bubble (for CPU, RAM or disk) under load (75 / 82 / 92%), and dizzy with a red **!** past
92 / 93 / 97%. CPU is averaged over about 6s so short spikes don't set her off. Hover her for load
averages, memory and swap in GiB, per-disk usage, the busiest processes and the largest one by memory.

## Setup

**You need:** Linux (made on Ubuntu with GNOME; X11 and Wayland both work), [Node.js](https://nodejs.org) 20 or newer,
git, and [Claude Code](https://claude.com/claude-code) installed. macOS and Windows aren't supported.

```bash
git clone https://github.com/<you>/genshinclaude.git
cd genshinclaude
bin/setup.sh
```

`bin/setup.sh` does the following:

1. `npm install`: downloads Electron (about 100 MB).
2. Adds the genshinclaude hooks to `~/.claude/settings.json`. Your existing settings and hooks stay, and it writes a backup next to the file first.
3. Binds **Super+Shift+G** to show and hide all companions. This needs GNOME; on other desktops, bind `bin/toggle.sh` yourself.
4. Starts the app at login (`~/.config/autostart/genshinclaude.desktop`).
5. Launches the app.

Options: `--no-shortcut`, `--no-autostart`, `--shortcut '<Super><Alt>p'`.

Next, open a Claude Code session and a character appears on the right edge of your second
monitor, or your only one. Sessions that were open before setup show up as idle. Restart them
if you want their live state. Right-click a character or use the tray icon to switch monitors, swap
characters, turn Paimon off or quit.

**Updating:** `git pull && bin/setup.sh` (it's safe to re-run).
**Uninstalling:** `bin/uninstall.sh` removes the hooks, shortcut and autostart entry. It keeps `~/.config/genshinclaude`.

**Troubleshooting**
- *Nothing shows up.* Check `~/.local/state/genshinclaude/app.log`, and see whether `ls ~/.local/state/genshinclaude/sessions` lists files while Claude works.
  Hook errors go to `~/.local/state/genshinclaude/hook-errors.log`.
- *`npm install` fails downloading Electron.* Retry, or run `node node_modules/electron/install.js` with Node 22+.
- *Wrong monitor.* Use tray icon → Monitor, or set `display` in the config below.

Manual pieces, if you'd rather not use the script:

```bash
npm install
npm run install-hooks           # or: npm run uninstall-hooks
bin/install-shortcut.sh         # optional binding argument, default '<Super><Shift>g'
bin/install-autostart.sh
bin/start.sh                    # background; `npm start` runs it in the foreground
```

- `npm run demo`: fake sessions cycling through every state (`node bin/demo.js 7` for 7 of them)
- `bin/toggle.sh`: what the shortcut runs (it also starts the app if it isn't running)

## Config

`~/.config/genshinclaude/config.json`:

- `display`: `"secondary"` (default; falls back to primary), `"primary"`, or a display index. Also in the tray menu.
- `scale`: size multiplier, e.g. `1.3`
- `idleAfterMinutes`: when "your turn" turns into "asleep" (default 5)
- `assignments`: project directory → character id
- `systemMonitor`: show Paimon (default `true`; also a checkbox in the tray menu)
- `disks`: mount points Paimon watches (default `["/"]`, e.g. `["/", "/home", "/mnt/data"]`)

### Your own art

The built-in characters (Raiden, Nahida, Hu Tao, Ganyu, Yae Miko, Ayaka, Furina, Yelan) are original SVG chibis, each drawn with its own hair, accessories, eyes and outfit. To use your
own images (for example Genshin sticker PNGs you've saved), drop them into
`~/.config/genshinclaude/sprites/<character-id>/<state>.png`, with `default.png` as the fallback. Speech
bubbles are still drawn on top. Character ids: `raiden nahida hutao ganyu yae ayaka furina yelan`.
States: `ready thinking bash editing reading web agent planning tool permission question done idle compacting`.

## How it works

`hooks/claude-hook.js` runs on SessionStart/End, UserPromptSubmit, Pre/PostToolUse, Notification,
Stop and PreCompact. It writes `~/.local/state/genshinclaude/sessions/<id>.json` and records the
`claude` PID, so crashed sessions disappear too. The Electron app watches that folder and draws
everything in one transparent, always-on-top strip window, running under XWayland. The window is
shaped so that only the characters catch the mouse; everything else clicks through.

Limitations: after you approve a permission prompt, the character keeps showing "needs permission"
until the tool finishes, because Claude Code sends no event on approval. The app takes focus once at startup
(showing it inactive makes GNOME post an "is ready" notification instead).

`tools/gallery.html` shows every character in every state. `tools/shot.js` renders it to a PNG.

`tools/compare.html` puts each chibi next to its in-game icon. Download the icons from `https://enka.network/ui/UI_AvatarIcon_<Name>.png` (Shougun, Nahida, Hutao, Ganyu, Yae, Ayaka, Furina, Yelan) as `icon_<Name>.png` into a folder. Then render with `SHOT_PAGE=compare.html SHOT_QUERY='?ref=/abs/folder' SHOT_OUT=out.png electron --no-sandbox tools/shot.js`.

---

A fan project, not affiliated with or endorsed by HoYoverse or Anthropic. Genshin Impact characters
belong to HoYoverse; the chibis here are original SVG drawings.
