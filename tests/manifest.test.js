const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EXTENSION_DIR, readExtensionFile } = require('./helpers');

const manifest = JSON.parse(readExtensionFile('manifest.json'));

function exists(rel) {
  return fs.existsSync(path.join(EXTENSION_DIR, rel));
}

function scriptSrcs(htmlFile) {
  return [...readExtensionFile(htmlFile).matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
}

test('version is a plain x.y.z that both stores accept', () => {
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test('every file the manifest references exists', () => {
  const refs = [
    manifest.background.service_worker,
    ...manifest.background.scripts,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap((cs) => cs.js || []),
    ...manifest.web_accessible_resources.flatMap((r) => r.resources)
  ];
  for (const ref of refs) assert.ok(exists(ref), `${ref} exists`);
});

test('every <script src> in the extension pages exists', () => {
  for (const page of ['popup.html', 'settings.html']) {
    for (const src of scriptSrcs(page)) assert.ok(exists(src), `${page} -> ${src} exists`);
  }
});

// content.js and settings.js use keyboard-layouts.js's globals, so it must load first.
test('keyboard-layouts.js loads before the scripts that use it', () => {
  const contentJs = manifest.content_scripts.find((cs) => cs.js.includes('content.js')).js;
  assert.ok(contentJs.indexOf('keyboard-layouts.js') !== -1, 'content scripts include keyboard-layouts.js');
  assert.ok(contentJs.indexOf('keyboard-layouts.js') < contentJs.indexOf('content.js'));

  const settingsJs = scriptSrcs('settings.html');
  assert.ok(settingsJs.indexOf('keyboard-layouts.js') !== -1, 'settings.html loads keyboard-layouts.js');
  assert.ok(settingsJs.indexOf('keyboard-layouts.js') < settingsJs.indexOf('settings.js'));

  assert.match(readExtensionFile('background.js'), /importScripts\('keyboard-layouts\.js'\)/);
});

test('Firefox add-on id is set (AMO updates are keyed on it)', () => {
  assert.equal(manifest.browser_specific_settings.gecko.id, 'pve-snippets@local.dev');
});

test('every extension script parses', () => {
  for (const file of fs.readdirSync(EXTENSION_DIR).filter((f) => f.endsWith('.js'))) {
    assert.doesNotThrow(() => new vm.Script(readExtensionFile(file), { filename: file }), file);
  }
});
