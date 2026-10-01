// Runs the real content.js in jsdom on fake PVE console pages and plays the popup's
// "sendText" message at it, recording the keyboard events it dispatches.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadContentScript, waitFor } = require('./helpers');

const KVM_URL = 'https://pve.example:8006/?console=kvm&novnc=1&vmid=100&node=pve';
const MODIFIER_KEYS = new Set(['Shift', 'AltGraph', 'Control', 'Meta']);
// No artificial pauses between keystrokes so tests run fast.
const FAST = { pmx_keystroke_delay_ms: 0, pmx_first_char_delay_ms: 0, pmx_enter_delay_ms: 0 };

function isInjected(window) {
  return Boolean(window.document.getElementById('pmx-wrap'));
}

// Type `text` through the noVNC path and return the non-modifier keydowns the canvas saw.
async function typeIntoCanvas(text, layout) {
  const { window, chrome } = await loadContentScript({
    url: KVM_URL, sync: { ...FAST, ...(layout ? { pmx_keyboard_layout: layout } : {}) }
  });
  const keydowns = [];
  window.document.querySelector('canvas').addEventListener('keydown', (e) => {
    if (!MODIFIER_KEYS.has(e.key)) {
      keydowns.push({ key: e.key, code: e.code, shift: e.shiftKey, altGr: e.altKey });
    }
  });
  const reply = await chrome.sendToContent({ action: 'sendText', text });
  assert.equal(reply.ok, true);
  const toast = await waitFor(() => {
    const el = window.document.getElementById('pmx-paste-toast');
    return el && /Pasted/.test(el.textContent) && el.textContent;
  });
  window.close();
  return { keydowns, toast };
}

test('activates only on PVE console URLs', async (t) => {
  const cases = [
    ['https://pve.example:8006/?console=kvm&novnc=1&vmid=100&node=pve', true],
    ['https://pve.example:8006/?console=lxc&xtermjs=1&vmid=101&node=pve', true],
    ['https://pve.example:8006/?console=shell&xtermjs=1&node=pve', true],
    ['https://pve.example:8006/?console=upgrade&xtermjs=1&node=pve', true],
    ['https://pve.example:8006/novnc/vnc.html?vmid=100', true],
    ['https://pve.example:8006/#v1:0:=qemu%2F100:4', false],
    ['https://example.com/novnc/vnc.html', false],
    ['https://example.com/?console=kvm', false],
    ['https://example.com/', false]
  ];
  for (const [url, expected] of cases) {
    await t.test(url, async () => {
      const { window } = await loadContentScript({ url });
      assert.equal(isInjected(window), expected);
      window.close();
    });
  }
});

test('types plain text with the US layout by default', async () => {
  const { keydowns, toast } = await typeIntoCanvas('Hi!');
  assert.deepEqual(keydowns, [
    { key: 'H', code: 'KeyH', shift: true, altGr: false },
    { key: 'i', code: 'KeyI', shift: false, altGr: false },
    { key: '!', code: 'Digit1', shift: true, altGr: false }
  ]);
  assert.match(toast, /Pasted 3 characters/);
});

test('newlines (including CRLF) become a single Enter each', async () => {
  const { keydowns } = await typeIntoCanvas('a\r\nb\nc');
  assert.deepEqual(keydowns.map((k) => k.code), ['KeyA', 'Enter', 'KeyB', 'Enter', 'KeyC']);
});

test('uses the configured layout, including AltGr', async () => {
  const { keydowns } = await typeIntoCanvas('zy@', 'de');
  assert.deepEqual(keydowns, [
    { key: 'z', code: 'KeyY', shift: false, altGr: false },
    { key: 'y', code: 'KeyZ', shift: false, altGr: false },
    { key: '@', code: 'KeyQ', shift: false, altGr: true }
  ]);
});

test('composes accented characters from a dead key then the base key', async () => {
  const { keydowns } = await typeIntoCanvas('á', 'es');
  assert.deepEqual(keydowns, [
    { key: 'Dead', code: 'Quote', shift: false, altGr: false },
    { key: 'á', code: 'KeyA', shift: false, altGr: false }
  ]);
});

test('skips characters the layout cannot type and says so', async () => {
  const { keydowns, toast } = await typeIntoCanvas('a^b', 'de');
  assert.deepEqual(keydowns.map((k) => k.key), ['a', 'b']);
  assert.match(toast, /Pasted 2 characters, skipped 1/);
});

test('falls back to US for an unknown stored layout', async () => {
  const { keydowns } = await typeIntoCanvas('z', 'nonexistent');
  assert.deepEqual(keydowns.map((k) => k.code), ['KeyZ']);
});

test('pastes into xterm.js as one paste event, not keystrokes', async () => {
  // jsdom has neither DataTransfer nor ClipboardEvent; stub just enough of both.
  function stubClipboard(window) {
    window.DataTransfer = class {
      constructor() { this.store = {}; }
      setData(type, value) { this.store[type] = value; }
      getData(type) { return this.store[type]; }
    };
    window.ClipboardEvent = class extends window.Event {
      constructor(type, init) { super(type, init); this.clipboardData = init.clipboardData; }
    };
  }
  const { window, chrome } = await loadContentScript({
    url: 'https://pve.example:8006/?console=lxc&xtermjs=1&vmid=101&node=pve',
    body: '<div class="xterm"><textarea class="xterm-helper-textarea"></textarea><canvas></canvas></div>',
    beforeScripts: stubClipboard
  });
  const textarea = window.document.querySelector('.xterm-helper-textarea');
  const pasted = [];
  let keydowns = 0;
  // Like xterm: take the paste and stop it from reaching the document.
  textarea.addEventListener('paste', (e) => { pasted.push(e.clipboardData.getData('text/plain')); e.stopPropagation(); });
  textarea.addEventListener('keydown', () => { keydowns++; });

  const reply = await chrome.sendToContent({ action: 'sendText', text: "echo 'hi'\nls" });
  assert.equal(reply.ok, true);
  assert.deepEqual(pasted, ["echo 'hi'\nls"]);
  assert.equal(keydowns, 0);
  window.close();
});

test('rejects an empty sendText', async () => {
  const { window, chrome } = await loadContentScript({ url: KVM_URL });
  const reply = await chrome.sendToContent({ action: 'sendText', text: '' });
  assert.equal(reply.ok, false);
  window.close();
});
