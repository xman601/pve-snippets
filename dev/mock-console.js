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
  // Each layout gets two inverse maps: `single` for ordinary one-keystroke characters, and
  // `dead` for characters composed from a dead key ([deadKeystroke, baseKeystroke] entries),
  // keyed first by the dead key's own {code,shift,altGr} then by the base key's -- so
  // decoding a composed character is a two-step lookup that mirrors how a real dead key
  // waits for the next keystroke before producing anything.
  function strokeKey(stroke) {
    return stroke.code + '|' + Boolean(stroke.shift) + '|' + Boolean(stroke.altGr);
  }
  const inverseLayouts = {};
  Object.keys(KEYBOARD_LAYOUTS).forEach(function (name) {
    const table = KEYBOARD_LAYOUTS[name];
    const single = {};
    const dead = {};
    Object.keys(table).forEach(function (ch) {
      if (ch === '\r') return; // '\n' already covers the Enter slot
      const entry = table[ch];
      if (Array.isArray(entry)) {
        const deadKey = strokeKey(entry[0]);
        const baseKey = strokeKey(entry[1]);
        if (!dead[deadKey]) dead[deadKey] = {};
        dead[deadKey][baseKey] = ch;
      } else {
        single[strokeKey(entry)] = ch;
      }
    });
    inverseLayouts[name] = { single: single, dead: dead };
  });

  const canvas = document.getElementById('fake-canvas');
  const guestLayoutSelect = document.getElementById('guest-layout');
  // Populated from KEYBOARD_LAYOUT_LABELS (../extension/keyboard-layouts.js) so a new
  // layout added there shows up here automatically, with no separate list to keep in sync.
  Object.keys(KEYBOARD_LAYOUTS).forEach(function (code) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = KEYBOARD_LAYOUT_LABELS[code] || code;
    guestLayoutSelect.appendChild(opt);
  });
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

  // Set to the dead key's own {code,shift,altGr} key-string while waiting for the next
  // keystroke to complete a dead-key composition (e.g. Spanish dead-acute then 'a' -> 'á').
  let pendingDeadKey = null;

  // Returns { pending: true } if this keystroke was a dead key and nothing should be
  // rendered yet, or { char } (possibly undefined, meaning "couldn't resolve") otherwise.
  function resolveChar(e) {
    const key = e.code + '|' + Boolean(e.shiftKey) + '|' + Boolean(e.altKey);

    if (!strictModeCheckbox.checked) {
      pendingDeadKey = null;
      if (e.key === 'Dead') return { pending: true };
      if (e.key === 'Enter') return { char: '\n' };
      return { char: e.key && e.key.length === 1 ? e.key : undefined };
    }

    const layout = inverseLayouts[guestLayoutSelect.value] || inverseLayouts.us;
    if (pendingDeadKey !== null) {
      const deadKey = pendingDeadKey;
      pendingDeadKey = null;
      const composed = layout.dead[deadKey] && layout.dead[deadKey][key];
      if (composed !== undefined) return { char: composed };
      // Not a valid combination for that dead key -- real dead-key implementations
      // typically fall through to processing this keystroke normally instead of eating it.
      return { char: layout.single[key] };
    }
    if (layout.dead[key]) {
      pendingDeadKey = key;
      return { pending: true }; // dead key alone produces nothing yet
    }
    return { char: layout.single[key] }; // undefined if this guest layout can't produce it
  }

  canvas.addEventListener('keydown', function (e) {
    if (e.isTrusted) return; // ignore real typing/shortcuts; only decode what the extension sends
    if (MODIFIER_CODES.has(e.code)) return;
    logEvent(e);
    const result = resolveChar(e);
    if (result.pending) return; // dead key pressed -- wait for the next keystroke, show nothing yet
    vmScreen.textContent += result.char !== undefined ? result.char : '░'; // shaded block = "couldn't resolve"
    vmScreen.scrollTop = vmScreen.scrollHeight;
  });

  clearBtn.addEventListener('click', function () {
    vmScreen.textContent = '';
    eventLog.textContent = '';
    pendingDeadKey = null;
  });
})();
