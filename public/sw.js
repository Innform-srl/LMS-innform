const CACHE_NAME = 'innform-lms-v1'

const PRECACHE_URLS = [
  '/lms',
  '/lms/login',
]

// Install: precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: network-first for navigations and API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-HTTP(S) schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API routes, auth, and cron
  if (url.pathname.startsWith('/lms/api/')) return

  // Static assets (fonts, icons, CSS, JS): cache-first with network fallback
  if (
    url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|jpeg|webp|avif|ico)$/) ||
    url.pathname.startsWith('/lms/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => {
          // Network failed and no cache — return empty response to avoid crash
          return new Response('', { status: 503, statusText: 'Service Unavailable' })
        })
      })
    )
    return
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/lms')))
    )
    return
  }
})
