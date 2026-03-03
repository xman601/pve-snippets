# Before publishing to the Chrome Web Store

## 1. Host your privacy policy

The store **requires** a public URL to your privacy policy.

- **Option A:** Use the GitHub raw URL (replace `main` with your default branch if different):
  - `https://raw.githubusercontent.com/xman601/pve-snippets/main/docs/PRIVACY_POLICY.md`
  - Or the readable blob: `https://github.com/xman601/pve-snippets/blob/main/docs/PRIVACY_POLICY.md`
- **Option B:** GitHub Pages, your own site, or a Gist — paste that URL in the CWS “Privacy practices” → “Privacy policy” field.

---

## 2. Build and test the zip

```bash
python scripts/build-store-zip.py
```

- In Chrome, go to `chrome://extensions/`, enable Developer mode, click **Load unpacked**, and select the **`extension`** folder. Use the extension on a real PVE noVNC page.
- Then click **Pack extension** and choose the `extension` folder (or just use your zip). Install the generated zip via “Load unpacked” on a test profile to confirm it works.

---

## 3. Store listing assets (prepare before submit)

- **Short description** (e.g. 132 chars) — from your manifest description or a one-liner.
- **Detailed description** — you can adapt from README (Features, Usage, Notes).
- **Screenshots** — at least one; recommended 1280x800 or 640x400. E.g. paste panel open on a noVNC console.
- **Promo images** (if you want a marquee):
  - Small: 440x280
  - Large: 920x680 or 1400x560
- **Category** — e.g. “Productivity” or “Developer tools”.

---

## 4. In the Chrome Web Store dashboard

- **Single purpose** — Describe the extension in one clear sentence (paste + snippets in PVE noVNC).
- **Privacy practices** — Paste the justification text from `docs/CWS_PRIVACY_JUSTIFICATIONS.md` into each permission/usage field.
- **Remote code** — If asked, use the “no remote code” justification from that doc.
- **Privacy policy** — Enter the hosted URL from step 1.
- **Support URL** — Your repo or contact, e.g. `https://github.com/xman601/pve-snippets`.

---

## 5. Optional but useful

- **Version:** Bump version in manifest (e.g. 1.0.1) and rebuild the zip for each store update.
- **README** — Push the latest README so the repo looks good for users who click “Source” in the popup.
- **License** — You have MIT in the repo; the store may show it if you link the repo.

After submit, review can take from a few hours to a few days. Fix any reviewer feedback and resubmit if needed.
