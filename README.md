# PVE Snippets

A Chrome, Edge, and Firefox browser extension that adds clipboard paste support to PVE (Proxmox VE) consoles — both noVNC (VM consoles) and xterm.js (LXC containers, serial consoles, and the node Shell).

**Install:** [Chrome Web Store](https://chromewebstore.google.com/detail/jampbpobgkkfoeiogobjlbhldkjgcfkg) · [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/pve-snippets/)

## Features

- **Floating Paste pill & panel** — small pill on PVE consoles (noVNC and xterm.js) that expands into a full panel with **Paste** and **Snippets** tabs
- **Keyboard Shortcut** — native paste (`Ctrl+V` on Windows/Linux, `⌘V` on macOS) pastes into the VM when the console is focused (configurable in Settings)
- **Popup Paste** — open the extension popup, type or paste text, and click **Send** to paste into the active tab (noVNC canvas, xterm.js terminal, or focused text field)
- **LXC / Shell console support** — on xterm.js consoles (LXC containers, serial consoles, node Shell) text is handed to the terminal in one shot, the same way a real paste is, so it's instant and needs no keyboard-layout or timing settings
- **Auto-hit Enter after paste** — optional toggle in Settings to send Enter after each paste
- **Timing & compatibility controls** — adjust per‑character delay, first‑character delay (up to 1000 ms), extra delay after newlines, and an optional compatibility mode for very long pastes
- **Keyboard layout support** — choose from US, UK, German (QWERTZ), French (AZERTY), Spanish, Italian, Portuguese, Dutch, Canadian English, Australian/NZ, or Irish in Settings so symbols and accented characters type correctly on non-US VMs; the extension makes a best-effort guess at install time (from your browser) but you should confirm it matches your VM's guest OS layout. Spanish/Portuguese/Dutch also support dead-key composed accents (e.g. Spanish á = dead-acute + a), the same way a real keyboard does. Letters, digits, and the core accented characters for all layouts are verified against real hardware; the digit-row/AltGr symbol layer for Spanish, Italian, Portuguese, and Dutch is not yet mapped and is safely skipped rather than guessed (see `dev/README.md`)
- **Update notice** — after the extension auto-updates, a small badge appears on the toolbar icon and a one-time "Updated to vX.Y.Z" note shows in the popup or the noVNC panel
- **Settings sync** — preferences (timing, keyboard layout, panel position, etc.) sync across devices via the browser's built-in account sync, when the user is signed in; falls back to local-only storage otherwise. Snippets are never synced this way — see Privacy.
- **Saved Snippets** — create, edit, delete, and reorder snippets; run them from either the popup or the noVNC panel (up to 200 snippets)
- **Backup & restore** — export all snippets to JSON and import them on another browser/profile, or optionally back up to a GitHub Gist (Settings → Backup) using your own personal access token, with an optional auto-sync toggle to push changes automatically. Which snippets get backed up to the Gist is opt-in per snippet (off by default) — toggle "Sync to Gist" on individual snippets in Settings → Snippets
- **Visual feedback** — toasts and, for long pastes, a **timer with countdown, progress bar, and cancel button** so you can see and control long-running pastes

## Installation (Developer Mode)

To install from source or test changes, load the extension unpacked:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the **`extension`** folder (in this repo)
5. The extension is now active

For Edge: go to `edge://extensions/` and follow the same steps.

For Firefox (development): open `about:debugging`, click **This Firefox**, click **Load Temporary Add-on…**, then select the **`extension`** folder or the `manifest.json` file inside it. The add-on will work until you restart Firefox; reload it from the same page after code changes.

**Testing without a real Proxmox server:** see [`dev/README.md`](dev/README.md) for a mock noVNC console page that the extension activates on normally — useful for verifying paste behavior and keyboard layouts end-to-end.

## Usage

1. Open your PVE web UI and launch a console — a VM (noVNC), or an LXC container / node Shell (xterm.js)
2. Copy text on your host machine (`Ctrl+C`)
3. Either:
   - Click the **Paste** pill in the corner of the console, or
   - Press native paste (`Ctrl+V` / `⌘V`) with the console focused, or
   - Open the popup and click **Send**
4. The text will be typed into the VM character by character using the timing you configured
5. (Optional) Expand the panel, switch to **Snippets**, and run or manage saved snippets; you can also save from the popup using **Save as snippet**

**Export & import snippets:** Click the PVE Snippets icon in the browser toolbar (top-right) to open the extension popup. There you can **Export snippets** (download all as JSON) or **Import snippets** (load from a JSON file). Snippets stay on your device; export/import is for backup or moving to another browser.

## Privacy

Clipboard content is used only when you paste and is not stored or sent anywhere. Snippets are always stored locally in the browser by default, and are never synced via the browser's own built-in account sync (see below) — the only way any snippet ever leaves the device is the separate, opt-in GitHub Gist backup described further down, and even then only for the specific snippets you've individually checked "Sync to Gist" on. The extension does not send data to any server it controls. See [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md) for the full policy.

Small preferences (timing, keyboard layout, panel position, etc. — never snippets or clipboard content) sync via `chrome.storage.sync`/`browser.storage.sync`, the browser's own built-in account sync, when the browser is signed in. That means the browser vendor (Google/Mozilla) carries these small settings values through its sync infrastructure the same way it would any other extension's synced settings; if you'd rather nothing leave the device, disable sync for extensions in your browser, or simply don't sign in — the extension falls back to local-only storage automatically.

GitHub Gist backup (Settings → Backup) is entirely opt-in: nothing is sent to GitHub unless you paste in a personal access token. Which snippets get uploaded is a *second*, per-snippet opt-in, off by default — check "Sync to Gist" on a snippet (Settings → Snippets → edit) before it's ever included in an Export or auto-sync, since GitHub's own "secret" gists are unlisted, not private — that's how GitHub's gist sharing model works, not a choice this extension makes — so anyone with the link can view them. By default you trigger Export/Import yourself; an optional **Auto-sync to Gist** toggle pushes changes to opted-in snippets automatically a couple seconds after each edit once a Gist is linked, running from the background service worker so it works even with no extension page open — it never pulls changes down on its own, only up. The token is stored locally only (never synced).

Note: local storage isn't indestructible — a browser "Clear browsing data" pass that includes **cookies and other site data** (not just cache) can wipe snippets and settings along with it. Export your snippets first (see above) before doing a deep browser cleanup.

## Disclaimer

This extension simulates keystrokes into whatever's focused on the page — including VM consoles, where a mismatched keyboard layout, a bug, or an unexpected edge case could send different characters than intended (e.g. into a password field, a shell command, or a config file). It's provided **as-is, with no warranty** (see [License](#license)) and no guarantee that every character always lands correctly. Always visually confirm what actually got typed before pressing Enter, running a command, or relying on it for anything sensitive or destructive — the authors aren't responsible for the consequences of pasted content that came out wrong.

## Notes

- The extension only activates on PVE (Proxmox VE) console URLs (`console=kvm|lxc|shell…` with `novnc=1` or `xtermjs=1`); it won’t inject into arbitrary sites that happen to use `<canvas>` or xterm.js
- Timing, compatibility mode, and keyboard layout only affect noVNC consoles, where text has to be typed keystroke by keystroke. xterm.js consoles receive the whole text at once as a paste, so those settings don't apply there (Auto-Enter still does)
- Characters are sent with a configurable delay between each to avoid dropped input
- Newlines are translated to Enter keypresses; you can also add an extra delay after each newline
- Very long pastes (hundreds of characters) will take a moment — you’ll see a timer and progress bar for longer runs, and you can cancel them
- Up to 200 saved snippets are supported; if you import more, the oldest ones are dropped

## Keyboard layouts

If pasted text comes out with the wrong symbols or accented characters (common on
AZERTY or German QWERTZ setups), open the extension **Settings → Paste → Keyboard
layout** and pick the layout that matches **the VM's/guest OS's** keyboard layout —
not necessarily the layout of the machine you're pasting from. Proxmox VMs also have
their own **Keyboard Layout** hardware option (Datacenter/VM settings); that setting
should match the guest OS too, independent of this extension.

## Troubleshooting

**Clipboard permission denied:** The browser may block clipboard access. Click the Paste button and, if the clipboard is blocked, use the panel textarea instead (you can paste into it manually and send from there).

**Characters getting dropped:** The VM might be processing input slower than the typing delay. If this happens, paste smaller chunks at a time.

**Button not appearing (PVE):** The floating panel and Ctrl+V paste only appear on PVE console pages (URL contains `console=…` plus `novnc=1` or `xtermjs=1`). Refresh after installing. For other noVNC or xterm.js pages, use the extension popup to paste into the page.

## Project structure

```
extension/       # Load unpacked from here (Chrome/Edge/Firefox); same folder for store zip
  manifest.json, content.js, keyboard-layouts.js, popup.html, popup.js, icons/
scripts/         # Build scripts
  build-icons.py, build-store-zip.py, requirements-icons.txt
dev/             # Mock noVNC console for testing without a real Proxmox server
assets/          # Source assets (e.g. icon.svg)
docs/            # Additional documentation
```

**Development:** The same `extension/` folder works for Chrome, Edge, and Firefox. After changing `assets/icon.svg`, run `python scripts/build-icons.py` (install deps: `pip install -r scripts/requirements-icons.txt`). To build the store zip: `python scripts/build-store-zip.py`.

## License

MIT — see [LICENSE](LICENSE).
