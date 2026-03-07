(function() {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const AUTO_ENTER_KEY = 'pmx_auto_enter';

  const MAX_SNIPPETS = 50;

  const exportBtn = document.getElementById('export-btn');
  const exportHint = document.getElementById('export-hint');
  const importBtn = document.getElementById('import-btn');
  const autoEnterCheckbox = document.getElementById('auto-enter');
  const popupSendBtn = document.getElementById('popup-send-btn');
  const popupPasteText = document.getElementById('popup-paste-text');
  const popupPasteHint = document.getElementById('popup-paste-hint');

  function getSnippets() {
    return new Promise(function(resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([SNIPPETS_KEY], function(res) {
            const raw = res[SNIPPETS_KEY];
            resolve(Array.isArray(raw) ? raw : []);
          });
          return;
        }
      } catch (_) { }
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

  exportBtn.addEventListener('click', function() {
    getSnippets().then(function(snippets) {
      if (snippets.length === 0) {
        exportHint.textContent = 'No snippets to export.';
        return;
      }
      const filename = 'pve-snippets-export-' + new Date().toISOString().slice(0, 10) + '.json';
      downloadJson(snippets, filename);
      exportHint.textContent = 'Exported ' + snippets.length + ' snippet(s).';
    });
  });

  // Open import in a tab so the file picker works when the popup would close (e.g. Firefox).
  importBtn.addEventListener('click', function() {
    const api = typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs
      ? chrome
      : typeof browser !== 'undefined' && browser.runtime && browser.tabs
        ? browser
        : null;
    if (api) {
      api.tabs.create({ url: api.runtime.getURL('import.html') });
    }
  });

  function getAutoEnter() {
    return new Promise(function(resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([AUTO_ENTER_KEY], function(res) {
            resolve(Boolean(res[AUTO_ENTER_KEY]));
          });
          return;
        }
      } catch (_) { }
      resolve(false);
    });
  }

  function setAutoEnter(value) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [AUTO_ENTER_KEY]: value });
      }
    } catch (_) { }
  }

  if (autoEnterCheckbox) {
    getAutoEnter().then(function(checked) {
      autoEnterCheckbox.checked = checked;
    });
    autoEnterCheckbox.addEventListener('change', function() {
      setAutoEnter(autoEnterCheckbox.checked);
    });
  }

  function sendToContentScript(message) {
    return new Promise(function(resolve) {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) {
        resolve({ ok: false, error: 'Not supported' });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) {
          resolve({ ok: false, error: 'No tab' });
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, function(response) {
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
    popupSendBtn.addEventListener('click', function() {
      const text = (popupPasteText.value || '').trim();
      if (!text) {
        setPasteHint('Enter or paste text above, then click Paste into page.', true);
        return;
      }
      setPasteHint('Pasting…');
      sendToContentScript({ action: 'sendText', text: text }).then(function(r) {
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

  getSnippets().then(function(snippets) {
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
