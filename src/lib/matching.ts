import { Profile } from './supabase'

export type MatchResult = {
  profile: Profile
  match: number
  reasons: string[]
  color: string
}

const AVATAR_COLORS = [
  'from-pi-500 to-teal-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-sky-500 to-cyan-600',
]

function overlap(a: string[] | null | undefined, b: string[] | null | undefined) {
  if (!a?.length || !b?.length) return []
  const setB = new Set(b.map(x => x.toLowerCase()))
  return a.filter(x => setB.has(x.toLowerCase()))
}

function complementaryRole(myRole: string | null, theirRole: string | null): string | null {
  if (!myRole || !theirRole) return null
  const me = myRole.toLowerCase()
  const them = theirRole.toLowerCase()
  if (me === them) return null
  const pairs: [RegExp, RegExp, string][] = [
    [/entrepreneur|founder/, /engineer|developer|technical/, 'Complementary founder + technical skills'],
    [/engineer|developer|technical/, /entrepreneur|founder/, 'Complementary technical + founder skills'],
    [/designer|design/, /engineer|developer|founder/, 'Product design complements your build focus'],
    [/investor|angel|vc/, /entrepreneur|founder/, 'Investor aligned with founder profile'],
    [/entrepreneur|founder/, /investor|angel|vc/, 'Founder profile matches investor focus'],
    [/creator|content/, /growth|marketing/, 'Creator + growth pairing'],
    [/growth|marketing/, /creator|content/, 'Growth + creator pairing'],
  ]
  for (const [a, b, reason] of pairs) {
    if (a.test(me) && b.test(them)) return reason
  }
  return `Different roles (${myRole} ↔ ${theirRole}) can unlock collaboration`
}

/** Score another profile against the current user's profile (0–99). */
export function scoreMatch(me: Profile, other: Profile): MatchResult {
  const reasons: string[] = []
  let score = 42

  const sharedInterests = overlap(me.interests, other.interests)
  if (sharedInterests.length) {
    score += Math.min(22, sharedInterests.length * 8)
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(', ')}`)
  }

  const sharedSkills = overlap(me.skills, other.skills)
  if (sharedSkills.length) {
    score += Math.min(16, sharedSkills.length * 5)
    reasons.push(`Overlapping skills: ${sharedSkills.slice(0, 3).join(', ')}`)
  }

  const sharedGoals = overlap(me.goals, other.goals)
  if (sharedGoals.length) {
    score += Math.min(14, sharedGoals.length * 7)
    reasons.push(`Can accelerate your goal: ${sharedGoals.slice(0, 2).join(', ')}`)
  }

  const roleReason = complementaryRole(me.role, other.role)
  if (roleReason) {
    score += 10
    reasons.push(roleReason)
  } else if (me.role && other.role && me.role === other.role) {
    score += 4
    reasons.push(`Same role focus: ${other.role}`)
  }

  if (me.location && other.location && me.location.toLowerCase() === other.location.toLowerCase()) {
    score += 6
    reasons.push(`Same location: ${other.location}`)
  }

  if (other.ai_summary) {
    score += 3
    reasons.push('Has a completed Pi profile summary')
  }

  if (!reasons.length) {
    reasons.push('Active on Pi and open to high-signal collaboration')
    reasons.push(other.role ? `Role fit: ${other.role} can complement your path` : 'Building their opportunity graph on Pi')
    if (other.bio) reasons.push('Complete bio — stronger twin signal for introductions')
  }

  // Prefer goal-acceleration framing when user has goals
  if (me.goals?.[0] && reasons.length < 3) {
    reasons.push(`Ranked for advancing: ${me.goals[0]}`)
  }

  score = Math.min(99, Math.max(55, Math.round(score)))
  const color = AVATAR_COLORS[Math.abs(other.id.charCodeAt(0) + other.id.length) % AVATAR_COLORS.length]

  return { profile: other, match: score, reasons: reasons.slice(0, 3), color }
}

export function rankMatches(me: Profile, others: Profile[]): MatchResult[] {
  return others
    .filter(p => p.id !== me.id)
    .map(p => scoreMatch(me, p))
    .sort((a, b) => b.match - a.match)
}

/** Build opportunity reasons from the live user profile. */
export function opportunityReasonForUser(
  me: Profile | null,
  baseReason: string,
  title: string
): string {
  if (!me) return baseReason
  const bits: string[] = []
  if (me.role) bits.push(`Your role (${me.role})`)
  if (me.goals?.length) bits.push(`goals like “${me.goals[0]}”`)
  if (me.interests?.length) bits.push(`interest in ${me.interests[0]}`)
  if (!bits.length) return baseReason
  return `${bits.join(' and ')} align with “${title}”. ${baseReason}`
}
