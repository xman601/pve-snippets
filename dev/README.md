# Mock console (dev tool)

Test PVE Snippets without a real Proxmox VE server. `mock-console.html` is a fake
noVNC console page: it has a `<canvas>` and a URL the extension's `isProxmoxConsole()`
detection accepts, so the floating paste panel, hotkey paste, and popup all work on it
exactly like a real console — plus a **simulated guest keyboard layout** that decodes
each keystroke the way a real VM would, so the keyboard-layout feature can be verified
end-to-end.

## Run it

1. Load the extension unpacked (`chrome://extensions` → Developer mode → Load unpacked
   → select `extension/`).
2. Serve the repo root with any static file server, e.g.:
   ```
   python3 -m http.server 8000
   ```
   (A real HTTP server avoids the "Allow access to file URLs" toggle Chrome/Firefox
   require for content scripts on `file://` pages.)
3. Open `http://localhost:8000/dev/mock-console.html` — it auto-adds the query
   string the extension looks for (`?console=kvm&vmid=100&node=test`) if missing.
4. Click into the canvas, then use the floating pill, `Ctrl+V`/`⌘V`, or the popup to
   paste — same as a real console.

## Verifying keyboard layouts

1. In the extension's **Settings → Keyboard layout**, pick a layout (e.g. French).
2. On the mock page, set **Simulated guest layout** to the same one, and leave
   **Strict physical-key mode** checked — this decodes each keystroke purely from its
   physical `code` + modifiers, the way a real dumb guest keyboard driver would,
   ignoring the (always-correct) `key` value.
3. Paste text containing layout-specific characters (e.g. `café à 5€ {test}` for
   French, `äöü ß @{}` for German) and confirm the **VM screen** box reproduces it
   exactly.
4. To see what the original bug reports looked like, deliberately mismatch the two
   (e.g. extension = French, simulated guest = US) — the output will garble, same as
   a real VM whose guest OS layout doesn't match what you tell the extension.

Uncheck **Strict physical-key mode** to fall back to `key`-based decoding — this is
what a modern keysym-based console would do and works regardless of layout, useful for
contrasting with strict mode when debugging a table entry.

A `░` in the VM screen means that physical key + modifier combination isn't in the
simulated layout's table (a gap to fix, or an inherent dead-key limitation — see the
comment on German `^` in `extension/keyboard-layouts.js`).

The layout tables come directly from `extension/keyboard-layouts.js` (the same file
the extension ships), so this tool can't drift from what actually gets sent.

## Dead-key layouts (Spanish, Portuguese, Dutch)

Some characters (e.g. Spanish `á`) aren't one physical keystroke — they're composed from
a dead key followed by a base letter, the way a real keyboard works. `extension/content.js`
sends both keystrokes in sequence, and the mock console models the composition with the
same two-step state machine a real guest OS's dead-key handling uses: pressing the dead
key alone shows nothing yet (correct — it's genuinely pending, not a `░` gap), and the
following keystroke either completes the composition or, if it's not a valid combination,
falls through to whatever that key normally produces.

**Important caveat, found the hard way**: the mock console's decoder is only as correct as
the layout table it's built from — it can confirm a table is *internally consistent*
(encode and decode agree), but it cannot catch a table entry whose physical key position is
simply wrong for real hardware. That's exactly how the German `^` bug was found: the old
fallback code produced a result the mock decoded as "unresolvable" (`░`), while a real
Ubuntu VM's noVNC/keyboard stack silently reinterpreted it as `6`. So mock-console
agreement is necessary but not sufficient — always confirm on a real VM with a genuinely
guest-OS-configured layout before trusting a new table, especially the layouts below
marked "(draft)" in the dropdown (Spanish, Italian, Portuguese, Dutch), whose exact
physical key positions are unverified.

**Update**: the first draft of es/it/pt/nl in `keyboard-layouts.js` turned out to have
wrong physical-key positions across the board when tested on a real Ubuntu VM (e.g.
Spanish "á" came out as "à" — the acute dead key was guessed at `BracketLeft` but is
actually at `Quote`; Italian "città" came out as "citt\" — none of the guessed vowel
positions were right). They've since been corrected against the VM's actual
`/usr/share/X11/xkb/symbols/{es,it,pt,nl}` definitions rather than guessed from memory, but
still only cover what the accent-focused test pass exercises — the full digit-row/AltGr
layer for all four remains unverified. If you have shell access to a real X11/Linux guest,
`/usr/share/X11/xkb/symbols/<layout>` is the authoritative source — reading it beats
guessing every time.
