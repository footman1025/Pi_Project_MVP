import { supabase } from './supabase'
import { track } from './analytics'
import { friendlyNetworkError, isOnline, withRetry } from './messagingReliability'
import {
  notifyApplicantOfOutcome,
  notifyOpportunityOwnerOfInterest,
} from './notifications'

export type InterestStatus = 'interested' | 'applied' | 'withdrawn'

/** Owner-set end of the Hub loop — visible to the applicant. */
export type OpportunityOutcome = 'connected' | 'hired' | 'passed' | 'closed'

export type OpportunityInterest = {
  id?: string
  user_id: string
  opportunity_id: string
  opportunity_title?: string | null
  status: InterestStatus
  outcome?: OpportunityOutcome | null
  outcome_at?: string | null
  note?: string | null
  match_score?: number | null
  created_at: string
  updated_at?: string | null
}

/** P1 quality buckets for Traction (maps owner outcomes). */
export function outcomeQualityBucket(
  outcome?: OpportunityOutcome | null,
): 'completed' | 'declined' | 'closed' | 'pending' {
  if (!outcome) return 'pending'
  if (outcome === 'hired' || outcome === 'connected') return 'completed'
  if (outcome === 'passed') return 'declined'
  return 'closed'
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
    if (idx >= 0) all[idx] = { ...all[idx], ...row }
    else all.unshift(row)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

export function outcomeLabel(outcome?: OpportunityOutcome | null): string {
  if (!outcome) return ''
  if (outcome === 'connected') return 'Connected'
  if (outcome === 'hired') return 'Selected'
  if (outcome === 'passed') return 'Passed'
  return 'Closed'
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
    let previousStatus: InterestStatus | null = null
    try {
      const { data: prev } = await supabase
        .from('opportunity_interest')
        .select('status')
        .eq('user_id', input.userId)
        .eq('opportunity_id', input.opportunityId)
        .maybeSingle()
      previousStatus = (prev?.status as InterestStatus) || null
    } catch {
      /* ignore */
    }

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

    const statusChanged = previousStatus !== input.status
    if (statusChanged && input.ownerId && input.ownerId !== input.userId) {
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

/**
 * Owner sets loop outcome on an applicant row.
 * Applicant can see it in Mine; gets notified; Traction counts opportunity_outcome.
 */
export async function setOpportunityOutcome(input: {
  ownerId: string
  ownerName: string
  applicantId: string
  opportunityId: string
  opportunityTitle: string
  outcome: OpportunityOutcome
  slug?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.ownerId || !input.applicantId || !input.opportunityId) {
    return { ok: false, error: 'Missing owner or applicant.' }
  }
  if (input.ownerId === input.applicantId) {
    return { ok: false, error: 'Cannot set outcome on your own application.' }
  }
  if (!isOnline()) {
    return { ok: false, error: 'You’re offline. Reconnect, then try again.' }
  }

  const now = new Date().toISOString()

  try {
    let appliedAt: string | null = null
    try {
      const { data: prev } = await supabase
        .from('opportunity_interest')
        .select('created_at, updated_at, status')
        .eq('user_id', input.applicantId)
        .eq('opportunity_id', input.opportunityId)
        .maybeSingle()
      appliedAt = (prev?.created_at as string | undefined) || null
    } catch {
      /* ignore */
    }

    let data: { id: string; outcome: string | null; outcome_at?: string | null } | null = null
    let error: { message: string } | null = null

    {
      const res = await supabase
        .from('opportunity_interest')
        .update({ outcome: input.outcome, outcome_at: now, updated_at: now })
        .eq('user_id', input.applicantId)
        .eq('opportunity_id', input.opportunityId)
        .select('id, outcome, outcome_at')
        .maybeSingle()
      data = res.data as typeof data
      error = res.error
      // Older DBs without outcome_at — retry without that column
      if (error && /outcome_at|column|schema cache/i.test(error.message)) {
        const retry = await supabase
          .from('opportunity_interest')
          .update({ outcome: input.outcome, updated_at: now })
          .eq('user_id', input.applicantId)
          .eq('opportunity_id', input.opportunityId)
          .select('id, outcome')
          .maybeSingle()
        data = retry.data as typeof data
        error = retry.error
      }
    }

    if (error) {
      if (/outcome|column|schema cache/i.test(error.message)) {
        return {
          ok: false,
          error: 'Outcome column missing — run supabase_opportunity_outcome.sql in Supabase.',
        }
      }
      if (/policy|permission|row-level security|rls/i.test(error.message)) {
        return {
          ok: false,
          error: 'Could not save outcome (permissions). Run supabase_opportunity_outcome.sql.',
        }
      }
      return { ok: false, error: friendlyNetworkError(error, error.message) }
    }

    if (!data) {
      return { ok: false, error: 'No application found for this person on this listing.' }
    }

    const hoursToOutcome =
      appliedAt != null
        ? Math.max(0, Math.round((Date.parse(now) - Date.parse(appliedAt)) / 3600000))
        : null

    track('opportunity_outcome', {
      id: input.opportunityId,
      applicant_id: input.applicantId,
      outcome: input.outcome,
      quality: outcomeQualityBucket(input.outcome),
      hours_to_outcome: hoursToOutcome,
      source: 'owner_inbox',
    })

    void notifyApplicantOfOutcome({
      applicantId: input.applicantId,
      ownerId: input.ownerId,
      ownerName: input.ownerName || 'The poster',
      opportunityTitle: input.opportunityTitle,
      outcome: input.outcome,
      slug: input.slug,
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not save outcome') }
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
