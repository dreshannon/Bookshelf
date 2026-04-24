/** A single book entry as it lives in `src/data/books.json`. */
export interface Book {
  title: string
  author: string
  /** Direct cover URL (wins over ISBN / OLID lookup). */
  coverUrl?: string
  /** Falls back to Open Library cover-by-ISBN lookup. */
  isbn?: string
  /** Falls back to Open Library cover-by-OLID lookup. */
  olid?: string
  /** Original publication year. Not rendered; useful for sorting. */
  year?: number
  /** Spine background colour. */
  spineColor?: string
  /** Spine/cover foreground text colour. */
  textColor?: string
  /** Accent colour for cover ornament and spine bands. */
  accent?: string
  /** Font family key for the title ('display' | 'italic' | 'serif'). */
  titleFont?: TitleFont
}

export type TitleFont = 'display' | 'italic' | 'serif'

/** How a book is displayed on a shelf. */
export type DisplayMode = 'spine' | 'cover'
