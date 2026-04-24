# Bookshelf Commit — Edge/Chrome extension

One-click "I just finished a book" button. Open a StoryGraph book page,
click the extension icon, review the scraped fields, hit Commit —
the extension opens a pull-request-free commit against
`src/data/books.json` in your Bookshelf repo. If Pages is wired up,
the site redeploys automatically.

## One-time setup

### 1. Create a GitHub personal access token

Fine-grained PAT with minimal scope:

1. Visit https://github.com/settings/personal-access-tokens and click
   **Generate new token**.
2. Resource owner: you (or your org).
3. Repository access: **Only select repositories** → pick
   `dreshannon/Bookshelf`.
4. Repository permissions → **Contents: Read and write**.
5. Generate, copy the token (you only see it once).

### 2. Load the extension

1. Open `edge://extensions/` (or `chrome://extensions/`).
2. Toggle **Developer mode** on.
3. Click **Load unpacked** → select the `browser-extension/` folder of
   this repo.
4. Pin the extension (puzzle icon → pin).
5. Right-click the extension icon → **Options**.
6. Paste your token, verify the repo/path defaults, click **Test
   connection**. On success, hit **Save**.

### 3. Enable GitHub Pages (one time)

In `github.com/dreshannon/Bookshelf/settings/pages`:

- **Build and deployment → Source**: **GitHub Actions**.

That's it — the `.github/workflows/deploy.yml` in this repo handles the
rest. After the next commit the shelf will be live at
`https://dreshannon.github.io/Bookshelf/`.

## Using it

1. On StoryGraph, open the detail page of a book you just finished:
   `https://app.thestorygraph.com/books/<uuid>`.
2. Click the Bookshelf Commit icon.
3. The popup scrapes the page and fills the form. Review, fix anything
   off, paste a different cover URL if you want.
4. Click **Commit**.
5. A new commit lands on `main`. The Pages workflow kicks off. In ~30
   seconds the new book is on your live shelf.

## How the scraping works

`content_script.js` merges three sources, in priority order:

1. **JSON-LD** structured data (`<script type="application/ld+json">`).
2. **OpenGraph / Twitter** meta tags.
3. **DOM fallbacks** — `h1`, `a[href*="/authors/"]`, ISBN regex, etc.

If StoryGraph changes its markup and scraping breaks, the form is
fully editable — you can paste the fields manually and still commit.
Update the `domFallbacks()` function when you have time.

## Security notes

- The PAT lives in `chrome.storage.sync`. It never touches the Vue app
  or the site build; it's read only by the extension's service worker
  when calling `api.github.com`.
- Use a **fine-grained** token scoped to this single repo with
  Contents: Read/write. Don't use a classic token with broad scopes.
- `chrome.storage.sync` roams across browsers signed into the same
  profile. If that's not what you want, change the storage calls to
  `chrome.storage.local` in `service_worker.js` and `options.js`.

## Troubleshooting

- **"No response from content script"** — reload the StoryGraph tab.
  The content script only injects on pages loaded after the extension
  was enabled; the popup tries to force-inject, but if the page has a
  strict CSP it may refuse.
- **409 conflict on commit** — someone (or another device) committed
  between read and write. Close the popup and try again.
- **Scraped title has "| The StoryGraph" on the end** — your page was
  missing JSON-LD and we fell back to OG. The popup strips the usual
  suffixes; if a new one appears, add it to the regex in
  `content_script.js` → `fromMeta()`.
