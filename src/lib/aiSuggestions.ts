import { supabase, Profile } from './supabase'
import { rankMatches } from './matching'
import { fetchOpportunities } from './opportunities'
import { scoreOpportunityForUser } from './matching'
import { createNotification } from './notifications'
import { track } from './analytics'

const COOLDOWN_KEY = 'pi_ai_suggest_at'
const COOLDOWN_MS = 12 * 60 * 60 * 1000 // 12h
const SERVER_COOLDOWN_HOURS = 12

/** Prevent parallel runs in the same tab (React Strict Mode / fast remounts). */
let inFlight: Promise<void> | null = null

function recentlySuggestedLocal() {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < COOLDOWN_MS
  } catch {
    return false
  }
}

function markSuggestedLocal() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/** True if we already created this AI suggestion type recently (any device). */
async function recentlySuggestedServer(userId: string, type: 'ai_match' | 'ai_opportunity') {
  const since = new Date(Date.now() - SERVER_COOLDOWN_HOURS * 3600_000).toISOString()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', since)
  if (error) return false
  return (count || 0) > 0
}

/**
 * Occasionally create AI-native suggestion notifications (match + opportunity).
 * Deduped: local cooldown + DB cooldown + in-flight lock.
 * Delivery: in-app + Web Push (phone) + email if opted in.
 */
export async function maybeSendAiSuggestions(me: Profile) {
  if (!me?.id) return
  if (recentlySuggestedLocal()) return
  if (inFlight) return inFlight

  inFlight = (async () => {
    markSuggestedLocal()

    try {
      const [{ data: others }, oppsRes] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', me.id).limit(40),
        fetchOpportunities(),
      ])

      if (others?.length && !(await recentlySuggestedServer(me.id, 'ai_match'))) {
        const top = rankMatches(me, others as Profile[])[0]
        if (top && top.match >= 55) {
          const name = top.profile.full_name || top.profile.username || 'someone'
          const path = top.profile.username
            ? `/p/${encodeURIComponent(top.profile.username)}`
            : '/match'
          const message = `We found someone you may want to connect with: ${name} (${top.match}% match).`
          await createNotification({
            userId: me.id,
            actorId: top.profile.id,
            type: 'ai_match',
            message,
            path,
            title: 'Pi Intelligence',
          })
          track('ai_suggest_sent', { type: 'ai_match', match: top.match })
        }
      }

      if (oppsRes.items.length && !(await recentlySuggestedServer(me.id, 'ai_opportunity'))) {
        const scored = oppsRes.items
          .map(o => ({ ...o, score: scoreOpportunityForUser(me, o) }))
          .sort((a, b) => b.score - a.score)[0]

        if (scored && scored.score >= 50) {
          const message = `Here's an opportunity that matches your profile: ${scored.title} (${scored.score}% fit).`
          await createNotification({
            userId: me.id,
            actorId: me.id,
            type: 'ai_opportunity',
            message,
            path: '/opportunities',
            title: 'Pi Opportunity',
          })
          track('ai_suggest_sent', { type: 'ai_opportunity', score: scored.score })
        }
      }
    } catch {
      /* non-blocking */
    }
  })()

  try {
    await inFlight
  } finally {
    inFlight = null
  }
}
