(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';

  const dot      = document.getElementById('statusDot');
  const statusEl = document.getElementById('status');
  const listEl   = document.getElementById('snippetList');
  const countEl  = document.getElementById('snippetCount');
  const exportBtn = document.getElementById('exportBtn');
  const zone     = document.getElementById('dropZone');

  // ── Storage helpers ────────────────────────────────────────────
  function storageApi() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) return chrome.storage.local;
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) return browser.storage.local;
    return null;
  }

  function loadSnippets(cb) {
    var api = storageApi();
    if (!api) { cb([]); return; }
    api.get([SNIPPETS_KEY], function (res) {
      var raw = res[SNIPPETS_KEY];
      cb(Array.isArray(raw) ? raw : []);
    });
  }

  function saveSnippets(snippets, cb) {
    var api = storageApi();
    if (!api) { if (cb) cb(); return; }
    var obj = {};
    obj[SNIPPETS_KEY] = snippets;
    api.set(obj, cb || function () {});
  }

  // ── Stat helpers ───────────────────────────────────────────────
  var statTotal  = document.getElementById('statTotal');
  var statRecent = document.getElementById('statRecent');
  var statSize   = document.getElementById('statSize');

  function updateStats(snippets) {
    if (statTotal)  statTotal.textContent  = snippets.length;
    if (statRecent) {
      var latest = snippets.reduce(function (max, s) {
        return (s.updatedAt || 0) > max ? (s.updatedAt || 0) : max;
      }, 0);
      if (latest) {
        var diff = Date.now() - latest;
        var mins = Math.floor(diff / 60000);
        var hrs  = Math.floor(diff / 3600000);
        var days = Math.floor(diff / 86400000);
        statRecent.textContent = days  > 0 ? days  + 'd'
                               : hrs   > 0 ? hrs   + 'h'
                               : mins  > 0 ? mins  + 'm'
                               : 'now';
      } else {
        statRecent.textContent = '—';
      }
    }
    if (statSize) {
      var bytes = new Blob([JSON.stringify(snippets)]).size;
      statSize.textContent = bytes < 1024 ? bytes + ' B'
                           : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB'
                           : (bytes / 1048576).toFixed(1) + ' MB';
    }
  }

  // ── Render list ────────────────────────────────────────────────
  function renderList(snippets) {
    countEl.textContent = snippets.length;
    updateStats(snippets);
    listEl.innerHTML = '';
    if (!snippets.length) {
      var empty = document.createElement('div');
      empty.className = 'snippet-empty';
      empty.textContent = 'No snippets yet — import a backup or add snippets from the extension popup.';
      listEl.appendChild(empty);
      return;
    }
    snippets.forEach(function (s) {
      listEl.appendChild(buildRow(s));
    });
  }

  function buildRow(snippet) {
    var row = document.createElement('div');
    row.className = 'snippet-row';
    row.dataset.id = snippet.id;

    // View
    var view = document.createElement('div');
    view.className = 'snippet-view';

    var info = document.createElement('div');
    info.className = 'snippet-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'snippet-name';
    nameEl.textContent = snippet.name || '(unnamed)';

    var preview = document.createElement('div');
    preview.className = 'snippet-preview';
    preview.textContent = snippet.text || '';

    info.appendChild(nameEl);
    info.appendChild(preview);

    var actions = document.createElement('div');
    actions.className = 'snippet-actions';

    var editBtn = document.createElement('button');
    editBtn.className = 'row-btn';
    editBtn.title = 'Edit';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>';

    var delBtn = document.createElement('button');
    delBtn.className = 'row-btn del';
    delBtn.title = 'Delete';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>';

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    view.appendChild(info);
    view.appendChild(actions);

    // Edit form
    var editForm = document.createElement('div');
    editForm.className = 'snippet-edit';

    var nameField = document.createElement('div');
    nameField.className = 'edit-field';
    nameField.innerHTML = '<label class="edit-label">Name</label>';
    var nameInput = document.createElement('input');
    nameInput.className = 'edit-input';
    nameInput.type = 'text';
    nameInput.value = snippet.name || '';
    nameField.appendChild(nameInput);

    var textField = document.createElement('div');
    textField.className = 'edit-field';
    textField.innerHTML = '<label class="edit-label">Text</label>';
    var textArea = document.createElement('textarea');
    textArea.className = 'edit-textarea';
    textArea.value = snippet.text || '';
    textField.appendChild(textArea);

    var editActions = document.createElement('div');
    editActions.className = 'edit-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-btn edit-btn-cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';

    var saveBtn = document.createElement('button');
    saveBtn.className = 'edit-btn edit-btn-save';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';

    editActions.appendChild(cancelBtn);
    editActions.appendChild(saveBtn);
    editForm.appendChild(nameField);
    editForm.appendChild(textField);
    editForm.appendChild(editActions);

    row.appendChild(view);
    row.appendChild(editForm);

    // Events
    editBtn.addEventListener('click', function () {
      var opening = !row.classList.contains('editing');
      row.classList.toggle('editing');
      if (opening) { nameInput.focus(); nameInput.select(); }
    });

    cancelBtn.addEventListener('click', function () {
      nameInput.value = snippet.name || '';
      textArea.value  = snippet.text || '';
      row.classList.remove('editing');
    });

    saveBtn.addEventListener('click', function () {
      var newName = nameInput.value.trim();
      var newText = textArea.value;
      if (!newName && !newText) return;
      loadSnippets(function (current) {
        var updated = current.map(function (s) {
          if (s.id !== snippet.id) return s;
          return { id: s.id, name: newName || 'Snippet', text: newText, updatedAt: Date.now() };
        });
        saveSnippets(updated, function () {
          snippet.name = newName || 'Snippet';
          snippet.text = newText;
          nameEl.textContent = snippet.name;
          preview.textContent = snippet.text;
          row.classList.remove('editing');
        });
      });
    });

    delBtn.addEventListener('click', function () {
      loadSnippets(function (current) {
        var remaining = current.filter(function (s) { return s.id !== snippet.id; });
        saveSnippets(remaining, function () { renderList(remaining); });
      });
    });

    return row;
  }

  // ── Export ─────────────────────────────────────────────────────
  exportBtn.addEventListener('click', function () {
    loadSnippets(function (snippets) {
      if (!snippets.length) return;
      var json = JSON.stringify(snippets, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'pve-snippets-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // ── Drag-over highlight ────────────────────────────────────────
  zone.addEventListener('dragover',  function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function ()  { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop',      function ()  { zone.classList.remove('drag-over'); });

  // ── Status dot sync ────────────────────────────────────────────
  var obs = new MutationObserver(function () {
    dot.className = 'status-dot ' + statusEl.className;
  });
  obs.observe(statusEl, { attributes: true, attributeFilter: ['class'] });

  // ── Reload list when import.js writes to storage ───────────────
  var api = storageApi();
  if (api && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes[SNIPPETS_KEY]) {
        var newValue = changes[SNIPPETS_KEY].newValue;
        renderList(Array.isArray(newValue) ? newValue : []);
      }
    });
  }

  // ── Initial load ───────────────────────────────────────────────
  loadSnippets(renderList);

})();
