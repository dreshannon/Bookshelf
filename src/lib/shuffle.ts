/** Fisher–Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Decide which positions on a shelf show the cover vs. the spine.
 *
 * At least one book is shown cover-out. Covers are spaced so two
 * covers never sit directly next to each other (best-effort; gives up
 * after `maxAttempts` tries to avoid an infinite loop on tiny shelves).
 */
export function pickDisplayModes(count: number): ('spine' | 'cover')[] {
  const modes: ('spine' | 'cover')[] = new Array(count).fill('spine')
  const coverCount = Math.max(1, Math.floor(count / 4))
  const positions = new Set<number>()
  const maxAttempts = 50
  let guard = 0
  while (positions.size < coverCount && guard++ < maxAttempts) {
    const p = Math.floor(Math.random() * count)
    if (!positions.has(p) && !positions.has(p - 1) && !positions.has(p + 1)) {
      positions.add(p)
    }
  }
  positions.forEach((p) => (modes[p] = 'cover'))
  return modes
}
