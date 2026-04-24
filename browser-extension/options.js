const $ = (sel) => document.querySelector(sel)

const DEFAULTS = {
  owner: 'dreshannon',
  repo: 'Bookshelf',
  branch: 'main',
  path: 'src/data/books.json',
  token: '',
}

function setStatus(type, text) {
  const el = $('#status')
  el.className = `status ${type}`
  el.textContent = text
  el.classList.remove('hidden')
}

function clearStatus() {
  $('#status').classList.add('hidden')
}

async function load() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS))
  for (const [k, fallback] of Object.entries(DEFAULTS)) {
    $(`#${k}`).value = stored[k] ?? fallback
  }
}

async function save(event) {
  event?.preventDefault()
  const payload = {}
  for (const k of Object.keys(DEFAULTS)) {
    payload[k] = $(`#${k}`).value.trim()
  }
  if (!payload.token) {
    setStatus('error', 'Token is required.')
    return
  }
  await chrome.storage.sync.set(payload)
  setStatus('success', 'Saved.')
}

async function test() {
  clearStatus()
  const owner = $('#owner').value.trim()
  const repo = $('#repo').value.trim()
  const branch = $('#branch').value.trim()
  const path = $('#path').value.trim()
  const token = $('#token').value.trim()
  if (!token) return setStatus('error', 'Enter a token first.')

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path,
  )}?ref=${encodeURIComponent(branch)}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      setStatus('error', `GitHub says ${res.status}. ${text.slice(0, 160)}`)
      return
    }
    const payload = await res.json()
    const bytes = Uint8Array.from(atob(payload.content.replace(/\n/g, '')), (c) => c.charCodeAt(0))
    const data = JSON.parse(new TextDecoder('utf-8').decode(bytes))
    if (!Array.isArray(data)) {
      setStatus('error', `Fetched ${path} but it is not an array.`)
      return
    }
    setStatus('success', `OK — read ${data.length} books from ${owner}/${repo}@${branch}.`)
  } catch (err) {
    setStatus('error', err.message || String(err))
  }
}

document.addEventListener('DOMContentLoaded', load)
$('#form').addEventListener('submit', save)
$('#test').addEventListener('click', test)
$('#reveal').addEventListener('click', () => {
  const input = $('#token')
  const showing = input.type === 'text'
  input.type = showing ? 'password' : 'text'
  $('#reveal').textContent = showing ? 'Show' : 'Hide'
})
