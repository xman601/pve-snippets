// Proxmox Paste Helper - Content Script
// Injects paste support into Proxmox noVNC console

(function () {
  'use strict';

  // Only activate on pages that look like a Proxmox noVNC console
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

  // Send a single character to the noVNC canvas using keyboard events
  function sendChar(canvas, char) {
    const keyCode = char.charCodeAt(0);

    const keydown = new KeyboardEvent('keydown', {
      key: char,
      code: 'Key' + char.toUpperCase(),
      keyCode: keyCode,
      which: keyCode,
      charCode: keyCode,
      bubbles: true,
      cancelable: true
    });

    const keypress = new KeyboardEvent('keypress', {
      key: char,
      code: 'Key' + char.toUpperCase(),
      keyCode: keyCode,
      which: keyCode,
      charCode: keyCode,
      bubbles: true,
      cancelable: true
    });

    const keyup = new KeyboardEvent('keyup', {
      key: char,
      code: 'Key' + char.toUpperCase(),
      keyCode: keyCode,
      which: keyCode,
      charCode: keyCode,
      bubbles: true,
      cancelable: true
    });

    canvas.dispatchEvent(keydown);
    canvas.dispatchEvent(keypress);
    canvas.dispatchEvent(keyup);
  }

  // Send text character by character with a small delay
  // noVNC can miss characters if sent too fast
  function sendText(canvas, text, delay = 30) {
    canvas.focus();
    let i = 0;

    function sendNext() {
      if (i >= text.length) {
        showToast(`✓ Pasted ${text.length} characters`);
        return;
      }

      const char = text[i];

      // Handle newline as Enter key
      if (char === '\n' || char === '\r') {
        const enterDown = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        const enterUp = new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        canvas.dispatchEvent(enterDown);
        canvas.dispatchEvent(enterUp);
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
      // Fallback: show a prompt dialog if clipboard API is denied
      const text = prompt('Clipboard access denied. Paste your text here:');
      if (text) {
        showToast(`⏳ Pasting ${text.length} chars...`);
        sendText(canvas, text);
      }
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

  // Inject floating paste button + expandable text panel
  function injectButton(canvas) {
    const CSS = `
      #pmx-wrap {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        font-family: monospace;
      }
      #pmx-panel {
        background: #2a2a2a;
        border: 1px solid #ffffff;
        border-radius: 6px;
        padding: 8px;
        display: none;
        flex-direction: column;
        gap: 6px;
        width: 180px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      }
      #pmx-panel.open { display: flex; }
      #pmx-textarea {
        width: 100%;
        height: 70px;
        background: #1a1a1a;
        color: #ffffff;
        border: 1px solid #555555;
        border-radius: 4px;
        padding: 5px 6px;
        font-family: monospace;
        font-size: 11px;
        resize: vertical;
        outline: none;
        box-sizing: border-box;
      }
      #pmx-textarea:focus { border-color: #ffffff; }
      #pmx-send {
        align-self: flex-end;
        background: #ffffff;
        color: #1a1a1a;
        border: none;
        border-radius: 4px;
        padding: 3px 10px;
        font-family: monospace;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
      }
      #pmx-send:hover { background: #cccccc; }
      #pmx-btns {
        display: flex;
        border: 1px solid #ffffff;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      }
      .pmx-btn {
        background: #2a2a2a;
        color: #ffffff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .pmx-btn:hover { background: #ffffff; color: #1a1a1a; }
      #pmx-icon-btn { padding: 8px 4px; }
      #pmx-chevron-btn {
        padding: 8px 4px;
        border-left: 1px solid #ffffff;
      }
    `;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'pmx-wrap';

    // Expandable panel
    const panel = document.createElement('div');
    panel.id = 'pmx-panel';

    const textarea = document.createElement('textarea');
    textarea.id = 'pmx-textarea';
    textarea.placeholder = 'Paste or type text here…';

    const sendBtn = document.createElement('button');
    sendBtn.id = 'pmx-send';
    sendBtn.textContent = 'Paste into VM';
    sendBtn.addEventListener('click', () => {
      const text = textarea.value;
      if (!text) { showToast('⚠ Nothing to paste'); return; }
      showToast(`⏳ Pasting ${text.length} chars...`);
      sendText(canvas, text);
    });

    panel.appendChild(textarea);
    panel.appendChild(sendBtn);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.id = 'pmx-btns';

    // Clipboard icon button — pastes from clipboard immediately
    const iconBtn = document.createElement('button');
    iconBtn.id = 'pmx-icon-btn';
    iconBtn.className = 'pmx-btn';
    iconBtn.title = 'Paste clipboard into VM (Ctrl+Shift+V)';
    iconBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>`;
    iconBtn.addEventListener('click', () => pasteClipboard(canvas));

    // Chevron button — toggles the text panel
    const chevronBtn = document.createElement('button');
    chevronBtn.id = 'pmx-chevron-btn';
    chevronBtn.className = 'pmx-btn';
    chevronBtn.title = 'Open paste panel';
    chevronBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;

    let panelOpen = false;
    chevronBtn.addEventListener('click', () => {
      panelOpen = !panelOpen;
      panel.classList.toggle('open', panelOpen);
      // Flip chevron when open
      chevronBtn.querySelector('svg').style.transform = panelOpen ? 'rotate(180deg)' : '';
      if (panelOpen) textarea.focus();
    });

    btnRow.appendChild(iconBtn);
    btnRow.appendChild(chevronBtn);

    wrap.appendChild(panel);
    wrap.appendChild(btnRow);
    document.body.appendChild(wrap);
  }

  // Keyboard shortcut: Ctrl+Shift+V
  function injectHotkey(canvas) {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
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
      console.log('[Proxmox Paste Helper] Ready. Use Ctrl+Shift+V or the paste button.');
    });
  }

  // Run on load, and also watch for navigation in SPAs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
