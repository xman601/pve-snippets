#!/usr/bin/env python3
"""Build a zip for Chrome Web Store upload. Zips the contents of extension/."""

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTENSION_DIR = ROOT / "extension"
ZIP_PATH = ROOT / "pve-snippets.zip"
# OS/editor junk that sometimes ends up inside extension/ but should never ship.
EXCLUDE_NAMES = {".DS_Store", "Thumbs.db"}


def main():
    if not EXTENSION_DIR.is_dir():
        raise SystemExit(f"Not found: {EXTENSION_DIR}")

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(EXTENSION_DIR.rglob("*")):
            if path.is_file() and path.name not in EXCLUDE_NAMES:
                arcname = path.relative_to(EXTENSION_DIR)
                zf.write(path, arcname)

    print(f"Created {ZIP_PATH}")
    print("Upload this file to the Chrome Web Store.")


if __name__ == "__main__":
    main()
