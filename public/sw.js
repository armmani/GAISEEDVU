/* GAI SEED VU — service worker
   Handles web push notifications and an offline fallback page. */

const OFFLINE_URL = '/offline.html'
const CACHE = 'gaiseedvu-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Only navigations are handled: everything else goes straight to the network,
// so pages and API calls are never served stale.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL)
      return cached || Response.error()
    }),
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'GAI SEED VU', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'GAI SEED VU'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/badge-96.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'gaiseedvu',
    renotify: true,
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Already open somewhere → reuse that window instead of opening another.
        if ('focus' in client) {
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
