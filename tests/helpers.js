// Shared test helpers. The extension ships plain browser scripts (no modules, no build
// step), so tests load the real files from extension/ as-is rather than importing them.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const EXTENSION_DIR = path.join(__dirname, '..', 'extension');

function readExtensionFile(name) {
  return fs.readFileSync(path.join(EXTENSION_DIR, name), 'utf8');
}

// keyboard-layouts.js declares top-level consts, which don't become properties of a vm
// context's global -- so evaluate it with a trailing expression that hands them back.
function loadKeyboardLayouts() {
  const src = readExtensionFile('keyboard-layouts.js');
  return vm.runInNewContext(src + `
;({
  KEYBOARD_LAYOUTS, KEYBOARD_LAYOUT_LABELS, KEYBOARD_LAYOUT_LOCALE_GUESSES,
  DEFAULT_KEYBOARD_LAYOUT, guessKeyboardLayoutFromLocale, resolveKey
})`, {}, { filename: 'keyboard-layouts.js' });
}

// A minimal chrome.* stand-in: promise-style storage.local/storage.sync backed by plain
// objects, and a runtime.onMessage that records listeners so tests can play the popup.
function createChromeStub({ local = {}, sync = {} } = {}) {
  function area(data) {
    return {
      data,
      get(keys) {
        const out = {};
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => { if (k in data) out[k] = data[k]; });
        return Promise.resolve(out);
      },
      set(obj) { Object.assign(data, obj); return Promise.resolve(); }
    };
  }
  const listeners = [];
  return {
    storage: { local: area(local), sync: area(sync) },
    runtime: {
      onMessage: { addListener(fn) { listeners.push(fn); } },
      sendMessage() { return Promise.resolve(); },
      getURL(p) { return 'chrome-extension://test/' + p; }
    },
    // Deliver a message the way the popup does and resolve with the content script's reply.
    sendToContent(msg) {
      return new Promise((resolve) => {
        listeners.forEach((fn) => fn(msg, {}, resolve));
      });
    }
  };
}

// Load content.js (plus keyboard-layouts.js, its sibling content script) into a jsdom page
// at `url`, exactly as the manifest injects them, and wait for its init() to have run.
async function loadContentScript({ url, body = '<canvas></canvas>', sync = {}, local = {}, beforeScripts } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url, runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom;
  const chrome = createChromeStub({ sync, local });
  window.chrome = chrome;
  window.console.log = () => {};
  window.console.warn = () => {};
  if (beforeScripts) beforeScripts(window);
  // Run as classic scripts in the page's context, like the manifest does -- not via
  // window.eval, whose indirect-eval semantics would keep keyboard-layouts.js's top-level
  // consts out of the global scope content.js reads them from.
  const context = dom.getInternalVMContext();
  for (const file of ['keyboard-layouts.js', 'content.js']) {
    new vm.Script(readExtensionFile(file), { filename: file }).runInContext(context);
  }
  if (window.document.readyState === 'loading') {
    await new Promise((resolve) => window.document.addEventListener('DOMContentLoaded', resolve));
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { dom, window, chrome };
}

async function waitFor(fn, { timeout = 3000, interval = 5 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

module.exports = {
  EXTENSION_DIR, readExtensionFile, loadKeyboardLayouts, createChromeStub, loadContentScript, waitFor
};
