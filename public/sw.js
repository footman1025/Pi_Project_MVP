/* Pi service worker — push + notification click → open deep link */
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: 'Pi',
    body: 'You have a new update on Pi.',
    path: '/notifications',
    tag: 'pi-push',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data && event.data.text()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pi', {
      body: data.body || '',
      icon: '/pi-icon.svg',
      badge: '/pi-icon.svg',
      tag: data.tag || 'pi-push',
      data: { path: data.path || '/notifications' },
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = (event.notification.data && event.notification.data.path) || '/notifications'
  const url = new URL(path, self.location.origin).href

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          client.postMessage({ type: 'pi:navigate', path })
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url)
      }
    })(),
  )
})

/** Page → SW: show a local system notification (tab open/background). */
self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || msg.type !== 'pi:show-notification') return
  const { title, body, path, tag } = msg
  event.waitUntil(
    self.registration.showNotification(title || 'Pi', {
      body: body || '',
      icon: '/pi-icon.svg',
      badge: '/pi-icon.svg',
      tag: tag || `pi-local-${Date.now()}`,
      data: { path: path || '/notifications' },
    }),
  )
})
