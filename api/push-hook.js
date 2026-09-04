/**
 * Server-side Web Push from a Supabase Database Webhook (notification INSERT).
 * This is what alerts when the recipient’s Pi tab is fully closed — even if the
 * sender’s browser never finished /api/push.
 *
 * Env (Vercel):
 *   PUSH_HOOK_SECRET          — shared secret (header x-pi-push-secret)
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_URL
 *   VITE_PUBLIC_APP_URL
 *
 * Supabase → Database Webhooks → INSERT on public.notifications →
 *   URL: https://YOUR_APP/api/push-hook
 *   HTTP Header: x-pi-push-secret: <PUSH_HOOK_SECRET>
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function defaultTitle(type) {
  switch (type) {
    case 'message':
      return 'New message on Pi'
    case 'follow':
      return 'New follower on Pi'
    case 'like':
      return 'New like on Pi'
    case 'comment':
      return 'New comment on Pi'
    case 'ai_match':
      return 'Pi Intelligence'
    case 'ai_opportunity':
      return 'Pi Opportunity'
    default:
      return 'Pi notification'
  }
}

function defaultPath(type, actorId) {
  if (type === 'message' && actorId) return `/messages?u=${actorId}`
  if (type === 'follow') return '/notifications'
  if (type === 'like' || type === 'comment') return '/feed'
  if (type === 'ai_match') return '/match'
  if (type === 'ai_opportunity') return '/opportunities'
  return '/notifications'
}

function pushTag(type, id, actorId) {
  if (type === 'message') return `pi-msg-${actorId || 'x'}`
  if (type === 'follow') return `pi-follow-${actorId || 'x'}`
  if (type === 'like') return `pi-like-${id || 'x'}`
  if (type === 'comment') return `pi-comment-${id || 'x'}`
  if (type === 'ai_match') return 'pi-ai-match'
  if (type === 'ai_opportunity') return 'pi-ai-opp'
  return `pi-notif-${id || 'x'}`
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const secret = (process.env.PUSH_HOOK_SECRET || '').trim()
  const provided = String(req.headers['x-pi-push-secret'] || req.headers['authorization'] || '')
    .replace(/^Bearer\s+/i, '')
    .trim()
  if (!secret || provided !== secret) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const vapidPublic = (process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '').trim()
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim()
  const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:pi@pi.app').trim()
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://enozvyhkjbqsgcjonxlr.supabase.co'
  ).trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!vapidPublic || !vapidPrivate || !serviceKey) {
    res.status(503).json({ error: 'Push hook not fully configured', configured: false })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    // Supabase webhook: { type, table, record, ... } or direct { user_id, ... }
    const record = body.record || body
    const userId = record.user_id || record.userId
    const type = record.type || 'notification'
    const actorId = record.actor_id || record.actorId || null
    const notifId = record.id || 'x'
    const message = (record.message || '').trim() || 'You have a new update on Pi.'

    if (!userId) {
      res.status(400).json({ error: 'user_id required' })
      return
    }

    // Skip noisy AI suggestion spam from hook if desired — still allow opportunity owner alerts
    // (ai_opportunity is used for hub interest too)

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefs && prefs.push_enabled === false) {
      res.status(200).json({ sent: 0, skipped: true, reason: 'push_disabled' })
      return
    }

    const { data: rows, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }
    if (!rows?.length) {
      res.status(200).json({ sent: 0, message: 'No push subscriptions for user' })
      return
    }

    const origin = (
      process.env.VITE_PUBLIC_APP_URL ||
      process.env.PUBLIC_APP_URL ||
      ''
    ).replace(/\/$/, '')
    const icon = origin ? `${origin}/pi-logo-192.png` : '/pi-logo-192.png'
    const badge = origin ? `${origin}/pi-badge-96.png` : '/pi-badge-96.png'
    const title = defaultTitle(type)
    const path = defaultPath(type, actorId)
    const tag = pushTag(type, notifId, actorId)
    const payload = JSON.stringify({
      title,
      body: message,
      path,
      tag,
      icon,
      badge,
      type,
      playSound: type === 'message' || type === 'follow',
    })

    let sent = 0
    const stale = []
    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
          )
          sent += 1
        } catch (e) {
          const status = e?.statusCode
          if (status === 404 || status === 410) stale.push(row.id)
        }
      }),
    )

    if (stale.length) {
      await admin.from('push_subscriptions').delete().in('id', stale)
    }

    res.status(200).json({ sent, stale: stale.length })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Push hook failed' })
  }
}
