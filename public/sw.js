/* Pi service worker — push + notification click → open deep link
 * Chrome requires PNG icons (SVG falls back to browser icon).
 */
const PI_ICON = '/pi-logo-192.png'
const PI_BADGE = '/pi-badge-96.png'

function abs(path) {
  try {
    return new URL(path, self.location.origin).href
  } catch {
    return path
  }
}

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
    icon: PI_ICON,
    badge: PI_BADGE,
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

  const icon = abs(data.icon || PI_ICON)
  const badge = abs(data.badge || PI_BADGE)

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pi', {
      body: data.body || '',
      icon,
      badge,
      image: undefined,
      tag: data.tag || 'pi-push',
      data: { path: data.path || '/notifications' },
      // Same tag replaces older alert (prevents stacking identical AI suggestions)
      renotify: data.tag === 'pi-ai-match' || data.tag === 'pi-ai-opp' ? false : true,
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
  const { title, body, path, tag, icon, badge } = msg
  event.waitUntil(
    self.registration.showNotification(title || 'Pi', {
      body: body || '',
      icon: abs(icon || PI_ICON),
      badge: abs(badge || PI_BADGE),
      tag: tag || `pi-local-${Date.now()}`,
      data: { path: path || '/notifications' },
    }),
  )
})
