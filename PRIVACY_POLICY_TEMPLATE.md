# PVE Paste Helper — Privacy Policy (Template)

_This file is a template. For Chrome Web Store submission you must host the final policy on a public URL (for example GitHub Pages or a Gist) and paste that URL into the CWS form._

---

## Summary

PVE Paste Helper runs entirely in your browser and is designed to keep your data on your machine.

- Clipboard text is read **only** when you explicitly trigger a paste action.
- Saved snippets are stored **locally** in the browser via `chrome.storage.local`.
- The extension does **not** send any data to external servers.

## Data the extension can access

### Clipboard contents

When you use:

- the floating Paste button,
- the paste panel&apos;s **Paste into VM** button, or
- the keyboard shortcut (native paste: <kbd>Ctrl+V</kbd> / <kbd>⌘V</kbd> while the noVNC console is focused),

the extension may read plain-text clipboard contents so it can type that text into the PVE noVNC console on your behalf.

Clipboard data is:

- processed only in memory,
- not logged or persisted by the extension, and
- not transmitted to any remote server.

### Saved snippets

If you use the snippets feature in the paste panel:

- Snippet names and contents are stored in `chrome.storage.local`.
- This storage is local to your browser profile and PVE Paste Helper.
- The extension does not sync snippet data to any external service.

## Data sharing

The extension does **not**:

- send any data to third-party servers,
- include analytics, tracking pixels, or remote logging, or
- use cookies.

All processing happens locally in your browser.

## Permissions justification

- **`clipboardRead`** — required so the extension can read plain-text clipboard data when you explicitly invoke a paste action.
- **`storage`** — required to keep your optional saved snippets on your device between sessions.

## Contact

Replace this section with your preferred contact method or website, for example:

> For questions about this extension or this privacy policy, please contact: `you@example.com`.

