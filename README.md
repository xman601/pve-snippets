# PVE Snippets

A Chrome, Edge, and Firefox browser extension that adds clipboard paste support to the PVE (Proxmox VE) noVNC console.

**Install:** [Chrome Web Store](https://chromewebstore.google.com/detail/jampbpobgkkfoeiogobjlbhldkjgcfkg) · [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/pve-snippets/)

## Features

- **Floating Paste pill & panel** — small pill on PVE noVNC consoles that expands into a full panel with **Paste** and **Snippets** tabs
- **Keyboard Shortcut** — native paste (`Ctrl+V` on Windows/Linux, `⌘V` on macOS) pastes into the VM when the console is focused (configurable in Settings)
- **Popup Paste** — open the extension popup, type or paste text, and click **Send** to paste into the active tab (noVNC canvas or focused text field)
- **Auto-hit Enter after paste** — optional toggle in Settings to send Enter after each paste
- **Timing & compatibility controls** — adjust per‑character delay, first‑character delay (up to 1000 ms), extra delay after newlines, and an optional compatibility mode for very long pastes
- **Saved Snippets** — create, edit, delete, and reorder snippets; run them from either the popup or the noVNC panel (up to 200 snippets)
- **Backup & restore** — export all snippets to JSON and import them on another browser/profile
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

## Usage

1. Open your PVE web UI and launch a VM console (noVNC)
2. Copy text on your host machine (`Ctrl+C`)
3. Either:
   - Click the **Paste** pill in the corner of the console, or
   - Press native paste (`Ctrl+V` / `⌘V`) with the console focused, or
   - Open the popup and click **Send**
4. The text will be typed into the VM character by character using the timing you configured
5. (Optional) Expand the panel, switch to **Snippets**, and run or manage saved snippets; you can also save from the popup using **Save as snippet**

**Export & import snippets:** Click the PVE Snippets icon in the browser toolbar (top-right) to open the extension popup. There you can **Export snippets** (download all as JSON) or **Import snippets** (load from a JSON file). Snippets stay on your device; export/import is for backup or moving to another browser.

## Privacy

All data stays on your device. Clipboard content is used only when you paste and is not stored or sent anywhere. Snippets are stored locally in the browser. The extension does not send data to any server. See `docs/PRIVACY_POLICY_TEMPLATE.md` for the full policy.

## Notes

- The extension only activates on PVE (Proxmox VE) noVNC console URLs; it won’t inject into arbitrary sites that happen to use `<canvas>`
- Characters are sent with a configurable delay between each to avoid dropped input
- Newlines are translated to Enter keypresses; you can also add an extra delay after each newline
- Very long pastes (hundreds of characters) will take a moment — you’ll see a timer and progress bar for longer runs, and you can cancel them
- Up to 200 saved snippets are supported; if you import more, the oldest ones are dropped

## Troubleshooting

**Clipboard permission denied:** The browser may block clipboard access. Click the Paste button and, if the clipboard is blocked, use the panel textarea instead (you can paste into it manually and send from there).

**Characters getting dropped:** The VM might be processing input slower than the typing delay. If this happens, paste smaller chunks at a time.

**Button not appearing (PVE):** The floating panel and Ctrl+V paste only appear on PVE noVNC console pages (URL typically contains `/novnc` or similar). Refresh after installing. For other noVNC pages, use the extension popup to paste into the page.

## Project structure

```
extension/       # Load unpacked from here (Chrome/Edge/Firefox); same folder for store zip
  manifest.json, content.js, popup.html, popup.js, icons/
scripts/         # Build scripts
  build-icons.py, build-store-zip.py, requirements-icons.txt
assets/          # Source assets (e.g. icon.svg)
docs/            # Additional documentation
```

**Development:** The same `extension/` folder works for Chrome, Edge, and Firefox. After changing `assets/icon.svg`, run `python scripts/build-icons.py` (install deps: `pip install -r scripts/requirements-icons.txt`). To build the store zip: `python scripts/build-store-zip.py`.

## License

MIT — see [LICENSE](LICENSE).
