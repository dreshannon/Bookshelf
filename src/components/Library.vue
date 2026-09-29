<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { Book, DisplayMode } from '@/types'
import { pickDisplayModes, shuffle } from '@/lib/shuffle'
import Shelf from './Shelf.vue'

const props = withDefaults(
  defineProps<{
    books: Book[]
    booksPerShelf?: number
    numShelves?: number
    /** Interval between rotations. 0 disables auto-rotation. */
    rotationMs?: number
  }>(),
  {
    booksPerShelf: 10,
    numShelves: 3,
    rotationMs: 6000,
  },
)

interface ShelfState {
  entries: { book: Book; mode: DisplayMode }[]
  rotating: boolean
}

const shelves = reactive<ShelfState[]>(
  Array.from({ length: props.numShelves }, () => ({ entries: [], rotating: false })),
)

const libraryEl = ref<HTMLElement | null>(null)
const booksPerShelfCount = ref(props.booksPerShelf)

// Average slot width (book + gap) at each breakpoint, weighted for the
// ~1-in-4 books shown cover-out (wide) vs. spine-out (narrow). Used to
// estimate how many books fit before the shelf is actually rendered.
function computeBooksPerShelf(): number {
  const el = libraryEl.value
  if (!el) return props.booksPerShelf

  const mobile = window.innerWidth <= 720
  const rowPadding = mobile ? 32 : 80 // .shelf-row horizontal padding
  const border = 12 // .shelf-row left + right border
  const gap = mobile ? 2 : 4
  const avgWidth = mobile ? 58 : 68 // 0.75 * spine + 0.25 * cover

  const libraryStyle = getComputedStyle(el)
  const libraryPadding = parseFloat(libraryStyle.paddingLeft) + parseFloat(libraryStyle.paddingRight)

  const available = el.clientWidth - libraryPadding - rowPadding - border
  const count = Math.floor((available + gap) / (avgWidth + gap))
  return Math.max(4, count)
}

// Pool-based draw: we cycle through every book before reshuffling, so all
// titles get shelf time before any repeat.
let pool: Book[] = []
let poolIndex = 0

function nextBook(): Book {
  if (!pool.length || poolIndex >= pool.length) {
    pool = shuffle(props.books)
    poolIndex = 0
  }
  return pool[poolIndex++]
}

function buildEntries() {
  const modes = pickDisplayModes(booksPerShelfCount.value)
  return modes.map((mode) => ({ book: nextBook(), mode }))
}

function fillShelf(idx: number) {
  shelves[idx].entries = buildEntries()
}

function fillAll() {
  for (let i = 0; i < shelves.length; i++) fillShelf(i)
}

const rotatingShelfIndex = ref(0)
let rotationTimer: ReturnType<typeof setInterval> | null = null
let fadeTimeout: ReturnType<typeof setTimeout> | null = null

function startRotation() {
  if (props.rotationMs <= 0) return
  rotationTimer = setInterval(() => {
    const idx = rotatingShelfIndex.value
    shelves[idx].rotating = true
    fadeTimeout = setTimeout(() => {
      fillShelf(idx)
      shelves[idx].rotating = false
    }, 420)
    rotatingShelfIndex.value = (idx + 1) % shelves.length
  }, props.rotationMs)
}

let resizeTimeout: ReturnType<typeof setTimeout> | null = null

function handleResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    const next = computeBooksPerShelf()
    if (next !== booksPerShelfCount.value) {
      booksPerShelfCount.value = next
      fillAll()
    }
  }, 150)
}

onMounted(() => {
  if (!props.books.length) return
  booksPerShelfCount.value = computeBooksPerShelf()
  fillAll()
  startRotation()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (rotationTimer) clearInterval(rotationTimer)
  if (fadeTimeout) clearTimeout(fadeTimeout)
  if (resizeTimeout) clearTimeout(resizeTimeout)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <main class="library" ref="libraryEl">
    <Shelf
      v-for="(shelf, i) in shelves"
      :key="i"
      :entries="shelf.entries"
      :rotating="shelf.rotating"
    />
  </main>
</template>

<style scoped>
.library {
  position: relative;
  z-index: 3;
  padding: 1rem 2rem 5rem;
}
</style>
