import { track } from './analytics'

const LOOP_KEY = 'pi_core_loop_v1'
const DIGEST_KEY = 'pi_weekly_digest_at'
const REENGAGE_KEY = 'pi_reengage_nudge_at'
const STREAK_KEY = 'pi_activity_streak'

export type CoreLoopId = 'twin' | 'match' | 'communities' | 'opportunities'

type LoopState = Partial<Record<CoreLoopId, boolean>>

function readLoop(): LoopState {
  try {
    return JSON.parse(localStorage.getItem(LOOP_KEY) || '{}') as LoopState
  } catch {
    return {}
  }
}

function writeLoop(next: LoopState) {
  try {
    localStorage.setItem(LOOP_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Mark a core-loop step complete (idempotent). */
export function markCoreLoopDone(step: CoreLoopId) {
  const cur = readLoop()
  if (cur[step]) return
  cur[step] = true
  writeLoop(cur)
  track('core_loop_complete', { step })
  try {
    window.dispatchEvent(new CustomEvent('pi:core-loop'))
  } catch {
    /* ignore */
  }
}

export function getCoreLoopState(): LoopState {
  return readLoop()
}

export function isCoreLoopDone(step: CoreLoopId): boolean {
  return !!readLoop()[step]
}

/** Call from product actions so CoreLoopGuide stays accurate. */
export function recordEngagementAction(
  action: 'match_intro' | 'community_join' | 'community_post' | 'opportunity_interest' | 'twin_view',
) {
  if (action === 'match_intro') markCoreLoopDone('match')
  if (action === 'community_join' || action === 'community_post') markCoreLoopDone('communities')
  if (action === 'opportunity_interest') markCoreLoopDone('opportunities')
  if (action === 'twin_view') markCoreLoopDone('twin')
  bumpActivityStreak()
}

/** Consecutive calendar days with activity (local). */
export function bumpActivityStreak(): number {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem(STREAK_KEY)
    const prev = raw ? (JSON.parse(raw) as { day: string; count: number }) : null
    if (prev?.day === today) return prev.count

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const count = prev?.day === yesterday ? (prev.count || 0) + 1 : 1
    localStorage.setItem(STREAK_KEY, JSON.stringify({ day: today, count }))
    track('activity_streak', { count })
    return count
  } catch {
    return 1
  }
}

export function getActivityStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return 0
    const prev = JSON.parse(raw) as { day: string; count: number }
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (prev.day === today || prev.day === yesterday) return prev.count || 0
    return 0
  } catch {
    return 0
  }
}

/** Once per week: show digest banner if there are unread items. */
export function shouldShowWeeklyDigest(): boolean {
  try {
    const raw = localStorage.getItem(DIGEST_KEY)
    const last = raw ? Number(raw) : 0
    if (Date.now() - last < 6 * 86400000) return false
    return true
  } catch {
    return false
  }
}

export function markWeeklyDigestShown() {
  try {
    localStorage.setItem(DIGEST_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  track('weekly_digest_shown')
}

/** Soft re-engagement if user was inactive 3+ days (local last active). */
export function shouldReengageNudge(): boolean {
  try {
    const last = localStorage.getItem('pi_last_active_day')
    if (!last) return false
    const days = Math.floor((Date.now() - new Date(last + 'T12:00:00Z').getTime()) / 86400000)
    if (days < 3) return false
    const raw = localStorage.getItem(REENGAGE_KEY)
    const prev = raw ? Number(raw) : 0
    if (Date.now() - prev < 3 * 86400000) return false
    return true
  } catch {
    return false
  }
}

export function markReengageNudgeShown() {
  try {
    localStorage.setItem(REENGAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  track('reengage_nudge_shown')
}
