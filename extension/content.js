// PVE Snippets - Content Script
// Injects paste support into PVE noVNC console

(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const AUTO_ENTER_KEY = 'pmx_auto_enter';

  const THEME = {
    bg: '#141414',
    bgPanel: '#1a1a1a',
    border: '#2a2a2a',
    text: '#fff',
    textMuted: '#8a8a8a',
    accent: '#f60',
  };

  // Only activate on pages that look like a PVE (Proxmox VE) noVNC console.
  // Requires PVE-specific URL signals so we don't run on other sites that use noVNC.
  function isProxmoxConsole() {
    const path = window.location.pathname;
    const search = window.location.search;

    const hasNovncPath = path.includes('novnc') || path.includes('vncviewer');
    const hasNovncQuery = search.includes('novnc=1');
    const hasConsoleKvmLxc = search.includes('console=kvm') || search.includes('console=lxc');
    const hasVmid = search.includes('vmid=');
    const hasNode = search.includes('node=');
    const hasPvePath = path.includes('pve');

    // PVE console URLs typically have: console=kvm|lxc, and/or vmid=, node=, and/or novnc path/query
    return (
      (hasConsoleKvmLxc && (hasVmid || hasNode || hasNovncPath || hasNovncQuery)) ||
      (hasVmid && (hasNovncPath || hasNovncQuery || hasNode)) ||
      (hasNode && (hasNovncPath || hasNovncQuery)) ||
      (hasPvePath && hasNovncPath)
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

    const baseOpts = { bubbles: true, cancelable: true };

    if (shift) {
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        ...baseOpts, key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, shiftKey: true
      }));
    }

    const keyEventOpts = {
      ...baseOpts, key: char, code, keyCode, which: keyCode, charCode: keyCode, shiftKey: shift
    };

    canvas.dispatchEvent(new KeyboardEvent('keydown', keyEventOpts));
    canvas.dispatchEvent(new KeyboardEvent('keypress', keyEventOpts));
    canvas.dispatchEvent(new KeyboardEvent('keyup', keyEventOpts));

    if (shift) {
      canvas.dispatchEvent(new KeyboardEvent('keyup', {
        ...baseOpts, key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, shiftKey: false
      }));
    }
  }

  // Release modifier and 'v' on the canvas so the VM is not left with Ctrl/Cmd+V "held"
  // (otherwise the first pasted character can be dropped or interpreted as a shortcut).
  function releasePasteKeys(canvas) {
    const opts = { bubbles: true, cancelable: true };
    canvas.dispatchEvent(new KeyboardEvent('keyup', { ...opts, key: 'v', code: 'KeyV', keyCode: 86, which: 86 }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', { ...opts, key: 'Control', code: 'ControlLeft', keyCode: 17, which: 17, ctrlKey: false }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', { ...opts, key: 'Meta', code: 'MetaLeft', keyCode: 91, which: 91, metaKey: false }));
  }

  // Send text character by character. Release paste keys and delay first char so noVNC is ready.
  const FIRST_CHAR_DELAY_MS = 40;

  function sendEnter(canvas) {
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new KeyboardEvent('keyup',  { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
  }

  function sendText(canvas, text, delay = 20) {
    releasePasteKeys(canvas);
    canvas.focus();
    const normalized = text.replace(/\r\n/g, '\n');
    let i = 0;

    function sendNext() {
      if (i >= normalized.length) {
        storageGet(AUTO_ENTER_KEY).then(function (autoEnter) {
          if (autoEnter) {
            setTimeout(function () { sendEnter(canvas); }, delay);
          }
        });
        showToast('\u2713 Pasted ' + normalized.length + ' characters');
        return;
      }
      const char = normalized[i];
      if (char === '\n' || char === '\r') {
        sendEnter(canvas);
      } else {
        sendChar(canvas, char);
      }
      i++;
      setTimeout(sendNext, delay);
    }
    setTimeout(sendNext, FIRST_CHAR_DELAY_MS);
  }

  // Read clipboard and paste into canvas
  async function pasteClipboard(canvas) {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { showToast('\u26a0 Clipboard is empty'); return; }
      showToast('\u23f3 Pasting ' + text.length + ' chars\u2026');
      sendText(canvas, text);
    } catch (_) {
      showToast('\u26a0 Clipboard blocked \u2014 open panel and paste into the text box');
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
        position: 'fixed', bottom: '80px', right: '20px',
        background: THEME.bgPanel, color: THEME.text,
        border: '1px solid ' + THEME.border, borderRadius: '4px',
        padding: '5px 10px', fontSize: '11px',
        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
        zIndex: '9999999', pointerEvents: 'none',
        opacity: '0', transition: 'opacity 0.2s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  // Storage helpers
  function storageGet(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local.get([key]).then((res) => res[key]);
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(key);
      return Promise.resolve(raw ? JSON.parse(raw) : undefined);
    } catch (_) { return Promise.resolve(undefined); }
  }

  function storageSet(key, value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local.set({ [key]: value });
      }
    } catch (_) {}
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
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
      const newId = 's_' + now + '_' + Math.random().toString(16).slice(2);
      snippets.unshift({ id: newId, name: trimmedName, text: trimmedText, updatedAt: now });
      id = newId;
    }
    await storageSet(SNIPPETS_KEY, snippets.slice(0, 50));
    return { ok: true, id };
  }

  async function deleteSnippet(id) {
    const snippets = await getSnippets();
    await storageSet(SNIPPETS_KEY, snippets.filter((s) => s.id !== id));
  }

  async function reorderSnippets(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const snippets = await getSnippets();
    if (fromIndex < 0 || fromIndex >= snippets.length || toIndex < 0 || toIndex >= snippets.length) return;
    const [item] = snippets.splice(fromIndex, 1);
    snippets.splice(toIndex, 0, item);
    await storageSet(SNIPPETS_KEY, snippets);
  }

  // ─────────────────────────────────────────────────────────────────
  // Inject floating paste button + expandable panel
  // ─────────────────────────────────────────────────────────────────
  function injectButton(canvas) {

    // ── SVG icons ──
    const CLIP_LG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1.5"/></svg>`;
    const CLIP_SM = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1.5"/></svg>`;
    const LIST_SM = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
    const CHEV_DOWN = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const GRIP = `<svg width="10" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`;
    const CHEV_UP   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    const CHEV_R    = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    const PENCIL    = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

    function parseSvg(svgString) {
      const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
      return doc.documentElement;
    }

    // ── CSS (all colors from THEME at top of file) ──
    const CSS = `
      #pmx-wrap {
        position: fixed; bottom: 16px; right: 16px; z-index: 999999;
        font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
        display: flex; flex-direction: column; align-items: flex-end;
        -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
      }
      #pmx-wrap * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

      /* Gap between pill and panel */
      #pmx-panel.open { margin-bottom: 8px; }

      /* ── Collapsed pill ── */
      #pmx-btns {
        display: flex; align-items: center;
        background: ${THEME.bgPanel}; border: 1px solid ${THEME.border}; border-radius: 16px;
        overflow: hidden; cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        transition: border-color 0.15s;
      }
      #pmx-btns:hover { border-color: ${THEME.accent}; }
      #pmx-btns:hover .pmx-pill-icon { background: ${THEME.accent}; }
      .pmx-pill-icon {
        width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
        background: ${THEME.border}; transition: background 0.15s; cursor: pointer;
      }
      .pmx-pill-icon svg { color: ${THEME.accent}; transition: color 0.15s; }
      #pmx-btns:hover .pmx-pill-icon svg { color: ${THEME.text}; }
      .pmx-pill-chev {
        width: 28px; height: 36px; display: flex; align-items: center; justify-content: center;
        border-left: 1px solid ${THEME.border}; cursor: pointer;
      }
      .pmx-pill-chev svg { color: ${THEME.textMuted}; transition: color 0.15s; }
      #pmx-btns:hover .pmx-pill-chev svg { color: ${THEME.accent}; }

      /* ── Panel ── */
      #pmx-panel {
        display: none; flex-direction: column; width: 380px;
        background: ${THEME.bgPanel}; border: 1px solid ${THEME.border}; border-radius: 6px;
        overflow: visible; position: relative;
        box-shadow: 0 20px 48px rgba(0,0,0,0.7);
      }
      #pmx-panel.open { display: flex; }

      /* ── Tab header ── */
      #pmx-header {
        display: flex; align-items: stretch; background: ${THEME.bg};
        border-bottom: 1px solid ${THEME.border}; border-radius: 6px 6px 0 0; overflow: hidden;
      }
      .pmx-tabs { display: flex; align-items: stretch; flex: 1; }
      .pmx-tab {
        flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
        padding: 13px 10px 11px; background: transparent; border: none;
        border-bottom: 2px solid transparent; margin-bottom: -1px;
        font-family: inherit; font-size: 11px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase; color: ${THEME.textMuted};
        cursor: pointer; transition: color 0.15s, border-color 0.15s;
        -webkit-appearance: none; appearance: none;
      }
      .pmx-tab + .pmx-tab { border-left: 1px solid ${THEME.border}; }
      .pmx-tab:hover { color: ${THEME.textMuted}; }
      .pmx-tab.active { color: ${THEME.text}; border-bottom-color: ${THEME.accent}; }
      .pmx-tab svg { color: inherit; }
      .pmx-hdr-close {
        width: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        border-left: 1px solid ${THEME.border}; color: ${THEME.textMuted}; cursor: pointer;
        transition: color 0.15s, background 0.15s;
      }
      .pmx-hdr-close:hover { background: ${THEME.bgPanel}; color: ${THEME.textMuted}; }

      /* ── Views ── */
      .pmx-view { display: none; flex-direction: column; }
      .pmx-view.active { display: flex; }

      /* ── Paste view ── */
      #pmx-textarea {
        width: 100%; background: transparent; border: none; outline: none;
        resize: none; font-family: inherit; font-size: 12px; color: ${THEME.textMuted};
        padding: 11px 12px; height: 120px; display: block; caret-color: ${THEME.accent};
      }
      #pmx-textarea::placeholder { color: ${THEME.textMuted}; }

      #pmx-footer {
        padding: 8px 10px; border-top: 1px solid ${THEME.border};
        display: flex; justify-content: space-between; align-items: center; gap: 6px;
      }
      .pmx-kbd {
        font-size: 9px; font-weight: 500; color: ${THEME.textMuted}; background: ${THEME.bg};
        border: 1px solid ${THEME.border}; border-radius: 4px; padding: 2px 5px;
        letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;
      }
      .pmx-footer-btns { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

      #pmx-save-snip-btn {
        background: transparent; border: 1px solid ${THEME.border}; border-radius: 4px;
        color: ${THEME.textMuted}; font-family: inherit; font-size: 9px; font-weight: 500;
        letter-spacing: 0.08em; padding: 5px 10px; cursor: pointer; white-space: nowrap;
        transition: border-color 0.12s, color 0.12s;
        -webkit-appearance: none; appearance: none;
      }
      #pmx-save-snip-btn:hover,
      #pmx-save-snip-btn.active { border-color: ${THEME.accent}; color: ${THEME.accent}; }

      #pmx-send {
        background: ${THEME.accent}; color: ${THEME.text}; border: none; border-radius: 4px;
        font-family: inherit; font-size: 9px; font-weight: 500; letter-spacing: 0.08em;
        padding: 5px 12px; cursor: pointer; white-space: nowrap;
        display: flex; align-items: center; gap: 5px;
        transition: background 0.12s; -webkit-appearance: none; appearance: none;
      }
      #pmx-send:hover { background: ${THEME.accent}; }

      /* Save bar (slides in below footer) */
      #pmx-save-bar {
        display: none; align-items: center; gap: 6px; padding: 0 10px 10px;
      }
      #pmx-save-bar.open { display: flex; }
      #pmx-save-bar-input {
        flex: 1; min-width: 0; background: ${THEME.bg}; border: 1px solid ${THEME.border};
        border-radius: 4px; font-family: inherit; font-size: 10px; color: ${THEME.textMuted};
        padding: 5px 8px; outline: none; transition: border-color 0.12s;
      }
      #pmx-save-bar-input:focus { border-color: ${THEME.accent}; }
      #pmx-save-bar-input::placeholder { color: ${THEME.textMuted}; }
      #pmx-save-bar-confirm {
        background: ${THEME.accent}; border: none; border-radius: 4px; color: ${THEME.text};
        font-family: inherit; font-size: 9px; font-weight: 500; padding: 5px 10px;
        cursor: pointer; white-space: nowrap; transition: background 0.12s;
        -webkit-appearance: none; appearance: none;
      }
      #pmx-save-bar-confirm:hover { background: ${THEME.accent}; }
      #pmx-save-bar-cancel {
        background: transparent; border: 1px solid ${THEME.border}; border-radius: 4px;
        color: ${THEME.textMuted}; font-family: inherit; font-size: 9px; padding: 5px 8px;
        cursor: pointer; transition: border-color 0.12s, color 0.12s;
        -webkit-appearance: none; appearance: none;
      }
      #pmx-save-bar-cancel:hover { border-color: ${THEME.textMuted}; color: ${THEME.textMuted}; }

      /* ── Snippets view ── */
      .pmx-snip-scroll {
        max-height: 240px; overflow-y: auto; padding: 8px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .pmx-snip-scroll::-webkit-scrollbar { width: 4px; }
      .pmx-snip-scroll::-webkit-scrollbar-track { background: transparent; }
      .pmx-snip-scroll::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 2px; }

      .pmx-snip-row {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px;
        border-radius: 4px; border: 1px solid ${THEME.border}; background: ${THEME.bg};
        position: relative; transition: border-color 0.12s, background 0.12s;
      }
      .pmx-snip-row:hover { border-color: ${THEME.border}; background: ${THEME.bgPanel}; }
      .pmx-snip-row.editing { border-color: ${THEME.accent}; background: ${THEME.bgPanel}; }
      .pmx-snip-row.dragging { opacity: 0.5; }
      .pmx-snip-row.drag-over { border-color: ${THEME.accent}; background: ${THEME.bgPanel}; }
      .pmx-snip-row .pmx-snip-drag-handle { cursor: grab; color: ${THEME.textMuted}; flex-shrink: 0; }
      .pmx-snip-row .pmx-snip-drag-handle:active { cursor: grabbing; }

      .pmx-snip-info { flex: 1; min-width: 0; }
      .pmx-snip-name {
        font-size: 10px; color: ${THEME.accent}; letter-spacing: 0.08em;
        text-transform: uppercase; margin-bottom: 3px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pmx-snip-preview {
        font-size: 10px; color: ${THEME.textMuted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      .pmx-snip-actions {
        flex-shrink: 0; width: max-content; min-width: 0;
        display: flex; align-items: center; gap: 4px;
      }
      .pmx-snip-actions-extra {
        display: flex; align-items: center; gap: 4px;
        opacity: 0; transition: opacity 0.12s;
      }
      .pmx-snip-row:hover .pmx-snip-actions-extra,
      .pmx-snip-row.editing .pmx-snip-actions-extra { opacity: 1; }

      /* Scoped so host page button styles don't override; same height for all */
      #pmx-wrap .pmx-snip-send,
      #pmx-wrap .pmx-snip-edit,
      #pmx-wrap .pmx-snip-del {
        height: 24px; min-height: 24px; box-sizing: border-box;
        display: inline-flex; align-items: center; justify-content: center;
        flex: 0 0 auto !important; width: max-content !important; max-width: max-content !important;
        min-width: 0;
        -webkit-appearance: none; appearance: none;
      }
      #pmx-wrap .pmx-snip-send {
        background: ${THEME.accent}; border: none; border-radius: 4px; color: ${THEME.text};
        font-family: inherit; font-size: 9px; padding: 0 9px;
        cursor: pointer; white-space: nowrap; transition: background 0.12s;
      }
      #pmx-wrap .pmx-snip-send:hover { background: ${THEME.accent}; }

      #pmx-wrap .pmx-snip-edit {
        background: transparent; border: 1px solid ${THEME.border}; border-radius: 3px;
        color: ${THEME.textMuted}; cursor: pointer; padding: 0;
        width: 24px !important; min-width: 24px !important; max-width: 24px !important;
        transition: border-color 0.12s, color 0.12s;
      }
      #pmx-wrap .pmx-snip-edit svg { width: 9px; height: 9px; }
      #pmx-wrap .pmx-snip-edit:hover,
      #pmx-wrap .pmx-snip-edit.active { border-color: ${THEME.accent}; color: ${THEME.accent}; }

      #pmx-wrap .pmx-snip-del {
        background: transparent; border: none; color: ${THEME.textMuted};
        cursor: pointer; font-size: 14px; padding: 0; line-height: 1;
        width: 28px !important; min-width: 28px !important; max-width: 28px !important;
        height: 28px !important; min-height: 28px !important;
        transition: color 0.12s;
      }
      #pmx-wrap .pmx-snip-del:hover { color: ${THEME.accent}; }

      .pmx-snip-empty {
        padding: 24px 12px; text-align: center; font-size: 10px; color: ${THEME.textMuted}; line-height: 1.7;
      }

      .pmx-snip-footer {
        padding: 9px 12px; border-top: 1px solid ${THEME.border};
        background: ${THEME.bg}; border-radius: 0 0 6px 6px;
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        flex-wrap: nowrap;
      }
      .pmx-snip-footer-inner { min-width: 0; overflow: hidden; }
      .pmx-snip-hint { font-size: 9px; color: ${THEME.textMuted}; letter-spacing: 0.08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pmx-snip-hint span { color: ${THEME.textMuted}; }
      #pmx-wrap .pmx-snip-new-btn {
        flex-shrink: 0; margin-left: auto; background: ${THEME.accent}; border: none; border-radius: 4px; color: ${THEME.text};
        font-size: 11px; font-weight: 600; padding: 7px 12px; cursor: pointer; white-space: nowrap;
        transition: background 0.12s, box-shadow 0.12s; -webkit-appearance: none; appearance: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      #pmx-wrap .pmx-snip-new-btn:hover { background: ${THEME.accent}; box-shadow: 0 2px 6px rgba(245,102,0,0.35); }

      /* ── Edit popover (absolute, relative to #pmx-panel), fixed position ── */
      #pmx-edit-pop {
        display: none; position: absolute; right: calc(100% + 10px); top: 52px;
        width: 240px; background: ${THEME.bgPanel}; border: 1px solid ${THEME.accent};
        border-radius: 6px; overflow: hidden; z-index: 20;
        box-shadow: 0 12px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,102,0,0.1);
      }
      #pmx-edit-pop.open { display: block; animation: pmxPopIn 0.15s ease; }

      @keyframes pmxPopIn {
        from { opacity: 0; transform: translateX(6px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      .pmx-pop-hdr {
        padding: 8px 11px; border-bottom: 1px solid ${THEME.border}; background: ${THEME.bg};
        display: flex; align-items: center; justify-content: space-between;
      }
      .pmx-pop-title { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: ${THEME.accent}; }
      #pmx-wrap .pmx-pop-x {
        background: transparent; border: none; color: ${THEME.textMuted}; cursor: pointer;
        font-size: 13px; line-height: 1; padding: 0 2px; transition: color 0.12s;
        flex: 0 0 auto !important; width: max-content !important; max-width: max-content !important;
        min-width: 0; box-sizing: border-box;
        -webkit-appearance: none; appearance: none;
      }
      #pmx-wrap .pmx-pop-x:hover { color: ${THEME.textMuted}; }

      .pmx-pop-body { padding: 10px; display: flex; flex-direction: column; gap: 7px; }
      .pmx-field-lbl {
        font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: ${THEME.textMuted}; margin-bottom: 4px;
      }
      .pmx-field-in {
        width: 100%; background: ${THEME.bg}; border: 1px solid ${THEME.border}; border-radius: 4px;
        font-family: inherit; font-size: 11px; color: ${THEME.textMuted}; padding: 6px 9px;
        outline: none; transition: border-color 0.12s;
      }
      .pmx-field-in:focus { border-color: ${THEME.accent}; }
      .pmx-field-ta {
        width: 100%; background: ${THEME.bg}; border: 1px solid ${THEME.border}; border-radius: 4px;
        font-family: inherit; font-size: 11px; color: ${THEME.textMuted}; padding: 7px 9px;
        outline: none; resize: none; height: 72px; line-height: 1.5;
        transition: border-color 0.12s;
      }
      .pmx-field-ta:focus { border-color: ${THEME.accent}; }

      .pmx-pop-ftr {
        padding: 8px 10px; border-top: 1px solid ${THEME.border}; background: ${THEME.bg};
        display: flex; justify-content: flex-end; gap: 6px;
      }
      .pmx-pop-cancel {
        background: transparent; border: 1px solid ${THEME.border}; border-radius: 4px;
        color: ${THEME.textMuted}; font-family: inherit; font-size: 9px; padding: 5px 10px;
        cursor: pointer; transition: border-color 0.12s, color 0.12s;
        -webkit-appearance: none; appearance: none;
      }
      .pmx-pop-cancel:hover { border-color: ${THEME.textMuted}; color: ${THEME.textMuted}; }
      .pmx-pop-save {
        background: ${THEME.accent}; border: none; border-radius: 4px; color: ${THEME.text};
        font-family: inherit; font-size: 9px; font-weight: 500; padding: 5px 12px;
        cursor: pointer; transition: background 0.12s;
        -webkit-appearance: none; appearance: none;
      }
      .pmx-pop-save:hover { background: ${THEME.accent}; }
    `;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const shortcutLabel = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '\u2318V' : 'Ctrl+V';

    // ── Outer wrapper ──
    const wrap = document.createElement('div');
    wrap.id = 'pmx-wrap';

    // ── Panel ──
    const panel = document.createElement('div');
    panel.id = 'pmx-panel';

    // ── Header / tabs ──
    const header = document.createElement('div');
    header.id = 'pmx-header';

    const tabs = document.createElement('div');
    tabs.className = 'pmx-tabs';

    const pasteTab = document.createElement('button');
    pasteTab.type = 'button';
    pasteTab.className = 'pmx-tab active';
    pasteTab.appendChild(parseSvg(CLIP_SM));
    pasteTab.appendChild(document.createTextNode(' Paste'));

    const snipsTab = document.createElement('button');
    snipsTab.type = 'button';
    snipsTab.className = 'pmx-tab';
    snipsTab.appendChild(parseSvg(LIST_SM));
    snipsTab.appendChild(document.createTextNode(' Snippets'));

    const hdrClose = document.createElement('span');
    hdrClose.className = 'pmx-hdr-close';
    hdrClose.title = 'Collapse';
    hdrClose.appendChild(parseSvg(CHEV_DOWN));

    tabs.appendChild(pasteTab);
    tabs.appendChild(snipsTab);
    header.appendChild(tabs);
    header.appendChild(hdrClose);

    // ── Paste view ──
    const pasteView = document.createElement('div');
    pasteView.className = 'pmx-view active';
    pasteView.id = 'pmx-paste-view';

    const textarea = document.createElement('textarea');
    textarea.id = 'pmx-textarea';
    textarea.placeholder = 'Paste or type text here\u2026';

    const footer = document.createElement('div');
    footer.id = 'pmx-footer';

    const kbdHint = document.createElement('span');
    kbdHint.className = 'pmx-kbd';
    kbdHint.textContent = shortcutLabel;

    const footerBtns = document.createElement('div');
    footerBtns.className = 'pmx-footer-btns';

    const saveSnipBtn = document.createElement('button');
    saveSnipBtn.type = 'button';
    saveSnipBtn.id = 'pmx-save-snip-btn';
    saveSnipBtn.textContent = 'Save as Snippet';

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.id = 'pmx-send';
    sendBtn.appendChild(document.createTextNode('Paste into VM '));
    sendBtn.appendChild(parseSvg(CHEV_R));

    footerBtns.appendChild(saveSnipBtn);
    footerBtns.appendChild(sendBtn);
    footer.appendChild(kbdHint);
    footer.appendChild(footerBtns);

    // Save bar
    const saveBar = document.createElement('div');
    saveBar.id = 'pmx-save-bar';

    const saveBarInput = document.createElement('input');
    saveBarInput.type = 'text';
    saveBarInput.id = 'pmx-save-bar-input';
    saveBarInput.placeholder = 'Name this snippet\u2026';

    const saveBarConfirm = document.createElement('button');
    saveBarConfirm.type = 'button';
    saveBarConfirm.id = 'pmx-save-bar-confirm';
    saveBarConfirm.textContent = 'Save';

    const saveBarCancel = document.createElement('button');
    saveBarCancel.type = 'button';
    saveBarCancel.id = 'pmx-save-bar-cancel';
    saveBarCancel.textContent = 'Cancel';

    saveBar.appendChild(saveBarInput);
    saveBar.appendChild(saveBarConfirm);
    saveBar.appendChild(saveBarCancel);

    pasteView.appendChild(textarea);
    pasteView.appendChild(footer);
    pasteView.appendChild(saveBar);

    // ── Save bar logic ──
    function openSaveBar() {
      saveBar.classList.add('open');
      saveSnipBtn.classList.add('active');
      saveBarInput.focus();
    }
    function closeSaveBar() {
      saveBar.classList.remove('open');
      saveSnipBtn.classList.remove('active');
      saveBarInput.value = '';
    }

    saveSnipBtn.addEventListener('click', () => {
      saveBar.classList.contains('open') ? closeSaveBar() : openSaveBar();
    });

    saveBarConfirm.addEventListener('click', async () => {
      const text = textarea.value;
      if (!text.trim()) { showToast('\u26a0 Nothing to save'); return; }
      const firstLine = (text.split(/\r?\n/).find((ln) => ln.trim().length) || '').trim();
      const auto = firstLine.length > 40 ? firstLine.slice(0, 37) + '\u2026' : firstLine;
      const name = (saveBarInput.value.trim()) || auto || 'Snippet';
      const res = await saveSnippet({ name, text });
      if (!res.ok) { showToast('\u26a0 Could not save'); return; }
      closeSaveBar();
      showToast('\u2713 Snippet saved');
    });
    saveBarCancel.addEventListener('click', closeSaveBar);
    saveBarInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveBarConfirm.click(); }
      if (e.key === 'Escape') closeSaveBar();
    });

    sendBtn.addEventListener('click', () => {
      const text = textarea.value;
      if (!text) { showToast('\u26a0 Nothing to paste'); return; }
      showToast('\u23f3 Pasting ' + text.length + ' chars\u2026');
      sendText(canvas, text);
    });

    // ── Snippets view ──
    const snipsView = document.createElement('div');
    snipsView.className = 'pmx-view';
    snipsView.id = 'pmx-snips-view';

    const snipsScroll = document.createElement('div');
    snipsScroll.className = 'pmx-snip-scroll';

    const snipsFooter = document.createElement('div');
    snipsFooter.className = 'pmx-snip-footer';
    const snipsFooterInner = document.createElement('div');
    snipsFooterInner.className = 'pmx-snip-footer-inner';
    const snipHintSpan = document.createElement('span');
    snipHintSpan.className = 'pmx-snip-hint';
    snipHintSpan.textContent = 'Drag to reorder snippets';
    snipsFooterInner.appendChild(snipHintSpan);
    const newSnipBtn = document.createElement('button');
    newSnipBtn.type = 'button';
    newSnipBtn.className = 'pmx-snip-new-btn';
    newSnipBtn.textContent = '+ New snippet';
    snipsFooter.appendChild(snipsFooterInner);
    snipsFooter.appendChild(newSnipBtn);

    snipsView.appendChild(snipsScroll);
    snipsView.appendChild(snipsFooter);

    // ── Edit popover (child of panel, positioned absolutely) ──
    const editPop = document.createElement('div');
    editPop.id = 'pmx-edit-pop';

    const popHdr = document.createElement('div');
    popHdr.className = 'pmx-pop-hdr';
    const popTitle = document.createElement('span');
    popTitle.className = 'pmx-pop-title';
    popTitle.id = 'pmx-edit-pop-title';
    const popX = document.createElement('button');
    popX.type = 'button';
    popX.className = 'pmx-pop-x';
    popX.textContent = '\u2715';
    popHdr.appendChild(popTitle);
    popHdr.appendChild(popX);

    const popBody = document.createElement('div');
    popBody.className = 'pmx-pop-body';

    const nameField = document.createElement('div');
    const nameLbl = document.createElement('div');
    nameLbl.className = 'pmx-field-lbl';
    nameLbl.textContent = 'Name';
    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.className = 'pmx-field-in';
    nameField.appendChild(nameLbl);
    nameField.appendChild(nameIn);

    const contentField = document.createElement('div');
    const contentLbl = document.createElement('div');
    contentLbl.className = 'pmx-field-lbl';
    contentLbl.textContent = 'Content';
    const contentTa = document.createElement('textarea');
    contentTa.className = 'pmx-field-ta';
    contentField.appendChild(contentLbl);
    contentField.appendChild(contentTa);

    popBody.appendChild(nameField);
    popBody.appendChild(contentField);

    const popFtr = document.createElement('div');
    popFtr.className = 'pmx-pop-ftr';
    const popCancel = document.createElement('button');
    popCancel.type = 'button';
    popCancel.className = 'pmx-pop-cancel';
    popCancel.textContent = 'Cancel';
    const popSave = document.createElement('button');
    popSave.type = 'button';
    popSave.className = 'pmx-pop-save';
    popSave.textContent = 'Save changes';
    popFtr.appendChild(popCancel);
    popFtr.appendChild(popSave);

    editPop.appendChild(popHdr);
    editPop.appendChild(popBody);
    editPop.appendChild(popFtr);

    // ── Popover state ──
    let editingId = null;
    let editingRow = null;
    let editingPencil = null;

    function openPopover(snippet, rowEl, pencilEl) {
      if (editingRow) {
        editingRow.classList.remove('editing');
        if (editingPencil) editingPencil.classList.remove('active');
      }
      editingId     = snippet.id;
      editingRow    = rowEl;
      editingPencil = pencilEl;
      rowEl.classList.add('editing');
      pencilEl.classList.add('active');
      nameIn.value    = snippet.name || '';
      contentTa.value = snippet.text || '';
      popTitle.textContent = 'Edit Snippet';

      editPop.classList.add('open');
      setTimeout(() => nameIn.focus(), 40);
    }

    function openPopoverForNew() {
      if (editingRow) {
        editingRow.classList.remove('editing');
        if (editingPencil) editingPencil.classList.remove('active');
      }
      editingId = editingRow = editingPencil = null;
      nameIn.value = '';
      contentTa.value = '';
      popTitle.textContent = 'New Snippet';

      editPop.classList.add('open');
      setTimeout(() => nameIn.focus(), 40);
    }

    newSnipBtn.addEventListener('click', openPopoverForNew);

    function closePopover() {
      editPop.classList.remove('open');
      if (editingRow)    editingRow.classList.remove('editing');
      if (editingPencil) editingPencil.classList.remove('active');
      editingId = editingRow = editingPencil = null;
    }

    popX.addEventListener('click', closePopover);
    popCancel.addEventListener('click', closePopover);
    popSave.addEventListener('click', async () => {
      const name = nameIn.value.trim();
      const text = contentTa.value;
      if (!name) { showToast('\u26a0 Name required'); return; }
      if (!text.trim()) { showToast('\u26a0 Content required'); return; }
      if (editingId) {
        await saveSnippet({ id: editingId, name, text });
        showToast('\u2713 Snippet updated');
      } else {
        await saveSnippet({ name, text });
        showToast('\u2713 Snippet added');
      }
      closePopover();
      await renderSnippets();
    });
    nameIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); contentTa.focus(); }
      if (e.key === 'Escape') closePopover();
    });
    contentTa.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopover();
    });

    // Close popover on outside click (ignore click on the button that opened it)
    document.addEventListener('click', (e) => {
      if (!editPop.classList.contains('open')) return;
      const target = e.target;
      const clickedOpener = editingRow ? editingRow.contains(target) : newSnipBtn.contains(target);
      if (!editPop.contains(target) && !clickedOpener) closePopover();
    });

    // ── Render snippets list ──
    async function renderSnippets() {
      const snippets = await getSnippets();
      while (snipsScroll.firstChild) snipsScroll.removeChild(snipsScroll.firstChild);

      if (snippets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pmx-snip-empty';
        empty.textContent = 'No snippets yet. Click \u201c+ New snippet\u201d below or use the Paste tab to save from clipboard.';
        snipsScroll.appendChild(empty);
        return;
      }

      for (let i = 0; i < snippets.length; i++) {
        const s = snippets[i];
        const row = document.createElement('div');
        row.className = 'pmx-snip-row';
        row.dataset.snippetIndex = String(i);
        row.dataset.snippetId = s.id;

        const dragHandle = document.createElement('div');
        dragHandle.className = 'pmx-snip-drag-handle';
        dragHandle.appendChild(parseSvg(GRIP));
        dragHandle.title = 'Drag to reorder';
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', String(i));
          e.dataTransfer.effectAllowed = 'move';
          row.classList.add('dragging');
        });
        dragHandle.addEventListener('dragend', () => {
          snipsScroll.querySelectorAll('.pmx-snip-row').forEach((r) => {
            r.classList.remove('dragging');
            r.classList.remove('drag-over');
          });
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!row.classList.contains('dragging')) row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', (e) => {
          if (!row.contains(e.relatedTarget)) row.classList.remove('drag-over');
        });
        row.addEventListener('drop', async (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
          const toIndex = parseInt(row.dataset.snippetIndex, 10);
          if (fromIndex === toIndex) return;
          await reorderSnippets(fromIndex, toIndex);
          await renderSnippets();
        });

        const info = document.createElement('div');
        info.className = 'pmx-snip-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'pmx-snip-name';
        nameEl.textContent = s.name || 'Unnamed';
        const preview = document.createElement('div');
        preview.className = 'pmx-snip-preview';
        const previewText = (s.text || '').replace(/\r?\n/g, ' ').trim();
        preview.textContent = previewText.length > 52 ? previewText.slice(0, 49) + '\u2026' : previewText;
        info.appendChild(nameEl);
        info.appendChild(preview);

        const actions = document.createElement('div');
        actions.className = 'pmx-snip-actions';

        const sendEl = document.createElement('button');
        sendEl.type = 'button';
        sendEl.className = 'pmx-snip-send';
        sendEl.textContent = 'Send';
        sendEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!s.text) return;
          showToast('\u23f3 Pasting ' + s.text.length + ' chars\u2026');
          sendText(canvas, s.text);
        });

        const editEl = document.createElement('button');
        editEl.type = 'button';
        editEl.className = 'pmx-snip-edit';
        editEl.title = 'Edit';
        editEl.appendChild(parseSvg(PENCIL));
        editEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (editingId === s.id) {
            closePopover();
          } else {
            openPopover(s, row, editEl);
          }
        });

        const delEl = document.createElement('button');
        delEl.type = 'button';
        delEl.className = 'pmx-snip-del';
        delEl.title = 'Delete';
        delEl.textContent = '\u2715';
        delEl.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (editingId === s.id) closePopover();
          await deleteSnippet(s.id);
          await renderSnippets();
          showToast('Snippet deleted');
        });

        const actionsExtra = document.createElement('div');
        actionsExtra.className = 'pmx-snip-actions-extra';
        actionsExtra.appendChild(delEl);
        actionsExtra.appendChild(editEl);
        actions.appendChild(actionsExtra);
        actions.appendChild(sendEl);
        row.appendChild(dragHandle);
        row.appendChild(info);
        row.appendChild(actions);
        snipsScroll.appendChild(row);
      }
    }

    // ── Tab switching ──
    function setTab(tab) {
      const isPaste = tab === 'paste';
      pasteTab.classList.toggle('active', isPaste);
      snipsTab.classList.toggle('active', !isPaste);
      pasteView.classList.toggle('active', isPaste);
      snipsView.classList.toggle('active', !isPaste);
      if (isPaste) textarea.focus();
      else renderSnippets();
    }

    pasteTab.addEventListener('click', () => setTab('paste'));
    snipsTab.addEventListener('click', () => setTab('snippets'));

    // ── Collapsed pill ──
    const btnRow = document.createElement('div');
    btnRow.id = 'pmx-btns';
    btnRow.title = 'Open paste panel';

    const pillIcon = document.createElement('div');
    pillIcon.className = 'pmx-pill-icon';
    pillIcon.title = 'Paste clipboard into VM (' + shortcutLabel + ')';
    pillIcon.appendChild(parseSvg(CLIP_LG));
    pillIcon.addEventListener('click', (e) => { e.stopPropagation(); pasteClipboard(canvas); });

    const pillChev = document.createElement('div');
    pillChev.className = 'pmx-pill-chev';
    pillChev.appendChild(parseSvg(CHEV_UP));
    pillChev.addEventListener('click', (e) => { e.stopPropagation(); openPanel(); });

    btnRow.appendChild(pillIcon);
    btnRow.appendChild(pillChev);

    // ── Assemble ──
    panel.appendChild(header);
    panel.appendChild(pasteView);
    panel.appendChild(snipsView);
    panel.appendChild(editPop); // sibling of views, positioned absolute within panel

    wrap.appendChild(panel);
    wrap.appendChild(btnRow);
    document.body.appendChild(wrap);

    // ── Panel open / close ──
    function openPanel() {
      panel.classList.add('open');
      setTab('paste');
      btnRow.style.display = 'none';
    }

    function closePanel() {
      panel.classList.remove('open');
      btnRow.style.display = 'flex';
      closePopover();
      closeSaveBar();
    }

    hdrClose.addEventListener('click', closePanel);
  }

  // Keyboard shortcut: native paste (Ctrl+V / Cmd+V)
  function injectHotkey(canvas) {
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.id === 'pmx-textarea' || target.id === 'pmx-save-bar-input' || target.classList.contains('pmx-field-in') || target.classList.contains('pmx-field-ta'))) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        pasteClipboard(canvas);
      }
    }, true);
  }

  // Insert text into a focused input, textarea, or contenteditable (for popup paste on any page).
  function pasteIntoFocusedElement(text) {
    const el = document.activeElement;
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName && el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      const start = el.selectionStart != null ? el.selectionStart : el.value.length;
      const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
      const before = (el.value || '').slice(0, start);
      const after = (el.value || '').slice(end);
      el.value = before + text + after;
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      document.execCommand('insertText', false, text);
      return true;
    }
    return false;
  }

  // Handle messages from popup: paste text into the page (canvas for noVNC, or focused input/textarea).
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
      if (msg.action !== 'paste' && msg.action !== 'sendText') return;
      const text = msg.action === 'sendText' && typeof msg.text === 'string' ? msg.text : null;
      if (msg.action === 'sendText' && !text) {
        sendResponse({ ok: false, error: 'No text to paste.' });
        return false;
      }

      function tryHandle() {
        const canvas = document.querySelector('canvas');
        if (canvas && msg.action === 'sendText') {
          sendText(canvas, text);
          sendResponse({ ok: true });
          return true;
        }
        if (canvas && msg.action === 'paste') {
          pasteClipboard(canvas).then(function () {
            sendResponse({ ok: true });
          }).catch(function () {
            sendResponse({ ok: false, error: 'Clipboard access denied or empty.' });
          });
          return true;
        }
        if (msg.action === 'sendText' && pasteIntoFocusedElement(text)) {
          sendResponse({ ok: true });
          return true;
        }
        return false;
      }

      if (tryHandle()) return false;
      // Canvas may appear after a short delay (noVNC); give the frame one retry
      setTimeout(function () {
        if (tryHandle()) return;
        sendResponse({ ok: false, error: 'No target to paste into. Focus a noVNC console or a text field in the tab.' });
      }, 150);
      return true;
    });
  }

  // Initialize
  function init() {
    if (!isProxmoxConsole()) return;
    waitForCanvas((canvas) => {
      injectButton(canvas);
      injectHotkey(canvas);
      console.log('[PVE Snippets] Ready. Use ' + (/Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '\u2318V' : 'Ctrl+V') + ' or the paste button.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
