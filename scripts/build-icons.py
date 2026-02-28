#!/usr/bin/env python3
"""Generate icon PNGs in extension/icons/ from assets/icon.svg.

Usage:
  pip install -r requirements-icons.txt   # or: pip install cairosvg
  python scripts/build-icons.py
"""

import sys
from pathlib import Path

try:
    import cairosvg
except ImportError:
    print("Install cairosvg: pip install cairosvg", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "assets" / "icon.svg"
ICONS_DIR = ROOT / "extension" / "icons"
SIZES = (16, 48, 128)


def main():
    if not SVG.exists():
        print(f"Not found: {SVG}", file=sys.stderr)
        sys.exit(1)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        out = ICONS_DIR / f"icon{size}.png"
        cairosvg.svg2png(url=str(SVG), write_to=str(out), output_width=size, output_height=size)
        print(f"Wrote {out} ({size}x{size})")
    print("Done.")


if __name__ == "__main__":
    main()
