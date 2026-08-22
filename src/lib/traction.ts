import { supabase } from './supabase'

export type FunnelStageId = 'discover' | 'view' | 'apply' | 'connect' | 'outcome'

export type FunnelStage = {
  id: FunnelStageId
  label: string
  definition: string
  count: number
  /** Conversion from previous stage (null for first stage). */
  conversionFromPrevPct: number | null
}

/** WP001 — Strong Circle Liquidity Baseline (measurement only). */
export type Wp001Baseline = {
  /** Twin/onboarding → first meaningful opp/match action */
  activationRatePct: number | null
  activatedUsers: number
  usersWithValuableAction: number
  /** Valuable intros ÷ match shows (connect/message vs views) */
  valuableIntroductionRatePct: number | null
  matchShown: number
  matchAccepted: number
  matchRejected: number
  /** Minutes from activation → first valuable action */
  timeToFirstValuable: {
    sampleSize: number
    medianMinutes: number | null
    p75Minutes: number | null
    p90Minutes: number | null
  }
  rejectionReasons: { reason: string; count: number }[]
  /** One-line answer for Cristian / WP002 selection */
  primaryConstraint: string
  biggestDropLabel: string | null
}

export type TractionSnapshot = {
  windowDays: number
  since: string
  /** WP001 liquidity baseline — answer “where is the circle breaking?” */
  wp001: Wp001Baseline
  activation: {
    onboardingComplete: number
    profileComplete: number
    twinViewed: number
    ratePct: number | null
  }
  retention: {
    activeUsers: number
    returningUsers: number
    ratePct: number | null
  }
  matching: {
    matchPageViews: number
    matchExpands: number
    introsStarted: number
    matchRejected: number
  }
  opportunities: {
    pageViews: number
    expands: number
    interestMarked: number
    created: number
    applied: number
    publicViews: number
    conversationsStarted: number
    featuredPaid: number
    featuredIntent: number
    outcomes: number
    repeatUsers: number
    discover: number
  }
  /** P1 — Opportunity Hub traction engine */
  hubFunnel: {
    stages: FunnelStage[]
    overallDiscoverToOutcomePct: number | null
    biggestDropOff: {
      from: FunnelStageId
      to: FunnelStageId
      fromLabel: string
      toLabel: string
      conversionPct: number | null
      lostCount: number
      insight: string
    } | null
    cohorts: {
      firstTimeUsers: number
      returningUsers: number
      returningUserRatePct: number | null
      firstTimeApplied: number
      returningApplied: number
    }
    outcomeQuality: {
      completed: number
      pending: number
      declined: number
      closed: number
      medianHoursToOutcome: number | null
      avgHoursToOutcome: number | null
    }
    outcomeFeedback: {
      total: number
      yes: number
      maybe: number
      no: number
      usefulPct: number | null
      recentNotes: string[]
    }
  }
  communities: {
    joins: number
    posts: number
  }
  growth: {
    aiSuggestionsSent: number
    notifOpens: number
    pushEnableAttempts: number
    pushEnableOk: number
    coreLoopCompletes: number
    weeklyDigestShown: number
    inviteShares: number
    signupAttributed: number
    partnerClicks: number
    discussRequests: number
  }
  feedback: {
    total: number
    yes: number
    maybe: number
    no: number
    wouldUseAgainPct: number | null
    recentBlockers: string[]
  }
  eventsTotal: number
  tableReady: boolean
  error?: string
}

type EventRow = {
  user_id: string | null
  event: string
  created_at: string
  path: string | null
  props: Record<string, unknown> | null
}

type FeedbackRow = {
  would_use_again: 'yes' | 'maybe' | 'no'
  blockers: string | null
  surface: string | null
  created_at: string
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 100)
}

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

function percentile(nums: number[], p: number): number | null {
  if (!nums.length) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Math.round(sorted[idx])
}

const ACTIVATION_EVENTS = new Set(['onboarding_complete', 'profile_complete', 'twin_view'])

function isValuableAction(e: EventRow): boolean {
  if (e.event === 'opportunity_conversation_start') return true
  if (e.event === 'match_connect' || e.event === 'match_message') return true
  if (e.event === 'opportunity_interest' && propsOf(e).status === 'applied') return true
  return false
}

/**
 * WP001 — Time to First Valuable Action (minutes).
 * Activation = first twin/onboarding/profile signal; valuable = apply, connect, or match intro.
 */
export function computeTimeToFirstValuableAction(events: EventRow[]): {
  sampleSize: number
  medianMinutes: number | null
  p75Minutes: number | null
  p90Minutes: number | null
  activatedUsers: number
  usersWithValuableAction: number
} {
  const byUser = new Map<string, EventRow[]>()
  for (const e of events) {
    if (!e.user_id) continue
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, [])
    byUser.get(e.user_id)!.push(e)
  }

  const minutes: number[] = []
  let activatedUsers = 0
  let usersWithValuableAction = 0

  for (const userEvents of byUser.values()) {
    const sorted = [...userEvents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    const act = sorted.find(e => ACTIVATION_EVENTS.has(e.event))
    if (!act) continue
    activatedUsers += 1
    const valuable = sorted.find(
      e =>
        isValuableAction(e) &&
        new Date(e.created_at).getTime() >= new Date(act.created_at).getTime(),
    )
    if (!valuable) continue
    usersWithValuableAction += 1
    const deltaMs =
      new Date(valuable.created_at).getTime() - new Date(act.created_at).getTime()
    minutes.push(Math.max(0, Math.round(deltaMs / 60000)))
  }

  return {
    sampleSize: minutes.length,
    medianMinutes: median(minutes),
    p75Minutes: percentile(minutes, 75),
    p90Minutes: percentile(minutes, 90),
    activatedUsers,
    usersWithValuableAction,
  }
}

function emptyWp001(): Wp001Baseline {
  return {
    activationRatePct: null,
    activatedUsers: 0,
    usersWithValuableAction: 0,
    valuableIntroductionRatePct: null,
    matchShown: 0,
    matchAccepted: 0,
    matchRejected: 0,
    timeToFirstValuable: {
      sampleSize: 0,
      medianMinutes: null,
      p75Minutes: null,
      p90Minutes: null,
    },
    rejectionReasons: [],
    primaryConstraint: 'Insufficient event volume — dogfood the Strong Circle loop, then refresh.',
    biggestDropLabel: null,
  }
}

function buildWp001(
  events: EventRow[],
  hubFunnel: TractionSnapshot['hubFunnel'],
  activeUsers: number,
): Wp001Baseline {
  const ttf = computeTimeToFirstValuableAction(events)
  const matchShown = events.filter(e => e.event === 'match_view').length
  const matchAccepted = events.filter(
    e => e.event === 'match_connect' || e.event === 'match_message',
  ).length
  const rejectEvents = events.filter(e => e.event === 'match_reject')
  const matchRejected = rejectEvents.length

  const reasonCounts = new Map<string, number>()
  for (const e of rejectEvents) {
    const reason = String(propsOf(e).reason || 'OTHER').toUpperCase()
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
  }
  const rejectionReasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  const activationRatePct = pct(ttf.usersWithValuableAction, ttf.activatedUsers || activeUsers)
  const valuableIntroductionRatePct = pct(matchAccepted, matchShown)

  const drop = hubFunnel.biggestDropOff
  const biggestDropLabel = drop ? `${drop.fromLabel} → ${drop.toLabel}` : null

  let primaryConstraint: string
  if (events.length < 5 || (hubFunnel.stages[0]?.count || 0) === 0) {
    primaryConstraint =
      'Insufficient Strong Circle usage — need real Discover→Outcome events before naming a product constraint.'
  } else if (drop && drop.lostCount > 0) {
    primaryConstraint = `Largest measurable loss is ${drop.fromLabel} → ${drop.toLabel} (${drop.conversionPct ?? 0}% convert, ${drop.lostCount} lost). WP002 should target this stage only.`
  } else if (ttf.activatedUsers > 0 && ttf.usersWithValuableAction === 0) {
    primaryConstraint =
      'Users activate (twin/onboarding) but never take a valuable action (apply/connect/intro).'
  } else if (
    valuableIntroductionRatePct !== null &&
    valuableIntroductionRatePct < 20 &&
    matchShown >= 3
  ) {
    primaryConstraint =
      'Match quality / intro conversion is weak — many matches shown, few connect/message actions.'
  } else {
    primaryConstraint =
      'Funnel is moving; confirm outcome capture and repeat cycles before expanding scope.'
  }

  return {
    activationRatePct,
    activatedUsers: ttf.activatedUsers,
    usersWithValuableAction: ttf.usersWithValuableAction,
    valuableIntroductionRatePct,
    matchShown,
    matchAccepted,
    matchRejected,
    timeToFirstValuable: {
      sampleSize: ttf.sampleSize,
      medianMinutes: ttf.medianMinutes,
      p75Minutes: ttf.p75Minutes,
      p90Minutes: ttf.p90Minutes,
    },
    rejectionReasons,
    primaryConstraint,
    biggestDropLabel,
  }
}

function propsOf(e: EventRow): Record<string, unknown> {
  return (e.props && typeof e.props === 'object' ? e.props : {}) as Record<string, unknown>
}

function emptyHubFunnel(): TractionSnapshot['hubFunnel'] {
  const stages: FunnelStage[] = [
    { id: 'discover', label: 'Discover', definition: 'Hub or public listing entered the discovery surface.', count: 0, conversionFromPrevPct: null },
    { id: 'view', label: 'View', definition: 'Public opportunity page opened (opportunity_public_view).', count: 0, conversionFromPrevPct: null },
    { id: 'apply', label: 'Apply', definition: 'Application submitted (opportunity_interest status=applied).', count: 0, conversionFromPrevPct: null },
    { id: 'connect', label: 'Connect', definition: 'Message thread opened with listing context (opportunity_conversation_start).', count: 0, conversionFromPrevPct: null },
    { id: 'outcome', label: 'Outcome', definition: 'Owner set Connected / Selected / Passed / Closed (opportunity_outcome).', count: 0, conversionFromPrevPct: null },
  ]
  return {
    stages,
    overallDiscoverToOutcomePct: null,
    biggestDropOff: null,
    cohorts: {
      firstTimeUsers: 0,
      returningUsers: 0,
      returningUserRatePct: null,
      firstTimeApplied: 0,
      returningApplied: 0,
    },
    outcomeQuality: {
      completed: 0,
      pending: 0,
      declined: 0,
      closed: 0,
      medianHoursToOutcome: null,
      avgHoursToOutcome: null,
    },
    outcomeFeedback: {
      total: 0,
      yes: 0,
      maybe: 0,
      no: 0,
      usefulPct: null,
      recentNotes: [],
    },
  }
}

function buildHubFunnel(events: EventRow[], feedback: FeedbackRow[]): TractionSnapshot['hubFunnel'] {
  const discover = events.filter(e => e.event === 'opportunity_discover').length
  const view = events.filter(e => e.event === 'opportunity_public_view').length
  const apply = events.filter(
    e => e.event === 'opportunity_interest' && propsOf(e).status === 'applied',
  ).length
  // Prefer real chat starts; intent is click-to-message only
  const connect = events.filter(e => e.event === 'opportunity_conversation_start').length
  const outcomeEvents = events.filter(e => {
    if (e.event !== 'opportunity_outcome') return false
    const src = propsOf(e).source
    // Exclude listing deletes from quality funnel when tagged as owner_delete
    return src !== 'owner_delete'
  })
  const outcome = outcomeEvents.length

  const counts = [discover, view, apply, connect, outcome]
  const ids: FunnelStageId[] = ['discover', 'view', 'apply', 'connect', 'outcome']
  const labels = ['Discover', 'View', 'Apply', 'Connect', 'Outcome']
  const definitions = [
    'Hub browse or public listing discovery event (opportunity_discover).',
    'Public /o page opened (opportunity_public_view).',
    'Application submitted (opportunity_interest, status=applied).',
    'Conversation started from an opportunity (opportunity_conversation_start).',
    'Owner set loop outcome Connected / Selected / Passed / Closed.',
  ]

  const stages: FunnelStage[] = ids.map((id, i) => ({
    id,
    label: labels[i],
    definition: definitions[i],
    count: counts[i],
    conversionFromPrevPct: i === 0 ? null : pct(counts[i], counts[i - 1]),
  }))

  let biggestDropOff: TractionSnapshot['hubFunnel']['biggestDropOff'] = null
  let worstConv = Infinity
  for (let i = 1; i < counts.length; i++) {
    const den = counts[i - 1]
    if (den <= 0) continue
    const conv = (counts[i] / den) * 100
    const lost = den - counts[i]
    if (conv < worstConv || (conv === worstConv && lost > (biggestDropOff?.lostCount || 0))) {
      worstConv = conv
      biggestDropOff = {
        from: ids[i - 1],
        to: ids[i],
        fromLabel: labels[i - 1],
        toLabel: labels[i],
        conversionPct: pct(counts[i], den),
        lostCount: Math.max(0, lost),
        insight: `Biggest drop-off is ${labels[i - 1]} → ${labels[i]} (${pct(counts[i], den)}% convert; ${Math.max(0, lost)} lost). Fix this stage next.`,
      }
    }
  }

  // Cohorts: first-time = 1 distinct hub day in window; returning = 2+ days
  const hubDaysByUser = new Map<string, Set<string>>()
  for (const e of events) {
    if (!e.user_id) continue
    if (!e.event.startsWith('opportunity_') && !(e.path || '').startsWith('/o/') && !(e.path || '').startsWith('/opportunities')) {
      continue
    }
    if (!hubDaysByUser.has(e.user_id)) hubDaysByUser.set(e.user_id, new Set())
    hubDaysByUser.get(e.user_id)!.add(e.created_at.slice(0, 10))
  }
  let firstTimeUsers = 0
  let returningUsers = 0
  const returningIds = new Set<string>()
  for (const [uid, days] of hubDaysByUser) {
    if (days.size >= 2) {
      returningUsers += 1
      returningIds.add(uid)
    } else {
      firstTimeUsers += 1
    }
  }

  let firstTimeApplied = 0
  let returningApplied = 0
  for (const e of events) {
    if (e.event !== 'opportunity_interest' || propsOf(e).status !== 'applied' || !e.user_id) continue
    if (returningIds.has(e.user_id)) returningApplied += 1
    else firstTimeApplied += 1
  }

  let completed = 0
  let declined = 0
  let closed = 0
  const hours: number[] = []
  for (const e of outcomeEvents) {
    const p = propsOf(e)
    const quality = String(p.quality || '')
    const outcomeType = String(p.outcome || '')
    if (quality === 'completed' || outcomeType === 'hired' || outcomeType === 'connected') completed += 1
    else if (quality === 'declined' || outcomeType === 'passed') declined += 1
    else closed += 1

    const h = p.hours_to_outcome
    if (typeof h === 'number' && Number.isFinite(h) && h >= 0) hours.push(h)
  }
  const pending = Math.max(0, apply - outcome)

  const outcomeFb = feedback.filter(f => f.surface === 'opportunity_outcome')
  const yes = outcomeFb.filter(f => f.would_use_again === 'yes').length
  const maybe = outcomeFb.filter(f => f.would_use_again === 'maybe').length
  const no = outcomeFb.filter(f => f.would_use_again === 'no').length

  return {
    stages,
    overallDiscoverToOutcomePct: pct(outcome, discover),
    biggestDropOff,
    cohorts: {
      firstTimeUsers,
      returningUsers,
      returningUserRatePct: pct(returningUsers, firstTimeUsers + returningUsers),
      firstTimeApplied,
      returningApplied,
    },
    outcomeQuality: {
      completed,
      pending,
      declined,
      closed,
      medianHoursToOutcome: median(hours),
      avgHoursToOutcome: hours.length
        ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
        : null,
    },
    outcomeFeedback: {
      total: outcomeFb.length,
      yes,
      maybe,
      no,
      usefulPct: pct(yes, outcomeFb.length),
      recentNotes: outcomeFb
        .map(f => f.blockers?.trim())
        .filter((b): b is string => !!b)
        .slice(0, 8),
    },
  }
}

/** Aggregate weekly (or N-day) traction metrics from product_events + product_feedback */
export async function fetchTractionSnapshot(windowDays = 7): Promise<TractionSnapshot> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString()
  const empty: TractionSnapshot = {
    windowDays,
    since,
    wp001: emptyWp001(),
    activation: { onboardingComplete: 0, profileComplete: 0, twinViewed: 0, ratePct: null },
    retention: { activeUsers: 0, returningUsers: 0, ratePct: null },
    matching: { matchPageViews: 0, matchExpands: 0, introsStarted: 0, matchRejected: 0 },
    opportunities: {
      pageViews: 0,
      expands: 0,
      interestMarked: 0,
      created: 0,
      applied: 0,
      publicViews: 0,
      conversationsStarted: 0,
      featuredPaid: 0,
      featuredIntent: 0,
      outcomes: 0,
      repeatUsers: 0,
      discover: 0,
    },
    hubFunnel: emptyHubFunnel(),
    communities: { joins: 0, posts: 0 },
    growth: {
      aiSuggestionsSent: 0,
      notifOpens: 0,
      pushEnableAttempts: 0,
      pushEnableOk: 0,
      coreLoopCompletes: 0,
      weeklyDigestShown: 0,
      inviteShares: 0,
      signupAttributed: 0,
      partnerClicks: 0,
      discussRequests: 0,
    },
    feedback: { total: 0, yes: 0, maybe: 0, no: 0, wouldUseAgainPct: null, recentBlockers: [] },
    eventsTotal: 0,
    tableReady: false,
  }

  const [eventsRes, feedbackRes] = await Promise.all([
    supabase
      .from('product_events')
      .select('user_id, event, created_at, path, props')
      .gte('created_at', since)
      .limit(5000),
    supabase
      .from('product_feedback')
      .select('would_use_again, blockers, surface, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (eventsRes.error) {
    return {
      ...empty,
      error: eventsRes.error.message.includes('does not exist')
        ? 'Run supabase_product_metrics.sql in Supabase, then refresh.'
        : eventsRes.error.message,
    }
  }

  const events = (eventsRes.data || []) as EventRow[]
  const feedback = (feedbackRes.data || []) as FeedbackRow[]

  const count = (name: string) => events.filter(e => e.event === name).length

  const onboardingComplete = count('onboarding_complete')
  const profileComplete = count('profile_complete')
  const twinViewed = count('twin_view')
  const pathViews = (p: string) =>
    events.filter(e => e.event === 'page_view' && (e.path === p || (e.props as { path?: string } | null)?.path === p)).length

  const daysByUser = new Map<string, Set<string>>()
  for (const e of events) {
    if (!e.user_id) continue
    const day = e.created_at.slice(0, 10)
    if (!daysByUser.has(e.user_id)) daysByUser.set(e.user_id, new Set())
    daysByUser.get(e.user_id)!.add(day)
  }
  let returningUsers = 0
  for (const days of daysByUser.values()) {
    if (days.size >= 2) returningUsers += 1
  }
  const activeUsers = daysByUser.size
  const activatedUsers = new Set(
    events.filter(e => e.event === 'onboarding_complete' || e.event === 'profile_complete' || e.event === 'twin_view')
      .map(e => e.user_id)
      .filter(Boolean) as string[],
  ).size

  const globalFb = feedback.filter(f => f.surface !== 'opportunity_outcome')
  const yes = globalFb.filter(f => f.would_use_again === 'yes').length
  const maybe = globalFb.filter(f => f.would_use_again === 'maybe').length
  const no = globalFb.filter(f => f.would_use_again === 'no').length
  const totalFb = globalFb.length

  const hubFunnel = buildHubFunnel(events, feedback)
  const wp001 = buildWp001(events, hubFunnel, activeUsers)

  return {
    windowDays,
    since,
    wp001,
    activation: {
      onboardingComplete,
      profileComplete,
      twinViewed,
      ratePct: pct(activatedUsers, activeUsers),
    },
    retention: {
      activeUsers,
      returningUsers,
      ratePct: pct(returningUsers, activeUsers),
    },
    matching: {
      matchPageViews: count('match_view') + pathViews('/match'),
      matchExpands: count('match_expand'),
      introsStarted: count('match_message') + count('match_connect'),
      matchRejected: count('match_reject'),
    },
    opportunities: (() => {
      const hubEvents = events.filter(e =>
        e.event.startsWith('opportunity_') || (e.path || '').startsWith('/opportunities') || (e.path || '').startsWith('/o/'),
      )
      const byUser = new Map<string, number>()
      for (const e of hubEvents) {
        if (!e.user_id) continue
        byUser.set(e.user_id, (byUser.get(e.user_id) || 0) + 1)
      }
      const applied = events.filter(
        e =>
          e.event === 'opportunity_interest' &&
          propsOf(e).status === 'applied',
      ).length
      return {
        pageViews: count('opportunity_view') + pathViews('/opportunities'),
        expands: count('opportunity_expand'),
        interestMarked: count('opportunity_interest'),
        created: count('opportunity_create'),
        applied,
        publicViews: count('opportunity_public_view'),
        conversationsStarted: count('opportunity_conversation_start'),
        featuredPaid: count('opportunity_featured_paid'),
        featuredIntent:
          count('opportunity_featured_intent') + count('opportunity_featured_checkout'),
        outcomes: events.filter(e => e.event === 'opportunity_outcome' && propsOf(e).source !== 'owner_delete').length,
        repeatUsers: [...byUser.values()].filter(n => n >= 2).length,
        discover: count('opportunity_discover'),
      }
    })(),
    hubFunnel,
    communities: {
      joins: count('community_join'),
      posts: count('community_post'),
    },
    growth: {
      aiSuggestionsSent: count('ai_suggest_sent'),
      notifOpens: count('notif_open') + count('ai_for_you_open'),
      pushEnableAttempts: count('push_enable_result'),
      pushEnableOk: events.filter(e => e.event === 'push_enable_result' && (e.props as { ok?: boolean } | null)?.ok === true).length,
      coreLoopCompletes: count('core_loop_complete'),
      weeklyDigestShown: count('weekly_digest_shown'),
      inviteShares: count('invite_share'),
      signupAttributed: count('signup_attributed'),
      partnerClicks: count('partner_interest_click'),
      discussRequests: count('discuss_request'),
    },
    feedback: {
      total: totalFb,
      yes,
      maybe,
      no,
      wouldUseAgainPct: pct(yes, totalFb),
      recentBlockers: globalFb
        .map(f => f.blockers?.trim())
        .filter((b): b is string => !!b)
        .slice(0, 8),
    },
    eventsTotal: events.length,
    tableReady: true,
    error: feedbackRes.error?.message,
  }
}

/** Profile “activated” if twin signals are filled enough */
export function isProfileActivated(profile: {
  role?: string | null
  skills?: string[] | null
  interests?: string[] | null
  goals?: string[] | null
  bio?: string | null
} | null): boolean {
  if (!profile) return false
  const skills = profile.skills?.length || 0
  const interests = profile.interests?.length || 0
  const goals = profile.goals?.length || 0
  return !!(profile.role && (skills + interests + goals >= 3 || (profile.bio && profile.bio.length > 20)))
}
