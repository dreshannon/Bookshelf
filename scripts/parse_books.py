#!/usr/bin/env python3
"""
Extract book data from a StoryGraph read-books HTML export and emit
src/data/books.json.

Usage:
    python scripts/parse_books.py [path/to/data.html]

If no path is given, the script looks for ./archive/data.html.
"""
import re
import sys
import json
import html as htmllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "archive" / "data.html"
OUT = ROOT / "src" / "data" / "books.json"

SRC = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_SRC
if not SRC.exists():
    sys.exit(f"Could not find source HTML at {SRC}")

raw = SRC.read_text(encoding="utf-8", errors="replace")

# Split into per-book panes. Each pane starts with a div that has id="book_<uuid>"
# and data-book-id="<uuid>". Use that as the delimiter.
pane_starts = [m.start() for m in re.finditer(r'<div [^>]*id="book_[0-9a-f-]+"', raw)]
print(f"Found {len(pane_starts)} book pane starts in {SRC.name}")

panes = []
for i, s in enumerate(pane_starts):
    e = pane_starts[i + 1] if i + 1 < len(pane_starts) else len(raw)
    panes.append(raw[s:e])

# Palette variations so the spine view keeps its mood.
PALETTES = [
    {"spineColor": "#5a1e1e", "textColor": "#e8d4a8", "accent": "#c89968", "titleFont": "display"},
    {"spineColor": "#6b5b3a", "textColor": "#f4ead5", "accent": "#d4b078", "titleFont": "italic"},
    {"spineColor": "#2f4a3a", "textColor": "#e8d4a8", "accent": "#b89968", "titleFont": "serif"},
    {"spineColor": "#3a2a4a", "textColor": "#d8c8e8", "accent": "#a898c8", "titleFont": "display"},
    {"spineColor": "#4a2818", "textColor": "#e8d4a8", "accent": "#c89968", "titleFont": "serif"},
    {"spineColor": "#1e3a4a", "textColor": "#e8d4a8", "accent": "#b8a878", "titleFont": "italic"},
    {"spineColor": "#3a1e1e", "textColor": "#d8c8a8", "accent": "#c89968", "titleFont": "display"},
    {"spineColor": "#2a2a2a", "textColor": "#d8d8d8", "accent": "#a8a8a8", "titleFont": "display"},
    {"spineColor": "#3a4a2a", "textColor": "#e8e0c8", "accent": "#b8c878", "titleFont": "serif"},
    {"spineColor": "#4a2a2a", "textColor": "#e8c8b8", "accent": "#c88868", "titleFont": "display"},
    {"spineColor": "#2a2a2a", "textColor": "#c8c8c8", "accent": "#888888", "titleFont": "serif"},
    {"spineColor": "#4a3a1e", "textColor": "#e8d4a8", "accent": "#d4a868", "titleFont": "italic"},
    {"spineColor": "#1e2a3a", "textColor": "#d8c878", "accent": "#d4b048", "titleFont": "display"},
    {"spineColor": "#2a3a3a", "textColor": "#d8e0d8", "accent": "#a8c8c0", "titleFont": "italic"},
    {"spineColor": "#5a3a1e", "textColor": "#e8d4a8", "accent": "#c89968", "titleFont": "serif"},
    {"spineColor": "#8a1e1e", "textColor": "#f4ead5", "accent": "#f4c878", "titleFont": "display"},
    {"spineColor": "#1e3a2a", "textColor": "#e8d4a8", "accent": "#b89858", "titleFont": "italic"},
    {"spineColor": "#2a4a5a", "textColor": "#d8e8e8", "accent": "#a8d0d8", "titleFont": "display"},
    {"spineColor": "#1e1e1e", "textColor": "#c89968", "accent": "#d4b078", "titleFont": "serif"},
    {"spineColor": "#d4c8a8", "textColor": "#3a2818", "accent": "#8a6838", "titleFont": "italic"},
    {"spineColor": "#3a3a4a", "textColor": "#e8d4a8", "accent": "#b8a878", "titleFont": "serif"},
    {"spineColor": "#4a1818", "textColor": "#d8a878", "accent": "#b88838", "titleFont": "display"},
    {"spineColor": "#c8a878", "textColor": "#3a2818", "accent": "#6a3818", "titleFont": "italic"},
    {"spineColor": "#f0d888", "textColor": "#3a2818", "accent": "#8a5828", "titleFont": "display"},
]

RX_TITLE = re.compile(r'<a href="/books/[0-9a-f-]+">([^<]+)</a>')
RX_AUTHOR = re.compile(
    r'<a class="hover:text-cyan-700[^"]*" href="/authors/[0-9a-f-]+">([^<]+)</a>'
)
RX_COVER = re.compile(
    r'<img alt="([^"]+?) by ([^"]+?)" class="[^"]*rounded-sm[^"]*" src="([^"]+)"'
)
RX_ISBN = re.compile(r'<span class="font-semibold">ISBN/UID:</span>\s*([0-9Xx]+)')
RX_YEAR = re.compile(r'<span class="font-semibold">Original Pub Year:</span>\s*(\d{4})')

books: list[dict] = []
seen_keys: set[str] = set()

for pane in panes:
    m_cover = RX_COVER.search(pane)
    if m_cover:
        title = htmllib.unescape(m_cover.group(1).strip())
        author = htmllib.unescape(m_cover.group(2).strip())
        cover_url = m_cover.group(3).strip()
    else:
        m_title = RX_TITLE.search(pane)
        m_author = RX_AUTHOR.search(pane)
        if not (m_title and m_author):
            continue
        title = htmllib.unescape(m_title.group(1).strip())
        author = htmllib.unescape(m_author.group(1).strip())
        cover_url = None

    key = f"{title.lower()}|{author.lower()}"
    if key in seen_keys:
        continue
    seen_keys.add(key)

    m_isbn = RX_ISBN.search(pane)
    m_year = RX_YEAR.search(pane)

    palette = PALETTES[len(books) % len(PALETTES)]
    entry: dict = {"title": title, "author": author, **palette}
    if cover_url:
        entry["coverUrl"] = cover_url
    if m_isbn:
        entry["isbn"] = m_isbn.group(1).strip()
    if m_year:
        entry["year"] = int(m_year.group(1))
    books.append(entry)

print(f"Extracted {len(books)} unique books")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(books, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {OUT.relative_to(ROOT)}")

for b in books[:5]:
    print(f"  - {b['title']} — {b['author']}")
