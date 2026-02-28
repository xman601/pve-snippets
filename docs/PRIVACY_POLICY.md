# PVE Paste Helper — Privacy Policy

**Last updated:** February 2026

This privacy policy describes how the **PVE Paste Helper** browser extension (“the extension”) handles your data. The extension is designed to run entirely in your browser and to keep your data on your device.

For Chrome Web Store submission, this policy must be hosted at a public URL (e.g. GitHub Pages or the repo’s raw/docs file) and that URL entered in the store’s privacy policy field.

---

## Summary

- **Clipboard** — Read only when you explicitly paste (button, panel, or Ctrl+V / ⌘V). Not stored or sent anywhere.
- **Snippets** — Stored locally in your browser (`chrome.storage.local`). Not synced or sent to any server.
- **No analytics, no tracking, no remote servers** — All processing happens in your browser.

---

## Data the extension can access

### Clipboard contents

When you trigger a paste in one of these ways:

- The floating **Paste** button in the noVNC console,
- The paste panel’s **Paste into VM** (or native paste), or
- The keyboard shortcut **Ctrl+V** (Windows/Linux) or **⌘V** (macOS) while the noVNC console is focused,

the extension may read plain-text from your clipboard so it can type that text into the PVE noVNC VM console.

- Clipboard data is used **only in memory** to send keystrokes to the console.
- It is **not** saved, logged, or transmitted to any remote server.

### Saved snippets

If you use the **Snippets** feature in the paste panel:

- Snippet **names** and **content** are stored in `chrome.storage.local`.
- This storage is **local to your browser profile** and to this extension only.
- Snippet data is **not** synced to the cloud or sent to any external service.

---

## Data sharing

The extension **does not**:

- Send any data to third-party or developer servers
- Use analytics, tracking pixels, or remote logging
- Use cookies for tracking
- Sell or share your data

All processing is done locally in your browser.

---

## Permissions

| Permission      | Purpose |
|-----------------|--------|
| **clipboardRead** | So the extension can read clipboard text when you explicitly paste into the noVNC console. |
| **storage**       | To store your optional saved snippets on your device between sessions. |
| **Host access**   | PVE/noVNC can run on any URL or IP. The extension only activates on pages that look like a noVNC console (e.g. URL contains `novnc`, `vncviewer`, or `console=kvm`/`lxc`). No data is sent to external servers. |

---

## Contact

For questions about this extension or this privacy policy, you can open an issue on the project repository or contact the developer via the Chrome Web Store listing.
