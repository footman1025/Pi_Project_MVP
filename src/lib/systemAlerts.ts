/** Native OS / browser system alerts (Web Notifications API). */

export type PiAlertPayload = {
  title: string
  body: string
  /** In-app path to open on click, e.g. /messages?u=… */
  path?: string
  tag?: string
  /** Prefer showing even when the Pi tab is focused */
  force?: boolean
}

const ICON = '/pi-icon.svg'

export function systemAlertsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function systemAlertPermission(): NotificationPermission | 'unsupported' {
  if (!systemAlertsSupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called from a user gesture the first time (click/tap). */
export async function ensureSystemAlertPermission(): Promise<boolean> {
  if (!systemAlertsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

function titleForType(type: string): string {
  switch (type) {
    case 'message':
      return 'New message on Pi'
    case 'follow':
      return 'New follower on Pi'
    case 'like':
      return 'New like on Pi'
    case 'comment':
      return 'New comment on Pi'
    default:
      return 'Pi notification'
  }
}

function pathForNotification(row: {
  type?: string
  actor_id?: string | null
}): string {
  if (row.type === 'message' && row.actor_id) return `/messages?u=${row.actor_id}`
  if (row.type === 'follow' && row.actor_id) return `/notifications`
  if (row.type === 'like' || row.type === 'comment') return '/feed'
  return '/notifications'
}

/** Skip noisy alerts when the user is already looking at that thread. */
function shouldSuppress(path?: string) {
  if (!path || typeof window === 'undefined') return false
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return false
  const here = window.location.pathname + window.location.search
  if (path.startsWith('/messages')) {
    return here.startsWith('/messages') && (here === path || here.includes(path.split('?')[1] || '___'))
  }
  return here.startsWith(path.split('?')[0])
}

export function showPiSystemAlert(payload: PiAlertPayload) {
  if (!systemAlertsSupported()) return
  if (Notification.permission !== 'granted') return
  if (!payload.force && shouldSuppress(payload.path)) return

  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      icon: ICON,
      badge: ICON,
      tag: payload.tag || `pi-${Date.now()}`,
      data: { path: payload.path || '/notifications' },
    })

    n.onclick = () => {
      try {
        window.focus()
      } catch {
        /* ignore */
      }
      const path = (n.data as { path?: string } | undefined)?.path || payload.path
      if (path) {
        window.dispatchEvent(new CustomEvent('pi:system-alert-click', { detail: { path } }))
      }
      n.close()
    }
  } catch {
    // Some browsers block Notification construction outside secure contexts
  }
}

/** Map a Pi DB notification row → OS toast. */
export function showSystemAlertForRow(row: {
  id?: string
  type?: string
  message?: string | null
  actor_id?: string | null
}) {
  const type = row.type || 'notification'
  const body = (row.message || '').trim() || 'You have a new update on Pi.'
  showPiSystemAlert({
    title: titleForType(type),
    body,
    path: pathForNotification(row),
    tag: row.id ? `pi-notif-${row.id}` : `pi-${type}-${row.actor_id || 'x'}`,
  })
}
