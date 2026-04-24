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
  const modes = pickDisplayModes(props.booksPerShelf)
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

onMounted(() => {
  if (!props.books.length) return
  fillAll()
  startRotation()
})

onBeforeUnmount(() => {
  if (rotationTimer) clearInterval(rotationTimer)
  if (fadeTimeout) clearTimeout(fadeTimeout)
})
</script>

<template>
  <main class="library">
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem 5rem;
}
</style>
