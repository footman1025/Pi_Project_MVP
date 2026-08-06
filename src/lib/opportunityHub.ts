import { supabase } from './supabase'
import { track } from './analytics'
import { absoluteOpportunityUrl, type OpportunityItem } from './opportunities'

/** Prefill text when messaging about an opportunity. */
export function buildOpportunityMessageDraft(input: {
  title: string
  note?: string | null
  status?: 'interested' | 'applied' | string
  /** applicant → poster (default) | owner → applicant */
  as?: 'applicant' | 'owner'
}): string {
  const title = input.title.trim() || 'your opportunity'
  const note = (input.note || '').trim()
  if (input.as === 'owner') {
    const lines = [
      `Thanks for your interest in “${title}” on Pi Opportunity Hub.`,
      `I’d like to connect and learn more about your fit.`,
    ]
    if (note) lines.push(`(Your note: ${note})`)
    return lines.join('\n')
  }
  const verb = input.status === 'applied' ? 'applied to' : 'interested in'
  const lines = [
    `Hi — I saw your opportunity on Pi: “${title}”.`,
    `I’m ${verb} it via Opportunity Hub.`,
  ]
  if (note) lines.push(`Note: ${note}`)
  lines.push('Happy to connect and see if there’s a fit.')
  return lines.join('\n')
}

/** Deep-link into Messages with opportunity context prefilled. */
export function opportunityMessagePath(input: {
  /** Peer user id to open chat with */
  ownerId: string
  title: string
  note?: string | null
  opportunityId?: string
  status?: 'interested' | 'applied' | string
  as?: 'applicant' | 'owner'
}): string {
  const params = new URLSearchParams()
  params.set('u', input.ownerId)
  params.set('draft', buildOpportunityMessageDraft(input))
  if (input.opportunityId) params.set('opp', input.opportunityId)
  if (input.title) params.set('oppTitle', input.title.slice(0, 120))
  track('opportunity_conversation_intent', {
    opportunity_id: input.opportunityId || null,
    status: input.status || null,
    as: input.as || 'applicant',
  })
  return `/messages?${params.toString()}`
}

export type OpportunityHubMetrics = {
  created: number
  interestMarked: number
  applied: number
  publicViews: number
  conversationsStarted: number
  featuredCheckout: number
  windowDays: number
  tableReady: boolean
  error?: string
}

/** Aggregate Opportunity Hub validation metrics from product_events. */
export async function fetchOpportunityHubMetrics(windowDays = 30): Promise<OpportunityHubMetrics> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString()
  const empty: OpportunityHubMetrics = {
    created: 0,
    interestMarked: 0,
    applied: 0,
    publicViews: 0,
    conversationsStarted: 0,
    featuredCheckout: 0,
    windowDays,
    tableReady: false,
  }

  try {
    const { data, error } = await supabase
      .from('product_events')
      .select('event, props')
      .gte('created_at', since)
      .in('event', [
        'opportunity_create',
        'opportunity_interest',
        'opportunity_public_view',
        'opportunity_conversation_start',
        'opportunity_conversation_intent',
        'opportunity_featured_checkout',
        'opportunity_featured_intent',
        'opportunity_featured_paid',
      ])
      .limit(5000)

    if (error) {
      return {
        ...empty,
        error: /does not exist/i.test(error.message)
          ? 'Run supabase_product_metrics.sql for hub metrics.'
          : error.message,
      }
    }

    const rows = data || []
    const count = (name: string) => rows.filter(r => r.event === name).length
    const interestRows = rows.filter(r => r.event === 'opportunity_interest')
    const applied = interestRows.filter(r => {
      const props = (r.props || {}) as { status?: string }
      return props.status === 'applied'
    }).length

    return {
      created: count('opportunity_create'),
      interestMarked: interestRows.length,
      applied,
      publicViews: count('opportunity_public_view'),
      conversationsStarted:
        count('opportunity_conversation_start') + count('opportunity_conversation_intent'),
      featuredCheckout:
        count('opportunity_featured_checkout') +
        count('opportunity_featured_intent') +
        count('opportunity_featured_paid'),
      windowDays,
      tableReady: true,
    }
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'Could not load hub metrics',
    }
  }
}

export type OwnerInterestRow = {
  id?: string
  user_id: string
  opportunity_id: string
  opportunity_title?: string | null
  status: string
  note?: string | null
  match_score?: number | null
  created_at: string
  applicant_name?: string | null
}

/** Interests / applies on opportunities the current user owns. */
export async function fetchOwnerOpportunityInbox(ownerId: string): Promise<{
  items: OwnerInterestRow[]
  source: 'supabase' | 'empty'
  error?: string
}> {
  try {
    const { data: owned, error: ownedErr } = await supabase
      .from('opportunities')
      .select('id, title')
      .eq('owner_id', ownerId)
      .eq('is_active', true)

    if (ownedErr) {
      return {
        items: [],
        source: 'empty',
        error: /column|schema|does not exist/i.test(ownedErr.message)
          ? 'Run supabase_opportunities_hub.sql for owner inbox.'
          : ownedErr.message,
      }
    }

    const ids = (owned || []).map(o => String(o.id))
    if (!ids.length) return { items: [], source: 'empty' }

    const titleById = new Map((owned || []).map(o => [String(o.id), o.title as string]))

    const { data: interests, error } = await supabase
      .from('opportunity_interest')
      .select('*')
      .in('opportunity_id', ids)
      .neq('status', 'withdrawn')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) {
      return {
        items: [],
        source: 'empty',
        error: /does not exist|schema/i.test(error.message)
          ? 'Run supabase_opportunity_interest.sql (+ owner read policy).'
          : error.message,
      }
    }

    const rows = (interests || []) as OwnerInterestRow[]
    const applicantIds = [...new Set(rows.map(r => r.user_id))]
    let names = new Map<string, string>()
    if (applicantIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', applicantIds)
      names = new Map(
        (profiles || []).map(p => [
          p.id as string,
          (p.full_name || p.username || 'Member') as string,
        ]),
      )
    }

    return {
      items: rows.map(r => ({
        ...r,
        opportunity_title: r.opportunity_title || titleById.get(r.opportunity_id) || r.opportunity_id,
        applicant_name: names.get(r.user_id) || 'Member',
      })),
      source: 'supabase',
    }
  } catch (err) {
    return {
      items: [],
      source: 'empty',
      error: err instanceof Error ? err.message : 'Inbox unavailable',
    }
  }
}

export function shareOpportunityUrl(item: Pick<OpportunityItem, 'slug' | 'id'>): string {
  return absoluteOpportunityUrl(item)
}
