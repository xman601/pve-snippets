# Proxmox Paste Helper

A Chrome/Edge browser extension that adds clipboard paste support to the Proxmox noVNC console.

## Features

- **Floating Paste Button** — always-visible button in the bottom-right corner of the console
- **Keyboard Shortcut** — `Ctrl+Shift+V` triggers paste anywhere on the console page
- **Fallback Dialog** — if clipboard permission is denied, a text prompt appears so you can manually paste
- **Visual Feedback** — toast notifications show paste progress and character count

## Installation (Developer Mode)

Since this isn't on the Chrome Web Store, you load it as an unpacked extension:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `proxmox-paste-extension` folder
5. The extension is now active

For Edge: go to `edge://extensions/` and follow the same steps.

## Usage

1. Open your Proxmox web UI and launch a VM console (noVNC)
2. Copy text on your host machine (`Ctrl+C`)
3. Click the **Paste** button in the bottom-right, or press `Ctrl+Shift+V`
4. The text will be typed into the VM character by character

## Notes

- The extension detects pages with a `<canvas>` element (which noVNC uses)
- Characters are sent with a 30ms delay between each to avoid dropped input
- Newlines are translated to Enter keypresses
- Very long pastes (1000+ chars) will take a moment — watch the toast notification

## Troubleshooting

**Clipboard permission denied:** The browser may block clipboard access. Click the Paste button and a fallback dialog will appear where you can manually paste your text.

**Characters getting dropped:** The VM might be processing input slower than the 30ms delay. If this happens, paste smaller chunks at a time.

**Button not appearing:** Make sure you're on the noVNC console page (the URL typically contains `/novnc` or `/vncviewer`). Refresh the page after installing the extension.
