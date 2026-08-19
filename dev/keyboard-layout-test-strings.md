# Keyboard layout test strings

Paste-able test payloads for verifying `extension/keyboard-layouts.js` against
`dev/mock-console.html`. See `dev/README.md` for the full test harness setup
(unpacked extension + `python3 -m http.server` + the mock console page).

**How to use each block below:**
1. Copy a block's contents to your clipboard.
2. In the extension's Settings → Paste & panel, set **Keyboard layout** to match the
   section you're testing.
3. On the mock console page, set **Simulated guest layout** to the same value, with
   **Strict physical-key mode** checked.
4. Click into the canvas, paste (`Ctrl+V`/`⌘V`, the floating pill, or the popup).
5. Compare the **VM screen** box against the block below — it should match exactly.
   A `░` means a physical key + modifier combo is missing from that layout's table.

---

## US (baseline — full ASCII sweep)

```
The quick brown fox jumps over 13 lazy dogs!
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
~`!@#$%^&*()_+-={}[]|\:;"'<>,.?/
```

## UK QWERTY

Exercises the chars that differ from US: `"` `@` `'` `£` `#` `~` `\` `|`.

```
He said "hello" @home -- that's £5 #cheap ~approx \path\ |pipe|
```

## German QWERTZ

Exercises the y/z swap, umlauts/ß, and the remapped digit row / AltGr symbols.

```
Zwoelf Aetzende Oefen ueber die Strasse (Yoga-Typ): äöüÄÖÜß YZ yz
"Preis" §3 Absatz: 5€ & 10% (max) = ok!
{[Test]} <Wert>; Datum: 12.03.2024, 09:15 - Nr._42
@handle *stern* 'quote' + plus | pipe \ backslash
```

Dead-key check — German `^` has no faithful single-keystroke mapping (see the comment
in `keyboard-layouts.js`), so the extension skips it rather than guessing:

```
^
```

On the **mock console**, expect a `░`. On a **real VM**, expect nothing typed for that
character plus a "⚠ Pasted ... skipped 1 unsupported..." toast and a console warning —
the mock's dictionary-lookup decoder and a real guest's keyboard stack don't always
agree on what an *unmapped* character does, only on what a *correctly mapped* one does.
(This gap is how the original real-VM bug was found: the old fallback code sent a
fabricated key event for `^` that the mock decoded as "unresolvable" `░`, but a real
Ubuntu VM's noVNC/keyboard stack silently reinterpreted it as `6`.)

## French AZERTY

Letter-swap sanity check (a/q, z/w, m/; swap places vs. US):

```
a q z w m ; A Q Z W M
```

Accented characters and words that exercise them:

```
Zoé va au marché avec ça: éèàçù °C
```

Digit row (French requires Shift for digits; unshifted produces this symbol row):

```
0123456789
&é"'(-è_çà
```

AltGr row:

```
~#{[|`\^@]}€
```

Punctuation/quoting:

```
"Prix": 1,50€ (total) = 42 ; qui ? où !important
```

---

## Deliberate mismatch (reproduces the original bug reports)

Set the extension's layout to one value and the mock's **Simulated guest layout** to
a different one (e.g. extension = French, simulated guest = US), then paste:

```
café à 5€ {test}
```

```
äöü ß @{}
```

Both should come out garbled on the VM screen — that's the expected mismatch
behavior, confirming the fix actually depends on the layout setting rather than
being a no-op.
