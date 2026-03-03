# Chrome Web Store — Privacy practices justifications

Paste each block below into the matching field on the **Privacy practices** tab when publishing PVE Paste Helper.

---

## 1. clipboardRead

**Single purpose:** Read clipboard text only when the user explicitly pastes into the PVE noVNC console, so that text can be typed into the VM.

**Copy into the clipboardRead justification field:**

```
The extension reads the clipboard only when the user explicitly triggers a paste: by clicking the floating Paste button, using the paste panel, or pressing Ctrl+V / ⌘V while the noVNC console is focused. The text is used only to simulate keystrokes in the PVE VM console. Clipboard content is not stored, logged, or sent to any server. It is processed in memory and discarded after the paste completes.
```

---

## 2. Host permission (e.g. "<all_urls>" or "Access to the data on all sites")

**Single purpose:** Allow the extension to run on the user’s PVE/noVNC console page, which can be on any domain or IP.

**Copy into the host permission justification field:**

```
PVE (Proxmox VE) is self-hosted; users access their noVNC console from their own server URL or IP. We cannot know that URL in advance, so broad host access is required. The extension only runs on pages that look like a noVNC console (e.g. URL contains "novnc", "vncviewer", or "console=kvm"/"console=lxc"). On those pages it injects a paste UI and sends keystrokes to the console. No data is sent to external servers; all processing is local.
```

---

## 3. Remote code (if prompted)

**Single purpose:** Not used — all code is bundled with the extension.

**Copy into the remote code justification field (if the form asks):**

```
This extension does not load or execute any remote code. All JavaScript and HTML (content script, popup, icons) are included in the extension package and run locally. No scripts, stylesheets, or other resources are fetched from the network at runtime.
```

---

## 4. tabs

**Single purpose:** Get the active tab’s ID when the user clicks “Paste into page” in the popup, so pasted text is sent only to that tab.

**Copy into the tabs justification field:**

```
The extension uses the tabs permission only when the user clicks "Paste into page" in the extension popup. It calls chrome.tabs.query to get the currently active tab's ID, then sends the user's pasted text to that tab (e.g. noVNC console or any focused text field). The extension does not read tab URLs, titles, or page content; it only needs the tab ID to deliver the pasted text to the correct tab.
```

---

## 5. storage

**Single purpose:** Store the user’s saved snippets locally so they can reuse them from the paste panel.

**Copy into the storage justification field:**

```
The extension uses chrome.storage.local only to store the user's saved snippets (name and text content) so they can reuse common paste text from the paste panel. All snippet data stays on the user's device. It is not sent to any server and is not used for analytics or tracking.
```

---

**Tip:** Save your draft after filling each section, then complete the rest of the submission.
