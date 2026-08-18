(function () {
  'use strict';

  const SNIPPETS_KEY = 'pmx_snippets_v1';
  const AUTO_ENTER_KEY = 'pmx_auto_enter';
  const KEYSTROKE_DELAY_KEY = 'pmx_keystroke_delay_ms';
  const FIRST_CHAR_DELAY_KEY = 'pmx_first_char_delay_ms';
  const ENTER_DELAY_KEY = 'pmx_enter_delay_ms';
  const SHORTCUT_PASTE_ENABLED_KEY = 'pmx_shortcut_paste_enabled';
  const POPUP_DEFAULT_TAB_KEY = 'pmx_popup_default_tab';
  const PANEL_OPEN_KEY = 'pmx_panel_open_by_default';
  const PANEL_POSITION_KEY = 'pmx_panel_position';
  const COMPAT_MODE_KEY = 'pmx_compat_mode';
  const KEYBOARD_LAYOUT_KEY = 'pmx_keyboard_layout';
  const KEYBOARD_LAYOUT_USER_SET_KEY = 'pmx_keyboard_layout_user_set';
  const KEYBOARD_LAYOUTS = ['us', 'uk', 'de', 'fr'];
  const MAX_SNIPPETS = 200;
  const DEFAULT_KEYSTROKE_DELAY_MS = 20;
  const DEFAULT_FIRST_CHAR_DELAY_MS = 40;
  const DEFAULT_ENTER_DELAY_MS = 0;

  const fileInput = document.getElementById('file');
  const statusEl = document.getElementById('status');
  const settingsAutoEnter = document.getElementById('settings-auto-enter');
  const settingsKeystrokeDelay = document.getElementById('settings-keystroke-delay');
  const settingsFirstCharDelay = document.getElementById('settings-first-char-delay');
  const settingsEnterDelay = document.getElementById('settings-enter-delay');
  const settingsCompatMode = document.getElementById('settings-compat-mode');
  const settingsShortcutPaste = document.getElementById('settings-shortcut-paste');
  const settingsPopupDefaultTab = document.getElementById('settings-popup-default-tab');
  const settingsPanelOpen = document.getElementById('settings-panel-open');
  const settingsPanelPosition = document.getElementById('settings-panel-position');
  const settingsKeyboardLayout = document.getElementById('settings-keyboard-layout');
  const settingsKeyboardLayoutNote = document.getElementById('settings-keyboard-layout-note');
  function storageGet(key) {
    return new Promise(function (resolve) {
      try {
        const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
          ? chrome.storage.local
          : typeof browser !== 'undefined' && browser.storage && browser.storage.local
            ? browser.storage.local
            : null;
        if (api) {
          api.get([key], function (res) { resolve(res[key]); });
          return;
        }
      } catch (_) {}
      resolve(undefined);
    });
  }

  function storageSet(key, value) {
    return new Promise(function (resolve) {
      try {
        const api = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
          ? chrome.storage.local
          : typeof browser !== 'undefined' && browser.storage && browser.storage.local
            ? browser.storage.local
            : null;
        if (api) {
          api.set({ [key]: value }, resolve);
          return;
        }
      } catch (_) {}
      resolve();
    });
  }

  // Settings sync via chrome.storage.sync (falls back to local storage when sync is
  // unavailable -- e.g. Firefox without Sync signed in, or sync disabled by policy/quota).
  // Snippets are never synced (chrome.storage.sync's 8KB-per-item / 100KB-total quota
  // is far too small for a snippet list) -- those stay on storageGet/storageSet + local.
  function getSyncApi() {
    try {
      return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync
        ? chrome.storage.sync
        : typeof browser !== 'undefined' && browser.storage && browser.storage.sync
          ? browser.storage.sync
          : null;
    } catch (_) { return null; }
  }

  function syncGet(key) {
    return new Promise(function (resolve) {
      const api = getSyncApi();
      if (!api) { storageGet(key).then(resolve); return; }
      try {
        api.get([key], function (res) {
          const err = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError;
          if (err || res[key] === undefined) {
            // Not synced yet -- fall back to (and migrate up) any pre-existing local value.
            storageGet(key).then(function (localVal) {
              if (!err && localVal !== undefined) syncSet(key, localVal);
              resolve(localVal);
            });
            return;
          }
          resolve(res[key]);
        });
      } catch (_) { storageGet(key).then(resolve); }
    });
  }

  function syncSet(key, value) {
    return new Promise(function (resolve) {
      const api = getSyncApi();
      if (!api) { storageSet(key, value).then(resolve); return; }
      try {
        api.set({ [key]: value }, function () {
          const err = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError;
          if (err) { storageSet(key, value).then(resolve); return; }
          resolve();
        });
      } catch (_) { storageSet(key, value).then(resolve); }
    });
  }

  // Best-effort guesses at the layout of the machine running the browser — used only to
  // pre-fill a first-run default, never to override an explicit user choice.
  function detectLayoutFromLanguage() {
    const lang = (navigator.language || (navigator.languages && navigator.languages[0])) || '';
    const l = lang.toLowerCase();
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('de')) return 'de';
    if (l === 'en-gb' || l.startsWith('en-gb')) return 'uk';
    return 'us';
  }

  // More accurate than locale, but Chrome/Edge only: inspects which characters the
  // physical keys actually produce on the current OS keyboard layout.
  function detectLayoutFromKeyboardMap() {
    if (!navigator.keyboard || !navigator.keyboard.getLayoutMap) return Promise.resolve(null);
    return navigator.keyboard.getLayoutMap().then(function (map) {
      if (map.get('KeyQ') === 'a') return 'fr';
      if (map.get('KeyY') === 'z') return 'de';
      if (map.get('Backslash') === '#') return 'uk';
      return 'us';
    }).catch(function () { return null; });
  }

  function loadSettings() {
    Promise.all([
      syncGet(AUTO_ENTER_KEY),
      syncGet(KEYSTROKE_DELAY_KEY),
      syncGet(FIRST_CHAR_DELAY_KEY),
      syncGet(ENTER_DELAY_KEY),
      syncGet(COMPAT_MODE_KEY),
      syncGet(SHORTCUT_PASTE_ENABLED_KEY),
      syncGet(POPUP_DEFAULT_TAB_KEY),
      syncGet(PANEL_OPEN_KEY),
      syncGet(PANEL_POSITION_KEY),
      syncGet(KEYBOARD_LAYOUT_KEY),
      syncGet(KEYBOARD_LAYOUT_USER_SET_KEY)
    ]).then(function (results) {
      if (settingsAutoEnter) settingsAutoEnter.checked = Boolean(results[0]);
      if (settingsKeystrokeDelay) {
        const n = Number(results[1]);
        const ms = Number.isFinite(n) && n >= 0 ? Math.min(500, n) : DEFAULT_KEYSTROKE_DELAY_MS;
        settingsKeystrokeDelay.value = String(ms);
      }
      if (settingsFirstCharDelay) {
        const n = Number(results[2]);
        const ms = Number.isFinite(n) && n >= 0 ? Math.min(1000, n) : DEFAULT_FIRST_CHAR_DELAY_MS;
        settingsFirstCharDelay.value = String(ms);
      }
      if (settingsEnterDelay) {
        const n = Number(results[3]);
        const ms = Number.isFinite(n) && n >= 0 ? Math.min(300, n) : DEFAULT_ENTER_DELAY_MS;
        settingsEnterDelay.value = String(ms);
      }
      if (settingsCompatMode) settingsCompatMode.checked = Boolean(results[4]);
      if (settingsShortcutPaste) settingsShortcutPaste.checked = results[5] !== false;
      if (settingsPopupDefaultTab) settingsPopupDefaultTab.value = (results[6] === 'snippets' ? 'snippets' : 'paste');
      if (settingsPanelOpen) settingsPanelOpen.checked = Boolean(results[7]);
      if (settingsPanelPosition) {
        const pos = results[8];
        const v = (pos === 'bottom-left' || pos === 'top-right' || pos === 'top-left') ? pos : 'bottom-right';
        settingsPanelPosition.value = v;
      }
      if (settingsKeyboardLayout) {
        const layout = results[9];
        const userSet = Boolean(results[10]);
        settingsKeyboardLayout.value = KEYBOARD_LAYOUTS.includes(layout) ? layout : 'us';
        if (settingsKeyboardLayoutNote) settingsKeyboardLayoutNote.style.display = (!userSet && layout) ? 'block' : 'none';
        if (!userSet) {
          detectLayoutFromKeyboardMap().then(function (detected) {
            if (!detected || detected === settingsKeyboardLayout.value) return;
            settingsKeyboardLayout.value = detected;
            syncSet(KEYBOARD_LAYOUT_KEY, detected);
            if (settingsKeyboardLayoutNote) settingsKeyboardLayoutNote.style.display = 'block';
          });
        }
      }
    });
  }

  if (settingsAutoEnter) {
    settingsAutoEnter.addEventListener('change', function () {
      syncSet(AUTO_ENTER_KEY, settingsAutoEnter.checked);
    });
  }
  if (settingsKeystrokeDelay) {
    settingsKeystrokeDelay.addEventListener('change', function () {
      const val = Math.max(0, Math.min(500, Number(settingsKeystrokeDelay.value) || DEFAULT_KEYSTROKE_DELAY_MS));
      syncSet(KEYSTROKE_DELAY_KEY, val);
      settingsKeystrokeDelay.value = String(val);
    });
    settingsKeystrokeDelay.addEventListener('input', function () {
      const val = Math.max(0, Math.min(500, Number(settingsKeystrokeDelay.value) || DEFAULT_KEYSTROKE_DELAY_MS));
      syncSet(KEYSTROKE_DELAY_KEY, val);
    });
  }
  if (settingsFirstCharDelay) {
    settingsFirstCharDelay.addEventListener('change', function () {
      const val = Math.max(0, Math.min(1000, Number(settingsFirstCharDelay.value) || DEFAULT_FIRST_CHAR_DELAY_MS));
      syncSet(FIRST_CHAR_DELAY_KEY, val);
      settingsFirstCharDelay.value = String(val);
    });
    settingsFirstCharDelay.addEventListener('input', function () {
      const val = Math.max(0, Math.min(1000, Number(settingsFirstCharDelay.value) || DEFAULT_FIRST_CHAR_DELAY_MS));
      syncSet(FIRST_CHAR_DELAY_KEY, val);
    });
  }
  if (settingsEnterDelay) {
    settingsEnterDelay.addEventListener('change', function () {
      const val = Math.max(0, Math.min(300, Number(settingsEnterDelay.value) || DEFAULT_ENTER_DELAY_MS));
      syncSet(ENTER_DELAY_KEY, val);
      settingsEnterDelay.value = String(val);
    });
    settingsEnterDelay.addEventListener('input', function () {
      const val = Math.max(0, Math.min(300, Number(settingsEnterDelay.value) || DEFAULT_ENTER_DELAY_MS));
      syncSet(ENTER_DELAY_KEY, val);
    });
  }
  if (settingsCompatMode) {
    settingsCompatMode.addEventListener('change', function () {
      syncSet(COMPAT_MODE_KEY, settingsCompatMode.checked);
    });
  }
  if (settingsShortcutPaste) {
    settingsShortcutPaste.addEventListener('change', function () {
      syncSet(SHORTCUT_PASTE_ENABLED_KEY, settingsShortcutPaste.checked);
    });
  }
  if (settingsPopupDefaultTab) {
    settingsPopupDefaultTab.addEventListener('change', function () {
      syncSet(POPUP_DEFAULT_TAB_KEY, settingsPopupDefaultTab.value);
    });
  }
  if (settingsPanelOpen) {
    settingsPanelOpen.addEventListener('change', function () {
      syncSet(PANEL_OPEN_KEY, settingsPanelOpen.checked);
    });
  }
  if (settingsPanelPosition) {
    settingsPanelPosition.addEventListener('change', function () {
      syncSet(PANEL_POSITION_KEY, settingsPanelPosition.value);
    });
  }
  if (settingsKeyboardLayout) {
    settingsKeyboardLayout.addEventListener('change', function () {
      syncSet(KEYBOARD_LAYOUT_KEY, settingsKeyboardLayout.value);
      syncSet(KEYBOARD_LAYOUT_USER_SET_KEY, true);
      if (settingsKeyboardLayoutNote) settingsKeyboardLayoutNote.style.display = 'none';
    });
  }
  loadSettings();

  function setStatus(msg, isError) {
    if (statusEl) {
      statusEl.textContent = msg || '';
      statusEl.className = isError ? 'error' : (msg ? 'success' : '');
    }
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

  var dropZone = document.getElementById('dropZone');
  if (dropZone && fileInput) {
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !file.name.toLowerCase().endsWith('.json')) return;
      var dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  if (fileInput) {
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
          (function () {
            const capped = merged.slice(0, MAX_SNIPPETS);
            setSnippets(capped).then(function () {
              setStatus('Imported ' + normalized.length + ' snippet(s). Total: ' + capped.length + '.');
            });
          })();
        });
      };
      reader.onerror = function () {
        setStatus('Import failed: could not read file.', true);
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  // Sidebar nav: switch settings panel
  const PANEL_IDS = ['paste', 'backup', 'snippets'];
  function showPanel(panelId) {
    if (panelId === 'panel') panelId = 'paste';
    if (!PANEL_IDS.includes(panelId)) panelId = 'paste';
    document.querySelectorAll('.settings-nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-panel') === panelId);
      btn.setAttribute('aria-current', btn.classList.contains('active') ? 'page' : null);
    });
    document.querySelectorAll('.settings-panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + panelId);
    });
    try {
      window.history.replaceState(null, '', '#' + panelId);
    } catch (_) {}
  }
  document.querySelectorAll('.settings-nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showPanel(btn.getAttribute('data-panel') || 'paste');
    });
  });
  var hash = (window.location.hash || '').replace(/^#/, '');
  if (hash) showPanel(hash);

  const versionEl = document.getElementById('version-label');
  const runtime = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : typeof browser !== 'undefined' && browser.runtime ? browser.runtime : null;
  if (versionEl && runtime && runtime.getManifest) {
    const manifest = runtime.getManifest();
    versionEl.textContent = (manifest.version || '');
  }

  // Click-to-show tooltips for .setting-info
  (function () {
    var popover = document.createElement('div');
    popover.className = 'setting-info-popover';
    popover.setAttribute('role', 'tooltip');
    document.body.appendChild(popover);

    function hidePopover() {
      popover.classList.remove('visible');
    }

    function showPopover(text, anchor) {
      popover.textContent = text;
      popover.classList.add('visible');
      var rect = anchor.getBoundingClientRect();
      var popRect = popover.getBoundingClientRect();
      var gap = 6;
      var left = rect.left;
      var top = rect.bottom + gap;
      if (left + popRect.width > window.innerWidth) left = window.innerWidth - popRect.width - 8;
      if (left < 8) left = 8;
      if (top + popRect.height > window.innerHeight - 8) {
        top = rect.top - popRect.height - gap;
      }
      if (top < 8) top = 8;
      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    }

    document.querySelectorAll('.setting-info').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var text = el.getAttribute('title') || '';
        if (!text) return;
        if (popover.classList.contains('visible') && popover.textContent === text) {
          hidePopover();
          return;
        }
        showPopover(text, el);
      });
    });

    document.addEventListener('click', function () {
      hidePopover();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hidePopover();
    });
  })();
})();
