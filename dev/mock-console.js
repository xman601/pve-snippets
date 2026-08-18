// PVE Snippets - Mock console dev tool
// Fakes just enough of a PVE noVNC console for content.js to attach to, plus a
// "simulated guest keyboard layout" that decodes keystrokes the way a real VM would,
// so the keyboard-layout feature can be verified without a real Proxmox server.
(function () {
  'use strict';

  const MODIFIER_CODES = new Set([
    'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight',
    'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight'
  ]);

  // KEYBOARD_LAYOUTS comes from ../extension/keyboard-layouts.js — the same table the
  // extension ships, so this tool can't silently drift from what's actually sent.
  const inverseLayouts = {};
  Object.keys(KEYBOARD_LAYOUTS).forEach(function (name) {
    const table = KEYBOARD_LAYOUTS[name];
    const inverse = {};
    Object.keys(table).forEach(function (ch) {
      if (ch === '\r') return; // '\n' already covers the Enter slot
      const entry = table[ch];
      const key = entry.code + '|' + Boolean(entry.shift) + '|' + Boolean(entry.altGr);
      inverse[key] = ch;
    });
    inverseLayouts[name] = inverse;
  });

  const canvas = document.getElementById('fake-canvas');
  const guestLayoutSelect = document.getElementById('guest-layout');
  const strictModeCheckbox = document.getElementById('strict-mode');
  const vmScreen = document.getElementById('vm-screen');
  const eventLog = document.getElementById('event-log');
  const clearBtn = document.getElementById('clear-btn');

  function drawPlaceholder() {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4a4a4a';
    ctx.font = '14px monospace';
    ctx.fillText('PVE Snippets — Mock Console (dev only)', 16, 28);
    ctx.fillText('Click here, then use the extension to paste.', 16, 48);
  }
  drawPlaceholder();

  function logEvent(e) {
    const row = document.createElement('div');
    row.textContent = 'code=' + e.code + ' key=' + JSON.stringify(e.key) +
      ' shift=' + e.shiftKey + ' alt=' + e.altKey;
    eventLog.appendChild(row);
    eventLog.scrollTop = eventLog.scrollHeight;
  }

  function resolveChar(e) {
    if (strictModeCheckbox.checked) {
      const table = inverseLayouts[guestLayoutSelect.value] || inverseLayouts.us;
      const key = e.code + '|' + Boolean(e.shiftKey) + '|' + Boolean(e.altKey);
      return table[key]; // undefined if this guest layout can't produce it from that physical key
    }
    if (e.key === 'Enter') return '\n';
    return e.key && e.key.length === 1 ? e.key : undefined;
  }

  canvas.addEventListener('keydown', function (e) {
    if (e.isTrusted) return; // ignore real typing/shortcuts; only decode what the extension sends
    if (MODIFIER_CODES.has(e.code)) return;
    logEvent(e);
    const ch = resolveChar(e);
    vmScreen.textContent += ch !== undefined ? ch : '░'; // shaded block = "couldn't resolve"
    vmScreen.scrollTop = vmScreen.scrollHeight;
  });

  clearBtn.addEventListener('click', function () {
    vmScreen.textContent = '';
    eventLog.textContent = '';
  });
})();
