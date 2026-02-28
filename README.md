# PVE Paste Helper

A Chrome/Edge browser extension that adds clipboard paste support to the PVE (Proxmox VE) noVNC console.

## Features

- **Floating Paste Button** — always-visible button in the bottom-right corner of the console
- **Keyboard Shortcut** — native paste (`Ctrl+V` on Windows/Linux, `⌘V` on macOS) pastes into the VM when the noVNC console is focused
- **Fallback Dialog** — if clipboard permission is denied, a text prompt appears so you can manually paste
- **Visual Feedback** — toast notifications show paste progress and character count
- **Saved Snippets** — save and reuse common paste blocks from the paste panel

## Installation (Developer Mode)

Since this isn't on the Chrome Web Store, you load it as an unpacked extension:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the **`extension`** folder (in this repo)
5. The extension is now active

For Edge: go to `edge://extensions/` and follow the same steps.

## Usage

1. Open your PVE web UI and launch a VM console (noVNC)
2. Copy text on your host machine (`Ctrl+C`)
3. Click the **Paste** button in the bottom-right, or press native paste (`Ctrl+V` / `⌘V`)
4. The text will be typed into the VM character by character
5. (Optional) Open the panel, choose a snippet from **Snippets…**, or click **Save** to store what’s in the textarea

## Notes

- The extension detects pages with a `<canvas>` element (which noVNC uses)
- Characters are sent with a small delay between each to avoid dropped input
- Newlines are translated to Enter keypresses
- Very long pastes (1000+ chars) will take a moment — watch the toast notification

## Troubleshooting

**Clipboard permission denied:** The browser may block clipboard access. Click the Paste button and a fallback dialog will appear where you can manually paste your text.

**Characters getting dropped:** The VM might be processing input slower than the 30ms delay. If this happens, paste smaller chunks at a time.

**Button not appearing:** Make sure you're on the noVNC console page (the URL typically contains `/novnc` or `/vncviewer`). Refresh the page after installing the extension.

## Project structure

```
extension/       # Load unpacked from here; this is what gets zipped for the store
  manifest.json, content.js, popup.html, popup.js, icons/
scripts/         # Build scripts
  build-icons.py      # SVG → PNG (run after changing assets/icon.svg)
  build-store-zip.py  # Creates pve-paste-helper.zip for Chrome Web Store
assets/          # Source assets (e.g. icon.svg)
docs/            # Additional documentation
```
