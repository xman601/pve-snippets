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
//
// `overrides[ch]` can also be an array of two keystrokes `[deadKey, baseKey]` instead of a
// single one, for a character that's composed from a dead key on the real keyboard (e.g.
// Spanish "á" = press-release the dead-acute key, then press-release 'a') rather than
// produced by one physical key. See resolveKey()'s comment below for how callers consume this.
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

// Spanish (Spain) ISO QWERTY -- corrected against the actual XKB symbol definitions
// (/usr/share/X11/xkb/symbols/es) from a real Ubuntu VM, after the first draft's guessed
// positions turned out wrong (verified live: dead keys landed at the wrong physical key,
// e.g. the acute dead key was assumed at BracketLeft but is really at Quote -- BracketLeft
// is actually a *grave* dead key on real Spanish hardware, which is why "á" came out as
// "à" in testing). Letters/digits are unchanged from US.
//
// Covered: ñ/Ñ, ç/Ç (both dedicated keys), the acute/diaeresis dead keys for á é í ó ú/ü,
// and apostrophe/question/hyphen/underscore, which also relocate on real Spanish hardware.
// Still NOT covered (unverified, safely skipped rather than guessed): ¿/¡, backslash/pipe,
// and the digit-row AltGr layer -- Spanish moves ;/: off Semicolon too, but where they
// land wasn't needed for the accent-focused test pass, so they're nulled (skipped) rather
// than asserted without verification.
const ES_ACUTE = { code: 'Quote', shift: false };
const ES_DIAERESIS = { code: 'Quote', shift: true };
const ES_LAYOUT = buildLayout({
  'ñ': { code: 'Semicolon', shift: false }, 'Ñ': { code: 'Semicolon', shift: true },
  'ç': { code: 'Backslash', shift: false }, 'Ç': { code: 'Backslash', shift: true },
  'á': [ES_ACUTE, { code: 'KeyA', shift: false }], 'Á': [ES_ACUTE, { code: 'KeyA', shift: true }],
  'é': [ES_ACUTE, { code: 'KeyE', shift: false }], 'É': [ES_ACUTE, { code: 'KeyE', shift: true }],
  'í': [ES_ACUTE, { code: 'KeyI', shift: false }], 'Í': [ES_ACUTE, { code: 'KeyI', shift: true }],
  'ó': [ES_ACUTE, { code: 'KeyO', shift: false }], 'Ó': [ES_ACUTE, { code: 'KeyO', shift: true }],
  'ú': [ES_ACUTE, { code: 'KeyU', shift: false }], 'Ú': [ES_ACUTE, { code: 'KeyU', shift: true }],
  'ü': [ES_DIAERESIS, { code: 'KeyU', shift: false }], 'Ü': [ES_DIAERESIS, { code: 'KeyU', shift: true }],
  "'": { code: 'Minus', shift: false }, '?': { code: 'Minus', shift: true },
  '-': { code: 'Slash', shift: false }, '_': { code: 'Slash', shift: true },
  // These US-inherited characters no longer live at these physical positions on real
  // Spanish hardware (confirmed from the XKB dump) -- null them so a request to type them
  // is safely skipped instead of silently sending the now-wrong keystroke.
  ';': null, ':': null, '"': null, '[': null, '{': null,
  ']': null, '}': null, '`': null, '~': null, '\\': null, '|': null, '/': null,
  '=': null, '+': null
});

// Italian ISO QWERTY -- corrected against the actual XKB symbol definitions
// (/usr/share/X11/xkb/symbols/it) from a real Ubuntu VM, after the first draft's guessed
// positions turned out wrong across the board (verified live: e.g. "città" came out as
// "citt\", confirming à wasn't actually at Backquote). Letters/digits unchanged from US.
//
// Covered: the five core accented vowels (à è ì ò ù, dedicated keys, not dead-key
// composed), ç/§/°, and the punctuation that was displaced by them (< > ; : + *), moved to
// their real physical homes rather than left silently wrong. Still NOT covered: the
// digit-row AltGr layer and parenthesis/percent shifts, which weren't needed for the
// accent-focused test pass.
const IT_LAYOUT = buildLayout({
  'è': { code: 'BracketLeft', shift: false }, 'é': { code: 'BracketLeft', shift: true },
  'ì': { code: 'Equal', shift: false }, '^': { code: 'Equal', shift: true },
  'ò': { code: 'Semicolon', shift: false }, 'ç': { code: 'Semicolon', shift: true },
  'à': { code: 'Quote', shift: false }, '°': { code: 'Quote', shift: true },
  'ù': { code: 'Backslash', shift: false }, '§': { code: 'Backslash', shift: true },
  '\\': { code: 'Backquote', shift: false }, '|': { code: 'Backquote', shift: true },
  '+': { code: 'BracketRight', shift: false }, '*': { code: 'BracketRight', shift: true },
  ';': { code: 'Comma', shift: true }, ':': { code: 'Period', shift: true },
  '<': { code: 'IntlBackslash', shift: false }, '>': { code: 'IntlBackslash', shift: true },
  // No longer produced by these positions on real Italian hardware (confirmed) -- null
  // rather than leave the stale, now-wrong US-inherited keystroke. ' and " are included
  // here because à/° now occupy their physical key (Quote) -- without nulling them, the
  // inherited US entries collided with à/°, so requesting either ' or " would have silently
  // sent the à/° keystroke instead.
  '[': null, '{': null, ']': null, '}': null, '`': null, '~': null, '=': null,
  "'": null, '"': null
});

// Portuguese (Portugal) ISO QWERTY -- corrected against the actual XKB symbol definitions
// (/usr/share/X11/xkb/symbols/pt) from a real Ubuntu VM, after the first draft's guessed
// dead-key positions turned out wrong (verified live: "ã" came out as "à", confirming the
// tilde dead key wasn't actually at BracketRight+shift). Letters/digits unchanged from US.
//
// Covered: ç/Ç (dedicated key), the four dead keys (acute/grave/tilde/circumflex) for the
// vowel forms Portuguese actually uses, and backslash/pipe, which relocate to Backquote on
// real Portuguese hardware. Still NOT covered: the digit-row AltGr layer, which wasn't
// needed for the accent-focused test pass.
const PT_ACUTE = { code: 'BracketRight', shift: false };
const PT_GRAVE = { code: 'BracketRight', shift: true };
const PT_TILDE = { code: 'Backslash', shift: false };
const PT_CIRCUMFLEX = { code: 'Backslash', shift: true };
const PT_LAYOUT = buildLayout({
  'ç': { code: 'Semicolon', shift: false }, 'Ç': { code: 'Semicolon', shift: true },
  '\\': { code: 'Backquote', shift: false }, '|': { code: 'Backquote', shift: true },
  '+': { code: 'BracketLeft', shift: false }, '*': { code: 'BracketLeft', shift: true },
  'á': [PT_ACUTE, { code: 'KeyA', shift: false }], 'Á': [PT_ACUTE, { code: 'KeyA', shift: true }],
  'é': [PT_ACUTE, { code: 'KeyE', shift: false }], 'É': [PT_ACUTE, { code: 'KeyE', shift: true }],
  'í': [PT_ACUTE, { code: 'KeyI', shift: false }], 'Í': [PT_ACUTE, { code: 'KeyI', shift: true }],
  'ó': [PT_ACUTE, { code: 'KeyO', shift: false }], 'Ó': [PT_ACUTE, { code: 'KeyO', shift: true }],
  'ú': [PT_ACUTE, { code: 'KeyU', shift: false }], 'Ú': [PT_ACUTE, { code: 'KeyU', shift: true }],
  'à': [PT_GRAVE, { code: 'KeyA', shift: false }], 'À': [PT_GRAVE, { code: 'KeyA', shift: true }],
  'â': [PT_CIRCUMFLEX, { code: 'KeyA', shift: false }], 'Â': [PT_CIRCUMFLEX, { code: 'KeyA', shift: true }],
  'ê': [PT_CIRCUMFLEX, { code: 'KeyE', shift: false }], 'Ê': [PT_CIRCUMFLEX, { code: 'KeyE', shift: true }],
  'ô': [PT_CIRCUMFLEX, { code: 'KeyO', shift: false }], 'Ô': [PT_CIRCUMFLEX, { code: 'KeyO', shift: true }],
  'ã': [PT_TILDE, { code: 'KeyA', shift: false }], 'Ã': [PT_TILDE, { code: 'KeyA', shift: true }],
  'õ': [PT_TILDE, { code: 'KeyO', shift: false }], 'Õ': [PT_TILDE, { code: 'KeyO', shift: true }],
  // No longer produced by these positions on real Portuguese hardware (confirmed) -- null
  // rather than leave the stale, now-wrong US-inherited keystroke.
  ';': null, ':': null, '[': null, '{': null, ']': null, '}': null, '`': null, '~': null,
  '=': null
});

// Dutch (Netherlands) QWERTY -- corrected against the actual XKB symbol definitions
// (/usr/share/X11/xkb/symbols/nl) from a real Ubuntu VM, after the first draft's guessed
// dead-key positions and pairings turned out wrong (verified live: "é" came out as "ë",
// confirming BracketLeft-unshifted is a *diaeresis* dead key, not acute). Letters/digits
// unchanged from US.
//
// Covered: the acute dead key (at Quote) for á é í ó ú, and the diaeresis dead key (at
// BracketLeft) for ë ï ö ü. Still NOT covered: dead_grave/dead_circumflex (also present on
// this layout but not needed for the accent-focused test pass), and the digit-row/comma-
// period relocations, which real Dutch hardware also has but weren't verified here.
const NL_ACUTE = { code: 'Quote', shift: false };
const NL_DIAERESIS = { code: 'BracketLeft', shift: false };
const NL_LAYOUT = buildLayout({
  'á': [NL_ACUTE, { code: 'KeyA', shift: false }], 'Á': [NL_ACUTE, { code: 'KeyA', shift: true }],
  'é': [NL_ACUTE, { code: 'KeyE', shift: false }], 'É': [NL_ACUTE, { code: 'KeyE', shift: true }],
  'í': [NL_ACUTE, { code: 'KeyI', shift: false }], 'Í': [NL_ACUTE, { code: 'KeyI', shift: true }],
  'ó': [NL_ACUTE, { code: 'KeyO', shift: false }], 'Ó': [NL_ACUTE, { code: 'KeyO', shift: true }],
  'ú': [NL_ACUTE, { code: 'KeyU', shift: false }], 'Ú': [NL_ACUTE, { code: 'KeyU', shift: true }],
  'ë': [NL_DIAERESIS, { code: 'KeyE', shift: false }], 'Ë': [NL_DIAERESIS, { code: 'KeyE', shift: true }],
  'ï': [NL_DIAERESIS, { code: 'KeyI', shift: false }], 'Ï': [NL_DIAERESIS, { code: 'KeyI', shift: true }],
  'ö': [NL_DIAERESIS, { code: 'KeyO', shift: false }], 'Ö': [NL_DIAERESIS, { code: 'KeyO', shift: true }],
  'ü': [NL_DIAERESIS, { code: 'KeyU', shift: false }], 'Ü': [NL_DIAERESIS, { code: 'KeyU', shift: true }],
  // No longer produced by these positions on real Dutch hardware (confirmed) -- null
  // rather than leave the stale, now-wrong US-inherited keystroke. Semicolon is actually
  // +/± (plusminus) on real Dutch hardware, not ;/: -- caught live when ":" came out as "±".
  "'": null, '"': null, '[': null, '{': null, '`': null, '~': null, '=': null,
  ';': null, ':': null
});

const DEFAULT_KEYBOARD_LAYOUT = 'us';
const KEYBOARD_LAYOUTS = {
  us: buildUsLayout(), uk: UK_LAYOUT, de: DE_LAYOUT, fr: FR_LAYOUT,
  es: ES_LAYOUT, it: IT_LAYOUT, pt: PT_LAYOUT, nl: NL_LAYOUT
};
// Layouts that ship as an existing physical layout under a different regional name get
// aliased to that table rather than duplicated -- zero new data, zero new risk. This is
// also the pattern to follow for any future "same keyboard, different label" addition.
KEYBOARD_LAYOUTS.ca = KEYBOARD_LAYOUTS.us;     // Canadian English keyboards are US ANSI
KEYBOARD_LAYOUTS.aunz = KEYBOARD_LAYOUTS.uk;   // Australian/NZ keyboards are UK ISO
KEYBOARD_LAYOUTS.ie = KEYBOARD_LAYOUTS.uk;     // Irish keyboards are UK ISO

// Display name shown in the Settings dropdown and the mock console's guest-layout picker --
// the single source both UIs generate their <option> list from (see settings.js /
// dev/mock-console.js), so adding a layout here is enough to make it selectable everywhere.
const KEYBOARD_LAYOUT_LABELS = {
  us: 'US QWERTY',
  uk: 'UK QWERTY',
  de: 'German QWERTZ',
  fr: 'French AZERTY',
  es: 'Spanish QWERTY',
  it: 'Italian QWERTY',
  pt: 'Portuguese QWERTY',
  nl: 'Dutch QWERTY',
  ca: 'Canadian English (= US)',
  aunz: 'Australian / NZ (= UK)',
  ie: 'Irish (= UK)'
};

// Locale prefixes (from navigator.language) mapped to a first-run layout guess, checked in
// order -- more specific prefixes (e.g. 'en-gb') must come before shorter ones that would
// also match (e.g. bare 'en') so they aren't shadowed. Single source for background.js's
// install-time guess and settings.js's guess, so a new layout's locale mapping only needs
// adding once.
const KEYBOARD_LAYOUT_LOCALE_GUESSES = [
  ['en-gb', 'uk'], ['en-ie', 'ie'], ['en-au', 'aunz'], ['en-nz', 'aunz'], ['en-ca', 'ca'],
  ['fr', 'fr'], ['de', 'de'], ['es', 'es'], ['it', 'it'], ['pt', 'pt'], ['nl', 'nl']
];

function guessKeyboardLayoutFromLocale(lang) {
  const l = (lang || '').toLowerCase();
  for (let i = 0; i < KEYBOARD_LAYOUT_LOCALE_GUESSES.length; i++) {
    if (l.startsWith(KEYBOARD_LAYOUT_LOCALE_GUESSES[i][0])) return KEYBOARD_LAYOUT_LOCALE_GUESSES[i][1];
  }
  return DEFAULT_KEYBOARD_LAYOUT;
}

// Resolve a character to a keystroke, or undefined if this layout has no way to produce it
// (e.g. a dead-key gap like German '^' -- see its comment above). Callers must skip the
// character rather than invent a code: a fabricated {code, keyCode} pair that doesn't
// correspond to any real physical key isn't just ignored by real VNC/guest keyboard stacks
// the way a missing entry is -- it can be silently reinterpreted as a *different*, wrong
// character (confirmed against a real VM: German '^', with no table entry, came out as '6').
//
// The return value is either:
//  - a single keystroke {code, shift, altGr} -- one physical key press produces the char, or
//  - an array of two keystrokes [deadKey, baseKey] -- the char is composed from a dead key
//    (e.g. Spanish "á" = dead-acute then 'a') the way a real keyboard would, relying on the
//    guest OS's own dead-key composition to combine them. Callers must send both keystrokes
//    in order; see sendChar() in content.js.
function resolveKey(layoutTable, char) {
  return layoutTable[char];
}
