# PVE Paste Helper

A Chrome, Edge, and Firefox browser extension that adds clipboard paste support to the PVE (Proxmox VE) noVNC console.

## Features

- **Floating Paste Button** — always-visible button in the bottom-right corner of the noVNC console (on PVE)
- **Keyboard Shortcut** — native paste (`Ctrl+V` on Windows/Linux, `⌘V` on macOS) pastes into the VM when the console is focused
- **Paste from Popup** — open the extension popup, type or paste text, and click “Paste into page” to send it to the active tab (works with any noVNC or focused text field)
- **Hit Enter after paste** — optional toggle in the popup to send Enter after each paste
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

For Firefox (development): open `about:debugging`, click **This Firefox**, click **Load Temporary Add-on…**, then select the **`extension`** folder or the `manifest.json` file inside it. The add-on will work until you restart Firefox; reload it from the same page after code changes.

## Usage

1. Open your PVE web UI and launch a VM console (noVNC)
2. Copy text on your host machine (`Ctrl+C`)
3. Click the **Paste** button in the bottom-right, or press native paste (`Ctrl+V` / `⌘V`)
4. The text will be typed into the VM character by character
5. (Optional) Open the panel, choose a snippet from **Snippets…**, or click **Save** to store what’s in the textarea

**Export & import snippets:** Click the PVE Paste Helper icon in the browser toolbar (top-right) to open the extension popup. There you can **Export snippets** (download all as JSON) or **Import snippets** (load from a JSON file). Snippets stay on your device; export/import is for backup or moving to another browser.

## Privacy

All data stays on your device. Clipboard content is used only when you paste and is not stored or sent anywhere. Snippets are stored locally in the browser. The extension does not send data to any server. See `docs/PRIVACY_POLICY_TEMPLATE.md` for the full policy.

## Notes

- The extension detects pages with a `<canvas>` element (which noVNC uses)
- Characters are sent with a small delay between each to avoid dropped input
- Newlines are translated to Enter keypresses
- Very long pastes (1000+ chars) will take a moment — watch the toast notification
- Maximum of 50 saved snippets; oldest are dropped when you add more

## Troubleshooting

**Clipboard permission denied:** The browser may block clipboard access. Click the Paste button and a fallback dialog will appear where you can manually paste your text.

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
