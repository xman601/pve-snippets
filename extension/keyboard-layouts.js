// PVE Snippets - Keyboard layout tables
// Loaded before content.js as a sibling content script (see manifest.json), so these
// declarations share the same per-frame scope and are available as globals there.
// Also loaded directly by dev/mock-console.js so the test harness can never drift from
// what the extension actually ships.

// Map a character to the DOM KeyboardEvent {code, shift, altGr} that a real keyboard
// in a given layout would use to physically produce it, so noVNC/the guest OS (which may
// resolve input from the physical code+modifiers, not just `key`) sees the right keystroke.
function buildUsLayout() {
  const layout = {};
  for (let i = 0; i <= 9; i++) layout[String(i)] = { code: 'Digit' + i, shift: false };
  for (let c = 65; c <= 90; c++) {
    const upper = String.fromCharCode(c);
    layout[upper.toLowerCase()] = { code: 'Key' + upper, shift: false };
    layout[upper] = { code: 'Key' + upper, shift: true };
  }
  layout[' '] = { code: 'Space', shift: false };
  layout['\n'] = layout['\r'] = { code: 'Enter', shift: false };
  const unshifted = {
    '`': 'Backquote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft',
    ']': 'BracketRight', '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote',
    ',': 'Comma', '.': 'Period', '/': 'Slash'
  };
  Object.keys(unshifted).forEach((ch) => { layout[ch] = { code: unshifted[ch], shift: false }; });
  const shifted = {
    '~': 'Backquote', '!': 'Digit1', '@': 'Digit2', '#': 'Digit3',
    '$': 'Digit4', '%': 'Digit5', '^': 'Digit6', '&': 'Digit7',
    '*': 'Digit8', '(': 'Digit9', ')': 'Digit0', '_': 'Minus',
    '+': 'Equal', '{': 'BracketLeft', '}': 'BracketRight', '|': 'Backslash',
    ':': 'Semicolon', '"': 'Quote', '<': 'Comma', '>': 'Period', '?': 'Slash'
  };
  Object.keys(shifted).forEach((ch) => { layout[ch] = { code: shifted[ch], shift: true }; });
  return layout;
}

// `overrides[ch] === null` removes ch's inherited US mapping instead of replacing it —
// for characters (like German dead-key accents) with no faithful single-keystroke mapping,
// this avoids silently colliding with whichever character legitimately owns that physical key.
function buildLayout(overrides) {
  const layout = buildUsLayout();
  Object.keys(overrides).forEach((ch) => {
    if (overrides[ch] === null) delete layout[ch];
    else layout[ch] = overrides[ch];
  });
  return layout;
}

// UK QWERTY: " and @ swap places with the US layout, plus a £ symbol and an extra ISO key.
const UK_LAYOUT = buildLayout({
  '"': { code: 'Digit2', shift: true },
  '@': { code: 'Quote', shift: true },
  "'": { code: 'Quote', shift: false },
  '£': { code: 'Digit3', shift: true },
  '#': { code: 'Backslash', shift: false },
  '~': { code: 'Backslash', shift: true },
  '\\': { code: 'IntlBackslash', shift: false },
  '|': { code: 'IntlBackslash', shift: true }
});

// German QWERTZ: y/z swapped, umlauts/ß on their own keys, shifted digit row differs, AltGr symbols.
const DE_LAYOUT = buildLayout({
  'z': { code: 'KeyY', shift: false }, 'Z': { code: 'KeyY', shift: true },
  'y': { code: 'KeyZ', shift: false }, 'Y': { code: 'KeyZ', shift: true },
  'ü': { code: 'BracketLeft', shift: false }, 'Ü': { code: 'BracketLeft', shift: true },
  'ö': { code: 'Semicolon', shift: false }, 'Ö': { code: 'Semicolon', shift: true },
  'ä': { code: 'Quote', shift: false }, 'Ä': { code: 'Quote', shift: true },
  'ß': { code: 'Minus', shift: false }, '?': { code: 'Minus', shift: true },
  '"': { code: 'Digit2', shift: true }, '§': { code: 'Digit3', shift: true },
  '&': { code: 'Digit6', shift: true }, '/': { code: 'Digit7', shift: true },
  '(': { code: 'Digit8', shift: true }, ')': { code: 'Digit9', shift: true },
  '=': { code: 'Digit0', shift: true },
  '+': { code: 'BracketRight', shift: false }, '*': { code: 'BracketRight', shift: true },
  '#': { code: 'Backslash', shift: false }, "'": { code: 'Backslash', shift: true },
  '<': { code: 'IntlBackslash', shift: false }, '>': { code: 'IntlBackslash', shift: true },
  ',': { code: 'Comma', shift: false }, ';': { code: 'Comma', shift: true },
  '.': { code: 'Period', shift: false }, ':': { code: 'Period', shift: true },
  '-': { code: 'Slash', shift: false }, '_': { code: 'Slash', shift: true },
  '@': { code: 'KeyQ', shift: false, altGr: true },
  '€': { code: 'KeyE', shift: false, altGr: true },
  '{': { code: 'Digit7', shift: false, altGr: true },
  '[': { code: 'Digit8', shift: false, altGr: true },
  ']': { code: 'Digit9', shift: false, altGr: true },
  '}': { code: 'Digit0', shift: false, altGr: true },
  '\\': { code: 'Minus', shift: false, altGr: true },
  '|': { code: 'IntlBackslash', shift: false, altGr: true },
  '~': { code: 'BracketRight', shift: false, altGr: true },
  // German ^ is a dead key (Backquote) with no faithful single-keystroke mapping; leaving
  // it inherited from the US table would wrongly collide with '&' at Digit6+Shift.
  '^': null
});

// French AZERTY: a/q, z/w and m/; swapped, digits need Shift, AltGr symbols on the number row.
const FR_LAYOUT = buildLayout({
  'a': { code: 'KeyQ', shift: false }, 'A': { code: 'KeyQ', shift: true },
  'q': { code: 'KeyA', shift: false }, 'Q': { code: 'KeyA', shift: true },
  'z': { code: 'KeyW', shift: false }, 'Z': { code: 'KeyW', shift: true },
  'w': { code: 'KeyZ', shift: false }, 'W': { code: 'KeyZ', shift: true },
  'm': { code: 'Semicolon', shift: false }, 'M': { code: 'Semicolon', shift: true },
  '1': { code: 'Digit1', shift: true }, '&': { code: 'Digit1', shift: false },
  '2': { code: 'Digit2', shift: true }, 'é': { code: 'Digit2', shift: false },
  '3': { code: 'Digit3', shift: true }, '"': { code: 'Digit3', shift: false },
  '4': { code: 'Digit4', shift: true }, "'": { code: 'Digit4', shift: false },
  '5': { code: 'Digit5', shift: true }, '(': { code: 'Digit5', shift: false },
  '6': { code: 'Digit6', shift: true }, '-': { code: 'Digit6', shift: false },
  '7': { code: 'Digit7', shift: true }, 'è': { code: 'Digit7', shift: false },
  '8': { code: 'Digit8', shift: true }, '_': { code: 'Digit8', shift: false },
  '9': { code: 'Digit9', shift: true }, 'ç': { code: 'Digit9', shift: false },
  '0': { code: 'Digit0', shift: true }, 'à': { code: 'Digit0', shift: false },
  ')': { code: 'Minus', shift: false }, '°': { code: 'Minus', shift: true },
  '=': { code: 'Equal', shift: false }, '+': { code: 'Equal', shift: true },
  '$': { code: 'BracketRight', shift: false }, '£': { code: 'BracketRight', shift: true },
  'ù': { code: 'Quote', shift: false }, '%': { code: 'Quote', shift: true },
  '*': { code: 'Backslash', shift: false }, 'µ': { code: 'Backslash', shift: true },
  '<': { code: 'IntlBackslash', shift: false }, '>': { code: 'IntlBackslash', shift: true },
  ',': { code: 'KeyM', shift: false }, '?': { code: 'KeyM', shift: true },
  ';': { code: 'Comma', shift: false }, '.': { code: 'Comma', shift: true },
  ':': { code: 'Period', shift: false }, '/': { code: 'Period', shift: true },
  '!': { code: 'Slash', shift: false }, '§': { code: 'Slash', shift: true },
  '~': { code: 'Digit2', shift: false, altGr: true },
  '#': { code: 'Digit3', shift: false, altGr: true },
  '{': { code: 'Digit4', shift: false, altGr: true },
  '[': { code: 'Digit5', shift: false, altGr: true },
  '|': { code: 'Digit6', shift: false, altGr: true },
  '`': { code: 'Digit7', shift: false, altGr: true },
  '\\': { code: 'Digit8', shift: false, altGr: true },
  '^': { code: 'Digit9', shift: false, altGr: true },
  '@': { code: 'Digit0', shift: false, altGr: true },
  ']': { code: 'Minus', shift: false, altGr: true },
  '}': { code: 'Equal', shift: false, altGr: true },
  '€': { code: 'KeyE', shift: false, altGr: true }
});

const DEFAULT_KEYBOARD_LAYOUT = 'us';
const KEYBOARD_LAYOUTS = { us: buildUsLayout(), uk: UK_LAYOUT, de: DE_LAYOUT, fr: FR_LAYOUT };

// Resolve a character to {code, shift, altGr} for the given layout table, with a
// best-effort fallback for characters the table doesn't cover (key/keyCode still carry
// the real character, so keysym-based interpreters resolve it correctly either way).
function resolveKey(layoutTable, char) {
  const entry = layoutTable[char];
  if (entry) return entry;
  const c = char.charCodeAt(0);
  return { code: (c >= 32 && c <= 126 ? 'Key' + char.toUpperCase() : 'KeyA'), shift: false, altGr: false };
}
