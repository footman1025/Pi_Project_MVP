/**
 * Confirm Stripe Checkout payment and activate featured listing.
 * Body: { sessionId }
 * Header: Authorization Bearer <supabase access token>
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

  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim()
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://enozvyhkjbqsgcjonxlr.supabase.co'
  ).trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub3p2eWhramJxc2djam9ueGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjI4NDQsImV4cCI6MjEwMDIzODg0NH0.0S3ZMyPUVzRyRFDseAJNf1QT2ZygyItXLh3mVqR7D7o'
  ).trim()

  if (!stripeKey) {
    res.status(503).json({ error: 'Stripe not configured' })
    return
  }
  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({
      error: 'Supabase server env incomplete — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.',
    })
    return
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId required' })
      return
    }

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    )
    const session = await stripeRes.json()
    if (!stripeRes.ok) {
      res.status(502).json({ error: session?.error?.message || 'Could not load Stripe session' })
      return
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(402).json({ error: 'Payment not completed', payment_status: session.payment_status })
      return
    }

    const metaUser = session.metadata?.user_id
    if (metaUser && metaUser !== userData.user.id) {
      res.status(403).json({ error: 'Session does not belong to this user' })
      return
    }

    const opportunityId = session.metadata?.opportunity_id
    const orderId = session.metadata?.order_id || session.client_reference_id
    const days = Math.max(1, parseInt(session.metadata?.days || '7', 10) || 7)
    if (!opportunityId) {
      res.status(400).json({ error: 'Missing opportunity in session metadata' })
      return
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const until = new Date(Date.now() + days * 86400000).toISOString()
    const now = new Date().toISOString()

    const { error: oppErr } = await admin
      .from('opportunities')
      .update({
        is_featured: true,
        featured_until: until,
        featured_at: now,
        updated_at: now,
      })
      .eq('id', opportunityId)
      .eq('owner_id', userData.user.id)

    if (oppErr) {
      res.status(500).json({ error: oppErr.message })
      return
    }

    if (orderId) {
      await admin
        .from('opportunity_featured_orders')
        .update({
          status: 'paid',
          paid_at: now,
          stripe_session_id: sessionId,
          updated_at: now,
        })
        .eq('id', orderId)
    } else {
      await admin
        .from('opportunity_featured_orders')
        .update({
          status: 'paid',
          paid_at: now,
          updated_at: now,
        })
        .eq('stripe_session_id', sessionId)
    }

    res.status(200).json({
      ok: true,
      opportunityId,
      featuredUntil: until,
      days,
    })
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Confirm failed',
    })
  }
}
