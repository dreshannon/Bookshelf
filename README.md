# Bookshelf

A rotating personal library — your StoryGraph reading list rendered as
a 3D wooden shelf with spines and cover-facing books. Built with
Vite + Vue 3 + TypeScript.

## Getting started

```bash
npm install
npm run dev         # Vite dev server
```

Then open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command               | What it does                                    |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start the Vite dev server with HMR.             |
| `npm run build`       | Type-check then produce a production bundle.    |
| `npm run preview`     | Serve the built bundle locally.                 |
| `npm run type-check`  | Run `vue-tsc` without emitting.                 |
| `npm run lint`        | ESLint with `--fix`.                            |
| `npm run format`      | Prettier over `src/`.                           |
| `npm run test`        | Vitest in watch mode.                           |
| `npm run test:run`    | Vitest once and exit.                           |

## Project layout

```
.
├── archive/                 old static site + raw StoryGraph export
├── index.html               Vite entry
├── scripts/
│   └── parse_books.py       Regenerates src/data/books.json from the export
├── src/
│   ├── App.vue              Page layout (header + footer + Library)
│   ├── main.ts              App bootstrap
│   ├── style.css            Global body / backdrop styles
│   ├── types.ts             Book / DisplayMode interfaces
│   ├── data/
│   │   └── books.json       The book list (imported by App.vue)
│   ├── lib/
│   │   ├── covers.ts        Open Library cover lookup + session cache
│   │   └── shuffle.ts       Pool shuffle + cover/spine placement
│   └── components/
│       ├── Library.vue      Owns the shelves, pool state, rotation timer
│       ├── Shelf.vue        One shelf row with its wooden plank
│       └── Book.vue         Spine or cover-facing book
├── eslint.config.js
├── vite.config.ts
└── tsconfig*.json
```

## Updating the book list

The `src/data/books.json` file is generated from a StoryGraph
read-books HTML export. To refresh it:

1. Export from StoryGraph (or save the rendered read-list page) as
   `archive/data.html`.
2. Run:

   ```bash
   python scripts/parse_books.py
   ```

   It writes `src/data/books.json`. Hot-reload will pick up the change.

You can also edit `books.json` by hand. Each entry supports:

- `title`, `author` — required
- `coverUrl` — direct cover image URL (wins over ISBN lookup)
- `isbn` or `olid` — fall back to Open Library cover lookup
- `year` — purely informational
- `spineColor`, `textColor`, `accent`, `titleFont` — spine styling

## Notes

- Cover images are loaded lazily. If a lookup fails, the CSS-drawn
  fallback cover stays visible.
- Results from Open Library are cached in `sessionStorage` under
  `bookshelf-cover-cache-v1` so rotations don't re-query.
- The old static site is preserved under `archive/` for reference.
