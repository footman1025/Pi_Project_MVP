/* Pi service worker — push + alien alert cue when a client is open
 * Chrome requires PNG icons (SVG falls back to browser icon).
 * Closed-app: OS notification + system sound (custom alien tone needs an open Pi tab/PWA).
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

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

async function notifyOpenClients(message) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of all) {
    try {
      client.postMessage(message)
    } catch {
      /* ignore */
    }
  }
  return all.length
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'Pi',
    body: 'You have a new update on Pi.',
    path: '/notifications',
    tag: 'pi-push',
    icon: PI_ICON,
    badge: PI_BADGE,
    type: '',
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
  const playAlien = data.type === 'message' || data.type === 'follow' || data.playSound === true

  event.waitUntil(
    (async () => {
      const openCount = await notifyOpenClients({
        type: 'pi:push-received',
        path: data.path || '/notifications',
        playSound: playAlien,
        notifType: data.type || '',
      })

      // Always show OS toast — this is what alerts when the website/tab is closed.
      await self.registration.showNotification(data.title || 'Pi', {
        body: data.body || '',
        icon,
        badge,
        tag: data.tag || 'pi-push',
        data: { path: data.path || '/notifications', type: data.type || '' },
        renotify: data.tag === 'pi-ai-match' || data.tag === 'pi-ai-opp' ? false : true,
        silent: false,
        vibrate: playAlien ? [120, 60, 120, 60, 200] : [100, 50, 100],
      })

      // If a Pi window exists, ask it to play the alien ring (Web Audio cannot run from SW alone).
      if (openCount > 0 && playAlien) {
        await notifyOpenClients({ type: 'pi:play-alert-sound' })
      }
    })(),
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
  const { title, body, path, tag, icon, badge, notifType } = msg
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title || 'Pi', {
        body: body || '',
        icon: abs(icon || PI_ICON),
        badge: abs(badge || PI_BADGE),
        tag: tag || `pi-local-${Date.now()}`,
        data: { path: path || '/notifications', type: notifType || '' },
        silent: false,
        vibrate: notifType === 'message' || notifType === 'follow' ? [120, 60, 120] : [80],
        renotify: true,
      })
      if (notifType === 'message' || notifType === 'follow') {
        await notifyOpenClients({ type: 'pi:play-alert-sound' })
      }
    })(),
  )
})
