/**
 * Popup wiring:
 *   1. Ask the active tab's content script to scrape the page.
 *   2. Fill the form; user reviews/edits.
 *   3. On submit, ask the service worker to commit.
 *
 * This file never sees the PAT directly — the worker reads it from
 * chrome.storage when handling the commit message.
 */

const $ = (sel) => document.querySelector(sel)

const panels = {
  loading: $('#loading'),
  unsupported: $('#unsupported'),
  notConfigured: $('#not-configured'),
  form: $('#form'),
}

function show(panel) {
  for (const key of Object.keys(panels)) {
    panels[key].classList.toggle('hidden', panels[key] !== panel)
  }
}

function setStatus(type, html) {
  const el = $('#status')
  el.className = `status ${type}`
  el.innerHTML = html
  el.classList.remove('hidden')
}

function clearStatus() {
  $('#status').classList.add('hidden')
}

function isStoryGraphBookUrl(url) {
  try {
    const u = new URL(url)
    return (
      /(^|\.)thestorygraph\.com$/.test(u.hostname) &&
      /^\/books\/[0-9a-f-]{8,}/i.test(u.pathname)
    )
  } catch {
    return false
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

async function scrapeActiveTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'scrape' }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!res) {
        reject(new Error('No response from content script'))
        return
      }
      res.ok ? resolve(res.data) : reject(new Error(res.error))
    })
  })
}

/**
 * Content script isn't injected into pages that loaded before the extension
 * was enabled. We inject on-demand via chrome.scripting so the popup still
 * works on already-open tabs without a refresh.
 */
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content_script.js'],
    })
  } catch {
    // If injection fails we'll find out when sendMessage fails below.
  }
}

async function askWorker(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!res) {
        reject(new Error('No response from background worker'))
        return
      }
      res.ok ? resolve(res.data) : reject(new Error(res.error))
    })
  })
}

function fillForm(data) {
  $('#title').value = data.title || ''
  $('#author').value = data.author || ''
  $('#isbn').value = data.isbn || ''
  $('#year').value = data.year || ''
  $('#coverUrl').value = data.coverUrl || ''
  updateCoverPreview()
}

function updateCoverPreview() {
  const url = $('#coverUrl').value.trim()
  const img = $('#cover')
  const fallback = $('#cover-fallback')
  if (!url) {
    img.classList.remove('loaded')
    img.removeAttribute('src')
    fallback.textContent = 'No cover'
    fallback.style.display = 'block'
    return
  }
  fallback.style.display = 'none'
  img.onload = () => img.classList.add('loaded')
  img.onerror = () => {
    img.classList.remove('loaded')
    fallback.textContent = 'Cover failed to load'
    fallback.style.display = 'block'
  }
  img.src = url
}

function readForm() {
  return {
    title: $('#title').value.trim(),
    author: $('#author').value.trim(),
    isbn: $('#isbn').value.trim() || undefined,
    year: $('#year').value.trim() ? Number($('#year').value.trim()) : undefined,
    coverUrl: $('#coverUrl').value.trim() || undefined,
  }
}

async function init() {
  const tab = await getActiveTab()
  if (!tab || !isStoryGraphBookUrl(tab.url)) {
    show(panels.unsupported)
    return
  }

  // Show repo chip early so user knows where we're committing to.
  try {
    const previewData = await askWorker({ action: 'preview' })
    $('#repo-chip').textContent = `${previewData.cfg.owner}/${previewData.cfg.repo} · ${previewData.count} books`
  } catch (err) {
    // A missing-token error takes us to the options prompt; everything
    // else we surface in the form's status line later.
    if (/missing github token/i.test(err.message)) {
      show(panels.notConfigured)
      return
    }
  }

  await ensureContentScript(tab.id)

  let scraped
  try {
    scraped = await scrapeActiveTab(tab.id)
  } catch (err) {
    show(panels.form)
    setStatus('error', `Could not scrape page: ${err.message}. Fill fields manually.`)
    scraped = {}
  }

  fillForm(scraped)
  show(panels.form)
  if (!scraped.title || !scraped.author) {
    setStatus('info', 'Scrape came up short — please double-check the fields.')
  }
}

document.addEventListener('DOMContentLoaded', init)
$('#coverUrl').addEventListener('input', updateCoverPreview)

$('#cancel').addEventListener('click', () => window.close())
$('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage())

$('#form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const entry = readForm()
  if (!entry.title || !entry.author) {
    setStatus('error', 'Title and author are required.')
    return
  }
  $('#commit').disabled = true
  setStatus('info', 'Committing…')
  try {
    const { commitUrl, count } = await askWorker({ action: 'commit', entry })
    const link = commitUrl
      ? `<a href="${commitUrl}" target="_blank" rel="noopener">view commit</a>`
      : ''
    setStatus('success', `Added. Shelf now has ${count} books. ${link}`)
    $('#repo-chip').textContent = $('#repo-chip').textContent.replace(/\d+ books/, `${count} books`)
  } catch (err) {
    setStatus('error', err.message)
    $('#commit').disabled = false
  }
})
