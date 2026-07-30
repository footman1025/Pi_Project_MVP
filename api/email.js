/**
 * Send transactional email via Resend (optional).
 *
 * Env on Vercel:
 *   RESEND_API_KEY
 *   EMAIL_FROM=Pi <onboarding@yourdomain.com>  (or Resend onboarding domain)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_PUBLIC_APP_URL / PUBLIC_APP_URL (link base)
 *
 * Body: { userId, title, body, path? }
 * Header: Authorization: Bearer <supabase access token>
 */
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

  const resendKey = (process.env.RESEND_API_KEY || '').trim()
  const from = (process.env.EMAIL_FROM || 'Pi <onboarding@resend.dev>').trim()
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://enozvyhkjbqsgcjonxlr.supabase.co').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const appUrl = (process.env.VITE_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '')

  if (!resendKey) {
    res.status(503).json({
      error: 'Email not configured. Set RESEND_API_KEY (and EMAIL_FROM) on the server.',
      configured: false,
    })
    return
  }
  if (!serviceKey) {
    res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY required', configured: false })
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
    const title = body.title || 'Pi notification'
    const notifBody = body.body || 'You have a new update on Pi.'
    const path = body.path || '/notifications'

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required' })
      return
    }

    const anon = createClient(
      supabaseUrl,
      (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim() ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub3p2eWhramJxc2djam9ueGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjI4NDQsImV4cCI6MjEwMDIzODg0NH0.0S3ZMyPUVzRyRFDseAJNf1QT2ZygyItXLh3mVqR7D7o',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('email_enabled, email')
      .eq('user_id', userId)
      .maybeSingle()

    if (!prefs?.email_enabled) {
      res.status(200).json({ sent: false, reason: 'email_disabled' })
      return
    }

    let to = (prefs.email || '').trim()
    if (!to) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId)
      to = authUser?.user?.email || ''
    }
    if (!to) {
      res.status(200).json({ sent: false, reason: 'no_email' })
      return
    }

    const origin =
      appUrl ||
      (typeof req.headers?.origin === 'string' ? req.headers.origin : '') ||
      'https://pi-project-mvp.vercel.app'
    const link = `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

    const html = `
        <div style="font-family:Roboto,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0f1c;color:#e2e8f0;border-radius:16px">
        <div style="font-size:22px;font-weight:800;color:#14b8a6;margin-bottom:8px">π Pi</div>
        <h1 style="font-size:18px;color:#fff;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p style="font-size:14px;line-height:1.5;color:#cbd5e1;margin:0 0 20px">${escapeHtml(notifBody)}</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">Open in Pi</a>
        <p style="font-size:11px;color:#64748b;margin-top:24px">You opted in to email alerts in Pi notification settings. Cellphone alerts use Web Push / Install Pi as an app.</p>
      </div>
    `

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: title,
        html,
      }),
    })

    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      res.status(502).json({ error: 'Resend failed', detail: errText.slice(0, 400) })
      return
    }

    res.status(200).json({ sent: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Email failed' })
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
