<script setup lang="ts">
import type { Book } from '@/types'
import Library from '@/components/Library.vue'
import booksData from '@/data/books.json'

const books = booksData as Book[]
</script>

<template>
  <header>
    <h1>A Life <span class="amp">&amp;</span> Its Margins</h1>
    <div class="sub">A Rotating Library</div>
  </header>

  <Library :books="books" />

  <footer>
    <span class="count">{{ books.length }}</span>
    &nbsp;&middot;&nbsp; Volumes Read
    <a class="credit" href="https://openlibrary.org" target="_blank" rel="noopener">
      Covers courtesy of Open Library
    </a>
  </footer>
</template>

<style scoped>
header {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: 4rem 1.5rem 2rem;
}

header h1 {
  font-family: 'Playfair Display', serif;
  font-weight: 400;
  font-style: italic;
  font-size: clamp(2.2rem, 5vw, 3.8rem);
  letter-spacing: 0.02em;
  color: var(--paper-warm);
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.6);
  margin-bottom: 0.4rem;
}

header h1 .amp {
  color: #c89968;
}

header .sub {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: #a8896a;
  opacity: 0.85;
}

footer {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: 2rem 1rem 3rem;
  font-family: 'Cormorant Garamond', serif;
  font-size: 0.85rem;
  color: #8a6f52;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

footer .count {
  color: #c89968;
  font-weight: 600;
}

footer a.credit {
  display: block;
  margin-top: 0.8rem;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: #6a543a;
  text-decoration: none;
  transition: color 0.2s;
}

footer a.credit:hover {
  color: #c89968;
}

@media (max-width: 720px) {
  header {
    padding: 2.5rem 1rem 1.5rem;
  }
}
</style>
