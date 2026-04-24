<script setup lang="ts">
import type { Book, DisplayMode } from '@/types'
import BookEl from './Book.vue'

defineProps<{
  entries: { book: Book; mode: DisplayMode }[]
  /** True while the shelf is fading out during a rotation swap. */
  rotating?: boolean
}>()
</script>

<template>
  <div class="shelf">
    <div :class="['shelf-row', { rotating }]">
      <BookEl
        v-for="(entry, i) in entries"
        :key="`${entry.book.title}|${entry.book.author}|${i}`"
        :book="entry.book"
        :mode="entry.mode"
        :style="{ animationDelay: `${i * 40}ms` }"
      />
    </div>
    <div class="shelf-plank"></div>
  </div>
</template>

<style scoped>
.shelf {
  position: relative;
  margin-bottom: 3.5rem;
  perspective: 1200px;
}

.shelf-row {
  position: relative;
  height: 260px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  padding: 0 2.5rem;
  background:
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.25) 15%,
      rgba(0, 0, 0, 0.15) 85%,
      rgba(0, 0, 0, 0.5) 100%
    ),
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0) 10%,
      rgba(0, 0, 0, 0) 90%,
      rgba(0, 0, 0, 0.3) 100%
    );
  border-left: 6px solid var(--wood-dark);
  border-right: 6px solid var(--wood-dark);
}

.shelf-plank {
  position: relative;
  height: 28px;
  background: linear-gradient(
    180deg,
    var(--wood-highlight) 0%,
    var(--wood-light) 15%,
    var(--wood-mid) 55%,
    var(--wood-dark) 100%
  );
  border-top: 1px solid rgba(255, 200, 140, 0.15);
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.4),
    0 6px 18px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 220, 170, 0.12);
}

.shelf-plank::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      rgba(0, 0, 0, 0.05) 2px,
      transparent 4px,
      rgba(255, 200, 140, 0.04) 8px,
      transparent 14px,
      rgba(0, 0, 0, 0.08) 20px,
      transparent 28px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      rgba(0, 0, 0, 0.1) 60px,
      transparent 62px,
      transparent 140px,
      rgba(0, 0, 0, 0.08) 142px,
      transparent 144px
    );
  opacity: 0.6;
}

.shelf-row::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
}

/* Rotation fade-out: triggered by a parent flipping `rotating` on, swapping
   the entries, then flipping it off. */
.shelf-row.rotating :deep(.book) {
  animation: fade-out 0.4s ease forwards;
}

@keyframes fade-out {
  to {
    opacity: 0;
    transform: translateY(-6px);
  }
}

@media (max-width: 720px) {
  .shelf-row {
    padding: 0 1rem;
    gap: 2px;
    height: 230px;
  }
}
</style>
