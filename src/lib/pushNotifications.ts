import { supabase } from './supabase'
import { PI_NOTIF_BADGE_PATH, PI_NOTIF_ICON_PATH, notificationBadgeUrl, notificationIconUrl } from './notificationBrand'
import { isOnline, withRetry } from './messagingReliability'

const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function registerPiServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js?v=brand-icon-v2', { scope: '/' })
    // Force update so new brand PNG icons apply after deploy
    void reg.update()
    await navigator.serviceWorker.ready

    // Deep-link navigation from notification click
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data
      if (data?.type === 'pi:navigate' && data.path) {
        window.dispatchEvent(new CustomEvent('pi:system-alert-click', { detail: { path: data.path } }))
      }
    })

    return reg
  } catch {
    return null
  }
}

/** Enable OS / browser push (gesture required). Saves subscription for closed-app delivery. */
export async function enablePushNotifications(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isOnline()) return { ok: false, reason: 'offline' }
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (!VAPID_PUBLIC) {
    // Still request Notification permission for foreground/background tab toasts via SW
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return { ok: false, reason: 'denied' }
      await registerPiServiceWorker()
      return { ok: true, reason: 'local-only' }
    } catch {
      return { ok: false, reason: 'denied' }
    }
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'denied' }

  const reg = await registerPiServiceWorker()
  if (!reg) return { ok: false, reason: 'sw-failed' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return { ok: false, reason: 'bad-subscription' }

  try {
    await withRetry(async () => {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' },
      )
      if (error) throw new Error(error.message)
    }, { attempts: 2, baseMs: 400, label: 'Could not save push subscription' })
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'save-failed' }
  }
}

/** Show notification via SW (works when tab is backgrounded). Falls back to Notification API. */
export async function showLocalPush(payload: {
  title: string
  body: string
  path?: string
  tag?: string
}) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return

  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg?.active) {
      reg.active.postMessage({
        type: 'pi:show-notification',
        title: payload.title,
        body: payload.body,
        path: payload.path || '/notifications',
        tag: payload.tag,
        icon: PI_NOTIF_ICON_PATH,
        badge: PI_NOTIF_BADGE_PATH,
      })
      return
    }
  } catch {
    /* fall through */
  }

  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      icon: notificationIconUrl(),
      badge: notificationBadgeUrl(),
      tag: payload.tag,
      data: { path: payload.path },
    })
    n.onclick = () => {
      window.focus()
      window.dispatchEvent(
        new CustomEvent('pi:system-alert-click', { detail: { path: payload.path || '/notifications' } }),
      )
      n.close()
    }
  } catch {
    /* ignore */
  }
}

/** Deliver remote Web Push to another user (closed-app capable when VAPID configured). */
export async function sendPushToUser(opts: {
  userId: string
  title: string
  body: string
  path?: string
  tag?: string
}) {
  try {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', opts.userId)
      .maybeSingle()
    if (prefs && prefs.push_enabled === false) return

    const { getAuthAccessToken } = await import('./authBridge')
    const token = getAuthAccessToken()
    if (!token) return

    await fetch('/api/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(opts),
    })
  } catch {
    /* non-blocking */
  }
}
