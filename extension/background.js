// PVE Snippets - Background service worker
// Tracks extension updates so the popup/console panel can tell the user about them.

(function () {
  'use strict';

  const UPDATE_NOTICE_KEY = 'pmx_update_notice';
  const KEYBOARD_LAYOUT_KEY = 'pmx_keyboard_layout';
  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const GITHUB_TOKEN_KEY = 'pmx_github_token';
  const GITHUB_GIST_ID_KEY = 'pmx_github_gist_id';
  const GITHUB_AUTO_SYNC_KEY = 'pmx_github_auto_sync';
  const GITHUB_LAST_SYNC_KEY = 'pmx_github_last_sync';
  const GIST_FILENAME = 'pve-snippets.json';
  const GITHUB_API = 'https://api.github.com';
  const AUTO_SYNC_DEBOUNCE_MS = 2000;
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

  // Auto-sync: whenever snippets change (from the popup, settings, or the snippets
  // manager) and the user has opted in, debounce a push to the linked Gist so rapid
  // edits collapse into one request. Runs here rather than in each UI page so it also
  // fires when snippets change while no extension page is open.
  function githubRequest(token, path, method, body) {
    return fetch(GITHUB_API + path, {
      method: method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.message) || ('GitHub API error (' + res.status + ')'));
        return data;
      });
    });
  }

  let autoSyncTimer = null;

  function runAutoSync() {
    if (!storage) return;
    storage.get([GITHUB_AUTO_SYNC_KEY, GITHUB_TOKEN_KEY, GITHUB_GIST_ID_KEY, SNIPPETS_KEY]).then(function (res) {
      const token = res[GITHUB_TOKEN_KEY];
      const gistId = res[GITHUB_GIST_ID_KEY];
      if (!res[GITHUB_AUTO_SYNC_KEY] || !token || !gistId) return;
      const snippets = Array.isArray(res[SNIPPETS_KEY]) ? res[SNIPPETS_KEY] : [];
      const body = { files: { [GIST_FILENAME]: { content: JSON.stringify(snippets, null, 2) } } };
      return githubRequest(token, '/gists/' + gistId, 'PATCH', body)
        .then(function () { storage.set({ [GITHUB_LAST_SYNC_KEY]: { time: Date.now(), ok: true } }); })
        .catch(function (err) { storage.set({ [GITHUB_LAST_SYNC_KEY]: { time: Date.now(), ok: false, error: err.message } }); });
    });
  }

  function scheduleAutoSync() {
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(function () { autoSyncTimer = null; runAutoSync(); }, AUTO_SYNC_DEBOUNCE_MS);
  }

  if (storage && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[SNIPPETS_KEY]) scheduleAutoSync();
    });
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
