import { supabase, Profile } from './supabase'
import { rankMatches } from './matching'
import { fetchOpportunities } from './opportunities'
import { scoreOpportunityForUser } from './matching'
import { sendPushToUser } from './pushNotifications'

const COOLDOWN_KEY = 'pi_ai_suggest_at'
const COOLDOWN_MS = 12 * 60 * 60 * 1000 // 12h

function recentlySuggested() {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < COOLDOWN_MS
  } catch {
    return false
  }
}

function markSuggested() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * Occasionally create AI-native suggestion notifications (match + opportunity)
 * and push them to the user's devices. At most once per 12h per browser.
 */
export async function maybeSendAiSuggestions(me: Profile) {
  if (!me?.id || recentlySuggested()) return

  const [{ data: others }, oppsRes] = await Promise.all([
    supabase.from('profiles').select('*').neq('id', me.id).limit(40),
    fetchOpportunities(),
  ])

  let created = 0

  if (others?.length) {
    const top = rankMatches(me, others as Profile[])[0]
    if (top && top.match >= 55) {
      const name = top.profile.full_name || top.profile.username || 'someone'
      const path = top.profile.username
        ? `/p/${top.profile.username}`
        : '/match'
      const message = `We found someone you may want to connect with: ${name} (${top.match}% match).`
      const { data: row } = await supabase
        .from('notifications')
        .insert({
          user_id: me.id,
          actor_id: top.profile.id,
          type: 'ai_match',
          message,
        })
        .select('id')
        .maybeSingle()

      await sendPushToUser({
        userId: me.id,
        title: 'Pi Intelligence',
        body: message,
        path,
        tag: row?.id ? `pi-ai-match-${row.id}` : 'pi-ai-match',
      })
      created += 1
    }
  }

  if (oppsRes.items.length) {
    const scored = oppsRes.items
      .map(o => ({ ...o, score: scoreOpportunityForUser(me, o) }))
      .sort((a, b) => b.score - a.score)[0]

    if (scored && scored.score >= 50) {
      const message = `Here's an opportunity that matches your profile: ${scored.title} (${scored.score}% fit).`
      const { data: row } = await supabase
        .from('notifications')
        .insert({
          user_id: me.id,
          actor_id: me.id,
          type: 'ai_opportunity',
          message,
        })
        .select('id')
        .maybeSingle()

      await sendPushToUser({
        userId: me.id,
        title: 'Pi Opportunity',
        body: message,
        path: '/opportunities',
        tag: row?.id ? `pi-ai-opp-${row.id}` : 'pi-ai-opp',
      })
      created += 1
    }
  }

  if (created > 0) markSuggested()
}
