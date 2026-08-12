import { supabase } from './supabase'
import { track } from './analytics'
import { friendlyNetworkError, isOnline } from './messagingReliability'

/** Default Featured experiment price — €9 for 7 days (override via server env). */
export const FEATURED_PRICE_CENTS = 900
export const FEATURED_DAYS = 7
export const FEATURED_CURRENCY = 'eur'

export function formatFeaturedPrice(cents = FEATURED_PRICE_CENTS, currency = FEATURED_CURRENCY) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `€${(cents / 100).toFixed(2)}`
  }
}

export function isFeaturedActive(item: {
  isFeatured?: boolean | null
  featuredUntil?: string | null
}): boolean {
  if (!item.isFeatured) return false
  if (!item.featuredUntil) return true
  return new Date(item.featuredUntil).getTime() > Date.now()
}

export type FeaturedCheckoutResult =
  | {
      ok: true
      mode: 'stripe'
      url: string
      orderId?: string
      amountCents: number
      days: number
    }
  | {
      ok: true
      mode: 'intent'
      orderId?: string | null
      amountCents: number
      days: number
      message: string
    }
  | { ok: false; error: string }

/** Start Featured checkout (Stripe) or record willingness intent. */
export async function startFeaturedCheckout(input: {
  opportunityId: string
  opportunityTitle: string
}): Promise<FeaturedCheckoutResult> {
  if (!isOnline()) {
    return { ok: false, error: 'You’re offline. Reconnect, then try again.' }
  }

  const { getAuthAccessToken } = await import('./authBridge')
  const token = getAuthAccessToken()
  if (!token) return { ok: false, error: 'Sign in to feature your listing.' }

  try {
    const res = await fetch('/api/featured-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return {
        ok: false,
        error: String(json.error || `Checkout failed (${res.status})`),
      }
    }

    if (json.mode === 'stripe' && typeof json.url === 'string') {
      track('opportunity_featured_checkout', {
        opportunity_id: input.opportunityId,
        mode: 'stripe',
        amount_cents: Number(json.amountCents) || FEATURED_PRICE_CENTS,
      })
      return {
        ok: true,
        mode: 'stripe',
        url: json.url,
        orderId: typeof json.orderId === 'string' ? json.orderId : undefined,
        amountCents: Number(json.amountCents) || FEATURED_PRICE_CENTS,
        days: Number(json.days) || FEATURED_DAYS,
      }
    }

    track('opportunity_featured_intent', {
      opportunity_id: input.opportunityId,
      mode: 'intent',
      amount_cents: Number(json.amountCents) || FEATURED_PRICE_CENTS,
    })
    return {
      ok: true,
      mode: 'intent',
      orderId: typeof json.orderId === 'string' ? json.orderId : null,
      amountCents: Number(json.amountCents) || FEATURED_PRICE_CENTS,
      days: Number(json.days) || FEATURED_DAYS,
      message: String(json.message || 'Willingness to pay recorded.'),
    }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not start featured checkout') }
  }
}

/** After Stripe redirect — confirm payment and activate featured. */
export async function confirmFeaturedCheckout(sessionId: string): Promise<
  | { ok: true; featuredUntil: string; opportunityId: string }
  | { ok: false; error: string }
> {
  if (!sessionId) return { ok: false, error: 'Missing session' }
  const { getAuthAccessToken } = await import('./authBridge')
  const token = getAuthAccessToken()
  if (!token) return { ok: false, error: 'Sign in to confirm payment.' }

  try {
    const res = await fetch('/api/featured-confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return { ok: false, error: String(json.error || `Confirm failed (${res.status})`) }
    }
    track('opportunity_featured_paid', {
      opportunity_id: String(json.opportunityId || ''),
      days: Number(json.days) || FEATURED_DAYS,
    })
    return {
      ok: true,
      featuredUntil: String(json.featuredUntil || ''),
      opportunityId: String(json.opportunityId || ''),
    }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not confirm payment') }
  }
}
