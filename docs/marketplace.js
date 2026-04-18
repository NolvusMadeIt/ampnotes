const customSystemTheme = {
  id: 'theme.custom-system',
  name: 'Custom System',
  version: '1.0.0',
  author: 'NolvusMadeIt',
  description: 'Created with the AMP theme builder.',
  tokens: {
    light: {
      '--bg': '#f7f8fb',
      '--surface': '#ffffff',
      '--surface-2': '#f0f2f5',
      '--text': '#101114',
      '--text-muted': '#606775',
      '--border': '#d9dde5',
      '--popover': '#ffffff',
      '--popover-foreground': '#101114',
      '--input': '#eef1f5',
      '--ring': '#111111',
      '--accent': '#111111',
      '--accent-contrast': '#ffffff',
      '--success': '#16855f',
      '--warning': '#a86818',
      '--danger': '#b33a3a',
      '--chart-1': '#7c9cff',
      '--chart-2': '#4fb6a3',
      '--chart-3': '#d9984a',
      '--chart-4': '#8c6ce8',
      '--chart-5': '#d45d7c',
      '--sidebar': '#eef1f5',
      '--sidebar-foreground': '#20242c',
      '--sidebar-primary': '#111111',
      '--sidebar-accent': '#e1e6ee',
      '--sidebar-border': '#d2d8e2',
      '--radius-md': '0.5rem',
      '--shadow-panel': '0 10px 30px rgba(0, 0, 0, 0.12)',
      '--font-sans': 'Geist, Public Sans, sans-serif',
      '--font-serif': 'Source Serif 4, Georgia, serif',
      '--font-mono': 'JetBrains Mono, monospace'
    },
    dark: {
      '--bg': '#090a0d',
      '--surface': '#111318',
      '--surface-2': '#181b22',
      '--text': '#f4f6fb',
      '--text-muted': '#a4adbb',
      '--border': '#252a33',
      '--popover': '#151820',
      '--popover-foreground': '#f4f6fb',
      '--input': '#1d212b',
      '--ring': '#f4f6fb',
      '--accent': '#f4f6fb',
      '--accent-contrast': '#090a0d',
      '--success': '#43b581',
      '--warning': '#d69a35',
      '--danger': '#e36a6a',
      '--chart-1': '#7c9cff',
      '--chart-2': '#43b581',
      '--chart-3': '#d69a35',
      '--chart-4': '#9a7cff',
      '--chart-5': '#e36a9a',
      '--sidebar': '#08090c',
      '--sidebar-foreground': '#d7deea',
      '--sidebar-primary': '#f4f6fb',
      '--sidebar-accent': '#151923',
      '--sidebar-border': '#202532',
      '--radius-md': '0.5rem',
      '--shadow-panel': '0 10px 30px rgba(0, 0, 0, 0.12)',
      '--font-sans': 'Geist, Public Sans, sans-serif',
      '--font-serif': 'Source Serif 4, Georgia, serif',
      '--font-mono': 'JetBrains Mono, monospace'
    }
  }
}

const pluginExample = {
  id: 'tools.wordcount',
  name: 'Word Count',
  version: '1.0.0',
  description: 'Adds {wordcount} and {tools.wordcount} token support to AMP markdown prompts.',
  author: 'NolvusMadeIt',
  entry: 'plugins/wordcount/index.js',
  permissions: ['prompt.read', 'template.read']
}

const starterListings = [
  {
    id: 'custom-system',
    type: 'theme',
    title: 'Custom System',
    author: 'NolvusMadeIt',
    description: 'A balanced AMP design-system theme with light and dark token coverage.',
    image: '',
    manifest: customSystemTheme
  },
  {
    id: 'word-count',
    type: 'plugin',
    title: 'Word Count',
    author: 'NolvusMadeIt',
    description: 'A small utility plugin for live markdown word counts in prompt editing surfaces.',
    image: '',
    manifest: pluginExample
  },
  {
    id: 'prompt-gallery-kit',
    type: 'theme',
    title: 'Prompt Gallery Kit',
    author: 'AMP Labs',
    description: 'A showcase-ready theme concept for prompt cards, marketplace grids, and resource pages.',
    image: '',
    manifest: customSystemTheme
  }
]

const state = {
  filter: 'all',
  listings: loadListings()
}

const gallery = document.querySelector('.showcase-grid')
const form = document.querySelector('[data-submit-form]')
const manifestField = form.elements.manifest
const themeToggle = document.querySelector('[data-theme-toggle]')

manifestField.value = JSON.stringify(customSystemTheme, null, 2)
renderGallery()

function loadListings() {
  try {
    const stored = JSON.parse(localStorage.getItem('amp.marketplace.listings') || '[]')
    return [...starterListings, ...stored]
  } catch {
    return starterListings
  }
}

function persistUserListings() {
  const customListings = state.listings.filter((listing) => !starterListings.some((starter) => starter.id === listing.id))
  localStorage.setItem('amp.marketplace.listings', JSON.stringify(customListings))
}

function renderGallery() {
  const visible = state.filter === 'all' ? state.listings : state.listings.filter((item) => item.type === state.filter)
  gallery.innerHTML = visible.map(renderCard).join('')

  gallery.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.listings.find((listing) => listing.id === button.dataset.copy)
      if (item) copyText(JSON.stringify(item.manifest, null, 2), 'Manifest copied')
    })
  })

  gallery.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.listings.find((listing) => listing.id === button.dataset.export)
      if (item) downloadJson(`${slugify(item.title)}.json`, item.manifest)
    })
  })
}

function renderCard(item) {
  const artwork = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)} preview" />`
    : `<div class="fallback-art" aria-hidden="true"><span class="fallback-row"></span><span class="fallback-row"></span><span class="fallback-row"></span></div>`

  return `
    <article class="resource-card" data-type="${item.type}">
      <div class="resource-art">${artwork}</div>
      <div class="resource-copy">
        <div class="card-meta"><span>${item.type}</span><span>${escapeHtml(item.author)}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="resource-actions">
          <button class="button secondary" type="button" data-copy="${item.id}">Copy manifest</button>
          <button class="button primary" type="button" data-export="${item.id}">Export</button>
        </div>
      </div>
    </article>
  `
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button))
    renderGallery()
  })
})

themeToggle.addEventListener('click', () => {
  const nextMode = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.mode = nextMode
  themeToggle.textContent = nextMode === 'dark' ? 'Light' : 'Dark'
})

form.elements.type.addEventListener('change', () => {
  manifestField.value = JSON.stringify(form.elements.type.value === 'plugin' ? pluginExample : customSystemTheme, null, 2)
})

form.elements.image.addEventListener('change', async () => {
  const [file] = form.elements.image.files
  if (!file) return
  const dataUrl = await readFileAsDataUrl(file)
  form.dataset.image = dataUrl
})

form.addEventListener('submit', (event) => {
  event.preventDefault()
  let manifest
  try {
    manifest = JSON.parse(manifestField.value)
  } catch {
    alert('Manifest JSON is not valid yet.')
    return
  }

  const listing = {
    id: `${slugify(form.elements.title.value)}-${Date.now()}`,
    type: form.elements.type.value,
    title: form.elements.title.value.trim(),
    author: form.elements.author.value.trim(),
    description: form.elements.description.value.trim(),
    image: form.dataset.image || '',
    manifest
  }

  state.listings = [listing, ...state.listings]
  persistUserListings()
  form.reset()
  form.elements.title.value = 'Custom System'
  form.elements.description.value = 'Clean light and dark design-system tokens created with the AMP theme builder.'
  form.elements.author.value = 'NolvusMadeIt'
  form.elements.manifest.value = JSON.stringify(customSystemTheme, null, 2)
  delete form.dataset.image
  renderGallery()
  document.querySelector('#gallery').scrollIntoView({ behavior: 'smooth' })
})

document.querySelector('[data-export-current]').addEventListener('click', () => {
  try {
    downloadJson(`${slugify(form.elements.title.value || 'amp-manifest')}.json`, JSON.parse(manifestField.value))
  } catch {
    alert('Manifest JSON is not valid yet.')
  }
})

document.querySelector('[data-export-gallery]').addEventListener('click', () => {
  downloadJson('amp-marketplace-gallery.json', state.listings)
})

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function copyText(value, message) {
  await navigator.clipboard.writeText(value)
  themeToggle.textContent = message
  window.setTimeout(() => {
    themeToggle.textContent = document.documentElement.dataset.mode === 'dark' ? 'Light' : 'Dark'
  }, 1400)
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'amp-resource'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char])
}
