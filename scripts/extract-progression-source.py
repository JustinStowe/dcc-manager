"""Development-only source extraction. Requires pdfplumber; never runs in the app.

Usage: python scripts/extract-progression-source.py
Writes ignored review material under tmp/, not authoritative game rules.
"""
import json
import logging
from pathlib import Path

import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "SourceFiles/carl_rpg_core_rulebook_digital_hi-res_081226.pdf"
entries = []
current = None
with pdfplumber.open(SOURCE) as pdf:
    for printed in range(129, 159):
        page = pdf.pages[printed + 1]
        for left, right in [(45, 305), (305, 570)]:
            col = page.crop((left, 51, right, 741))
            headings = {}
            for c in col.chars:
                if "CitrusGothic" in c["fontname"] and 12 <= c["size"] < 15:
                    headings.setdefault(round(c["top"], 1), []).append(c)
            positions = []
            for top, chars in sorted(headings.items()):
                title = "".join(c["text"] for c in sorted(chars, key=lambda c: c["x0"])).strip()
                earth_icon = any(abs(c['width']-14)<0.1 and abs(c['height']-14)<0.1 and c.get('fill') and abs(c['top']-top)<3 and (c['x0']>305)==(left>300) for c in page.curves)
                positions.append((top, title, earth_icon))
            # Treat section prose as boundaries, not part of the previous entry.
            for top, title, earth_icon in positions:
                if current is not None:
                    stop = top - 1
                    if stop > start:
                        current["chunks"].append({"page": printed, "text": page.crop((left, start, right, stop)).extract_text() or ""})
                current = {"name": title, "page": printed, "kind": "race" if printed < 142 else "class", "earthIcon": earth_icon, "chunks": []}
                entries.append(current)
                start = top + 15
            if current is not None:
                if not positions:
                    start = 51
                if start < 741:
                    current["chunks"].append({"page": printed, "text": page.crop((left, start, right, 741)).extract_text() or ""})
            start = 51
out = ROOT / "tmp/progression-source.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Extracted {len(entries)} entries for review: {out}")
