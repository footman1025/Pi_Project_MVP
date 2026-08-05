import { supabase } from './supabase'
import { track } from './analytics'
import { friendlyNetworkError, isOnline, withRetry } from './messagingReliability'
import { notifyOpportunityOwnerOfInterest } from './notifications'

export type InterestStatus = 'interested' | 'applied' | 'withdrawn'

export type OpportunityInterest = {
  id?: string
  user_id: string
  opportunity_id: string
  opportunity_title?: string | null
  status: InterestStatus
  note?: string | null
  match_score?: number | null
  created_at: string
  updated_at?: string | null
}

const LOCAL_KEY = 'pi_opportunity_interest_v1'

function readLocal(userId: string): OpportunityInterest[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as OpportunityInterest[]
    return all.filter(r => r.user_id === userId && r.status !== 'withdrawn')
  } catch {
    return []
  }
}

function writeLocal(row: OpportunityInterest) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as OpportunityInterest[]
    const idx = all.findIndex(
      r => r.user_id === row.user_id && r.opportunity_id === row.opportunity_id,
    )
    if (idx >= 0) all[idx] = row
    else all.unshift(row)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

export async function fetchMyOpportunityInterests(userId: string): Promise<{
  items: OpportunityInterest[]
  source: 'supabase' | 'local'
}> {
  try {
    const data = await withRetry(async () => {
      const { data: rows, error } = await supabase
        .from('opportunity_interest')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'withdrawn')
        .order('updated_at', { ascending: false })
      if (error) throw new Error(error.message)
      return rows
    }, { attempts: 2, baseMs: 350 })

    return { items: (data || []) as OpportunityInterest[], source: 'supabase' }
  } catch {
    return { items: readLocal(userId), source: 'local' }
  }
}

export async function upsertOpportunityInterest(input: {
  userId: string
  opportunityId: string
  title: string
  status: 'interested' | 'applied'
  note?: string
  matchScore?: number
  /** When set, owner receives in-app + push/email notification */
  ownerId?: string | null
  slug?: string | null
  actorName?: string
}): Promise<{ ok: true; source: 'supabase' | 'local' } | { ok: false; error: string }> {
  if (!isOnline()) {
    return { ok: false, error: 'You’re offline. Reconnect, then try again.' }
  }

  const now = new Date().toISOString()
  const row: OpportunityInterest = {
    id: `local-${input.opportunityId}`,
    user_id: input.userId,
    opportunity_id: input.opportunityId,
    opportunity_title: input.title,
    status: input.status,
    note: (input.note || '').trim().slice(0, 1000) || null,
    match_score: input.matchScore ?? null,
    created_at: now,
    updated_at: now,
  }

  writeLocal(row)

  try {
    await withRetry(async () => {
      const { error } = await supabase.from('opportunity_interest').upsert(
        {
          user_id: input.userId,
          opportunity_id: input.opportunityId,
          opportunity_title: input.title,
          status: input.status,
          note: row.note,
          match_score: input.matchScore ?? null,
          updated_at: now,
        },
        { onConflict: 'user_id,opportunity_id' },
      )
      if (error) throw new Error(error.message)
    }, { attempts: 2, baseMs: 400 })

    track('opportunity_interest', {
      id: input.opportunityId,
      title: input.title,
      status: input.status,
      match: input.matchScore,
      has_note: !!row.note,
      live: true,
    })

    if (input.ownerId && input.ownerId !== input.userId) {
      void notifyOpportunityOwnerOfInterest({
        ownerId: input.ownerId,
        actorId: input.userId,
        actorName: input.actorName || 'Someone',
        opportunityTitle: input.title,
        status: input.status,
        opportunityId: input.opportunityId,
        slug: input.slug,
      })
    }

    return { ok: true, source: 'supabase' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/relation|does not exist|schema cache/i.test(msg)) {
      track('opportunity_interest', {
        id: input.opportunityId,
        title: input.title,
        status: input.status,
        match: input.matchScore,
        has_note: !!row.note,
        live: false,
      })
      return { ok: true, source: 'local' }
    }
    return { ok: false, error: friendlyNetworkError(err, 'Could not save interest') }
  }
}

export async function withdrawOpportunityInterest(
  userId: string,
  opportunityId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString()
  writeLocal({
    id: `local-${opportunityId}`,
    user_id: userId,
    opportunity_id: opportunityId,
    status: 'withdrawn',
    created_at: now,
    updated_at: now,
  })

  try {
    const { error } = await supabase
      .from('opportunity_interest')
      .update({ status: 'withdrawn', updated_at: now })
      .eq('user_id', userId)
      .eq('opportunity_id', opportunityId)
    if (error && !/relation|does not exist|schema cache/i.test(error.message)) {
      return { ok: false, error: error.message }
    }
    track('opportunity_interest_withdraw', { id: opportunityId })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not withdraw') }
  }
}
