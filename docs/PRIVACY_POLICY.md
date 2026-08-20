# PVE Snippets — Privacy Policy

**Last updated:** August 2026

This privacy policy describes how the **PVE Snippets** browser extension (“the extension”) handles your data. The extension is designed to run entirely in your browser and to keep your data on your device.

For Chrome Web Store submission, this policy must be hosted at a public URL (e.g. GitHub Pages or the repo’s raw/docs file) and that URL entered in the store’s privacy policy field.

---

## Summary

- **Clipboard** — Read only when you explicitly paste (button, panel, or Ctrl+V / ⌘V). Not stored or sent anywhere.
- **Snippets** — Stored locally in your browser (`chrome.storage.local`). Never synced or sent to any server unless you explicitly turn on GitHub Gist backup (see below).
- **Settings** — Small preference values (timing, keyboard layout, panel position, etc.) use `chrome.storage.sync`, your browser's own built-in account sync, when you're signed in. This never includes snippets or clipboard content.
- **No analytics, no tracking, no remote server the developer controls** — All processing happens in your browser. The only external network destinations are the browser vendor's own sync infrastructure (for settings) and, only if you opt in, GitHub's API (for Gist backup).

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
- Snippet data is **not** synced to the cloud or sent to any external service, unless you explicitly enable GitHub Gist backup (below).

### Settings sync

Preference values — paste timing, keyboard layout, panel position, and similar toggles — are stored with `chrome.storage.sync`. When your browser is signed in to its own account sync (Google Sync for Chrome, Firefox Sync/Mozilla Accounts for Firefox), these small values are carried across your devices through that sync infrastructure, the same way any other extension's synced settings would be. This never includes snippet content or clipboard data. If sync isn't available or you're signed out, the extension automatically falls back to local-only storage.

### Optional: GitHub Gist backup

The Backup panel in Settings offers an **opt-in** way to back up your snippets to a GitHub Gist, either manually or automatically:

- You provide a GitHub **personal access token** (ideally scoped to only the `gist` permission). This token is stored in `chrome.storage.local` on your device only — never synced, never sent anywhere except directly to `api.github.com`.
- **Which snippets get uploaded is opt-in per snippet, off by default.** GitHub's "secret" gists are unlisted, not private — that's how GitHub's own gist sharing model works, not a choice this extension makes — so nothing is included in an Export or an auto-sync until you check "Sync to Gist" on that specific snippet (Settings → Snippets → edit a snippet). Snippets you never opt in never leave your device via this feature.
- Clicking **Export to Gist** sends your opted-in snippets to a Gist created (or updated) under your GitHub account via the GitHub API, over HTTPS, directly from your browser. Clicking **Import from Gist** reads them back the same way, and marks the snippets it pulls in as opted-in (they're already sitting in the Gist this device is now linked to).
- The **Auto-sync to Gist** toggle (off by default, and disabled until a Gist is linked via one manual export/import) pushes an update to the Gist automatically a couple of seconds after any opted-in snippet changes, without further action from you. It runs from the extension's background service worker, so it can also fire while no extension page is open. It never pulls changes down automatically — importing is always a deliberate action.
- GitHub Gists created this way are **secret**, not private — again, this is GitHub's own gist model, not something the extension controls: anyone with the Gist's URL can view its contents, even though it won't appear in GitHub search or your public profile. Treat the Gist URL accordingly.
- You can remove the stored token at any time with the **Forget token** button, which also clears it and turns off auto-sync.

---

## Data sharing

Other than the optional, user-initiated cases above (your own browser's account sync for settings, and GitHub's API if you explicitly enable Gist backup), the extension **does not**:

- Send any data to third-party or developer-controlled servers
- Use analytics, tracking pixels, or remote logging
- Use cookies for tracking
- Sell or share your data

All other processing is done locally in your browser.

---

## Permissions

| Permission      | Purpose |
|-----------------|--------|
| **clipboardRead** | So the extension can read clipboard text when you explicitly paste into the noVNC console. |
| **storage**       | To store your optional saved snippets on your device between sessions. |
| **Host access**   | PVE/noVNC can run on any URL or IP. The extension only activates on pages that look like a noVNC console (e.g. URL contains `novnc`, `vncviewer`, or `console=kvm`/`lxc`). This same broad host access is also what lets the Settings page call GitHub's API, but only if you explicitly enable and use Gist backup. |

---

## Contact

For questions about this extension or this privacy policy, you can open an issue on the project repository or contact the developer via the Chrome Web Store listing.
