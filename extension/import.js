(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const MAX_SNIPPETS = 50;

  const fileInput = document.getElementById('file');
  const statusEl = document.getElementById('status');

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.className = isError ? 'error' : (msg ? 'success' : '');
  }

  function getSnippets() {
    return new Promise(function (resolve) {
      try {
        const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
          ? chrome.storage.local
          : typeof browser !== 'undefined' && browser.storage && browser.storage.local
            ? browser.storage.local
            : null;
        if (api) {
          api.get([SNIPPETS_KEY], function (res) {
            const raw = res[SNIPPETS_KEY];
            resolve(Array.isArray(raw) ? raw : []);
          });
          return;
        }
      } catch (_) {}
      resolve([]);
    });
  }

  function setSnippets(snippets) {
    return new Promise(function (resolve, reject) {
      try {
        const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
          ? chrome.storage.local
          : typeof browser !== 'undefined' && browser.storage && browser.storage.local
            ? browser.storage.local
            : null;
        if (api) {
          const obj = {};
          obj[SNIPPETS_KEY] = snippets;
          api.set(obj, resolve);
          return;
        }
      } catch (e) {
        reject(e);
        return;
      }
      resolve();
    });
  }

  function normalizeSnippet(item) {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const text = typeof item.text === 'string' ? item.text : '';
    if (!name && !text) return null;
    const now = Date.now();
    return {
      id: typeof item.id === 'string' && item.id ? item.id : 's_' + now + '_' + Math.random().toString(16).slice(2),
      name: name || 'Imported',
      text: text,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now
    };
  }

  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    setStatus('Reading file…');
    const reader = new FileReader();
    reader.onload = function () {
      let list;
      try {
        const data = JSON.parse(reader.result);
        list = Array.isArray(data) ? data : (data && Array.isArray(data.snippets) ? data.snippets : null);
      } catch (_) {
        setStatus('Import failed: invalid JSON.', true);
        return;
      }
      if (!list || list.length === 0) {
        setStatus('Import failed: no snippets in file.', true);
        return;
      }

      const normalized = list.map(normalizeSnippet).filter(Boolean);
      if (normalized.length === 0) {
        setStatus('Import failed: no valid snippets.', true);
        return;
      }

      getSnippets().then(function (existing) {
        const byId = {};
        existing.forEach(function (s) { byId[s.id] = s; });
        normalized.forEach(function (s) { byId[s.id] = s; });
        const merged = Object.keys(byId).map(function (id) { return byId[id]; });
        merged.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        const capped = merged.slice(0, MAX_SNIPPETS);

        setSnippets(capped).then(function () {
          setStatus('Imported ' + normalized.length + ' snippet(s). Total: ' + capped.length + '. You can close this tab.');
        });
      });
    };
    reader.onerror = function () {
      setStatus('Import failed: could not read file.', true);
    };
    reader.readAsText(file, 'utf-8');
  });

  const versionEl = document.getElementById('version-label');
  const runtime = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : typeof browser !== 'undefined' && browser.runtime ? browser.runtime : null;
  if (versionEl && runtime && runtime.getManifest) {
    const manifest = runtime.getManifest();
    versionEl.textContent = (manifest.version || '');
  }
})();
