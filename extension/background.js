// PVE Snippets - Background service worker
// Tracks extension updates so the popup/console panel can tell the user about them.

(function () {
  'use strict';

  const UPDATE_NOTICE_KEY = 'pmx_update_notice';
  const KEYBOARD_LAYOUT_KEY = 'pmx_keyboard_layout';
  const BADGE_COLOR = '#f60';

  // Best-effort guess from browser/OS locale. Only ever used as a first-run default —
  // it reflects the machine running the browser, not the VM's configured guest layout.
  function detectLayoutFromLanguage() {
    const lang = (typeof navigator !== 'undefined' && (navigator.language || (navigator.languages && navigator.languages[0]))) || '';
    const l = lang.toLowerCase();
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('de')) return 'de';
    if (l === 'en-gb' || l.startsWith('en-gb')) return 'uk';
    return 'us';
  }

  const runtime = typeof chrome !== 'undefined' && chrome.runtime
    ? chrome.runtime
    : typeof browser !== 'undefined' && browser.runtime
      ? browser.runtime
      : null;

  const action = typeof chrome !== 'undefined' && chrome.action
    ? chrome.action
    : typeof browser !== 'undefined' && browser.action
      ? browser.action
      : null;

  const storage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
    ? chrome.storage.local
    : typeof browser !== 'undefined' && browser.storage && browser.storage.local
      ? browser.storage.local
      : null;

  const syncStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync
    ? chrome.storage.sync
    : typeof browser !== 'undefined' && browser.storage && browser.storage.sync
      ? browser.storage.sync
      : null;

  if (!runtime) return;

  // Set a first-run keyboard-layout guess, but only if sync doesn't already have one from
  // another device -- a fresh install should never clobber an existing synced preference.
  function seedKeyboardLayout() {
    const guess = detectLayoutFromLanguage();
    if (!syncStorage) { if (storage) storage.set({ [KEYBOARD_LAYOUT_KEY]: guess }); return; }
    syncStorage.get([KEYBOARD_LAYOUT_KEY]).then(function (res) {
      if (res && res[KEYBOARD_LAYOUT_KEY] !== undefined) return;
      return syncStorage.set({ [KEYBOARD_LAYOUT_KEY]: guess });
    }).catch(function () {
      if (storage) storage.set({ [KEYBOARD_LAYOUT_KEY]: guess });
    });
  }

  function setBadge() {
    if (!action || !action.setBadgeText) return;
    action.setBadgeText({ text: '•' });
    if (action.setBadgeBackgroundColor) action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  }

  function clearBadge() {
    if (action && action.setBadgeText) action.setBadgeText({ text: '' });
  }

  if (runtime.onInstalled) {
    runtime.onInstalled.addListener(function (details) {
      if (details.reason === 'install') {
        seedKeyboardLayout();
        return;
      }
      if (details.reason !== 'update') return;
      const toVersion = runtime.getManifest().version;
      const fromVersion = details.previousVersion || '';
      if (!toVersion || fromVersion === toVersion || !storage) return;
      storage.set({ [UPDATE_NOTICE_KEY]: { from: fromVersion, to: toVersion, seen: false } });
      setBadge();
    });
  }

  if (runtime.onMessage) {
    runtime.onMessage.addListener(function (message) {
      if (message && message.type === 'pmx_clear_update_badge') clearBadge();
    });
  }
})();
