import { supabase } from './supabase'

export type TractionSnapshot = {
  windowDays: number
  since: string
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
  }
  opportunities: {
    pageViews: number
    expands: number
    interestMarked: number
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
  created_at: string
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 100)
}

/** Aggregate weekly (or N-day) traction metrics from product_events + product_feedback */
export async function fetchTractionSnapshot(windowDays = 7): Promise<TractionSnapshot> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString()
  const empty: TractionSnapshot = {
    windowDays,
    since,
    activation: { onboardingComplete: 0, profileComplete: 0, twinViewed: 0, ratePct: null },
    retention: { activeUsers: 0, returningUsers: 0, ratePct: null },
    matching: { matchPageViews: 0, matchExpands: 0, introsStarted: 0 },
    opportunities: { pageViews: 0, expands: 0, interestMarked: 0 },
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
      .select('would_use_again, blockers, created_at')
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

  const yes = feedback.filter(f => f.would_use_again === 'yes').length
  const maybe = feedback.filter(f => f.would_use_again === 'maybe').length
  const no = feedback.filter(f => f.would_use_again === 'no').length
  const totalFb = feedback.length

  return {
    windowDays,
    since,
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
    },
    opportunities: {
      pageViews: count('opportunity_view') + pathViews('/opportunities'),
      expands: count('opportunity_expand'),
      interestMarked: count('opportunity_interest'),
    },
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
      recentBlockers: feedback
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
