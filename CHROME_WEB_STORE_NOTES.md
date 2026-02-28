# Chrome Web Store — Publication Checklist

Issues to resolve before submitting to the Chrome Web Store.

---

## ❌ Blockers (will cause rejection)

### 1. `<all_urls>` host permission + `all_frames: true`
**File:** `manifest.json`
The extension requests access to every website and injects into every iframe on every page. CWS requires minimum necessary permissions.

**Options:**
- Switch to `"optional_host_permissions": ["<all_urls>"]` so the user grants access only to their specific Proxmox host at runtime
- OR keep `<all_urls>` and write a detailed justification in the store listing explaining why it's required (Proxmox runs on user-defined IPs/hostnames)

---

### 2. External Google Fonts CDN
**File:** `content.js` (~line 249)
```js
link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono...';
```
Loading remote resources is not allowed — all assets must be bundled locally.

**Fix:**
- Download JetBrains Mono + Space Mono WOFF2 files, add to the extension folder, use local `@font-face` rules
- OR simply remove the Google Fonts link and fall back to the `monospace` system font (easiest)

---

### 3. Icon format — SVG not accepted by the store
**File:** `manifest.json`
CWS requires PNG icons at 16×16, 48×48, and 128×128px. SVG is not accepted for the store listing.

**Fix:** Convert `icon-option-a.svg` to PNG at all three sizes and update `manifest.json` to reference separate files per size:
```json
"icons": {
  "16":  "icon16.png",
  "48":  "icon48.png",
  "128": "icon128.png"
}
```

---

### 4. No privacy policy
CWS requires a hosted privacy policy URL for any extension using `clipboardRead` or `storage`. The submission form will not let you proceed without one.

**Fix:** Publish a simple privacy policy (GitHub Gist, GitHub Pages, or any hosted page) stating:
- Clipboard content is only read when the user explicitly triggers a paste action
- Snippet data is stored locally on the device only (`chrome.storage.local`)
- No data is sent to any external server

---

## ⚠️ Likely to cause review delays

### 5. `prompt()` dialogs
`prompt()` is blocked inside iframes in many contexts and reviewers flag it as poor UX.

**File:** `content.js` — clipboard fallback + snippet save/delete confirmations

**Fix:** Replace with an inline modal or textarea inside the extension panel UI.

---

### 6. No toolbar action defined
Extensions without a toolbar `action` look incomplete to reviewers. Clicking the extension icon currently does nothing.

**Fix:** Add a minimal popup to `manifest.json`:
```json
"action": {
  "default_title": "Proxmox Paste Helper",
  "default_popup": "popup.html"
}
```
The popup can just say "Open a Proxmox VM console to use this extension."

---

## ✅ Already fine
- Manifest V3 ✓
- `clipboardRead` and `storage` permissions are appropriate and justified by functionality ✓
- No `eval()` or remote script execution ✓
- `all_frames: true` is justified (noVNC loads inside an iframe) — just needs explanation in listing ✓
