/**
 * Featured opportunity checkout (Stripe) or honest intent fallback.
 *
 * Env (Vercel):
 *   STRIPE_SECRET_KEY
 *   STRIPE_FEATURED_PRICE_CENTS=900   (optional, default €9.00)
 *   STRIPE_FEATURED_DAYS=7
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_PUBLIC_APP_URL / PUBLIC_APP_URL
 *   VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js'

const DEFAULT_CENTS = 900
const DEFAULT_DAYS = 7

function appOrigin() {
  return (
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://pi-project-mvp.vercel.app'
  ).replace(/\/$/, '')
}

function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
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

  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim()
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim()
  const amountCents = Math.max(
    100,
    parseInt(process.env.STRIPE_FEATURED_PRICE_CENTS || String(DEFAULT_CENTS), 10) || DEFAULT_CENTS,
  )
  const days = Math.max(
    1,
    parseInt(process.env.STRIPE_FEATURED_DAYS || String(DEFAULT_DAYS), 10) || DEFAULT_DAYS,
  )

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Sign in required' })
    return
  }
  if (!supabaseUrl || !anonKey) {
    res.status(503).json({ error: 'Supabase not configured on server' })
    return
  }

  try {
    const body = parseBody(req)
    const opportunityId = String(body.opportunityId || '').trim()
    const opportunityTitle = String(body.opportunityTitle || 'Opportunity').slice(0, 160)
    if (!opportunityId) {
      res.status(400).json({ error: 'opportunityId required' })
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
    const userId = userData.user.id

    // Verify ownership when service role available; otherwise trust client + RLS on insert
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: opp } = await admin
        .from('opportunities')
        .select('id, owner_id, title, is_active')
        .eq('id', opportunityId)
        .maybeSingle()
      if (!opp || !opp.is_active) {
        res.status(404).json({ error: 'Opportunity not found' })
        return
      }
      if (opp.owner_id !== userId) {
        res.status(403).json({ error: 'Only the listing owner can feature it' })
        return
      }
    }

    const origin = appOrigin()
    const successUrl = `${origin}/opportunities?featured=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/opportunities?featured=cancel`

    // No Stripe key → honest intent path (willingness signal, No Surprise)
    if (!stripeKey) {
      const { data: order, error: orderErr } = await anon
        .from('opportunity_featured_orders')
        .insert({
          opportunity_id: opportunityId,
          opportunity_title: opportunityTitle,
          user_id: userId,
          status: 'intent',
          amount_cents: amountCents,
          currency: 'eur',
          days,
          note: 'Stripe not configured — willingness intent recorded',
        })
        .select('id')
        .maybeSingle()

      if (orderErr) {
        res.status(503).json({
          error:
            orderErr.message.includes('does not exist') || orderErr.message.includes('schema')
              ? 'Run supabase_opportunity_featured.sql in Supabase, then retry.'
              : orderErr.message,
          mode: 'intent',
        })
        return
      }

      res.status(200).json({
        mode: 'intent',
        orderId: order?.id || null,
        amountCents,
        days,
        currency: 'eur',
        message:
          'Willingness to pay recorded. Add STRIPE_SECRET_KEY on Vercel to enable real Checkout.',
      })
      return
    }

    // Create pending order then Stripe Checkout Session
    const { data: pending, error: pendingErr } = await anon
      .from('opportunity_featured_orders')
      .insert({
        opportunity_id: opportunityId,
        opportunity_title: opportunityTitle,
        user_id: userId,
        status: 'pending',
        amount_cents: amountCents,
        currency: 'eur',
        days,
      })
      .select('id')
      .maybeSingle()

    if (pendingErr || !pending?.id) {
      res.status(503).json({
        error:
          pendingErr?.message?.includes('does not exist')
            ? 'Run supabase_opportunity_featured.sql in Supabase, then retry.'
            : pendingErr?.message || 'Could not create order',
      })
      return
    }

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', successUrl)
    params.set('cancel_url', cancelUrl)
    params.set('client_reference_id', pending.id)
    params.set('customer_email', userData.user.email || '')
    params.set('line_items[0][quantity]', '1')
    params.set('line_items[0][price_data][currency]', 'eur')
    params.set('line_items[0][price_data][unit_amount]', String(amountCents))
    params.set(
      'line_items[0][price_data][product_data][name]',
      `Pi Featured Opportunity · ${days} days`,
    )
    params.set(
      'line_items[0][price_data][product_data][description]',
      `Priority placement for “${opportunityTitle.slice(0, 80)}” on Opportunity Hub`,
    )
    params.set('metadata[order_id]', pending.id)
    params.set('metadata[opportunity_id]', opportunityId)
    params.set('metadata[user_id]', userId)
    params.set('metadata[days]', String(days))

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const session = await stripeRes.json()
    if (!stripeRes.ok || !session.url) {
      res.status(502).json({
        error: session?.error?.message || 'Stripe Checkout failed',
      })
      return
    }

    await anon
      .from('opportunity_featured_orders')
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pending.id)

    res.status(200).json({
      mode: 'stripe',
      url: session.url,
      sessionId: session.id,
      orderId: pending.id,
      amountCents,
      days,
      currency: 'eur',
    })
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Checkout failed',
    })
  }
}
