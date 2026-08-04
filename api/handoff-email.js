/**
 * Email for Contact & Partnership handoffs (/connect → Speak with a Human).
 *
 * Env (Vercel):
 *   RESEND_API_KEY
 *   EMAIL_FROM=Pi <onboarding@resend.dev>   // test mode — only RESEND_ACCOUNT_EMAIL works as "to"
 *   RESEND_ACCOUNT_EMAIL=gabriel961025@gmail.com  // Resend signup email (required in test mode)
 *   HANDOFF_NOTIFY_EMAIL=a@x.com,b@y.com   // optional team copies (need verified domain for non-account)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_PUBLIC_APP_URL
 *
 * Body: { handoffId }
 *
 * Production: verify a domain at resend.com/domains and set
 *   EMAIL_FROM=Pi <noreply@yourdomain.com>
 * so any visitor/team address can receive mail.
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
  const accountEmail = (process.env.RESEND_ACCOUNT_EMAIL || '').trim().toLowerCase()
  const teamList = parseEmails(process.env.HANDOFF_NOTIFY_EMAIL || '')
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const appUrl = (process.env.VITE_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://pi-project-mvp.vercel.app').replace(/\/$/, '')
  const testMode = isResendTestFrom(from)

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
    let fallbackSent = false

    const canDeliver = (email) => {
      if (!email) return false
      if (!testMode) return true
      if (!accountEmail) return false
      return email === accountEmail
    }

    // 1) Visitor confirmation (only when Resend can deliver)
    if (visitorEmail) {
      if (canDeliver(visitorEmail)) {
        const visitorHtml = `
          <div style="font-family:Roboto,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0f1c;color:#e2e8f0;border-radius:16px">
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
          warnings.push(friendlyResendError(r.error, visitorEmail, testMode))
        }
      } else {
        warnings.push(
          testMode
            ? `Visitor confirmation to ${visitorEmail} skipped (Resend test mode). Verify a domain at resend.com/domains and set EMAIL_FROM to Pi <noreply@yourdomain.com>.`
            : `Could not email visitor ${visitorEmail}.`,
        )
      }
    } else {
      warnings.push('No email was typed in the form — nothing to send to the visitor.')
    }

    // 2) Team copies — only addresses Resend can deliver right now
    const teamRecipients = uniqueEmails(
      teamList.filter(e => e !== visitorEmail && canDeliver(e)),
    )
    // In test mode, always try the Resend account so the team never misses a handoff
    if (testMode && accountEmail && !teamRecipients.includes(accountEmail) && accountEmail !== visitorEmail) {
      teamRecipients.push(accountEmail)
    }
    if (testMode && !accountEmail) {
      warnings.push(
        'Set RESEND_ACCOUNT_EMAIL to your Resend signup email (e.g. gabriel961025@gmail.com) so team alerts work in test mode.',
      )
    }

    if (teamRecipients.length) {
      const teamHtml = teamDigestHtml({
        visitorName,
        visitorEmail,
        teamLabel,
        summary: handoff.summary || '',
        inboxLink,
        testMode,
        visitorConfirmSkipped: Boolean(visitorEmail && !visitorSent),
      })
      const r = await sendResend({
        resendKey,
        from,
        to: teamRecipients,
        subject: `[Pi] New ${teamLabel} handoff — ${visitorName}`,
        html: teamHtml,
      })
      teamSent = r.ok
      if (!r.ok) warnings.push(friendlyResendError(r.error, teamRecipients.join(', '), testMode))
    }

    // 3) Last-resort fallback: if nothing delivered, try account email alone
    if (!visitorSent && !teamSent && accountEmail && canDeliver(accountEmail)) {
      const r = await sendResend({
        resendKey,
        from,
        to: [accountEmail],
        subject: `[Pi] New ${teamLabel} handoff — ${visitorName}`,
        html: teamDigestHtml({
          visitorName,
          visitorEmail,
          teamLabel,
          summary: handoff.summary || '',
          inboxLink,
          testMode: true,
          visitorConfirmSkipped: true,
        }),
      })
      fallbackSent = r.ok
      if (!r.ok) warnings.push(friendlyResendError(r.error, accountEmail, true))
    }

    const anySent = visitorSent || teamSent || fallbackSent
    const userMessage = buildUserMessage({
      visitorSent,
      teamSent: teamSent || fallbackSent,
      visitorEmail,
      accountEmail,
      testMode,
      warnings,
    })

    res.status(200).json({
      ok: anySent,
      visitorSent,
      teamSent: teamSent || fallbackSent,
      sentTo: visitorSent ? visitorEmail : null,
      testMode,
      userMessage,
      warnings,
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Handoff email failed' })
  }
}

function isResendTestFrom(from) {
  return /@resend\.dev\b/i.test(from)
}

function parseEmails(raw) {
  return String(raw)
    .split(/[,;\s]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.includes('@'))
}

function uniqueEmails(list) {
  return [...new Set(list.filter(Boolean))]
}

function friendlyResendError(raw, to, testMode) {
  const text = String(raw || '')
  if (/only send testing emails|verify a domain/i.test(text)) {
    return (
      `Could not email ${to}: Resend test sender only delivers to your Resend account email. ` +
      'Verify a domain at resend.com/domains and set EMAIL_FROM=Pi <noreply@yourdomain.com>.'
    )
  }
  // Avoid dumping raw JSON into the UI
  try {
    const j = JSON.parse(text)
    if (j?.message) return `Could not email ${to}: ${j.message}`
  } catch {
    /* ignore */
  }
  const short = text.replace(/\s+/g, ' ').slice(0, 180)
  return `Could not email ${to}${short ? `: ${short}` : ''}.${testMode ? ' (Resend test mode)' : ''}`
}

function buildUserMessage({ visitorSent, teamSent, visitorEmail, accountEmail, testMode, warnings }) {
  if (visitorSent && teamSent) return `Confirmation emailed to ${visitorEmail}. Team notified.`
  if (visitorSent) return `Confirmation emailed to ${visitorEmail}.`
  if (teamSent && testMode) {
    return (
      `Handoff saved. Team alert sent${accountEmail ? ` to ${accountEmail}` : ''}. ` +
      `Visitor confirmation to ${visitorEmail || 'the form email'} needs a verified Resend domain.`
    )
  }
  if (teamSent) return 'Team was notified by email.'
  return warnings[0] || 'Handoff saved in team inbox — email not sent.'
}

function teamDigestHtml({
  visitorName,
  visitorEmail,
  teamLabel,
  summary,
  inboxLink,
  testMode,
  visitorConfirmSkipped,
}) {
  const note =
    testMode && visitorConfirmSkipped
      ? `<p style="font-size:12px;line-height:1.45;color:#fbbf24;margin:0 0 16px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25)">
          Resend test mode: visitor confirmation was <strong>not</strong> sent to ${escapeHtml(visitorEmail || 'n/a')}.
          Reply to them manually, or verify a domain and update EMAIL_FROM.
        </p>`
      : ''
  return `
    <div style="font-family:Roboto,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0f1c;color:#e2e8f0;border-radius:16px">
      <div style="font-size:22px;font-weight:800;color:#14b8a6;margin-bottom:8px">π Pi · New handoff</div>
      <p style="font-size:14px;color:#cbd5e1;margin:0 0 12px">
        <strong style="color:#fff">${escapeHtml(visitorName)}</strong>
        &lt;${escapeHtml(visitorEmail || 'no email')}&gt;
        → <strong style="color:#14b8a6">${escapeHtml(teamLabel)}</strong>
      </p>
      ${note}
      <p style="font-size:13px;line-height:1.5;color:#94a3b8;margin:0 0 20px;white-space:pre-wrap">${escapeHtml(summary)}</p>
      <a href="${inboxLink}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px">Open handoffs inbox</a>
    </div>
  `
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
    return { ok: false, error: errText.slice(0, 500) || `HTTP ${r.status}` }
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
