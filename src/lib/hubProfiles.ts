import { MatchResult, rankMatches } from './matching'
import { Profile, supabase } from './supabase'

export type HubKind = 'creators' | 'professionals'

const CREATOR_ROLE =
  /creator|content|influencer|streamer|youtuber|tiktok|designer|design|ux|ui|artist|writer|media|marketer|marketing|growth/
const CREATOR_INTEREST =
  /creator|content|design|media|influencer|social|brand|video|podcast|art/

const PRO_PATTERNS: { key: string; re: RegExp }[] = [
  { key: 'Lawyers', re: /lawyer|legal|attorney|counsel|ip\b|law\b/ },
  { key: 'Doctors', re: /doctor|physician|md\b|health|medico|nurse|clinician/ },
  { key: 'Designers', re: /designer|design|ux|ui|brand|product design/ },
  { key: 'Developers', re: /engineer|developer|software|fullstack|full-stack|programmer|devops|technical/ },
  { key: 'Consultants', re: /consultant|advisor|strateg|ops|coach|mentor/ },
  { key: 'Investors', re: /investor|angel|vc\b|venture|fund/ },
]

function haystack(p: Profile): string {
  return [
    p.role,
    p.bio,
    p.ai_summary,
    ...(p.skills || []),
    ...(p.interests || []),
    ...(p.goals || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function isCreatorProfile(p: Profile): boolean {
  const h = haystack(p)
  if (CREATOR_ROLE.test(p.role || '')) return true
  if (CREATOR_INTEREST.test(h)) return true
  return false
}

export function isProfessionalProfile(p: Profile): boolean {
  const h = haystack(p)
  return PRO_PATTERNS.some(({ re }) => re.test(h) || re.test(p.role || ''))
}

export function professionalCategory(p: Profile): string | null {
  const role = (p.role || '').toLowerCase()
  const h = haystack(p)
  for (const { key, re } of PRO_PATTERNS) {
    if (re.test(role) || re.test(h)) return key
  }
  return null
}

export type HubProfilesResult = {
  matches: MatchResult[]
  /** All other profiles (for category counts on Professionals) */
  allOthers: Profile[]
  categoryCounts: Record<string, number>
}

/**
 * Fetch profiles and rank those matching the hub heuristic.
 * If the filtered set is empty but other members exist, fall back to top overall matches
 * so the hubs still show real people.
 */
export async function fetchHubProfiles(
  me: Profile | null | undefined,
  excludeId: string | undefined,
  kind: HubKind,
  limit = 24,
): Promise<HubProfilesResult> {
  const empty: HubProfilesResult = { matches: [], allOthers: [], categoryCounts: {} }

  let q = supabase.from('profiles').select('*').limit(80)
  if (excludeId) q = q.neq('id', excludeId)

  const { data, error } = await q
  if (error || !data?.length) return empty

  const others = data as Profile[]
  const categoryCounts: Record<string, number> = Object.fromEntries(
    PRO_PATTERNS.map(p => [p.key, 0]),
  )
  for (const p of others) {
    const cat = professionalCategory(p)
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  }

  const filtered =
    kind === 'creators'
      ? others.filter(isCreatorProfile)
      : others.filter(isProfessionalProfile)

  const pool = filtered.length > 0 ? filtered : others

  if (!me) {
    return {
      matches: pool.slice(0, limit).map(p => ({
        profile: p,
        match: 50,
        reasons: ['Active on Pi'],
        color: 'from-pi-500 to-teal-600',
      })),
      allOthers: others,
      categoryCounts,
    }
  }

  return {
    matches: rankMatches(me, pool).slice(0, limit),
    allOthers: others,
    categoryCounts,
  }
}
