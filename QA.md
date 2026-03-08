# PVE Snippets – QA / Testing Guide

Use this guide to test every feature. Copy the blocks below into the extension or into a VM/textarea as needed.

---

## Test data (copy-paste blocks)

### Short (1 line)
```
Hello noVNC
```

### Multiline (newlines)
```
line one
line two
line three
```

### Special characters (quotes, backslash, $)
```
echo "hello \"world\"" && echo '$USER'
```

### Exactly 500 characters (compat boundary – compat mode should NOT apply)
Copy the next line only (no newline) — it is exactly 500 characters:
```
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Over 500 characters (compat mode applies when enabled)
```
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla facilisi. Ut convallis, sem sit amet interdum consectetuer, odio augue aliquam leo, id molestie magna nibh ut turpis. Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam.
```

### Very short (for “min length” block test – e.g. set min to 10)
```
hi
```

### Empty
```
(no text – use to test “Nothing to paste” / “Content required” etc.)
```

---

## 1. Popup (extension icon → popup)

**Prereq:** Click the PVE Snippets icon in the toolbar.

### 1.1 Paste tab – type and send
- Paste or type in the textarea (e.g. **Short** block).
- Click **Send**.
- **Expected:** Text is sent to the active tab (noVNC canvas or focused input/textarea). Toast: “Pasting N chars…” then “✓ Pasted N characters” (or text appears in focused field).

### 1.2 Paste tab – Clear
- Type something, click **Clear**.
- **Expected:** Textarea is empty.

### 1.3 Paste tab – Save as snippet
- Type a name and content (or use **Short** block), click **Save as snippet**.
- **Expected:** Snippet is created; switch to Snippets tab and see it in the list.

### 1.4 Paste tab – draft persistence
- Type or paste text in the Paste textarea. Close the popup (click away).
- Reopen the popup.
- **Expected:** Same text is still in the textarea.

### 1.5 Snippets tab – list and search
- Open **Snippets** tab. If empty, add a few snippets or import `demo-snippets.json` (see Backup).
- Type in the search box (e.g. “clear” or “reboot”).
- **Expected:** List filters by name/content; “No snippets match” if no match.

### 1.6 Snippets tab – run snippet
- Click the **Send** (play) button on a snippet row.
- **Expected:** Snippet text is sent to the active tab (noVNC or focused field). Toast as in 1.1.

### 1.7 Snippets tab – New snippet
- Click **+ New snippet**. Enter **Name** and **Content** (e.g. **Short** block). Click **Save**.
- **Expected:** Snippet appears in the list; form hides.

### 1.8 Snippets tab – Edit snippet
- Click **Edit** on a snippet. Change name or content. Click **Save**.
- **Expected:** Snippet updates in the list.

### 1.9 Snippets tab – Delete snippet
- Click **Delete** on a snippet.
- **Expected:** Snippet is removed from the list.

### 1.10 Popup – default tab (Settings)
- In **Settings → Paste & panel → Default tab**, set to **Snippets**. Close settings, reopen popup.
- **Expected:** Snippets tab is active. Set back to **Paste** and confirm Paste opens by default.

### 1.11 Popup – Settings link
- In popup, click the **Settings** (gear) icon.
- **Expected:** Extension options/settings page opens (full settings UI).

### 1.12 Send with min length set
- In **Settings → Paste & panel**, set **Min length** to **10**. In popup Paste tab, enter **Very short** (“hi”), click **Send**.
- **Expected:** Error toast or message: paste too short (min 10 characters). Paste with **Short** or longer works.

---

## 2. noVNC console (PVE VM console)

**Prereq:** Open a PVE noVNC console in the browser so the content script injects the pill/panel.

### 2.1 Pill – paste clipboard
- Copy **Short** to clipboard. Focus the noVNC canvas. Click the **clipboard icon** on the pill.
- **Expected:** Toast “Pasting N chars…”, then text is typed into the VM; “✓ Pasted N characters”.

### 2.2 Pill – open panel
- Click the **chevron** on the pill.
- **Expected:** Full panel opens; pill hides.

### 2.3 Panel – Paste tab
- In the panel **Paste** tab, paste **Multiline** into the textarea. Click **Send**.
- **Expected:** All lines are sent; newlines become Enter in the VM.

### 2.4 Panel – Snippets tab
- Switch to **Snippets** in the panel. Click **Send** on a snippet.
- **Expected:** Snippet text is typed into the VM.

### 2.5 Panel – add snippet (panel)
- In panel Snippets, click **+ New**. Enter name and content (e.g. **Special characters**). Save.
- **Expected:** Snippet appears; running it pastes the special chars correctly in the VM.

### 2.6 Panel – edit / delete snippet
- **Edit:** Click **Edit** on a snippet, change content, Save. Run it → updated content.
- **Delete:** Click **Delete** → snippet removed.

### 2.7 Panel – drag reorder
- If multiple snippets, drag one by the drag handle to a new position.
- **Expected:** Order changes; order persists after reopening panel/popup.

### 2.8 Ctrl+V / ⌘V (shortcut paste)
- Copy **Short** to clipboard. Focus noVNC canvas (not the panel textarea). Press **Ctrl+V** (or **⌘V** on Mac).
- **Expected:** Clipboard is pasted into the VM (same as pill paste).
- Disable in **Settings → noVNC panel → Enable Ctrl+V / ⌘V** (uncheck). **Ctrl+V** on canvas should no longer paste.

### 2.9 Panel position
- **Settings → noVNC panel → Position:** try **Bottom right**, **Bottom left**, **Top right**, **Top left**.
- **Expected:** Panel/pill move to the chosen corner.

### 2.10 Panel open by default
- **Settings → noVNC panel → Open panel by default** (check). Reload the noVNC page.
- **Expected:** Panel opens automatically; pill is hidden. Uncheck and reload → pill only.

---

## 3. Paste timing and compatibility

### 3.1 Keystroke delay
- **Settings → Timing → Keystroke ms:** set to **50**. Paste **Short** into noVNC or panel.
- **Expected:** Typing is noticeably slower. Set back to **20** (or desired).

### 3.2 First char delay
- **Settings → Timing → First char ms:** set to **100**. Paste **Short**.
- **Expected:** Pause before first character, then normal pace.

### 3.3 After Enter delay
- **Settings → Timing → After Enter ms:** set to **100**. Paste **Multiline**.
- **Expected:** Extra pause after each newline.

### 3.4 Auto-hit Enter after paste
- **Settings → Timing → Auto-hit Enter after paste** (check). Paste **Short** (no newline at end).
- **Expected:** After the text, Enter is sent once. Uncheck → no trailing Enter.

### 3.5 Compatibility mode (pastes > 500 chars)
- **Settings → Timing → Compatibility mode (for pastes > 500 chars)** (check).
- Paste **Over 500 characters** into noVNC (or panel).
- **Expected:** Paste runs slower (min 40 ms/char, 80 ms first char, extra pause every 400 chars). No garbling.
- Paste **Exactly 500 characters**.
- **Expected:** Normal timing (compat mode does not apply at 500). Uncheck compat and paste **Over 500 characters** again to compare speed.

### 3.6 Min length (block short pastes)
- **Settings → Timing → Min length chars:** set **10**. From popup or panel, try to send **Very short** (“hi”).
- **Expected:** Blocked with “Paste too short (min 10 characters)” (or equivalent). Sending **Short** or longer works.

---

## 4. Settings page (full options)

**Open:** Right-click extension icon → Options, or popup → Settings (gear).

### 4.1 Sidebar navigation
- Click **Paste & panel**, **Backup**, **Snippets** in the left nav.
- **Expected:** Corresponding panel content and URL hash (#paste, #backup, #snippets).

### 4.2 Paste & panel – all controls
- Toggle and change every control; reopen settings.
- **Expected:** All values persist (Auto Enter, Keystroke/First char/After Enter, Compat mode, Min length, Default tab, Ctrl+V, Open panel by default, Position).

### 4.3 Backup – Export
- Click **Export all** in the Backup panel.
- **Expected:** A `.json` file downloads with all snippets (array of `{ id, name, text, updatedAt }`).

### 4.4 Backup – Import (file picker)
- Click the upload zone, choose a `.json` file (e.g. project’s **demo-snippets.json**).
- **Expected:** Status: “Imported N snippet(s). Total: M.” Snippets panel and popup show the merged list (up to 200).

### 4.5 Backup – Import (drag and drop)
- Drag **demo-snippets.json** onto the “Drop a .json file or click to browse” zone.
- **Expected:** Same as 4.4 (file is read and merged).

### 4.6 Backup – Import invalid JSON
- Create a text file with content `{ invalid }`, save as `.json`. Import it.
- **Expected:** “Import failed: invalid JSON.” (or similar).

### 4.7 Backup – Import empty array
- Import a JSON file that is `[]`.
- **Expected:** “Import failed: no snippets in file.” (or similar).

### 4.8 Snippets panel in Settings
- Open **Snippets** in the sidebar. Check **Total**, **Last updated**, **Storage**.
- **Expected:** Stats match snippet count and data. List shows same snippets as popup (edit/delete work; changes sync to popup/panel).

---

## 5. Paste on any page (no noVNC)

**Prereq:** Open a normal page with an input or textarea (e.g. a search box or a text field). Focus that field.

### 5.1 Popup Send to focused field
- In popup Paste tab, paste **Short**, click **Send**.
- **Expected:** Text is inserted into the focused input/textarea (or contenteditable). No “No target to paste into” if a field is focused.

### 5.2 Popup snippet to focused field
- Focus a text field. In popup Snippets tab, click **Send** on a snippet.
- **Expected:** Snippet text is inserted into the focused field.

### 5.3 No target
- Unfocus any input (e.g. click page background). From popup, click **Send** with some text.
- **Expected:** Error: “No target to paste into. Focus a noVNC console or a text field in the tab.”

---

## 6. Edge cases and toasts

- **Empty clipboard + pill paste:** Copy nothing (or clear clipboard), click pill paste on noVNC. **Expected:** “Clipboard is empty” (or similar).
- **Empty Send from popup:** Clear the Paste textarea, click **Send**. **Expected:** “Nothing to paste” (or similar).
- **Save snippet with empty name:** In New snippet, leave name blank, fill content, Save. **Expected:** “Name required” (or similar).
- **Save snippet with empty content:** Name set, content empty, Save. **Expected:** “Content required” (or similar).

---

## Quick reference – test strings

| Purpose              | Length   | Use |
|----------------------|----------|-----|
| Short                | ~12      | General paste, Send, snippets |
| Multiline            | 3 lines  | Newline / Enter delay |
| Special characters   | 1 line   | Quotes, `$`, `\` |
| Exactly 500 chars    | 500      | Compat mode OFF at boundary |
| Over 500 chars       | 501+     | Compat mode ON (slower, chunked) |
| Very short           | 2 chars  | Min length block |
| Empty                | 0        | “Nothing to paste” / validations |

**Import test file:** `demo-snippets.json` in the project root (use in Settings → Backup → Import).
