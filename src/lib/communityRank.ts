import type { Community, Profile } from './supabase'

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tags(arr: string[] | null | undefined) {
  return [...new Set((arr || []).map(norm).filter(Boolean))]
}

/** Twin-based reason + score for a live community (no mock blurbs). */
export function scoreCommunityForUser(
  me: Profile | null | undefined,
  c: Pick<Community, 'name' | 'description' | 'category'>,
): { score: number; reason: string } {
  if (!me) {
    return {
      score: 40,
      reason: 'Join communities aligned with your goals after completing your profile.',
    }
  }

  let score = 28
  const hay = norm([c.name, c.description, c.category].filter(Boolean).join(' '))
  const hits: string[] = []

  for (const i of tags(me.interests).slice(0, 6)) {
    if (i.length >= 3 && hay.includes(i)) {
      score += 12
      hits.push(i)
    }
  }
  for (const g of tags(me.goals).slice(0, 4)) {
    if (g.length >= 3 && hay.includes(g)) {
      score += 8
      hits.push(g)
    }
  }
  for (const s of tags(me.skills).slice(0, 4)) {
    if (s.length >= 3 && hay.includes(s)) {
      score += 5
      hits.push(s)
    }
  }

  const role = norm(me.role || '')
  if (role && hay.includes(role.split(' ')[0] || '')) {
    score += 8
    hits.push(me.role || role)
  }
  if (/founder|entrepreneur/.test(role) && /founder|startup|venture|business/.test(hay)) score += 10
  if (/creator|content/.test(role) && /creator|content|media/.test(hay)) score += 10
  if (/engineer|developer|software/.test(role) && /tech|build|developer|ai/.test(hay)) score += 8
  if (/investor|angel|vc/.test(role) && /venture|finance|investor|capital/.test(hay)) score += 10
  if (/design/.test(role) && /design/.test(hay)) score += 10

  score = Math.min(96, Math.max(24, Math.round(score)))
  const uniqueHits = [...new Set(hits)].slice(0, 2)
  const reason = uniqueHits.length
    ? `Your signals (${uniqueHits.join(', ')}) align with ${c.name}${c.category ? ` · ${c.category}` : ''}.`
    : `${c.name} is active on Pi${c.category ? ` in ${c.category}` : ''} — explore and join if it fits your goals.`

  return { score, reason }
}

export function rankCommunitiesForUser<T extends Pick<Community, 'name' | 'description' | 'category'>>(
  me: Profile | null | undefined,
  list: T[],
): (T & { score: number; reason: string })[] {
  return list
    .map(c => ({ ...c, ...scoreCommunityForUser(me, c) }))
    .sort((a, b) => b.score - a.score)
}
