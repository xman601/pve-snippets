(function() {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const PASTE_DRAFT_KEY = 'pmx_paste_draft';
  const POPUP_DEFAULT_TAB_KEY = 'pmx_popup_default_tab';
  const MIN_PASTE_LENGTH_KEY = 'pmx_min_paste_length';
  const MAX_SNIPPETS = 200;

  const popupSendBtn = document.getElementById('popup-send-btn');
  const popupPasteText = document.getElementById('pmx-textarea');
  const popupPasteHint = document.getElementById('popup-paste-hint');
  const tabPaste = document.getElementById('tab-paste');
  const tabSnippets = document.getElementById('tab-snippets');
  const viewPaste = document.getElementById('view-paste');
  const viewSnippets = document.getElementById('view-snippets');
  const cpSettingsBtn = document.getElementById('cp-settings-btn');
  const cpSearchInput = document.getElementById('cp-search-input');

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

  function getPasteDraft() {
    return new Promise(function(resolve) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([PASTE_DRAFT_KEY], function(res) {
            resolve(typeof res[PASTE_DRAFT_KEY] === 'string' ? res[PASTE_DRAFT_KEY] : '');
          });
          return;
        }
      } catch (_) { }
      resolve('');
    });
  }

  function storageGet(key) {
    return new Promise(function(resolve) {
      try {
        const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
          ? chrome.storage.local
          : typeof browser !== 'undefined' && browser.storage && browser.storage.local
            ? browser.storage.local
            : null;
        if (api) {
          api.get([key], function(res) { resolve(res[key]); });
          return;
        }
      } catch (_) { }
      resolve(undefined);
    });
  }

  function setPasteDraft(text) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [PASTE_DRAFT_KEY]: text });
      }
    } catch (_) { }
  }

  if (popupPasteText) {
    getPasteDraft().then(function(draft) {
      popupPasteText.value = draft;
    });
    var pasteDraftTimeout;
    popupPasteText.addEventListener('input', function() {
      clearTimeout(pasteDraftTimeout);
      pasteDraftTimeout = setTimeout(function() {
        setPasteDraft(popupPasteText.value || '');
      }, 300);
    });
  }

  const api = typeof chrome !== 'undefined' && chrome.runtime ? chrome : typeof browser !== 'undefined' && browser.runtime ? browser : null;
  const settingsUrl = api ? api.runtime.getURL('settings.html') : '#';
  if (cpSettingsBtn) {
    cpSettingsBtn.href = settingsUrl;
    cpSettingsBtn.target = '_blank';
    cpSettingsBtn.rel = 'noopener noreferrer';
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
      popupPasteHint.style.color = isError ? 'var(--pmx-accent)' : 'var(--pmx-textMuted)';
    }
  }

  function setSnippets(snippets) {
    return new Promise(function(resolve, reject) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [SNIPPETS_KEY]: snippets }, resolve);
          return;
        }
      } catch (e) { reject(e); }
      resolve();
    });
  }

  function saveSnippet(payload) {
    const id = payload.id;
    const name = String(payload.name || '').trim();
    const text = String(payload.text || '').trim();
    if (!name) return Promise.resolve({ ok: false, reason: 'no_name' });
    if (!text) return Promise.resolve({ ok: false, reason: 'no_text' });
    return getSnippets().then(function(snippets) {
      const now = Date.now();
      if (id) {
        const idx = snippets.findIndex(function(s) { return s.id === id; });
        if (idx >= 0) {
          snippets[idx] = { ...snippets[idx], name: name, text: text, updatedAt: now };
        } else {
          snippets.unshift({ id: id, name: name, text: text, updatedAt: now });
        }
      } else {
        const newId = 's_' + now + '_' + Math.random().toString(16).slice(2);
        snippets.unshift({ id: newId, name: name, text: text, updatedAt: now });
      }
      return setSnippets(snippets.slice(0, MAX_SNIPPETS)).then(function() { return { ok: true }; });
    });
  }

  function deleteSnippet(id) {
    return getSnippets().then(function(snippets) {
      return setSnippets(snippets.filter(function(s) { return s.id !== id; }));
    });
  }

  const popupSnippetList = document.getElementById('popup-snippet-list');
  const popupNewSnippetBtn = document.getElementById('popup-new-snippet-btn');
  const popupSnippetForm = document.getElementById('popup-snippet-form');
  const popupSnippetName = document.getElementById('popup-snippet-name');
  const popupSnippetText = document.getElementById('popup-snippet-text');
  const popupSnippetFormCancel = document.getElementById('popup-snippet-form-cancel');
  const popupSnippetFormSave = document.getElementById('popup-snippet-form-save');

  let editingSnippetId = null;

  function showSnippetForm(snippet) {
    editingSnippetId = snippet ? snippet.id : null;
    popupSnippetName.value = snippet ? (snippet.name || '') : '';
    popupSnippetText.value = snippet ? (snippet.text || '') : '';
    if (popupSnippetForm) popupSnippetForm.classList.add('open');
    if (popupNewSnippetBtn) popupNewSnippetBtn.style.display = 'none';
    if (popupSnippetName) popupSnippetName.focus();
  }

  function hideSnippetForm() {
    editingSnippetId = null;
    if (popupSnippetForm) popupSnippetForm.classList.remove('open');
    if (popupNewSnippetBtn) popupNewSnippetBtn.style.display = '';
    if (popupSnippetName) popupSnippetName.value = '';
    if (popupSnippetText) popupSnippetText.value = '';
  }

  function renderSnippetList() {
    if (!popupSnippetList) return;
    const q = (cpSearchInput && cpSearchInput.value || '').trim().toLowerCase();
    getSnippets().then(function(snippets) {
      const filtered = q
        ? snippets.filter(function(s) {
            return (s.name || '').toLowerCase().includes(q) || (s.text || '').toLowerCase().includes(q);
          })
        : snippets;
      popupSnippetList.innerHTML = '';
      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pmx-snip-empty';
        empty.textContent = q ? 'No snippets match.' : 'No snippets yet. Add one below or open Settings to import.';
        popupSnippetList.appendChild(empty);
        return;
      }
      filtered.forEach(function(s, idx) {
        const row = document.createElement('div');
        row.className = 'pmx-snip-row';
        row.dataset.id = s.id;
        const num = document.createElement('span');
        num.className = 'pmx-snip-num';
        num.textContent = String(idx + 1).padStart(2, '0');
        const info = document.createElement('div');
        info.className = 'pmx-snip-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'pmx-snip-name';
        nameEl.textContent = s.name || '(unnamed)';
        const preview = document.createElement('div');
        preview.className = 'pmx-snip-preview';
        preview.textContent = s.text || '';
        info.appendChild(nameEl);
        info.appendChild(preview);
        const actions = document.createElement('div');
        actions.className = 'pmx-snip-actions';
        const runBtn = document.createElement('button');
        runBtn.type = 'button';
        runBtn.className = 'pmx-snip-send';
        runBtn.textContent = 'Run';
        runBtn.addEventListener('click', function() {
          if (!s.text) return;
          sendToContentScript({ action: 'sendText', text: s.text }).then(function(r) {
            if (r.ok) setPasteHint('Sent "' + (s.name || 'snippet') + '" to tab.');
            else setPasteHint(r.error || 'Could not send.', true);
          });
        });
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'pmx-snip-edit';
        editBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', function() {
          showSnippetForm(s);
        });
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'pmx-snip-del';
        delBtn.textContent = '\u2715';
        delBtn.title = 'Delete';
        delBtn.addEventListener('click', function() {
          deleteSnippet(s.id).then(function() { renderSnippetList(); });
        });
        row.addEventListener('mouseenter', function() { row.classList.add('active'); });
        row.addEventListener('mouseleave', function() { row.classList.remove('active'); });
        actions.appendChild(runBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        row.appendChild(num);
        row.appendChild(info);
        row.appendChild(actions);
        popupSnippetList.appendChild(row);
      });
    });
  }

  if (popupNewSnippetBtn) {
    popupNewSnippetBtn.addEventListener('click', function() {
      showSnippetForm(null);
    });
  }
  if (popupSnippetFormCancel) {
    popupSnippetFormCancel.addEventListener('click', hideSnippetForm);
  }
  if (popupSnippetFormSave) {
    popupSnippetFormSave.addEventListener('click', function() {
      saveSnippet({
        id: editingSnippetId,
        name: popupSnippetName.value,
        text: popupSnippetText.value
      }).then(function(result) {
        if (result && result.ok) {
          hideSnippetForm();
          renderSnippetList();
        }
      });
    });
  }

  renderSnippetList();

  const popupClearBtn = document.getElementById('popup-clear-btn');
  if (popupClearBtn && popupPasteText) {
    popupClearBtn.addEventListener('click', function() {
      popupPasteText.value = '';
      setPasteDraft('');
      setPasteHint('');
    });
  }

  const popupSaveAsSnippetBtn = document.getElementById('popup-save-as-snippet-btn');
  if (popupSaveAsSnippetBtn && popupPasteText) {
    popupSaveAsSnippetBtn.addEventListener('click', function() {
      const text = (popupPasteText.value || '').trim();
      if (!text) {
        setPasteHint('Type or paste text above first, then click Save as snippet.', true);
        return;
      }
      showSnippetForm({ id: null, name: '', text: text });
      setPasteHint('Name the snippet and click Save.');
    });
  }

  if (popupSendBtn && popupPasteText) {
    popupSendBtn.addEventListener('click', function() {
      const text = (popupPasteText.value || '').trim();
      if (!text) {
        setPasteHint('Enter or paste text above, then click Send.', true);
        return;
      }
      storageGet(MIN_PASTE_LENGTH_KEY).then(function(minVal) {
        const min = Math.max(0, Math.min(1000, Number(minVal) || 0));
        if (min > 0 && text.length < min) {
          setPasteHint('Paste too short (min ' + min + ' characters).', true);
          return;
        }
        setPasteHint('Pasting…');
        sendToContentScript({ action: 'sendText', text: text }).then(function(r) {
        if (r.ok) {
          setPasteHint('Pasted ' + text.length + ' characters.');
          popupPasteText.value = '';
          setPasteDraft('');
        } else {
          const err = r.error || 'Could not paste.';
          const hint = err.indexOf('Receiving end') !== -1 || err.indexOf('establish connection') !== -1
            ? 'Reload the tab and try again.'
            : err;
          setPasteHint(hint, true);
        }
      });
      });
    });
  }

  function setTab(tab) {
    const isPaste = tab === 'paste';
    if (tabPaste) tabPaste.classList.toggle('active', isPaste);
    if (tabSnippets) tabSnippets.classList.toggle('active', !isPaste);
    if (viewPaste) viewPaste.classList.toggle('active', isPaste);
    if (viewSnippets) viewSnippets.classList.toggle('active', !isPaste);
    if (!isPaste && cpSearchInput) cpSearchInput.focus();
  }

  if (tabPaste) tabPaste.addEventListener('click', function() { setTab('paste'); });
  if (tabSnippets) tabSnippets.addEventListener('click', function() { setTab('snippets'); });

  storageGet(POPUP_DEFAULT_TAB_KEY).then(function(tab) {
    setTab(tab === 'snippets' ? 'snippets' : 'paste');
  });

  if (cpSearchInput) {
    cpSearchInput.addEventListener('input', function() { renderSnippetList(); });
  }

  const versionEl = document.getElementById('version-label');
  if (versionEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionEl.textContent = 'v' + (manifest.version || '');
  }
})();
