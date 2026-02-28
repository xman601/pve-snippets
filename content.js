// PVE Paste Helper - Content Script
// Injects paste support into PVE noVNC console

(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';

  // Only activate on pages that look like a PVE noVNC console
  function isProxmoxConsole() {
    const path = window.location.pathname;
    const search = window.location.search;
    return (
      path.includes('novnc') ||
      path.includes('vncviewer') ||
      search.includes('novnc=1') ||
      search.includes('console=kvm') ||
      search.includes('console=lxc')
    );
  }

  // Wait for the page to load the canvas before injecting
  function waitForCanvas(callback, attempts = 0) {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      callback(canvas);
    } else if (attempts < 30) {
      setTimeout(() => waitForCanvas(callback, attempts + 1), 500);
    }
  }

  // Map character to DOM KeyboardEvent code so noVNC's keyboard handler accepts it
  function getKeyCode(char) {
    const c = char.charCodeAt(0);
    if (char === ' ') return 'Space';
    if (char >= '0' && char <= '9') return 'Digit' + char;
    if (char >= 'A' && char <= 'Z') return 'Key' + char;
    if (char >= 'a' && char <= 'z') return 'Key' + char.toUpperCase();
    const codeMap = {
      '\n': 'Enter', '\r': 'Enter',
      '`': 'Backquote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft',
      ']': 'BracketRight', '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote',
      ',': 'Comma', '.': 'Period', '/': 'Slash',
      '~': 'Backquote', '!': 'Digit1', '@': 'Digit2', '#': 'Digit3',
      '$': 'Digit4', '%': 'Digit5', '^': 'Digit6', '&': 'Digit7',
      '*': 'Digit8', '(': 'Digit9', ')': 'Digit0', '_': 'Minus',
      '+': 'Equal', '{': 'BracketLeft', '}': 'BracketRight', '|': 'Backslash',
      ':': 'Semicolon', '"': 'Quote', '<': 'Comma', '>': 'Period', '?': 'Slash'
    };
    return codeMap[char] || (c >= 32 && c <= 126 ? 'Key' + char.toUpperCase() : 'KeyA');
  }

  function needsShift(char) {
    if (char >= 'A' && char <= 'Z') return true;
    return "~!@#$%^&*()_+{}|:\"<>?".includes(char);
  }

  // Send a single character to the noVNC canvas using keyboard events
  function sendChar(canvas, char) {
    const keyCode = char.charCodeAt(0);
    const code = getKeyCode(char);
    const shift = needsShift(char);

    const baseOpts = {
      bubbles: true,
      cancelable: true
    };

    // For characters that require shift (e.g. '&', '+', uppercase letters), we must
    // emulate the modifier state, otherwise noVNC may translate the key wrong or drop it.
    if (shift) {
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        ...baseOpts,
        key: 'Shift',
        code: 'ShiftLeft',
        keyCode: 16,
        which: 16,
        shiftKey: true
      }));
    }

    const keyEventOpts = {
      ...baseOpts,
      key: char,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      charCode: keyCode,
      shiftKey: shift
    };

    canvas.dispatchEvent(new KeyboardEvent('keydown', keyEventOpts));
    canvas.dispatchEvent(new KeyboardEvent('keypress', keyEventOpts));
    canvas.dispatchEvent(new KeyboardEvent('keyup', keyEventOpts));

    if (shift) {
      canvas.dispatchEvent(new KeyboardEvent('keyup', {
        ...baseOpts,
        key: 'Shift',
        code: 'ShiftLeft',
        keyCode: 16,
        which: 16,
        shiftKey: false
      }));
    }
  }

  // Send text character by character; noVNC/VM need correct key codes and time per key
  function sendText(canvas, text, delay = 50) {
    canvas.focus();
    // Normalize \r\n to single newline so we don't send two Enters
    const normalized = text.replace(/\r\n/g, '\n');
    let i = 0;

    function sendNext() {
      if (i >= normalized.length) {
        showToast(`✓ Pasted ${normalized.length} characters`);
        return;
      }

      const char = normalized[i];

      if (char === '\n' || char === '\r') {
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
        canvas.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
      } else {
        sendChar(canvas, char);
      }

      i++;
      setTimeout(sendNext, delay);
    }

    sendNext();
  }

  // Read clipboard and paste into canvas
  async function pasteClipboard(canvas) {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        showToast('⚠ Clipboard is empty');
        return;
      }
      showToast(`⏳ Pasting ${text.length} chars...`);
      sendText(canvas, text);
    } catch (err) {
      // Fallback: clipboard is blocked; instruct user to paste into the panel textarea instead
      showToast('⚠ Clipboard blocked. Open the panel and paste into the text box.');
    }
  }

  // Toast notification
  let toastTimeout;
  function showToast(message) {
    let toast = document.getElementById('pmx-paste-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pmx-paste-toast';
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: '#2a2a2a',
        color: '#ffffff',
        border: '1px solid #ffffff',
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: '999999',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
      });
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2500);
  }

  function storageGet(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local.get([key]).then((res) => res[key]);
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(key);
      return Promise.resolve(raw ? JSON.parse(raw) : undefined);
    } catch (_) {
      return Promise.resolve(undefined);
    }
  }

  function storageSet(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local.set({ [key]: value });
      }
    } catch (_) {}
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
    return Promise.resolve();
  }

  async function getSnippets() {
    const v = await storageGet(SNIPPETS_KEY);
    return Array.isArray(v) ? v : [];
  }

  async function saveSnippet({ id, name, text }) {
    const now = Date.now();
    const snippets = await getSnippets();
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return { ok: false, reason: 'no_name' };

    const trimmedText = String(text || '');
    if (!trimmedText) return { ok: false, reason: 'no_text' };

    if (id) {
      const idx = snippets.findIndex((s) => s.id === id);
      if (idx >= 0) {
        snippets[idx] = { ...snippets[idx], name: trimmedName, text: trimmedText, updatedAt: now };
      } else {
        snippets.unshift({ id, name: trimmedName, text: trimmedText, updatedAt: now });
      }
    } else {
      const newId = `s_${now}_${Math.random().toString(16).slice(2)}`;
      snippets.unshift({ id: newId, name: trimmedName, text: trimmedText, updatedAt: now });
      id = newId;
    }

    await storageSet(SNIPPETS_KEY, snippets.slice(0, 50));
    return { ok: true, id };
  }

  async function deleteSnippet(id) {
    const snippets = await getSnippets();
    const next = snippets.filter((s) => s.id !== id);
    await storageSet(SNIPPETS_KEY, next);
  }

  // Inject floating paste button + expandable text panel
  function injectButton(canvas) {
    const CLIP_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1.5"/>
    </svg>`;
    const CLIP_SVG_SM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1.5"/>
    </svg>`;
    const CHEV_DOWN = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const CHEV_UP   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    const CHEV_RIGHT = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    const CSS = `
      #pmx-wrap {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 999999;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: geometricPrecision;
      }
      #pmx-wrap * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: geometricPrecision;
      }

      /* ─── Collapsed pill ─── */
      #pmx-btns {
        display: flex;
        align-items: center;
        gap: 0;
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        cursor: pointer;
        transition: border-color 0.15s;
      }
      #pmx-btns:hover {
        border-color: #E57000;
      }
      #pmx-btns:hover .pmx-paste-icon-wrap {
        background: #E57000;
      }
      .pmx-paste-icon-wrap {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #222;
        transition: background 0.15s;
      }
      .pmx-paste-icon-wrap svg {
        color: #c46900;
        transition: color 0.15s;
      }
      #pmx-btns:hover .pmx-paste-icon-wrap svg {
        color: #fff;
      }
      .pmx-chevron-wrap {
        width: 28px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-left: 1px solid #2a2a2a;
      }
      .pmx-chevron-wrap svg {
        color: #555;
        transition: color 0.15s;
      }
      #pmx-btns:hover .pmx-chevron-wrap svg {
        color: #E57000;
      }

      /* ─── Expanded palette ─── */
      #pmx-panel {
        display: none;
        flex-direction: column;
        width: 380px;
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04);
      }
      #pmx-panel.open { display: flex; }

      #pmx-header {
        padding: 9px 12px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pmx-palette-header-left {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .pmx-palette-icon {
        color: #E57000;
        display: flex;
        align-items: center;
      }
      .pmx-palette-title {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 10px;
        font-weight: 600;
        color: #c46900;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      .pmx-palette-collapse {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        cursor: pointer;
        color: #555;
        transition: all 0.15s;
      }
      .pmx-palette-collapse:hover {
        background: #2a2a2a;
        color: #888;
      }

      #pmx-snippets {
        padding: 8px 10px;
        border-bottom: 1px solid #2a2a2a;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      #pmx-snippet-select {
        flex: 1;
        min-width: 0;
        background: #111;
        color: #bbb;
        border: 1px solid #2a2a2a;
        border-radius: 10px;
        padding: 6px 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 10px;
        outline: none;
      }
      #pmx-snippet-select:focus {
        border-color: #E57000;
      }
      .pmx-snippet-btn {
        background: transparent;
        color: #888;
        border: 1px solid #2a2a2a;
        border-radius: 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 10px;
        font-weight: 600;
        padding: 6px 10px;
        cursor: pointer;
        letter-spacing: 0.03em;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
        -webkit-appearance: none;
        appearance: none;
      }
      .pmx-snippet-btn:hover {
        color: #bbb;
        border-color: #444;
        background: #222;
      }

      #pmx-textarea {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        resize: none;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
        font-weight: 500;
        color: #bbb;
        padding: 11px 12px;
        height: 140px;
        display: block;
        caret-color: #E57000;
        box-sizing: border-box;
      }
      #pmx-textarea::placeholder {
        color: #444;
      }

      #pmx-footer {
        padding: 8px 10px;
        border-top: 1px solid #2a2a2a;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pmx-kbd {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 9px;
        font-weight: 500;
        color: #555;
        background: #111;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 2px 5px;
        letter-spacing: 0.05em;
      }
      #pmx-send {
        background: #E57000;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 10px;
        font-weight: 600;
        padding: 5px 12px;
        cursor: pointer;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: background 0.15s;
        -webkit-appearance: none;
        appearance: none;
      }
      #pmx-send:hover { background: #f07d00; }
    `;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'pmx-wrap';

    // ── Expanded panel ──
    const panel = document.createElement('div');
    panel.id = 'pmx-panel';

    // Header
    const header = document.createElement('div');
    header.id = 'pmx-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'pmx-palette-header-left';

    const headerIcon = document.createElement('span');
    headerIcon.className = 'pmx-palette-icon';
    headerIcon.innerHTML = CLIP_SVG_SM;

    const headerTitle = document.createElement('span');
    headerTitle.className = 'pmx-palette-title';
    headerTitle.textContent = 'Paste into VM';

    const headerClose = document.createElement('span');
    headerClose.className = 'pmx-palette-collapse';
    headerClose.title = 'Collapse';
    headerClose.innerHTML = CHEV_DOWN;
    headerClose.addEventListener('click', closePanel);

    headerLeft.appendChild(headerIcon);
    headerLeft.appendChild(headerTitle);
    header.appendChild(headerLeft);
    header.appendChild(headerClose);

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.id = 'pmx-textarea';
    textarea.placeholder = 'Paste or type text here...';

    // Snippets
    const snippetsBar = document.createElement('div');
    snippetsBar.id = 'pmx-snippets';

    const snippetSelect = document.createElement('select');
    snippetSelect.id = 'pmx-snippet-select';
    snippetSelect.title = 'Saved snippets';

    const saveSnippetBtn = document.createElement('button');
    saveSnippetBtn.type = 'button';
    saveSnippetBtn.className = 'pmx-snippet-btn';
    saveSnippetBtn.textContent = 'Save';
    saveSnippetBtn.title = 'Save textarea as snippet';

    const deleteSnippetBtn = document.createElement('button');
    deleteSnippetBtn.type = 'button';
    deleteSnippetBtn.className = 'pmx-snippet-btn';
    deleteSnippetBtn.textContent = 'Delete';
    deleteSnippetBtn.title = 'Delete selected snippet';

    snippetsBar.appendChild(snippetSelect);
    snippetsBar.appendChild(saveSnippetBtn);
    snippetsBar.appendChild(deleteSnippetBtn);

    async function refreshSnippets(selectedId) {
      const snippets = (await getSnippets()).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      snippetSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = snippets.length ? 'Snippets…' : 'No snippets saved';
      snippetSelect.appendChild(placeholder);

      for (const s of snippets) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        snippetSelect.appendChild(opt);
      }

      snippetSelect.value = selectedId || '';
      deleteSnippetBtn.disabled = !snippetSelect.value;
      deleteSnippetBtn.style.opacity = deleteSnippetBtn.disabled ? '0.5' : '1';
      deleteSnippetBtn.style.cursor = deleteSnippetBtn.disabled ? 'not-allowed' : 'pointer';
    }

    snippetSelect.addEventListener('change', async () => {
      const id = snippetSelect.value;
      deleteSnippetBtn.disabled = !id;
      deleteSnippetBtn.style.opacity = deleteSnippetBtn.disabled ? '0.5' : '1';
      deleteSnippetBtn.style.cursor = deleteSnippetBtn.disabled ? 'not-allowed' : 'pointer';
      if (!id) return;
      const snippets = await getSnippets();
      const s = snippets.find((x) => x.id === id);
      if (!s) return;
      textarea.value = s.text || '';
      textarea.focus();
      showToast(`✓ Loaded “${s.name}”`);
    });

    saveSnippetBtn.addEventListener('click', async () => {
      const currentText = textarea.value || '';
      if (!currentText.trim()) { showToast('⚠ Nothing to save'); return; }

      const existingId = snippetSelect.value || '';

      // Derive a reasonable default name from the first non-empty line of the snippet
      const firstLine = (currentText.split(/\r?\n/).find((ln) => ln.trim().length) || '').trim();
      const autoName = firstLine || 'Snippet';
      const name = autoName.length > 40 ? `${autoName.slice(0, 37)}…` : autoName;

      const res = await saveSnippet({ id: existingId || undefined, name, text: currentText });
      if (!res.ok) {
        showToast(res.reason === 'no_name' ? '⚠ Name required' : '⚠ Text required');
        return;
      }
      await refreshSnippets(res.id);
      showToast('✓ Snippet saved');
    });

    deleteSnippetBtn.addEventListener('click', async () => {
      const id = snippetSelect.value;
      if (!id) return;
      await deleteSnippet(id);
      await refreshSnippets('');
      showToast('✓ Snippet deleted');
    });

    // Footer
    const footer = document.createElement('div');
    footer.id = 'pmx-footer';

    const shortcut = document.createElement('span');
    shortcut.className = 'pmx-kbd';
    shortcut.textContent = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V';

    const sendBtn = document.createElement('button');
    sendBtn.id = 'pmx-send';
    sendBtn.innerHTML = 'Paste into VM ' + CHEV_RIGHT;
    sendBtn.addEventListener('click', () => {
      const text = textarea.value;
      if (!text) { showToast('⚠ Nothing to paste'); return; }
      showToast(`⏳ Pasting ${text.length} chars...`);
      sendText(canvas, text);
    });

    footer.appendChild(shortcut);
    footer.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(snippetsBar);
    panel.appendChild(textarea);
    panel.appendChild(footer);

    // ── Collapsed pill ──
    const btnRow = document.createElement('div');
    btnRow.id = 'pmx-btns';
    btnRow.title = 'Open paste panel';

    const pasteIconWrap = document.createElement('div');
    pasteIconWrap.className = 'pmx-paste-icon-wrap';
    pasteIconWrap.title = 'Paste clipboard into VM (' + (/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V') + ')';
    pasteIconWrap.innerHTML = CLIP_SVG;
    pasteIconWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      pasteClipboard(canvas);
    });

    const chevronWrap = document.createElement('div');
    chevronWrap.className = 'pmx-chevron-wrap';
    chevronWrap.innerHTML = CHEV_UP;
    chevronWrap.addEventListener('click', openPanel);

    btnRow.appendChild(pasteIconWrap);
    btnRow.appendChild(chevronWrap);

    wrap.appendChild(panel);
    wrap.appendChild(btnRow);
    document.body.appendChild(wrap);
    refreshSnippets('').catch(() => {});

    function openPanel() {
      panel.classList.add('open');
      btnRow.style.display = 'none';
      textarea.focus();
    }

    function closePanel() {
      panel.classList.remove('open');
      btnRow.style.display = 'flex';
    }
  }

  // Keyboard shortcut: native paste (Ctrl+V / Cmd+V)
  function injectHotkey(canvas) {
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const isInPmxTextarea = target && target instanceof HTMLElement && target.id === 'pmx-textarea';
      if (isInPmxTextarea) return; // allow normal paste into the extension textarea

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        pasteClipboard(canvas);
      }
    }, true);
  }

  // Initialize
  function init() {
    if (!isProxmoxConsole()) return;

    waitForCanvas((canvas) => {
      injectButton(canvas);
      injectHotkey(canvas);
      console.log('[PVE Paste Helper] Ready. Use ' + (/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V') + ' or the paste button.');
    });
  }

  // Run on load, and also watch for navigation in SPAs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
