/**
 * Send Web Push to a user's saved subscriptions.
 *
 * Env (Vercel):
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT=mailto:you@example.com
 *   SUPABASE_URL (or reuse project URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Body: { userId, title, body, path?, tag? }
 * Header: Authorization: Bearer <supabase access token> (any logged-in user)
 */
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

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

  const vapidPublic = (process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '').trim()
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim()
  const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:pi@pi.app').trim()
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://enozvyhkjbqsgcjonxlr.supabase.co').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!vapidPublic || !vapidPrivate) {
    res.status(503).json({
      error: 'Web Push not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the server.',
      configured: false,
    })
    return
  }
  if (!serviceKey) {
    res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is required to look up push subscriptions.',
      configured: false,
    })
    return
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization bearer token' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const userId = body.userId
    const title = body.title || 'Pi'
    const notifBody = body.body || 'You have a new update on Pi.'
    const path = body.path || '/notifications'
    const tag = body.tag || `pi-${Date.now()}`

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' })
      return
    }

    const anon = createClient(
      supabaseUrl,
      (process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub3p2eWhramJxc2djam9ueGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjI4NDQsImV4cCI6MjEwMDIzODg0NH0.0S3ZMyPUVzRyRFDseAJNf1QT2ZygyItXLh3mVqR7D7o').trim(),
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    )
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

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

    const payload = JSON.stringify({ title, body: notifBody, path, tag })
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
    res.status(500).json({ error: e instanceof Error ? e.message : 'Push failed' })
  }
}
