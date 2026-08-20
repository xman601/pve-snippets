#!/usr/bin/env python3
"""Generate icon PNGs in extension/icons/ from assets/icon.svg.

Usage:
  pip install -r scripts/requirements-icons.txt   # or: pip install cairosvg
  python scripts/build-icons.py
"""

import sys
from pathlib import Path

try:
    import cairosvg
except ImportError:
    print("Install cairosvg: pip install -r scripts/requirements-icons.txt", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "assets" / "icon.svg"
ICONS_DIR = ROOT / "extension" / "icons"
# 32 is a HiDPI/Retina variant for the 16px toolbar slot -- Chrome renders that slot at
# 32 physical pixels on a 2x display and picks the closest available size instead of
# upscaling the 16px asset, so shipping it avoids a blurry toolbar icon on Retina screens.
SIZES = (16, 32, 48, 128)
# manifest.json references the 128px icon as "icon.png" (no size suffix), not
# "icon128.png" -- keep this in sync with manifest.json's "icons"/"action.default_icon".
FILENAME_OVERRIDES = {128: "icon.png"}


def main():
    if not SVG.exists():
        print(f"Not found: {SVG}", file=sys.stderr)
        sys.exit(1)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        out = ICONS_DIR / FILENAME_OVERRIDES.get(size, f"icon{size}.png")
        cairosvg.svg2png(url=str(SVG), write_to=str(out), output_width=size, output_height=size)
        print(f"Wrote {out} ({size}x{size})")
    print("Done.")


if __name__ == "__main__":
    main()
