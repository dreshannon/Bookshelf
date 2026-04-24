import type { Book } from '@/types'

const CACHE_KEY = 'bookshelf-cover-cache-v1'

interface CacheEntry {
  coverUrl: string | null
}

/** Load the sessionStorage cache, tolerating SSR / private-mode failures. */
function loadCache(): Record<string, CacheEntry> {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {}
  } catch {
    return {}
  }
}

const coverCache: Record<string, CacheEntry> = loadCache()

function saveCache() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(coverCache))
  } catch {
    /* storage full / denied — safe to ignore */
  }
}

function cacheKey(book: Book): string {
  return `${book.title.toLowerCase()}|${book.author.toLowerCase()}`
}

/** In-flight lookups, so concurrent callers share a single fetch. */
const pending = new Map<string, Promise<string | null>>()

/**
 * Resolve a cover URL for a book.
 *
 * Priority:
 *   1. `book.coverUrl` if provided
 *   2. Open Library by ISBN
 *   3. Open Library by OLID
 *   4. Open Library search by title + author
 *
 * Returns `null` when no cover can be found. Results are memoised in
 * `sessionStorage` so repeated shelf rotations don't re-query.
 */
export async function getCoverUrl(book: Book): Promise<string | null> {
  const key = cacheKey(book)
  if (key in coverCache) return coverCache[key].coverUrl
  const inFlight = pending.get(key)
  if (inFlight) return inFlight

  const promise = (async (): Promise<string | null> => {
    if (book.coverUrl) {
      coverCache[key] = { coverUrl: book.coverUrl }
      saveCache()
      return book.coverUrl
    }
    if (book.isbn) {
      const url = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.isbn)}-L.jpg`
      coverCache[key] = { coverUrl: url }
      saveCache()
      return url
    }
    if (book.olid) {
      const url = `https://covers.openlibrary.org/b/olid/${encodeURIComponent(book.olid)}-L.jpg`
      coverCache[key] = { coverUrl: url }
      saveCache()
      return url
    }

    try {
      const params = new URLSearchParams({
        title: book.title,
        author: book.author,
        limit: '5',
        fields: 'cover_i,title,author_name,edition_count',
      })
      const res = await fetch(`https://openlibrary.org/search.json?${params}`)
      if (!res.ok) throw new Error(`search failed: ${res.status}`)
      const data = (await res.json()) as { docs?: { cover_i?: number }[] }
      const match = (data.docs ?? []).find((d) => d.cover_i)
      if (match?.cover_i) {
        const url = `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg`
        coverCache[key] = { coverUrl: url }
        saveCache()
        return url
      }
    } catch (err) {
      console.warn('Cover lookup failed for', book.title, err)
    }

    coverCache[key] = { coverUrl: null }
    saveCache()
    return null
  })()

  pending.set(key, promise)
  promise.finally(() => pending.delete(key))
  return promise
}
