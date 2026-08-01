import { supabase } from './supabase'
import { track } from './analytics'
import { friendlyNetworkError, isOnline, withRetry } from './messagingReliability'

export type TipIntent = {
  id?: string
  from_user_id: string
  to_user_id: string
  to_name?: string
  amount_cents: number
  currency: string
  note?: string | null
  status: 'intent' | 'demo_recorded' | 'cancelled'
  created_at: string
}

/** Preset tip amounts (EUR cents) — Demo UI; payments = Soon */
export const TIP_PRESETS_EUR = [
  { label: '€3', cents: 300 },
  { label: '€3.14', cents: 314 },
  { label: '€5', cents: 500 },
  { label: '€10', cents: 1000 },
] as const

const LOCAL_KEY = 'pi_creator_tip_intents_v1'

function readLocal(userId: string): TipIntent[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as TipIntent[]
    return all.filter(t => t.from_user_id === userId || t.to_user_id === userId)
  } catch {
    return []
  }
}

function pushLocal(row: TipIntent) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as TipIntent[]
    all.unshift(row)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

export function formatTipAmount(cents: number, currency = 'EUR'): string {
  const value = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)
  if (currency === 'EUR') return `€${value}`
  return `${value} ${currency}`
}

/** Record tip intent — never charges a card. Stripe checkout = Soon. */
export async function recordTipIntent(input: {
  fromUserId: string
  toUserId: string
  toName?: string
  amountCents: number
  note?: string
}): Promise<{ ok: true; source: 'supabase' | 'local' } | { ok: false; error: string }> {
  if (!isOnline()) {
    return { ok: false, error: 'You’re offline. Reconnect, then try again.' }
  }
  if (input.fromUserId === input.toUserId) {
    return { ok: false, error: 'You can’t tip yourself.' }
  }
  if (input.amountCents < 100 || input.amountCents > 100000) {
    return { ok: false, error: 'Choose an amount between €1 and €1,000.' }
  }

  const row: TipIntent = {
    id: `local-${Date.now()}`,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    to_name: input.toName,
    amount_cents: input.amountCents,
    currency: 'EUR',
    note: (input.note || '').trim().slice(0, 500) || null,
    status: 'demo_recorded',
    created_at: new Date().toISOString(),
  }

  pushLocal(row)
  track('creator_tip_intent', {
    amount_cents: input.amountCents,
    has_note: !!row.note,
  })

  try {
    await withRetry(async () => {
      const { error } = await supabase.from('creator_tip_intents').insert({
        from_user_id: row.from_user_id,
        to_user_id: row.to_user_id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        note: row.note,
        status: 'demo_recorded',
      })
      if (error) throw new Error(error.message)
    }, { attempts: 2, baseMs: 350 })
    return { ok: true, source: 'supabase' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/relation|does not exist|schema cache/i.test(msg)) {
      return { ok: true, source: 'local' }
    }
    return { ok: false, error: friendlyNetworkError(err, 'Could not save tip intent') }
  }
}

export async function fetchMyTipIntents(userId: string): Promise<{
  items: TipIntent[]
  source: 'supabase' | 'local'
}> {
  try {
    const { data, error } = await supabase
      .from('creator_tip_intents')
      .select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) throw new Error(error.message)
    return { items: (data || []) as TipIntent[], source: 'supabase' }
  } catch {
    return {
      items: readLocal(userId).filter(t => t.from_user_id === userId),
      source: 'local',
    }
  }
}
