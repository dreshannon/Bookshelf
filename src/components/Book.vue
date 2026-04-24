<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Book, DisplayMode, TitleFont } from '@/types'
import { getCoverUrl } from '@/lib/covers'

const props = defineProps<{
  book: Book
  mode: DisplayMode
}>()

const FONT_STACKS: Record<TitleFont, string> = {
  display: "'Playfair Display', serif",
  italic: "'Cormorant Garamond', serif",
  serif: "'EB Garamond', serif",
}

const lastName = computed(() => {
  const parts = props.book.author.trim().split(/\s+/)
  return parts[parts.length - 1]
})

const bookStyle = computed(() => {
  const font = FONT_STACKS[props.book.titleFont ?? 'serif']
  // Tiny random height jitter so the line of books doesn't look too regular.
  const variance = (Math.random() * 8 - 2) | 0
  return {
    '--spine-text': props.book.textColor ?? '#f4ead5',
    '--cover-text': props.book.textColor ?? '#f4ead5',
    '--cover-accent': props.book.accent ?? '#c89968',
    '--spine-font': font,
    '--cover-font': font,
    backgroundColor: props.book.spineColor ?? '#5a1e1e',
    height: `${220 + variance}px`,
  }
})

const titleIsItalic = computed(() => props.book.titleFont === 'italic')

// Cover-image loading: only fetched when this book is rendered as a cover.
const coverSrc = ref<string | null>(null)
const coverLoaded = ref(false)
const coverFailed = ref(false)

watch(
  () => [props.book, props.mode] as const,
  async ([book, mode]) => {
    coverSrc.value = null
    coverLoaded.value = false
    coverFailed.value = false
    if (mode !== 'cover') return
    const url = await getCoverUrl(book)
    if (url) coverSrc.value = url
    else coverFailed.value = true
  },
  { immediate: true },
)

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  // Open Library sometimes returns a 1x1 placeholder when an ID exists
  // but has no real image. Treat those as a miss.
  if (img.naturalWidth < 20 || img.naturalHeight < 20) {
    coverFailed.value = true
    coverSrc.value = null
    return
  }
  coverLoaded.value = true
}

function onImgError() {
  coverFailed.value = true
  coverSrc.value = null
}
</script>

<template>
  <div :class="['book', mode]" :style="bookStyle">
    <template v-if="mode === 'spine'">
      <span class="spine-title">{{ book.title }}</span>
      <span class="spine-author">{{ lastName }}</span>
    </template>

    <template v-else>
      <img
        v-if="coverSrc && !coverFailed"
        class="cover-image"
        :class="{ loaded: coverLoaded }"
        :src="coverSrc"
        :alt="`${book.title} cover`"
        @load="onImgLoad"
        @error="onImgError"
      />
      <div v-show="!coverLoaded" class="cover-inner">
        <div :class="['cover-title', { italic: titleIsItalic }]">{{ book.title }}</div>
        <div class="cover-ornament">✦</div>
        <div class="cover-author">{{ book.author }}</div>
      </div>
    </template>

    <div class="book-tooltip">
      {{ book.title }}
      <em>{{ book.author }}</em>
    </div>
  </div>
</template>

<style scoped>
.book {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-origin: bottom center;
  animation: slot-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes slot-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.book:hover {
  transform: translateY(-14px) rotate(-1deg);
  z-index: 10;
}

/* SPINE variant */
.book.spine {
  width: 42px;
  height: 220px;
  border-radius: 2px 2px 1px 1px;
  padding: 14px 4px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  box-shadow:
    inset 2px 0 3px rgba(255, 255, 255, 0.08),
    inset -2px 0 4px rgba(0, 0, 0, 0.4),
    inset 0 -3px 4px rgba(0, 0, 0, 0.3),
    3px 4px 10px rgba(0, 0, 0, 0.5);
  background-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(255, 255, 255, 0.06) 15%,
    rgba(255, 255, 255, 0.02) 50%,
    rgba(0, 0, 0, 0.25) 90%,
    rgba(0, 0, 0, 0.45) 100%
  );
}

.book.spine .spine-title {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--spine-font, 'Cormorant Garamond', serif);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-align: center;
  color: var(--spine-text, #f4ead5);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 160px;
  flex: 1;
}

.book.spine .spine-author {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: 'EB Garamond', serif;
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: var(--spine-text, #f4ead5);
  opacity: 0.75;
  text-transform: uppercase;
  white-space: nowrap;
}

.book.spine::before,
.book.spine::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}
.book.spine::before {
  top: 22px;
}
.book.spine::after {
  bottom: 30px;
}

/* COVER variant */
.book.cover {
  width: 145px;
  height: 220px;
  border-radius: 2px 4px 4px 2px;
  overflow: hidden;
  box-shadow:
    inset 4px 0 6px rgba(0, 0, 0, 0.3),
    inset -1px 0 2px rgba(255, 255, 255, 0.1),
    4px 6px 14px rgba(0, 0, 0, 0.55);
  position: relative;
}

/* Spine-edge illusion on the left side of cover-facing books */
.book.cover::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.2) 50%, transparent);
  pointer-events: none;
  z-index: 3;
}

/* Subtle gloss across covers */
.book.cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    100deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(255, 255, 255, 0.08) 15%,
    rgba(255, 255, 255, 0) 50%,
    rgba(0, 0, 0, 0.15) 100%
  );
  pointer-events: none;
  z-index: 2;
}

.book.cover .cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.book.cover .cover-image.loaded {
  opacity: 1;
}

.book.cover .cover-inner {
  position: absolute;
  inset: 0;
  padding: 1.1rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
  z-index: 1;
}

.book.cover .cover-title {
  font-family: var(--cover-font, 'Playfair Display', serif);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--cover-text, #f4ead5);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  margin-top: 0.4rem;
}

.book.cover .cover-title.italic {
  font-style: italic;
  font-weight: 400;
}

.book.cover .cover-author {
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--cover-text, #f4ead5);
  opacity: 0.85;
}

.book.cover .cover-ornament {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: var(--cover-accent, #c89968);
  align-self: center;
  opacity: 0.85;
  margin: 0.3rem 0;
}

/* Tooltip */
.book-tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  background: rgba(15, 8, 3, 0.95);
  border: 1px solid rgba(200, 153, 104, 0.3);
  padding: 0.6rem 0.9rem;
  border-radius: 3px;
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  color: var(--paper-warm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  z-index: 20;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
}

.book-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(200, 153, 104, 0.3);
}

.book-tooltip em {
  display: block;
  color: #c89968;
  font-style: italic;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.book:hover .book-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 720px) {
  .book.spine {
    width: 36px;
    height: 195px;
  }
  .book.cover {
    width: 125px;
    height: 195px;
  }
  .book.cover .cover-inner {
    padding: 0.9rem 0.8rem;
  }
  .book.cover .cover-title {
    font-size: 0.95rem;
  }
}
</style>
