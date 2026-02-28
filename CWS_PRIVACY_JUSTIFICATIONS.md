# Chrome Web Store — Privacy practices justifications

Copy each block below into the corresponding field on the **Privacy practices** tab when publishing PVE Paste Helper.

---

## 1. Justification for **clipboardRead**

```
The extension reads the user's clipboard only when the user explicitly triggers a paste action: by clicking the floating Paste button, clicking "Paste into VM" in the panel, or using the native paste shortcut (Ctrl+V / ⌘V) while the noVNC console has focus. Clipboard content is used solely to type that text into the PVE VM console character-by-character. The data is not stored, logged, or transmitted to any external server.
```

---

## 2. Justification for **host permission use**

```
The extension injects a paste UI and sends keystrokes to the noVNC console so users can paste text into their PVE (Proxmox VE) VMs. PVE is self-hosted and can run on any URL (user-defined IP address or hostname). Broad host access is required because we cannot know in advance which domains or IPs the user's PVE instance uses. The content script only activates on pages that look like a noVNC console (e.g. URL contains "novnc", "vncviewer", or "console=kvm/lxc"). No data is sent to external servers.
```

---

## 3. Justification for **remote code use**

```
This extension does not load or execute any remote code. All JavaScript and HTML (content script, popup, and assets) are bundled with the extension and run locally. No scripts, stylesheets, or resources are fetched from the network at runtime.
```

---

## 4. Justification for **storage**

```
The extension uses chrome.storage.local only to store the user's saved snippets (name and text) so they can reuse common paste content from the paste panel. All data remains on the user's device. Snippet data is not sent to any external server and is not used for analytics or tracking.
```

---

Save your draft after pasting these into the Privacy practices tab, then continue with the rest of the submission.
