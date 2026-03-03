(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const AUTO_ENTER_KEY = 'pmx_auto_enter';

  const MAX_SNIPPETS = 50;

  const exportBtn = document.getElementById('export-btn');
  const exportHint = document.getElementById('export-hint');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const autoEnterCheckbox = document.getElementById('auto-enter');
  const popupSendBtn = document.getElementById('popup-send-btn');
  const popupPasteText = document.getElementById('popup-paste-text');
  const popupPasteHint = document.getElementById('popup-paste-hint');

  function getSnippets() {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([SNIPPETS_KEY], function (res) {
            const raw = res[SNIPPETS_KEY];
            resolve(Array.isArray(raw) ? raw : []);
          });
          return;
        }
      } catch (_) {}
      resolve([]);
    });
  }

  function downloadJson(data, filename) {
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportBtn.addEventListener('click', function () {
    getSnippets().then(function (snippets) {
      if (snippets.length === 0) {
        exportHint.textContent = 'No snippets to export.';
        return;
      }
      const filename = 'pve-paste-helper-snippets-' + new Date().toISOString().slice(0, 10) + '.json';
      downloadJson(snippets, filename);
      exportHint.textContent = 'Exported ' + snippets.length + ' snippet(s).';
    });
  });

  function setSnippets(snippets) {
    return new Promise(function (resolve, reject) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const obj = {};
          obj[SNIPPETS_KEY] = snippets;
          chrome.storage.local.set(obj, resolve);
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

  importBtn.addEventListener('click', function () {
    importFile.click();
  });

  importFile.addEventListener('change', function () {
    const file = importFile.files[0];
    importFile.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      let list;
      try {
        const data = JSON.parse(reader.result);
        list = Array.isArray(data) ? data : (data && Array.isArray(data.snippets) ? data.snippets : null);
      } catch (_) {
        exportHint.textContent = 'Import failed: invalid JSON.';
        return;
      }
      if (!list || list.length === 0) {
        exportHint.textContent = 'Import failed: no snippets in file.';
        return;
      }

      const normalized = list.map(normalizeSnippet).filter(Boolean);
      if (normalized.length === 0) {
        exportHint.textContent = 'Import failed: no valid snippets.';
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
          exportHint.textContent = 'Imported ' + normalized.length + ' snippet(s). Total: ' + capped.length + '.';
          exportBtn.disabled = false;
        });
      });
    };
    reader.onerror = function () {
      exportHint.textContent = 'Import failed: could not read file.';
    };
    reader.readAsText(file, 'utf-8');
  });

  function getAutoEnter() {
    return new Promise(function (resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([AUTO_ENTER_KEY], function (res) {
            resolve(Boolean(res[AUTO_ENTER_KEY]));
          });
          return;
        }
      } catch (_) {}
      resolve(false);
    });
  }

  function setAutoEnter(value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [AUTO_ENTER_KEY]: value });
      }
    } catch (_) {}
  }

  if (autoEnterCheckbox) {
    getAutoEnter().then(function (checked) {
      autoEnterCheckbox.checked = checked;
    });
    autoEnterCheckbox.addEventListener('change', function () {
      setAutoEnter(autoEnterCheckbox.checked);
    });
  }

  function sendToContentScript(message) {
    return new Promise(function (resolve) {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) {
        resolve({ ok: false, error: 'Not supported' });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) {
          resolve({ ok: false, error: 'No tab' });
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, function (response) {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { ok: false, error: 'No response' });
        });
      });
    });
  }

  function setPasteHint(msg, isError) {
    if (popupPasteHint) {
      popupPasteHint.textContent = msg;
      popupPasteHint.style.color = isError ? 'var(--pmx-accent)' : 'var(--pmx-text-muted)';
    }
  }

  if (popupSendBtn && popupPasteText) {
    popupSendBtn.addEventListener('click', function () {
      const text = (popupPasteText.value || '').trim();
      if (!text) {
        setPasteHint('Enter or paste text above, then click Paste into page.', true);
        return;
      }
      setPasteHint('Pasting…');
      sendToContentScript({ action: 'sendText', text: text }).then(function (r) {
        if (r.ok) {
          setPasteHint('Pasted ' + text.length + ' characters into the page.');
        } else {
          const err = r.error || 'Could not paste.';
          const hint = err.indexOf('Receiving end') !== -1 || err.indexOf('establish connection') !== -1
            ? 'Reload the tab and try again, or use a normal text field.'
            : err;
          setPasteHint(hint, true);
        }
      });
    });
  }

  getSnippets().then(function (snippets) {
    if (snippets.length === 0) {
      exportBtn.disabled = true;
      exportHint.textContent = 'No snippets saved yet. Save some from the paste panel on a VM console.';
    }
  });

  const versionEl = document.getElementById('version-label');
  if (versionEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionEl.textContent = 'Version ' + (manifest.version || '');
  }
})();
