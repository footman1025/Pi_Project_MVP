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

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tagList(arr: string[] | null | undefined): string[] {
  if (!arr?.length) return []
  return [...new Set(arr.map(norm).filter(Boolean))]
}

/** Exact + soft (substring / shared token) overlaps. */
function softOverlap(a: string[] | null | undefined, b: string[] | null | undefined) {
  const left = tagList(a)
  const right = tagList(b)
  if (!left.length || !right.length) return [] as string[]

  const hits = new Set<string>()
  for (const x of left) {
    for (const y of right) {
      if (x === y) {
        hits.add(x)
        continue
      }
      if (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))) {
        hits.add(x.length <= y.length ? x : y)
        continue
      }
      const xt = new Set(x.split(' ').filter(t => t.length > 2))
      const yt = y.split(' ').filter(t => t.length > 2)
      if (yt.some(t => xt.has(t))) hits.add(x)
    }
  }
  return [...hits]
}

function keywordsFromText(...parts: (string | null | undefined)[]) {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'are', 'was',
    'you', 'your', 'our', 'their', 'about', 'into', 'onto', 'member', 'building',
    'looking', 'based', 'work', 'works', 'working', 'open', 'help', 'who',
  ])
  const out = new Set<string>()
  for (const part of parts) {
    if (!part) continue
    for (const raw of norm(part).split(' ')) {
      if (raw.length < 3 || stop.has(raw) || /^\d+$/.test(raw)) continue
      out.add(raw)
    }
  }
  return [...out]
}

function complementaryRole(myRole: string | null, theirRole: string | null): { bonus: number; reason: string } | null {
  if (!myRole || !theirRole) return null
  const me = myRole.toLowerCase()
  const them = theirRole.toLowerCase()
  if (norm(me) === norm(them)) {
    return { bonus: 6, reason: `Same role focus: ${theirRole}` }
  }
  const pairs: [RegExp, RegExp, number, string][] = [
    [/entrepreneur|founder/, /engineer|developer|technical|software/, 14, 'Complementary founder + technical skills'],
    [/engineer|developer|technical|software/, /entrepreneur|founder/, 14, 'Complementary technical + founder skills'],
    [/designer|design|ux|ui/, /engineer|developer|founder|product/, 12, 'Product design complements your build focus'],
    [/investor|angel|vc|venture/, /entrepreneur|founder/, 16, 'Investor aligned with founder profile'],
    [/entrepreneur|founder/, /investor|angel|vc|venture/, 16, 'Founder profile matches investor focus'],
    [/creator|content/, /growth|marketing/, 11, 'Creator + growth pairing'],
    [/growth|marketing/, /creator|content/, 11, 'Growth + creator pairing'],
    [/mentor|advisor|coach/, /founder|student|engineer|creator/, 10, 'Mentor fit for your stage'],
    [/founder|student|engineer|creator/, /mentor|advisor|coach/, 10, 'Advisor-ready profile for your path'],
  ]
  for (const [a, b, bonus, reason] of pairs) {
    if (a.test(me) && b.test(them)) return { bonus, reason }
  }
  return { bonus: 5, reason: `Different roles (${myRole} ↔ ${theirRole}) can unlock collaboration` }
}

function locationScore(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return { bonus: 0, reason: null as string | null }
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return { bonus: 8, reason: `Same location: ${b}` }
  const at = na.split(' ').filter(t => t.length > 2)
  const bt = new Set(nb.split(' ').filter(t => t.length > 2))
  const shared = at.filter(t => bt.has(t))
  if (shared.length) return { bonus: 4, reason: `Nearby / shared geography: ${shared.slice(0, 2).join(', ')}` }
  return { bonus: 0, reason: null }
}

function profileDepth(p: Profile) {
  return (
    (p.role ? 1 : 0) +
    Math.min(4, (p.skills || []).length) +
    Math.min(4, (p.interests || []).length) +
    Math.min(3, (p.goals || []).length) +
    (p.bio ? 1 : 0) +
    (p.ai_summary ? 1 : 0) +
    (p.location ? 1 : 0) +
    Math.min(2, (p.experience || []).length)
  )
}

/** Score another profile against the current user's profile (0–98). */
export function scoreMatch(me: Profile, other: Profile): MatchResult {
  const reasons: string[] = []
  let score = 28

  const sharedInterests = softOverlap(me.interests, other.interests)
  if (sharedInterests.length) {
    score += Math.min(24, 6 + sharedInterests.length * 7)
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(', ')}`)
  }

  const sharedSkills = softOverlap(me.skills, other.skills)
  if (sharedSkills.length) {
    score += Math.min(20, 5 + sharedSkills.length * 5)
    reasons.push(`Overlapping skills: ${sharedSkills.slice(0, 3).join(', ')}`)
  }

  const sharedGoals = softOverlap(me.goals, other.goals)
  if (sharedGoals.length) {
    score += Math.min(18, 6 + sharedGoals.length * 6)
    reasons.push(`Can accelerate your goal: ${sharedGoals.slice(0, 2).join(', ')}`)
  }

  const role = complementaryRole(me.role, other.role)
  if (role) {
    score += role.bonus
    reasons.push(role.reason)
  }

  const loc = locationScore(me.location, other.location)
  if (loc.bonus) {
    score += loc.bonus
    if (loc.reason) reasons.push(loc.reason)
  }

  // Narrative / twin text overlap (bio + AI summary + experience blurbs)
  const myWords = keywordsFromText(
    me.bio,
    me.ai_summary,
    me.role,
    ...(me.experience || []).flatMap(e => [e.title, e.company, e.description]),
  )
  const theirWords = keywordsFromText(
    other.bio,
    other.ai_summary,
    other.role,
    ...(other.experience || []).flatMap(e => [e.title, e.company, e.description]),
  )
  if (myWords.length && theirWords.length) {
    const theirSet = new Set(theirWords)
    const sharedWords = myWords.filter(w => theirSet.has(w)).slice(0, 6)
    if (sharedWords.length) {
      score += Math.min(12, sharedWords.length * 2)
      reasons.push(`Profile narrative overlap: ${sharedWords.slice(0, 3).join(', ')}`)
    }
  }

  // Richer twins are easier to match accurately — small differentiated boost
  const depth = profileDepth(other)
  score += Math.min(8, Math.floor(depth / 2))
  if (other.ai_summary) {
    reasons.push('Has a completed Pi Digital Twin summary')
  } else if (depth >= 8 && reasons.length < 3) {
    reasons.push('Strong profile signal — skills, goals, and context filled in')
  }

  // Cross-signal: their skills vs my goals / interests (they can accelerate me)
  const skillToGoal = softOverlap(other.skills, me.goals)
  const skillToInterest = softOverlap(other.skills, me.interests)
  if (skillToGoal.length) {
    score += Math.min(14, 5 + skillToGoal.length * 4)
    reasons.push(`Their skills map to your goals: ${skillToGoal.slice(0, 2).join(', ')}`)
  } else if (skillToInterest.length) {
    score += Math.min(10, 4 + skillToInterest.length * 3)
    reasons.push(`Their skills fit your interests: ${skillToInterest.slice(0, 2).join(', ')}`)
  }

  if (!reasons.length) {
    reasons.push('Active on Pi — early graph edge with room to strengthen')
    if (other.role) reasons.push(`Exploring fit with ${other.role}`)
    if (other.location) reasons.push(`Based in ${other.location}`)
  }

  if (me.goals?.[0] && reasons.length < 3) {
    reasons.push(`Ranked for advancing: ${me.goals[0]}`)
  }

  // Real range — no artificial 55% floor (that made the graph look stuck)
  score = Math.min(98, Math.max(22, Math.round(score)))
  const color = AVATAR_COLORS[Math.abs(other.id.charCodeAt(0) + other.id.length) % AVATAR_COLORS.length]

  return { profile: other, match: score, reasons: [...new Set(reasons)].slice(0, 4), color }
}

export function rankMatches(me: Profile, others: Profile[]): MatchResult[] {
  const ranked = others
    .filter(p => p.id !== me.id)
    .map(p => scoreMatch(me, p))
    .sort((a, b) => b.match - a.match || a.profile.full_name?.localeCompare(b.profile.full_name || '') || 0)

  // If the pack is tightly clustered, gently spread ranks so the live graph reads clearly
  if (ranked.length >= 2) {
    const top = ranked[0].match
    const bottom = ranked[ranked.length - 1].match
    if (top - bottom < 8) {
      return ranked.map((m, i) => ({
        ...m,
        match: Math.min(98, Math.max(22, Math.round(top - i * Math.max(3, (top - 30) / Math.max(1, ranked.length - 1))))),
      }))
    }
  }

  return ranked
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

/**
 * Score a catalog opportunity against the live twin (catalog rows are still demo listings;
 * the % is personalized from real profile signals).
 */
export function scoreOpportunityForUser(
  me: Profile | null | undefined,
  opp: { title: string; subtitle?: string; category?: string; aiReason?: string; match?: number },
): number {
  const base = typeof opp.match === 'number' ? opp.match : 55
  if (!me) return Math.min(92, Math.max(28, base - 8))

  let score = 36
  const hay = norm([opp.title, opp.subtitle, opp.category, opp.aiReason].filter(Boolean).join(' '))

  const role = norm(me.role || '')
  if (role && hay.includes(role.split(' ')[0] || '')) score += 10

  for (const g of tagList(me.goals).slice(0, 6)) {
    if (g.length >= 3 && hay.includes(g)) score += 7
  }
  for (const i of tagList(me.interests).slice(0, 6)) {
    if (i.length >= 3 && hay.includes(i)) score += 5
  }
  for (const s of tagList(me.skills).slice(0, 6)) {
    if (s.length >= 3 && hay.includes(s)) score += 4
  }

  if (/founder|entrepreneur|startup/.test(role) && /fund|accelerator|co-founder|startup/.test(hay)) score += 8
  if (/engineer|developer|software/.test(role) && /talent|engineer|technical|hack/.test(hay)) score += 8
  if (/investor|angel|vc/.test(role) && /fund|deal|venture|invest/.test(hay)) score += 8

  // Mild pull toward catalog baseline so ranking stays stable for demos
  score = Math.round(score * 0.7 + base * 0.3)
  return Math.min(96, Math.max(30, score))
}
