/**
 * Background service worker. Handles all GitHub API traffic so that the
 * popup stays small and can't directly see the PAT — it only asks the
 * worker to commit on its behalf.
 *
 * Message protocol (from popup):
 *   { action: 'preview' }                    → returns current books + config
 *   { action: 'commit', entry: <BookEntry> } → commits entry to books.json
 */

const DEFAULT_CONFIG = {
  owner: 'dreshannon',
  repo: 'Bookshelf',
  branch: 'main',
  path: 'src/data/books.json',
}

async function getConfig() {
  const stored = await chrome.storage.sync.get(['owner', 'repo', 'branch', 'path', 'token'])
  const cfg = { ...DEFAULT_CONFIG, ...stored }
  if (!cfg.token) throw new Error('Missing GitHub token. Open the extension options to set it.')
  return cfg
}

function ghHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  }
}

/** GET the file; returns { books, sha } or throws. */
async function readBooks(cfg) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
    cfg.path,
  )}?ref=${encodeURIComponent(cfg.branch)}`
  const res = await fetch(url, { headers: ghHeaders(cfg.token) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub read failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const payload = await res.json()
  // Base64 decode. GitHub returns content with line breaks.
  const raw = atob(payload.content.replace(/\n/g, ''))
  // atob gives us a binary string; decode as UTF-8.
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0))
  const text = new TextDecoder('utf-8').decode(bytes)
  const books = JSON.parse(text)
  if (!Array.isArray(books)) throw new Error('books.json is not an array')
  return { books, sha: payload.sha }
}

/** PUT the file back. Returns the commit SHA / url. */
async function writeBooks(cfg, books, parentSha, commitMessage) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
    cfg.path,
  )}`
  const text = JSON.stringify(books, null, 2) + '\n'
  const utf8 = new TextEncoder().encode(text)
  // Encode bytes → binary string → base64 (GitHub requires base64 content).
  let bin = ''
  for (const b of utf8) bin += String.fromCharCode(b)
  const content = btoa(bin)

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(cfg.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      content,
      sha: parentSha,
      branch: cfg.branch,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub write failed (${res.status}): ${text.slice(0, 300)}`)
  }
  return res.json()
}

/** Palette cycle so new entries get a distinct spine colour from the last. */
const PALETTES = [
  { spineColor: '#5a1e1e', textColor: '#e8d4a8', accent: '#c89968', titleFont: 'display' },
  { spineColor: '#6b5b3a', textColor: '#f4ead5', accent: '#d4b078', titleFont: 'italic' },
  { spineColor: '#2f4a3a', textColor: '#e8d4a8', accent: '#b89968', titleFont: 'serif' },
  { spineColor: '#3a2a4a', textColor: '#d8c8e8', accent: '#a898c8', titleFont: 'display' },
  { spineColor: '#4a2818', textColor: '#e8d4a8', accent: '#c89968', titleFont: 'serif' },
  { spineColor: '#1e3a4a', textColor: '#e8d4a8', accent: '#b8a878', titleFont: 'italic' },
  { spineColor: '#3a1e1e', textColor: '#d8c8a8', accent: '#c89968', titleFont: 'display' },
  { spineColor: '#2a2a2a', textColor: '#d8d8d8', accent: '#a8a8a8', titleFont: 'display' },
  { spineColor: '#3a4a2a', textColor: '#e8e0c8', accent: '#b8c878', titleFont: 'serif' },
  { spineColor: '#4a2a2a', textColor: '#e8c8b8', accent: '#c88868', titleFont: 'display' },
  { spineColor: '#2a2a2a', textColor: '#c8c8c8', accent: '#888888', titleFont: 'serif' },
  { spineColor: '#4a3a1e', textColor: '#e8d4a8', accent: '#d4a868', titleFont: 'italic' },
  { spineColor: '#1e2a3a', textColor: '#d8c878', accent: '#d4b048', titleFont: 'display' },
  { spineColor: '#2a3a3a', textColor: '#d8e0d8', accent: '#a8c8c0', titleFont: 'italic' },
  { spineColor: '#5a3a1e', textColor: '#e8d4a8', accent: '#c89968', titleFont: 'serif' },
  { spineColor: '#8a1e1e', textColor: '#f4ead5', accent: '#f4c878', titleFont: 'display' },
  { spineColor: '#1e3a2a', textColor: '#e8d4a8', accent: '#b89858', titleFont: 'italic' },
  { spineColor: '#2a4a5a', textColor: '#d8e8e8', accent: '#a8d0d8', titleFont: 'display' },
  { spineColor: '#1e1e1e', textColor: '#c89968', accent: '#d4b078', titleFont: 'serif' },
  { spineColor: '#d4c8a8', textColor: '#3a2818', accent: '#8a6838', titleFont: 'italic' },
  { spineColor: '#3a3a4a', textColor: '#e8d4a8', accent: '#b8a878', titleFont: 'serif' },
  { spineColor: '#4a1818', textColor: '#d8a878', accent: '#b88838', titleFont: 'display' },
  { spineColor: '#c8a878', textColor: '#3a2818', accent: '#6a3818', titleFont: 'italic' },
  { spineColor: '#f0d888', textColor: '#3a2818', accent: '#8a5828', titleFont: 'display' },
]

export function pickPalette(count) {
  return PALETTES[count % PALETTES.length]
}

function findDuplicate(books, entry) {
  const k = `${(entry.title || '').toLowerCase()}|${(entry.author || '').toLowerCase()}`
  return books.findIndex(
    (b) => `${(b.title || '').toLowerCase()}|${(b.author || '').toLowerCase()}` === k,
  )
}

async function handlePreview() {
  const cfg = await getConfig()
  const { books, sha } = await readBooks(cfg)
  return { cfg, count: books.length, sha, existingTitles: books.map((b) => b.title) }
}

async function handleCommit(entry) {
  const cfg = await getConfig()
  const { books, sha } = await readBooks(cfg)

  if (findDuplicate(books, entry) !== -1) {
    throw new Error(`"${entry.title}" by ${entry.author} is already on the shelf.`)
  }

  const palette = pickPalette(books.length)
  const normalised = {
    title: entry.title,
    author: entry.author,
    ...palette,
    ...(entry.coverUrl ? { coverUrl: entry.coverUrl } : {}),
    ...(entry.isbn ? { isbn: entry.isbn } : {}),
    ...(entry.year ? { year: Number(entry.year) } : {}),
  }
  // Newest entries go first so the shelf reflects recency.
  const next = [normalised, ...books]
  const commit = await writeBooks(
    cfg,
    next,
    sha,
    `Add "${normalised.title}" by ${normalised.author}`,
  )
  return { commitUrl: commit?.commit?.html_url, count: next.length }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    try {
      if (message?.action === 'preview') {
        sendResponse({ ok: true, data: await handlePreview() })
      } else if (message?.action === 'commit') {
        sendResponse({ ok: true, data: await handleCommit(message.entry) })
      } else {
        sendResponse({ ok: false, error: `Unknown action: ${message?.action}` })
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) })
    }
  })()
  return true // keep sendResponse alive for async handler
})
