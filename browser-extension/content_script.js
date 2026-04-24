/**
 * Runs inside a StoryGraph tab when the popup asks for book data.
 *
 * The scraper tries three sources in priority order and merges them:
 *   1. <script type="application/ld+json">  — structured data, most reliable
 *   2. OpenGraph meta tags                  — title, cover image
 *   3. DOM fallbacks                         — h1, author link, ISBN regex
 *
 * If StoryGraph changes its markup, update `domFallbacks()` — the JSON-LD
 * and OG paths should keep working as long as StoryGraph has them.
 */

function textOf(el) {
  return (el && el.textContent || '').trim()
}

function firstMatch(re, str) {
  const m = str && str.match(re)
  return m ? m[1] : null
}

/** JSON-LD: StoryGraph book pages often expose a Book schema. */
function fromJsonLd() {
  const out = {}
  const nodes = document.querySelectorAll('script[type="application/ld+json"]')
  for (const node of nodes) {
    let payload
    try {
      payload = JSON.parse(node.textContent)
    } catch {
      continue
    }
    const items = Array.isArray(payload) ? payload : [payload]
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const type = item['@type']
      if (type !== 'Book' && !(Array.isArray(type) && type.includes('Book'))) continue
      if (item.name) out.title = String(item.name).trim()
      if (item.author) {
        const a = Array.isArray(item.author) ? item.author[0] : item.author
        out.author = typeof a === 'string' ? a.trim() : (a?.name || '').trim()
      }
      if (item.image) {
        out.coverUrl = typeof item.image === 'string' ? item.image : item.image?.url
      }
      if (item.isbn) out.isbn = String(item.isbn).replace(/[^0-9Xx]/g, '')
      if (item.datePublished) {
        const y = String(item.datePublished).match(/\d{4}/)
        if (y) out.year = Number(y[0])
      }
    }
  }
  return out
}

/** OpenGraph / Twitter card meta tags. */
function fromMeta() {
  const out = {}
  const meta = (selector) => document.querySelector(selector)?.getAttribute('content')?.trim()
  out.title = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]')
  out.coverUrl = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]')
  // Remove obvious wrappings like "Title by Author | The StoryGraph"
  if (out.title) {
    out.title = out.title
      .replace(/\s*\|\s*The StoryGraph\s*$/i, '')
      .replace(/\s*\|\s*StoryGraph\s*$/i, '')
      .trim()
    const byMatch = out.title.match(/^(.*?) by (.+)$/i)
    if (byMatch) {
      out.title = byMatch[1].trim()
      out.author = byMatch[2].trim()
    }
  }
  return out
}

/** DOM fallbacks for fields OG/JSON-LD didn't give us. */
function domFallbacks() {
  const out = {}
  // Title: the book detail page typically has an h1.
  const h1 = document.querySelector('h1')
  if (h1) out.title = textOf(h1)

  // Author: first link that points to /authors/<uuid>.
  const authorLink = document.querySelector('a[href*="/authors/"]')
  if (authorLink) out.author = textOf(authorLink)

  // Cover image: look for an <img> whose src is on the storygraph CDN.
  const coverImg = document.querySelector('img[src*="thestorygraph.com"]')
  if (coverImg) out.coverUrl = coverImg.src

  // ISBN/UID: StoryGraph's edition details panel repeats "ISBN/UID: <digits>".
  const bodyText = document.body?.innerText || ''
  const isbn = firstMatch(/ISBN\/UID:\s*([0-9Xx]{10,13})/, bodyText)
  if (isbn) out.isbn = isbn

  // Original Pub Year appears as "Original Pub Year: 2025".
  const year = firstMatch(/Original Pub Year:\s*(\d{4})/, bodyText)
  if (year) out.year = Number(year)

  return out
}

function merge(...sources) {
  const out = {}
  for (const src of sources) {
    if (!src) continue
    for (const [k, v] of Object.entries(src)) {
      if (out[k] == null && v != null && v !== '') out[k] = v
    }
  }
  return out
}

function scrapeBook() {
  const data = merge(fromJsonLd(), fromMeta(), domFallbacks())
  // Sanity-clean the URL so we don't stash relative paths.
  if (data.coverUrl && data.coverUrl.startsWith('//')) {
    data.coverUrl = 'https:' + data.coverUrl
  }
  return {
    pageUrl: location.href,
    scrapedAt: new Date().toISOString(),
    ...data,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'scrape') {
    try {
      sendResponse({ ok: true, data: scrapeBook() })
    } catch (err) {
      sendResponse({ ok: false, error: String(err) })
    }
    return true
  }
})
