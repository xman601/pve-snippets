const test = require('node:test');
const assert = require('node:assert/strict');
const { loadKeyboardLayouts } = require('./helpers');

const {
  KEYBOARD_LAYOUTS, KEYBOARD_LAYOUT_LABELS, KEYBOARD_LAYOUT_LOCALE_GUESSES,
  DEFAULT_KEYBOARD_LAYOUT, guessKeyboardLayoutFromLocale, resolveKey
} = loadKeyboardLayouts();

const LAYOUT_IDS = Object.keys(KEYBOARD_LAYOUTS);

// Every physical key a layout table is allowed to reference.
const VALID_CODES = new Set([
  ...'0123456789'.split('').map((d) => 'Digit' + d),
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => 'Key' + c),
  'Space', 'Enter', 'Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight',
  'Backslash', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'IntlBackslash'
]);

function keystrokeId(k) {
  return `${k.code}${k.shift ? '+Shift' : ''}${k.altGr ? '+AltGr' : ''}`;
}

function entryId(entry) {
  return Array.isArray(entry) ? entry.map(keystrokeId).join(' then ') : keystrokeId(entry);
}

test('every layout has a label and every label has a layout', () => {
  assert.deepEqual(Object.keys(KEYBOARD_LAYOUT_LABELS).sort(), LAYOUT_IDS.slice().sort());
  assert.ok(KEYBOARD_LAYOUTS[DEFAULT_KEYBOARD_LAYOUT], 'default layout exists');
});

for (const id of LAYOUT_IDS) {
  const table = KEYBOARD_LAYOUTS[id];

  test(`${id}: entries are well-formed keystrokes on real keys`, () => {
    for (const [ch, entry] of Object.entries(table)) {
      const sequence = Array.isArray(entry) ? entry : [entry];
      if (Array.isArray(entry)) assert.equal(entry.length, 2, `${JSON.stringify(ch)} dead-key sequence is [deadKey, baseKey]`);
      for (const k of sequence) {
        assert.ok(VALID_CODES.has(k.code), `${JSON.stringify(ch)} uses unknown code ${k.code}`);
        assert.equal(typeof k.shift, 'boolean', `${JSON.stringify(ch)} shift is boolean`);
        assert.ok(k.altGr === undefined || typeof k.altGr === 'boolean', `${JSON.stringify(ch)} altGr is boolean if set`);
      }
    }
  });

  test(`${id}: letters, digits, space and newline are all typeable`, () => {
    for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n') {
      assert.ok(resolveKey(table, ch), `${JSON.stringify(ch)} has a mapping`);
    }
  });

  // Two characters on the same keystroke means asking for one silently types the other --
  // the bug class behind the Italian à/' collision. \n and \r are deliberately both Enter.
  test(`${id}: no two characters share a keystroke`, () => {
    const owner = new Map();
    for (const [ch, entry] of Object.entries(table)) {
      if (ch === '\r') continue;
      const key = entryId(entry);
      assert.ok(!owner.has(key), `${JSON.stringify(ch)} and ${JSON.stringify(owner.get(key))} both map to ${key}`);
      owner.set(key, ch);
    }
  });

  // A dead key pressed on its own produces no character, so no plain character can live there.
  test(`${id}: no character is mapped to a dead key`, () => {
    const deadKeys = new Set();
    for (const entry of Object.values(table)) {
      if (Array.isArray(entry)) deadKeys.add(keystrokeId(entry[0]));
    }
    for (const [ch, entry] of Object.entries(table)) {
      if (Array.isArray(entry)) continue;
      assert.ok(!deadKeys.has(keystrokeId(entry)), `${JSON.stringify(ch)} is mapped to dead key ${keystrokeId(entry)}`);
    }
  });
}

test('US layout covers all printable ASCII', () => {
  for (let c = 0x20; c <= 0x7e; c++) {
    const ch = String.fromCharCode(c);
    assert.ok(resolveKey(KEYBOARD_LAYOUTS.us, ch), `${JSON.stringify(ch)} has a US mapping`);
  }
});

test('regional aliases point at the physical layout they share', () => {
  assert.equal(KEYBOARD_LAYOUTS.ca, KEYBOARD_LAYOUTS.us);
  assert.equal(KEYBOARD_LAYOUTS.aunz, KEYBOARD_LAYOUTS.uk);
  assert.equal(KEYBOARD_LAYOUTS.ie, KEYBOARD_LAYOUTS.uk);
});

test('known mappings verified against real guests', () => {
  // JSON round-trip: objects from the vm context have that realm's prototypes, which
  // deepStrictEqual treats as different from this realm's.
  const k = (id, ch) => {
    const entry = resolveKey(KEYBOARD_LAYOUTS[id], ch);
    return entry === undefined ? undefined : JSON.parse(JSON.stringify(entry));
  };
  assert.deepEqual(k('de', 'z'), { code: 'KeyY', shift: false });
  assert.deepEqual(k('de', '@'), { code: 'KeyQ', shift: false, altGr: true });
  assert.equal(k('de', '^'), undefined, 'German ^ is a dead key with no single-keystroke mapping');
  assert.deepEqual(k('fr', 'a'), { code: 'KeyQ', shift: false });
  assert.deepEqual(k('fr', '1'), { code: 'Digit1', shift: true });
  assert.deepEqual(k('es', 'á'), [{ code: 'Quote', shift: false }, { code: 'KeyA', shift: false }]);
  assert.deepEqual(k('it', 'à'), { code: 'Quote', shift: false });
  assert.equal(k('it', "'"), undefined, "Italian ' would collide with à at Quote");
  assert.equal(k('it', '"'), undefined, 'Italian " would collide with ° at Quote+Shift');
  assert.deepEqual(k('pt', 'ã'), [{ code: 'Backslash', shift: false }, { code: 'KeyA', shift: false }]);
  assert.deepEqual(k('nl', 'ë'), [{ code: 'BracketLeft', shift: false }, { code: 'KeyE', shift: false }]);
  assert.equal(k('nl', ':'), undefined, 'Dutch Semicolon key is +/±, not ;/:');
});

test('locale guesses only name real layouts', () => {
  for (const [, id] of KEYBOARD_LAYOUT_LOCALE_GUESSES) {
    assert.ok(KEYBOARD_LAYOUTS[id], `locale guess target ${id} exists`);
  }
});

test('no locale prefix is shadowed by an earlier, shorter one', () => {
  KEYBOARD_LAYOUT_LOCALE_GUESSES.forEach(([later], j) => {
    KEYBOARD_LAYOUT_LOCALE_GUESSES.slice(0, j).forEach(([earlier]) => {
      assert.ok(!later.startsWith(earlier), `'${later}' is unreachable behind '${earlier}'`);
    });
  });
});

test('guessKeyboardLayoutFromLocale', () => {
  assert.equal(guessKeyboardLayoutFromLocale('en-GB'), 'uk');
  assert.equal(guessKeyboardLayoutFromLocale('en-IE'), 'ie');
  assert.equal(guessKeyboardLayoutFromLocale('en-AU'), 'aunz');
  assert.equal(guessKeyboardLayoutFromLocale('en-CA'), 'ca');
  assert.equal(guessKeyboardLayoutFromLocale('en-US'), 'us');
  assert.equal(guessKeyboardLayoutFromLocale('fr-CA'), 'fr');
  assert.equal(guessKeyboardLayoutFromLocale('de-AT'), 'de');
  assert.equal(guessKeyboardLayoutFromLocale('pt-BR'), 'pt');
  assert.equal(guessKeyboardLayoutFromLocale('ja-JP'), DEFAULT_KEYBOARD_LAYOUT);
  assert.equal(guessKeyboardLayoutFromLocale(''), DEFAULT_KEYBOARD_LAYOUT);
  assert.equal(guessKeyboardLayoutFromLocale(undefined), DEFAULT_KEYBOARD_LAYOUT);
});
