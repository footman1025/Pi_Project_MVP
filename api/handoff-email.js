/**
 * Email for Contact & Partnership handoffs (/connect → Speak with a Human).
 *
 * Always emails whatever address the visitor typed in the form.
 * Optionally also emails HANDOFF_NOTIFY_EMAIL (comma-separated team list).
 *
 * Env (Vercel):
 *   RESEND_API_KEY
 *   EMAIL_FROM=Pi <onboarding@resend.dev>   // test mode: only your Resend signup email works as "to"
 *   HANDOFF_NOTIFY_EMAIL=a@x.com,b@y.com   // optional extra team copies
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_PUBLIC_APP_URL
 *
 * Body: { handoffId }
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
  const teamList = parseEmails(process.env.HANDOFF_NOTIFY_EMAIL || '')
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const appUrl = (process.env.VITE_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://pi-project-mvp.vercel.app').replace(/\/$/, '')

  if (!resendKey) {
    res.status(503).json({ error: 'RESEND_API_KEY not set', configured: false })
    return
  }
  if (!serviceKey || !supabaseUrl) {
    res.status(503).json({ error: 'Supabase service credentials missing', configured: false })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const handoffId = body.handoffId
    if (!handoffId || typeof handoffId !== 'string') {
      res.status(400).json({ error: 'handoffId is required' })
      return
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: handoff, error } = await admin
      .from('contact_handoffs')
      .select('id, team, visitor_name, visitor_email, visitor_org, intent, summary, created_at')
      .eq('id', handoffId)
      .maybeSingle()

    if (error || !handoff) {
      res.status(404).json({ error: 'Handoff not found' })
      return
    }

    const visitorEmail = (handoff.visitor_email || '').trim().toLowerCase()
    const visitorName = handoff.visitor_name || 'there'
    const teamLabel = handoff.team || 'team'
    const inboxLink = `${appUrl}/handoffs`
    const connectLink = `${appUrl}/connect`

    const warnings = []
    let visitorSent = false
    let teamSent = false

    // 1) Always email the address typed in the Speak-with-a-Human form
    if (visitorEmail) {
      const visitorHtml = `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0f1c;color:#e2e8f0;border-radius:16px">
          <div style="font-size:22px;font-weight:800;color:#14b8a6;margin-bottom:8px">π Pi</div>
          <h1 style="font-size:18px;color:#fff;margin:0 0 12px">We received your message</h1>
          <p style="font-size:14px;line-height:1.5;color:#cbd5e1;margin:0 0 12px">
            Hi ${escapeHtml(visitorName)}, thanks for contacting Pi. Your conversation was routed to
            <strong style="color:#fff">${escapeHtml(teamLabel)}</strong> with full context so our team won’t ask you to repeat yourself.
          </p>
          <p style="font-size:13px;line-height:1.5;color:#94a3b8;margin:0 0 20px;white-space:pre-wrap">${escapeHtml(handoff.summary || '')}</p>
          <a href="${connectLink}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">Back to Pi</a>
        </div>
      `
      const r = await sendResend({
        resendKey,
        from,
        to: [visitorEmail],
        subject: `Pi — we received your ${teamLabel} request`,
        html: visitorHtml,
      })
      visitorSent = r.ok
      if (!r.ok) {
        warnings.push(
          `Could not email ${visitorEmail}: ${r.error}. ` +
            'With EMAIL_FROM = onboarding@resend.dev, Resend only allows delivery to your Resend account email. ' +
            'To email ANY address typed in the form, verify your own domain in Resend and set EMAIL_FROM to Pi <noreply@yourdomain.com>.',
        )
      }
    } else {
      warnings.push('No email was typed in the form — nothing to send to the visitor.')
    }

    // 2) Optional extra copies to team list (does not replace the form email)
    const teamRecipients = teamList.filter(e => e !== visitorEmail)
    if (teamRecipients.length) {
      const teamHtml = `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0f1c;color:#e2e8f0;border-radius:16px">
          <div style="font-size:22px;font-weight:800;color:#14b8a6;margin-bottom:8px">π Pi · New handoff</div>
          <p style="font-size:14px;color:#cbd5e1;margin:0 0 12px">
            <strong style="color:#fff">${escapeHtml(visitorName)}</strong>
            &lt;${escapeHtml(visitorEmail || 'no email')}&gt;
            → <strong style="color:#14b8a6">${escapeHtml(teamLabel)}</strong>
          </p>
          <p style="font-size:13px;line-height:1.5;color:#94a3b8;margin:0 0 20px;white-space:pre-wrap">${escapeHtml(handoff.summary || '')}</p>
          <a href="${inboxLink}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">Open handoffs inbox</a>
        </div>
      `
      const r = await sendResend({
        resendKey,
        from,
        to: teamRecipients,
        subject: `[Pi] New ${teamLabel} handoff — ${visitorName}`,
        html: teamHtml,
      })
      teamSent = r.ok
      if (!r.ok) warnings.push(`Team copy failed: ${r.error}`)
    }

    res.status(200).json({
      ok: visitorSent || teamSent,
      visitorSent,
      teamSent,
      sentTo: visitorSent ? visitorEmail : null,
      warnings,
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Handoff email failed' })
  }
}

function parseEmails(raw) {
  return String(raw)
    .split(/[,;\s]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.includes('@'))
}

async function sendResend({ resendKey, from, to, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!r.ok) {
    const errText = await r.text().catch(() => '')
    return { ok: false, error: errText.slice(0, 300) || `HTTP ${r.status}` }
  }
  return { ok: true }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
