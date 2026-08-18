// PVE Snippets - Background service worker
// Tracks extension updates so the popup/console panel can tell the user about them.

(function () {
  'use strict';

  const UPDATE_NOTICE_KEY = 'pmx_update_notice';
  const BADGE_COLOR = '#f60';

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

  if (!runtime) return;

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
